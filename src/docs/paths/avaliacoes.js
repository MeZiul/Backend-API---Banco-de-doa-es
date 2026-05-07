import commonResponses from "../schemas/swaggerCommonResponses.js";

const avaliacoesPaths = {
    "/avaliacoes": {
        post: {
            tags: ["Avaliações"],
            summary: "Registrar avaliação",
            description: `Permite que um usuário avalie a outra parte envolvida em uma doação concluída.

Regras de negócio:
- A rota exige autenticação.
- O item deve existir e estar com status DOADO.
- O avaliador e o avaliado devem ter participado da doação.
- Não é permitido avaliar usuário fora do fluxo de interesse aceito do item.
- Não é permitido duplicar avaliação do mesmo avaliador para o mesmo item e tipo.
- A média de avaliações do usuário avaliado deve ser recalculada após o cadastro.`,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AvaliacaoPost" },
                    },
                },
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/AvaliacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        get: {
            tags: ["Avaliações"],
            summary: "Listar avaliações",
            description: `Lista avaliações visíveis para o usuário autenticado, com filtros opcionais.

Regras de negócio:
- A rota exige autenticação.
- Usuários comuns consultam avaliações relacionadas ao próprio usuário.
- Administradores podem consultar avaliações de qualquer usuário.
- O retorno é paginado e pode ser filtrado por item, avaliador, avaliado e tipo.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "avaliado_id", in: "query", schema: { type: "string" }, description: "Filtrar por usuário avaliado" },
                { name: "avaliador_id", in: "query", schema: { type: "string" }, description: "Filtrar por usuário avaliador" },
                { name: "item_id", in: "query", schema: { type: "string" }, description: "Filtrar por item doado" },
                {
                    name: "tipo",
                    in: "query",
                    schema: { type: "string", enum: ["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"] },
                },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limite", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AvaliacaoPaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/avaliacoes/{id}": {
        get: {
            tags: ["Avaliações"],
            summary: "Consultar avaliação por ID",
            description: `Retorna os detalhes de uma avaliação específica.

Regras de negócio:
- A rota exige autenticação.
- O acesso é permitido ao avaliador, ao avaliado ou ao administrador.
- Caso a avaliação não exista, retorna erro apropriado.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AvaliacaoDetalhes"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        put: {
            tags: ["Avaliações"],
            summary: "Atualizar avaliação",
            description: `Atualiza os dados editáveis de uma avaliação registrada.

Regras de negócio:
- A rota exige autenticação.
- Apenas o autor da avaliação pode atualizar.
- Somente nota e comentário podem ser alterados.
- Item, usuário avaliado, usuário avaliador e tipo da avaliação não podem ser alterados.
- A média do usuário avaliado deve ser recalculada após alteração da nota.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AvaliacaoPutPatch" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AvaliacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Avaliações"],
            summary: "Remover avaliação",
            description: `Remove uma avaliação registrada pelo próprio usuário.

Regras de negócio:
- A rota exige autenticação.
- Apenas o autor da avaliação pode remover.
- A média do usuário avaliado deve ser recalculada após a remoção.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                204: commonResponses[204](null, "Avaliação removida com sucesso"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default avaliacoesPaths;
