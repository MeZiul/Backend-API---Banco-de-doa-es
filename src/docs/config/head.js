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
  const devUrl = process.env.SWAGGER_DEV_URL?.trim();
  const prodUrl = process.env.SWAGGER_PROD_URL?.trim();
  const configuredServers =
    process.env.NODE_ENV === "production"
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
      description: `É necessário autenticar com token de sessão Better Auth antes de utilizar a maioria das rotas.

## Credenciais de Teste (Seed)

| Perfil | E-mail | Senha |
|----|----|----|
| ADMINISTRADOR | admin@doai.com | Admin@123 |
| USUARIO | carlos@email.com | Senha@123 |

## Fluxo de Teste

1. **Login** → obter token opaco de sessão
2. **Criar item** (usuário doador)
3. **Manifestar interesse** no item (usuário interessado)
4. **Aceitar interesse** (doador) → item fica RESERVADO
5. **Confirmar entrega** (doador) → AGUARDANDO_CONFIRMACAO
6. **Confirmar recebimento** (interessado) → item DOADO

## Perfis

- **ADMINISTRADOR** — acesso total: modera usuários, itens, denúncias e categorias
- **USUARIO** — cadastra itens, manifesta interesse, avalia e denuncia

## Status do Item

DISPONIVEL → RESERVADO → AGUARDANDO_CONFIRMACAO → DOADO`,
      contact: {
        name: "Equipe Banco de Doações",
        url: "https://api.doai.fs.fslab.dev/docs#/", 
      },
    },
    servers: getServersInCorrectOrder(),
    tags: [
      {
        name: "Autenticação",
        description:
          "Rotas para login, recuperação de senha, logout e renovação de token.",
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
            "Token opaco e revogável retornado por POST /auth/login. Informe apenas o token, sem adicionar Bearer manualmente no Swagger.",
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
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"],
});

export default getSwaggerOptions;
