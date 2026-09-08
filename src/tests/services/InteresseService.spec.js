import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import InteresseService from "../../services/InteresseService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("InteresseService", () => {
  let interesseRepository;
  let itemDoacaoRepository;
  let usuarioRepository;
  let notificacaoService;
  let transactionManager;
  let service;

  beforeEach(() => {
    interesseRepository = {
      listar: jest.fn(),
      buscarAtivoPorItemEInteressado: jest.fn(),
      criar: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      atualizar: jest.fn(),
      atualizarSeStatus: jest.fn(),
      deletar: jest.fn(),
      recusarPendentesDoItem: jest.fn(),
      listarRecusadosDoAceite: jest.fn(),
      restaurarRecusadosDoAceite: jest.fn(),
      listarPorItem: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      incrementarInteressesSeDisponivel: jest.fn(),
      reservarSeDisponivel: jest.fn(),
      liberarReservaDoInteresse: jest.fn(),
      restaurarReservaSeDisponivel: jest.fn(),
      atualizar: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
    };

    notificacaoService = {
      criarNotificacoesComSeguranca: jest.fn().mockResolvedValue([]),
    };
    transactionManager = {
      run: jest.fn(async (operation) => operation()),
    };

    service = new InteresseService({
      interesseRepository,
      itemDoacaoRepository,
      usuarioRepository,
      notificacaoService,
      transactionManager,
    });
  });

  test("Deve restringir a listagem ao usuário interessado quando não for administrador", async () => {
    interesseRepository.listar.mockResolvedValue({ docs: [] });

    await service.listar(
      {
        filtros: {
          status: "PENDENTE",
          usuarioInteressadoId: "deve-ser-removido",
        },
        page: 2,
        limit: 5,
      },
      createRegularUser({ id: testIds.interessado })
    );

    expect(interesseRepository.listar).toHaveBeenCalledWith({
      filtros: {
        status: "PENDENTE",
        usuario_interessado_id: testIds.interessado,
      },
      page: 2,
      limit: 5,
    });
  });

  test("Deve criar interesse quando o item estiver disponível e o usuário estiver ativo", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.interessado,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
      titulo: "Cadeira",
    });
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar.mockResolvedValue({ _id: testIds.administracao });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "PENDENTE",
    });

    itemDoacaoRepository.incrementarInteressesSeDisponivel.mockResolvedValue({
      _id: testIds.item,
      total_interesses: 1,
    });

    const resultado = await service.criar(
      {
        item_id: testIds.item,
        mensagem_interessado: "Posso buscar ainda hoje.",
      },
      createRegularUser({ id: testIds.interessado })
    );

    expect(interesseRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: testIds.item,
        usuario_interessado_id: testIds.interessado,
        usuario_doador_id: testIds.doador,
        mensagem_interessado: "Posso buscar ainda hoje.",
        status: "PENDENTE",
      })
    );
    expect(itemDoacaoRepository.incrementarInteressesSeDisponivel).toHaveBeenCalledWith(testIds.item);
    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.doador,
        tipo: "INTERESSE_RECEBIDO",
        referencia_id: testIds.administracao,
      }),
    ]);
    expect(resultado).toMatchObject({ status: "PENDENTE" });
  });

  test("Deve notificar interessado aceito e demais recusados automaticamente", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
      });
    interesseRepository.listarRecusadosDoAceite.mockResolvedValue([
      {
        _id: testIds.denuncia,
        usuario_interessado_id: testIds.usuario,
      },
    ]);
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockResolvedValue({ modifiedCount: 1 });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue({
      _id: testIds.item,
      status: "RESERVADO",
    });

    await service.aceitar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    );

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          usuario_id: testIds.interessado,
          tipo: "INTERESSE_ACEITO",
        }),
        expect.objectContaining({
          usuario_id: testIds.usuario,
          tipo: "INTERESSE_RECUSADO",
        }),
      ])
    );
  });

  test("Falha ao consultar destinatários não deve impedir aceite", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
      });
    interesseRepository.listarRecusadosDoAceite.mockRejectedValue(
      new Error("consulta indisponível")
    );
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockResolvedValue({ modifiedCount: 0 });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue({
      _id: testIds.item,
      status: "RESERVADO",
    });

    await expect(
      service.aceitar(
        testIds.administracao,
        {},
        createRegularUser({ id: testIds.doador })
      )
    ).resolves.toMatchObject({ status: "ACEITO" });
  });

  test("Deve notificar o interessado após recusa manual", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "RECUSADO",
      });
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "RECUSADO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });

    await service.recusar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    );

    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.interessado,
        tipo: "INTERESSE_RECUSADO",
      }),
    ]);
  });

  test("Falha de notificação não deve invalidar interesse criado", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.interessado,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
      titulo: "Cadeira",
    });
    itemDoacaoRepository.incrementarInteressesSeDisponivel.mockResolvedValue({});
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar.mockResolvedValue({ _id: testIds.administracao });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "PENDENTE",
    });
    notificacaoService.criarNotificacoesComSeguranca.mockRejectedValue(
      new Error("notificação indisponível")
    );

    await expect(
      service.criar(
        { item_id: testIds.item },
        createRegularUser({ id: testIds.interessado })
      )
    ).resolves.toMatchObject({ status: "PENDENTE" });
  });

  test("Deve cancelar interesse aceito e reabrir o item", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
        usuario_doador_id: { _id: testIds.doador },
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "CANCELADO",
      });
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
    });

    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });

    const resultado = await service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    );

    expect(interesseRepository.atualizarSeStatus).toHaveBeenCalledWith(
      testIds.administracao,
      "ACEITO",
      expect.objectContaining({ status: "CANCELADO" })
    );
    expect(itemDoacaoRepository.liberarReservaDoInteresse).toHaveBeenCalledWith(
      testIds.item,
      testIds.administracao
    );
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.doador,
        tipo: "INTERESSE_CANCELADO",
      }),
    ]);
    expect(resultado).toMatchObject({ status: "CANCELADO" });
  });

  test("Deve converter corrida de interesse duplicado em conflito", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.interessado,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
    });
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar.mockRejectedValue({ code: 11000 });

    await expect(
      service.criar(
        { item_id: testIds.item },
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "Já existe um interesse ativo deste usuário para este item.",
    });

    expect(itemDoacaoRepository.incrementarInteressesSeDisponivel).not.toHaveBeenCalled();
  });

  test("Deve abortar a transação se o item ficar indisponível durante a criação", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.interessado,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
    });
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar.mockResolvedValue({ _id: testIds.administracao });
    itemDoacaoRepository.incrementarInteressesSeDisponivel.mockResolvedValue(null);

    await expect(
      service.criar(
        { item_id: testIds.item },
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O item não está mais disponível para receber interesses.",
    });

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(interesseRepository.deletar).not.toHaveBeenCalled();
  });

  test("Deve impedir dois aceites quando o item já foi reservado por outra operação", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "PENDENTE",
      item_id: { _id: testIds.item },
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
    });
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue(null);

    await expect(
      service.aceitar(
        testIds.administracao,
        {},
        createRegularUser({ id: testIds.doador })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O item não está mais disponível para reserva.",
    });

    expect(interesseRepository.atualizarSeStatus).not.toHaveBeenCalled();
  });

  test("Deve abortar a transação de aceite quando a recusa dos demais interesses falhar", async () => {
    const falha = new Error("Falha ao recusar interesses pendentes");
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "PENDENTE",
      item_id: { _id: testIds.item },
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
    });
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue({
      _id: testIds.item,
      status: "RESERVADO",
    });
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockRejectedValue(falha);

    await expect(
      service.aceitar(
        testIds.administracao,
        {},
        createRegularUser({ id: testIds.doador })
      )
    ).rejects.toBe(falha);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(interesseRepository.restaurarRecusadosDoAceite).not.toHaveBeenCalled();
    expect(interesseRepository.atualizarSeStatus).toHaveBeenCalledTimes(1);
    expect(itemDoacaoRepository.liberarReservaDoInteresse).not.toHaveBeenCalled();
  });

  test("Deve abortar a transação se o cancelamento aceito perder a corrida", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
      item_id: { _id: testIds.item },
      usuario_interessado_id: { _id: testIds.interessado },
    });
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });
    interesseRepository.atualizarSeStatus.mockResolvedValue(null);

    await expect(
      service.cancelar(
        testIds.administracao,
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O interesse não está mais aceito.",
    });

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(itemDoacaoRepository.restaurarReservaSeDisponivel).not.toHaveBeenCalled();
  });

  test("Não deve restaurar reserva após cancelamento confirmado se falhar apenas a consulta detalhada", async () => {
    const falha = new Error("Falha ao carregar detalhe");
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
      })
      .mockRejectedValueOnce(falha);
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({});
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
    });

    await expect(
      service.cancelar(
        testIds.administracao,
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toBe(falha);

    expect(itemDoacaoRepository.restaurarReservaSeDisponivel).not.toHaveBeenCalled();
  });

  test("Deve bloquear operação protegida de usuário suspenso", async () => {
    await expect(
      service.listar(
        { filtros: {}, page: 1, limit: 15 },
        createRegularUser({ situacao: "SUSPENSO" })
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Somente usuários ativos podem realizar operações protegidas.",
    });

    expect(interesseRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve listar recebidos, interesses do item e detalhe para envolvidos", async () => {
    interesseRepository.listar.mockResolvedValue({ docs: [] });
    interesseRepository.listarPorItem.mockResolvedValue([{ _id: testIds.administracao }]);
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      usuario_interessado_id: { _id: testIds.interessado },
      usuario_doador_id: { _id: testIds.doador },
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
    });

    await service.listarRecebidos(
      { filtros: { status: "PENDENTE", usuarioDoadorId: "remover" }, page: "2", limit: "4" },
      createRegularUser({ id: testIds.doador })
    );
    await expect(service.listarPorItem(
      testIds.item,
      createRegularUser({ id: testIds.doador })
    )).resolves.toHaveLength(1);
    await expect(service.listarPorItem(testIds.item, createAdminUser()))
      .resolves.toHaveLength(1);
    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).resolves.toMatchObject({ _id: testIds.administracao });
    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.doador })
    )).resolves.toMatchObject({ _id: testIds.administracao });

    expect(interesseRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "PENDENTE", usuario_doador_id: testIds.doador },
      page: 2,
      limit: 4,
    });
  });

  test("Deve rejeitar acesso ao item e interesse por terceiro", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
    });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      usuario_interessado_id: testIds.interessado,
      usuario_doador_id: testIds.doador,
    });

    await expect(service.listarPorItem(testIds.item, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(service.buscarPorId(testIds.administracao, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test("Deve rejeitar criacao para usuario ou item invalido", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "SUSPENSO" })
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "ATIVO" })
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "ATIVO" });
    itemDoacaoRepository.buscarPorId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: testIds.item,
        status: "RESERVADO",
        usuario_id: testIds.doador,
      })
      .mockResolvedValueOnce({
        _id: testIds.item,
        status: "DISPONIVEL",
        usuario_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.item,
        status: "DISPONIVEL",
        usuario_id: testIds.doador,
      });
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue({
      _id: testIds.administracao,
    });

    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 409 });
    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(service.criar({ item_id: testIds.item }, createRegularUser({ id: testIds.interessado })))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test("Deve rejeitar aceite e recusa quando estado ou concorrencia mudarem", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "RECUSADO",
        item_id: testIds.item,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: testIds.item,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: testIds.item,
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
        item_id: testIds.item,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        item_id: testIds.item,
        usuario_interessado_id: testIds.interessado,
      });
    itemDoacaoRepository.buscarPorId
      .mockResolvedValueOnce({ _id: testIds.item, usuario_id: testIds.doador, status: "DISPONIVEL" })
      .mockResolvedValueOnce({ _id: testIds.item, usuario_id: testIds.doador, status: "RESERVADO" })
      .mockResolvedValueOnce({ _id: testIds.item, usuario_id: testIds.doador, status: "DISPONIVEL" })
      .mockResolvedValueOnce({ _id: testIds.item, usuario_id: testIds.doador, status: "DISPONIVEL" })
      .mockResolvedValueOnce({ _id: testIds.item, usuario_id: testIds.doador, status: "DISPONIVEL" });
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue({});
    interesseRepository.atualizarSeStatus.mockResolvedValue(null);
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({});

    await expect(service.aceitar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.aceitar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.aceitar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.recusar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.recusar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 409 });
  });

  test("Deve rejeitar cancelamentos invalidos e interesse inexistente", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "RECUSADO",
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
        item_id: testIds.item,
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce(null);
    interesseRepository.atualizarSeStatus.mockResolvedValue(null);
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue(null);

    await expect(service.cancelar(testIds.administracao, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.buscarPorId(testIds.administracao, createRegularUser()))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(service.listar({}, {}))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test("Deve cancelar interesse pendente sem liberar reserva", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
        usuario_interessado_id: testIds.interessado,
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "CANCELADO",
      });
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
    });

    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).resolves.toMatchObject({ status: "CANCELADO" });

    expect(itemDoacaoRepository.liberarReservaDoInteresse).not.toHaveBeenCalled();
  });

  test("Deve propagar falhas de criação e incremento para rollback transacional", async () => {
    const falhaCriacao = new Error("falha ao criar");
    const falhaIncremento = new Error("falha ao incrementar");
    usuarioRepository.buscarPorId.mockResolvedValue({
      _id: testIds.interessado,
      situacao: "ATIVO",
    });
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
    });
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar
      .mockRejectedValueOnce(falhaCriacao)
      .mockResolvedValueOnce({ _id: testIds.administracao });
    itemDoacaoRepository.incrementarInteressesSeDisponivel.mockRejectedValue(falhaIncremento);

    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toBe(falhaCriacao);
    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toBe(falhaIncremento);

    expect(transactionManager.run).toHaveBeenCalledTimes(2);
    expect(interesseRepository.deletar).not.toHaveBeenCalled();
  });

  test("Deve retornar conflito para corrida no cancelamento sem compensação manual", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
      item_id: testIds.item,
      usuario_interessado_id: testIds.interessado,
    });
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({});
    interesseRepository.atualizarSeStatus.mockResolvedValue(null);

    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O interesse não está mais aceito.",
    });

    expect(itemDoacaoRepository.restaurarReservaSeDisponivel).not.toHaveBeenCalled();
  });

  test("Deve permitir ao administrador consultar qualquer interesse", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      usuario_interessado_id: testIds.interessado,
      usuario_doador_id: testIds.doador,
    });

    await expect(service.buscarPorId(testIds.administracao, createAdminUser()))
      .resolves.toMatchObject({ _id: testIds.administracao });
  });
});
