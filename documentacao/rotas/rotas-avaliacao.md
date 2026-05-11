# Rotas de Avaliação

Este documento descreve o contrato funcional das rotas de `avaliação` previstas para a Milestone 2.

Escopo considerado:
- branches de rota de `avaliação` mergeadas na `dev`
- autenticação via Bearer Token JWT
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md` e `Especificacao_API_REST_DoaI.html`

## Visão Geral

Domínio responsável por:
- registrar avaliações entre usuários após doações concluídas
- consultar avaliações registradas
- permitir atualização do feedback pelo autor
- permitir remoção da avaliação pelo autor
- manter a média e o total de avaliações do usuário avaliado

Rotas do módulo:
- `POST /avaliacoes`
- `GET /avaliacoes`
- `GET /avaliacoes/:id`
- `PUT /avaliacoes/:id`
- `DELETE /avaliacoes/:id`

## POST /avaliacoes

Objetivo:
Permitir que um usuário avalie a outra parte envolvida em uma doação concluída.

Autorização:
- usuário autenticado

Body esperado:

```json
{
  "item_id": "6807f6b90d32b53a1bcb0001",
  "avaliado_id": "6807f6b90d32b53a1bcb0002",
  "nota": 5,
  "comentario": "Usuário pontual e comunicação boa.",
  "tipo": "DOADOR_PARA_INTERESSADO"
}
```

Regra de negócio:
- o usuário deve estar autenticado
- o item deve existir
- o item deve estar com status `DOADO`
- a avaliação deve estar relacionada a um item de doação concluído
- a nota deve ser um número inteiro entre `1` e `5`
- o comentário é opcional
- o tipo deve ser `DOADOR_PARA_INTERESSADO` ou `INTERESSADO_PARA_DOADOR`
- o avaliador deve ter participado da doação
- o avaliado deve ser a outra parte envolvida na doação
- a avaliação deve respeitar o interesse aceito vinculado ao item
- não deve existir avaliação duplicada do mesmo avaliador para o mesmo item e tipo
- quando houver prazo de avaliação, a criação deve respeitar o limite definido pela regra de negócio
- após criar, a média e o total de avaliações do usuário avaliado devem ser recalculados

Resposta esperada:
- `201 Created` com a avaliação criada

Erros comuns:
- `400 Bad Request` para payload inválido, nota fora do intervalo ou item ainda não doado
- `403 Forbidden` para usuário fora do fluxo da doação
- `404 Not Found` para item ou usuário avaliado inexistente
- `409 Conflict` para avaliação duplicada
- `498 Invalid Token` para token inválido ou expirado

## GET /avaliacoes

Objetivo:
Listar avaliações registradas, com filtros opcionais.

Autorização:
- usuário autenticado

Query params suportados:
- `avaliado_id`
- `avaliador_id`
- `item_id`
- `tipo`
- `page`
- `limite`

Regra de negócio:
- a rota exige autenticação
- a listagem deve retornar avaliações cadastradas conforme os filtros informados
- usuários comuns devem consultar avaliações relacionadas ao próprio contexto permitido
- administradores podem consultar avaliações de qualquer usuário
- a resposta deve ser paginada
- cada registro deve exibir item, avaliador, avaliado, nota, comentário, tipo e data da avaliação

Resposta esperada:
- `200 OK` com lista paginada de avaliações

Erros comuns:
- `400 Bad Request` para query params inválidos
- `403 Forbidden` para acesso fora do escopo permitido
- `498 Invalid Token` para token inválido ou expirado

## GET /avaliacoes/:id

Objetivo:
Consultar os detalhes de uma avaliação específica.

Autorização:
- usuário autenticado
- acesso permitido ao avaliador, ao avaliado ou ao administrador

Regra de negócio:
- a rota exige autenticação
- o identificador informado deve ser um ObjectId válido
- o sistema deve buscar a avaliação pelo ID
- a resposta deve conter item, avaliador, avaliado, nota, comentário, tipo e data da avaliação
- caso a avaliação não exista, a API deve retornar erro apropriado

Resposta esperada:
- `200 OK` com o detalhe da avaliação

Erros comuns:
- `400 Bad Request` para ID inválido
- `403 Forbidden` para usuário sem permissão de consulta
- `404 Not Found` para avaliação inexistente
- `498 Invalid Token` para token inválido ou expirado

## PUT /avaliacoes/:id

Objetivo:
Permitir que o autor atualize uma avaliação registrada.

Autorização:
- usuário autenticado
- apenas o autor da avaliação

Body esperado:

```json
{
  "nota": 4,
  "comentario": "Comentário atualizado após revisar a experiência."
}
```

Regra de negócio:
- a rota exige autenticação
- apenas o autor da avaliação pode editar
- somente `nota` e `comentario` podem ser alterados
- `item_id`, `avaliador_id`, `avaliado_id` e `tipo` não podem ser alterados após a criação
- a nota deve continuar entre `1` e `5`
- após atualização da nota, a média e o total de avaliações do usuário avaliado devem ser recalculados

Resposta esperada:
- `200 OK` com a avaliação atualizada

Erros comuns:
- `400 Bad Request` para payload inválido ou tentativa de alterar campos bloqueados
- `403 Forbidden` para usuário diferente do autor
- `404 Not Found` para avaliação inexistente
- `498 Invalid Token` para token inválido ou expirado

## DELETE /avaliacoes/:id

Objetivo:
Permitir que o autor remova uma avaliação registrada.

Autorização:
- usuário autenticado
- apenas o autor da avaliação

Regra de negócio:
- a rota exige autenticação
- apenas o autor da avaliação pode remover
- a exclusão deve remover o registro de avaliação
- após remover, a média e o total de avaliações do usuário avaliado devem ser recalculados
- a remoção não deve alterar o status do item nem o histórico da doação

Resposta esperada:
- `204 No Content` ou confirmação de remoção, conforme implementação do controller

Erros comuns:
- `400 Bad Request` para ID inválido
- `403 Forbidden` para usuário diferente do autor
- `404 Not Found` para avaliação inexistente
- `498 Invalid Token` para token inválido ou expirado
