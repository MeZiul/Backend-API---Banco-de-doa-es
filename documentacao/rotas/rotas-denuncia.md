# Rotas de Denúncia

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


Este documento descreve o contrato funcional das rotas de `denuncia` revisadas para a Milestone 3.

Escopo considerado:
- estado integrado final da `dev`
- autenticação via token de sessão Better Auth no formato Bearer
- regras de negócio definidas em `Documentação_da_api_Banco_de_Doação.md` e `Especificacao_API_REST_DoaI.html`

## Visão Geral

Domínio responsável por:
- registrar denúncias contra item ou usuário
- consultar histórico e detalhes das denúncias criadas pelo usuário
- permitir atualização e exclusão enquanto a análise administrativa não foi concluída

Rotas do módulo:
- `POST /denuncias`
- `GET /denuncias`
- `GET /denuncias/:id`
- `PUT /denuncias/:id`
- `DELETE /denuncias/:id`

## POST /denuncias

Objetivo:
Registrar uma nova denúncia contra um item ou usuário.

Autorização:
- usuário autenticado

Body esperado:

```json
{
  "tipoAlvo": "ITEM",
  "alvoItemId": "6807f6b90d32b53a1bcb0001",
  "motivo": "ITEM_PROIBIDO",
  "descricao": "O anúncio aparenta violar as regras da plataforma."
}
```

Regra de negócio:
- apenas usuários com situação `ATIVO` podem criar denúncia
- a denúncia deve apontar um alvo válido do tipo `ITEM` ou `USUARIO`
- o motivo é obrigatório e deve usar valor padronizado
- os motivos aceitos são `CONTEUDO_INAPROPRIADO`, `ITEM_PROIBIDO`, `FRAUDE`, `ASSEDIO`, `SPAM` e `OUTRO`
- a descrição detalhada é opcional
- o mesmo usuário não pode denunciar o mesmo alvo novamente enquanto houver denúncia `EM_ANALISE`
- a denúncia deve ser criada com status `EM_ANALISE`
- a data do registro deve ser persistida
- os administradores ativos recebem uma notificação best-effort para análise posterior

Resposta esperada:
- `201 Created` com a denúncia criada

Erros comuns:
- `400 Bad Request` para payload inválido
- `403 Forbidden` para usuário sem situação válida
- `404 Not Found` para alvo inexistente
- `409 Conflict` para denúncia duplicada em análise

## GET /denuncias

Objetivo:
Listar as denúncias do usuário autenticado.

Autorização:
- usuário autenticado

Query params suportados:
- `denuncianteId`
- `tipoAlvo`
- `alvoItemId`
- `alvoUsuarioId`
- `motivo`
- `status`
- `dataInicio`
- `dataFim`
- `page`
- `limit`

Regra de negócio:
- a rota exige autenticação
- para usuário comum, devem ser retornadas apenas as denúncias do próprio denunciante
- cada registro deve exibir tipo do alvo, motivo, status, data da denúncia e resposta administrativa quando houver
- denúncias `PROCEDENTE` e `IMPROCEDENTE` continuam visíveis para histórico

Resposta esperada:
- `200 OK` com lista paginada

## GET /denuncias/:id

Objetivo:
Consultar os detalhes de uma denúncia específica.

Autorização:
- usuário autenticado
- acesso permitido ao denunciante responsável ou ao administrador

Regra de negócio:
- a resposta deve conter alvo denunciado, motivo, descrição, status, resposta administrativa, ação tomada e datas principais
- se a denúncia não existir, a API deve retornar erro apropriado

Resposta esperada:
- `200 OK` com o detalhe da denúncia

Erros comuns:
- `403 Forbidden` para acesso indevido
- `404 Not Found` para denúncia inexistente

## PUT /denuncias/:id

Objetivo:
Atualizar uma denúncia antes da conclusão da análise administrativa.

Autorização:
- usuário autenticado
- apenas o autor da denúncia

Body esperado:

```json
{
  "motivo": "OUTRO",
  "descricao": "Complementando informações relevantes para a análise."
}
```

Regra de negócio:
- apenas o autor da denúncia pode atualizar
- a denúncia deve estar com status `EM_ANALISE`
- o tipo do alvo e o alvo denunciado não podem ser alterados após a criação
- somente `motivo` e `descricao` podem ser modificados
- denúncias já analisadas não podem mais ser editadas

Resposta esperada:
- `200 OK` com a denúncia atualizada

Erros comuns:
- `400 Bad Request` para body inválido ou estado inconsistente
- `403 Forbidden` para autor diferente
- `404 Not Found` para denúncia inexistente

## DELETE /denuncias/:id

Objetivo:
Remover uma denúncia antes do fim da análise.

Autorização:
- usuário autenticado
- apenas o autor da denúncia

Regra de negócio:
- a exclusão só pode ocorrer enquanto a denúncia estiver `EM_ANALISE`
- denúncias `PROCEDENTE` e `IMPROCEDENTE` não podem ser removidas pelo usuário
- a remoção deve ser bloqueada se a administração já tiver iniciado ou concluído a análise
- a condição de ID, autor e status é verificada atomicamente na exclusão

Resposta esperada:
- `200 OK` com confirmação da remoção

Erros comuns:
- `400 Bad Request` para estado não removível
- `403 Forbidden` para autor diferente
- `404 Not Found` para denúncia inexistente

## Atualizacao da Milestone 3

Endurecimentos implementados:

- usuario nao pode denunciar a si mesmo;
- indices unicos parciais impedem denuncia duplicada `EM_ANALISE` do mesmo denunciante contra o mesmo item ou usuario;
- atualizacao e remocao usam operacoes condicionais que exigem status `EM_ANALISE`;
- nova denuncia gera notificacao best-effort para cada administrador ativo;
- resolucao administrativa foi centralizada no modulo de Administracao para sempre gerar auditoria;
- somente uma resolucao concorrente pode vencer;
- denuncia procedente aplica moderacao condicional e auditoria na mesma transacao Prisma;
- denunciante e alvo afetado recebem notificacoes de resultado;
- respostas usam projecoes explicitas para limitar dados do denunciante, alvo, item e administrador.

Respostas adicionais:

- `409 Conflict` pode ocorrer em duplicidade em analise ou perda de corrida de atualizacao/remocao/resolucao;
- `403 Forbidden` ocorre para usuario inativo, autodenuncia ou operacao por pessoa sem permissao;
- `498` ocorre quando o Bearer Token nao foi informado ou nao e valido no middleware atual.

Riscos de deploy:

- migrations devem ser aplicadas antes de iniciar a API;
- notificacoes permanecem best-effort e podem exigir reenvio manual se a integracao falhar depois do commit.

Evidencia automatizada:

- validacao real confirmou indice unico e somente uma resolucao concorrente;
- recorte focado de Administracao, Interesse e Denuncia: **8 suites e 123 testes aprovados**;
- Services alvo: **97,51% de statements**, **85,35% de branches**, **100% de funcoes** e **97,50% de linhas**;
- smoke PostgreSQL aprovou migrations, conexao, repositories, relacoes e rollback;
- suite global: **343 de 345 testes aprovados**; as 2 falhas restantes estao fora destes modulos, em Usuario e Perfil;
- Controller e router de Denuncia: **100% das linhas** na cobertura focada da branch de endpoints.
