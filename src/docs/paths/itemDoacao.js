import commonResponses from "../schemas/swaggerCommonResponses.js";

const itemDoacaoPaths = {
    "/itemdoacao": {
        post: {
            tags: ["Itens de Doação"],
            summary: "Cadastrar novo item para doação",
            description: `Permite que um usuário autenticado cadastre um item para doação.

Regras de negócio:
- O usuário deve estar autenticado e com a situação ATIVO.
- Título, descrição, categoria e condição do item são campos obrigatórios.
- A cidade e UF serão herdadas do perfil do usuário caso não sejam enviadas.
- O status inicial do item é definido automaticamente como DISPONIVEL.
- Contadores de visualizações e total de interesses iniciam zerados.`,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ItemDoacaoPost" },
                    },
                },
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/ItemDoacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        get: {
            tags: ["Itens de Doação"],
            summary: "Listar itens disponíveis",
            description: `Lista os itens cadastrados no sistema para doação.

Regras de negócio:
- Rota pública, não exige autenticação.
- O sistema retorna nativamente os itens que possuem o status DISPONIVEL.
- A listagem é paginada.
- Pode ser filtrada opcionalmente por categoria, cidade e estado (UF).`,
            parameters: [
                { name: "categoriaId", in: "query", schema: { type: "string" }, description: "ID da categoria do item" },
                { name: "cidade", in: "query", schema: { type: "string" }, description: "Nome da cidade" },
                { name: "uf", in: "query", schema: { type: "string" }, description: "Sigla do estado" },
                { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                { name: "limit", in: "query", schema: { type: "integer", default: 15 } },
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoPaginado"),
                500: commonResponses[500](),
            },
        },
    },
    "/itemdoacao/{id}": {
        get: {
            tags: ["Itens de Doação"],
            summary: "Consultar detalhes de um item específico",
            description: `Retorna as informações completas de um item de doação.

Regras de negócio:
- Rota pública, não exige autenticação.
- Caso o item não seja encontrado na base de dados, o sistema retorna um erro 404 (Not Found).`,
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes"),
                404: commonResponses[404](),
                500: commonResponses[500](),
            },
        },
        put: {
            tags: ["Itens de Doação"],
            summary: "Atualizar dados básicos do item",
            description: `Permite a edição das informações do item.

Regras de negócio:
- A rota exige autenticação válida.
- Apenas o usuário doador (proprietário do item) tem permissão para editá-lo.
- A edição é bloqueada caso o item não esteja mais com o status DISPONIVEL.
- Campos de controle como status, usuario_id e interesse_aceito_id não podem ser alterados manualmente por esta rota.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            requestBody: {
                content: {
                    "application/json": { schema: { $ref: "#/components/schemas/ItemDoacaoPut" } },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Itens de Doação"],
            summary: "Cancelar um item",
            description: `Altera o status do item para CANCELADO, preservando seu histórico na base de dados.

Regras de negócio:
- A rota exige autenticação válida.
- Apenas o usuário doador (criador do item) pode cancelar.
- Trava de segurança: Itens com o status RESERVADO ou AGUARDANDO_CONFIRMACAO não podem ser cancelados, pois existe um processo de doação em andamento.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes", "Item cancelado com sucesso."),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itemdoacao/{id}/confirmar-entrega": {
        put: {
            tags: ["Itens de Doação"],
            summary: "Sinalizar a entrega física do item",
            description: `Permite ao doador confirmar que o item foi repassado ao interessado.

Regras de negócio:
- Exige autenticação.
- Apenas o doador responsável pelo item pode acionar esta confirmação.
- O item deve estar obrigatoriamente com o status RESERVADO.
- Após a confirmação, o status do item transiciona para AGUARDANDO_CONFIRMACAO.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itemdoacao/{id}/confirmar-recebimento": {
        put: {
            tags: ["Itens de Doação"],
            summary: "Atestar o recebimento do item",
            description: `Permite ao interessado confirmar que recebeu o item físico em mãos.

Regras de negócio:
- Exige autenticação do usuário interessado.
- O item precisa estar com o status AGUARDANDO_CONFIRMACAO.
- Após a conclusão, o status do item transiciona definitivamente para DOADO.
- A data_doacao é registrada com o carimbo de tempo exato da operação.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itens/{id}/cancelar": {
        patch: {
            tags: ["Itens de Doação"],
            summary: "Cancelar a oferta de um item",
            description: `Interrompe a disponibilidade ou a negociação de um item.

Regras de negócio:
- Exige autenticação.
- Apenas o proprietário do item ou um perfil ADMINISTRADOR podem efetuar o cancelamento.
- Itens já marcados como CANCELADO ou DOADO têm o cancelamento bloqueado.
- É obrigatório o envio de um 'motivo' contendo pelo menos 10 caracteres para compor o histórico de auditoria.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: { motivo: { type: "string", minLength: 10, description: "Justificativa obrigatória do cancelamento" } },
                            required: ["motivo"]
                        }
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/ItemDoacaoDetalhes"),
                400: commonResponses[400](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itens/{id}/interesses": {
        get: {
            tags: ["Itens de Doação"],
            summary: "Listar usuários interessados no item",
            description: `Busca o histórico de manifestações de interesse feitas para um item específico.

Regras de negócio:
- A rota exige autenticação via token.
- Trava de privacidade: Apenas o doador que criou o item ou um usuário ADMINISTRADOR pode acessar essa lista. Usuários comuns recebem erro de permissão negada.`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: {
                200: commonResponses[200]("#/components/schemas/InteressePaginado"),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
"/itemdoacao/{id}/fotos": {
        post: {
            tags: ["Itens de Doação"],
            summary: "Adicionar fotos ao item",
            description: `Faz upload de uma ou mais fotos para um item de doação.

Regras de negócio:
- A rota exige autenticação via token.
- Apenas o doador (proprietário do item) pode adicionar fotos.
- O item deve estar com o status DISPONIVEL.
- São aceitas no máximo 5 fotos por item (RN-ITEM-002).
- Formatos aceitos: JPEG, PNG e WebP, com tamanho máximo de 5 MB cada (RN-ITEM-003).`,
            security: [{ bearerAuth: [] }],
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID do item" }],
            requestBody: {
                required: true,
                content: {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                fotos: {
                                    type: "array",
                                    items: { type: "string", format: "binary" },
                                    description: "Arquivos de imagem (até 5)",
                                },
                            },
                            required: ["fotos"],
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Fotos adicionadas com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    mensagem: { type: "string", example: "Fotos adicionadas com sucesso!" },
                                    fotos: { type: "array", items: { $ref: "#/components/schemas/ItemDoacaoFotoObj" } },
                                },
                            },
                        },
                    },
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/itemdoacao/{id}/fotos/{fotoId}": {
        delete: {
            tags: ["Itens de Doação"],
            summary: "Remover uma foto do item",
            description: `Remove uma foto específica de um item de doação.

Regras de negócio:
- A rota exige autenticação via token.
- Apenas o doador (proprietário do item) pode remover fotos.
- O arquivo físico da imagem também é removido do servidor.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID do item" },
                { name: "fotoId", in: "path", required: true, schema: { type: "string" }, description: "ID da foto a remover" },
            ],
            responses: {
                200: {
                    description: "Foto removida com sucesso",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    mensagem: { type: "string", example: "Foto removida com sucesso!" },
                                    fotos: { type: "array", items: { $ref: "#/components/schemas/ItemDoacaoFotoObj" } },
                                },
                            },
                        },
                    },
                },
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    }




};

export default itemDoacaoPaths;