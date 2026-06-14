import commonResponses from "../schemas/swaggerCommonResponses.js";

const notificacaoPaths = {
    "/notificacoes": {
        get: {
            tags: ["Notificações"],
            summary: "Listar notificações do usuário",
            description: `Retorna o histórico de notificações do usuário autenticado.

Regras de negócio:
- A rota exige autenticação válida.
- O sistema retorna exclusivamente as notificações pertencentes ao próprio usuário logado (filtro automático via token).
- A listagem é paginada e ordenada da mais recente para a mais antiga por padrão.
- O usuário pode enviar o parâmetro 'lida' na query para filtrar apenas as lidas ou não lidas.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
                { name: "lida", in: "query", schema: { type: "boolean" }, description: "Filtrar por status de leitura" }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/NotificacaoPaginada"),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/notificacoes/contador": {
        get: {
            tags: ["Notificações"],
            summary: "Consultar quantidade de notificações não lidas",
            description: `Retorna um número inteiro representando o total de alertas pendentes de leitura.

Regras de negócio:
- A rota exige autenticação válida.
- Conta apenas notificações onde o campo 'lida' é estritamente 'false' vinculadas ao 'usuario_id' do token.`,
            security: [{ bearerAuth: [] }],
            responses: {
                200: commonResponses[200]("#/components/schemas/NotificacaoContador"),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/notificacoes/{id}/ler": {
        patch: {
            tags: ["Notificações"],
            summary: "Marcar notificação específica como lida",
            description: `Sinaliza uma notificação individual como visualizada pelo usuário.

Regras de negócio:
- A rota exige autenticação válida.
- O sistema valida se a notificação solicitada existe e se pertence ao usuário autenticado. Caso contrário, retorna erro 404 (Not Found).
- Altera a flag 'lida' para 'true'.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID da notificação" }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/NotificacaoDetalhes"),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/notificacoes/ler-tudo": {
        post: {
            tags: ["Notificações"],
            summary: "Marcar todas as notificações como lidas",
            description: `Operação em lote para limpar os alertas do usuário.

Regras de negócio:
- A rota exige autenticação válida.
- O sistema localiza todas as notificações com 'lida: false' do usuário autenticado e as atualiza para 'true' em uma única transação no banco.`,
            security: [{ bearerAuth: [] }],
            responses: {
                200: commonResponses[200]("#/components/schemas/NotificacaoMensagemSucesso"),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default notificacaoPaths;