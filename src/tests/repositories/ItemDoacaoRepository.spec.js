import { describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoRepository from "../../repositories/ItemDoacaoRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

function makeTransactionRepository(record) {
  const update = jest.fn().mockResolvedValue(record);
  const findUnique = jest.fn().mockResolvedValue(record);
  const tx = { itemDoacao: { update, findUnique } };
  return {
    client: { $transaction: (callback) => callback(tx) },
    update,
    findUnique,
  };
}

describe("ItemDoacaoRepository - consistência de interesse", () => {
  test("condiciona edição com fotos ao snapshot e grava relações na mesma operação", async () => {
    const repository = new ItemDoacaoRepository();
    const fake = makeTransactionRepository({ id: testIds.item, status: "DISPONIVEL", fotos: [] });
    attachClient(repository, fake.client);
    const foto = { url: "/nova.jpg", ordem: 0 };

    await repository.atualizarSeStatus(testIds.item, "DISPONIVEL", {
      titulo: "Novo", fotos: [foto],
    }, { usuario_id: testIds.usuario, interesse_aceito_id: null });

    expect(fake.update).toHaveBeenCalledWith({
      where: { id: testIds.item, AND: [{ status: "DISPONIVEL", usuario_id: testIds.usuario, interesse_aceito_id: null }] },
      data: { titulo: "Novo", fotos: { deleteMany: {}, create: [foto] } },
      include: { fotos: { orderBy: { ordem: "asc" } } },
    });
    expect(fake.findUnique).not.toHaveBeenCalled();
  });

  test("condição perdida retorna null sem segunda escrita", async () => {
    const repository = new ItemDoacaoRepository();
    const fake = makeTransactionRepository(null);
    fake.update.mockRejectedValue(Object.assign(new Error("Condição alterada"), { code: "P2025" }));
    attachClient(repository, fake.client);

    await expect(repository.atualizarSeStatus(testIds.item, "RESERVADO", {
      status: "AGUARDANDO_CONFIRMACAO",
    })).resolves.toBeNull();
    expect(fake.update).toHaveBeenCalledTimes(1);
    expect(fake.findUnique).not.toHaveBeenCalled();
  });

  test("falhas de persistência não são convertidas em conflito", async () => {
    const repository = new ItemDoacaoRepository();
    const fake = makeTransactionRepository(null);
    const error = new Error("Persistência indisponível");
    fake.update.mockRejectedValue(error);
    attachClient(repository, fake.client);
    await expect(repository.atualizarSeStatus(testIds.item, "RESERVADO", {
      status: "AGUARDANDO_CONFIRMACAO",
    })).rejects.toBe(error);
  });

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

    expect(fake.update).toHaveBeenCalledWith({
      where: {
        id: testIds.item,
        AND: [{ status: "DISPONIVEL", interesse_aceito_id: null }],
      },
      include: { fotos: { orderBy: { ordem: "asc" } } },
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

    expect(fake.update).toHaveBeenCalledWith({
      where: {
        id: testIds.item,
        AND: [{ status: "RESERVADO", interesse_aceito_id: testIds.administracao }],
      },
      include: { fotos: { orderBy: { ordem: "asc" } } },
      data: {
        status: "DISPONIVEL",
        interesse_aceito_id: null,
      },
    });
  });
});
