import { describe, expect, jest, test } from "@jest/globals";
import DenunciaRepository from "../../repositories/DenunciaRepository.js";
import { testIds } from "../test.js";

describe("DenunciaRepository - consistência", () => {
  const repository = new DenunciaRepository();

  test("Deve atualizar somente quando o status e os filtros adicionais ainda corresponderem", () => {
    const query = { exec: jest.fn() };
    const spy = jest.spyOn(repository.model, "findOneAndUpdate").mockReturnValue(query);

    const resultado = repository.atualizarSeStatus(
      testIds.denuncia,
      "EM_ANALISE",
      { status: "PROCEDENTE" },
      { admin_id: null }
    );

    expect(spy).toHaveBeenCalledWith(
      {
        _id: testIds.denuncia,
        status: "EM_ANALISE",
        admin_id: null,
      },
      { $set: { status: "PROCEDENTE" } },
      { new: true, runValidators: true }
    );
    expect(resultado).toBe(query);
  });

  test("Deve remover somente denúncia em análise do autor informado", () => {
    const query = { exec: jest.fn() };
    const spy = jest.spyOn(repository.model, "findOneAndDelete").mockReturnValue(query);

    const resultado = repository.deletarSeEmAnalise(testIds.denuncia, testIds.usuario);

    expect(spy).toHaveBeenCalledWith({
      _id: testIds.denuncia,
      denunciante_id: testIds.usuario,
      status: "EM_ANALISE",
    });
    expect(resultado).toBe(query);
  });
});
