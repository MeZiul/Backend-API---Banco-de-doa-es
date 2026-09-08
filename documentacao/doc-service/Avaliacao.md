# Plano de Teste - AvaliacaoService

## API DoaI - Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `AvaliacaoService`, camada responsavel pelas regras de avaliacao entre participantes de uma doacao concluida.

---

## 2. Objetivo

Validar que avaliacoes so podem ser criadas ou alteradas por usuarios autorizados e que a media do usuario avaliado e recalculada quando necessario.

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo                        | Descricao                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `criar(dados, avaliadorId)`   | Cria avaliacao quando participante autorizado avalia o outro                                                   |
| `criar(dados, avaliadorId)`   | Impede avaliacao por usuario nao participante, item invalido, prazo expirado, duplicidade e interesse invalido |
| `atualizar(id, dados, actor)` | Atualiza nota/comentario apenas pelo autor e recalcula media quando necessario                                 |
| `deletar(id, actor)`          | Permite remocao pelo autor ou ADMINISTRADOR; impede remocao por terceiros                                      |
| `buscarPorId(id)`             | Retorna avaliacao ou lanca 404 se nao encontrada                                                               |
| `listarPorUsuario(filtros)`   | Lista avaliacoes com filtros e paginacao customizada                                                           |

### 3.2 Fora do Escopo

- Teste de prazo de 30 dias.
- Teste de avaliacao duplicada.
- Teste de delecao autorizada com recalc completo.

---

## 4. Estrategia

**Abordagem:** teste unitario com repositories de avaliacao, item, interesse e usuario mockados.

### 4.1 Arquivo de Teste

```text
src/tests/services/AvaliacaoService.spec.js
```

---

## 5. Cenarios de Teste

| ID        | Descricao                                | Mock Configurado                                                   | Resultado Esperado                                 | Status |
| --------- | ---------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- | ------ |
| --        | ---------                                | ----------------                                                   | ------------------                                 | ------ |
| AVA-SV-01 | Interessado avalia doador                | item `DOADO`, interesse `ACEITO`, avaliado existe, sem duplicidade | avaliacao criada e media do doador atualizada      | PASSOU |
| AVA-SV-02 | Usuario que nao participou tenta avaliar | item `DOADO`, interesse aceito por outro usuario                   | erro `403` e avaliacao nao criada                  | PASSOU |
| AVA-SV-03 | Doador avalia interessado                | item `DOADO`, interesse `ACEITO`, doador como avaliador            | avaliacao criada e media do interessado atualizada | PASSOU |
| AVA-SV-04 | Item nao encontrado                      | item retorna null                                                  | erro `404` e avaliacao nao criada                  | PASSOU |
| AVA-SV-05 | Item nao esta DOADO                      | item com status `DISPONIVEL`                                       | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-06 | Item sem data de doacao                  | item sem `data_doacao`                                             | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-07 | Prazo de 30 dias expirou                 | `data_doacao` com 31 dias atras                                    | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-08 | Usuario avaliado nao encontrado          | `usuarioRepository` retorna null                                   | erro `404` e avaliacao nao criada                  | PASSOU |
| AVA-SV-09 | Item sem interesse aceito vinculado      | item sem `interesse_aceito_id`                                     | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-10 | Interesse buscado retorna nulo           | `interesseRepository` retorna null                                 | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-11 | Interesse com status invalido            | interesse com status `CANCELADO`                                   | erro `400` e avaliacao nao criada                  | PASSOU |
| AVA-SV-12 | Avaliacao duplicada                      | `buscarPorAvaliadorItemTipo` retorna avaliacao existente           | erro `409` e avaliacao nao criada                  | PASSOU |
| AVA-SV-13 | Doador avalia interessado incorreto      | doador tenta avaliar usuario incorreto como interessado            | erro `403` e avaliacao nao criada                  | PASSOU |
| AVA-SV-14 | Autor atualiza nota                      | avaliacao pertence ao actor                                        | nota atualizada e media recalculada                | PASSOU |
| AVA-SV-15 | Autor atualiza comentario                | avaliacao pertence ao actor, dados sem nota                        | comentario atualizado sem recalcular media         | PASSOU |
| AVA-SV-16 | Avaliacao nao encontrada ao atualizar    | `buscarPorId` retorna null                                         | erro `404` e repository nao chamado                | PASSOU |
| AVA-SV-17 | Usuario diferente tenta atualizar        | avaliacao pertence a outro avaliador                               | erro `403` e repository nao chamado                | PASSOU |
| AVA-SV-18 | Usuario sem autenticacao ao atualizar    | usuario sem `id` nem `_id`                                         | erro `401` e repository nao chamado                | PASSOU |
| AVA-SV-19 | Usuario diferente tenta remover          | avaliacao pertence a outro avaliador                               | erro `403` e repository de delecao nao chamado     | PASSOU |
| AVA-SV-20 | Autor deleta propria avaliacao           | avaliacao pertence ao actor                                        | avaliacao removida e media recalculada             | PASSOU |
| AVA-SV-21 | Admin deleta avaliacao de outro usuario  | actor com perfil `ADMINISTRADOR`                                   | avaliacao removida sem verificar autoria           | PASSOU |
| AVA-SV-22 | Avaliacao nao encontrada ao deletar      | `buscarPorId` retorna null                                         | erro `404` e repository nao chamado                | PASSOU |
| AVA-SV-23 | Usuario sem autenticacao ao deletar      | usuario sem `id` nem `_id`                                         | erro `401` e repository nao chamado                | PASSOU |
| AVA-SV-24 | Avaliacao encontrada no buscarPorId      | `buscarPorId` retorna avaliacao                                    | avaliacao retornada corretamente                   | PASSOU |
| AVA-SV-25 | Avaliacao nao encontrada no buscarPorId  | `buscarPorId` retorna null                                         | erro `404`                                         | PASSOU |
| AVA-SV-26 | Listagem com paginacao padrao            | listar com filtros e paginacao padrao                              | repository chamado com `page 1` e `limit 20`       | PASSOU |
| AVA-SV-27 | Listagem com paginacao customizada       | listar com `page 2` e `limit 10`                                   | repository chamado com parametros customizados     | PASSOU |

---

## 6. Resultado de Execucao

| Suite            | Arquivo                             | Testes | Aprovados | Reprovados | Status |
| ---------------- | ----------------------------------- | ------ | --------- | ---------- | ------ |
| AvaliacaoService | `services/AvaliacaoService.spec.js` | **27** | **27**    | **0**      | PASSOU |

---

## 7. Observacoes

- A cobertura atual valida o fluxo principal e permissoes centrais.
- As rotas HTTP correspondentes sao cobertas em `src/tests/routes/avaliacao.spec.js`.
