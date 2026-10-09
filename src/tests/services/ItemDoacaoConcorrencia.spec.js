import { describe, expect, jest, test } from "@jest/globals";
import ItemDoacaoService from "../../services/ItemDoacaoService.js";
import ItemDoacaoRepository from "../../repositories/ItemDoacaoRepository.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function matches(state, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every((condition) => matches(state, condition));
    return value?.in ? value.in.includes(state[key]) : state[key] === value;
  });
}

// Ambas as leituras capturam o mesmo estado antes de liberar qualquer escrita.
// O delegate simula a comparação e a escrita indivisíveis do PostgreSQL,
// incluindo P2025 para uma condição que deixou de corresponder.
function setup(status, statusVencedor) {
  let state = {
    id: "item1", usuario_id: "doador", status,
    interesse_aceito_id: status === "DISPONIVEL" ? null : "interesse1",
    interesse_aceito: status === "DISPONIVEL" ? null : {
      id: "interesse1", usuario_interessado_id: "recebedor",
    },
    titulo: "Original", total_interesses: 3, fotos: [],
  };
  const leiturasProntas = deferred();
  const escritaVencedora = deferred();
  let leituras = 0;
  let escritas = 0;
  let totalDoacoes = 0;
  const delegate = {
    findUnique: jest.fn(async () => {
      const snapshot = structuredClone(state);
      if (++leituras === 2) leiturasProntas.resolve();
      await leiturasProntas.promise;
      return snapshot;
    }),
    update: jest.fn(async ({ where, data }) => {
      if (data.status !== statusVencedor) await escritaVencedora.promise;
      // Reproduz a validação Prisma para o campo unique nullable.
      if (where.interesse_aceito_id === null) throw new Error("Argument interesse_aceito_id must not be null");
      const corresponde = matches(state, where);
      if (!corresponde) throw Object.assign(new Error("Condição alterada"), { code: "P2025" });
      state = { ...state, ...data };
      escritas++;
      escritaVencedora.resolve();
      return structuredClone(state);
    }),
  };
  const repository = new ItemDoacaoRepository();
  Object.defineProperty(repository, "client", {
    value: { itemDoacao: delegate, $transaction: (callback) => callback({ itemDoacao: delegate }) },
  });
  const service = new ItemDoacaoService(repository, {}, {}, {
    usuarioRepository: { atualizar: async () => ({ total_doacoes: ++totalDoacoes }) },
    transactionManager: { run: (operation) => operation() },
  });
  return { service, repository, state: () => state, escritas: () => escritas, totalDoacoes: () => totalDoacoes };
}

const dono = { id: "doador" };
const cancelar = (service) => service.cancelarItem("item1", "Cancelado pelo doador", dono);
const entregar = (service) => service.confirmarEntrega("item1", "doador");
const receber = (service) => service.confirmarRecebimento("item1", "recebedor");

async function assertRace(context, operations, vencedor) {
  const results = await Promise.allSettled(operations.map((operation) => operation()));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toEqual([
    expect.objectContaining({ reason: expect.objectContaining({ statusCode: 409 }) }),
  ]);
  expect(context.state().status).toBe(vencedor);
  expect(context.state().total_interesses).toBe(3);
  expect(context.escritas()).toBe(1);
  expect(context.totalDoacoes()).toBe(vencedor === "DOADO" ? 1 : 0);
}

describe("ItemDoacao - transições concorrentes com leituras sincronizadas", () => {
  test.each(["CANCELADO", "AGUARDANDO_CONFIRMACAO"])(
    "entrega versus cancelamento: somente %s vence", async (vencedor) => {
      const context = setup("RESERVADO", vencedor);
      await assertRace(context, [() => entregar(context.service), () => cancelar(context.service)], vencedor);
    },
  );

  test.each(["CANCELADO", "DOADO"])(
    "recebimento versus cancelamento: somente %s vence", async (vencedor) => {
      const context = setup("AGUARDANDO_CONFIRMACAO", vencedor);
      await assertRace(context, [() => receber(context.service), () => cancelar(context.service)], vencedor);
      expect(context.state().data_doacao instanceof Date).toBe(vencedor === "DOADO");
    },
  );

  test.each([
    ["RESERVADO", "AGUARDANDO_CONFIRMACAO", entregar],
    ["AGUARDANDO_CONFIRMACAO", "DOADO", receber],
    ["RESERVADO", "CANCELADO", cancelar],
  ])("duas operações iguais em %s escrevem uma vez", async (inicial, vencedor, operation) => {
    const context = setup(inicial, vencedor);
    await assertRace(context, [() => operation(context.service), () => operation(context.service)], vencedor);
  });

  test.each(["editar", "excluir"])("reserva impede %s validado em leitura antiga", async (operation) => {
    const context = setup("DISPONIVEL", "RESERVADO");
    const alterar = () => operation === "editar"
      ? context.service.atualizar("item1", { titulo: "Novo" }, "doador")
      : context.service.deletar("item1", "doador");
    const reservar = async () => {
      await context.repository.buscarPorId("item1");
      return context.repository.reservarSeDisponivel("item1", "interesse2");
    };
    await assertRace(context, [alterar, reservar], "RESERVADO");
    expect(context.state().titulo).toBe("Original");
    expect(context.state().interesse_aceito_id).toBe("interesse2");
  });
});
