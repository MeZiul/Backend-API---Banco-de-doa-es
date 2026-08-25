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
    "/admin/usuarios": {
        get: {
            tags: ["Administração"],
            summary: "Listar usuários para moderação",
            description: `Lista usuários cadastrados para análise administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- O perfil e a situação atuais são consultados antes da operação.
- Permite filtros por nome, e-mail, CPF, cidade, UF, perfil, situação e período.
- A resposta não deve expor senha nem dados sensíveis de autenticação.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "nome", in: "query", schema: { type: "string" } },
                { name: "email", in: "query", schema: { type: "string", format: "email" } },
                { name: "cpf", in: "query", schema: { type: "string" } },
                { name: "cidade", in: "query", schema: { type: "string" } },
                { name: "uf", in: "query", schema: { type: "string", minLength: 2, maxLength: 2 } },
                { name: "perfil", in: "query", schema: { type: "string", enum: ["USUARIO", "ADMINISTRADOR"] } },
                { name: "situacao", in: "query", schema: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoUsuariosPaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/usuarios/{id}": {
        get: {
            tags: ["Administração"],
            summary: "Consultar usuário para moderação",
            description: `Retorna os dados de um usuário específico para análise administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Retorna os 10 registros mais recentes de itens, interesses, avaliações e denúncias relacionadas.
- Denúncias relacionadas incluem registros criados pelo usuário, contra ele ou contra seus itens.
- Caso o usuário não exista, retorna erro apropriado.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoUsuarioResultado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Administração"],
            summary: "Inativar usuário",
            description: `Inativa um usuário e cancela administrativamente itens ativos vinculados a ele.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- O usuário alvo passa para situação INATIVO.
- Itens DISPONIVEL vinculados ao usuário passam para CANCELADO.
- A inativação é bloqueada se houver item RESERVADO ou AGUARDANDO_CONFIRMACAO.
- O administrador não pode inativar a si mesmo.
- Cancelamentos, revalidação, inativação e auditoria usam uma transação serializável.
- Interessados são consultados e notificados somente depois do commit.`,
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
                409: commonResponses[409](),
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
- O administrador não pode bloquear a si mesmo.
- A ação usa atualização condicional e deve gerar registro administrativo.`,
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
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/itens": {
        get: {
            tags: ["Administração"],
            summary: "Listar itens para moderação",
            description: `Lista itens cadastrados para fiscalização administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Permite consulta de itens em qualquer status.
- Permite filtros por categoria, usuário, localização, condição e período.
- A resposta traz dados suficientes para moderação.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "status", in: "query", schema: { type: "string", enum: ["DISPONIVEL", "RESERVADO", "AGUARDANDO_CONFIRMACAO", "DOADO", "CANCELADO"] } },
                { name: "categoriaId", in: "query", schema: { type: "string" } },
                { name: "usuarioId", in: "query", schema: { type: "string" } },
                { name: "cidade", in: "query", schema: { type: "string" } },
                { name: "uf", in: "query", schema: { type: "string", minLength: 2, maxLength: 2 } },
                { name: "condicaoItem", in: "query", schema: { type: "string", enum: ["NOVO", "SEMINOVO", "USADO_BOM", "USADO_REGULAR"] } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoItensPaginado"),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/itens/{id}": {
        delete: {
            tags: ["Administração"],
            summary: "Cancelar item administrativamente",
            description: `Cancela um item por ação administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- O item alvo passa para status CANCELADO.
- A ação usa atualização condicional e deve ser registrada administrativamente.
- Após o commit, os interesses ativos são consultados e seus usuários são notificados em modo best-effort.`,
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
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/admin/denuncias": {
        get: {
            tags: ["Administração"],
            summary: "Listar denúncias para análise",
            description: `Lista denúncias registradas para análise administrativa.

Regras de negócio:
- A rota exige autenticação com perfil ADMINISTRADOR.
- Exibe denúncias em qualquer status.
- Permite filtros por status, tipo de alvo, motivo, denunciante e período.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "status", in: "query", schema: { type: "string", enum: ["EM_ANALISE", "PROCEDENTE", "IMPROCEDENTE"] } },
                { name: "tipoAlvo", in: "query", schema: { type: "string", enum: ["ITEM", "USUARIO"] } },
                { name: "motivo", in: "query", schema: { type: "string", enum: ["CONTEUDO_INAPROPRIADO", "ITEM_PROIBIDO", "FRAUDE", "ASSEDIO", "SPAM", "OUTRO"] } },
                { name: "denuncianteId", in: "query", schema: { type: "string" } },
                { name: "dataInicio", in: "query", schema: { type: "string", format: "date" } },
                { name: "dataFim", in: "query", schema: { type: "string", format: "date" } },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/AdministracaoDenunciasPaginado"),
                403: commonResponses[403](),
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
- A ação usa atualização condicional e deve gerar registro administrativo.`,
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
                409: commonResponses[409](),
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
- Itens DISPONIVEL vinculados ao usuário passam para CANCELADO.
- A inativação é bloqueada se houver item RESERVADO ou AGUARDANDO_CONFIRMACAO.
- O administrador não pode inativar a si mesmo.
- Cancelamentos, revalidação, inativação e auditoria usam uma transação serializável.
- Interessados são consultados e notificados somente depois do commit.`,
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
                409: commonResponses[409](),
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
- A ação usa atualização condicional e deve ser registrada administrativamente.
- Após o commit, os interesses ativos são consultados e seus usuários são notificados em modo best-effort.`,
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
                409: commonResponses[409](),
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
- A resolução é condicional: somente uma operação concorrente pode vencer.
- O administrador não pode aplicar auto-suspensão por meio da resolução.
- A análise registra o administrador responsável, a resposta, a ação tomada e a data.
- Denunciante e alvo afetado são notificados em modo best-effort.
- Se um item for cancelado, seus interessados são consultados somente depois do commit e também são notificados.`,
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
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default administracaoPaths;
