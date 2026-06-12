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
      atualizarSeSituacao: jest.fn(),
      listar: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizarSeStatus: jest.fn(),
      listarTodos: jest.fn(),
      buscarEmAndamentoPorUsuario: jest.fn(),
      listarDisponiveisPorUsuario: jest.fn(),
    };

    denunciaRepository = {
      buscarPorIdDetalhado: jest.fn(),
      atualizarSeStatus: jest.fn(),
      listar: jest.fn(),
    };

    service = new AdministracaoService({
      administracaoRepository,
      usuarioRepository,
      itemDoacaoRepository,
      denunciaRepository,
    });
  });

  test("Deve bloquear um usuário por operação condicional e registrar auditoria", async () => {
    const usuario = { _id: testIds.usuario, situacao: "ATIVO" };
    usuarioRepository.buscarPorId.mockResolvedValue(usuario);
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
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

    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenCalledWith(
      testIds.usuario,
      "ATIVO",
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

  test("Deve compensar bloqueio quando o registro de auditoria falhar", async () => {
    const erroAuditoria = new Error("auditoria indisponível");
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
      motivo_suspensao: null,
      suspensao_ate: null,
    });
    usuarioRepository.atualizarSeSituacao
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "SUSPENSO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" });
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.bloquearUsuario(
        testIds.usuario,
        { justificativa: "Violação das regras" },
        createAdminUser()
      )
    ).rejects.toBe(erroAuditoria);

    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenNthCalledWith(
      2,
      testIds.usuario,
      "SUSPENSO",
      {
        situacao: "ATIVO",
        motivo_suspensao: null,
        suspensao_ate: null,
      },
      {
        motivo_suspensao: "Violação das regras",
        suspensao_ate: null,
      }
    );
  });

  test("Deve impedir listagem para usuário sem perfil administrativo", async () => {
    await expect(
      service.listar({}, createRegularUser())
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas administradores podem realizar esta operação.",
    });
  });

  test("Deve resolver denúncia procedente contra item, cancelar alvo e auditar", async () => {
    const denuncia = {
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
    };

    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(denuncia);
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    const resultado = await service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE", acao_tomada: "Item removido" },
      createAdminUser()
    );

    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.denuncia,
      "EM_ANALISE",
      expect.objectContaining({
        status: "PROCEDENTE",
        admin_id: testIds.admin,
      })
    );
    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.item,
      "DISPONIVEL",
      { status: "CANCELADO" }
    );
    expect(administracaoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_acao: "RESOLUCAO_DENUNCIA",
        resultado_denuncia: "PROCEDENTE",
      })
    );
    expect(resultado).toMatchObject({ status: "PROCEDENTE" });
  });

  test("Deve permitir somente uma resolução concorrente da denúncia", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
    });
    denunciaRepository.atualizarSeStatus.mockResolvedValue(null);

    await expect(
      service.resolverDenuncia(
        testIds.denuncia,
        { resultado: "PROCEDENTE" },
        createAdminUser()
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "A denúncia não está mais em análise.",
    });

    expect(itemDoacaoRepository.buscarPorId).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve compensar alvo e denúncia quando auditoria da resolução falhar", async () => {
    const erroAuditoria = new Error("auditoria indisponível");
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "ITEM",
      alvo_item_id: testIds.item,
      admin_id: null,
      resposta_admin: null,
      acao_tomada: null,
      data_analise: null,
    });
    denunciaRepository.atualizarSeStatus
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "PROCEDENTE" })
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "EM_ANALISE" });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizarSeStatus
      .mockResolvedValueOnce({ _id: testIds.item, status: "CANCELADO" })
      .mockResolvedValueOnce({ _id: testIds.item, status: "DISPONIVEL" });
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.resolverDenuncia(
        testIds.denuncia,
        { resultado: "PROCEDENTE" },
        createAdminUser()
      )
    ).rejects.toBe(erroAuditoria);

    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenNthCalledWith(
      2,
      testIds.item,
      "CANCELADO",
      { status: "DISPONIVEL" }
    );
    expect(denunciaRepository.atualizarSeStatus).toHaveBeenNthCalledWith(
      2,
      testIds.denuncia,
      "PROCEDENTE",
      expect.objectContaining({
        status: "EM_ANALISE",
        admin_id: null,
      }),
      { admin_id: testIds.admin }
    );
  });

  test("Deve bloquear inativação automática quando existem doações em andamento", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([
      { _id: testIds.item, status: "RESERVADO" },
    ]);

    await expect(
      service.inativarUsuario(testIds.usuario, {}, createAdminUser())
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O usuário possui doações em andamento e não pode ser inativado automaticamente.",
    });

    expect(itemDoacaoRepository.listarDisponiveisPorUsuario).not.toHaveBeenCalled();
    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
  });

  test("Deve inativar usuário e cancelar seus itens disponíveis com auditoria", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    itemDoacaoRepository.listarDisponiveisPorUsuario.mockResolvedValue([
      { _id: testIds.item, status: "DISPONIVEL" },
    ]);
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "INATIVO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    const resultado = await service.inativarUsuario(
      testIds.usuario,
      {},
      createAdminUser()
    );

    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.item,
      "DISPONIVEL",
      { status: "CANCELADO" }
    );
    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenCalledWith(
      testIds.usuario,
      "ATIVO",
      {
        situacao: "INATIVO",
        motivo_suspensao: null,
        suspensao_ate: null,
      }
    );
    expect(administracaoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_acao: "INATIVACAO_USUARIO",
        alvo_id: testIds.usuario,
      })
    );
    expect(resultado).toMatchObject({ situacao: "INATIVO" });
  });

  test("Deve compensar usuário e itens quando auditoria da inativação falhar", async () => {
    const erroAuditoria = new Error("auditoria indisponível");
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
      motivo_suspensao: null,
      suspensao_ate: null,
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    itemDoacaoRepository.listarDisponiveisPorUsuario.mockResolvedValue([
      { _id: testIds.item, status: "DISPONIVEL" },
    ]);
    itemDoacaoRepository.atualizarSeStatus
      .mockResolvedValueOnce({ _id: testIds.item, status: "CANCELADO" })
      .mockResolvedValueOnce({ _id: testIds.item, status: "DISPONIVEL" });
    usuarioRepository.atualizarSeSituacao
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "INATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" });
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.inativarUsuario(testIds.usuario, {}, createAdminUser())
    ).rejects.toBe(erroAuditoria);

    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenNthCalledWith(
      2,
      testIds.item,
      "CANCELADO",
      { status: "DISPONIVEL" }
    );
    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenNthCalledWith(
      2,
      testIds.usuario,
      "INATIVO",
      {
        situacao: "ATIVO",
        motivo_suspensao: null,
        suspensao_ate: null,
      },
      {
        motivo_suspensao: null,
        suspensao_ate: null,
      }
    );
  });
});
