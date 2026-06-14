import commonResponses from "../schemas/swaggerCommonResponses.js";

const perfilPaths = {
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
                200: commonResponses[200](),
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