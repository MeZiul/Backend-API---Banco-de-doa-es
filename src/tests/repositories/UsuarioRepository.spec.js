import { describe, expect, jest, test } from "@jest/globals";
import UsuarioRepository from "../../repositories/UsuarioRepository.js";

describe("UsuarioRepository", () => {
  test("buscarPorEmail normaliza o e-mail e retorna somente os dados de domínio", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7",
      nome: "Usuario de teste",
      email: "usuario@doai.local",
    });
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: { usuario: { findUnique } },
    });

    const usuario = await repository.buscarPorEmail(" USUARIO@DOAI.LOCAL ");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "usuario@doai.local" },
    });
    expect(usuario.email).toBe("usuario@doai.local");
    expect(usuario.toObject()).toEqual(
      expect.objectContaining({
        _id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7",
        nome: "Usuario de teste",
      }),
    );
  });

  test("listarAdministradoresAtivos retorna somente IDs elegíveis para notificação", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: "fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7" },
    ]);
    const repository = new UsuarioRepository();

    Object.defineProperty(repository, "client", {
      value: { usuario: { findMany } },
    });

    const administradores = await repository.listarAdministradoresAtivos();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        perfil: "ADMINISTRADOR",
        situacao: "ATIVO",
      },
      select: { id: true },
    });
    expect(administradores).toHaveLength(1);
    expect(administradores[0]._id).toBe("fb55a3c6-dc66-4d46-aeb0-7fca9b3beab7");
  });
});
