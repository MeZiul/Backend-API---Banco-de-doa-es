import commonResponses from "../schemas/swaggerCommonResponses.js";

const nativeAuthErrorResponse = (description) => ({
    description,
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/NativeAuthErrorResponse" },
        },
    },
});

const nativeAuthRateLimitResponse = (description) => ({
    description,
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/NativeAuthRateLimitResponse" },
        },
    },
});

const nativeOriginParameter = () => ({
    name: "Origin",
    in: "header",
    required: true,
    description: "Em produção, envie a origem da aplicação cadastrada em trustedOrigins. Substitua o domínio de exemplo por uma origem permitida; POSTs nativos sem Origin ou com origem não confiável podem retornar 403.",
    schema: { type: "string", format: "uri", example: "https://frontend.example.invalid" },
});

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
    "/api/auth/sign-up/email": {
        post: {
            tags: ["Autenticação"],
            summary: "Cadastro nativo com e-mail",
            description: `Cria um usuário pelo endpoint usado pelo SDK Better Auth. O objeto é estrito: somente os campos descritos no schema são aceitos. CPF precisa ser válido e ainda não cadastrado; a senha segue a política DoaI.

O cadastro está configurado com autoSignIn=false: a resposta contém token=null e não cria sessão. Envie Origin de trustedOrigins nas chamadas POST nativas em produção. Erros nativos usam {code,message} diretamente, sem o envelope legado {data,message,errors}.`,
            security: [],
            parameters: [nativeOriginParameter()],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/NativeAuthSignUpEmailRequest" },
                        example: {
                            name: "Ana Exemplo",
                            email: "ana.exemplo@example.invalid",
                            password: "Exemplo@123",
                            cpf: "52998224725",
                            telefone: "(65) 90000-0000",
                            cidade: "Cuiabá",
                            uf: "MT",
                            bio: "Perfil de demonstração.",
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Usuário criado; nenhum login automático ou sessão é criado.",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthSignUpEmailResponse" } } },
                },
                400: nativeAuthErrorResponse("Dados inválidos, CPF inválido ou senha fora da política. Body nativo {code,message} (com issues quando aplicável)."),
                403: nativeAuthErrorResponse("Origin ausente/não confiável em chamada protegida por CSRF, ou acesso recusado."),
                409: nativeAuthErrorResponse("CPF já cadastrado."),
                429: nativeAuthRateLimitResponse("Limite de cadastros excedido."),
                500: nativeAuthErrorResponse("Falha inesperada no Better Auth."),
            },
        },
    },
    "/api/auth/sign-in/email": {
        post: {
            tags: ["Autenticação"],
            summary: "Login nativo com e-mail",
            description: `Autentica pelo SDK Better Auth e cria uma sessão persistida. A resposta contém o token opaco também disponível no header set-auth-token e instala o cookie de sessão para clientes de navegador. O token não é JWT; informe-o no campo HTTP Bearer do Scalar ou em Authorization: Bearer <token>.

Envie Origin da aplicação cadastrada em trustedOrigins nas chamadas POST nativas em produção. Erros nativos usam {code,message} diretamente, sem o envelope legado {data,message,errors}.`,
            security: [],
            parameters: [nativeOriginParameter()],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/NativeAuthSignInEmailRequest" },
                        example: { email: "ana.exemplo@example.invalid", password: "Exemplo@123" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Sessão criada; token opaco no body e em set-auth-token, além do cookie para navegador.",
                    headers: {
                        "Set-Cookie": { description: "Cookie de sessão Better Auth para clientes de navegador.", schema: { type: "string" } },
                        "set-auth-token": { description: "Token opaco da sessão emitido pelo plugin Bearer.", schema: { type: "string", example: "<token-opaco-de-sessao>" } },
                    },
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthSignInEmailResponse" } } },
                },
                400: nativeAuthErrorResponse("E-mail ou corpo inválido."),
                401: nativeAuthErrorResponse("Credenciais inválidas."),
                403: nativeAuthErrorResponse("Origin ausente/não confiável em chamada protegida por CSRF, ou conta não ativa."),
                429: nativeAuthRateLimitResponse("Limite de tentativas de login excedido."),
                500: nativeAuthErrorResponse("Falha inesperada no Better Auth."),
            },
        },
    },
    "/api/auth/get-session": {
        get: {
            tags: ["Autenticação"],
            summary: "Consultar sessão nativa atual",
            description: `Consulta a sessão atual por cookie ou Bearer. A autenticação Bearer é opcional: quando não há sessão válida, a resposta HTTP 200 tem body null. GET não exige Origin.`,
            security: [{ bearerAuth: [] }, {}],
            responses: {
                200: {
                    description: "Sessão e usuário atuais, ou null se não houver sessão válida.",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthGetSessionResponse" } } },
                },
                500: nativeAuthErrorResponse("Falha inesperada no Better Auth."),
            },
        },
    },
    "/api/auth/sign-out": {
        post: {
            tags: ["Autenticação"],
            summary: "Encerrar sessão nativa",
            description: `Encerra a sessão indicada pelo Bearer opaco ou cookie Better Auth. O plugin Bearer converte Authorization em cookie de sessão para o handler e o logout revoga a sessão persistida; envie o token com o prefixo Bearer. A resposta limpa o cookie de sessão.

Envie Origin da aplicação cadastrada em trustedOrigins nas chamadas POST nativas em produção. Erros nativos usam {code,message} diretamente, sem o envelope legado {data,message,errors}.`,
            security: [{ bearerAuth: [] }],
            parameters: [nativeOriginParameter()],
            responses: {
                200: {
                    description: "Logout concluído; cookie de sessão é expirado quando presente.",
                    headers: { "Set-Cookie": { description: "Expira o cookie de sessão Better Auth quando presente.", schema: { type: "string" } } },
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthSignOutResponse" } } },
                },
                403: nativeAuthErrorResponse("Origin ausente/não confiável em chamada protegida por CSRF."),
                500: nativeAuthErrorResponse("Falha inesperada no Better Auth."),
            },
        },
    },
    "/api/auth/request-password-reset": {
        post: {
            tags: ["Autenticação"],
            summary: "Solicitar redefinição de senha nativa",
            description: `Solicita a criação de um token temporário. Quando retorna HTTP 200, a resposta é genérica, não revela se o e-mail existe e não retorna o token. A entrega depende da disponibilidade/configuração do serviço de e-mail; HTTP 200 não comprova entrega. O link enviado atualmente usa FRONTEND_URL e aponta para /redefinir-senha.

Envie Origin da aplicação cadastrada em trustedOrigins nas chamadas POST nativas em produção. Erros nativos usam {code,message} diretamente, sem o envelope legado {data,message,errors}.`,
            security: [],
            parameters: [nativeOriginParameter()],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/NativeAuthRequestPasswordResetRequest" },
                        example: { email: "ana.exemplo@example.invalid", redirectTo: "https://frontend.example.invalid/redefinir-senha" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Resposta genérica, sem revelar se o e-mail está cadastrado e sem incluir o token.",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthRequestPasswordResetResponse" } } },
                },
                400: nativeAuthErrorResponse("E-mail ou corpo inválido."),
                403: nativeAuthErrorResponse("Origin ausente/não confiável ou redirectTo não confiável."),
                429: nativeAuthRateLimitResponse("Limite de solicitações excedido."),
                500: nativeAuthErrorResponse("Falha inesperada no fluxo de recuperação ou no envio configurado."),
            },
        },
    },
    "/api/auth/reset-password": {
        post: {
            tags: ["Autenticação"],
            summary: "Redefinir senha pelo fluxo nativo",
            description: `Consome o token temporário e substitui a senha. O body aceita somente newPassword e token opcional; um token deve ser enviado no body ou na query. A senha deve ter 8–128 caracteres e incluir maiúscula, minúscula, número e caractere especial permitido. O token é de uso único; a configuração revoga todas as sessões anteriores do usuário.

Envie Origin da aplicação cadastrada em trustedOrigins nas chamadas POST nativas em produção. Erros nativos usam {code,message} diretamente, sem o envelope legado {data,message,errors}.`,
            security: [],
            parameters: [
                nativeOriginParameter(),
                { name: "token", in: "query", required: false, description: "Token de uso único; pode ser enviado aqui ou no body.", schema: { type: "string" } },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/NativeAuthResetPasswordRequest" },
                        example: { newPassword: "NovaSenha@123", token: "<token-temporario-de-recuperacao>" },
                    },
                },
            },
            responses: {
                200: {
                    description: "Senha alterada e sessões persistidas anteriores revogadas.",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NativeAuthResetPasswordResponse" } } },
                },
                400: nativeAuthErrorResponse("Token inválido/ausente ou senha fora da política."),
                403: nativeAuthErrorResponse("Origin ausente/não confiável."),
                429: nativeAuthRateLimitResponse("Limite de redefinições excedido."),
                500: nativeAuthErrorResponse("Falha inesperada no Better Auth."),
            },
        },
    },
};

export default authPaths;
