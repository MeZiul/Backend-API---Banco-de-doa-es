import commonResponses from "../schemas/swaggerCommonResponses.js";

const administracaoPaths = {
    "/admin/administracoes": {
        get: {
            tags: ["Administração"],
            summary: "Listar ações administrativas",
            description: `Lista os registros administrativos associados à moderação da plataforma.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Permite filtros por administrador, tipo de ação, tipo de alvo, resultado da denúncia e período.
- O retorno é paginado e ordenado da ação mais recente para a mais antiga.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "administradorId", in: "query", schema: { type: "string" } },
                { name: "tipoAcao", in: "query", schema: { type: "string", enum: ["BLOQUEIO_USUARIO", "DESBLOQUEIO_USUARIO", "INATIVACAO_USUARIO", "CANCELAMENTO_ITEM", "RESOLUCAO_DENUNCIA"] } },
                { name: "tipoAlvo", in: "query", schema: { type: "string", enum: ["USUARIO", "ITEM", "DENUNCIA"] } },
                { name: "alvoId", in: "query", schema: { type: "string" } },
                { name: "resultadoDenuncia", in: "query", schema: { type: "string", enum: ["PROCEDENTE", "IMPROCEDENTE"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoPaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/administracoes/{id}": {
        get: {
            tags: ["Administração"],
            summary: "Consultar ação administrativa por ID",
            description: `Retorna os detalhes de um registro administrativo específico.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoDetalhes"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/alvos/{alvoId}/administracoes": {
        get: {
            tags: ["Administração"],
            summary: "Listar ações administrativas por alvo",
            description: `Lista as ações administrativas relacionadas a um alvo específico.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "alvoId", in: "path", required: true, schema: { type: "string" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoPaginado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/administradores/{administradorId}/administracoes": {
        get: {
            tags: ["Administração"],
            summary: "Listar ações realizadas por administrador",
            description: `Lista as ações administrativas registradas para um administrador específico.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "administradorId", in: "path", required: true, schema: { type: "string" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoPaginado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/usuarios/{id}/bloquear": {
        put: {
            tags: ["Administração"],
            summary: "Bloquear usuário",
            description: `Suspende um usuário administrativamente.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- A justificativa é obrigatória.
- O usuário alvo passa para situação SUSPENSO.
- A ação deve gerar registro administrativo.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AdministracaoBloqueioBody" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoUsuarioResultado"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/usuarios/{id}/desbloquear": {
        put: {
            tags: ["Administração"],
            summary: "Desbloquear usuário",
            description: `Reativa um usuário suspenso.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Apenas usuários atualmente suspensos podem ser desbloqueados.
- A ação deve gerar registro administrativo.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AdministracaoAcaoBody" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoUsuarioResultado"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/usuarios/{id}/inativar": {
        put: {
            tags: ["Administração"],
            summary: "Inativar usuário",
            description: `Inativa um usuário e cancela administrativamente itens ativos vinculados a ele.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- O usuário alvo passa para situação INATIVO.
- Itens ativos vinculados ao usuário podem ser alterados para CANCELADO.
- A ação deve gerar registro administrativo.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AdministracaoAcaoBody" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoUsuarioResultado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/itens/{id}/cancelar": {
        put: {
            tags: ["Administração"],
            summary: "Cancelar item administrativamente",
            description: `Cancela um item por ação administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- O item alvo passa para status CANCELADO.
- A ação deve ser registrada administrativamente.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AdministracaoAcaoBody" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoItemResultado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/denuncias/{id}/resolver": {
        put: {
            tags: ["Administração"],
            summary: "Resolver denúncia em análise",
            description: `Conclui a análise administrativa de uma denúncia.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Apenas denúncias EM_ANALISE podem ser resolvidas.
- O resultado deve ser PROCEDENTE ou IMPROCEDENTE.
- Em caso de denúncia procedente, pode haver cancelamento de item ou suspensão de usuário.
- A análise registra o administrador responsável, a resposta, a ação tomada e a data.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AdministracaoResolverDenunciaBody" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoDenunciaResultado"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default administracaoPaths;
