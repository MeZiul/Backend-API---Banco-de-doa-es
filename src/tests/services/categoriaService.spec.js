import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import CategoriaService from "../../services/CategoriaService.js";
import CustomError from "../../utils/helpers/CustomError.js";

const mockCategoriaRepository = {
  buscarPorNome: jest.fn(),
  buscarPorId:   jest.fn(),
  criar:         jest.fn(),
  atualizar:     jest.fn(),
  deletar:       jest.fn(),
  listar:        jest.fn(),
};

let service;

beforeEach(() => {
  Object.values(mockCategoriaRepository).forEach((fn) => fn.mockReset());
  service = new CategoriaService({ categoriaRepository: mockCategoriaRepository });
});

describe("CategoriaService.criar", () => {

  test("SV-CAT-01 — cria categoria com nome unico", async () => {
    mockCategoriaRepository.buscarPorNome.mockResolvedValue(null);
    mockCategoriaRepository.criar.mockResolvedValue({ _id: "123", nome: "Roupas", ativo: true });

    const resultado = await service.criar({ nome: "Roupas", descricao: "Roupas em geral" });

    expect(resultado.nome).toBe("Roupas");
    expect(mockCategoriaRepository.criar).toHaveBeenCalledTimes(1);
  });

  test("SV-CAT-02 — lanca 409 se nome ja existe", async () => {
    mockCategoriaRepository.buscarPorNome.mockResolvedValue({ _id: "123", nome: "Roupas" });

    await expect(
      service.criar({ nome: "Roupas" })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockCategoriaRepository.criar).not.toHaveBeenCalled();
  });
});

describe("CategoriaService.atualizar", () => {

  test("SV-CAT-03 — atualiza categoria existente", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue({ _id: "123", nome: "Roupas" });
    mockCategoriaRepository.buscarPorNome.mockResolvedValue(null);
    mockCategoriaRepository.atualizar.mockResolvedValue({ _id: "123", nome: "Roupas Novas" });

    const resultado = await service.atualizar("123", { nome: "Roupas Novas" });

    expect(resultado.nome).toBe("Roupas Novas");
    expect(mockCategoriaRepository.atualizar).toHaveBeenCalledTimes(1);
  });

  test("SV-CAT-04 — lanca 404 se categoria nao encontrada", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.atualizar("999", { nome: "Novo Nome" })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockCategoriaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("SV-CAT-05 — lanca 409 se novo nome ja usado por outra categoria", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue({ _id: "123", nome: "Roupas" });
    mockCategoriaRepository.buscarPorNome.mockResolvedValue({ _id: "456", nome: "Moveis" });

    await expect(
      service.atualizar("123", { nome: "Moveis" })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockCategoriaRepository.atualizar).not.toHaveBeenCalled();
  });

  test("SV-CAT-06 — permite atualizar sem mudar o nome", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue({ _id: "123", nome: "Roupas" });
    mockCategoriaRepository.atualizar.mockResolvedValue({ _id: "123", descricao: "Nova descricao" });

    const resultado = await service.atualizar("123", { descricao: "Nova descricao" });

    expect(mockCategoriaRepository.atualizar).toHaveBeenCalledTimes(1);
    expect(mockCategoriaRepository.buscarPorNome).not.toHaveBeenCalled();
  });
});

describe("CategoriaService.deletar", () => {

  test("SV-CAT-07 — deleta categoria existente", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue({ _id: "123", nome: "Roupas" });
    mockCategoriaRepository.deletar.mockResolvedValue({ _id: "123" });

    await service.deletar("123");

    expect(mockCategoriaRepository.deletar).toHaveBeenCalledWith("123");
  });

  test("SV-CAT-08 — lanca 404 se categoria nao encontrada", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.deletar("999")
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockCategoriaRepository.deletar).not.toHaveBeenCalled();
  });
});

describe("CategoriaService.listar", () => {

  test("SV-CAT-09 — usuario comum lista apenas categorias ativas", async () => {
    mockCategoriaRepository.listar.mockResolvedValue({ docs: [], totalDocs: 0 });

    await service.listar({ filtros: {}, page: 1, limit: 20 }, false);

    expect(mockCategoriaRepository.listar).toHaveBeenCalledWith(
      expect.objectContaining({ filtros: expect.objectContaining({ ativo: true }) })
    );
  });

  test("SV-CAT-10 — admin lista todas as categorias incluindo inativas", async () => {
    mockCategoriaRepository.listar.mockResolvedValue({ docs: [], totalDocs: 0 });

    await service.listar({ filtros: {}, page: 1, limit: 20 }, true);

    const chamada = mockCategoriaRepository.listar.mock.calls[0][0];
    expect(chamada.filtros.ativo).toBeUndefined();
  });
});

describe("CategoriaService.buscarPorId", () => {

  test("SV-CAT-11 — retorna categoria existente", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue({ _id: "123", nome: "Roupas" });

    const resultado = await service.buscarPorId("123");

    expect(resultado.nome).toBe("Roupas");
  });

  test("SV-CAT-12 — lanca 404 se categoria nao encontrada", async () => {
    mockCategoriaRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.buscarPorId("999")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});