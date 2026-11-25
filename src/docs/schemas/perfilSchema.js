const perfilSchemas = {
    PerfilAtualizarRequisicao: {
        type: "object",
        description: "Envie ao menos um campo editável do próprio perfil. Campos de acesso, CPF e senha não são aceitos nesta rota.",
        properties: {
            nome: { type: "string", minLength: 3, example: "Maria Silva" },
            email: { type: "string", format: "email", example: "maria@doai.com" },
            cidade: { type: "string", minLength: 2, example: "Cuiabá" },
            uf: { type: "string", minLength: 2, maxLength: 2, example: "MT" },
            telefone: { type: "string", example: "(65) 99999-9999" },
            foto_perfil: { type: "string", example: "/uploads/perfil/maria.png" },
            bio: { type: "string", maxLength: 500, example: "Doadora de livros e móveis." },
        },
    },
    PerfilCompletarCadastroRequisicao: {
        type: "object",
        description: "Dados necessários para concluir o cadastro do usuário autenticado",
        additionalProperties: false,
        required: [
            "cpf",
            "telefone",
            "cidade",
            "uf",
            "termos"
        ],
        properties: {
            cpf: {
                type: "string",
                description: "CPF válido e não vinculado a outro usuário",
                example: "000.000.000-00"
            },
            telefone: {
                type: "string",
                description: "Telefone com DDD, contendo 10 ou 11 dígitos",
                example: "(69) 99999-9999"
            },
            cidade: {
                type: "string",
                minLength: 2,
                example: "Vilhena"
            },
            uf: {
                type: "string",
                minLength: 2,
                maxLength: 2,
                example: "RO"
            },
            termos: {
                type: "boolean",
                enum: [true],
                description: "Confirmação obrigatória do aceite dos termos de uso",
                example: true
            }
        }
    },
    PerfilGerenciarRequisicao: {
        type: "object",
        description: "É necessário enviar pelo menos um dos campos (perfil ou situacao) para realizar a atualização.",
        properties: {
            perfil: {
                type: "string",
                enum: ["USUARIO", "ADMINISTRADOR"],
                example: "ADMINISTRADOR"
            },
            situacao: {
                type: "string",
                enum: ["ATIVO", "INATIVO", "SUSPENSO"],
                example: "ATIVO"
            }
        }
    }
};

export default perfilSchemas;
