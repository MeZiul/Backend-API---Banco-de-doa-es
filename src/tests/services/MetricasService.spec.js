import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import MetricasService from "../../services/MetricasService.js";
import logger from "../../utils/logger.js";

// Banco simulado: os valores podem ser alterados durante o teste para simular mudanças.
function criarPrisma(valores) {
  // Imita o groupBy do Prisma: só devolve os grupos que têm registros.
  const agrupar = (contagem, campo) => () =>
    Object.entries(contagem).map(([chave, total]) => ({ [campo]: chave, _count: { _all: total } }));
  return {
    usuario: { groupBy: jest.fn((...args) => agrupar(valores.usuarios, "situacao")(...args)) },
    itemDoacao: { groupBy: jest.fn((...args) => agrupar(valores.itens, "status")(...args)) },
    interesse: { groupBy: jest.fn((...args) => agrupar(valores.interesses, "status")(...args)) },
    denuncia: { groupBy: jest.fn((...args) => agrupar(valores.denuncias, "status")(...args)) },
    $queryRaw: jest.fn(() => valores.meses),
    $transaction: jest.fn((consultas) => Promise.all(consultas)),
  };
}

const esvaziarFila = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("MetricasService", () => {
  let valores;
  let prisma;
  let service;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "queueMicrotask"] });
    valores = {
      usuarios: { ATIVO: 8, SUSPENSO: 2 },
      itens: { DISPONIVEL: 4, DOADO: 2, CANCELADO: 1 },
      interesses: { PENDENTE: 5, ACEITO: 1 },
      denuncias: { EM_ANALISE: 3, PROCEDENTE: 1 },
      meses: [{ mes: "2026-10", usuarios: 2, itens: 5 }, { mes: "2026-11", usuarios: 1, itens: 0 }],
    };
    prisma = criarPrisma(valores);
    service = new MetricasService({ prisma: () => prisma, atrasoMudancaMs: 1000, intervaloConferenciaMs: 60_000 });
  });

  afterEach(() => {
    service.parar();
    jest.useRealTimers();
  });

  test("calcula os seis contadores com os filtros do dashboard", async () => {
    const metricas = await service.calcular();

    expect(metricas).toMatchObject({ usuarios: 10, ativos: 8, itens: 7, disponiveis: 4, doados: 2, denuncias: 3 });
    expect(typeof metricas.atualizado_em).toBe("string");
    expect(prisma.usuario.groupBy).toHaveBeenCalledWith({ by: ["situacao"], _count: { _all: true } });
    for (const modelo of [prisma.itemDoacao, prisma.interesse, prisma.denuncia]) {
      expect(modelo.groupBy).toHaveBeenCalledWith({ by: ["status"], _count: { _all: true } });
    }
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("devolve as divisões completas para os gráficos, na ordem dos enums e com zero nos estados vazios", async () => {
    const metricas = await service.calcular();

    expect(metricas.usuarios_por_situacao).toEqual({ ATIVO: 8, SUSPENSO: 2, INATIVO: 0 });
    expect(metricas.itens_por_status).toEqual({ DISPONIVEL: 4, RESERVADO: 0, AGUARDANDO_CONFIRMACAO: 0, DOADO: 2, CANCELADO: 1 });
    expect(metricas.interesses_por_status).toEqual({ PENDENTE: 5, ACEITO: 1, RECUSADO: 0, CANCELADO: 0, EXPIRADO: 0 });
    expect(metricas.denuncias_por_status).toEqual({ EM_ANALISE: 3, PROCEDENTE: 1, IMPROCEDENTE: 0 });
    expect(Object.keys(metricas.itens_por_status)).toEqual(["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"]);
  });

  test("série mensal sai da mesma transação e com contagens numéricas", async () => {
    // O Postgres pode devolver count como BigInt; a série precisa chegar como número no JSON.
    valores.meses = [{ mes: "2026-11", usuarios: 3n, itens: 4n }];
    const metricas = await service.calcular();

    expect(metricas.novos_por_mes).toEqual([{ mes: "2026-11", usuarios: 3, itens: 4 }]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("banco vazio conta tudo como zero", async () => {
    valores.usuarios = {};
    valores.itens = {};
    valores.interesses = {};
    valores.denuncias = {};
    await expect(service.calcular()).resolves.toMatchObject({ usuarios: 0, ativos: 0, itens: 0, disponiveis: 0, doados: 0, denuncias: 0 });
  });

  test("não recalcula quando ninguém acompanha o dashboard", async () => {
    service.notificarMudanca();
    await jest.advanceTimersByTimeAsync(1000);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("várias mudanças próximas viram um único recálculo", async () => {
    const aoMudar = jest.fn();
    service.assinar(aoMudar);

    service.notificarMudanca();
    service.notificarMudanca();
    service.notificarMudanca();
    await jest.advanceTimersByTimeAsync(1000);
    await esvaziarFila();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenCalledWith(expect.objectContaining({ usuarios: 10, denuncias: 3 }));
  });

  test("só envia de novo quando algum contador mudou", async () => {
    const aoMudar = jest.fn();
    service.assinar(aoMudar);

    await service.publicar();
    await service.publicar();
    await esvaziarFila();
    expect(aoMudar).toHaveBeenCalledTimes(1);

    valores.denuncias.EM_ANALISE = 4;
    await service.publicar();
    await esvaziarFila();
    expect(aoMudar).toHaveBeenCalledTimes(2);
    expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ denuncias: 4 }));
  });

  test("confere de novo a cada intervalo enquanto há assinantes", async () => {
    const aoMudar = jest.fn();
    service.assinar(aoMudar);

    await jest.advanceTimersByTimeAsync(60_000);
    await esvaziarFila();

    expect(aoMudar).toHaveBeenCalledTimes(1);
  });

  test("falha ao recalcular é registrada no log e não chega aos assinantes", async () => {
    const aviso = jest.spyOn(logger, "warn").mockImplementation(() => logger);
    prisma.$transaction.mockRejectedValueOnce(new Error("banco indisponível"));
    const aoMudar = jest.fn();
    service.assinar(aoMudar);

    await service.publicar();
    await esvaziarFila();

    expect(aoMudar).not.toHaveBeenCalled();
    expect(aviso).toHaveBeenCalledWith("Falha ao recalcular as métricas do dashboard.", { erro: "banco indisponível" });
    aviso.mockRestore();
  });

  test("falha de um assinante não impede os outros e fica registrada", async () => {
    const aviso = jest.spyOn(logger, "warn").mockImplementation(() => logger);
    const quebrado = jest.fn().mockRejectedValue(new Error("conexão fechada"));
    const saudavel = jest.fn();
    service.assinar(quebrado);
    service.assinar(saudavel);

    await service.publicar();
    await esvaziarFila();

    expect(saudavel).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith("Falha ao enviar métricas a um assinante.", { erro: "conexão fechada" });
    aviso.mockRestore();
  });

  test("cancelar a última assinatura para os timers", async () => {
    const cancelar = service.assinar(jest.fn());
    service.notificarMudanca();
    expect(jest.getTimerCount()).toBe(2);

    cancelar();

    expect(jest.getTimerCount()).toBe(0);
  });
});