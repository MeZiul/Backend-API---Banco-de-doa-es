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

| Metodo | Descricao |
| ------ | --------- |
| `criar(dados, avaliadorId)` | Cria avaliacao quando o interessado aceito avalia o doador |
| `criar(dados, avaliadorId)` | Impede avaliacao por usuario que nao participou da doacao |
| `atualizar(id, dados, actor)` | Atualiza nota apenas pelo autor e recalcula media |
| `deletar(id, actor)` | Impede remocao por usuario que nao e autor |

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

### 4.2 Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/AvaliacaoService.spec.js
npm.cmd run test:coverage -- --runInBand
```

---

## 5. Cenarios de Teste

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| -- | --------- | ---------------- | ------------------ | ------ |
| AVA-SV-01 | Interessado aceito avalia o doador | item `DOADO`, interesse `ACEITO`, avaliado existe, sem duplicidade | avaliacao criada e media do doador atualizada | PASSOU |
| AVA-SV-02 | Usuario que nao participou tenta avaliar | item `DOADO`, interesse aceito por outro usuario | erro `403` e avaliacao nao criada | PASSOU |
| AVA-SV-03 | Autor atualiza nota | avaliacao pertence ao actor | nota atualizada e media recalculada | PASSOU |
| AVA-SV-04 | Usuario diferente tenta remover avaliacao | avaliacao pertence a outro avaliador | erro `403` e repository de delecao nao e chamado | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| ----- | ------- | ------ | --------- | ---------- | ------ |
| AvaliacaoService | `services/AvaliacaoService.spec.js` | **4** | **4** | **0** | PASSOU |

---

## 7. Observacoes

- A cobertura atual valida o fluxo principal e permissoes centrais.
- As rotas HTTP correspondentes sao cobertas em `src/tests/routes/avaliacao.spec.js`.
