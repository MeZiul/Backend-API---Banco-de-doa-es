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

## Autenticação

A plataforma oferece dois métodos de autenticação:

- Cadastro e login tradicionais, utilizando e-mail e senha.
- Cadastro e login social, utilizando uma conta Google via OAuth 2.0.

As sessões utilizam tokens opacos e revogáveis, não JWT.

## Cadastro tradicional

O cadastro tradicional exige nome, e-mail, senha, CPF válido, cidade e UF.

Após a criação da conta, o usuário possui cadastro_completo=true.

## Cadastro com Google

A autenticação pelo Google é realizada pelos endpoints nativos do Better Auth.

O fluxo de cadastro social ocorre nas seguintes etapas:

1. Autenticação utilizando uma conta Google.
2. Criação inicial do usuário com cadastro_completo=false.
3. Redirecionamento para o formulário de cadastro complementar.
4. Envio de CPF, telefone, cidade, UF e aceite dos termos.
5. Conclusão pela rota PATCH /perfil/completar-cadastro.
6. Atualização do cadastro_completo para true.

A conclusão atualiza o usuário existente, sem criar uma nova conta.

## Controle de acesso

Usuários com cadastro incompleto podem consultar o próprio perfil,
completar o cadastro, encerrar a sessão e acessar conteúdos públicos.

Operações protegidas exigem autenticação válida, conta ativa e
cadastro completo.

Tentativas de acessar funcionalidades restritas com cadastro incompleto
retornam HTTP 403, com o tipo de erro registrationIncomplete.

O estado cadastral é independente da situação da conta:
ATIVO, SUSPENSO ou INATIVO.

## Segurança

O backend determina a identidade do usuário pela sessão autenticada.

Os campos cadastro_completo, termos_aceitos_em e versao_termos
são controlados exclusivamente pelo servidor.

O perfil ADMINISTRADOR não substitui as verificações de autoria
e propriedade das rotas comuns.

## Fluxo de doações

Criar item → manifestar interesse → doador aceitar → RESERVADO →
doador confirmar entrega → AGUARDANDO_CONFIRMACAO →
interessado confirmar recebimento → DOADO.

A conclusão incrementa total_doacoes uma vez na mesma transação.

Cancelamento e disputa de estado obedecem às regras de cada rota.

Avaliações e métricas de reputação são atualizadas atomicamente.

## Compatibilidade

Os IDs novos são UUID; _id permanece no contrato HTTP por compatibilidade.

ObjectId legado é aceito por alguns validators, mas não implica
persistência MongoDB.

As rotas /usuario e /auth/* permanecem disponíveis para compatibilidade
com integrações existentes.

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
          "Cadastro e login tradicionais, autenticação social com Google, gerenciamento de sessões e recuperação de senha.",
      },
      {
        name: "Administração",
        description:
          "Consulta e atualização do próprio perfil, conclusão do cadastro complementar, desativação de conta e gerenciamento administrativo de acesso.",
      },
      {
        name: "Perfil",
        description: "Rotas perfil tem atualizações.",
      },
      {
        name: "Usuários",
        description:
          "Cadastro tradicional, listagem, atualização, exclusão e moderação de usuários.",
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
            "Token opaco e revogável retornado por POST /api/auth/sign-in/email (body token ou header set-auth-token) ou POST /auth/login. Não é JWT. Informe o valor sem prefixo no campo HTTP Bearer do Scalar; o cliente acrescenta Bearer.",
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
