import "dotenv/config";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { getPrisma, disconnectPrisma } from "./src/config/prisma.js";

const API = `http://localhost:${process.env.APP_PORT || 7340}`;

const prisma = getPrisma();

function gerarCpf() {
    const digitos = Array.from({ length: 9 }, () => randomInt(0, 10));

    for (const peso of [10, 11]) {
        const soma = digitos.reduce((total, digito, indice) => total + digito * (peso - indice), 0,);

        const resto = (soma * 10) % 11;

        digitos.push(resto === 10 ? 0 : resto);
    }

    return digitos.join("");
}

function mascararCpf(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

const identificador = randomUUID();

const cpf = gerarCpf();

const emails = [
    `concorrencia-a-${identificador}@example.test`,
    `concorrencia-b-${identificador}@example.test`
];

const dadosBase = {
    nome: "Usuario Teste Concorrencia",
    senha: "Senha@123",
    telefone: "69999990000",
    cidade: "Vilhena",
    uf: "RO"
};

async function cadastrar(email, cpf) {
    const resposta = await fetch(`${API}/usuario`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...dadosBase,
            email,
            cpf
        })
    });

    return { email, status: resposta.status };
}

try {
    console.log("\n=== TESTE DE CONCORRÊNCIA ===\n");

    const existente = await prisma.usuario.findUnique({ where: { cpf } });

    assert.equal(existente, null, "O CPF sintético já existe no banco.");

    // Dispara os dois cadastros simultaneamente
    const resultados = await Promise.all([
        cadastrar(emails[0], cpf),
        cadastrar(emails[1], mascararCpf(cpf))
    ]);

    console.table(resultados);

    const usuarios = await prisma.usuario.findMany({
        where: {
            email: {
                in: emails
            }
        },
        select: {
            id: true,
            email: true,
            cpf: true,
            cadastro_completo: true,
            _count: {
                select: {
                    accounts: true,
                    sessions: true
                }
            }
        }
    });

    console.log("\n=== USUÁRIOS PERSISTIDOS ===\n");

    console.dir(usuarios, { depth: null });

    const status = resultados
        .map((resultado) => resultado.status)
        .sort((a, b) => a - b);

    assert.deepEqual(status, [201, 409]);

    assert.equal(usuarios.length, 1, "Existe uma conta residual no banco.");

    assert.equal(usuarios[0].cpf, cpf);
    assert.equal(usuarios[0].cadastro_completo, true);
    assert.equal(usuarios[0]._count.accounts, 1);
    assert.equal(usuarios[0]._count.sessions, 0);

    console.log("\nPASS: cadastro concorrente validado.");
} catch (error) {
    console.error("\nFAIL:", error.message);

    process.exitCode = 1;
} finally {
    await disconnectPrisma();
}