# Migração de autenticação para Better Auth

## Decisão

A API substituiu a autenticação JWT própria por Better Auth 1.7 com Prisma/PostgreSQL. O contrato HTTP legado foi preservado para não exigir alteração imediata no frontend e nas coleções Postman.

Referências oficiais:

- [Integração Express](https://www.better-auth.com/docs/integrations/express)
- [Adapter Prisma](https://www.better-auth.com/docs/adapters/prisma)
- [Bearer plugin](https://www.better-auth.com/docs/plugins/bearer)

## Arquitetura

```text
POST /auth/login
  -> AutenticacaoController
    -> AutenticacaoService
      -> Better Auth
        -> Prisma adapter
          -> Usuario + Account + Session

Authorization: Bearer <session-token>
  -> AuthMiddleware
    -> auth.api.getSession()
      -> UsuarioRepository (perfil e situação atuais)
        -> req.auth + req.user
```

Tabelas:

| Tabela | Uso |
|---|---|
| `Usuario` | dados de domínio, perfil, situação e métricas |
| `Account` | identidade do provedor e hash bcrypt |
| `Session` | token opaco, expiração, IP e user-agent |
| `Verification` | recuperação de senha e verificações temporárias |

## Compatibilidade pública

Continuam disponíveis:

- `POST /usuario`;
- `POST /auth/login`;
- `POST /api/auth/sign-in/email` (login nativo Better Auth);
- `POST /auth/logout`;
- `POST /auth/refresh-token`;
- `POST /auth/esqueci-senha`;
- `PUT /auth/redefinir-senha`.

O formato `Authorization: Bearer <token>` permanece, mas o valor agora é uma sessão opaca e revogável. Não existe mais payload JWT nem refresh token separado.

## Proteção das regras de domínio

O handler oficial está montado em `/api/auth/*splat` antes de `express.json()`, como exige a integração com Express 5. O login nativo `/api/auth/sign-in/email` está habilitado e aceita `{ email, password, rememberMe }`, retornando o objeto nativo `{ token, user }` (sem o envelope `data` das rotas legadas). Ele compartilha o limite de tentativas com `/auth/login` e mantém a validação de origem do Better Auth. Nas chamadas nativas de autenticação em produção, inclusive server-side ou Postman, envie `Origin` com uma origem confiável; a origem da URL pública da API está incluída em `trustedOrigins`. As Server Actions do frontend derivam esse header de `NEXT_PUBLIC_API_URL`. As rotas legadas da coleção Postman continuam compatíveis.

O hook `databaseHooks.session.create.before` consulta a situação atual do usuário e rejeita contas suspensas, inativas ou indisponíveis antes de gravar uma sessão. O frontend chama cadastro, login, sessão, logout e recuperação pelo SDK dentro de Server Actions, mantendo seu cookie HttpOnly e as consultas SSR autenticadas por bearer. As telas existentes e as regras do cadastro com CPF permanecem preservadas.

Os fluxos nativos de cadastro e recuperação usam `/api/auth/sign-up/email`, `/api/auth/request-password-reset` e `/api/auth/reset-password`. O hook de entrada valida CPF, nome, e-mail, UF e senha, normaliza os campos e rejeita propriedades que tentem definir perfil, situação ou contadores. A redefinição segue a mesma política de senha e revoga as sessões anteriores. Cadastro não cria sessão automática; limite de tentativas e validação de origem também se aplicam a esses fluxos.

Os outros caminhos nativos que poderiam contornar as regras do DoaI continuam desabilitados em `src/config/betterAuth.js`:

- alteração direta de senha fora do fluxo validado de redefinição;
- alteração de e-mail/usuário;
- exclusão de usuário.

As chamadas server-side `auth.api.*` continuam disponíveis ao `AutenticacaoService`. O login nativo também usa o hook de situação, enquanto as operações de domínio preservam CPF, Zod e autorização.

## Migração dos dados

A migration `20260825182000_migrate_auth_to_better_auth` executa nesta ordem:

1. adiciona `Usuario.email_verificado`;
2. cria `Session`, `Account` e `Verification`;
3. copia cada `Usuario.senha` existente para uma `Account` do provedor `credential`;
4. cria índices, relações e cascatas;
5. remove de `Usuario` a senha e os campos antigos de recuperação.

O hash bcrypt não é recalculado. Isso permite que a senha atual continue válida depois do deploy. A migration não transporta dados de MongoDB; ela atualiza somente usuários já presentes no PostgreSQL.

## Variáveis de ambiente

```dotenv
BETTER_AUTH_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
BETTER_AUTH_URL=http://localhost:7340
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:7340
```

Em produção, `BETTER_AUTH_URL` deve ser a origem HTTPS pública da API e `BETTER_AUTH_TRUSTED_ORIGINS` deve listar somente origens conhecidas. Não reutilize exemplos nem versione o segredo real.

## Procedimento de deploy

1. Faça backup do PostgreSQL do ambiente.
2. Configure as três variáveis Better Auth antes de iniciar a nova imagem.
3. Confirme que a imagem contém o schema e as duas migrations.
4. Execute `npm run db:migrate:deploy` uma única vez pelo processo de deploy.
5. Inicie a API e acompanhe `docker compose logs -f api`.
6. Teste login de usuário já existente.
7. Teste bearer em rota protegida, refresh e logout.
8. Verifique que conta suspensa/inativa não consegue operar.

Não faça rollback apenas do código depois de aplicar a migration: a versão antiga espera colunas que já terão sido removidas. Um rollback completo exige restaurar o backup do banco ou uma migration reversa revisada.

## Validação local

```bash
docker compose up -d postgres-test
npm run test:db
npm run test:auth:migration
npm run test:auth
npm run test:auth:http
npm test -- --runInBand
npm run test:coverage -- --runInBand
```

O teste de migration usa uma transação com rollback. Os smokes do Better Auth criam e removem somente seus próprios usuários temporários no banco definido por `TEST_DATABASE_URL`.

Evidência da validação integrada em 25/08/2026:

- `34` suites e `369/369` testes Jest aprovados;
- cobertura global de `76,58%` statements e `78,67%` linhas;
- `AutenticacaoService` com `97,26%` statements e `97,18%` linhas;
- migração de credencial legada, repositories Prisma e rollback aprovados no PostgreSQL de testes;
- imagem Docker construída e iniciada com migrations aplicadas;
- `/docs/` e `/docs.json` responderam HTTP `200` no container;
- endpoint nativo de login bloqueado com HTTP `404` (evidência histórica; habilitado pela orientação de 12/10/2026 acima);
- senha incorreta, refresh, revogação no logout e bloqueio de conta suspensa validados por HTTP real.
