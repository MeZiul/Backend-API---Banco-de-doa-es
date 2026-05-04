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

const administracaoSchemas = {
    AdministracaoUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "Usuário Moderado" },
            email: { type: "string", format: "email", example: "usuario@email.com" },
            perfil: { type: "string", enum: ["USUARIO", "ADMINISTRADOR"], nullable: true },
            situacao: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"], nullable: true },
        },
    },
    AdministracaoItemResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Notebook usado" },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
            },
        },
    },
    AdministracaoDenunciaResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439016" },
            tipo_alvo: { type: "string", enum: ["ITEM", "USUARIO"] },
            status: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"] },
            motivo: {
                type: "string",
                enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"],
                nullable: true,
            },
        },
    },
    AdministracaoListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439017" },
            administrador_id: { $ref: "#/components/schemas/AdministracaoUsuarioResumo" },
            tipo_acao: {
                type: "string",
                enum: ["BLOQUEIO_USUARIO", "DESBLOQUEIO_USUARIO", "INATIVACAO_USUARIO", "CANCELAMENTO_ITEM", "RESOLUCAO_DENUNCIA"],
            },
            tipo_alvo: { type: "string", enum: ["USUARIO", "ITEM", "DENUNCIA"] },
            alvo_id: {
                oneOf: [
                    { $ref: "#/components/schemas/AdministracaoUsuarioResumo" },
                    { $ref: "#/components/schemas/AdministracaoItemResumo" },
                    { $ref: "#/components/schemas/AdministracaoDenunciaResumo" },
                ],
            },
            alvo_model: { type: "string", enum: ["Usuario", "ItemDoacao", "Denuncia"] },
            justificativa: { type: "string", nullable: true, example: "Violação reiterada das regras da plataforma." },
            suspensao_ate: { type: "string", format: "date-time", nullable: true },
            resultado_denuncia: { type: "string", enum: ["PROCEDENTE", "IMPROCEDENTE"], nullable: true },
            resposta_administrativa: { type: "string", nullable: true, example: "Conta suspensa após análise." },
            acao_tomada: { type: "string", nullable: true, example: "Usuário suspenso." },
            data_acao: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    AdministracaoDetalhes: {
        allOf: [
            { $ref: "#/components/schemas/AdministracaoListagem" },
        ],
    },
    AdministracaoBloqueioBody: {
        type: "object",
        required: ["justificativa"],
        properties: {
            justificativa: { type: "string", example: "Violação das regras de uso." },
            suspensao_ate: { type: "string", format: "date-time", nullable: true },
            resposta_administrativa: { type: "string", nullable: true, example: "Conta suspensa por tempo determinado." },
            acao_tomada: { type: "string", nullable: true, example: "Usuário suspenso." },
        },
    },
    AdministracaoAcaoBody: {
        type: "object",
        properties: {
            resposta_administrativa: { type: "string", nullable: true, example: "Situação regularizada." },
            acao_tomada: { type: "string", nullable: true, example: "Registro administrativo concluído." },
        },
    },
    AdministracaoResolverDenunciaBody: {
        type: "object",
        required: ["resultado_denuncia"],
        properties: {
            resultado_denuncia: { type: "string", enum: ["PROCEDENTE", "IMPROCEDENTE"], example: "PROCEDENTE" },
            resposta_administrativa: { type: "string", nullable: true, example: "Denúncia validada após análise." },
            acao_tomada: { type: "string", nullable: true, example: "Item cancelado pela administração." },
            suspensao_ate: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoUsuarioResultado: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "Usuário Moderado" },
            email: { type: "string", format: "email", example: "usuario@email.com" },
            perfil: { type: "string", enum: ["USUARIO", "ADMINISTRADOR"] },
            situacao: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"] },
            motivo_suspensao: { type: "string", nullable: true },
            suspensao_ate: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoItemResultado: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            titulo: { type: "string", example: "Notebook usado" },
            status: {
                type: "string",
                enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"],
                example: "CANCELADO",
            },
        },
    },
    AdministracaoDenunciaResultado: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439016" },
            status: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"], example: "PROCEDENTE" },
            admin_id: { type: "string", example: "507f1f77bcf86cd799439011" },
            resposta_admin: { type: "string", nullable: true },
            acao_tomada: { type: "string", nullable: true },
            data_analise: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoPaginado: paginatedSchema("#/components/schemas/AdministracaoListagem"),
    AdministracaoUsuariosPaginado: paginatedSchema("#/components/schemas/AdministracaoUsuarioResultado"),
    AdministracaoItensPaginado: paginatedSchema("#/components/schemas/AdministracaoItemResultado"),
    AdministracaoDenunciasPaginado: paginatedSchema("#/components/schemas/AdministracaoDenunciaResultado"),
};

export default administracaoSchemas;
