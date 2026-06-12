import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import InteresseService from "../../services/InteresseService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("InteresseService", () => {
  let interesseRepository;
  let usuarioRepository;
  let itemModel;
  let service;

  const interessePendente = (overrides = {}) => ({
    _id: testIds.administracao,
    status: "PENDENTE",
    item_id: { _id: testIds.item },
    usuario_interessado_id: { _id: testIds.interessado },
    usuario_doador_id: { _id: testIds.doador },
    ...overrides,
  });

  const itemDisponivel = (overrides = {}) => ({
    _id: testIds.item,
    status: "DISPONIVEL",
    usuario_id: testIds.doador,
    ...overrides,
  });

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

    itemModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    service = new InteresseService({ interesseRepository, usuarioRepository });
    service.itemModel = itemModel;
  });

  test("deve restringir a listagem do usuario comum aos proprios interesses", async () => {
    interesseRepository.listar.mockResolvedValue({ docs: [] });

    await service.listar({
      filtros: { status: "PENDENTE", usuarioInteressadoId: "remover" },
      page: "2",
      limit: "5",
    }, createRegularUser({ id: testIds.interessado }));

    expect(interesseRepository.listar).toHaveBeenCalledWith({
      filtros: { status: "PENDENTE", usuario_interessado_id: testIds.interessado },
      page: 2,
      limit: 5,
    });
  });

  test("deve preservar filtros do administrador e restringir recebidos ao doador", async () => {
    interesseRepository.listar.mockResolvedValue({ docs: [] });
    const filtrosAdmin = { status: "ACEITO", usuario_interessado_id: testIds.interessado };

    await service.listar({ filtros: filtrosAdmin }, createAdminUser());
    await service.listarRecebidos({
      filtros: { status: "PENDENTE", usuarioDoadorId: "remover" },
      page: "3",
      limit: "7",
    }, createRegularUser({ id: testIds.doador }));

    expect(interesseRepository.listar).toHaveBeenNthCalledWith(1, {
      filtros: filtrosAdmin,
      page: 1,
      limit: 15,
    });
    expect(interesseRepository.listar).toHaveBeenNthCalledWith(2, {
      filtros: { status: "PENDENTE", usuario_doador_id: testIds.doador },
      page: 3,
      limit: 7,
    });
  });

  test("deve listar interesses do item para doador ou administrador", async () => {
    itemModel.findById.mockResolvedValue(itemDisponivel());
    interesseRepository.listarPorItem.mockResolvedValue([{ _id: testIds.administracao }]);

    await expect(service.listarPorItem(
      testIds.item,
      createRegularUser({ id: testIds.doador })
    )).resolves.toHaveLength(1);
    await expect(service.listarPorItem(testIds.item, createAdminUser())).resolves.toHaveLength(1);

    expect(interesseRepository.listarPorItem).toHaveBeenCalledTimes(2);
  });

  test("deve rejeitar listagem do item para usuario sem permissao", async () => {
    itemModel.findById.mockResolvedValue(itemDisponivel());

    await expect(service.listarPorItem(
      testIds.item,
      createRegularUser({ id: testIds.usuario })
    )).rejects.toMatchObject({ statusCode: 403 });

    expect(interesseRepository.listarPorItem).not.toHaveBeenCalled();
  });

  test("deve permitir consulta do interesse aos envolvidos e ao administrador", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(interessePendente());

    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).resolves.toMatchObject({ status: "PENDENTE" });
    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.doador })
    )).resolves.toMatchObject({ status: "PENDENTE" });
    await expect(service.buscarPorId(testIds.administracao, createAdminUser()))
      .resolves.toMatchObject({ status: "PENDENTE" });
  });

  test("deve rejeitar consulta do interesse para terceiro", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(interessePendente());

    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.usuario })
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("deve criar interesse para item disponivel e usuario ativo", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.interessado, situacao: "ATIVO" });
    itemModel.findById.mockResolvedValue(itemDisponivel());
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(null);
    interesseRepository.criar.mockResolvedValue({ _id: testIds.administracao });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(interessePendente());

    const resultado = await service.criar({
      itemId: testIds.item,
      mensagemInteressado: "Posso buscar hoje.",
    }, createRegularUser({ id: testIds.interessado }));

    expect(interesseRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
      item_id: testIds.item,
      usuario_interessado_id: testIds.interessado,
      usuario_doador_id: testIds.doador,
      mensagem_interessado: "Posso buscar hoje.",
      status: "PENDENTE",
      data_interesse: expect.any(Date),
    }));
    expect(itemModel.findByIdAndUpdate).toHaveBeenCalledWith(testIds.item, {
      $inc: { total_interesses: 1 },
    });
    expect(resultado).toMatchObject({ status: "PENDENTE" });
  });

  test("deve rejeitar criacao por usuario inexistente ou inativo", async () => {
    usuarioRepository.buscarPorId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: testIds.interessado, situacao: "SUSPENSO" });

    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 403 });

    expect(itemModel.findById).not.toHaveBeenCalled();
  });

  test("deve rejeitar criacao para item inexistente, indisponivel ou proprio", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.interessado, situacao: "ATIVO" });
    itemModel.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(itemDisponivel({ status: "RESERVADO" }))
      .mockResolvedValueOnce(itemDisponivel({ usuario_id: testIds.interessado }));

    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(interesseRepository.criar).not.toHaveBeenCalled();
  });

  test("deve rejeitar interesse ativo duplicado", async () => {
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.interessado, situacao: "ATIVO" });
    itemModel.findById.mockResolvedValue(itemDisponivel());
    interesseRepository.buscarAtivoPorItemEInteressado.mockResolvedValue(interessePendente());

    await expect(service.criar(
      { item_id: testIds.item },
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 409 });

    expect(interesseRepository.criar).not.toHaveBeenCalled();
  });

  test("deve aceitar interesse pendente, reservar item e recusar concorrentes", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente())
      .mockResolvedValueOnce(interessePendente({ status: "ACEITO" }));
    itemModel.findById.mockResolvedValue(itemDisponivel());
    interesseRepository.atualizar.mockResolvedValue({ _id: testIds.administracao, status: "ACEITO" });

    const resultado = await service.aceitar(
      testIds.administracao,
      { respostaDoador: "Pode buscar." },
      createRegularUser({ id: testIds.doador })
    );

    expect(interesseRepository.atualizar).toHaveBeenCalledWith(testIds.administracao, expect.objectContaining({
      status: "ACEITO",
      resposta_doador: "Pode buscar.",
      data_resposta: expect.any(Date),
    }));
    expect(itemModel.findByIdAndUpdate).toHaveBeenCalledWith(testIds.item, {
      status: "RESERVADO",
      interesse_aceito_id: testIds.administracao,
    });
    expect(interesseRepository.recusarPendentesDoItem).toHaveBeenCalledWith(
      testIds.item,
      testIds.administracao,
      { data_resposta: expect.any(Date) }
    );
    expect(resultado).toMatchObject({ status: "ACEITO" });
  });

  test("deve rejeitar aceite por terceiro, de interesse nao pendente ou item indisponivel", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente())
      .mockResolvedValueOnce(interessePendente({ status: "RECUSADO" }))
      .mockResolvedValueOnce(interessePendente());
    itemModel.findById
      .mockResolvedValueOnce(itemDisponivel())
      .mockResolvedValueOnce(itemDisponivel())
      .mockResolvedValueOnce(itemDisponivel({ status: "RESERVADO" }));

    await expect(service.aceitar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.usuario })
    )).rejects.toMatchObject({ statusCode: 403 });
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

    expect(interesseRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve recusar interesse pendente pelo doador", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente())
      .mockResolvedValueOnce(interessePendente({ status: "RECUSADO" }));
    itemModel.findById.mockResolvedValue(itemDisponivel());
    interesseRepository.atualizar.mockResolvedValue({ _id: testIds.administracao, status: "RECUSADO" });

    await expect(service.recusar(
      testIds.administracao,
      { resposta_doador: "Outro beneficiario foi escolhido." },
      createRegularUser({ id: testIds.doador })
    )).resolves.toMatchObject({ status: "RECUSADO" });

    expect(interesseRepository.atualizar).toHaveBeenCalledWith(testIds.administracao, expect.objectContaining({
      status: "RECUSADO",
      resposta_doador: "Outro beneficiario foi escolhido.",
      data_resposta: expect.any(Date),
    }));
  });

  test("deve rejeitar recusa de interesse nao pendente", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(interessePendente({ status: "ACEITO" }));
    itemModel.findById.mockResolvedValue(itemDisponivel());

    await expect(service.recusar(
      testIds.administracao,
      {},
      createRegularUser({ id: testIds.doador })
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(interesseRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve cancelar interesse pendente sem alterar o item", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente())
      .mockResolvedValueOnce(interessePendente({ status: "CANCELADO" }));
    interesseRepository.atualizar.mockResolvedValue({ _id: testIds.administracao });

    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).resolves.toMatchObject({ status: "CANCELADO" });

    expect(itemModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("deve cancelar interesse aceito e reabrir o item", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente({ status: "ACEITO" }))
      .mockResolvedValueOnce(interessePendente({ status: "CANCELADO" }));
    interesseRepository.atualizar.mockResolvedValue({ _id: testIds.administracao });

    await service.cancelar(testIds.administracao, createRegularUser({ id: testIds.interessado }));

    expect(itemModel.findByIdAndUpdate).toHaveBeenCalledWith(testIds.item, {
      status: "DISPONIVEL",
      interesse_aceito_id: null,
    });
  });

  test("deve rejeitar cancelamento por terceiro ou em estado final", async () => {
    interesseRepository.buscarPorIdDetalhado
      .mockResolvedValueOnce(interessePendente())
      .mockResolvedValueOnce(interessePendente({ status: "RECUSADO" }));

    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.usuario })
    )).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.cancelar(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 400 });

    expect(interesseRepository.atualizar).not.toHaveBeenCalled();
  });

  test("deve retornar 404 para interesse inexistente", async () => {
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(service.buscarPorId(
      testIds.administracao,
      createRegularUser({ id: testIds.interessado })
    )).rejects.toMatchObject({ statusCode: 404 });
  });

  test("deve rejeitar operacao sem usuario autenticado", async () => {
    await expect(service.listar({ filtros: {} }, {})).rejects.toMatchObject({ statusCode: 401 });
    expect(interesseRepository.listar).not.toHaveBeenCalled();
  });
});
