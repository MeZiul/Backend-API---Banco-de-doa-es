const paginatedSchema = (schemaRef) => ({
    type: "object",
    properties: {
        docs: {
            type: "array",
            items: { $ref: schemaRef },
        },
        totalDocs: { type: "integer", example: 1 },
        limit: { type: "integer", example: 20 },
        totalPages: { type: "integer", example: 1 },
        page: { type: "integer", example: 1 },
        pagingCounter: { type: "integer", example: 1 },
        hasPrevPage: { type: "boolean", example: false },
        hasNextPage: { type: "boolean", example: false },
        prevPage: { type: "integer", nullable: true, example: null },
        nextPage: { type: "integer", nullable: true, example: null },
    },
});

const avaliacoesSchemas = {
    AvaliacaoUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "João Souza" },
            email: { type: "string", format: "email", example: "joao@email.com" },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
            media_avaliacoes: { type: "number", nullable: true, example: 4.8 },
            total_avaliacoes: { type: "integer", nullable: true, example: 5 },
        },
    },
    AvaliacaoItemResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Cadeira de escritório" },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
                example: "DOADO",
            },
            data_doacao: { type: "string", format: "date-time", nullable: true },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
        },
    },
    AvaliacaoListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439020" },
            item_id: { $ref: "#/components/schemas/AvaliacaoItemResumo" },
            avaliador_id: { $ref: "#/components/schemas/AvaliacaoUsuarioResumo" },
            avaliado_id: { $ref: "#/components/schemas/AvaliacaoUsuarioResumo" },
            nota: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            comentario: {
                type: "string",
                nullable: true,
                example: "Usuário pontual, comunicação boa e item entregue conforme combinado.",
            },
            tipo: {
                type: "string",
                enum: ["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"],
                example: "DOADOR_PARA_INTERESSADO",
            },
            data_avaliacao: { type: "string", format: "date-time" },
        },
    },
    AvaliacaoDetalhes: {
        allOf: [
            { $ref: "#/components/schemas/AvaliacaoListagem" },
        ],
    },
    AvaliacaoPost: {
        type: "object",
        required: ["item_id", "avaliado_id", "nota", "tipo"],
        properties: {
            item_id: { type: "string", example: "507f1f77bcf86cd799439015" },
            avaliado_id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nota: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            comentario: {
                type: "string",
                nullable: true,
                example: "A retirada ocorreu sem problemas.",
            },
            tipo: {
                type: "string",
                enum: ["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"],
                example: "DOADOR_PARA_INTERESSADO",
            },
        },
    },
    AvaliacaoPutPatch: {
        type: "object",
        properties: {
            nota: { type: "integer", minimum: 1, maximum: 5, example: 4 },
            comentario: {
                type: "string",
                nullable: true,
                example: "Comentário atualizado após revisar a experiência.",
            },
        },
    },
    AvaliacaoPaginado: paginatedSchema("#/components/schemas/AvaliacaoListagem"),
};

export default avaliacoesSchemas;
