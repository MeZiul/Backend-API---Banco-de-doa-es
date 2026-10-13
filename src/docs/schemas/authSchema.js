const authSchemas = {
    AuthUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            nome: { type: "string", example: "Carlos Souza" },
            email: { type: "string", format: "email", example: "carlos@email.com" },
            cpf: { type: "string", example: "12345678901" },
            perfil: { type: "string", enum: ["USUARIO", "ADMINISTRADOR"], example: "USUARIO" },
            situacao: { type: "string", enum: ["ATIVO", "SUSPENSO", "INATIVO"], example: "ATIVO" },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", example: "MT" },
            telefone: { type: "string", nullable: true, example: "(65) 99999-9999" },
            media_avaliacoes: { type: "number", nullable: true, example: 4.7 },
            total_avaliacoes: { type: "integer", nullable: true, example: 12 },
        },
    },
    AuthLoginRequest: {
        type: "object",
        required: ["email", "senha"],
        properties: {
            email: { type: "string", format: "email", example: "carlos@email.com" },
            senha: { type: "string", format: "password", example: "Senha@123" },
        },
    },
    AuthLoginResponse: {
        type: "object",
        properties: {
            token: {
                type: "string",
                example: "qZ8oY3fM8cG2nA1xV6kP4sT9uB7wD5eR",
                description: "Token opaco de sessão Better Auth. Não é JWT.",
            },
            usuario: { $ref: "#/components/schemas/AuthUsuarioResumo" },
        },
    },
    AuthEsqueciSenhaRequest: {
        type: "object",
        required: ["email"],
        properties: {
            email: { type: "string", format: "email", example: "carlos@email.com" },
        },
    },
    AuthRedefinirSenhaRequest: {
        type: "object",
        required: ["token", "novaSenha"],
        properties: {
            token: {
                type: "string",
                example: "6f3d7ac5d0b1e9f2c8a4...",
            },
            novaSenha: {
                type: "string",
                format: "password",
                minLength: 8,
                example: "NovaSenha@123",
                description: "Deve conter letra maiúscula, letra minúscula, número e caractere especial.",
            },
        },
    },
    AuthMensagemResponse: {
        type: "object",
        properties: {
            message: {
                type: "string",
                example: "Se o e-mail estiver cadastrado, voce recebera as instrucoes.",
            },
        },
    },
    AuthRefreshTokenResponse: {
        type: "object",
        properties: {
            token: {
                type: "string",
                example: "nR4fK8sQ2mV7xC5pL9dT3wY6aB1gH0uJ",
                description: "Novo token opaco; o token anterior deixa de ser válido.",
            },
        },
    },
    NativeAuthUser: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
            name: { type: "string", example: "Ana Exemplo" },
            email: { type: "string", format: "email", example: "ana.exemplo@example.invalid" },
            emailVerified: { type: "boolean", example: false },
            image: { type: "string", format: "uri", nullable: true, example: null },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            cpf: { type: "string", example: "52998224725" },
            telefone: { type: "string", example: "(65) 90000-0000" },
            cidade: { type: "string", example: "Cuiabá" },
            uf: { type: "string", enum: ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"], example: "MT" },
            bio: { type: "string", maxLength: 500, example: "Perfil de demonstração." },
        },
    },
    NativeAuthSession: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
            token: { type: "string", description: "Token opaco de sessão; não é JWT." },
            userId: { type: "string", format: "uuid" },
            expiresAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            ipAddress: { type: "string", nullable: true },
            userAgent: { type: "string", nullable: true },
        },
    },
    NativeAuthSignUpEmailRequest: {
        type: "object",
        additionalProperties: false,
        required: ["name", "email", "password", "cpf", "cidade", "uf"],
        properties: {
            name: { type: "string", minLength: 3, example: "Ana Exemplo", description: "Nome após trim; mínimo de 3 caracteres." },
            email: { type: "string", format: "email", example: "ana.exemplo@example.invalid", description: "Normalizado para minúsculas após trim." },
            password: {
                type: "string",
                format: "password",
                minLength: 8,
                maxLength: 128,
                pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$",
                example: "Exemplo@123",
                description: "Exige maiúscula, minúscula, número e um destes caracteres especiais: @$!%*?&.",
            },
            cpf: { type: "string", example: "52998224725", description: "CPF sintético válido de exemplo; aceita pontuação, normaliza para dígitos e rejeita CPF já cadastrado." },
            telefone: { type: "string", example: "(65) 90000-0000" },
            cidade: { type: "string", minLength: 2, example: "Cuiabá" },
            uf: { type: "string", enum: ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"], example: "MT", description: "UF brasileira; o valor é convertido para maiúsculas." },
            bio: { type: "string", maxLength: 500, example: "Perfil de demonstração." },
        },
    },
    NativeAuthSignInEmailRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
            email: { type: "string", format: "email", example: "ana.exemplo@example.invalid" },
            password: { type: "string", format: "password", example: "Exemplo@123" },
            callbackURL: { type: "string", example: "https://frontend.example.invalid/", description: "Opcional; pode ser URL absoluta ou caminho relativo confiável." },
            rememberMe: { type: "boolean", default: true, example: true },
        },
    },
    NativeAuthSignUpEmailResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
            token: { type: "string", nullable: true, example: null, description: "É null porque o cadastro nativo está configurado com autoSignIn=false; nenhum Bearer é criado." },
            user: { $ref: "#/components/schemas/NativeAuthUser" },
        },
    },
    NativeAuthSignInEmailResponse: {
        type: "object",
        required: ["redirect", "token", "user"],
        properties: {
            redirect: { type: "boolean", example: false },
            token: { type: "string", example: "<token-opaco-de-sessao>", description: "Token de sessão para Authorization: Bearer; não é JWT." },
            url: { type: "string", format: "uri", nullable: true, example: null },
            user: { $ref: "#/components/schemas/NativeAuthUser" },
        },
    },
    NativeAuthGetSessionResponse: {
        type: "object",
        nullable: true,
        required: ["session", "user"],
        description: "Com uma sessão atual, retorna session e user; sem sessão, o corpo é null.",
        properties: {
            session: { $ref: "#/components/schemas/NativeAuthSession" },
            user: { $ref: "#/components/schemas/NativeAuthUser" },
        },
    },
    NativeAuthSignOutResponse: {
        type: "object",
        required: ["success"],
        properties: { success: { type: "boolean", enum: [true], example: true } },
    },
    NativeAuthRequestPasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: {
            email: { type: "string", format: "email", example: "ana.exemplo@example.invalid" },
            redirectTo: { type: "string", example: "https://frontend.example.invalid/redefinir-senha", description: "Opcional; pode ser URL absoluta ou caminho relativo confiável. O handler de e-mail atual compõe o link a partir de FRONTEND_URL." },
        },
    },
    NativeAuthRequestPasswordResetResponse: {
        type: "object",
        required: ["status", "message"],
        properties: {
            status: { type: "boolean", enum: [true], example: true },
            message: { type: "string", example: "If this email exists in our system, check your email for the reset link" },
        },
    },
    NativeAuthResetPasswordRequest: {
        type: "object",
        additionalProperties: false,
        required: ["newPassword"],
        properties: {
            newPassword: {
                type: "string",
                format: "password",
                minLength: 8,
                maxLength: 128,
                pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,128}$",
                example: "NovaSenha@123",
                description: "Exige maiúscula, minúscula, número e um destes caracteres especiais: @$!%*?&.",
            },
            token: { type: "string", example: "<token-temporario-de-recuperacao>", description: "Opcional no corpo se enviado como parâmetro de query; um token é obrigatório entre os dois locais." },
        },
    },
    NativeAuthResetPasswordResponse: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "boolean", enum: [true], example: true } },
    },
    NativeAuthErrorResponse: {
        type: "object",
        required: ["code", "message"],
        properties: {
            code: { type: "string", example: "INVALID_ORIGIN" },
            message: { type: "string", example: "Invalid origin." },
            issues: {
                type: "array",
                items: {
                    type: "object",
                    properties: { field: { type: "string" }, message: { type: "string" } },
                    additionalProperties: true,
                },
            },
        },
    },
    NativeAuthRateLimitResponse: {
        type: "object",
        required: ["message"],
        properties: { message: { type: "string", example: "Muitas tentativas. Tente novamente mais tarde." } },
    },
};

export default authSchemas;
