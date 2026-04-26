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

const denunciasSchemas = {
    DenunciaUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "João Souza" },
            email: { type: "string", format: "email", example: "joao@email.com" },
            cidade: { type: "string", example: "Várzea Grande" },
            uf: { type: "string", example: "MT" },
            situacao: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"], nullable: true },
        },
    },
    DenunciaItemResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Mesa de estudo" },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
            },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
        },
    },
    DenunciaListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439016" },
            denunciante_id: { $ref: "#/components/schemas/DenunciaUsuarioResumo" },
            tipo_alvo: { type: "string", enum: ["ITEM", "USUARIO"], example: "ITEM" },
            alvo_item_id: { $ref: "#/components/schemas/DenunciaItemResumo", nullable: true },
            alvo_usuario_id: { $ref: "#/components/schemas/DenunciaUsuarioResumo", nullable: true },
            motivo: {
                type: "string",
                enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"],
                example: "FRAUDE",
            },
            descricao: { type: "string", nullable: true, example: "O anúncio contém informações inconsistentes." },
            status: {
                type: "string",
                enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"],
                example: "EM_ANALISE",
            },
            resposta_admin: { type: "string", nullable: true, example: "Análise concluída pela administração." },
            admin_id: { $ref: "#/components/schemas/DenunciaUsuarioResumo", nullable: true },
            acao_tomada: { type: "string", nullable: true, example: "Item removido da plataforma." },
            data_denuncia: { type: "string", format: "date-time" },
            data_analise: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    DenunciaDetalhes: {
        allOf: [
            { $ref: "#/components/schemas/DenunciaListagem" },
        ],
    },
    DenunciaPost: {
        type: "object",
        required: ["tipo_alvo", "motivo"],
        properties: {
            tipo_alvo: { type: "string", enum: ["ITEM", "USUARIO"], example: "ITEM" },
            alvo_item_id: { type: "string", nullable: true, example: "507f1f77bcf86cd799439015" },
            alvo_usuario_id: { type: "string", nullable: true, example: "507f1f77bcf86cd799439013" },
            motivo: {
                type: "string",
                enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"],
                example: "ITEM_PROIBIDO",
            },
            descricao: { type: "string", nullable: true, example: "Há indícios de que o item viola as regras da plataforma." },
        },
    },
    DenunciaPutPatch: {
        type: "object",
        properties: {
            motivo: {
                type: "string",
                enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"],
                example: "OUTRO",
            },
            descricao: { type: "string", nullable: true, example: "Atualizando detalhes da denúncia." },
        },
    },
    DenunciaPaginado: paginatedSchema("#/components/schemas/DenunciaListagem"),
};

export default denunciasSchemas;
