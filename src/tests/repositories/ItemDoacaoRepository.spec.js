import { describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoRepository from "../../repositories/ItemDoacaoRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

function makeTransactionRepository(record) {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const findUnique = jest.fn().mockResolvedValue(record);
  const tx = { itemDoacao: { updateMany, findUnique } };
  return {
    client: { $transaction: (callback) => callback(tx) },
    updateMany,
    findUnique,
  };
}

describe("ItemDoacaoRepository - consistência de interesse", () => {
  test("reserva somente item disponível e sem interesse aceito", async () => {
    const repository = new ItemDoacaoRepository();
    const fake = makeTransactionRepository({
      id: testIds.item,
      status: "RESERVADO",
      interesse_aceito_id: testIds.administracao,
      fotos: [],
    });
    attachClient(repository, fake.client);

    const resultado = await repository.reservarSeDisponivel(
      testIds.item,
      testIds.administracao,
    );

    expect(fake.updateMany).toHaveBeenCalledWith({
      where: {
        id: testIds.item,
        status: "DISPONIVEL",
        interesse_aceito_id: null,
      },
      data: {
        status: "RESERVADO",
        interesse_aceito_id: testIds.administracao,
      },
    });
    expect(resultado).toMatchObject({
      _id: testIds.item,
      status: "RESERVADO",
      interesse_aceito_id: testIds.administracao,
    });
  });

  test("libera somente a reserva vinculada ao interesse informado", async () => {
    const repository = new ItemDoacaoRepository();
    const fake = makeTransactionRepository({
      id: testIds.item,
      status: "DISPONIVEL",
      interesse_aceito_id: null,
      fotos: [],
    });
    attachClient(repository, fake.client);

    await repository.liberarReservaDoInteresse(
      testIds.item,
      testIds.administracao,
    );

    expect(fake.updateMany).toHaveBeenCalledWith({
      where: {
        id: testIds.item,
        status: "RESERVADO",
        interesse_aceito_id: testIds.administracao,
      },
      data: {
        status: "DISPONIVEL",
        interesse_aceito_id: null,
      },
    });
  });
});
