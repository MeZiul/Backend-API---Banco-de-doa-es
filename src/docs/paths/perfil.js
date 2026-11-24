import commonResponses from "../schemas/swaggerCommonResponses.js";

const perfilPaths = {
    "/perfil": {
        get: {
            tags: ["Perfil"],
            summary: "Consultar o próprio perfil",
            security: [{ bearerAuth: [] }],
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        put: {
            tags: ["Perfil"],
            summary: "Atualizar o próprio perfil",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/PerfilAtualizarRequisicao" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
        delete: {
            tags: ["Perfil"],
            summary: "Desativar a própria conta",
            description: "Altera a situação da conta para INATIVO e preserva o histórico.",
            security: [{ bearerAuth: [] }],
            responses: {
                204: { description: "Conta desativada com sucesso." },
                400: commonResponses[400](),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/perfil/completar-cadastro": {
        patch: {
            tags: ["Perfil"],
            summary: "Completar o cadastro do usuário autenticado",
            description: `
Permite concluir o cadastro de um usuário autenticado
que ainda não possui todos os dados obrigatórios.

Regras de negócio:

- Exige uma sessão válida.
- O usuário deve estar ativo.
- O cadastro ainda não pode estar completo.
- O CPF deve ser válido e não pertencer a outro usuário.
- O aceite dos termos de uso é obrigatório.
- Não permite alterar nome, e-mail, senha ou perfil.
- A data e a versão dos termos são definidas pelo servidor.
- Após a conclusão, o usuário poderá acessar as
  funcionalidades restritas da plataforma.
        `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/PerfilCompletarCadastroRequisicao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/admin/usuarios/{id}/perfil": {
        patch: {
            tags: ["Perfil"],
            summary: "Gerenciar acesso e situação de um usuário",
            description: `Permite a um administrador alterar o nível hierárquico ou a situação cadastral de um usuário no sistema.

Regras de negócio:
- A rota exige autenticação válida via token.
- É estritamente restrita a usuários que possuam o perfil 'ADMINISTRADOR' (validação hierárquica no middleware de rota).
- É obrigatório informar o novo 'perfil' (USUARIO, ADMINISTRADOR) ou a nova 'situacao' (ATIVO, INATIVO, SUSPENSO) no corpo da requisição. Se ambos estiverem ausentes, o sistema retorna erro 400.
- Caso o usuário alvo (ID da URL) não exista na base de dados, a operação é abortada retornando erro 404 (Not Found).
- A alteração reflete imediatamente nos privilégios de acesso do usuário alvo.`,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do usuário que receberá a alteração de acesso"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/PerfilGerenciarRequisicao" }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioCompleto"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default perfilPaths;
