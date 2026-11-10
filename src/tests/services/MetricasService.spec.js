import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import MetricasService from "../../services/MetricasService.js";
import logger from "../../utils/logger.js";

// Banco simulado: os valores podem ser alterados durante o teste para simular mudanças.
function criarPrisma(valores) {
  return {
    usuario: { count: jest.fn(({ where } = {}) => (where ? valores.ativos : valores.usuarios)) },
    itemDoacao: { groupBy: jest.fn(() => valores.grupos) },
    denuncia: { count: jest.fn(() => valores.denuncias) },
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
      usuarios: 10,
      ativos: 8,
      grupos: [
        { status: "DISPONIVEL", _count: { _all: 4 } },
        { status: "DOADO", _count: { _all: 2 } },
        { status: "CANCELADO", _count: { _all: 1 } },
      ],
      denuncias: 3,
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
    expect(prisma.usuario.count).toHaveBeenCalledWith({ where: { situacao: "ATIVO" } });
    expect(prisma.itemDoacao.groupBy).toHaveBeenCalledWith({ by: ["status"], _count: { _all: true } });
    expect(prisma.denuncia.count).toHaveBeenCalledWith({ where: { status: "EM_ANALISE" } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("status sem itens conta como zero", async () => {
    valores.grupos = [];
    await expect(service.calcular()).resolves.toMatchObject({ itens: 0, disponiveis: 0, doados: 0 });
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

    valores.denuncias = 4;
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
