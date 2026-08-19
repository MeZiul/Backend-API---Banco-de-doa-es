import { describe, expect, jest, test } from "@jest/globals";
import DenunciaRepository from "../../repositories/DenunciaRepository.js";
import { testIds } from "../test.js";

function attachClient(repository, client) {
  Object.defineProperty(repository, "client", { value: client, configurable: true });
}

describe("DenunciaRepository - consistência", () => {
  test("atualiza somente quando status e filtros ainda correspondem", async () => {
    const repository = new DenunciaRepository();
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest.fn().mockResolvedValue({
      id: testIds.denuncia,
      status: "PROCEDENTE",
    });
    const tx = { denuncia: { updateMany, findUnique } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.atualizarSeStatus(
      testIds.denuncia,
      "EM_ANALISE",
      { status: "PROCEDENTE" },
      { admin_id: null },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: testIds.denuncia,
        status: "EM_ANALISE",
        admin_id: null,
      },
      data: { status: "PROCEDENTE" },
    });
    expect(resultado).toMatchObject({ _id: testIds.denuncia, status: "PROCEDENTE" });
  });

  test("remove somente denúncia em análise do autor informado", async () => {
    const repository = new DenunciaRepository();
    const existing = {
      id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    };
    const findFirst = jest.fn().mockResolvedValue(existing);
    const deleteFn = jest.fn().mockResolvedValue(existing);
    const tx = { denuncia: { findFirst, delete: deleteFn } };
    attachClient(repository, { $transaction: (callback) => callback(tx) });

    const resultado = await repository.deletarSeEmAnalise(
      testIds.denuncia,
      testIds.usuario,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: testIds.denuncia,
        denunciante_id: testIds.usuario,
        status: "EM_ANALISE",
      },
    });
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: testIds.denuncia } });
    expect(resultado._id).toBe(testIds.denuncia);
  });
});
