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
import itemDoacaoSchema from "../schemas/itemDoacaoSchema.js";
import itemDoacaoPaths from "../paths/itemDoacao.js";
import itemDoacaoSchemas from "../schemas/itemDoacaoSchema.js";
import notificacaoPaths from "../paths/notificacao.js";
import notificacaoSchema from "../schemas/notificacaoSchema.js";

const getServersInCorrectOrder = () => {
    const devUrl = process.env.SWAGGER_DEV_URL?.trim();
    const prodUrl = process.env.SWAGGER_PROD_URL?.trim();
    const configuredServers = process.env.NODE_ENV === "production"
        ? [prodUrl, devUrl]
        : [devUrl, prodUrl];

    const seenUrls = new Set();

    return configuredServers
        .filter(Boolean)
        .filter((url) => {
            if (seenUrls.has(url)) return false;
            seenUrls.add(url);
            return true;
        })
        .map((url) => ({ url }));
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
            ...itemDoacaoPaths,
            ...notificacaoPaths
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
                ...itemDoacaoSchemas,
                ...notificacaoSchema,
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ["./src/routes/*.js"],
});

export default getSwaggerOptions;
