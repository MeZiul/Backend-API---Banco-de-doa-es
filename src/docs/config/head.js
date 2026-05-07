import administracaoPaths from "../paths/administracao.js";
import authPaths from "../paths/auth.js";
import avaliacoesPaths from "../paths/avaliacoes.js";
import denunciasPaths from "../paths/denuncias.js";
import interessesPaths from "../paths/interesses.js";
import administracaoSchemas from "../schemas/administracaoSchema.js";
import authSchemas from "../schemas/authSchema.js";
import avaliacoesSchemas from "../schemas/avaliacoesSchema.js";
import denunciasSchemas from "../schemas/denunciasSchema.js";
import interessesSchemas from "../schemas/interessesSchema.js";

const getServersInCorrectOrder = () => {
    const devUrl = { url: process.env.SWAGGER_DEV_URL || "http://localhost:7340" };
    const prodUrl = { url: process.env.SWAGGER_PROD_URL || "http://localhost:7340" };

    if (process.env.NODE_ENV === "production") return [prodUrl, devUrl];
    return [devUrl, prodUrl];
};

const getSwaggerOptions = () => ({
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "API Banco de Doações DoaÍ",
            version: "1.0-alpha",
            description: `Documentação Swagger dos módulos de Autenticação, Administração, Interesses, Denúncias e Avaliações.

As rotas protegidas exigem autenticação via Bearer Token JWT.

Escopo desta documentação:
- Autenticação, recuperação de senha, logout e renovação de token
- Manifestação e gestão de interesses em itens de doação
- Registro e acompanhamento de denúncias
- Ações administrativas de moderação e auditoria dessas operações
- Registro e consulta de avaliações após doações concluídas`,
            contact: {
                name: "Equipe Banco de Doações",
            },
        },
        servers: getServersInCorrectOrder(),
        tags: [
            {
                name: "Autenticação",
                description: "Rotas para login, recuperação de senha, logout e renovação de token.",
            },
            {
                name: "Interesses",
                description: "Rotas para manifestação, acompanhamento e decisão sobre interesses em itens.",
            },
            {
                name: "Denúncias",
                description: "Rotas para criação, consulta, atualização e remoção de denúncias.",
            },
            {
                name: "Administração",
                description: "Rotas administrativas de moderação, bloqueio, inativação, cancelamento e resolução.",
            },
            {
                name: "Avaliações",
                description: "Rotas para registro, consulta, atualização e remoção de avaliações.",
            },
        ],
        paths: {
            ...authPaths,
            ...interessesPaths,
            ...denunciasPaths,
            ...administracaoPaths,
            ...avaliacoesPaths,
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                ...authSchemas,
                ...interessesSchemas,
                ...denunciasSchemas,
                ...administracaoSchemas,
                ...avaliacoesSchemas,
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ["./src/routes/*.js"],
});

export default getSwaggerOptions;
