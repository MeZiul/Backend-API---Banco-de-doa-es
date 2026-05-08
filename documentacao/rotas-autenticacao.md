# Rotas de Autenticação

Este documento descreve o contrato funcional das rotas de `autenticação` previstas para a Milestone 2.

Escopo considerado:
- branches de rota de `autenticação` mergeadas na `dev`
- autenticação via Bearer Token JWT nas rotas protegidas
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md` e `Especificacao_API_REST_DoaI.html`

## Visão Geral

Domínio responsável por:
- autenticar usuários cadastrados
- gerar token JWT para acesso às rotas protegidas
- encerrar sessão invalidando o token atual
- renovar token de usuário autenticado
- iniciar e concluir o fluxo de recuperação de senha

Rotas do módulo:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `POST /auth/esqueci-senha`
- `PUT /auth/redefinir-senha`

## POST /auth/login

Objetivo:
Autenticar um usuário cadastrado e retornar um token JWT.

Autorização:
- rota pública

Body esperado:

```json
{
  "email": "carlos@email.com",
  "senha": "Senha@123"
}
```

Regra de negócio:
- o usuário deve informar `email` e `senha`
- o e-mail deve possuir formato válido
- o sistema deve validar a senha usando comparação com hash armazenado
- credenciais inválidas devem retornar erro genérico sem indicar se o e-mail ou a senha falhou
- usuários com situação `SUSPENSO` não podem autenticar
- usuários com situação `INATIVO` não podem autenticar
- em caso de sucesso, o sistema deve gerar token JWT contendo os dados essenciais do usuário
- a resposta não deve expor a senha ou hash de senha

Resposta esperada:
- `200 OK` com `token` e dados do usuário autenticado

Erros comuns:
- `400 Bad Request` para body inválido
- `401 Unauthorized` para e-mail ou senha incorretos
- `403 Forbidden` para conta suspensa ou inativa
- `500 Internal Server Error` para erro inesperado

## POST /auth/logout

Objetivo:
Encerrar a sessão do usuário autenticado invalidando o token atual.

Autorização:
- usuário autenticado

Headers esperados:

```http
Authorization: Bearer <token>
```

Regra de negócio:
- a rota exige autenticação
- o token enviado no header deve ser extraído da requisição
- o token deve ser colocado em blacklist
- após logout, o mesmo token não deve ser aceito em novas requisições protegidas
- a operação não remove o usuário nem altera seus dados cadastrais

Resposta esperada:
- `200 OK` com mensagem de logout realizado

Erros comuns:
- `401 Unauthorized` para ausência de autenticação
- `498 Invalid Token` para token inválido ou expirado
- `500 Internal Server Error` para erro inesperado

## POST /auth/refresh-token

Objetivo:
Gerar um novo token JWT para o usuário autenticado.

Autorização:
- usuário autenticado

Headers esperados:

```http
Authorization: Bearer <token>
```

Regra de negócio:
- a rota exige token válido
- o usuário identificado no token deve existir na base
- apenas usuários com situação `ATIVO` podem renovar token
- contas suspensas ou inativas devem ser bloqueadas
- o novo token deve preservar os dados essenciais de identificação e perfil
- o token antigo pode continuar válido até expirar, salvo se estiver em blacklist

Resposta esperada:
- `200 OK` com novo `token`

Erros comuns:
- `401 Unauthorized` para usuário não encontrado ou autenticação ausente
- `403 Forbidden` para conta inativa ou suspensa
- `498 Invalid Token` para token inválido ou expirado
- `500 Internal Server Error` para erro inesperado

## POST /auth/esqueci-senha

Objetivo:
Iniciar o fluxo de recuperação de senha para um e-mail cadastrado.

Autorização:
- rota pública

Body esperado:

```json
{
  "email": "carlos@email.com"
}
```

Regra de negócio:
- o e-mail é obrigatório e deve possuir formato válido
- a resposta não deve confirmar se o e-mail existe na base, para evitar enumeração de contas
- quando o e-mail pertence a um usuário cadastrado, o sistema deve gerar token temporário de redefinição
- o token deve possuir prazo de expiração
- em ambiente de desenvolvimento, o token pode ser retornado na resposta para facilitar testes
- em ambiente com serviço de e-mail ativo, as instruções devem ser enviadas ao endereço cadastrado

Resposta esperada:
- `200 OK` com mensagem genérica de instruções enviadas

Erros comuns:
- `400 Bad Request` para e-mail inválido
- `500 Internal Server Error` para erro inesperado

## PUT /auth/redefinir-senha

Objetivo:
Redefinir a senha do usuário usando o token temporário de recuperação.

Autorização:
- rota pública

Body esperado:

```json
{
  "token": "6f3d7ac5d0b1e9f2c8a4",
  "novaSenha": "NovaSenha@123"
}
```

Regra de negócio:
- o token é obrigatório
- a nova senha é obrigatória
- a nova senha deve ter pelo menos 8 caracteres
- a nova senha deve conter letra maiúscula, letra minúscula, número e caractere especial
- o token deve existir e não pode estar expirado
- a nova senha deve ser armazenada com hash bcrypt
- após a redefinição, o token de recuperação não deve ser reutilizado

Resposta esperada:
- `200 OK` com mensagem de senha redefinida

Erros comuns:
- `400 Bad Request` para token inválido, token expirado ou senha fora do padrão
- `500 Internal Server Error` para erro inesperado
