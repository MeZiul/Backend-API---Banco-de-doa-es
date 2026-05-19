# Plano de Teste - DenunciaService

## API DoaI - Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `DenunciaService`, camada responsavel por regras de criacao, listagem e resolucao de denuncias.

---

## 2. Objetivo

Validar que denuncias respeitam o usuario autenticado, o estado `EM_ANALISE` e as acoes administrativas quando uma denuncia e considerada procedente.

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo | Descricao |
| ------ | --------- |
| `listar(params, actor)` | Restringe listagem para denunciante comum |
| `criar(dados, actor)` | Cria denuncia contra item sem duplicidade em analise |
| `resolver(id, dados, actor)` | Resolve denuncia procedente e aplica acao ao alvo |

### 3.2 Fora do Escopo

- Teste com alvo `USUARIO` na criacao.
- Testes de exclusao de denuncia.
- Testes de repository com banco real.

---

## 4. Estrategia

**Abordagem:** teste unitario com `denunciaRepository` e `usuarioRepository` mockados. A busca de item usa spy no model interno do service.

### 4.1 Arquivo de Teste

```text
src/tests/services/DenunciaService.spec.js
```

### 4.2 Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/DenunciaService.spec.js
npm.cmd run test:coverage -- --runInBand
```

---

## 5. Cenarios de Teste

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| -- | --------- | ---------------- | ------------------ | ------ |
| DEN-SV-01 | Usuario comum lista apenas as proprias denuncias | `denunciaRepository.listar` | filtro usa `denunciante_id` do actor | PASSOU |
| DEN-SV-02 | Cria denuncia contra item sem outra em analise | usuario ativo, item valido, sem duplicidade | denuncia criada com status `EM_ANALISE` | PASSOU |
| DEN-SV-03 | Resolve denuncia procedente contra usuario | denuncia `EM_ANALISE`, alvo usuario ativo, admin autenticado | usuario alvo suspenso e denuncia marcada como `PROCEDENTE` | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| ----- | ------- | ------ | --------- | ---------- | ------ |
| DenunciaService | `services/DenunciaService.spec.js` | **3** | **3** | **0** | PASSOU |

---

## 7. Observacoes

- O service tambem possui regras de atualizacao e delecao que podem receber testes adicionais.
- As rotas HTTP correspondentes sao cobertas em `src/tests/routes/denuncia.spec.js`.
