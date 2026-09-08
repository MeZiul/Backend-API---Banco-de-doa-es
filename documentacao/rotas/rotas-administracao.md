# Rotas de Administração

Este documento descreve o contrato funcional das rotas de `administracao` revisadas para a Milestone 3.

Escopo considerado:
- estado integrado final da `dev`
- autenticação via token de sessão Better Auth no formato Bearer
- autorização restrita ao perfil `ADMINISTRADOR`
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md`

## Visão Geral

Domínio responsável por:
- moderação de usuários
- moderação de itens
- análise e resolução de denúncias

Rotas do módulo:
- `GET /admin/administracoes`
- `GET /admin/administracoes/:id`
- `GET /admin/alvos/:alvoId/administracoes`
- `GET /admin/administradores/:administradorId/administracoes`
- `GET /admin/usuarios`
- `GET /admin/usuarios/:id`
- `PUT /admin/usuarios/:id/bloquear`
- `PUT /admin/usuarios/:id/desbloquear`
- `DELETE /admin/usuarios/:id`
- `PUT /admin/usuarios/:id/inativar`
- `GET /admin/itens`
- `DELETE /admin/itens/:id`
- `PUT /admin/itens/:id/cancelar`
- `GET /admin/denuncias`
- `PUT /admin/denuncias/:id/resolver`

Observação:
- `DELETE /admin/usuarios/:id` e `PUT /admin/usuarios/:id/inativar` executam a mesma regra de inativação lógica
- `DELETE /admin/itens/:id` e `PUT /admin/itens/:id/cancelar` executam a mesma regra de cancelamento administrativo
- as rotas `/admin/administracoes` são auxiliares de auditoria da moderação implementada

## GET /admin/administracoes

Objetivo:
Listar ações administrativas registradas pela moderação.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params suportados:
- `administradorId`
- `tipoAcao`
- `tipoAlvo`
- `alvoId`
- `resultadoDenuncia`
- `dataInicio`
- `dataFim`
- `page`
- `limit`

Regra de negócio:
- a rota exige autenticação e perfil `ADMINISTRADOR`
- permite rastrear bloqueios, desbloqueios, inativações, cancelamentos e resoluções de denúncia
- a listagem é paginada e pode ser filtrada por responsável, alvo, ação, resultado e período

Resposta esperada:
- `200 OK` com lista paginada de ações administrativas

## GET /admin/administracoes/:id

Objetivo:
Consultar o detalhe de uma ação administrativa.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- a rota exige autenticação e perfil `ADMINISTRADOR`
- se a ação não existir, a API deve retornar erro apropriado

Resposta esperada:
- `200 OK` com o detalhe da ação administrativa

## GET /admin/alvos/:alvoId/administracoes

Objetivo:
Listar ações administrativas relacionadas a um alvo específico.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- a rota exige autenticação e perfil `ADMINISTRADOR`
- o alvo pode representar usuário, item ou denúncia moderada

Resposta esperada:
- `200 OK` com lista paginada de ações do alvo

## GET /admin/administradores/:administradorId/administracoes

Objetivo:
Listar ações realizadas por um administrador específico.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Regra de negócio:
- a rota exige autenticação e perfil `ADMINISTRADOR`
- permite auditar o histórico de ações de um responsável administrativo

Resposta esperada:
- `200 OK` com lista paginada de ações do administrador

## GET /admin/usuarios

Objetivo:
Listar todos os usuários da plataforma com foco em moderação.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params suportados:
- `nome`
- `email`
- `cpf`
- `situacao`
- `perfil`
- `cidade`
- `uf`
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
- inclui os 10 registros mais recentes de itens, interesses, avaliações e denúncias relacionadas
- denúncias relacionadas incluem registros criados pelo usuário, contra ele ou contra seus itens
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
- itens `DISPONIVEL` do usuário devem ser cancelados
- a operação deve ser bloqueada se houver item `RESERVADO` ou `AGUARDANDO_CONFIRMACAO`
- cancelamentos, revalidação, inativação e auditoria devem confirmar ou reverter juntos
- o histórico pode ser preservado para auditoria
- em casos necessários, dados pessoais podem ser anonimizados

Resposta esperada:
- `200 OK` com confirmação da inativação

## GET /admin/itens

Objetivo:
Listar itens da plataforma para fiscalização administrativa.

Autorização:
- usuário autenticado com perfil `ADMINISTRADOR`

Query params suportados:
- `status`
- `categoriaId`
- `usuarioId`
- `cidade`
- `uf`
- `condicaoItem`
- `busca`
- `ordenacao`
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

## Atualizacao da Milestone 3

Endurecimentos implementados:

- usuarios suspensos ou inativos sao bloqueados antes de operacoes protegidas;
- perfil e situação atuais são consultados no banco, evitando privilégio antigo mantido em uma sessão já emitida;
- administrador nao pode bloquear, inativar ou suspender a si mesmo;
- moderacoes usam atualizacoes condicionais para impedir duas operacoes concorrentes de vencerem;
- bloqueio, desbloqueio, inativacao, cancelamento de item e resolucao geram auditoria;
- mutacao administrativa e auditoria compartilham uma transacao Prisma; falha em qualquer etapa desfaz todo o conjunto;
- inativacao usa isolamento serializavel e revalida doacoes em andamento dentro da transacao;
- destinatarios de itens cancelados sao consultados depois do commit, evitando perder interesses concorrentes;
- usuarios afetados e interessados em itens cancelados recebem notificacoes best-effort;
- listagens administrativas usam filtros dedicados e projecoes que nao expoem senha, tokens ou outros campos indevidos.

Filtros adicionais da Milestone 3:

- usuarios: `dataInicio` e `dataFim`;
- itens: `dataInicio` e `dataFim`;
- buscas textuais tratam caracteres especiais como texto literal;
- IDs usados em filtros aceitam UUID do Prisma e ObjectId legado durante a transicao.

Respostas adicionais:

- `409 Conflict` pode ocorrer quando outra operacao concorrente altera o recurso antes da moderacao;
- `403 Forbidden` ocorre para usuario nao administrador, usuario sem situacao ativa ou tentativa de auto-moderacao;
- `498` ocorre quando o Bearer Token nao foi informado ou nao e valido no middleware atual.

Evidencia automatizada:

- recorte focado de Administracao, Interesse e Denuncia: **8 suites e 123 testes aprovados**;
- Services alvo: **97,51% de statements**, **85,35% de branches**, **100% de funcoes** e **97,50% de linhas**;
- smoke PostgreSQL aprovou migrations, conexao, repositories, relacoes e rollback;
- suite global: **343 de 345 testes aprovados**; as 2 falhas restantes estao fora destes modulos, em Usuario e Perfil;
- Controller e router de Administracao: **100% das linhas** na cobertura focada da branch de endpoints.
