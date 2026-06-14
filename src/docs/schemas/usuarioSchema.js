const paginatedSchema = (schemaRef) => ({
    type: "object",
    properties: {
        docs: {
            type: "array",
            items: { $ref: schemaRef },
        },
        totalDocs: { type: "integer", example: 1 },
        limit: { type: "integer", example: 15 },
        totalPages: { type: "integer", example: 1 },
        page: { type: "integer", example: 1 },
        pagingCounter: { type: "integer", example: 1 },
        hasPrevPage: { type: "boolean", example: false },
        hasNextPage: { type: "boolean", example: false },
        prevPage: { type: "integer", nullable: true, example: null },
        nextPage: { type: "integer", nullable: true, example: null },
    },
});

const usuariosSchemas = {
    UsuarioResumo: {
        type: "object",
        description: "Versão limitada retornada para usuários comuns (sem email, cpf, telefone).",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "Carlos Silva" },
            foto_perfil: { type: "string", nullable: true, example: null },
            bio: { type: "string", nullable: true, example: "Gosto de ajudar quem precisa." },
            cidade: { type: "string", example: "Porto Velho" },
            uf: { type: "string", example: "RO" },
            situacao: {
                type: "string",
                enum: ["ATIVO", "SUSPENSO", "INATIVO"],
                example: "ATIVO",
            },
            media_avaliacoes: { type: "number", example: 4.8 },
            total_avaliacoes: { type: "integer", example: 5 },
            total_doacoes: { type: "integer", example: 3 },
            data_cadastro: { type: "string", format: "date-time" },
        },
    },
    UsuarioCompleto: {
        type: "object",
        description: "Versão completa retornada para administradores ou para o próprio usuário.",
        properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            nome: { type: "string", example: "Carlos Silva" },
            email: { type: "string", format: "email", example: "carlos@email.com" },
            cpf: { type: "string", example: "111.111.111-11" },
            cidade: { type: "string", example: "Porto Velho" },
            uf: { type: "string", example: "RO" },
            telefone: { type: "string", nullable: true, example: "(69) 99999-1111" },
            foto_perfil: { type: "string", nullable: true, example: null },
            bio: { type: "string", nullable: true, example: "Gosto de ajudar quem precisa." },
            perfil: {
                type: "string",
                enum: ["USUARIO", "ADMINISTRADOR"],
                example: "USUARIO",
            },
            situacao: {
                type: "string",
                enum: ["ATIVO", "SUSPENSO", "INATIVO"],
                example: "ATIVO",
            },
            motivo_suspensao: { type: "string", nullable: true, example: null },
            suspensao_ate: { type: "string", format: "date-time", nullable: true, example: null },
            media_avaliacoes: { type: "number", example: 4.8 },
            total_avaliacoes: { type: "integer", example: 5 },
            total_doacoes: { type: "integer", example: 3 },
            data_cadastro: { type: "string", format: "date-time" },
            data_atualizacao: { type: "string", format: "date-time" },
        },
    },
    UsuarioPost: {
        type: "object",
        required: ["nome", "email", "cpf", "senha", "cidade", "uf"],
        properties: {
            nome: { type: "string", minLength: 3, example: "Carlos Silva" },
            email: { type: "string", format: "email", example: "carlos@email.com" },
            cpf: { type: "string", minLength: 11, example: "111.111.111-11" },
            senha: {
                type: "string",
                minLength: 8,
                description: "Mínimo 8 caracteres, com 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.",
                example: "Senha@123",
            },
            cidade: { type: "string", minLength: 2, example: "Porto Velho" },
            uf: { type: "string", minLength: 2, maxLength: 2, example: "RO" },
            telefone: { type: "string", nullable: true, example: "(69) 99999-1111" },
            bio: { type: "string", maxLength: 500, nullable: true, example: "Gosto de ajudar quem precisa." },
        },
    },
    UsuarioPutPatch: {
        type: "object",
        description: "Atualização de dados. CPF, perfil e situação não podem ser alterados por esta rota.",
        properties: {
            nome: { type: "string", minLength: 3, example: "Carlos Silva Junior" },
            email: { type: "string", format: "email", example: "carlos.novo@email.com" },
            senha: {
                type: "string",
                minLength: 8,
                description: "Mínimo 8 caracteres, com 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.",
                example: "NovaSenha@123",
            },
            cidade: { type: "string", example: "Manaus" },
            uf: { type: "string", maxLength: 2, example: "AM" },
            telefone: { type: "string", nullable: true, example: "(92) 98888-2222" },
            bio: { type: "string", maxLength: 500, nullable: true, example: "Atualizando minha bio." },
            foto_perfil: { type: "string", nullable: true, example: "/uploads/perfil/foto.png" },
        },
    },
    UsuarioExcluir: {
        type: "object",
        required: ["senha"],
        properties: {
            senha: {
                type: "string",
                description: "Senha do próprio usuário, exigida para confirmar a exclusão da conta.",
                example: "Senha@123",
            },
        },
    },
    UsuarioSuspender: {
        type: "object",
        required: ["motivo", "suspensao_ate"],
        properties: {
            motivo: { type: "string", minLength: 3, example: "Violação das regras da plataforma." },
            suspensao_ate: { type: "string", format: "date", example: "2026-12-31" },
        },
    },
    UsuarioPaginado: paginatedSchema("#/components/schemas/UsuarioResumo"),
};

export default usuariosSchemas;