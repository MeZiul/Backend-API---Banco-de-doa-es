import { describe, expect, jest, test } from "@jest/globals";
import UsuarioRepository from "../../repositories/UsuarioRepository.js";

describe("UsuarioRepository", () => {
  test("buscarPorEmailComSenha retorna a senha sem expor tokens de redefinição", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7",
      nome: "Usuario de teste",
      email: "usuario@doai.local",
      senha: "hash-interno",
      token_redefinicao: "token-interno",
      token_redefinicao_expira: new Date("2026-12-31T23:59:59.000Z"),
    });
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: { usuario: { findUnique } },
    });

    const usuario = await repository.buscarPorEmailComSenha(" USUARIO@DOAI.LOCAL ");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "usuario@doai.local" },
    });
    expect(usuario.senha).toBe("hash-interno");
    expect(usuario.token_redefinicao).toBeUndefined();
    expect(usuario.token_redefinicao_expira).toBeUndefined();
    expect(usuario.toObject()).not.toHaveProperty("token_redefinicao");
    expect(usuario.toObject()).not.toHaveProperty("token_redefinicao_expira");
  });
});
