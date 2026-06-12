import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoModel from "../../models/ItemDoacao.js";
import InteresseService from "../../services/InteresseService.js";
import { createRegularUser, testIds } from "../test.js";

describe("InteresseService", () => {
  let interesseRepository;
  let usuarioRepository;
  let notificacaoService;
  let service;

  beforeEach(() => {
    interesseRepository = {
      listar: jest.fn(),
      buscarAtivoPorItemEInteressado: jest.fn(),
      criar: jest.fn(),
      buscarPorIdDetalhado: jest.fn(),
      atualizar: jest.fn(),
      recusarPendentesDoItem: jest.fn(),
      listarPendentesDoItemExceto: jest.fn(),
      listarPorItem: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
    };

    notificacaoService = {
      criarNotificacoesComSeguranca: jest.fn().mockResolvedValue([]),
    };

    service = new InteresseService({
      interesseRepository,
      usuarioRepository,
      notificacaoService,
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
    jest.spyOn(ItemDoacaoModel, "findById").mockResolvedValue({
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
    const itemUpdateSpy = jest.spyOn(ItemDoacaoModel, "findByIdAndUpdate").mockResolvedValue({});

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
    expect(itemUpdateSpy).toHaveBeenCalledWith(testIds.item, {
      $inc: { total_interesses: 1 },
    });
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
    interesseRepository.listarPendentesDoItemExceto.mockResolvedValue([
      {
        _id: testIds.denuncia,
        usuario_interessado_id: testIds.usuario,
      },
    ]);
    interesseRepository.atualizar.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(ItemDoacaoModel, "findById").mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    jest.spyOn(ItemDoacaoModel, "findByIdAndUpdate").mockResolvedValue({
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
    interesseRepository.listarPendentesDoItemExceto.mockRejectedValue(
      new Error("consulta indisponível")
    );
    interesseRepository.atualizar.mockResolvedValue({
      _id: testIds.administracao,
      status: "ACEITO",
    });
    interesseRepository.recusarPendentesDoItem.mockResolvedValue({ modifiedCount: 0 });
    jest.spyOn(ItemDoacaoModel, "findById").mockResolvedValue({
      _id: testIds.item,
      usuario_id: testIds.doador,
      titulo: "Cadeira",
      status: "DISPONIVEL",
    });
    jest.spyOn(ItemDoacaoModel, "findByIdAndUpdate").mockResolvedValue({
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
    interesseRepository.atualizar.mockResolvedValue({
      _id: testIds.administracao,
      status: "RECUSADO",
    });
    jest.spyOn(ItemDoacaoModel, "findById").mockResolvedValue({
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
    jest.spyOn(ItemDoacaoModel, "findById").mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
      usuario_id: testIds.doador,
      titulo: "Cadeira",
    });
    jest.spyOn(ItemDoacaoModel, "findByIdAndUpdate").mockResolvedValue({});
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
    interesseRepository.atualizar.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
    });
    const itemUpdateSpy = jest.spyOn(ItemDoacaoModel, "findByIdAndUpdate").mockResolvedValue({
      _id: testIds.item,
      status: "DISPONIVEL",
    });

    const resultado = await service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    );

    expect(interesseRepository.atualizar).toHaveBeenCalledWith(
      testIds.administracao,
      expect.objectContaining({ status: "CANCELADO" })
    );
    expect(itemUpdateSpy).toHaveBeenCalledWith(testIds.item, {
      status: "DISPONIVEL",
      interesse_aceito_id: null,
    });
    expect(notificacaoService.criarNotificacoesComSeguranca).toHaveBeenCalledWith([
      expect.objectContaining({
        usuario_id: testIds.doador,
        tipo: "INTERESSE_CANCELADO",
      }),
    ]);
    expect(resultado).toMatchObject({ status: "CANCELADO" });
  });
});
