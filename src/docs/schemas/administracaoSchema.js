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
            categoria_id: {
                type: "object",
                nullable: true,
                properties: {
                    _id: { type: "string" },
                    nome: { type: "string" },
                },
            },
            total_interesses: { type: "integer", example: 2 },
            data_cadastro: { type: "string", format: "date-time" },
            data_doacao: { type: "string", format: "date-time", nullable: true },
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
            denunciante_id: { type: "string", example: "507f1f77bcf86cd799439012" },
            alvo_item_id: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            alvo_usuario_id: { type: "string", nullable: true, example: "507f1f77bcf86cd799439013" },
            data_denuncia: { type: "string", format: "date-time" },
            data_analise: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoInteresseHistorico: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439018" },
            item_id: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            usuario_interessado_id: { type: "string", example: "507f1f77bcf86cd799439012" },
            usuario_doador_id: { type: "string", example: "507f1f77bcf86cd799439013" },
            status: { type: "string", enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"] },
            data_interesse: { type: "string", format: "date-time" },
            data_resposta: { type: "string", format: "date-time", nullable: true },
            data_cancelamento: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoAvaliacaoHistorico: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439019" },
            item_id: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            avaliador_id: { $ref: "#/components/schemas/AdministracaoUsuarioResumo" },
            avaliado_id: { $ref: "#/components/schemas/AdministracaoUsuarioResumo" },
            nota: { type: "integer", minimum: 1, maximum: 5, example: 5 },
            tipo: { type: "string", enum: ["DOADOR_PARA_INTERESSADO", "INTERESSADO_PARA_DOADOR"] },
            data_avaliacao: { type: "string", format: "date-time" },
        },
    },
    AdministracaoUsuarioHistorico: {
        type: "object",
        properties: {
            itens: {
                type: "array",
                maxItems: 10,
                items: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            },
            interesses: {
                type: "array",
                maxItems: 10,
                items: { $ref: "#/components/schemas/AdministracaoInteresseHistorico" },
            },
            avaliacoes: {
                type: "array",
                maxItems: 10,
                items: { $ref: "#/components/schemas/AdministracaoAvaliacaoHistorico" },
            },
            denuncias: {
                type: "array",
                maxItems: 10,
                items: { $ref: "#/components/schemas/AdministracaoDenunciaResumo" },
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
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
            telefone: { type: "string", nullable: true },
            foto_perfil: { type: "string", nullable: true },
            bio: { type: "string", nullable: true },
            media_avaliacoes: { type: "number", nullable: true },
            total_avaliacoes: { type: "integer", example: 0 },
            total_doacoes: { type: "integer", example: 0 },
            motivo_suspensao: { type: "string", nullable: true },
            suspensao_ate: { type: "string", format: "date-time", nullable: true },
            data_cadastro: { type: "string", format: "date-time" },
            data_atualizacao: { type: "string", format: "date-time" },
            historico: { $ref: "#/components/schemas/AdministracaoUsuarioHistorico" },
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
