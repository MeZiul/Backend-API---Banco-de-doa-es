import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AdministracaoService from "../../services/AdministracaoService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("AdministracaoService", () => {
  let administracaoRepository;
  let usuarioRepository;
  let itemDoacaoRepository;
  let denunciaRepository;
  let interesseRepository;
  let notificacaoService;
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
      listarPorUsuario: jest.fn().mockResolvedValue([]),
      cancelarItensPorUsuario: jest.fn(),
    };

    denunciaRepository = {
      buscarPorIdDetalhado: jest.fn(),
      atualizar: jest.fn(),
      listar: jest.fn(),
    };

    interesseRepository = {
      listarAtivosPorItem: jest.fn().mockResolvedValue([]),
    };

    notificacaoService = {
      criarNotificacoesComSeguranca: jest.fn().mockResolvedValue([]),
    };

    service = new AdministracaoService({
      administracaoRepository,
      usuarioRepository,
      itemDoacaoRepository,
      denunciaRepository,
      interesseRepository,
      notificacaoService,
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
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.usuario,
        tipo: "USUARIO_SUSPENSO",
      }),
    ]);
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
      denunciante_id: { _id: testIds.usuario },
      alvo_item_id: {
        _id: testIds.item,
        usuario_id: testIds.doador,
        titulo: "Cadeira",
      },
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
    interesseRepository.listarAtivosPorItem.mockResolvedValue([
      {
        _id: testIds.administracao,
        usuario_interessado_id: testIds.interessado,
      },
    ]);

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
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          usuario_id: testIds.usuario,
          tipo: "DENUNCIA_RESULTADO",
        }),
        expect.objectContaining({
          usuario_id: testIds.doador,
          tipo: "DENUNCIA_RESULTADO",
        }),
      ])
    );
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.interessado,
        tipo: "ITEM_CANCELADO",
      }),
    ]);
    expect(resultado).toMatchObject({ status: "PROCEDENTE" });
  });

  test("Deve notificar usuário após desbloqueio", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "SUSPENSO",
    });
    usuarioRepository.atualizar.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await service.desbloquearUsuario(testIds.usuario, {}, createAdminUser());

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.usuario,
        tipo: "USUARIO_REATIVADO",
      }),
    ]);
  });

  test("Deve notificar resultado e suspensão ao resolver denúncia procedente contra usuário", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "USUARIO",
      denunciante_id: { _id: testIds.usuario },
      alvo_usuario_id: { _id: testIds.doador },
    });
    denunciaRepository.atualizar.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.doador,
      situacao: "ATIVO",
    });
    usuarioRepository.atualizar.mockResolvedValue({
      _id: testIds.doador,
      situacao: "SUSPENSO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE", acao_tomada: "Conta suspensa" },
      createAdminUser()
    );

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          usuario_id: testIds.usuario,
          tipo: "DENUNCIA_RESULTADO",
        }),
        expect.objectContaining({
          usuario_id: testIds.doador,
          tipo: "DENUNCIA_RESULTADO",
        }),
        expect.objectContaining({
          usuario_id: testIds.doador,
          tipo: "USUARIO_SUSPENSO",
        }),
      ])
    );
  });

  test("Deve notificar interesses ativos após cancelamento administrativo do item", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizar.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    interesseRepository.listarAtivosPorItem.mockResolvedValue([
      {
        _id: testIds.administracao,
        usuario_interessado_id: testIds.interessado,
      },
    ]);
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await service.cancelarItem(testIds.item, {}, createAdminUser());

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.interessado,
        tipo: "ITEM_CANCELADO",
        referencia_id: testIds.item,
      }),
    ]);
  });

  test("Falha ao consultar destinatários não deve impedir cancelamento administrativo", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizar.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    interesseRepository.listarAtivosPorItem.mockRejectedValue(
      new Error("consulta indisponível")
    );
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await expect(
      service.cancelarItem(testIds.item, {}, createAdminUser())
    ).resolves.toMatchObject({ status: "CANCELADO" });
  });

  test("Deve notificar interessados dos itens cancelados ao inativar usuário", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    usuarioRepository.atualizar.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "INATIVO",
    });
    itemDoacaoRepository.listarPorUsuario.mockResolvedValue([
      {
        _id: testIds.item,
        titulo: "Cadeira",
        status: "DISPONIVEL",
      },
    ]);
    interesseRepository.listarAtivosPorItem.mockResolvedValue([
      {
        _id: testIds.administracao,
        usuario_interessado_id: testIds.interessado,
      },
    ]);
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await service.inativarUsuario(testIds.usuario, {}, createAdminUser());

    expect(itemDoacaoRepository.cancelarItensPorUsuario).toHaveBeenCalledWith(testIds.usuario);
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.interessado,
        tipo: "ITEM_CANCELADO",
        referencia_id: testIds.item,
      }),
    ]);
  });
});
