# Plano de Teste — ItemDoacaoService

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI — Banco de Doacoes 

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `ItemDoacaoService`, camada responsavel pelas regras de negocio de criacao, atualizacao, cancelamento e gerenciamento de estados dos itens de doacao.

O documento foi atualizado para refletir a cobertura completa de 100% dos branches do service, totalizando 36 cenarios de teste.

---

## 2. Objetivo

Validar que itens de doacao so podem ser criados, alterados ou cancelados por usuarios autorizados, que todas as validacoes de negocio sao aplicadas corretamente e que os estados do item seguem o fluxo esperado.

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo | Descricao |
| :--- | :--- |
| `criar(dadosItem, usuario)` | Cria item se usuario ATIVO e campos obrigatorios preenchidos |
| `cancelarItem(id, motivo, usuario)` | Cancela item se for o dono ou ADMINISTRADOR; impede se ja CANCELADO ou DOADO |
| `listarInteresses(id, usuario)` | Lista interessados apenas se for o dono do item |
| `confirmarEntrega(id, usuarioId)` | Atualiza status para AGUARDANDO_CONFIRMACAO se RESERVADO |
| `confirmarRecebimento(id, usuarioId)` | Atualiza status para DOADO se AGUARDANDO_CONFIRMACAO |
| `buscarDetalhes(id)` | Retorna detalhes do item ou lanca 404 |
| `atualizar(id, dados, usuarioId)` | Atualiza item se for o dono e status DISPONIVEL; ignora campos sensiveis |
| `deletar(id, usuarioId)` | Deleta item se for o dono e status nao bloqueante |
| `listarDisponiveis(filtros)` | Lista itens disponiveis com filtros e paginacao |

### 3.2 Fora do Escopo

- Testes de persistencia direta em banco de dados real (MongoDB).
- Fluxo de upload ou remocao de imagens associadas ao item de doacao.
- Logica de aceite ou recusa de um interesse especifico (coberto em `interesse.spec.js`).

---

## 4. Estrategia

**Abordagem:** teste unitario com repositories de item, categoria e interesse mockados via `jest.fn()`.

### 4.1 Arquivo de Teste

```text
src/tests/services/ItemDoacaoService.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 criar

**Regras cobertas:** RF-ITM-001, RN-ITM-002

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-01 | Cria item com sucesso se usuario ATIVO | usuario ATIVO, campos preenchidos | item criado com _id retornado | PASSOU |
| ITM-SV-02 | Lanca 403 se usuario INATIVO | usuario com situacao INATIVO | erro 403 e repository nao chamado | PASSOU |
| ITM-SV-03 | Lanca 403 se usuario SUSPENSO | usuario com situacao SUSPENSO | erro 403 e repository nao chamado | PASSOU |
| ITM-SV-04 | Lanca 400 se campos obrigatorios ausentes | dados sem titulo, descricao, categoria ou condicao | erro 400 e repository nao chamado | PASSOU |
| ITM-SV-05 | Usa cidade e uf do usuario se nao informados no item | dados sem cidade/uf, usuario com cidade Vilhena | repository chamado com cidade e uf do usuario | PASSOU |
| ITM-SV-06 | Usa cidade e uf do item se informados | dados com cidade Porto Velho | repository chamado com cidade do item | PASSOU |

---

### 5.2 cancelarItem

**Regras cobertas:** RF-ITM-001, RN-ITM-003

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-07 | Cancela item se for o dono | item com usuario_id do actor, status DISPONIVEL | status atualizado para CANCELADO | PASSOU |
| ITM-SV-08 | Lanca 403 se tentar cancelar item de outro usuario | item com usuario_id diferente do actor | erro 403 e repository nao chamado | PASSOU |
| ITM-SV-09 | Lanca 404 se item nao encontrado ao cancelar | buscarPorId retorna null | erro 404 e repository nao chamado | PASSOU |
| ITM-SV-10 | Lanca 400 se item ja esta CANCELADO | item com status CANCELADO | erro 400 e repository nao chamado | PASSOU |
| ITM-SV-11 | Lanca 400 se item ja esta DOADO | item com status DOADO | erro 400 e repository nao chamado | PASSOU |
| ITM-SV-12 | Permite que ADMINISTRADOR cancele item de outro usuario | actor com perfil ADMINISTRADOR | status atualizado para CANCELADO com motivo | PASSOU |

---

### 5.3 listarInteresses

**Regras cobertas:** RN-ITM-004, RN-ITM-005

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-13 | Lista interessados se for o dono do item | item com usuario_id do actor | lista com 1 interessado retornada | PASSOU |
| ITM-SV-14 | Impede ADMINISTRADOR que nao seja o dono de listar | item com usuario_id diferente, actor ADMINISTRADOR | erro 403 e listarPorItem nao chamado | PASSOU |
| ITM-SV-15 | Lanca 404 se item nao encontrado ao listar interesses | buscarPorId retorna null | erro 404 e listarPorItem nao chamado | PASSOU |
| ITM-SV-16 | Lanca 403 se usuario nao for o dono do item | item com usuario_id diferente do actor | erro 403 e listarPorItem nao chamado | PASSOU |

---

### 5.4 confirmarEntrega

**Regras cobertas:** RF-ITM-002

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-17 | Atualiza status para AGUARDANDO_CONFIRMACAO | item RESERVADO, actor e o doador | atualizar chamado com status AGUARDANDO_CONFIRMACAO | PASSOU |
| ITM-SV-18 | Lanca 404 se item nao encontrado ao confirmar entrega | buscarPorId retorna null | erro 404 e atualizar nao chamado | PASSOU |
| ITM-SV-19 | Lanca 403 se usuario nao for o doador | item com usuario_id diferente do actor | erro 403 e atualizar nao chamado | PASSOU |
| ITM-SV-20 | Lanca 400 se item nao esta RESERVADO | item com status DISPONIVEL | erro 400 e atualizar nao chamado | PASSOU |

---

### 5.5 confirmarRecebimento

**Regras cobertas:** RF-ITM-003

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-21 | Atualiza status para DOADO | item AGUARDANDO_CONFIRMACAO | status atualizado para DOADO com data_doacao | PASSOU |
| ITM-SV-22 | Lanca 404 se item nao encontrado ao confirmar recebimento | buscarPorId retorna null | erro 404 e atualizar nao chamado | PASSOU |
| ITM-SV-23 | Lanca 400 se item nao esta AGUARDANDO_CONFIRMACAO | item com status RESERVADO | erro 400 e atualizar nao chamado | PASSOU |

---

### 5.6 buscarDetalhes

**Regras cobertas:** RN-ITM-005

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-24 | Retorna item quando encontrado | buscarDetalhes retorna item | item retornado corretamente | PASSOU |
| ITM-SV-25 | Lanca 404 se item nao encontrado | buscarDetalhes retorna null | erro 404 | PASSOU |

---

### 5.7 atualizar

**Regras cobertas:** RN-ITM-003

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-26 | Atualiza item com sucesso se for o dono e DISPONIVEL | item DISPONIVEL, actor e o dono | item atualizado com novo titulo | PASSOU |
| ITM-SV-27 | Lanca 404 se item nao encontrado ao atualizar | buscarPorId retorna null | erro 404 e atualizar nao chamado | PASSOU |
| ITM-SV-28 | Lanca 403 se usuario nao for o dono ao atualizar | item com usuario_id diferente do actor | erro 403 e atualizar nao chamado | PASSOU |
| ITM-SV-29 | Lanca 400 se item nao esta DISPONIVEL ao atualizar | item com status RESERVADO | erro 400 e atualizar nao chamado | PASSOU |
| ITM-SV-30 | Ignora campos sensiveis na atualizacao | dados com status, usuario_id e interesse_aceito_id | atualizar chamado sem os campos sensiveis | PASSOU |

---

### 5.8 deletar

**Regras cobertas:** RN-ITM-003

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-31 | Deleta item com sucesso se for o dono | item DISPONIVEL, actor e o dono | deletar chamado com id correto | PASSOU |
| ITM-SV-32 | Lanca 404 se item nao encontrado ao deletar | buscarPorId retorna null | erro 404 e deletar nao chamado | PASSOU |
| ITM-SV-33 | Lanca 403 se usuario nao for o dono ao deletar | item com usuario_id diferente do actor | erro 403 e deletar nao chamado | PASSOU |
| ITM-SV-34 | Lanca 400 se item esta RESERVADO ao deletar | item com status RESERVADO | erro 400 e deletar nao chamado | PASSOU |
| ITM-SV-35 | Lanca 400 se item esta AGUARDANDO_CONFIRMACAO ao deletar | item com status AGUARDANDO_CONFIRMACAO | erro 400 e deletar nao chamado | PASSOU |

---

### 5.9 listarDisponiveis

**Regras cobertas:** RF-ITM-001

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- |
| ITM-SV-36 | Lista itens disponiveis com filtros e paginacao | listarDisponiveis retorna lista paginada | repository chamado com filtros e paginacao corretos | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| ItemDoacaoService | `services/ItemDoacaoService.spec.js` | **36** | **36** | **0** | PASSOU |

---

## 7. Resumo dos Cenarios (Rastreabilidade)

| ID | Metodo | Descricao | Regra | Status |
| :--- | :--- | :--- | :--- | :---: |
| ITM-SV-01 | `criar` | Cria item com sucesso se usuario ATIVO | RF-ITM-001 | PASSOU |
| ITM-SV-02 | `criar` | Lanca 403 se usuario INATIVO | RF-ITM-001 | PASSOU |
| ITM-SV-03 | `criar` | Lanca 403 se usuario SUSPENSO | RF-ITM-001 | PASSOU |
| ITM-SV-04 | `criar` | Lanca 400 se campos obrigatorios ausentes | RN-ITM-002 | PASSOU |
| ITM-SV-05 | `criar` | Usa cidade e uf do usuario se nao informados no item | RF-ITM-001 | PASSOU |
| ITM-SV-06 | `criar` | Usa cidade e uf do item se informados | RF-ITM-001 | PASSOU |
| ITM-SV-07 | `cancelarItem` | Cancela item se for o dono | RF-ITM-001 | PASSOU |
| ITM-SV-08 | `cancelarItem` | Lanca 403 se tentar cancelar item de outro usuario | RN-ITM-003 | PASSOU |
| ITM-SV-09 | `cancelarItem` | Lanca 404 se item nao encontrado ao cancelar | RN-ITM-003 | PASSOU |
| ITM-SV-10 | `cancelarItem` | Lanca 400 se item ja esta CANCELADO | RN-ITM-003 | PASSOU |
| ITM-SV-11 | `cancelarItem` | Lanca 400 se item ja esta DOADO | RN-ITM-003 | PASSOU |
| ITM-SV-12 | `cancelarItem` | Permite que ADMINISTRADOR cancele item de outro usuario | RN-ITM-003 | PASSOU |
| ITM-SV-13 | `listarInteresses` | Lista interessados se for o dono do item | RN-ITM-004 | PASSOU |
| ITM-SV-14 | `listarInteresses` | Impede ADMINISTRADOR que nao seja o dono de listar | RN-ITM-004 | PASSOU |
| ITM-SV-15 | `listarInteresses` | Lanca 404 se item nao encontrado ao listar interesses | RN-ITM-005 | PASSOU |
| ITM-SV-16 | `listarInteresses` | Lanca 403 se usuario nao for o dono do item | RN-ITM-004 | PASSOU |
| ITM-SV-17 | `confirmarEntrega` | Atualiza status para AGUARDANDO_CONFIRMACAO | RF-ITM-002 | PASSOU |
| ITM-SV-18 | `confirmarEntrega` | Lanca 404 se item nao encontrado ao confirmar entrega | RF-ITM-002 | PASSOU |
| ITM-SV-19 | `confirmarEntrega` | Lanca 403 se usuario nao for o doador | RF-ITM-002 | PASSOU |
| ITM-SV-20 | `confirmarEntrega` | Lanca 400 se item nao esta RESERVADO | RF-ITM-002 | PASSOU |
| ITM-SV-21 | `confirmarRecebimento` | Atualiza status para DOADO | RF-ITM-003 | PASSOU |
| ITM-SV-22 | `confirmarRecebimento` | Lanca 404 se item nao encontrado ao confirmar recebimento | RF-ITM-003 | PASSOU |
| ITM-SV-23 | `confirmarRecebimento` | Lanca 400 se item nao esta AGUARDANDO_CONFIRMACAO | RF-ITM-003 | PASSOU |
| ITM-SV-24 | `buscarDetalhes` | Retorna item quando encontrado | RN-ITM-005 | PASSOU |
| ITM-SV-25 | `buscarDetalhes` | Lanca 404 se item nao encontrado | RN-ITM-005 | PASSOU |
| ITM-SV-26 | `atualizar` | Atualiza item com sucesso se for o dono e DISPONIVEL | RN-ITM-003 | PASSOU |
| ITM-SV-27 | `atualizar` | Lanca 404 se item nao encontrado ao atualizar | RN-ITM-003 | PASSOU |
| ITM-SV-28 | `atualizar` | Lanca 403 se usuario nao for o dono ao atualizar | RN-ITM-003 | PASSOU |
| ITM-SV-29 | `atualizar` | Lanca 400 se item nao esta DISPONIVEL ao atualizar | RN-ITM-003 | PASSOU |
| ITM-SV-30 | `atualizar` | Ignora campos sensiveis na atualizacao | RN-ITM-003 | PASSOU |
| ITM-SV-31 | `deletar` | Deleta item com sucesso se for o dono | RN-ITM-003 | PASSOU |
| ITM-SV-32 | `deletar` | Lanca 404 se item nao encontrado ao deletar | RN-ITM-003 | PASSOU |
| ITM-SV-33 | `deletar` | Lanca 403 se usuario nao for o dono ao deletar | RN-ITM-003 | PASSOU |
| ITM-SV-34 | `deletar` | Lanca 400 se item esta RESERVADO ao deletar | RN-ITM-003 | PASSOU |
| ITM-SV-35 | `deletar` | Lanca 400 se item esta AGUARDANDO_CONFIRMACAO ao deletar | RN-ITM-003 | PASSOU |
| ITM-SV-36 | `listarDisponiveis` | Lista itens disponiveis com filtros e paginacao | RF-ITM-001 | PASSOU |

---

## 8. Observacoes

- A cobertura atual valida todos os branches do `ItemDoacaoService`, incluindo fluxos de erro, permissoes e transicoes de estado.
- Os testes foram  **36 cenarios** para atingir cobertura de 100%.
