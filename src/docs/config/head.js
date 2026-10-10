import currentContracts from "../schemas/currentContracts.js";
import administracaoPaths from "../paths/administracao.js";
import authPaths from "../paths/auth.js";
import usuariosPaths from "../paths/usuario.js";
import usuariosSchemas from "../schemas/usuarioSchema.js";
import avaliacoesPaths from "../paths/avaliacoes.js";
import denunciasPaths from "../paths/denuncias.js";
import interessesPaths from "../paths/interesses.js";
import administracaoSchemas from "../schemas/administracaoSchema.js";
import authSchemas from "../schemas/authSchema.js";
import avaliacoesSchemas from "../schemas/avaliacoesSchema.js";
import denunciasSchemas from "../schemas/denunciasSchema.js";
import interessesSchemas from "../schemas/interessesSchema.js";
import itemDoacaoPaths from "../paths/itemDoacao.js";
import itemDoacaoSchemas from "../schemas/itemDoacaoSchema.js";
import notificacaoPaths from "../paths/notificacao.js";
import notificacaoSchema from "../schemas/notificacaoSchema.js";
import perfilPaths from "../paths/perfil.js";
import perfilSchemas from "../schemas/perfilSchema.js";
import categoriasPaths from "../paths/categoria.js";
import categoriasSchemas from "../schemas/categoriaSchema.js";

const getServersInCorrectOrder = () => {
  const devUrl = process.env.OPENAPI_DEV_URL?.trim();
  const prodUrl = process.env.OPENAPI_PROD_URL?.trim();
  const configuredServers =
    process.env.NODE_ENV === "production"
      ? [prodUrl, devUrl]
      : [devUrl, prodUrl];

  const seenUrls = new Set();

  const servers = configuredServers
    .filter(Boolean)
    .filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .map((url) => ({ url }));
  return servers.length ? servers : [{ url: "/" }];
};

const getOpenApiOptions = () => ({
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "API Banco de Doações DoaÍ",
      version: "1.0-alpha",
      description: `API de doações com persistência PostgreSQL/Prisma e sessões opacas Better Auth.

Use POST /usuario para cadastro e POST /auth/login para obter o token; envie Authorization: Bearer <token> nas rotas protegidas. O token não é JWT. Logout e troca de senha revogam sessões persistidas. Não há credenciais reais nesta documentação.

Fluxo: criar item → manifestar interesse → doador aceitar → RESERVADO → doador confirmar entrega → AGUARDANDO_CONFIRMACAO → interessado confirmar recebimento → DOADO. A conclusão incrementa total_doacoes uma vez na mesma transação. Cancelamento e disputa de estado obedecem às regras de cada rota.

ADMINISTRADOR modera pelas rotas administrativas. Esse perfil não substitui a autorização de autoria/propriedade das rotas comuns. Avaliações e COUNT/AVG da reputação são atualizados atomicamente.

Os IDs novos são UUID; _id permanece no contrato HTTP por compatibilidade. ObjectId legado é aceito por alguns validators, mas não implica uma persistência MongoDB.

[Baixar OpenAPI](/docs.json) · [Coleções Postman](/docs/postman)`,
      contact: {
        name: "Equipe Banco de Doações",
        url: "https://api.doai.fs.fslab.dev/docs",
      },
    },
    servers: getServersInCorrectOrder(),
    tags: [
      {
        name: "Autenticação",
        description:
          "Rotas para login, recuperação de senha, logout e rotação de sessão opaca.",
      },
      {
        name: "Administração",
        description:
          "Rotas administrativas de moderação, bloqueio, inativação, cancelamento e resolução.",
      },
      {
        name: "Perfil",
        description: "Rotas perfil tem atualizações.",
      },
      {
        name: "Usuários",
        description:
          "Rotas de cadastro, listagem, atualização, exclusão e moderação de usuários.",
      },
      {
        name: "Categorias",
        description:
          "Rotas de listagem e gestão de categorias de itens de doação.",
      },
      {
        name: "Itens de Doação",
        description:
          "Rotas de itens doação, listagem, atualização, exclusão e moderação de itens.",
      },
      {
        name: "Interesses",
        description:
          "Rotas para manifestação, acompanhamento e decisão sobre interesses em itens.",
      },
      {
        name: "Notificações",
        description:
          "Rotas para registro, consulta, atualização de notificações.",
      },
      {
        name: "Avaliações",
        description:
          "Rotas para registro, consulta, atualização e remoção de avaliações.",
      },

      {
        name: "Denúncias",
        description:
          "Rotas para criação, consulta, atualização e remoção de denúncias.",
      },
    ],
    paths: {
      ...authPaths,
      ...usuariosPaths,
      ...categoriasPaths,
      ...itemDoacaoPaths,
      ...interessesPaths,
      ...avaliacoesPaths,
      ...notificacaoPaths,
      ...denunciasPaths,
      ...administracaoPaths,
      ...perfilPaths,
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "BetterAuthSession",
          description:
            "Token opaco e revogável retornado por POST /auth/login. Informe o token no campo HTTP Bearer do Scalar; o cliente acrescenta o prefixo Bearer.",
        },
      },
      schemas: {
        ...authSchemas,
        ...usuariosSchemas,
        ...categoriasSchemas,
        ...interessesSchemas,
        ...denunciasSchemas,
        ...administracaoSchemas,
        ...avaliacoesSchemas,
        ...itemDoacaoSchemas,
        ...notificacaoSchema,
        ...perfilSchemas,
        ...currentContracts,
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [], // Os módulos src/docs/paths são a fonte única do contrato HTTP.
});

export default getOpenApiOptions;
