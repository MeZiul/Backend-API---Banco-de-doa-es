import { describe, expect, jest, test } from "@jest/globals";
import InteresseRepository from "../../repositories/InteresseRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

describe("InteresseRepository", () => {
  test("atualiza somente quando o status esperado ainda é atual", async () => {
    const repository = new InteresseRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest.fn().mockResolvedValue({
      id: testIds.administracao,
      status: "ACEITO",
    });
    const tx = { interesse: { updateMany, findUnique } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.atualizarSeStatus(
      testIds.administracao,
      "PENDENTE",
      { status: "ACEITO" },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: testIds.administracao, status: "PENDENTE" },
      data: { status: "ACEITO" },
    });
    expect(resultado).toMatchObject({ _id: testIds.administracao, status: "ACEITO" });
  });

  test("restaura somente recusas produzidas pelo aceite que falhou", async () => {
    const repository = new InteresseRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    attachClient(repository, { interesse: { updateMany } });
    const dataResposta = new Date();

    const resultado = await repository.restaurarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta,
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        item_id: testIds.item,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: testIds.administracao },
      },
      data: { status: "PENDENTE", data_resposta: null },
    });
    expect(resultado.modifiedCount).toBe(2);
  });

  test("lista somente recusas produzidas pelo aceite concluído", async () => {
    const repository = new InteresseRepository();
    const dataResposta = new Date();
    const findMany = jest.fn().mockResolvedValue([]);
    attachClient(repository, { interesse: { findMany } });

    await repository.listarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        item_id: testIds.item,
        status: "RECUSADO",
        data_resposta: dataResposta,
        id: { not: testIds.administracao },
      },
    });
  });
});
