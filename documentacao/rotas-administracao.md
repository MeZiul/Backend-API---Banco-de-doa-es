# Rotas de Administração

Este documento descreve o contrato funcional das rotas de `administração` previstas para a Milestone 2.

Escopo considerado:
- branches de rota de `administração` mergeadas na `dev`
- autenticação via Bearer Token JWT
- autorização restrita ao perfil `ADMINISTRADOR`
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md`

## Visão Geral

Domínio responsável por:
- moderação de usuários
- moderação de itens
- análise e resolução de denúncias

Rotas do módulo:
- `GET /admin/usuarios`
- `GET /admin/usuarios/:id`
- `PUT /admin/usuarios/:id/bloquear`
- `PUT /admin/usuarios/:id/desbloquear`
- `DELETE /admin/usuarios/:id`
- `GET /admin/itens`
- `DELETE /admin/itens/:id`
- `GET /admin/denuncias`
- `PUT /admin/denuncias/:id/resolver`

## GET /admin/usuarios

Objetivo:
Listar todos os usuários da plataforma com foco em moderação.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params sugeridos:
- `situacao`
- `perfil`
- `cidade`
- `dataCadastroInicio`
- `dataCadastroFim`
- `page`
- `limit`

Regra de negócio:
- a rota exige autenticação e perfil `ADMINISTRADOR`
- a listagem deve permitir consulta independentemente da situação do usuário
- devem ser exibidos dados úteis para moderação, sem expor informações sensíveis indevidas
- a resposta pode ser paginada e filtrada

Resposta esperada:
- `200 OK` com lista paginada de usuários

## GET /admin/usuarios/:id

Objetivo:
Consultar um usuário específico para análise administrativa.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- a resposta deve apresentar dados cadastrais e contexto suficiente para moderação
- pode incluir histórico resumido de itens, interesses, avaliações e denúncias quando aplicável
- se o usuário não existir, a API deve retornar erro apropriado

Resposta esperada:
- `200 OK` com o detalhe do usuário

Erros comuns:
- `404 Not Found` para usuário inexistente

## PUT /admin/usuarios/:id/bloquear

Objetivo:
Suspender um usuário da plataforma.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Body esperado:

```json
{
  "justificativa": "Suspensão aplicada após análise de denúncia procedente.",
  "suspensaoAte": "2026-05-15T23:59:59.000Z"
}
```

Regra de negócio:
- a suspensão exige justificativa obrigatória
- pode existir prazo determinado de suspensão
- ao bloquear, o usuário deve passar para situação `SUSPENSO`
- o motivo da suspensão deve ser registrado
- usuários suspensos não podem acessar operações protegidas
- o usuário deve ser notificado

Resposta esperada:
- `200 OK` com o resultado da ação

## PUT /admin/usuarios/:id/desbloquear

Objetivo:
Reativar um usuário suspenso.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Body esperado:

```json
{
  "justificativa": "Suspensão encerrada após reavaliação administrativa."
}
```

Regra de negócio:
- apenas usuários com situação `SUSPENSO` podem ser desbloqueados
- ao desbloquear, a situação do usuário deve voltar para `ATIVO`
- informações de suspensão podem ser limpas ou arquivadas conforme a estratégia adotada
- o usuário deve ser notificado da reativação

Resposta esperada:
- `200 OK` com o resultado da ação

## DELETE /admin/usuarios/:id

Objetivo:
Inativar administrativamente um usuário.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- a remoção administrativa deve ser preferencialmente lógica
- o usuário deve passar para situação `INATIVO`
- itens ativos do usuário devem ser cancelados
- o histórico pode ser preservado para auditoria
- em casos necessários, dados pessoais podem ser anonimizados

Resposta esperada:
- `200 OK` com confirmação da inativação

## GET /admin/itens

Objetivo:
Listar itens da plataforma para fiscalização administrativa.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params sugeridos:
- `status`
- `categoriaId`
- `cidade`
- `usuarioId`
- `dataCadastroInicio`
- `dataCadastroFim`
- `page`
- `limit`

Regra de negócio:
- a listagem deve permitir consulta de itens em qualquer status
- a resposta deve trazer dados suficientes para moderação, incluindo doador e volume de interesses
- a consulta pode ser filtrada por categoria, cidade, status, data e usuário responsável

Resposta esperada:
- `200 OK` com lista paginada de itens

## DELETE /admin/itens/:id

Objetivo:
Cancelar administrativamente um item.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- ao remover, o item deve passar para status `CANCELADO`
- se houver interesses ativos, os interessados devem ser notificados
- a ação administrativa deve ser registrada
- o cancelamento pode ocorrer após denúncia procedente ou infração às regras da plataforma

Resposta esperada:
- `200 OK` com confirmação do cancelamento

## GET /admin/denuncias

Objetivo:
Listar todas as denúncias da plataforma.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params sugeridos:
- `status`
- `tipoAlvo`
- `motivo`
- `dataInicio`
- `dataFim`
- `page`
- `limit`

Regra de negócio:
- a listagem deve exibir denúncias em qualquer status
- deve permitir filtragem por status, tipo do alvo, motivo e data
- a resposta deve trazer informações suficientes para análise administrativa

Resposta esperada:
- `200 OK` com lista paginada de denúncias

## PUT /admin/denuncias/:id/resolver

Objetivo:
Concluir a análise de uma denúncia.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Body esperado:

```json
{
  "resultado": "PROCEDENTE",
  "respostaAdmin": "A denúncia procede e a conta será suspensa.",
  "acaoTomada": "BLOQUEIO_USUARIO"
}
```

Regra de negócio:
- apenas denúncias `EM_ANALISE` podem ser resolvidas
- o resultado deve ser `PROCEDENTE` ou `IMPROCEDENTE`
- a resposta administrativa deve ser registrada
- a ação tomada pode envolver bloqueio de usuário ou cancelamento de item
- a análise deve registrar administrador responsável e data da conclusão

Resposta esperada:
- `200 OK` com a denúncia resolvida e a ação aplicada

Erros comuns:
- `400 Bad Request` para estado inválido
- `404 Not Found` para denúncia inexistente
