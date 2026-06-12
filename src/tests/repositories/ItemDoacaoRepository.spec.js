import { afterEach, describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoRepository from "../../repositories/ItemDoacaoRepository.js";
import { testIds } from "../test.js";

describe("ItemDoacaoRepository - consistência de interesse", () => {
  const repository = new ItemDoacaoRepository();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Deve reservar somente item ainda disponível e sem interesse aceito", () => {
    const query = { exec: jest.fn() };
    const spy = jest.spyOn(repository.model, "findOneAndUpdate").mockReturnValue(query);

    const resultado = repository.reservarSeDisponivel(
      testIds.item,
      testIds.administracao
    );

    expect(spy).toHaveBeenCalledWith(
      {
        _id: testIds.item,
        status: "DISPONIVEL",
        $or: [
          { interesse_aceito_id: null },
          { interesse_aceito_id: { $exists: false } },
        ],
      },
      {
        $set: {
          status: "RESERVADO",
          interesse_aceito_id: testIds.administracao,
        },
      },
      { new: true, runValidators: true }
    );
    expect(resultado).toBe(query);
  });

  test("Deve liberar somente a reserva vinculada ao interesse informado", () => {
    const query = { exec: jest.fn() };
    const spy = jest.spyOn(repository.model, "findOneAndUpdate").mockReturnValue(query);

    repository.liberarReservaDoInteresse(testIds.item, testIds.administracao);

    expect(spy).toHaveBeenCalledWith(
      {
        _id: testIds.item,
        status: "RESERVADO",
        interesse_aceito_id: testIds.administracao,
      },
      {
        $set: {
          status: "DISPONIVEL",
          interesse_aceito_id: null,
        },
      },
      { new: true, runValidators: true }
    );
  });
});
