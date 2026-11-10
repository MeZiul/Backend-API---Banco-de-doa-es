import { metricasService } from "../containers/services.metricas.container.js";

const METODOS_DE_ESCRITA = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Avisa o MetricasService quando uma escrita termina com sucesso, para o dashboard
 * em tempo real recalcular os contadores. Roda depois da resposta, com a transação já gravada.
 */
export function criarMetricasMudancaMiddleware(servico = metricasService) {
    return (req, res, next) => {
        if (METODOS_DE_ESCRITA.has(req.method)) {
            res.on("finish", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) servico.notificarMudanca();
            });
        }
        next();
    };
}

export default criarMetricasMudancaMiddleware();
