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

describe("ItemDoacaoRepository - upload sob lock", () => {
  function uploadRepository(record) {
    const repository = new ItemDoacaoRepository();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: "item" }]),
      itemDoacao: { findUnique: jest.fn().mockResolvedValue(record) },
      fotoItemDoacao: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    attachClient(repository, { $transaction: callback => callback(tx) });
    return { repository, tx };
  }
  test.each([
    [{ usuario_id: "other", status: "DISPONIVEL", fotos: [] }, 403],
    [{ usuario_id: "owner", status: "RESERVADO", fotos: [] }, 400],
    [{ usuario_id: "owner", status: "DISPONIVEL", fotos: Array(5).fill({ ordem: 1 }) }, 400],
  ])("rechecks changed owner, status and count before inserting", async (record, statusCode) => {
    const { repository, tx } = uploadRepository(record);
    await expect(repository.adicionarFotos("item", [{ url: "/uploads/itens/a.png" }], "owner")).rejects.toMatchObject({ statusCode });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.fotoItemDoacao.createMany).not.toHaveBeenCalled();
  });
  test("assigns order from locked current photo set", async () => {
    const { repository, tx } = uploadRepository({ id: "item", usuario_id: "owner", status: "DISPONIVEL", fotos: [{ ordem: 4 }] });
    await repository.adicionarFotos("item", [{ url: "/uploads/itens/a.png", ordem: 1 }], "owner");
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.itemDoacao.findUnique.mock.invocationCallOrder[0]);
    expect(tx.fotoItemDoacao.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ ordem: 5 })] });
  });
});
