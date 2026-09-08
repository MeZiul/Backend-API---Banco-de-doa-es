import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AdministracaoService from "../../services/AdministracaoService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("AdministracaoService", () => {
  let administracaoRepository;
  let usuarioRepository;
  let itemDoacaoRepository;
  let denunciaRepository;
  let interesseRepository;
  let avaliacaoRepository;
  let notificacaoService;
  let transactionManager;
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
      buscarPorIdParaAdministracao: jest.fn(),
      atualizarSeSituacao: jest.fn(),
      listar: jest.fn(),
      listarParaAdministracao: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizarSeStatus: jest.fn(),
      listarTodos: jest.fn(),
      listarPorUsuario: jest.fn().mockResolvedValue([]),
      listarResumoPorUsuario: jest.fn().mockResolvedValue([]),
      listarIdsPorUsuario: jest.fn().mockResolvedValue([]),
      cancelarItensPorUsuario: jest.fn(),
      buscarEmAndamentoPorUsuario: jest.fn(),
      listarDisponiveisPorUsuario: jest.fn(),
    };

    denunciaRepository = {
      buscarPorIdDetalhado: jest.fn(),
      atualizarSeStatus: jest.fn(),
      listar: jest.fn(),
      listarResumoPorUsuario: jest.fn().mockResolvedValue([]),
    };

    interesseRepository = {
      listarAtivosPorItem: jest.fn().mockResolvedValue([]),
      listarResumoPorUsuario: jest.fn().mockResolvedValue([]),
    };

    avaliacaoRepository = {
      listarResumoPorUsuario: jest.fn().mockResolvedValue([]),
    };

    notificacaoService = {
      criarNotificacoesComSeguranca: jest.fn().mockResolvedValue([]),
    };
    transactionManager = {
      run: jest.fn(async (operation) => operation()),
    };

    service = new AdministracaoService({
      administracaoRepository,
      usuarioRepository,
      itemDoacaoRepository,
      denunciaRepository,
      interesseRepository,
      avaliacaoRepository,
      notificacaoService,
      transactionManager,
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
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.usuario,
        tipo: "USUARIO_SUSPENSO",
      }),
    ]);
    expect(resultado).toMatchObject({ situacao: "SUSPENSO" });
  });

  test("Deve abortar a transação de bloqueio quando o registro de auditoria falhar", async () => {
    const erroAuditoria = new Error("auditoria indisponível");
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
      motivo_suspensao: null,
      suspensao_ate: null,
    });
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "SUSPENSO",
    });
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.bloquearUsuario(
        testIds.usuario,
        { justificativa: "Violação das regras" },
        createAdminUser()
      )
    ).rejects.toBe(erroAuditoria);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenCalledTimes(1);
  });

  test("Deve impedir listagem para usuário sem perfil administrativo", async () => {
    await expect(
      service.listar({}, createRegularUser())
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas administradores podem realizar esta operação.",
    });
  });

  test("Deve usar listagem administrativa com filtros e projeção segura", async () => {
    usuarioRepository.listarParaAdministracao.mockResolvedValue({ docs: [] });

    await service.listarUsuarios(
      {
        filtros: {
          perfil: "USUARIO",
          situacao: "SUSPENSO",
          dataInicio: "2026-01-01",
          dataFim: "2026-01-31",
        },
        page: 2,
        limit: 5,
      },
      createAdminUser()
    );

    expect(usuarioRepository.listarParaAdministracao).toHaveBeenCalledWith({
      filtros: {
        perfil: "USUARIO",
        situacao: "SUSPENSO",
        dataInicio: "2026-01-01",
        dataFim: "2026-01-31",
      },
      page: 2,
      limit: 5,
    });
    expect(usuarioRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve buscar detalhe administrativo com projeção segura e histórico resumido", async () => {
    usuarioRepository.buscarPorIdParaAdministracao.mockResolvedValue({
      _id: testIds.usuario,
      nome: "Usuário moderado",
    });
    const itens = [{ _id: testIds.item, titulo: "Cadeira" }];
    const interesses = [{ _id: testIds.administracao, status: "PENDENTE" }];
    const avaliacoes = [{ _id: testIds.denuncia, nota: 5 }];
    const denuncias = [{ _id: testIds.denuncia, status: "EM_ANALISE" }];
    itemDoacaoRepository.listarResumoPorUsuario.mockResolvedValue(itens);
    itemDoacaoRepository.listarIdsPorUsuario.mockResolvedValue([
      { _id: testIds.item },
      { _id: testIds.administracao },
    ]);
    interesseRepository.listarResumoPorUsuario.mockResolvedValue(interesses);
    avaliacaoRepository.listarResumoPorUsuario.mockResolvedValue(avaliacoes);
    denunciaRepository.listarResumoPorUsuario.mockResolvedValue(denuncias);

    const resultado = await service.buscarUsuarioPorId(testIds.usuario, createAdminUser());

    expect(usuarioRepository.buscarPorIdParaAdministracao).toHaveBeenCalledWith(testIds.usuario);
    expect(itemDoacaoRepository.listarResumoPorUsuario).toHaveBeenCalledWith(testIds.usuario, 10);
    expect(itemDoacaoRepository.listarIdsPorUsuario).toHaveBeenCalledWith(testIds.usuario);
    expect(interesseRepository.listarResumoPorUsuario).toHaveBeenCalledWith(testIds.usuario, 10);
    expect(avaliacaoRepository.listarResumoPorUsuario).toHaveBeenCalledWith(testIds.usuario, 10);
    expect(denunciaRepository.listarResumoPorUsuario).toHaveBeenCalledWith(
      testIds.usuario,
      [testIds.item, testIds.administracao],
      10
    );
    expect(resultado).toMatchObject({
      _id: testIds.usuario,
      historico: {
        itens,
        interesses,
        avaliacoes,
        denuncias,
      },
    });
  });

  test("Deve resolver denúncia procedente contra item, cancelar alvo e auditar", async () => {
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
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
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

  test("Deve abortar a transação da resolução quando a auditoria falhar", async () => {
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
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.resolverDenuncia(
        testIds.denuncia,
        { resultado: "PROCEDENTE" },
        createAdminUser()
      )
    ).rejects.toBe(erroAuditoria);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledTimes(1);
    expect(denunciaRepository.atualizarSeStatus).toHaveBeenCalledTimes(1);
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
    expect(transactionManager.run).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  test("Deve abortar se uma doação entrar em andamento dentro da transação", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _id: testIds.item, status: "RESERVADO" }]);
    itemDoacaoRepository.listarDisponiveisPorUsuario.mockResolvedValue([]);

    await expect(
      service.inativarUsuario(testIds.usuario, {}, createAdminUser()),
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O usuário possui doações em andamento e não pode ser inativado automaticamente.",
    });

    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve converter conflito serializável da inativação em resposta de domínio", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    transactionManager.run.mockRejectedValue({ code: "P2034" });

    await expect(
      service.inativarUsuario(testIds.usuario, {}, createAdminUser()),
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O estado do usuário ou de suas doações mudou durante a inativação. Tente novamente.",
    });
  });

  test("Deve abortar a transação de inativação quando a auditoria falhar", async () => {
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
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "INATIVO",
    });
    administracaoRepository.criar.mockRejectedValue(erroAuditoria);

    await expect(
      service.inativarUsuario(testIds.usuario, {}, createAdminUser())
    ).rejects.toBe(erroAuditoria);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledTimes(1);
    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenCalledTimes(1);
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

    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
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

    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
    expect(itemDoacaoRepository.buscarEmAndamentoPorUsuario).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve notificar resultado e suspensão ao resolver denúncia procedente contra usuário", async () => {
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.denuncia,
      status: "EM_ANALISE",
      tipo_alvo: "USUARIO",
      denunciante_id: { _id: testIds.usuario },
      alvo_usuario_id: { _id: testIds.doador },
    });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.doador,
      situacao: "ATIVO",
    });
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
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
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
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
    expect(interesseRepository.listarAtivosPorItem.mock.invocationCallOrder[0])
      .toBeGreaterThan(administracaoRepository.criar.mock.invocationCallOrder[0]);
  });

  test("Falha ao consultar destinatários não deve impedir cancelamento administrativo", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
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
    usuarioRepository.atualizarSeSituacao.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "INATIVO",
    });
    itemDoacaoRepository.buscarEmAndamentoPorUsuario.mockResolvedValue([]);
    itemDoacaoRepository.listarDisponiveisPorUsuario.mockResolvedValue([
      {
        _id: testIds.item,
        status: "DISPONIVEL",
      },
    ]);
    itemDoacaoRepository.atualizarSeStatus.mockResolvedValue({
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

    await service.inativarUsuario(testIds.usuario, {}, createAdminUser());

    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.item,
      "DISPONIVEL",
      { status: "CANCELADO" }
    );
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.interessado,
        tipo: "ITEM_CANCELADO",
        referencia_id: testIds.item,
      }),
    ]);
    expect(interesseRepository.listarAtivosPorItem.mock.invocationCallOrder[0])
      .toBeGreaterThan(administracaoRepository.criar.mock.invocationCallOrder[0]);
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

    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
    expect(denunciaRepository.atualizarSeStatus).not.toHaveBeenCalled();
    expect(administracaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve encaminhar consultas administrativas e normalizar paginacao", async () => {
    const adminPorPapel = createRegularUser({ papeis: ["ADMINISTRADOR"] });
    administracaoRepository.listar.mockResolvedValue({ docs: ["acoes"] });
    administracaoRepository.listarPorAlvo.mockResolvedValue({ docs: ["alvo"] });
    administracaoRepository.listarPorAdministrador.mockResolvedValue({ docs: ["admin"] });
    itemDoacaoRepository.listarTodos.mockResolvedValue({ docs: ["itens"] });
    denunciaRepository.listar.mockResolvedValue({ docs: ["denuncias"] });

    await expect(service.listar(
      { filtros: { tipo: "ITEM" }, page: "2", limit: "5" },
      adminPorPapel
    )).resolves.toEqual({ docs: ["acoes"] });
    await service.listarPorAlvo(testIds.item, { page: "3", limit: "6" }, adminPorPapel);
    await service.listarPorAdministrador(testIds.admin, { page: "4", limit: "7" }, adminPorPapel);
    await service.listarItens(
      { filtros: { status: "DISPONIVEL" }, page: "5", limit: "8", ordenacao: "antigos" },
      adminPorPapel
    );
    await service.listarDenuncias(
      { filtros: { status: "EM_ANALISE" }, page: "6", limit: "9" },
      adminPorPapel
    );

    expect(administracaoRepository.listar).toHaveBeenCalledWith({
      filtros: { tipo: "ITEM" },
      page: 2,
      limit: 5,
    });
    expect(administracaoRepository.listarPorAlvo).toHaveBeenCalledWith(testIds.item, {
      page: 3,
      limit: 6,
    });
    expect(administracaoRepository.listarPorAdministrador).toHaveBeenCalledWith(testIds.admin, {
      page: 4,
      limit: 7,
    });
    expect(itemDoacaoRepository.listarTodos).toHaveBeenCalledWith({
      filtros: { status: "DISPONIVEL" },
      page: 5,
      limit: 8,
      ordenacao: "antigos",
    });
    expect(denunciaRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "EM_ANALISE" },
      page: 6,
      limit: 9,
    });
  });

  test("Deve retornar 404 para recursos administrativos inexistentes", async () => {
    administracaoRepository.buscarPorIdDetalhado.mockResolvedValue(null);
    usuarioRepository.buscarPorIdParaAdministracao.mockResolvedValue(null);
    itemDoacaoRepository.buscarPorId.mockResolvedValue(null);
    denunciaRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(service.buscarPorId(testIds.administracao, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.buscarUsuarioPorId(testIds.usuario, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.cancelarItem(testIds.item, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.resolverDenuncia(testIds.denuncia, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("Deve rejeitar estados invalidos antes de moderar recursos", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "SUSPENSO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "INATIVO" });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "PROCEDENTE" })
      .mockResolvedValueOnce({ _id: testIds.denuncia, status: "EM_ANALISE" });

    await expect(service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "   " },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "Motivo valido" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.desbloquearUsuario(testIds.usuario, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(service.inativarUsuario(testIds.usuario, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(service.cancelarItem(testIds.item, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "IMPROCEDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PENDENTE" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 400 });
  });

  test("Deve rejeitar corrida de bloqueio e propagar falha de auditoria", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.usuario,
      situacao: "ATIVO",
    });
    usuarioRepository.atualizarSeSituacao
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: testIds.usuario, situacao: "SUSPENSO" });

    await expect(service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "Primeira tentativa" },
      createAdminUser()
    )).rejects.toMatchObject({ statusCode: 409 });

    administracaoRepository.criar.mockRejectedValue(new Error("auditoria indisponivel"));

    await expect(service.bloquearUsuario(
      testIds.usuario,
      { justificativa: "Segunda tentativa" },
      createAdminUser()
    )).rejects.toThrow("auditoria indisponivel");

    expect(usuarioRepository.atualizarSeSituacao).toHaveBeenCalledTimes(2);
  });

  test("Deve abortar a transação quando a inativação perder a corrida", async () => {
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
    usuarioRepository.atualizarSeSituacao.mockResolvedValue(null);

    await expect(service.inativarUsuario(testIds.usuario, {}, createAdminUser()))
      .rejects.toMatchObject({ statusCode: 409 });

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(itemDoacaoRepository.atualizarSeStatus).toHaveBeenCalledTimes(1);
  });

  test("Deve resolver denuncia sem repetir moderacao de alvo ja tratado", async () => {
    denunciaRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        tipo_alvo: "ITEM",
        alvo_item_id: testIds.item,
      })
      .mockResolvedValueOnce({
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        tipo_alvo: "USUARIO",
        alvo_usuario_id: testIds.doador,
      });
    denunciaRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "CANCELADO",
    });
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.doador,
      situacao: "SUSPENSO",
    });
    administracaoRepository.criar.mockResolvedValue({ _id: testIds.administracao });

    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE" },
      createAdminUser()
    )).resolves.toMatchObject({ status: "PROCEDENTE" });
    await expect(service.resolverDenuncia(
      testIds.denuncia,
      { resultado: "PROCEDENTE" },
      createAdminUser()
    )).resolves.toMatchObject({ status: "PROCEDENTE" });

    expect(itemDoacaoRepository.atualizarSeStatus).not.toHaveBeenCalled();
    expect(usuarioRepository.atualizarSeSituacao).not.toHaveBeenCalled();
  });
});
