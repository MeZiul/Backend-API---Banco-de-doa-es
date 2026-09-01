# Rotas de Autenticação

Este documento descreve o contrato público de autenticação da API DoaI após a migração para Better Auth 1.7, Prisma e PostgreSQL.

## Visão geral

- Credenciais locais: `Account`, com hash bcrypt em `password`.
- Sessões revogáveis: `Session`, com token opaco e expiração.
- Recuperação de senha: `Verification`, com token temporário de uso único.
- Transporte: `Authorization: Bearer <token>`.
- O bearer é um token de sessão opaco, não um JWT.
- O estado e o perfil atuais do usuário são consultados no banco a cada operação protegida.

Os endpoints nativos do Better Auth que poderiam alterar identidade ou credenciais estão bloqueados no handler `/api/auth/*`. Cadastro, login, recuperação, atualização e exclusão devem passar pelas rotas do DoaI para preservar Zod, CPF, permissões e regras de situação.

## `POST /auth/login`

Autentica um usuário cadastrado e cria uma sessão persistida.

Autorização: rota pública.

```json
{
  "email": "carlos@email.com",
  "senha": "Senha@123"
}
```

Regras de negócio:

- e-mail e senha são obrigatórios;
- credenciais inválidas retornam mensagem genérica;
- `SUSPENSO` e `INATIVO` não podem autenticar;
- se o Better Auth criar uma sessão antes de detectar uma situação inválida, a sessão é removida;
- o hash e os dados internos de autenticação nunca são retornados.

Resposta `200`:

```json
{
  "message": "Requisição bem-sucedida.",
  "data": {
    "token": "token-opaco-da-sessao",
    "usuario": {
      "_id": "uuid-do-usuario",
      "email": "carlos@email.com",
      "situacao": "ATIVO"
    }
  },
  "errors": []
}
```

Erros: `400` body inválido, `401` credenciais inválidas, `403` conta suspensa/inativa e `500` falha inesperada.

## `POST /auth/logout`

Revoga no PostgreSQL a sessão identificada pelo bearer atual.

```http
Authorization: Bearer <token-opaco-da-sessao>
```

Regras de negócio:

- exige uma sessão existente;
- também permite encerrar a sessão de conta que se tornou inativa;
- remove a sessão persistida, sem blacklist em memória;
- o mesmo token é recusado após o logout e após reinicializações da API.

Erros: `498` sessão ausente, inválida ou expirada e `500` falha inesperada.

## `POST /auth/refresh-token`

Rotaciona o token da sessão atual.

```http
Authorization: Bearer <token-atual>
```

Regras de negócio:

- exige usuário atual com situação `ATIVO`;
- a atualização usa como condição o token, o usuário e a expiração;
- o token antigo é substituído e invalidado imediatamente;
- somente uma chamada concorrente com o mesmo token pode vencer;
- a nova sessão recebe o prazo configurado no Better Auth.

Resposta `200`:

```json
{
  "message": "Requisição bem-sucedida.",
  "data": { "token": "novo-token-opaco" },
  "errors": []
}
```

Erros: `401` sessão não rotacionável, `403` conta não ativa e `498` bearer inválido/expirado.

## `POST /auth/esqueci-senha`

Inicia a recuperação sem revelar se o e-mail existe.

```json
{
  "email": "carlos@email.com"
}
```

Regras de negócio:

- o e-mail deve ser válido;
- a resposta é sempre genérica para evitar enumeração de contas;
- quando o usuário existe, o Better Auth grava uma verificação temporária;
- o token não é retornado no body;
- o `MailService` envia o link quando o e-mail está habilitado.

## `PUT /auth/redefinir-senha`

Consome a verificação temporária e substitui a credencial.

```json
{
  "token": "token-temporario-de-recuperacao",
  "novaSenha": "NovaSenha@123"
}
```

Regras de negócio:

- a senha deve cumprir o schema do DoaI;
- o token deve existir, estar válido e não expirado;
- o novo valor é armazenado somente como hash bcrypt;
- a verificação não pode ser reutilizada;
- as sessões anteriores são revogadas após a redefinição.

## Validação manual

1. Execute `POST /auth/login`.
2. Copie somente `data.token` para o botão **Authorize** do Swagger.
3. Consulte uma rota protegida.
4. Execute `POST /auth/refresh-token` e substitua o token autorizado.
5. Confirme que o token anterior falha.
6. Execute `POST /auth/logout` e confirme que o token novo também falha.

Validação automatizada real:

```bash
docker compose up -d postgres-test
npm run test:db
npm run test:auth:migration
npm run test:auth
npm run test:auth:http
```
