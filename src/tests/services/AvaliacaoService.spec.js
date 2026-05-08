import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import AvaliacaoService from "../../services/AvaliacaoService.js";
import { createRegularUser, testIds } from "../test.js";

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
});
