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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            nome: { type: "string", example: "Usuário Moderado" },
            email: { type: "string", format: "email", example: "usuario@email.com" },
            perfil: { type: "string", enum: ["USUARIO", "ADMINISTRADOR"], nullable: true },
            situacao: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"], nullable: true },
        },
    },
    AdministracaoItemResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            tipo_alvo: { type: "string", enum: ["ITEM", "USUARIO"] },
            status: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"] },
            motivo: {
                type: "string",
                enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"],
                nullable: true,
            },
            denunciante_id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            alvo_item_id: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            alvo_usuario_id: { type: "string", nullable: true, example: "550e8400-e29b-41d4-a716-446655440000" },
            data_denuncia: { type: "string", format: "date-time" },
            data_analise: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoInteresseHistorico: {
        type: "object",
        properties: {
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            item_id: { $ref: "#/components/schemas/AdministracaoItemResumo" },
            usuario_interessado_id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            usuario_doador_id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            status: { type: "string", enum: ["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"] },
            data_interesse: { type: "string", format: "date-time" },
            data_resposta: { type: "string", format: "date-time", nullable: true },
            data_cancelamento: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoAvaliacaoHistorico: {
        type: "object",
        properties: {
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
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
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            status: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"], example: "PROCEDENTE" },
            admin_id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            resposta_admin: { type: "string", nullable: true },
            acao_tomada: { type: "string", nullable: true },
            data_analise: { type: "string", format: "date-time", nullable: true },
        },
    },
    AdministracaoPaginado: paginatedSchema("#/components/schemas/AdministracaoListagem"),
    AdministracaoUsuariosPaginado: paginatedSchema("#/components/schemas/AdministracaoUsuarioResultado"),
    AdministracaoItensPaginado: paginatedSchema("#/components/schemas/AdministracaoItemResultado"),
    AdministracaoDenunciasPaginado: paginatedSchema("#/components/schemas/AdministracaoDenunciaResultado"),
    MetricasAdmin: {
        type: "object",
        properties: {
            usuarios: { type: "integer", example: 42, description: "Usuários cadastrados (todas as situações)" },
            ativos: { type: "integer", example: 38, description: "Usuários na situação ATIVO" },
            itens: { type: "integer", example: 120, description: "Itens em todos os status" },
            disponiveis: { type: "integer", example: 57, description: "Itens DISPONIVEL" },
            doados: { type: "integer", example: 31, description: "Itens DOADO" },
            denuncias: { type: "integer", example: 4, description: "Denúncias EM_ANALISE" },
            usuarios_por_situacao: contagemPorEstado(["ATIVO", "SUSPENSO", "INATIVO"], "Usuários por situação"),
            itens_por_status: contagemPorEstado(["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"], "Itens por status"),
            interesses_por_status: contagemPorEstado(["PENDENTE", "ACEITO", "RECUSADO", "CANCELADO", "EXPIRADO"], "Interesses por status"),
            denuncias_por_status: contagemPorEstado(["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"], "Denúncias por status"),
            novos_por_mes: {
                type: "array",
                description: "Cadastros dos últimos 6 meses, incluindo o atual, do mais antigo para o mais recente (0 nos meses sem cadastro)",
                items: {
                    type: "object",
                    required: ["mes", "usuarios", "itens"],
                    properties: {
                        mes: { type: "string", example: "2026-11", description: "Ano e mês (AAAA-MM)" },
                        usuarios: { type: "integer", minimum: 0, description: "Usuários cadastrados no mês" },
                        itens: { type: "integer", minimum: 0, description: "Itens cadastrados no mês" },
                    },
                },
            },
            atualizado_em: { type: "string", format: "date-time" },
        },
    },
};

// Todo estado do enum aparece, com 0 quando não há registros.
function contagemPorEstado(estados, descricao) {
    return {
        type: "object",
        description: `${descricao} (todos os estados, com 0 quando vazio)`,
        required: estados,
        properties: Object.fromEntries(estados.map((estado) => [estado, { type: "integer", minimum: 0 }])),
    };
}

export default administracaoSchemas;