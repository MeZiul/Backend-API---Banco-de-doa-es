import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AvaliacaoService from "../../services/AvaliacaoService.js";
import { createAdminUser, createRegularUser, testIds } from "../test.js";

describe("AvaliacaoService", () => {
  let avaliacaoRepository;
  let itemDoacaoRepository;
  let interesseRepository;
  let usuarioRepository;
  let service;

  beforeEach(() => {
    avaliacaoRepository = {
      buscarPorAvaliadorItemTipo: jest.fn(),
      criar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
      listar: jest.fn(),
    };

    itemDoacaoRepository = {
      buscarPorId: jest.fn(),
    };

    interesseRepository = {
      buscarPorIdDetalhado: jest.fn(),
    };

    usuarioRepository = {
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
    };

    service = new AvaliacaoService({
      avaliacaoRepository,
      itemDoacaoRepository,
      interesseRepository,
      usuarioRepository,
    });
  });

  const criarItemDoado = () => ({
    _id: testIds.item,
    status: "DOADO",
    usuario_id: testIds.doador,
    interesse_aceito_id: testIds.administracao,
    data_doacao: new Date(),
  });

  const criarInteresseAceito = () => ({
    _id: testIds.administracao,
    status: "ACEITO",
    usuario_interessado_id: testIds.interessado,
  });

  test("Deve criar avaliação quando o interessado aceito avalia o doador", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(criarInteresseAceito());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });
    avaliacaoRepository.buscarPorAvaliadorItemTipo.mockResolvedValue(null);
    avaliacaoRepository.criar.mockResolvedValue({ _id: testIds.denuncia, nota: 5 });
    avaliacaoRepository.listar.mockResolvedValue({ docs: [{ nota: 5 }] });

    const resultado = await service.criar(
      {
        item_id: testIds.item,
        avaliado_id: testIds.doador,
        nota: 5,
        comentario: "Doador muito atencioso.",
        tipo: "INTERESSADO_PARA_DOADOR",
      },
      testIds.interessado
    );

    expect(avaliacaoRepository.criar).toHaveBeenCalledWith({
      item_id: testIds.item,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
      nota: 5,
      comentario: "Doador muito atencioso.",
      tipo: "INTERESSADO_PARA_DOADOR",
    });
    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.doador, {
      media_avaliacoes: 5,
      total_avaliacoes: 1,
    });
    expect(resultado).toEqual({ _id: testIds.denuncia, nota: 5 });
  });

  test("Deve criar avaliação quando o doador avalia o interessado", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(criarInteresseAceito());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.interessado });
    avaliacaoRepository.buscarPorAvaliadorItemTipo.mockResolvedValue(null);
    avaliacaoRepository.criar.mockResolvedValue({ _id: testIds.denuncia, nota: 4 });
    avaliacaoRepository.listar.mockResolvedValue({ docs: [{ nota: 4 }] });

    const resultado = await service.criar(
      {
        item_id: testIds.item,
        avaliado_id: testIds.interessado,
        nota: 4,
        comentario: "Interessado pontual.",
        tipo: "DOADOR_PARA_INTERESSADO",
      },
      testIds.doador
    );

    expect(avaliacaoRepository.criar).toHaveBeenCalledWith({
      item_id: testIds.item,
      avaliador_id: testIds.doador,
      avaliado_id: testIds.interessado,
      nota: 4,
      comentario: "Interessado pontual.",
      tipo: "DOADOR_PARA_INTERESSADO",
    });
    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.interessado, {
      media_avaliacoes: 4,
      total_avaliacoes: 1,
    });
    expect(resultado).toEqual({ _id: testIds.denuncia, nota: 4 });
  });

  test("Deve impedir avaliação de usuário que não participou da doação", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(criarInteresseAceito());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 4,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.usuario
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas o interessado aceito pode avaliar o doador deste item.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando item não é encontrado", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      customMessage: "Item não encontrado.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando item não está com status DOADO", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      ...criarItemDoado(),
      status: "DISPONIVEL",
    });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "Avaliações só podem ser feitas após a doação ser confirmada.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando prazo de 30 dias expirou", async () => {
    const dataAntiga = new Date();
    dataAntiga.setDate(dataAntiga.getDate() - 31);

    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      ...criarItemDoado(),
      data_doacao: dataAntiga,
    });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "O prazo para avaliar esta doação expirou (30 dias).",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando usuário avaliado não é encontrado", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    usuarioRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      customMessage: "Usuário avaliado não encontrado.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação duplicada na mesma doação e mesmo sentido", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(criarInteresseAceito());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });
    avaliacaoRepository.buscarPorAvaliadorItemTipo.mockResolvedValue({ _id: testIds.denuncia });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      customMessage: "Você já avaliou esta doação neste sentido.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve permitir que apenas o autor atualize a nota e recalcular a média", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
      nota: 3,
    });
    avaliacaoRepository.atualizar.mockResolvedValue({
      _id: testIds.denuncia,
      nota: 4,
    });
    avaliacaoRepository.listar.mockResolvedValue({ docs: [{ nota: 4 }, { nota: 2 }] });

    const resultado = await service.atualizar(
      testIds.denuncia,
      { nota: 4 },
      createRegularUser({ id: testIds.interessado })
    );

    expect(avaliacaoRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, { nota: 4 });
    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.doador, {
      media_avaliacoes: 3,
      total_avaliacoes: 2,
    });
    expect(resultado).toEqual({ _id: testIds.denuncia, nota: 4 });
  });

  test("Deve atualizar comentário sem recalcular a média", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
      nota: 5,
    });
    avaliacaoRepository.atualizar.mockResolvedValue({
      _id: testIds.denuncia,
      nota: 5,
      comentario: "Comentário atualizado.",
    });

    const resultado = await service.atualizar(
      testIds.denuncia,
      { comentario: "Comentário atualizado." },
      createRegularUser({ id: testIds.interessado })
    );

    expect(avaliacaoRepository.atualizar).toHaveBeenCalledWith(testIds.denuncia, { comentario: "Comentário atualizado." });
    expect(usuarioRepository.atualizar).not.toHaveBeenCalled();
    expect(resultado).toEqual({ _id: testIds.denuncia, nota: 5, comentario: "Comentário atualizado." });
  });

  test("Deve impedir atualização quando avaliação não é encontrada", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.atualizar(
        testIds.denuncia,
        { nota: 4 },
        createRegularUser({ id: testIds.interessado })
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      customMessage: "Avaliação não encontrada.",
    });

    expect(avaliacaoRepository.atualizar).not.toHaveBeenCalled();
  });

  test("Deve impedir atualização por usuário que não é autor da avaliação", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
      nota: 3,
    });

    await expect(
      service.atualizar(
        testIds.denuncia,
        { nota: 4 },
        createRegularUser({ id: testIds.usuario })
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas o autor da avaliação pode alterar ou remover este registro.",
    });

    expect(avaliacaoRepository.atualizar).not.toHaveBeenCalled();
  });

  test("Deve impedir remoção por usuário que não é autor da avaliação", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
    });

    await expect(
      service.deletar(testIds.denuncia, createRegularUser({ id: testIds.usuario }))
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas o autor da avaliação pode alterar ou remover este registro.",
    });

    expect(avaliacaoRepository.deletar).not.toHaveBeenCalled();
  });

  test("Deve permitir que o autor delete a própria avaliação", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
    });
    avaliacaoRepository.listar.mockResolvedValue({ docs: [] });

    const resultado = await service.deletar(
      testIds.denuncia,
      createRegularUser({ id: testIds.interessado })
    );

    expect(avaliacaoRepository.deletar).toHaveBeenCalledWith(testIds.denuncia);
    expect(usuarioRepository.atualizar).toHaveBeenCalledWith(testIds.doador, {
      media_avaliacoes: 0,
      total_avaliacoes: 0,
    });
    expect(resultado).toEqual({ message: "Avaliação removida com sucesso." });
  });

  test("Deve permitir que ADMINISTRADOR delete avaliação de outro usuário", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
    });
    avaliacaoRepository.listar.mockResolvedValue({ docs: [] });

    const resultado = await service.deletar(
      testIds.denuncia,
      createAdminUser()
    );

    expect(avaliacaoRepository.deletar).toHaveBeenCalledWith(testIds.denuncia);
    expect(resultado).toEqual({ message: "Avaliação removida com sucesso." });
  });

  test("Deve impedir remoção quando avaliação não é encontrada", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.deletar(testIds.denuncia, createRegularUser({ id: testIds.interessado }))
    ).rejects.toMatchObject({
      statusCode: 404,
      customMessage: "Avaliação não encontrada.",
    });

    expect(avaliacaoRepository.deletar).not.toHaveBeenCalled();
  });

  test("Deve retornar avaliação quando buscarPorId encontra o registro", async () => {
    const avaliacao = { _id: testIds.denuncia, nota: 5 };
    avaliacaoRepository.buscarPorId.mockResolvedValue(avaliacao);

    const resultado = await service.buscarPorId(testIds.denuncia);

    expect(avaliacaoRepository.buscarPorId).toHaveBeenCalledWith(testIds.denuncia);
    expect(resultado).toEqual(avaliacao);
  });

  test("Deve lançar 404 quando buscarPorId não encontra o registro", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue(null);

    await expect(service.buscarPorId(testIds.denuncia)).rejects.toMatchObject({
      statusCode: 404,
      customMessage: "Avaliação não encontrada.",
    });
  });

  test("Deve limitar a listagem às avaliações relacionadas ao usuário comum", async () => {
    const mockResultado = { docs: [{ nota: 5 }], total: 1 };
    avaliacaoRepository.listar.mockResolvedValue(mockResultado);

    const resultado = await service.listarPorUsuario({
      filtros: { avaliado_id: testIds.doador },
    }, createRegularUser({ id: testIds.interessado }));

    expect(avaliacaoRepository.listar).toHaveBeenCalledWith({
      filtros: { avaliado_id: testIds.doador },
      page: 1,
      limit: 20,
      usuarioId: testIds.interessado,
    });
    expect(resultado).toEqual(mockResultado);
  });

  test("Deve permitir listagem sem escopo para administrador", async () => {
    const mockResultado = { docs: [], total: 0 };
    avaliacaoRepository.listar.mockResolvedValue(mockResultado);

    const resultado = await service.listarPorUsuario({
      filtros: {},
      page: 2,
      limit: 10,
    }, createAdminUser({ id: testIds.admin }));

    expect(avaliacaoRepository.listar).toHaveBeenCalledWith({
      filtros: {},
      page: 2,
      limit: 10,
      usuarioId: undefined,
    });
    expect(resultado).toEqual(mockResultado);
  });

  test("Deve rejeitar listagem sem usuário autenticado", async () => {
    await expect(service.listarPorUsuario({ filtros: {} }, {})).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "Usuário autenticado não informado.",
    });

    expect(avaliacaoRepository.listar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando item não possui data_doacao", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      ...criarItemDoado(),
      data_doacao: null,
    });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "A data de conclusão da doação é obrigatória para avaliação.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando item não possui interesse aceito vinculado", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue({
      ...criarItemDoado(),
      interesse_aceito_id: null,
    });
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "A doação não possui interesse aceito vinculado.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando interesse buscado não está com status ACEITO", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue({
      _id: testIds.administracao,
      status: "CANCELADO",
      usuario_interessado_id: testIds.interessado,
    });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "Interesse aceito não encontrado para esta doação.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir avaliação quando interesse buscado retorna nulo", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.doador });
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(null);

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.doador,
          nota: 5,
          tipo: "INTERESSADO_PARA_DOADOR",
        },
        testIds.interessado
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      customMessage: "Interesse aceito não encontrado para esta doação.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir doador de avaliar interessado incorreto no tipo DOADOR_PARA_INTERESSADO", async () => {
    itemDoacaoRepository.buscarPorId.mockResolvedValue(criarItemDoado());
    interesseRepository.buscarPorIdDetalhado.mockResolvedValue(criarInteresseAceito());
    usuarioRepository.buscarPorId.mockResolvedValue({ _id: testIds.usuario });

    await expect(
      service.criar(
        {
          item_id: testIds.item,
          avaliado_id: testIds.usuario,
          nota: 4,
          tipo: "DOADOR_PARA_INTERESSADO",
        },
        testIds.doador
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      customMessage: "Apenas o doador pode avaliar o interessado aceito neste item.",
    });

    expect(avaliacaoRepository.criar).not.toHaveBeenCalled();
  });

  test("Deve impedir atualização quando usuário autenticado não possui id", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
      nota: 3,
    });

    await expect(
      service.atualizar(testIds.denuncia, { nota: 4 }, {})
    ).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "Usuário autenticado não informado.",
    });

    expect(avaliacaoRepository.atualizar).not.toHaveBeenCalled();
  });

  test("Deve impedir remoção quando usuário autenticado não possui id", async () => {
    avaliacaoRepository.buscarPorId.mockResolvedValue({
      _id: testIds.denuncia,
      avaliador_id: testIds.interessado,
      avaliado_id: testIds.doador,
    });

    await expect(
      service.deletar(testIds.denuncia, {})
    ).rejects.toMatchObject({
      statusCode: 401,
      customMessage: "Usuário autenticado não informado.",
    });

    expect(avaliacaoRepository.deletar).not.toHaveBeenCalled();
  });
});
