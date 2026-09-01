import commonResponses from "../schemas/swaggerCommonResponses.js";

const authPaths = {
    "/auth/login": {
        post: {
            tags: ["Autenticação"],
            summary: "Autenticar usuário",
            description: `Autentica um usuário por e-mail e senha e retorna um token opaco de sessão Better Auth.

Regras de negócio:
- E-mail e senha são obrigatórios.
- Credenciais inválidas retornam erro sem informar qual campo falhou.
- Usuários SUSPENSO ou INATIVO não podem autenticar.
- A sessão é persistida no PostgreSQL e pode ser revogada imediatamente.
- O token retornado não é JWT e não deve ser decodificado pelo cliente.
- O token deve ser enviado nas rotas protegidas pelo header Authorization: Bearer <token>.`,
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AuthLoginRequest" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AuthLoginResponse"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                500: commonResponses[500](),
            },
        },
    },
    "/auth/esqueci-senha": {
        post: {
            tags: ["Autenticação"],
            summary: "Solicitar redefinição de senha",
            description: `Inicia o fluxo de recuperação de senha para o e-mail informado.

Regras de negócio:
- O e-mail é obrigatório e deve ter formato válido.
- A resposta não deve confirmar se o e-mail existe ou não na base.
- Quando o usuário existe, um link temporário de redefinição é enviado ao e-mail cadastrado.
- O token nunca é retornado no corpo da resposta.`,
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AuthEsqueciSenhaRequest" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AuthMensagemResponse"),
                400: commonResponses[400](),
                500: commonResponses[500](),
            },
        },
    },
    "/auth/redefinir-senha": {
        put: {
            tags: ["Autenticação"],
            summary: "Redefinir senha",
            description: `Redefine a senha do usuário usando o token recebido no fluxo de recuperação.

Regras de negócio:
- Token e nova senha são obrigatórios.
- A nova senha deve obedecer à política de segurança definida no schema.
- Token inválido ou expirado impede a alteração.
- Após redefinir, o token de recuperação deixa de ser reutilizável.`,
            security: [],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/AuthRedefinirSenhaRequest" },
                    },
                },
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/AuthMensagemResponse"),
                400: commonResponses[400](),
                500: commonResponses[500](),
            },
        },
    },
    "/auth/logout": {
        post: {
            tags: ["Autenticação"],
            summary: "Encerrar sessão",
            description: `Revoga a sessão persistida correspondente ao Bearer informado no header Authorization.

Regras de negócio:
- A rota exige autenticação.
- A sessão atual é removida da tabela Session.
- Não existe blacklist em memória.
- Requisições futuras com o mesmo token são recusadas mesmo após reiniciar a API.`,
            security: [{ bearerAuth: [] }],
            responses: {
                200: commonResponses[200]("#/components/schemas/AuthMensagemResponse"),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
    "/auth/refresh-token": {
        post: {
            tags: ["Autenticação"],
            summary: "Rotacionar token de sessão",
            description: `Substitui atomicamente o token da sessão Better Auth do usuário autenticado.

Regras de negócio:
- A rota exige autenticação.
- O usuário associado à sessão deve existir e estar ATIVO.
- A rotação só ocorre se o token atual ainda existir e não estiver expirado.
- O token anterior é invalidado imediatamente; uma segunda tentativa concorrente falha.`,
            security: [{ bearerAuth: [] }],
            responses: {
                200: commonResponses[200]("#/components/schemas/AuthRefreshTokenResponse"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500](),
            },
        },
    },
};

export default authPaths;
