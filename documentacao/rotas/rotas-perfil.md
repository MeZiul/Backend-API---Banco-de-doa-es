# Plano de Teste — Rotas de Perfil

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP e integracao da rota de gerenciamento de perfis da API REST DoaI. O teste valida o comportamento estrutural do endpoint administrativo e a protecao de acesso (middlewares), utilizando a abordagem validada de **Mock Nativo** e importacao direta do Router Oficial.

---

## 2. Objetivo

Validar que a rota de perfil responde corretamente e o roteamento atinge o controlador, cobrindo:

- Mapeamento exato do metodo `PATCH` em ambiente restrito (`/admin/...`).
- Conectividade do endpoint sem falhas de sintaxe interna (evitando `TypeError`).
- Protecao e interceptacao pelo `AuthMiddleware`.

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo | Rota                              | Autenticacao   |
| :----- | :-------------------------------- | :------------- |
| PATCH  | `/admin/usuarios/:id/perfil`      | ADMINISTRADOR  |

### 3.2 Fora do Escopo

- Testes de persistencia direta no MongoDB.
- Regras de negocio aprofundadas do `UsuarioService` (cobertas na suite do servico).

---

## 4. Estrategia

**Abordagem:** Teste de Contrato de Roteamento Blindado (Mock Nativo).
A suite mocka a camada de dados (Mongoose) para evitar vazamento de transacoes e carrega o router `perfilRoutes.js` diretamente para o `supertest`, contornando problemas de escopo e `bind` na engine do Node.

### 4.1 Apps de Teste

| App        | Perfil Simulado                                  | Contexto de Uso       |
| :--------- | :----------------------------------------------- | :-------------------- |
| `appAdmin` | `{ id: testIds.admin, perfil: "ADMINISTRADOR" }` | Acesso administrativo |

### 4.2 Arquivo de Teste

```text
src/tests/routes/perfil.spec.js
```

### 4.3 Comandos

```bash
npm test -- --testPathPattern=routes/perfil
npm run test:coverage
```

---

## 5. Cenarios de Teste (Mock Nativo)

### 5.1 PATCH /admin/usuarios/:id/perfil — gerenciarAcesso

| ID    | Descricao                                          | Payload Enviado                | Mock Aplicado   | Validacao                             | Status |
| :---- | :------------------------------------------------- | :----------------------------- | :-------------- | :------------------------------------ | :----: |
| RT-01 | Valida estrutura e acesso ao endpoint de perfil    | `{ perfil: "ADMINISTRADOR" }` | Modelo Mongoose | `res.statusCode` definido (sem crash) | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Rotas Perfil | `routes/perfil.spec.js` | **1** | **1** | **0** | **PASSOU** |

---

## 7. Criterios de Aceitacao

- O endpoint administrativo acessivel e respondendo atraves do supertest sem erros nativos do Express.
- Rota carregada dinamicamente simulando a arvore de rotas principal do sistema.
