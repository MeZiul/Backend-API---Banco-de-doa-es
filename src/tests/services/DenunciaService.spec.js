import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import DenunciaService from "../../services/DenunciaService.js";
import { createRegularUser, testIds } from "../test.js";

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
      atualizarSeStatus: jest.fn(),
      deletarSeEmAnalise: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
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

  test("Deve criar denúncia contra item usando repositories", async () => {
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

  test("Deve converter corrida de denúncia duplicada em conflito", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({ _id: testIds.item });
    denunciaRepository.buscarEmAnalisePorItemEDenunciante.mockResolvedValue(null);
    denunciaRepository.criar.mockRejectedValue({ code: 11000 });

    await expect(
      service.criar(
        {
          tipo_alvo: "ITEM",
          alvo_item_id: testIds.item,
          motivo: "FRAUDE",
        },
        createRegularUser({ id: testIds.usuario })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "Já existe uma denúncia em análise para este item.",
    });
  });

  test("Deve atualizar somente denúncia ainda em análise do próprio autor", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
        motivo: "SPAM",
        descricao: null,
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        descricao: "Descrição corrigida",
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    const resultado = await service.atualizar(
      testIds.denuncia,
      { descricao: "Descrição corrigida" },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.denuncia,
      "EM_ANALISE",
      {
        motivo: "SPAM",
        descricao: "Descrição corrigida",
      },
      { denunciante_id: testIds.usuario }
    );
    expect(resultado).toMatchObject({ descricao: "Descrição corrigida" });
  });

  test("Deve rejeitar atualização que perdeu corrida para resolução administrativa", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
      motivo: "SPAM",
    });
    denunciaRepository.atualizarSeStatus.mockResolvedValue(null);

    await expect(
      service.atualizar(
        testIds.denuncia,
        { descricao: "Nova descrição" },
        createRegularUser({ id: testIds.usuario })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "A denúncia não está mais disponível para atualização.",
    });
  });

  test("Deve permitir limpar a descrição opcional da denúncia", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
        motivo: "SPAM",
        descricao: "Descrição anterior",
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        descricao: null,
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
    });

    await service.atualizar(
      testIds.denuncia,
      { descricao: null },
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.denuncia,
      "EM_ANALISE",
      {
        motivo: "SPAM",
        descricao: null,
      },
      { denunciante_id: testIds.usuario }
    );
  });

  test("Deve remover somente denúncia ainda em análise do próprio autor", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    });
    denunciaRepository.deletarSeEmAnalise.mockResolvedValue({
      _id: testIds.denuncia,
    });

    await service.deletar(
      testIds.denuncia,
      createRegularUser({ id: testIds.usuario })
    );

    expect(denunciaRepository.deletarSeEmAnalise).toHaveBeenCalledWith(
      testIds.denuncia,
      testIds.usuario
    );
  });

  test("Não deve expor resolução administrativa sem registro de auditoria", () => {
    expect(service.resolver).toBeUndefined();
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
});
