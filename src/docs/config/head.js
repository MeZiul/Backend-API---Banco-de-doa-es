import administracaoPaths from "../paths/administracao.js";
import denunciasPaths from "../paths/denuncias.js";
import interessesPaths from "../paths/interesses.js";
import administracaoSchemas from "../schemas/administracaoSchema.js";
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
            description: `Documentação Swagger do módulo de Administração, Interesses e Denúncias.

As rotas protegidas exigem autenticação via Bearer Token JWT.

Escopo desta documentação:
- Manifestação e gestão de interesses em itens de doação
- Registro e acompanhamento de denúncias
- Ações administrativas de moderação e auditoria dessas operações`,
            contact: {
                name: "Equipe Banco de Doações",
            },
        },
        servers: getServersInCorrectOrder(),
        tags: [
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
        ],
        paths: {
            ...interessesPaths,
            ...denunciasPaths,
            ...administracaoPaths,
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
                ...interessesSchemas,
                ...denunciasSchemas,
                ...administracaoSchemas,
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ["./src/routes/*.js"],
});

export default getSwaggerOptions;
