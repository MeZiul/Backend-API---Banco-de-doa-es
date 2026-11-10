import { metricasService as metricasServicePadrao } from "../containers/services.metricas.container.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import CommonResponse from "../utils/helpers/CommonResponse.js";
import { CustomError, isAdmin } from "../utils/helpers/index.js";
import logger from "../utils/logger.js";

/**
 * Snapshot e stream (SSE) das métricas do dashboard administrativo.
 * As rotas passam antes por AuthMiddleware, EnsureActiveUser e EnsureAdmin.
 */
export function criarMetricasController({
    metricasService = metricasServicePadrao,
    usuarioRepository = new UsuarioRepository(),
    heartbeatMs = 25_000, // abaixo do timeout de 120 s do proxy TLS do front
    duracaoMaximaMs = 10 * 60_000, // força reconectar e autenticar de novo
    maxConexoesPorUsuario = 3,
} = {}) {
    const conexoesPorUsuario = new Map();

    async function continuaAdministrador(usuarioId) {
        const usuario = await usuarioRepository.buscarPorId(usuarioId);
        return Boolean(usuario) && usuario.situacao === "ATIVO" && isAdmin(usuario);
    }

    const snapshot = async (_req, res, next) => {
        try {
            return CommonResponse.success(res, await metricasService.calcular());
        } catch (erro) {
            next(erro);
        }
    };

    const stream = async (req, res, next) => {
        const usuarioId = String(req.user.id);
        const abertas = conexoesPorUsuario.get(usuarioId) ?? 0;
        if (abertas >= maxConexoesPorUsuario) {
            return next(new CustomError({
                statusCode: 429,
                customMessage: "Há muitos painéis abertos para esta conta. Feche outras abas e tente novamente.",
            }));
        }

        let metricas;
        try {
            metricas = await metricasService.calcular();
        } catch (erro) {
            return next(erro);
        }

        conexoesPorUsuario.set(usuarioId, abertas + 1);
        res.status(200).set({
            "Content-Type": "text/event-stream; charset=utf-8",
            // no-transform faz o compression() e proxies não segurarem os eventos em buffer.
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        res.flushHeaders();

        // O Safari só entrega o stream depois de ~1 KB; o comentário cobre esse mínimo.
        res.write(`:${" ".repeat(2048)}\n\n`);
        res.write("retry: 5000\n\n");
        const enviar = (dados) => res.write(`event: metricas\ndata: ${JSON.stringify(dados)}\n\n`);
        enviar(metricas);

        let encerrada = false;
        let cancelarAssinatura = () => {};
        let heartbeat;
        let limite;
        const encerrar = () => {
            if (encerrada) return;
            encerrada = true;
            clearInterval(heartbeat);
            clearTimeout(limite);
            cancelarAssinatura();
            const restantes = (conexoesPorUsuario.get(usuarioId) ?? 1) - 1;
            if (restantes > 0) conexoesPorUsuario.set(usuarioId, restantes);
            else conexoesPorUsuario.delete(usuarioId);
            res.end();
        };

        cancelarAssinatura = metricasService.assinar(async (novas) => {
            if (encerrada) return;
            // Quem perdeu a função administrativa ou foi suspenso para de receber dados.
            const autorizado = await continuaAdministrador(usuarioId).catch((erro) => {
                logger.warn("Falha ao conferir o acesso ao stream de métricas.", { erro: erro.message });
                return false;
            });
            if (!autorizado) return encerrar();
            enviar(novas);
        });
        heartbeat = setInterval(() => res.write(": ping\n\n"), heartbeatMs);
        limite = setTimeout(encerrar, duracaoMaximaMs);
        res.on("close", encerrar);
    };

    return { snapshot, stream };
}

export default criarMetricasController();
