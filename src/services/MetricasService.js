import { getPrisma } from "../config/prisma.js";
import logger from "../utils/logger.js";

// Mesma ordem dos enums do schema Prisma; o front mostra os gráficos nessa ordem.
const SITUACOES_USUARIO = ["ATIVO", "SUSPENSO", "INATIVO"];
const STATUS_ITEM = ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"];
const STATUS_INTERESSE = ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"];
const STATUS_DENUNCIA = ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"];

function contarPorChave(grupos, campo, chaves) {
    const contagem = Object.fromEntries(chaves.map((chave) => [chave, 0]));
    for (const grupo of grupos) contagem[grupo[campo]] = grupo._count._all;
    return contagem;
}

const somar = (contagem) => Object.values(contagem).reduce((total, quantidade) => total + quantidade, 0);

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
        const [usuarios, itens, interesses, denuncias, meses] = await prisma.$transaction([
            prisma.usuario.groupBy({ by: ["situacao"], _count: { _all: true } }),
            prisma.itemDoacao.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.interesse.groupBy({ by: ["status"], _count: { _all: true } }),
            prisma.denuncia.groupBy({ by: ["status"], _count: { _all: true } }),
            // Últimos 6 meses, incluindo o atual; generate_series garante uma linha (com 0) por mês.
            prisma.$queryRaw`
                SELECT to_char(m.mes, 'YYYY-MM') AS mes,
                       (SELECT count(*)::int FROM "Usuario" u WHERE date_trunc('month', u.data_cadastro) = m.mes) AS usuarios,
                       (SELECT count(*)::int FROM "ItemDoacao" i WHERE date_trunc('month', i.data_cadastro) = m.mes) AS itens
                FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m(mes)
                ORDER BY m.mes`,
        ]);
        const usuariosPorSituacao = contarPorChave(usuarios, "situacao", SITUACOES_USUARIO);
        const itensPorStatus = contarPorChave(itens, "status", STATUS_ITEM);
        const denunciasPorStatus = contarPorChave(denuncias, "status", STATUS_DENUNCIA);

        return {
            usuarios: somar(usuariosPorSituacao),
            ativos: usuariosPorSituacao.ATIVO,
            itens: somar(itensPorStatus),
            disponiveis: itensPorStatus.DISPONIVEL,
            doados: itensPorStatus.DOADO,
            denuncias: denunciasPorStatus.EM_ANALISE,
            // Divisões completas para os gráficos do dashboard (estados sem registros vêm com 0).
            usuarios_por_situacao: usuariosPorSituacao,
            itens_por_status: itensPorStatus,
            interesses_por_status: contarPorChave(interesses, "status", STATUS_INTERESSE),
            denuncias_por_status: denunciasPorStatus,
            novos_por_mes: meses.map((linha) => ({ mes: linha.mes, usuarios: Number(linha.usuarios), itens: Number(linha.itens) })),
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