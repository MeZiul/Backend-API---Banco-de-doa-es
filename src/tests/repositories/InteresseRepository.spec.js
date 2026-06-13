import { afterEach, describe, expect, jest, test } from "@jest/globals";
import InteresseRepository from "../../repositories/InteresseRepository.js";
import { testIds } from "../test.js";

describe("InteresseRepository", () => {
  const repository = new InteresseRepository();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Deve atualizar interesse somente quando o status esperado ainda for atual", () => {
    const query = { exec: jest.fn() };
    const spy = jest.spyOn(repository.model, "findOneAndUpdate").mockReturnValue(query);

    const resultado = repository.atualizarSeStatus(
      testIds.administracao,
      "PENDENTE",
      { status: "ACEITO" }
    );

    expect(spy).toHaveBeenCalledWith(
      { _id: testIds.administracao, status: "PENDENTE" },
      { $set: { status: "ACEITO" } },
      { new: true, runValidators: true }
    );
    expect(resultado).toBe(query);
  });

  test("Deve restaurar somente recusas realizadas pelo aceite que falhou", () => {
    const query = { exec: jest.fn() };
    const dataResposta = new Date();
    const spy = jest.spyOn(repository.model, "updateMany").mockReturnValue(query);

    repository.restaurarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta
    );

    expect(spy).toHaveBeenCalledWith(
      {
        item_id: testIds.item,
        status: "RECUSADO",
        data_resposta: dataResposta,
        _id: { $ne: testIds.administracao },
      },
      {
        $set: {
          status: "PENDENTE",
          data_resposta: null,
        },
      }
    );
  });

  test("Deve listar somente recusas produzidas pelo aceite concluído", () => {
    const query = { exec: jest.fn() };
    const dataResposta = new Date();
    const spy = jest.spyOn(repository.model, "find").mockReturnValue(query);

    const resultado = repository.listarRecusadosDoAceite(
      testIds.item,
      testIds.administracao,
      dataResposta
    );

    expect(spy).toHaveBeenCalledWith({
      item_id: testIds.item,
      status: "RECUSADO",
      data_resposta: dataResposta,
      _id: { $ne: testIds.administracao },
    });
    expect(resultado).toBe(query);
  });
});
