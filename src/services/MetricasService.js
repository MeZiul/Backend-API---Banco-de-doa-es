import { getPrisma } from "../config/prisma.js";
import logger from "../utils/logger.js";

/**
 * Contadores do dashboard administrativo e aviso de mudanças para o SSE.
 *
 * Os assinantes ficam em memória, então os avisos valem para uma instância da API
 * (o caso do deploy atual). Com mais de uma instância, troque por LISTEN/NOTIFY do Postgres.
 */
class MetricasService {
    constructor({ prisma = getPrisma, atrasoMudancaMs = 1000, intervaloConferenciaMs = 60_000 } = {}) {
        this.prisma = prisma;
        this.atrasoMudancaMs = atrasoMudancaMs;
        this.intervaloConferenciaMs = intervaloConferenciaMs;
        this.assinantes = new Set();
        this.ultimaChave = null;
        this.timerMudanca = null;
        this.timerConferencia = null;
    }

    async calcular() {
        const prisma = this.prisma();
        const [usuarios, ativos, itensPorStatus, denuncias] = await prisma.$transaction([
            prisma.usuario.count(),
            prisma.usuario.count({ where: { situacao: "ATIVO" } }),
            prisma.itemDoacao.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.denuncia.count({ where: { status: "EM_ANALISE" } }),
        ]);
        const porStatus = Object.fromEntries(itensPorStatus.map((grupo) => [grupo.status, grupo._count._all]));

        return {
            usuarios,
            ativos,
            itens: Object.values(porStatus).reduce((total, quantidade) => total + quantidade, 0),
            disponiveis: porStatus.DISPONIVEL ?? 0,
            doados: porStatus.DOADO ?? 0,
            denuncias,
            atualizado_em: new Date().toISOString(),
        };
    }

    /**
     * Registra quem quer receber as métricas novas. Devolve a função que cancela a assinatura.
     */
    assinar(aoMudar) {
        this.assinantes.add(aoMudar);

        if (!this.timerConferencia) {
            // Pega mudanças que não passam pela API (seed, ajuste direto no banco).
            this.timerConferencia = setInterval(() => this.publicar(), this.intervaloConferenciaMs);
            this.timerConferencia.unref?.();
        }

        return () => {
            this.assinantes.delete(aoMudar);
            if (this.assinantes.size === 0) this.parar();
        };
    }

    /**
     * Avisa que algum dado pode ter mudado. Várias chamadas próximas viram um único recálculo.
     */
    notificarMudanca() {
        if (this.assinantes.size === 0 || this.timerMudanca) return;

        this.timerMudanca = setTimeout(() => {
            this.timerMudanca = null;
            this.publicar();
        }, this.atrasoMudancaMs);
        this.timerMudanca.unref?.();
    }

    async publicar() {
        if (this.assinantes.size === 0) return;

        let metricas;
        try {
            metricas = await this.calcular();
        } catch (erro) {
            logger.warn("Falha ao recalcular as métricas do dashboard.", { erro: erro.message });
            return;
        }

        // Só envia quando algum contador mudou (o horário não conta).
        const { atualizado_em: _horario, ...contadores } = metricas;
        const chave = JSON.stringify(contadores);
        if (chave === this.ultimaChave) return;
        this.ultimaChave = chave;

        for (const aoMudar of [...this.assinantes]) {
            Promise.resolve()
                .then(() => aoMudar(metricas))
                .catch((erro) => logger.warn("Falha ao enviar métricas a um assinante.", { erro: erro.message }));
        }
    }

    parar() {
        clearTimeout(this.timerMudanca);
        clearInterval(this.timerConferencia);
        this.timerMudanca = null;
        this.timerConferencia = null;
        this.ultimaChave = null;
    }
}

export default MetricasService;
