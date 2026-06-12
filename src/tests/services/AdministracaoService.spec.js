import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AdministracaoService from "../../services/AdministracaoService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("AdministracaoService", () => {
  let administracaoRepository;
  let usuarioRepository;
  let itemDoacaoRepository;
  let denunciaRepository;
  let service;

  beforeEach(() => {
    administracaoRepository = {
      listar: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      listarPorAlvo: jest.fn(),
      listarPorAdministrador: jest.fn(),
      criar: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      listar: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      listarTodos: jest.fn(),
      cancelarItensPorUsuario: jest.fn(),
    };

    denunciaRepository = {
      buscarPorIdDetalhado: jest.fn(),
      atualizar: jest.fn(),
      listar: jest.fn(),
    };

    service = new AdministracaoService({
      administracaoRepository,
      usuarioRepository,
      itemDoacaoRepository,
      denunciaRepository,
    });
  });

  test("Deve bloquear um usuário e registrar a ação administrativa", async () => {
    const usuario = { _id: testIds.usuario, situacao: "ATIVO" };
    usuarioRepository.buscarPorId.mockResolvedValue(usuario);
    usuarioRepository.atualizar.mockResolvedValue({
      ...usuario,
      situacao: "SUSPENSO",
      motivo_suspensao: "Violação das regras",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    const resultado = await service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "Violação das regras" },
      createAdminUser()
    );

    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(
      testIds.usuario,
      expect.objectContaining({
        situacao: "SUSPENSO",
        motivo_suspensao: "Violação das regras",
      })
    );
    expect(administracaoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        administrador_id: testIds.admin,
        tipo_acao: "BLOQUEIO_USUARIO",
        tipo_alvo: "USUARIO",
        alvo_model: "Usuario",
        alvo_id: testIds.usuario,
        justificativa: "Violação das regras",
      })
    );
    expect(resultado).toMatchObject({ situacao: "SUSPENSO" });
  });

  test("Deve impedir listagem para usuário sem perfil administrativo", async () => {
    await expect(
      service.listar({}, createRegularUser())
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas administradores podem realizar esta operação.",
    });
  });

  test("Deve resolver denúncia procedente contra item e cancelar o item", async () => {
    const denuncia = {
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
    };

    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denuncia);
    denunciaRepository.atualizar.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizar.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    const resultado = await service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE", acao_tomada: "Item removido" },
      createAdminUser()
    );

    expect(itemDoacaoRepository.atualizar).toHaveBeenCalledWith(testIds.item, { status: "CANCELADO" });
    expect(denunciaRepository.atualizar).toHaveBeenCalledWith(
      testIds.denuncia,
      expect.objectContaining({
        status: "PROCEDENTE",
        admin_id: testIds.admin,
      })
    );
    expect(administracaoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_acao: "RESOLUCAO_DENUNCIA",
        tipo_alvo: "DENUNCIA",
        alvo_model: "Denuncia",
        resultado_denuncia: "PROCEDENTE",
      })
    );
    expect(resultado).toMatchObject({ status: "PROCEDENTE" });
  });

  test("Deve bloquear operação administrativa de administrador suspenso", async () => {
    await expect(
      service.listar({}, createAdminUser({ situacao: "SUSPENSO" }))
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Somente usuários ativos podem realizar operações protegidas.",
    });

    expect(administracaoRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve impedir que administrador bloqueie a própria conta", async () => {
    await expect(
      service.bloquearUsuario(
        testIds.admin,
        { justificativa: "Teste de autoproteção" },
        createAdminUser({ situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O administrador não pode bloquear a própria conta.",
    });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir que administrador inative a própria conta", async () => {
    await expect(
      service.inativarUsuario(
        testIds.admin,
        {},
        createAdminUser({ situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O administrador não pode inativar a própria conta.",
    });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(itemDoacaoRepository.cancelarItensPorUsuario).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir auto-suspensão ao resolver denúncia contra o próprio administrador", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "USUARIO",
      alvo_usuario_id: testIds.admin,
    });

    await expect(
      service.resolverDenuncia(
        testIds.denuncia,
        { resultado: "PROCEDENTE" },
        createAdminUser({ situacao: "ATIVO" })
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O administrador não pode suspender a própria conta.",
    });

    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(denunciaRepository.atualizar).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });
});
