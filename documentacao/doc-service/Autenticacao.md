# Plano de Teste - Autenticação

## 1. Objetivo

Validar o contrato HTTP e as regras do `AutenticacaoService`, responsável pela integração entre as rotas do DoaI e o Better Auth.

## 2. Arquivos cobertos

- `src/tests/routes/auth.spec.js`: controller, validação e resposta HTTP com serviço isolado.
- `src/tests/services/autenticacaoService.spec.js`: regras de sessão, credencial e recuperação com dependências mockadas.
- `src/tests/middlewares/AuthMiddleware.spec.js`: resolução da sessão e estado atual do usuário.
- `scripts/better-auth-smoke.js`: integração real Better Auth + Prisma + PostgreSQL.
- `scripts/better-auth-http-smoke.js`: fluxo HTTP real das rotas públicas do DoaI.
- `scripts/better-auth-migration-smoke.js`: backfill da senha antiga para `Account` em transação revertida.

## 3. Cenários de route/controller

| ID | Cenário | Resultado esperado |
|---|---|---|
| AUTH-RT-01 | Login válido | `200`, token de sessão e usuário |
| AUTH-RT-02 | Login com body inválido | `400`, serviço não chamado |
| AUTH-RT-03 | Solicitar recuperação | `200`, mensagem anti-enumeração |
| AUTH-RT-04 | Redefinir com token válido | `200`, confirmação |
| AUTH-RT-05 | Rotacionar sessão autenticada | `200`, novo token |
| AUTH-RT-06 | Logout | `200`, headers encaminhados ao Better Auth |

## 4. Cenários de service

| Grupo | Comportamentos validados |
|---|---|
| Cadastro | criação de `Usuario` e `Account`; conflito de e-mail convertido para `409` |
| Login | credenciais, usuário ativo, remoção da sessão criada para conta suspensa e erro genérico |
| Recuperação | mensagem anti-enumeração, reset pela tabela `Verification` |
| Sessão | logout persistido, rotação atômica, rejeição de token expirado ou já rotacionado |
| Credencial | consulta de `Account`, comparação bcrypt, atualização transacional e revogação de sessões |

## 5. Cenários de middleware

| ID | Cenário | Resultado esperado |
|---|---|---|
| AUTH-MW-01 | Sessão ausente/inválida | erro `498` |
| AUTH-MW-02 | Sessão válida e usuário ativo | preenche `req.auth` e o contrato legado `req.user` |
| AUTH-MW-03 | Usuário suspenso depois do login | bloqueio `403` pelo estado atual do banco |
| AUTH-MW-04 | Logout de conta inativa | autentica a sessão com `requireActive: false` para permitir encerramento |

## 6. Integração real

`npm run test:auth:migration` cria um schema temporário dentro de uma transação, aplica a migration inicial, insere um usuário legado, executa a migration Better Auth e comprova:

- preservação do hash bcrypt em `Account.password`;
- preenchimento de `issuer`, `providerId`, `accountId` e `userId`;
- remoção de `senha` e tokens antigos de `Usuario`;
- rollback integral ao terminar.

`npm run test:auth` cria um usuário temporário no banco de teste e comprova cadastro, `Account`, login, bearer, `getSession`, logout e revogação. `npm run test:auth:http` percorre as rotas públicas reais e valida também endpoint nativo bloqueado, senha incorreta, refresh com invalidação imediata do token anterior e login suspenso sem sessão residual. Os usuários temporários são excluídos ao final.

## 7. Comandos

```bash
npm test -- --runInBand src/tests/routes/auth.spec.js src/tests/services/autenticacaoService.spec.js src/tests/middlewares/AuthMiddleware.spec.js
docker compose up -d postgres-test
npm run test:db
npm run test:auth:migration
npm run test:auth
npm run test:auth:http
npm run test:coverage -- --runInBand
```

## 8. Critério de aceite

- nenhuma dependência direta de `jsonwebtoken` ou blacklist em memória;
- senha ausente de `Usuario` e presente somente como hash em `Account`;
- sessão revogável no banco e bearer antigo inválido após refresh/logout;
- conta suspensa/inativa bloqueada pelo estado atual, não por dados congelados no token;
- testes unitários, HTTP, migração e integração real aprovados.
