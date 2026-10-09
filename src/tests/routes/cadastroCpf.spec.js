import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import UsuarioService from "../../services/UsuarioService.js";
import AutenticacaoService from "../../services/AutenticacaoService.js";
import UsuarioRepository from "../../repositories/UsuarioRepository.js";
import errorHandler from "../../utils/helpers/errorHandler.js";

let mockService;
jest.mock("../../containers/services.index.js", () => ({
  usuarioService: { cadastrar: (...args) => mockService.cadastrar(...args) },
}));

let app;
let records;
let signUpEmail;
let queryRaw;
const formas = ["12345678909", "123.456.789-09", " 123 456 789 09 "];
const dados = (cpf, email = "novo@doai.local") => ({
  nome: "Maria Silva", email, cpf, senha: "Teste@123", cidade: "Vilhena", uf: "RO",
});

beforeAll(async () => {
  const { default: routes } = await import("../../routes/usuarioRoutes.js");
  app = express();
  app.use(express.json());
  app.use(routes);
  app.use(errorHandler);
});

beforeEach(() => {
  records = [];
  const findUnique = jest.fn(async ({ where }) => records.find((record) =>
    Object.entries(where).every(([key, value]) => record[key] === value)) || null);
  queryRaw = jest.fn(async (_sql, cpf) => records
    .filter((record) => !record.cpf.startsWith("removido_") && record.cpf.replace(/\D/g, "") === cpf)
    .slice(0, 1).map(({ id }) => ({ id })));
  const repository = new UsuarioRepository();
  Object.defineProperty(repository, "client", { value: {
    usuario: { findUnique }, $queryRaw: queryRaw,
  } });
  signUpEmail = jest.fn(async ({ body }) => {
    // Somente a persistência/adapter é simulado; a restrição compara o valor gravado.
    if (records.some((record) => record.cpf === body.cpf)) {
      throw Object.assign(new Error("unique"), { code: "P2002", meta: { target: ["cpf"] } });
    }
    const user = { id: `usuario-${records.length + 1}`, ...body, nome: body.name };
    records.push(user);
    return { user };
  });
  const authService = new AutenticacaoService({ auth: { api: { signUpEmail } } });
  mockService = new UsuarioService({ usuarioRepository: repository, autenticacaoService: authService });
});

describe("Cadastro com CPF canônico e registros históricos", () => {
  test.each(formas.flatMap((existente) => formas.map((entrada) => [existente, entrada])))(
    "retorna HTTP 409 para CPF existente %s recebido como %s", async (existente, entrada) => {
      records.push({ id: "historico", cpf: existente, email: "historico@doai.local" });

      const res = await request(app).post("/usuario").send(dados(entrada));

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toBe("CPF já cadastrado. Faça login ou recupere sua senha.");
      expect(signUpEmail).not.toHaveBeenCalled();
      expect(records).toHaveLength(1);
      expect(records[0].cpf).toBe(existente);
    },
  );

  test.each(formas)("persiste apenas dígitos para entrada %s", async (cpf) => {
    const res = await request(app).post("/usuario").send(dados(cpf));

    expect(res.statusCode).toBe(201);
    expect(records[0].cpf).toBe("12345678909");
    expect(signUpEmail).toHaveBeenCalledWith({ body: expect.objectContaining({
      cpf: "12345678909", email: "novo@doai.local", name: "Maria Silva", cidade: "Vilhena", uf: "RO",
    }) });
    expect(queryRaw.mock.calls[0][1]).toBe("12345678909");
    expect(queryRaw.mock.calls[0][0].join("?")).toContain('regexp_replace("cpf", \'[^0-9]\', \'\', \'g\') = ?');
  });

  test("cadastros simultâneos com máscaras diferentes resultam em um sucesso e um conflito", async () => {
    const results = await Promise.allSettled([
      mockService.cadastrar(dados(formas[0], "primeiro@doai.local")),
      mockService.cadastrar(dados(formas[1], "segundo@doai.local")),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected").reason).toMatchObject({
      statusCode: 409, customMessage: "CPF já cadastrado. Faça login ou recupere sua senha.",
    });
    expect(records).toHaveLength(1);
    expect(records[0].cpf).toBe("12345678909");
  });

  test("preserva falha de autenticação quando não há conflito de CPF", async () => {
    const error = new Error("adapter indisponível");
    signUpEmail.mockRejectedValue(error);

    await expect(mockService.cadastrar(dados(formas[0]))).rejects.toBe(error);
    expect(records).toHaveLength(0);
  });
});
