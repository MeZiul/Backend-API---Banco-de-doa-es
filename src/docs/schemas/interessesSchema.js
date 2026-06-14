const paginatedSchema = (schemaRef) => ({
    type: "object",
    properties: {
        docs: {
            type: "array",
            items: { $ref: schemaRef },
        },
        totalDocs: { type: "integer", example: 1 },
        limit: { type: "integer", example: 10 },
        totalPages: { type: "integer", example: 1 },
        page: { type: "integer", example: 1 },
        pagingCounter: { type: "integer", example: 1 },
        hasPrevPage: { type: "boolean", example: false },
        hasNextPage: { type: "boolean", example: false },
        prevPage: { type: "integer", nullable: true, example: null },
        nextPage: { type: "integer", nullable: true, example: null },
    },
});

const interessesSchemas = {
    InteresseUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439014" },
            nome: { type: "string", example: "Maria Silva" },
            email: { type: "string", format: "email", example: "maria@email.com" },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
        },
    },
    InteresseItemResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Cadeira de escritório" },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
            },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
            total_interesses: { type: "integer", example: 3 },
        },
    },
    InteresseListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439020" },
            item_id: { $ref: "#/components/schemas/InteresseItemResumo" },
            usuario_interessado_id: { $ref: "#/components/schemas/InteresseUsuarioResumo" },
            usuario_doador_id: { $ref: "#/components/schemas/InteresseUsuarioResumo" },
            mensagem_interessado: { type: "string", nullable: true, example: "Posso buscar hoje à tarde." },
            resposta_doador: { type: "string", nullable: true, example: "Tudo bem, vou separar o item." },
            status: {
                type: "string",
                enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"],
                example: "PENDENTE",
            },
            data_interesse: { type: "string", format: "date-time" },
            data_resposta: { type: "string", format: "date-time", nullable: true },
            data_cancelamento: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    InteresseDetalhes: {
        allOf: [
            { $ref: "#/components/schemas/InteresseListagem" },
        ],
    },
    InteressePost: {
        type: "object",
        required: ["item_id"],
        properties: {
            item_id: { type: "string", example: "507f1f77bcf86cd799439015" },
            mensagem_interessado: {
                type: "string",
                nullable: true,
                example: "Tenho interesse e consigo retirar amanhã.",
            },
        },
    },
    InteresseRespostaDoador: {
        type: "object",
        properties: {
            resposta_doador: {
                type: "string",
                nullable: true,
                example: "Interesse aceito. Vamos combinar a retirada.",
            },
        },
    },
    InteressePaginado: paginatedSchema("#/components/schemas/InteresseListagem"),
    InteresseListaDoItem: {
        type: "array",
        items: { $ref: "#/components/schemas/InteresseListagem" },
    },
};

export default interessesSchemas;
