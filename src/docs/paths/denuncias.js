import commonResponses from "../schemas/swaggerCommonResponses.js";

const denunciasPaths = {
    "/denuncias": {
        post: {
            tags: ["Denúncias"],
            summary: "Registrar uma denúncia",
            description: `Permite que um usuário autenticado denuncie um item ou outro usuário.

Regras de negócio:
- Apenas usuários com situação ATIVO podem criar denúncias.
- A denúncia deve ter alvo válido: ITEM ou USUARIO.
- O usuário não pode denunciar a si mesmo.
- O motivo é obrigatório e deve usar valores padronizados.
- Não é permitido denunciar o mesmo alvo mais de uma vez enquanto houver denúncia EM_ANALISE para ele.
- Após a criação, os administradores ativos recebem uma notificação best-effort para iniciar a análise.`,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/DenunciaPost" },
                    },
                },
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/DenunciaDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        get: {
            tags: ["Denúncias"],
            summary: "Listar denúncias do usuário autenticado",
            description: `Lista as denúncias registradas pelo usuário autenticado.

Regras de negócio:
- A rota exige autenticação.
- Para usuários comuns, retorna apenas as denúncias do próprio denunciante.
- Pode ser filtrada por status, tipo do alvo, motivo e período.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "denuncianteId", in: "query", schema: { type: "string" }, description: "Filtrar por denunciante" },
                { name: "tipoAlvo", in: "query", schema: { type: "string", enum: ["ITEM", "USUARIO"] } },
                { name: "alvoItemId", in: "query", schema: { type: "string" } },
                { name: "alvoUsuarioId", in: "query", schema: { type: "string" } },
                { name: "motivo", in: "query", schema: { type: "string", enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"] } },
                { name: "status", in: "query", schema: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DenunciaPaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/denuncias/{id}": {
        get: {
            tags: ["Denúncias"],
            summary: "Consultar denúncia por ID",
            description: `Retorna uma denúncia específica.

Regras de negócio:
- A rota exige autenticação.
- O acesso é permitido ao denunciante responsável ou ao administrador.
- Caso a denúncia não exista, retorna erro apropriado.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DenunciaDetalhes"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        put: {
            tags: ["Denúncias"],
            summary: "Atualizar denúncia em análise",
            description: `Atualiza uma denúncia antes da conclusão da análise administrativa.

Regras de negócio:
- Apenas o autor da denúncia pode atualizar.
- A denúncia deve estar EM_ANALISE.
- Só motivo e descrição podem ser alterados.
- A atualização é condicional e pode falhar se outra operação concluir a denúncia primeiro.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/DenunciaPutPatch" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/DenunciaDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Denúncias"],
            summary: "Remover denúncia em análise",
            description: `Remove uma denúncia antes da finalização da análise.

Regras de negócio:
- Apenas o autor da denúncia pode remover.
- Apenas denúncias com status EM_ANALISE podem ser removidas.
- Denúncias PROCEDENTE ou IMPROCEDENTE permanecem no histórico e não podem ser excluídas pelo usuário.
- A remoção usa uma condição atômica de ID, autor e status, impedindo excluir uma denúncia concluída concorrentemente.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200](null, "Denúncia removida com sucesso"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default denunciasPaths;
