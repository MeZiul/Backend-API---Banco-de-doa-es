# Plano de Teste - AdministracaoService

## API DoaI - Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `AdministracaoService`, camada responsavel por moderacao administrativa, bloqueio de usuarios, resolucao de denuncias e registro de acoes administrativas.

---

## 2. Objetivo

Validar que somente administradores executam operacoes administrativas e que a moderacao registra a acao aplicada no historico administrativo.

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo | Descricao |
| ------ | --------- |
| `bloquearUsuario(id, dados, actor)` | Bloqueia usuario e registra acao administrativa |
| `listar(params, actor)` | Impede listagem por usuario sem perfil administrativo |
| `resolverDenuncia(id, dados, actor)` | Resolve denuncia procedente contra item e cancela item |

### 3.2 Fora do Escopo

- Testes de desbloqueio.
- Testes de inativacao administrativa de usuario.
- Testes de repository com banco real.

---

## 4. Estrategia

**Abordagem:** teste unitario com repositories mockados para usuarios, itens, denuncias e registros administrativos.

### 4.1 Arquivo de Teste

```text
src/tests/services/AdministracaoService.spec.js
```

### 4.2 Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/AdministracaoService.spec.js
npm.cmd run test:coverage -- --runInBand
```

---

## 5. Cenarios de Teste

| ID | Descricao | Mock Configurado | Resultado Esperado | Status |
| -- | --------- | ---------------- | ------------------ | ------ |
| ADM-SV-01 | Bloqueia usuario e registra acao | usuario `ATIVO`, admin autenticado | usuario vira `SUSPENSO` e acao `BLOQUEIO_USUARIO` e registrada | PASSOU |
| ADM-SV-02 | Usuario comum tenta listar administracao | actor com perfil `USUARIO` | erro `403` por falta de permissao | PASSOU |
| ADM-SV-03 | Resolve denuncia procedente contra item | denuncia `EM_ANALISE`, item disponivel, admin autenticado | item vira `CANCELADO`, denuncia vira `PROCEDENTE` e acao e registrada | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| ----- | ------- | ------ | --------- | ---------- | ------ |
| AdministracaoService | `services/AdministracaoService.spec.js` | **3** | **3** | **0** | PASSOU |

---

## 7. Observacoes

- A cobertura atual valida o fluxo central de moderacao, mas ainda pode ser expandida para desbloqueio, exclusao logica e filtros de auditoria.
- As rotas HTTP correspondentes sao cobertas em `src/tests/routes/administracao.spec.js`.
