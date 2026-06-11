import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import InteresseService from "../../services/InteresseService.js";
import { createRegularUser, testIds } from "../test.js";

describe("InteresseService", () => {
  let interesseRepository;
  let itemDoacaoRepository;
  let usuarioRepository;
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
      restaurarRecusadosDoAceite: jest.fn(),
      listarPorItem: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      incrementarInteressesSeDisponivel: jest.fn(),
      reservarSeDisponivel: jest.fn(),
      liberarReservaDoInteresse: jest.fn(),
      restaurarReservaSeDisponivel: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
    };

    service = new InteresseService({
      interesseRepository,
      itemDoacaoRepository,
      usuarioRepository,
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
    expect(resultado).toMatchObject({ status: "PENDENTE" });
  });

  test("Deve cancelar interesse aceito e reabrir o item", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
        item_id: { _id: testIds.item },
        usuario_interessado_id: { _id: testIds.interessado },
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

  test("Deve remover interesse criado se o item ficar indisponível durante a criação", async () => {
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
    interesseRepository.deletar.mockResolvedValue({});

    await expect(
      service.criar(
        { item_id: testIds.item },
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O item não está mais disponível para receber interesses.",
    });

    expect(interesseRepository.deletar).toHaveBeenCalledWith(testIds.administracao);
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

  test("Deve compensar o aceite quando a recusa dos demais interesses falhar", async () => {
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
    interesseRepository.atualizarSeStatus
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "ACEITO",
      })
      .mockResolvedValueOnce({
        _id: testIds.administracao,
        status: "PENDENTE",
      });
    interesseRepository.recusarPendentesDoItem.mockRejectedValue(falha);
    interesseRepository.restaurarRecusadosDoAceite.mockResolvedValue({});
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue({});

    await expect(
      service.aceitar(
        testIds.administracao,
        {},
        createRegularUser({ id: testIds.doador })
      )
    ).rejects.toBe(falha);

    expect(interesseRepository.restaurarRecusadosDoAceite).toHaveBeenCalled();
    expect(interesseRepository.atualizarSeStatus).toHaveBeenLastCalledWith(
      testIds.administracao,
      "ACEITO",
      {
        status: "PENDENTE",
        data_resposta: null,
        resposta_doador: null,
      }
    );
    expect(itemDoacaoRepository.liberarReservaDoInteresse).toHaveBeenCalledWith(
      testIds.item,
      testIds.administracao
    );
  });

  test("Deve restaurar a reserva se o cancelamento aceito perder a corrida", async () => {
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
    itemDoacaoRepository.restaurarReservaSeDisponivel.mockResolvedValue({
      _id: testIds.item,
      status: "RESERVADO",
    });

    await expect(
      service.cancelar(
        testIds.administracao,
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "O interesse não está mais aceito.",
    });

    expect(itemDoacaoRepository.restaurarReservaSeDisponivel).toHaveBeenCalledWith(
      testIds.item,
      testIds.administracao
    );
  });

  test("Deve sinalizar falha crítica quando não conseguir compensar interesse criado", async () => {
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
    interesseRepository.deletar.mockResolvedValue(null);

    await expect(
      service.criar(
        { item_id: testIds.item },
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toThrow("Falha ao remover interesse criado durante compensação.");
  });

  test("Deve sinalizar falha crítica quando o rollback do aceite ficar incompleto", async () => {
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
    itemDoacaoRepository.reservarSeDisponivel.mockResolvedValue({});
    interesseRepository.atualizarSeStatus.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockRejectedValue(falha);
    interesseRepository.restaurarRecusadosDoAceite.mockResolvedValue({});
    itemDoacaoRepository.liberarReservaDoInteresse.mockResolvedValue(null);

    await expect(
      service.aceitar(
        testIds.administracao,
        {},
        createRegularUser({ id: testIds.doador })
      )
    ).rejects.toThrow("Falha ao compensar aceite de interesse.");
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
});
