# Plano de Teste - Autenticacao

## API DoaI - Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de autenticacao da API DoaI. O modulo nao possui um `AuthService` dedicado; as rotas de autenticacao delegam regras para o `UsuarioService` e controlam o contrato HTTP pelo `AutenticacaoController`.

---

## 2. Objetivo

Validar que as rotas de autenticacao respondem corretamente aos fluxos principais de acesso, recuperacao de senha, renovacao de token e logout.

---

## 3. Escopo

### 3.1 Rotas Testadas

| Rota | Descricao |
| ---- | --------- |
| `POST /auth/login` | Autentica usuario e retorna token |
| `POST /auth/esqueci-senha` | Solicita recuperacao de senha |
| `PUT /auth/redefinir-senha` | Redefine senha com token |
| `POST /auth/refresh-token` | Gera novo token para usuario autenticado |
| `POST /auth/logout` | Invalida token informado no header |

### 3.2 Fora do Escopo

- Envio real de e-mail.
- Persistencia real do token de recuperacao.
- Fluxo completo de refresh token persistente.

---

## 4. Estrategia

**Abordagem:** teste de route/controller com `Supertest`, usando `usuarioService` mockado e `tokenBlacklist` real para validar logout.

### 4.1 Arquivo de Teste

```text
src/tests/routes/auth.spec.js
```

### 4.2 Comandos

```powershell
npm.cmd test -- --runInBand src/tests/routes/auth.spec.js
npm.cmd run test:coverage -- --runInBand
```

---

## 5. Cenarios de Teste

| ID | Descricao | Resultado Esperado | Status |
| -- | --------- | ------------------ | ------ |
| AUTH-01 | Login com credenciais validas | `200` com token e usuario | PASSOU |
| AUTH-02 | Login com payload invalido | `400` e service nao chamado | PASSOU |
| AUTH-03 | Solicitacao de recuperacao de senha | `200` com mensagem padronizada | PASSOU |
| AUTH-04 | Redefinicao de senha com token valido | `200` com confirmacao | PASSOU |
| AUTH-05 | Refresh token autenticado | `200` com novo token | PASSOU |
| AUTH-06 | Logout com bearer token | `200` e token adicionado a blacklist | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| ----- | ------- | ------ | --------- | ---------- | ------ |
| Autenticacao Routes | `routes/auth.spec.js` | **6** | **6** | **0** | PASSOU |

---

## 7. Observacoes

- As regras de login, conta suspensa e conta inativa tambem aparecem no plano de `UsuarioService`.
- O teste de logout usa `tokenBlacklist` real para garantir que o token foi invalidado em memoria.
