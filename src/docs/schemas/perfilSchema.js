const perfilSchemas = {
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