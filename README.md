# Backend API - Banco de Doacoes

API backend do projeto DoaI, desenvolvida em Node.js, Express e MongoDB. O projeto segue organizacao em camadas com `routes`, `controllers`, `services`, `repositories`, `models`, `middlewares`, `validators`, `docs` e `tests`.

## Documentacao

Contrato funcional base da API:

- [Documentacao da API Banco de Doacao](./documentacao/Documenta%C3%A7%C3%A3o_da_api_Banco_de_Doa%C3%A7%C3%A3o.md)
- [Especificacao API REST DoaI](./documentacao/Especificacao_API_REST_DoaI.html)

Documentacao Markdown das rotas da Milestone 2:

- [Autenticacao](./documentacao/rotas/rotas-autenticacao.md)
- [Administracao](./documentacao/rotas/rotas-administracao.md)
- [Interesse](./documentacao/rotas/rotas-interesse.md)
- [Denuncia](./documentacao/rotas/rotas-denuncia.md)
- [Avaliacao](./documentacao/rotas/rotas-avaliacao.md)
- [Usuario](./documentacao/rotas/rotas-usuario.md)

Planos de teste:

- [Plano geral da Milestone 2](./documentacao/plano-teste-milestone-2.md)
- [Autenticacao](./documentacao/doc-service/Autenticacao.md)
- [UsuarioService](./documentacao/doc-service/Usuario.md)
- [InteresseService](./documentacao/doc-service/Interesse.md)
- [DenunciaService](./documentacao/doc-service/Denuncia.md)
- [AdministracaoService](./documentacao/doc-service/Administracao.md)
- [AvaliacaoService](./documentacao/doc-service/Avaliacao.md)

Swagger em runtime:

- `GET /docs`
- `GET /docs.json`

No estado atual, o Swagger cobre `autenticacao`, `administracao`, `interesse`, `denuncia` e `avaliacao`. `usuario` e `categoria` ainda precisam de alinhamento documental completo no Swagger.

## Objetivo

Centralizar as regras de negocio do sistema de banco de doacoes, cobrindo autenticacao, usuarios, categorias, itens de doacao, interesses, denuncias, administracao, avaliacoes e upload de imagens.

## Stack

- Node.js 20+
- Express 5
- MongoDB
- Mongoose
- JWT
- Bcrypt/BcryptJS
- Zod
- Jest
- Supertest
- `mongodb-memory-server`
- Swagger
- Winston

## Estrutura

```text
.
|-- server.js
|-- src/
|   |-- app.js
|   |-- config/
|   |-- containers/
|   |-- controllers/
|   |-- docs/
|   |-- infra/
|   |-- middlewares/
|   |-- models/
|   |-- repositories/
|   |   |-- base/
|   |   `-- filters/
|   |-- routes/
|   |-- seeds/
|   |-- services/
|   |-- tests/
|   `-- utils/
|-- documentacao/
|   |-- doc-service/
|   `-- rotas/
|-- .env EXAMPLE
`-- package.json
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

- autenticacao;
- usuario;
- categorias;
- avaliacoes;
- itens de doacao;
- interesses;
- denuncias;
- administracao;
- exemplo estrutural.

Foco demonstravel da Milestone 2:

- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`, `POST /auth/esqueci-senha`, `PUT /auth/redefinir-senha`;
- `POST /interesses`, `GET /interesses`, `GET /interesses/:id`, `PUT /interesses/:id/aceitar`, `PUT /interesses/:id/recusar`, `DELETE /interesses/:id`;
- `POST /denuncias`, `GET /denuncias`, `GET /denuncias/:id`, `PUT /denuncias/:id`, `DELETE /denuncias/:id`;
- `GET /admin/usuarios`, `GET /admin/usuarios/:id`, `PUT /admin/usuarios/:id/bloquear`, `PUT /admin/usuarios/:id/desbloquear`, `DELETE /admin/usuarios/:id`;
- `GET /admin/itens`, `DELETE /admin/itens/:id`;
- `GET /admin/denuncias`, `PUT /admin/denuncias/:id/resolver`;
- `GET /admin/administracoes` e consultas auxiliares de auditoria administrativa;
- `POST /avaliacoes`, `GET /avaliacoes`, `GET /avaliacoes/:id`, `PUT /avaliacoes/:id`, `DELETE /avaliacoes/:id`.

Pontos pendentes conhecidos:

- `usuario` possui implementacao e testes, mas ainda usa `/usuario` no singular enquanto o contrato base define `/usuarios` no plural.
- `usuario` ainda precisa de Swagger alinhado e ajustes finais de contrato.
- `categoria` esta registrada, mas ainda nao tem o mesmo nivel de testes, Swagger e documentacao de milestone dos modulos principais.

## Pre-requisitos

- Node.js 20+
- npm
- MongoDB acessivel por URI para execucao manual com banco real

Para testes automatizados, nao e necessario seed nem MongoDB local, porque os scripts usam `USE_IN_MEMORY_DB=true`.

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

Para rodar a API sem MongoDB local persistente:

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

Fallback no PowerShell:

```powershell
npm.cmd run dev
```

Execucao normal:

```powershell
npm start
```

URLs locais padrao:

- `http://localhost:7340`
- `http://localhost:7340/docs`
- `http://localhost:7340/docs.json`

## Seed

O seed local esta disponivel em:

```powershell
npm run seed
```

Fallback no PowerShell:

```powershell
npm.cmd run seed
```

O seed e recomendado para demonstracao manual no Postman/Swagger, pois cria massa local de usuarios, itens e estados de dominio. Para executar o seed com `DB_URL` local, o MongoDB precisa estar ativo.

## Testes

Os scripts de teste ja configuram `NODE_ENV=test` e `USE_IN_MEMORY_DB=true`.

Executar suite:

```powershell
npm test
```

Fallback recomendado no PowerShell:

```powershell
npm.cmd test -- --runInBand
```

Executar cobertura:

```powershell
npm run test:coverage
```

Fallback de cobertura:

```powershell
npm.cmd run test:coverage -- --runInBand
```

Ultima validacao registrada:

- `11` suites aprovadas;
- `67` testes aprovados;
- cobertura global: `62.95%` statements, `48.09%` branches, `67.66%` functions e `62.66%` lines.

Os `warn` exibidos durante os testes sao esperados em cenarios negativos, como validacao invalida, permissao negada, senha incorreta e estado de negocio invalido.

## Validacao Manual das Rotas

As rotas protegidas exigem:

```http
Authorization: Bearer <token>
```

Para rotas administrativas, o token precisa representar usuario com `perfil: ADMINISTRADOR`.

Fluxo minimo recomendado para Postman:

1. Rodar o seed, se for usar banco local com dados prontos.
2. Iniciar a API com `npm run dev`.
3. Fazer login com usuario comum.
4. Fazer login com usuario administrador.
5. Testar criacao/listagem de interesse com usuario comum.
6. Testar criacao/listagem de denuncia com usuario comum.
7. Resolver denuncia e moderar usuario/item com administrador.
8. Conferir Swagger e documentacao Markdown.

## Scripts

- `npm run dev`: sobe a API com `nodemon`.
- `npm start`: sobe a API com `node server.js`.
- `npm run seed`: executa a massa local de demonstracao.
- `npm test`: executa Jest com banco em memoria.
- `npm run test:coverage`: executa Jest com relatorio de cobertura.

## Observacoes

- A documentacao-base em [Documentacao da API Banco de Doacao](./documentacao/Documenta%C3%A7%C3%A3o_da_api_Banco_de_Doa%C3%A7%C3%A3o.md) e [Especificacao API REST DoaI](./documentacao/Especificacao_API_REST_DoaI.html) deve ser tratada como contrato da API.
- As documentacoes Markdown por rota explicam o recorte implementado para a Milestone 2.
- O plano geral de teste fica em `documentacao/plano-teste-milestone-2.md`.
- Os planos unitarios por service ficam em `documentacao/doc-service/`.
- O Swagger atual e gerado em memoria no boot da aplicacao e pode ser acessado em `/docs`.
