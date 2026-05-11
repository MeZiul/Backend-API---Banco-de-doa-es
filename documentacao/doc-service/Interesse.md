# Plano de Teste - InteresseService

## API DoaI - Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `InteresseService`, camada responsavel pelas regras de manifestacao, listagem e cancelamento de interesses em itens de doacao.

---

## 2. Objetivo

Validar que o service aplica as regras principais de interesse, incluindo restricao por usuario autenticado, criacao somente para item disponivel e cancelamento com reabertura do item quando necessario.

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo | Descricao |
| ------ | --------- |
| `listar(params, actor)` | Restringe listagem para usuario comum |
| `criar(dados, actor)` | Cria interesse para item disponivel |
| `cancelar(id, actor)` | Cancela interesse e reabre item quando o interesse estava aceito |

### 3.2 Fora do Escopo

- Testes de repository com banco real.
- Testes completos de aceitar e recusar interesse.
- Testes E2E com frontend.

---

## 4. Estrategia

**Abordagem:** teste unitario com `interesseRepository` e `usuarioRepository` mockados. O model de item e mockado pontualmente com `jest.spyOn`.

### 4.1 Arquivo de Teste

```text
src/tests/services/InteresseService.spec.js
```

### 4.2 Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/InteresseService.spec.js
npm.cmd run test:coverage -- --runInBand
```

---

## 5. Cenarios de Teste

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| -- | --------- | ---------------- | ------------------ | ------ |
| INT-SV-01 | Usuario comum lista apenas os proprios interesses | `interesseRepository.listar` | filtro troca `usuarioInteressadoId` por `usuario_interessado_id` do actor | PASSOU |
| INT-SV-02 | Cria interesse com item disponivel e usuario ativo | usuario ativo, item `DISPONIVEL`, sem interesse ativo | interesse `PENDENTE` criado e contador do item incrementado | PASSOU |
| INT-SV-03 | Cancela interesse aceito | interesse `ACEITO` e item vinculado | interesse vira `CANCELADO` e item volta para `DISPONIVEL` | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| ----- | ------- | ------ | --------- | ---------- | ------ |
| InteresseService | `services/InteresseService.spec.js` | **3** | **3** | **0** | PASSOU |

---

## 7. Observacoes

- A cobertura atual valida o fluxo principal, mas ainda pode ser expandida para aceitar, recusar, duplicidade e permissao de doador.
- As rotas HTTP correspondentes sao cobertas em `src/tests/routes/interesse.spec.js`.
