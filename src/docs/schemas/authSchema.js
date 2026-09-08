const authSchemas = {
    AuthUsuarioResumo: {
        type: "object",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
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
};

export default authSchemas;
