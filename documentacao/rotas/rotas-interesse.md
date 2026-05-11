# Rotas de Interesse

Este documento descreve o contrato funcional das rotas de `interesse` previstas para a Milestone 2.

Escopo considerado:
- branches de rota de `interesse` mergeadas na `dev`
- autenticação via Bearer Token JWT
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md` e `Especificacao_API_REST_DoaI.html`

## Visão Geral

Domínio responsável por:
- registrar manifestação de interesse em item de doação
- consultar histórico e detalhes do interesse
- permitir decisão do doador sobre um interesse pendente
- permitir cancelamento pelo interessado

Rotas do módulo:
- `POST /interesses`
- `GET /interesses`
- `GET /interesses/:id`
- `PUT /interesses/:id/aceitar`
- `PUT /interesses/:id/recusar`
- `DELETE /interesses/:id`

## POST /interesses

Objetivo:
Registrar o interesse de um usuário autenticado em um item disponível.

Autorização:
- usuário autenticado

Body esperado:

```json
{
  "itemId": "6807f6b90d32b53a1bcb0001",
  "mensagem": "Tenho interesse e posso buscar ainda esta semana."
}
```

Regra de negócio:
- o usuário deve estar autenticado e com situação `ATIVO`
- o item deve existir e estar com status `DISPONIVEL`
- o usuário não pode manifestar interesse em item próprio
- o mesmo usuário não pode manter mais de um interesse ativo para o mesmo item
- a mensagem ao doador é opcional
- o interesse deve nascer com status `PENDENTE`
- a data da manifestação deve ser registrada
- o total de interesses do item deve ser incrementado
- o doador deve ser notificado sobre a nova manifestação

Resposta esperada:
- `201 Created` com o interesse criado

Erros comuns:
- `400 Bad Request` para payload inválido
- `403 Forbidden` para usuário sem permissão de operação
- `404 Not Found` para item inexistente
- `409 Conflict` para interesse duplicado ativo ou item indisponível

## GET /interesses

Objetivo:
Listar os interesses do usuário autenticado.

Autorização:
- usuário autenticado

Query params suportados:
- `status`
- `itemId`
- `usuarioInteressadoId`
- `usuarioDoadorId`
- `dataInicio`
- `dataFim`
- `page`
- `limit`

Regra de negócio:
- a rota exige autenticação
- para usuário comum, devem ser retornados apenas os próprios interesses
- a listagem pode ser filtrada por status, item e período
- cada registro deve retornar item, status, data da manifestação e resposta do doador, quando existir
- interesses `RECUSADO`, `CANCELADO` e `EXPIRADO` podem continuar visíveis para histórico

Resposta esperada:
- `200 OK` com lista paginada

## GET /interesses/:id

Objetivo:
Consultar os detalhes de um interesse específico.

Autorização:
- usuário autenticado
- acesso permitido ao interessado, ao doador do item ou ao administrador

Regra de negócio:
- a resposta deve conter item, interessado, doador, mensagem, status e datas relevantes do fluxo
- se o interesse não existir, a API deve retornar erro apropriado

Resposta esperada:
- `200 OK` com o detalhe do interesse

Erros comuns:
- `403 Forbidden` para acesso indevido
- `404 Not Found` para interesse inexistente

## PUT /interesses/:id/aceitar

Objetivo:
Permitir que o doador aceite um interesse pendente.

Autorização:
- usuário autenticado
- apenas o doador responsável pelo item

Body esperado:

```json
{
  "mensagemResposta": "Reserva confirmada. Podemos combinar a retirada."
}
```

Regra de negócio:
- apenas o doador do item pode aceitar o interesse
- o interesse deve estar com status `PENDENTE`
- o item deve estar com status `DISPONIVEL`
- ao aceitar, o interesse muda para `ACEITO`
- a data da resposta deve ser registrada
- o item deve passar para `RESERVADO`
- o item deve guardar o identificador do interesse aceito
- os demais interesses pendentes do mesmo item devem ser recusados automaticamente
- o interessado aceito e os demais interessados afetados devem ser notificados

Resposta esperada:
- `200 OK` com o interesse atualizado

Erros comuns:
- `400 Bad Request` para estado inválido
- `403 Forbidden` para usuário que não é o doador
- `404 Not Found` para interesse inexistente

## PUT /interesses/:id/recusar

Objetivo:
Permitir que o doador recuse um interesse pendente.

Autorização:
- usuário autenticado
- apenas o doador responsável pelo item

Body esperado:

```json
{
  "mensagemResposta": "Neste momento vou seguir com outro interessado."
}
```

Regra de negócio:
- apenas o doador responsável pode recusar
- o interesse deve estar com status `PENDENTE`
- ao recusar, o interesse deve passar para `RECUSADO`
- a data da resposta deve ser registrada
- o item permanece `DISPONIVEL` se nenhum interesse tiver sido aceito
- o interessado deve ser notificado da recusa

Resposta esperada:
- `200 OK` com o interesse atualizado

## DELETE /interesses/:id

Objetivo:
Permitir que o interessado cancele a própria manifestação.

Autorização:
- usuário autenticado
- apenas o próprio interessado

Regra de negócio:
- interesses `PENDENTE` podem ser cancelados
- se o interesse cancelado estiver `ACEITO`, a reserva do item deve ser desfeita
- ao cancelar um interesse aceito, o item deve voltar para `DISPONIVEL` quando não houver outro aceito
- a data de cancelamento deve ser registrada
- o doador deve ser notificado quando o cancelamento afetar um interesse aceito

Resposta esperada:
- `200 OK` com o interesse cancelado

Erros comuns:
- `400 Bad Request` para status não cancelável
- `403 Forbidden` para usuário diferente do interessado
- `404 Not Found` para interesse inexistente
