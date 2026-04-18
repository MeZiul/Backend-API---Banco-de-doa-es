# Backend API - Banco de Doações

API backend do projeto DoaÍ, desenvolvida em Node.js, Express e MongoDB, com organização em camadas para controllers, services, repositories, models e middlewares.

O repositório também mantém a documentação funcional da API em:
- [Documentação_da_api_Banco_de_Doação.md](./Documentação_da_api_Banco_de_Doação.md)
- [Especificacao_API_REST_DoaI.html](./Especificacao_API_REST_DoaI.html)

## Objetivo

Centralizar as regras de negócio do sistema de doações, cobrindo autenticação, usuários, perfil, itens, interesses, avaliações, denúncias, administração e upload de imagens.

## Stack

- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT para autenticação
- Bcrypt para hash de senha
- Nodemailer para envio de e-mails
- Swagger (`swagger-jsdoc` e `swagger-ui-express`) como dependência do projeto
- Winston para logging
- Zod para validação

## Estrutura do projeto

```text
.
├── server.js
├── src/
│   ├── app.js
│   ├── config/
│   ├── containers/
│   ├── controllers/
│   ├── docs/
│   ├── infra/
│   ├── middlewares/
│   ├── models/
│   ├── repositories/
│   │   ├── base/
│   │   └── filters/
│   ├── routes/
│   ├── seeds/
│   ├── services/
│   ├── tests/
│   └── utils/
├── .env EXAMPLE
├── Documentação_da_api_Banco_de_Doação.md
└── Especificacao_API_REST_DoaI.html
```

## Arquitetura

O projeto segue uma organização em camadas:

- `routes`: define os endpoints HTTP e conecta controllers.
- `controllers`: recebe `req` e `res`, delega para services e padroniza a resposta.
- `services`: concentra regras de negócio.
- `repositories`: encapsula acesso ao MongoDB via Mongoose.
- `models`: define os schemas e models.
- `middlewares`: autenticação, autorização, logging e tratamento transversal.
- `utils` e `infra`: helpers, logger, serviços auxiliares e integrações.
- `containers`: composição manual de dependências entre repository e service.

## Estado atual do repositório

Este ponto é importante para quem for clonar ou continuar o desenvolvimento:

- A estrutura de domínio está em construção.
- Parte da modelagem, repositories, filters e alguns controllers/services já existem.
- Nem todas as rotas documentadas estão registradas em `src/routes/index.js`.
- Hoje o registro de rotas ativo no código está reduzido e usa `exampleRoutes.js` como referência de estrutura.
- Existem arquivos de service, docs e testes ainda vazios ou parciais.
- O README documenta o objetivo e a arquitetura do projeto, não garante que 100% das rotas da documentação já estejam operacionais no runtime atual.

## Pré-requisitos

- Node.js 20+ recomendado
- npm
- MongoDB acessível por URI

## Configuração de ambiente

1. Crie o arquivo `.env` a partir de `.env EXAMPLE`.
2. Ajuste as variáveis obrigatórias para o seu ambiente.

Exemplo:

```bash
cp ".env EXAMPLE" .env
```

Variáveis mais importantes para subir a aplicação:

- `APP_PORT`
- `DB_URL`
- `USE_IN_MEMORY_DB`
- `NODE_ENV`
- `JWT_SECRET_ACCESS_TOKEN`
- `JWT_ACCESS_TOKEN_EXPIRATION`
- `JWT_SECRET_REFRESH_TOKEN`
- `JWT_REFRESH_TOKEN_EXPIRATION`
- `JWT_SECRET_PASSWORD_RECOVERY`
- `JWT_PASSWORD_RECOVERY_EXPIRATION`
- `SALT_LENGTH`
- `LOG_LEVEL`
- `LOG_ENABLED`
- `DEBUGLOG`

Variáveis adicionais já previstas no projeto:

- Firebase App Check
- SMTP e envio de e-mail
- chaves para serviço externo de mail
- URLs base de frontend e backend
- credenciais administrativas usadas em seed/configuração local

## Instalação

```bash
npm install
```

## Execução

Ambiente de desenvolvimento:

```bash
npm run dev
```

Execução normal:

```bash
npm start
```

Scripts disponíveis em `package.json`:

- `npm run dev`: sobe com `nodemon`
- `npm start`: sobe com `node server.js`
- `npm test`: atualmente não possui suíte configurada; o script falha por padrão

## Inicialização da aplicação

O fluxo atual de boot é:

1. `server.js` carrega variáveis de ambiente e inicializa o `app`.
2. `src/app.js` abre a conexão com o banco via `DbConnect.conectar()`.
3. Middlewares globais são registrados.
4. As rotas são montadas por `src/routes/index.js`.
5. Há tratamento centralizado para `404` e para erros não tratados.

## Banco de dados

A conexão com MongoDB é feita em `src/config/DbConnect.js` com Mongoose.

Características atuais da conexão:

- suporte a `MongoMemoryServer` quando `USE_IN_MEMORY_DB=true`
- `strictQuery` condicionado ao ambiente
- `autoIndex` habilitado
- logging de eventos de conexão
- timeout configurado para seleção de servidor, socket e conexão

## Rotas e documentação

A especificação funcional completa da API está nos arquivos:

- `Documentação_da_api_Banco_de_Doação.md`
- `Especificacao_API_REST_DoaI.html`

Domínios documentados:

- usuários
- autenticação
- perfil
- categorias
- itens de doação
- interesses
- avaliações
- denúncias
- administração
- upload de imagens

Estado do código de rotas:

- `src/routes/index.js` ainda não registra todos esses domínios
- a rota de exemplo está ativa e serve como base estrutural
- a integração completa entre documentação e runtime ainda depende da evolução das branches de implementação

## Respostas e tratamento de erro

O projeto usa um formato padronizado de resposta com `CommonResponse`, incluindo:

- `message`
- `data`
- `errors`

O middleware `errorHandler` centraliza o tratamento das exceções da aplicação.

## Logging

O projeto usa logger próprio com suporte a configuração por variáveis de ambiente.

Parâmetros já previstos:

- `LOG_LEVEL`
- `LOG_MAX_SIZE_GB`
- `LOG_ENABLED`
- `DEBUGLOG`

Quando `DEBUGLOG` está habilitado, o middleware de logging de rotas é registrado em `src/routes/index.js`.

## Segurança

Recursos já previstos no código e na configuração:

- hash de senha com bcrypt
- autenticação por JWT
- App Check com Firebase
- controle de sessão com refresh token
- cabeçalho `X-Robots-Tag` para bloquear indexação
- endpoint `/robots.txt` bloqueando rastreamento

## Seeds, testes e documentação interna

Estado atual dos diretórios auxiliares:

- `src/seeds/seedDoai.js` existe, mas está vazio neste momento
- `src/tests/test.js` existe, mas está vazio neste momento
- `src/docs/index.js` existe, mas está vazio neste momento

Isso significa que a base estrutural para seed, testes e documentação interna já foi criada, mas ainda exige implementação para uso efetivo.

## Fluxo de desenvolvimento recomendado

1. Criar ou ajustar o `.env`.
2. Instalar dependências com `npm install`.
3. Garantir acesso ao MongoDB configurado em `DB_URL`.
4. Subir a API com `npm run dev`.
5. Implementar o domínio por camada:
   `model -> repository -> filter -> service -> controller -> route`
6. Validar manualmente os endpoints conforme a documentação `.md` e `.html`.

## Convenções adotadas no projeto

- módulos ES (`"type": "module"`)
- separação por responsabilidade em camadas
- repositories com paginação via `mongoose-paginate-v2`
- filters dedicados para composição de consultas
- containers para composição explícita de dependências
- documentação funcional separada da implementação

## Limitações atuais

- o `README` anterior era apenas o template padrão do GitLab; este arquivo substitui isso
- o script de teste ainda não representa uma suíte automatizada real
- nem todos os domínios documentados já estão expostos em rotas ativas
- há arquivos parciais ou vazios em alguns módulos
- o `.env EXAMPLE` contém valores de exemplo e deve ser revisado antes de qualquer uso real

## Referência rápida

Subir localmente:

```bash
npm install
cp ".env EXAMPLE" .env
npm run dev
```

Entrada principal:

- [server.js](./server.js)

Bootstrap da aplicação:

- [src/app.js](./src/app.js)

Registro de rotas:

- [src/routes/index.js](./src/routes/index.js)

Conexão com banco:

- [src/config/DbConnect.js](./src/config/DbConnect.js)

Documentação funcional:

- [Documentação_da_api_Banco_de_Doação.md](./Documentação_da_api_Banco_de_Doação.md)
- [Especificacao_API_REST_DoaI.html](./Especificacao_API_REST_DoaI.html)
