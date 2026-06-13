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

const itemDoacaoSchemas = {
    ItemDoacaoUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "João Doador" },
            email: { type: "string", format: "email", example: "joao@email.com" },
        },
    },
    ItemDoacaoCategoriaResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439099" },
            nome: { type: "string", example: "Móveis" },
        },
    },
    ItemDoacaoFotoObj: {
        type: "object",
        properties: {
            _id: { type: "string", example: "607f1f77bcf86cd799439123" },
            url: { type: "string", format: "uri", example: "https://meubucket.s3.amazonaws.com/foto1.jpg" },
            ordem: { type: "integer", example: 1 },
            nome_original: { type: "string", example: "cadeira_frente.jpg" },
            tamanho: { type: "integer", example: 2048576 },
            mime_type: { type: "string", example: "image/jpeg" },
            data_upload: { type: "string", format: "date-time" }
        }
    },
    ItemDoacaoListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Cadeira de escritório ergonômica" },
            descricao: { type: "string", example: "Cadeira preta com ajuste de altura, usada por 6 meses." },
            categoria_id: { $ref: "#/components/schemas/ItemDoacaoCategoriaResumo" },
            condicao_item: {
                type: "string",
                enum: ["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"],
                example: "USADO_BOM"
            },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
                example: "DISPONIVEL",
            },
            cidade: { type: "string", example: "Vilhena" },
            uf: { type: "string", example: "RO" },
            bairro: { type: "string", nullable: true, example: "Centro" },
            condicoes_doacao: { type: "string", nullable: true, example: "Retirar apenas no final de semana." },
            visualizacoes: { type: "integer", example: 15 },
            total_interesses: { type: "integer", example: 3 },
            usuario_id: { $ref: "#/components/schemas/ItemDoacaoUsuarioResumo" },
            data_cadastro: { type: "string", format: "date-time" },
            data_atualizacao: { type: "string", format: "date-time" },
        },
    },
    ItemDoacaoDetalhes: {
        allOf: [
            { $ref: "#/components/schemas/ItemDoacaoListagem" },
            {
                type: "object",
                properties: {
                    motivo_cancelamento: { type: "string", nullable: true, example: "Decidi consertar e ficar com a cadeira." },
                    data_doacao: { type: "string", format: "date-time", nullable: true },
                    interesse_aceito_id: { type: "string", nullable: true, example: null },
                    fotos: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ItemDoacaoFotoObj" }
                    }
                }
            }
        ],
    },
    ItemDoacaoPost: {
        type: "object",
        required: ["titulo", "descricao", "categoria_id", "condicao_item"],
        properties: {
            titulo: { type: "string", example: "Mesa de jantar de madeira" },
            descricao: { type: "string", example: "Mesa para 4 lugares, pequenas marcas de uso." },
            categoria_id: { type: "string", example: "507f1f77bcf86cd799439099" },
            condicao_item: {
                type: "string",
                enum: ["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"],
                example: "USADO_BOM"
            },
            cidade: { type: "string", nullable: true, example: "Vilhena" },
            uf: { type: "string", nullable: true, example: "RO" },
            bairro: { type: "string", nullable: true, example: "Centro" },
            condicoes_doacao: { type: "string", nullable: true, example: "O interessado precisa ter carroça/fiorino para buscar." }
        },
    },
    ItemDoacaoPut: {
        type: "object",
        properties: {
            titulo: { type: "string", example: "Mesa de jantar de madeira (Atualizado)" },
            descricao: { type: "string", example: "Mesa para 4 lugares, pequenos arranhões nas bordas." },
            categoria_id: { type: "string", example: "507f1f77bcf86cd799439099" },
            condicao_item: {
                type: "string",
                enum: ["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"],
                example: "USADO_REGULAR"
            },
            cidade: { type: "string", example: "Vilhena" },
            uf: { type: "string", example: "RO" },
            bairro: { type: "string", example: "Centro" },
            condicoes_doacao: { type: "string", example: "Retirar até sexta-feira." }
        },
    },
    ItemDoacaoPaginado: paginatedSchema("#/components/schemas/ItemDoacaoListagem"),
};

export default itemDoacaoSchemas;