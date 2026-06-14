import commonResponses from "../schemas/swaggerCommonResponses.js";

const interessesPaths = {
    "/interesses": {
        post: {
            tags: ["Interesses"],
            summary: "Manifestar interesse em um item",
            description: `Permite que um usuário autenticado manifeste interesse em um item disponível.

Regras de negócio:
- O usuário deve estar autenticado e com situação ATIVO.
- O item deve existir e estar com status DISPONIVEL.
- O usuário não pode manifestar interesse em item próprio.
- O mesmo usuário não pode registrar mais de um interesse ativo para o mesmo item.
- O interesse é criado com status PENDENTE e incrementa o total_interesses do item.
- O doador é notificado sobre a nova manifestação.`,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/InteressePost" },
                    },
                },
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/InteresseDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        get: {
            tags: ["Interesses"],
            summary: "Listar interesses do usuário autenticado",
            description: `Lista os interesses do usuário autenticado com filtros opcionais.

Regras de negócio:
- A rota exige autenticação.
- Para usuários comuns, retorna apenas os interesses do próprio usuário.
- Pode ser filtrada por status, item, usuário doador e período.
- Registros RECUSADO, CANCELADO e EXPIRADO podem permanecer visíveis como histórico.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "itemId", in: "query", schema: { type: "string" }, description: "Filtrar por item" },
                { name: "usuarioInteressadoId", in: "query", schema: { type: "string" }, description: "Filtrar por usuário interessado" },
                { name: "usuarioDoadorId", in: "query", schema: { type: "string" }, description: "Filtrar por usuário doador" },
                { name: "status", in: "query", schema: { type: "string", enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteressePaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/interesses/recebidos": {
        get: {
            tags: ["Interesses"],
            summary: "Listar interesses recebidos pelo doador",
            description: `Lista os interesses recebidos nos itens do doador autenticado.

Regras de negócio:
- A rota exige autenticação e usuário ativo.
- O filtro de doador é sempre restringido ao usuário autenticado.
- Pode ser filtrada por status, item e período.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "itemId", in: "query", schema: { type: "string" }, description: "Filtrar por item" },
                { name: "status", in: "query", schema: { type: "string", enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteressePaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/interesses/{id}": {
        get: {
            tags: ["Interesses"],
            summary: "Consultar interesse por ID",
            description: `Retorna os detalhes de um interesse específico.

Regras de negócio:
- A rota exige autenticação.
- O acesso é permitido apenas ao interessado, ao doador responsável pelo item ou ao administrador.
- Caso o interesse não exista, retorna erro apropriado.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteresseDetalhes"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Interesses"],
            summary: "Cancelar interesse",
            description: `Cancela um interesse registrado anteriormente.

Regras de negócio:
- A rota exige autenticação.
- Apenas o próprio usuário interessado pode cancelar.
- Interesses PENDENTE e ACEITO podem ser cancelados.
- Se o interesse cancelado estiver ACEITO, o item volta para DISPONIVEL e a reserva é desfeita.
- O cancelamento é condicional e pode falhar se o estado mudar concorrentemente.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteresseDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/interesses/{id}/aceitar": {
        put: {
            tags: ["Interesses"],
            summary: "Aceitar um interesse pendente",
            description: `Permite que o doador responsável aceite uma manifestação de interesse.

Regras de negócio:
- Apenas o doador responsável pelo item pode aceitar.
- O interesse deve estar PENDENTE.
- O item precisa estar DISPONIVEL.
- Ao aceitar, o interesse vira ACEITO, o item vira RESERVADO e os demais interesses pendentes do item são recusados automaticamente.
- A reserva é condicional: somente uma tentativa concorrente pode vencer.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/InteresseRespostaDoador" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/InteresseDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/interesses/{id}/recusar": {
        put: {
            tags: ["Interesses"],
            summary: "Recusar um interesse pendente",
            description: `Permite que o doador responsável recuse uma solicitação de interesse.

Regras de negócio:
- Apenas o doador responsável pode recusar.
- O interesse deve estar PENDENTE.
- Ao recusar, o interesse passa para RECUSADO e o item permanece DISPONIVEL se nenhum outro interesse tiver sido aceito.
- A recusa é condicional e pode falhar se o estado mudar concorrentemente.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/InteresseRespostaDoador" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/InteresseDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itens/{id}/interesses": {
        get: {
            tags: ["Interesses"],
            summary: "Listar interessados de um item",
            description: `Lista os interesses registrados para um item de doação.

Regras de negócio:
- A rota exige autenticação e situação ATIVO.
- Somente o doador proprietário do item pode consultar seus interessados.
- Administradores que não sejam proprietários também recebem 403.
- Caso o item não exista, retorna 404.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteresseListaDoItem"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default interessesPaths;
