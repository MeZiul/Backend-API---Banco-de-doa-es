import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import DenunciaService from "../../services/DenunciaService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("DenunciaService", () => {
  let denunciaRepository;
  let itemDoacaoRepository;
  let usuarioRepository;
  let service;

  beforeEach(() => {
    denunciaRepository = {
      listar: jest.fn(),
      listarEmAnalise: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      buscarEmAnalisePorItemEDenunciante: jest.fn(),
      buscarEmAnalisePorUsuarioEDenunciante: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
    };

    service = new DenunciaService({
      denunciaRepository,
      itemDoacaoRepository,
      usuarioRepository,
    });
  });

  test("Deve restringir a listagem ao denunciante quando o usuário não for administrador", async () => {
    denunciaRepository.listar.mockResolvedValue({ docs: [] });

    await service.listar(
      {
        filtros: {
          status: "EM_ANALISE",
          denuncianteId: "deve-ser-removido",
        },
        page: 3,
        limit: 15,
      },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: {
        status: "EM_ANALISE",
        denunciante_id: testIds.usuario,
      },
      page: 3,
      limit: 15,
    });
  });

  test("Deve criar denúncia contra item quando não houver outra em análise", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockResolvedValue({ _id: testIds.denuncia });
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    const resultado = await service.criar(
      {
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
        descricao: "O item é suspeito.",
      },
      createRegularUser({ id: testIds.usuario })
    );

    expect(itemDoacaoRepository.buscarPorId).toHaveBeenCalledWith(testIds.item);
    expect(denunciaRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        denunciante_id: testIds.usuario,
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
        motivo: "FRAUDE",
        status: "EM_ANALISE",
      })
    );
    expect(resultado).toMatchObject({ status: "EM_ANALISE" });
  });

  test("Deve resolver denúncia procedente contra usuário e suspender o alvo", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.doador,
      situacao: "ATIVO",
    });
    usuarioRepository.atualizar.mockResolvedValue({
      _id: testIds.doador,
      situacao: "SUSPENSO",
    });
    denunciaRepository.atualizar.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });

    const resultadoDetalhado = {
      _id: testIds.denuncia,
      status: "PROCEDENTE",
      admin_id: testIds.admin,
    };
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        tipo_alvo: "USUARIO",
        alvo_usuario_id: testIds.doador,
        denunciante_id: { _id: testIds.usuario },
      })
      .mockResolvedValueOnce(resultadoDetalhado);

    const resultado = await service.resolver(
      testIds.denuncia,
      {
        status: "PROCEDENTE",
        acao_tomada: "Usuário suspenso por denúncia procedente.",
      },
      createAdminUser()
    );

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(
      testIds.doador,
      expect.objectContaining({
        situacao: "SUSPENSO",
      })
    );
    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({
        status: "PROCEDENTE",
        admin_id: testIds.admin,
      })
    );
    expect(resultado).toEqual(resultadoDetalhado);
  });

  test("Deve impedir que o usuário denuncie a própria conta", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({
        _id: testIds.usuario,
        situacao: "ATIVO",
      })
      .mockResolvedValueOnce({
        _id: testIds.usuario,
        situacao: "ATIVO",
      });

    await expect(
      service.criar(
        {
          tipo_alvo: "USUARIO",
          alvo_usuario_id: testIds.usuario,
          motivo: "SPAM",
        },
        createRegularUser({ id: testIds.usuario, situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O usuário não pode denunciar a própria conta.",
    });

    expect(denunciaRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve bloquear operação protegida de usuário inativo", async () => {
    await expect(
      service.listar(
        { filtros: {}, page: 1, limit: 15 },
        createRegularUser({ situacao: "INATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Somente usuários ativos podem realizar operações protegidas.",
    });

    expect(denunciaRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve impedir auto-suspensão ao resolver denúncia contra o próprio administrador", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "USUARIO",
      alvo_usuario_id: testIds.admin,
    });

    await expect(
      service.resolver(
        testIds.denuncia,
        { status: "PROCEDENTE" },
        createAdminUser({ situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O administrador não pode suspender a própria conta.",
    });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(denunciaRepository.atualizar).not.toHaveBeenCalled();
  });
});
