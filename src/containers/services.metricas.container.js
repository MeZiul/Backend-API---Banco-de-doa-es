import MetricasService from "../services/MetricasService.js";

// Instância única: o middleware de mudança e as conexões SSE precisam compartilhar os assinantes.
export const metricasService = new MetricasService();
