const paginatedSchema = (schemaRef) => ({
    type: "object",
    properties: {
        docs: {
            type: "array",
            items: { $ref: schemaRef },
        },
        totalDocs: { type: "integer", example: 5 },
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

const notificacaoSchemas = {
    NotificacaoDetalhes: {
        type: "object",
        properties: {
            _id: { type: "string", example: "607f1f77bcf86cd799439abc" },
            usuario_id: { type: "string", example: "507f1f77bcf86cd799439012" },
            tipo: {
                type: "string",
                description: "Tipo da notificação baseado na constante TIPOS_NOTIFICACAO",
                example: "DOACAO_ACEITA"
            },
            titulo: { type: "string", example: "Interesse Aceito!" },
            mensagem: { type: "string", example: "O doador aceitou o seu interesse no item Cadeira de Escritório." },
            lida: { type: "boolean", example: false },
            referencia_tipo: { type: "string", nullable: true, example: "ItemDoacao" },
            referencia_id: { type: "string", nullable: true, example: "507f1f77bcf86cd799439015" },
            data_criacao: { type: "string", format: "date-time" },
            data_atualizacao: { type: "string", format: "date-time" }
        }
    },
    NotificacaoContador: {
        type: "object",
        properties: {
            nao_lidas: { type: "integer", example: 3 }
        }
    },
    NotificacaoMensagemSucesso: {
        type: "object",
        properties: {
            mensagem: { type: "string", example: "Marcado como Lidas" }
        }
    },
    NotificacaoPaginada: paginatedSchema("#/components/schemas/NotificacaoDetalhes")
};

export default notificacaoSchemas;