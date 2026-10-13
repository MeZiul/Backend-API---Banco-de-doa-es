import assert from "node:assert/strict";
import test from "node:test";
import {
  resetPasswordSchema,
  signUpSchema,
} from "../src/config/betterAuthRequestGuard.js";

function gerarCpfValido() {
  const base = [2, 8, 1, 4, 6, 0, 7, 3, 9];
  const calcular = (digits, pesoInicial) => {
    const soma = digits.reduce(
      (total, digit, index) => total + digit * (pesoInicial - index),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const primeiro = calcular(base, 10);
  const segundo = calcular([...base, primeiro], 11);
  const digits = [...base, primeiro, segundo].join("");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const validSignup = () => ({
  name: "  Pessoa Teste  ",
  email: " USUARIO@EXAMPLE.COM ",
  password: "SmokeAuth@123",
  cpf: gerarCpfValido(),
  telefone: " (65) 99999-9999 ",
  cidade: " Cuiabá ",
  uf: "mt",
  bio: " Perfil de teste ",
});

test("native signup normalizes email, CPF, name, city and UF", () => {
  const result = signUpSchema.parse(validSignup());
  assert.equal(result.name, "Pessoa Teste");
  assert.equal(result.email, "usuario@example.com");
  assert.match(result.cpf, /^\d{11}$/);
  assert.equal(result.cidade, "Cuiabá");
  assert.equal(result.uf, "MT");
  assert.equal(result.telefone, "(65) 99999-9999");
  assert.equal(result.bio, "Perfil de teste");
});

test("native signup rejects invalid CPF, state codes, weak passwords and mass assignment", () => {
  assert.equal(signUpSchema.safeParse({ ...validSignup(), cpf: "111.111.111-11" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...validSignup(), uf: "ZZ" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...validSignup(), password: "weak" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...validSignup(), perfil: "ADMINISTRADOR" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...validSignup(), situacao: "ATIVO" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...validSignup(), total_doacoes: 99 }).success, false);
});

test("native password reset requires a strong password and token", () => {
  assert.equal(
    resetPasswordSchema.safeParse({ token: "fixture-token", newPassword: "ResetSenha@123" }).success,
    true,
  );
  assert.equal(
    resetPasswordSchema.safeParse({ token: "fixture-token", newPassword: "weak" }).success,
    false,
  );
  assert.equal(resetPasswordSchema.safeParse({ newPassword: "ResetSenha@123" }).success, true);
});
