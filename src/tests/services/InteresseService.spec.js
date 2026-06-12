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
      recusarPendentesDoItem: jest.fn(),
      listarPorItem: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
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
    itemDoacaoRepository.atualizar.mockResolvedValue({});

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
    expect(itemDoacaoRepository.atualizar).toHaveBeenCalledWith(testIds.item, {
      $inc: { total_interesses: 1 },
    });
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
    interesseRepository.atualizar.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
    });
    itemDoacaoRepository.atualizar.mockResolvedValue({
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
    expect(itemDoacaoRepository.atualizar).toHaveBeenCalledWith(testIds.item, {
      status: "DISPONIVEL",
      interesse_aceito_id: null,
    });
    expect(resultado).toMatchObject({ status: "CANCELADO" });
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
});
