# Backend API - Banco de Doacoes

API backend do projeto DoaI, desenvolvida em Node.js, Express e MongoDB, com organizacao em camadas para `routes`, `controllers`, `services`, `repositories`, `models`, `middlewares`, `validators`, `docs` e `tests`.

## Documentacao

Documentacao-base da API, usada como contrato funcional do projeto:

- [documentacao/Documentação_da_api_Banco_de_Doação.md](./documentacao/Documentação_da_api_Banco_de_Doação.md)
- [documentacao/Especificacao_API_REST_DoaI.html](./documentacao/Especificacao_API_REST_DoaI.html)

Documentacao de apoio da Milestone 2:

- [documentacao/rotas-autenticacao.md](./documentacao/rotas-autenticacao.md)
- [documentacao/rotas-administracao.md](./documentacao/rotas-administracao.md)
- [documentacao/rotas-interesse.md](./documentacao/rotas-interesse.md)
- [documentacao/rotas-denuncia.md](./documentacao/rotas-denuncia.md)
- [documentacao/rotas-avaliacao.md](./documentacao/rotas-avaliacao.md)
- [documentacao/plano-teste-milestone-2.md](./documentacao/plano-teste-milestone-2.md)

Documentacao Swagger em runtime:

- `GET /docs`
- `GET /docs.json`

Nesta milestone, o Swagger cobre os modulos de `autenticacao`, `administracao`, `interesse`, `denuncia` e `avaliacao`.

## Objetivo

Centralizar as regras de negocio do sistema de doacoes, cobrindo autenticacao, usuarios, perfil, categorias, itens de doacao, interesses, avaliacoes, denuncias, administracao e upload de imagens.

## Stack

- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT para autenticacao
- Bcrypt para hash de senha
- Zod para validacao
- Jest e Supertest para testes
- `mongodb-memory-server` para testes com banco em memoria
- Swagger (`swagger-jsdoc` e `swagger-ui-express`)
- Winston para logging

## Estrutura

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
├── documentacao/
├── .env EXAMPLE
└── package.json
```

## Arquitetura

O projeto segue organizacao em camadas, alinhada ao padrao usado no material do professor:

- `routes`: define endpoints HTTP e conecta middlewares/controllers.
- `controllers`: valida entrada, extrai usuario autenticado e delega para services.
- `services`: concentra regras de negocio.
- `repositories`: encapsula acesso ao MongoDB via Mongoose.
- `models`: define schemas e models.
- `middlewares`: autenticacao, autorizacao, logging e tratamento transversal.
- `utils/validators`: schemas Zod e validacoes auxiliares.
- `containers`: composicao manual de dependencias.
- `docs`: configuracao, paths e schemas do Swagger.
- `tests`: testes de rotas/controllers e services.

## Estado Atual

Rotas registradas em `src/routes/index.js`:

- autenticacao
- usuarios
- categorias
- avaliacoes
- itens de doacao
- interesses
- denuncias
- administracao
- exemplo estrutural

Para a Milestone 2, o foco de revisao e demonstracao esta em:

- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`, `POST /auth/esqueci-senha`, `PUT /auth/redefinir-senha`
- `POST /interesses`, `GET /interesses`, `GET /interesses/:id`, `PUT /interesses/:id/aceitar`, `PUT /interesses/:id/recusar`, `DELETE /interesses/:id`
- `POST /denuncias`, `GET /denuncias`, `GET /denuncias/:id`, `PUT /denuncias/:id`, `DELETE /denuncias/:id`
- `GET /admin/usuarios`, `GET /admin/usuarios/:id`, `PUT /admin/usuarios/:id/bloquear`, `PUT /admin/usuarios/:id/desbloquear`, `DELETE /admin/usuarios/:id`
- `GET /admin/itens`, `DELETE /admin/itens/:id`
- `GET /admin/denuncias`, `PUT /admin/denuncias/:id/resolver`
- `POST /avaliacoes`, `GET /avaliacoes`, `GET /avaliacoes/:id`, `PUT /avaliacoes/:id`, `DELETE /avaliacoes/:id`
- rotas auxiliares de auditoria administrativa em `/admin/administracoes`

## Pre-requisitos

- Node.js 20+
- npm
- MongoDB acessivel por URI ou `USE_IN_MEMORY_DB=true` para ambiente local/teste

## Configuracao

Crie o `.env` a partir do exemplo:

```powershell
copy ".env EXAMPLE" ".env"
```

No Git Bash/Linux/macOS:

```bash
cp ".env EXAMPLE" .env
```

Variaveis principais:

- `APP_PORT`
- `DB_URL`
- `USE_IN_MEMORY_DB`
- `NODE_ENV`
- `JWT_SECRET_ACCESS_TOKEN`
- `JWT_ACCESS_TOKEN_EXPIRATION`
- `JWT_SECRET_REFRESH_TOKEN`
- `JWT_REFRESH_TOKEN_EXPIRATION`
- `SALT_LENGTH`
- `LOG_LEVEL`
- `LOG_ENABLED`
- `DEBUGLOG`
- `SWAGGER_DEV_URL`
- `SWAGGER_PROD_URL`

Para rodar sem MongoDB local, use:

```env
USE_IN_MEMORY_DB=true
NODE_ENV=development
APP_PORT=7340
```

Para rodar com MongoDB real, use `USE_IN_MEMORY_DB=false` e configure `DB_URL`.

## Instalacao

```powershell
npm install
```

Se o PowerShell bloquear `npm.ps1`, use:

```powershell
npm.cmd install
```

## Execucao

Ambiente de desenvolvimento:

```powershell
npm run dev
```

Alternativa no PowerShell quando `npm.ps1` estiver bloqueado:

```powershell
npm.cmd run dev
```

Execucao normal:

```powershell
npm start
```

URL local padrao:

- `http://localhost:7340`
- `http://localhost:7340/docs`
- `http://localhost:7340/docs.json`

## Testes

Os scripts de teste ja configuram `NODE_ENV=test` e `USE_IN_MEMORY_DB=true`.

Executar a suite:

```powershell
npm test
```

Executar com cobertura:

```powershell
npm run test:coverage
```

No PowerShell, se houver bloqueio de `npm.ps1` ou instabilidade por concorrencia de suites:

```powershell
npm.cmd test -- --runInBand
npm.cmd run test:coverage -- --runInBand
```

## Validacao Manual das Rotas

As rotas protegidas exigem `Authorization: Bearer <token>`.

Para rotas administrativas, o token precisa representar usuario com `perfil: ADMINISTRADOR`.

Fluxo minimo recomendado para Postman:

1. Criar/autenticar usuario comum.
2. Criar/autenticar usuario administrador.
3. Criar ou usar um item disponivel.
4. Testar interesse com usuario comum.
5. Testar denuncia com usuario comum.
6. Resolver denuncia e moderar usuario/item com administrador.
7. Conferir respostas no Swagger e na documentacao Markdown da milestone.

## Scripts

- `npm run dev`: sobe a API com `nodemon`.
- `npm start`: sobe a API com `node server.js`.
- `npm test`: executa Jest com banco em memoria.
- `npm run test:coverage`: executa Jest com relatorio de cobertura.

## Observacoes

- A documentacao-base em `documentacao/Documentação_da_api_Banco_de_Doação.md` e `documentacao/Especificacao_API_REST_DoaI.html` deve ser tratada como contrato da API.
- As documentacoes Markdown por rota explicam o recorte implementado para a Milestone 2.
- O Swagger atual e gerado em memoria no boot da aplicacao e pode ser acessado em `/docs`.
- O seed local existe em `src/seeds/seedDoaI.js`, mas nao ha script dedicado no `package.json` para executa-lo automaticamente.
