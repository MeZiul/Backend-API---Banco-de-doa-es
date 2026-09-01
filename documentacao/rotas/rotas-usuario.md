# Plano de Teste — Rotas de Usuario

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP das rotas de usuario da API REST DoaI. Os testes validam status HTTP, payload, autenticação por sessão Better Auth e autorização por perfil, com o `UsuarioService` isolado.

A suite importa o arquivo de rotas real (`usuarioRoutes.js`) e exercita a cadeia completa de middlewares (`AuthMiddleware`, `authorize`) antes de chegar ao controller, garantindo que o arquivo de rotas seja efetivamente coberto pelos testes.

---

## 2. Objetivo

Validar que as rotas de usuario respondem corretamente a cada cenario, cobrindo:

- Status HTTP corretos para cada operacao — 200, 201, 204, 400, 401, 403, 404, 498
- Payload de resposta conforme o contrato da API
- Senha nunca exposta na resposta — RN-USR-004
- Autenticação via token opaco de sessão no header Bearer
- Controle de acesso por perfil — USUARIO vs ADMINISTRADOR
- Validacao de entrada via Zod antes de chegar ao service
- Propagacao correta dos erros do service para o cliente

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo   | Rota                      | Autenticacao     | RF/RN                                                  |
| -------- | ------------------------- | ---------------- | ------------------------------------------------------ |
| `POST`   | `/usuario`                | Publico          | RF-001, RN-USR-004, RN-USR-005, RN-USR-006, RN-USR-007 |
| `GET`    | `/usuario`                | Token            | RF-014                                                 |
| `GET`    | `/usuario/:id`            | Token            | RF-014                                                 |
| `PUT`    | `/usuario/:id`            | Token dono/admin | RF-004, RN-USR-012                                     |
| `PATCH`  | `/usuario/:id`            | Token dono/admin | RF-004, RN-USR-012                                     |
| `DELETE` | `/usuario/:id`            | Token dono       | RF-020, RN-USR-018, RN-USR-019                         |
| `GET`    | `/usuario/:id/itens`      | Token            | RF-015                                                 |
| `GET`    | `/usuario/:id/avaliacoes` | Token            | RF-017                                                 |
| `PATCH`  | `/usuario/:id/suspender`  | ADMINISTRADOR    | RN-USR-025                                             |
| `PATCH`  | `/usuario/:id/reativar`   | ADMINISTRADOR    | RN-USR-026                                             |

### 3.2 Fora do Escopo

- Testes de regras de negocio (cobertos em `services/usuarioService.spec.js`)
- Testes de repository com banco real
- Testes E2E com frontend

---

## 4. Estrategia

**Abordagem:** testes de contrato HTTP — o `UsuarioService` e completamente mockado via `jest.mock()`. As requisicoes HTTP sao feitas com `supertest` contra um app Express que monta o roteador real de usuario (`usuarioRoutes.js`), de modo que a cadeia de middlewares e o proprio arquivo de rotas sejam exercitados e contabilizados na cobertura.

### 4.1 Autenticação por sessão

As rotas protegidas exigem Bearer válido. Nos testes de route, um middleware exclusivo de teste decodifica uma identidade controlada; o middleware Better Auth de produção é validado separadamente em `AuthMiddleware.spec.js` e `better-auth-smoke.js`.

| Helper          | Perfil Simulado                                  | Usado em                                          |
| --------------- | ------------------------------------------------ | ------------------------------------------------- |
| `usuarioAuth()` | `{ id: testIds.usuario, perfil: "USUARIO" }`     | GET, PUT, PATCH, DELETE, listarItens, avaliacoes  |
| `adminAuth()`   | `{ id: testIds.admin, perfil: "ADMINISTRADOR" }` | suspender, reativar                               |

A rota `POST /usuario` e publica e e testada sem token.

### 4.3 Arquivo de Teste

```
src/tests/routes/usuario.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 POST /usuario — Cadastrar (Publico)

**RF-001 | RN-USR-004, RN-USR-005, RN-USR-006, RN-USR-007**

| ID    | Descricao                                   | Payload Enviado                               | Mock Service                              | Status HTTP | Validacao                          | Status |
| ----- | ------------------------------------------- | --------------------------------------------- | ----------------------------------------- | ----------- | ---------------------------------- | ------ |
| RT-01 | Cadastro valido retorna 201 sem campo senha | `nome, email, cpf, senha, cidade, uf` validos | `cadastrar: usuario (toObject sem senha)` | `201`       | `data.senha` undefined             | PASSOU |
| RT-02 | Email duplicado retorna 400                 | Email ja existente no sistema                 | `cadastrar: CustomError 400`              | `400`       | mensagem e-mail ja cadastrado      | PASSOU |
| RT-03 | Campos obrigatorios ausentes retorna 400    | Apenas `email` no body                        | Zod valida antes do service               | `400`       | validacao Zod, service nao chamado | PASSOU |

---

### 5.2 GET /usuario — Listar

**RF-014**

| ID    | Descricao                                             | Payload Enviado            | Mock Service                                     | Status HTTP | Validacao                  | Status |
| ----- | ----------------------------------------------------- | -------------------------- | ------------------------------------------------ | ----------- | -------------------------- | ------ |
| RT-04 | Requisicao sem token retorna 498                      | GET sem header Authorization | nao chega ao service                           | `498`       | bloqueado pelo AuthMiddleware | PASSOU |
| RT-05 | Listar usuarios autenticado retorna 200 com paginacao | GET com token de usuario   | `listar: { docs: [...], totalDocs: 1, page: 1 }` | `200`       | `data.docs` com 1 item     | PASSOU |

---

### 5.3 GET /usuario/:id — Buscar por ID

**RF-014**

| ID    | Descricao                                  | Payload Enviado        | Mock Service                            | Status HTTP | Validacao               | Status |
| ----- | ------------------------------------------ | ---------------------- | --------------------------------------- | ----------- | ----------------------- | ------ |
| RT-06 | ID valido retorna 200 com dados do usuario | `GET /usuario/507f...` | `buscarPorId: { _id: testIds.usuario }` | `200`       | `data._id` correto      | PASSOU |
| RT-07 | Usuario inexistente retorna 404            | `GET /usuario/507f...` | `buscarPorId: CustomError 404`          | `404`       | mensagem nao encontrado | PASSOU |

---

### 5.4 PUT /usuario/:id — Atualizar Completo

**RF-004 | RN-USR-012**

| ID    | Descricao                              | Payload Enviado       | Mock Service                                  | Status HTTP | Validacao              | Status |
| ----- | -------------------------------------- | --------------------- | --------------------------------------------- | ----------- | ---------------------- | ------ |
| RT-08 | Atualizar proprio usuario retorna 200  | `{ nome: Novo Nome }` | `atualizar: usuario (toObject com nome novo)` | `200`       | `data.nome` atualizado | PASSOU |
| RT-09 | Atualizar usuario de outro retorna 403 | `{ nome: Novo Nome }` | `atualizar: CustomError 403`                  | `403`       | mensagem sem permissao | PASSOU |

---

### 5.5 PATCH /usuario/:id — Atualizar Parcial

**RF-004 | RN-USR-012**

| ID    | Descricao                              | Payload Enviado      | Mock Service                                 | Status HTTP | Validacao             | Status |
| ----- | -------------------------------------- | -------------------- | -------------------------------------------- | ----------- | --------------------- | ------ |
| RT-10 | Atualizacao parcial retorna 200        | `{ bio: Nova bio }`  | `atualizar: usuario (toObject com bio nova)` | `200`       | `data.bio` atualizado | PASSOU |

Observacao: o handler `atualizarParcial` do controller reutiliza `usuarioService.atualizar`, por isso o mock configurado e o de `atualizar`.

---

### 5.6 DELETE /usuario/:id — Excluir

**RF-020 | RN-USR-018, RN-USR-019**

| ID    | Descricao                                   | Payload Enviado          | Mock Service               | Status HTTP | Validacao                     | Status |
| ----- | ------------------------------------------- | ------------------------ | -------------------------- | ----------- | ----------------------------- | ------ |
| RT-11 | Excluir conta com senha correta retorna 204 | `{ senha: Teste@123 }`   | `excluir: { message: ok }` | `204`       | sem body na resposta          | PASSOU |
| RT-12 | Excluir com senha incorreta retorna 401     | `{ senha: SenhaErrada }` | `excluir: CustomError 401` | `401`       | mensagem senha incorreta      | PASSOU |
| RT-13 | Excluir com itens em andamento retorna 400  | `{ senha: Teste@123 }`   | `excluir: CustomError 400` | `400`       | mensagem doacoes em andamento | PASSOU |

---

### 5.7 GET /usuario/:id/itens — Listar Itens

**RF-015**

| ID    | Descricao                                       | Payload Enviado          | Mock Service                     | Status HTTP | Validacao               | Status |
| ----- | ----------------------------------------------- | ------------------------ | -------------------------------- | ----------- | ----------------------- | ------ |
| RT-14 | Listar itens do usuario retorna 200 com array   | `GET /usuario/:id/itens` | `listarItens: [{ _id, titulo }]` | `200`       | data com 1 item         | PASSOU |
| RT-15 | Listar itens de usuario inexistente retorna 404 | `GET /usuario/:id/itens` | `listarItens: CustomError 404`   | `404`       | mensagem nao encontrado | PASSOU |

---

### 5.8 GET /usuario/:id/avaliacoes — Listar Avaliacoes

**RF-017**

| ID    | Descricao                                        | Payload Enviado               | Mock Service                  | Status HTTP | Validacao        | Status |
| ----- | ------------------------------------------------ | ----------------------------- | ----------------------------- | ----------- | ---------------- | ------ |
| RT-16 | Listar avaliacoes do usuario retorna 200         | `GET /usuario/:id/avaliacoes` | `listarAvaliacoes: { docs: [] }` | `200`    | resposta 200     | PASSOU |

---

### 5.9 PATCH /usuario/:id/suspender — Suspender (Admin)

**RN-USR-025**

| ID    | Descricao                                                | Payload Enviado                        | Mock Service                        | Status HTTP | Validacao                  | Status |
| ----- | -------------------------------------------------------- | -------------------------------------- | ----------------------------------- | ----------- | -------------------------- | ------ |
| RT-17 | Usuario comum tentando suspender retorna 403             | `{ motivo, suspensao_ate }` (token usuario) | bloqueado por `authorize`      | `403`       | service nao chamado        | PASSOU |
| RT-18 | Admin suspende usuario retorna 200 com situacao SUSPENSO | `{ motivo, suspensao_ate }` (token admin)   | `suspender: { situacao: SUSPENSO }` | `200`   | `data.situacao = SUSPENSO` | PASSOU |

---

### 5.10 PATCH /usuario/:id/reativar — Reativar (Admin)

**RN-USR-026**

| ID    | Descricao                                                     | Payload Enviado     | Mock Service                    | Status HTTP | Validacao                  | Status |
| ----- | ------------------------------------------------------------- | ------------------- | ------------------------------- | ----------- | -------------------------- | ------ |
| RT-19 | Admin reativa usuario suspenso retorna 200 com situacao ATIVO | sem body (token admin) | `reativar: { situacao: ATIVO }` | `200`    | `data.situacao = ATIVO`    | PASSOU |
| RT-20 | Reativar usuario nao suspenso retorna 400                     | sem body (token admin) | `reativar: CustomError 400`     | `400`    | mensagem nao esta suspenso | PASSOU |

---

## 6. Resultado de Execucao

| Suite         | Arquivo                  | Testes | Aprovados | Reprovados | Status |
| ------------- | ------------------------ | ------ | --------- | ---------- | ------ |
| Rotas Usuario | `routes/usuario.spec.js` | **20** | **20**    | **0**      | PASSOU |

---

## 7. Resumo dos Cenarios

| ID    | Rota                         | Descricao                             | RN                     | Status HTTP | Status |
| ----- | ---------------------------- | ------------------------------------- | ---------------------- | ----------- | ------ |
| RT-01 | POST /usuario                | Cadastro valido sem senha na resposta | RN-USR-004, RN-USR-005 | 201         | PASSOU |
| RT-02 | POST /usuario                | Email duplicado                       | RN-USR-006             | 400         | PASSOU |
| RT-03 | POST /usuario                | Campos obrigatorios ausentes          | RN-USR-007             | 400         | PASSOU |
| RT-04 | GET /usuario                 | Sem token retorna 498                 | RF-014                 | 498         | PASSOU |
| RT-05 | GET /usuario                 | Listagem paginada autenticada         | RF-014                 | 200         | PASSOU |
| RT-06 | GET /usuario/:id             | Busca por ID valido                   | RF-014                 | 200         | PASSOU |
| RT-07 | GET /usuario/:id             | Usuario inexistente                   | RF-014                 | 404         | PASSOU |
| RT-08 | PUT /usuario/:id             | Atualizar proprio usuario             | RN-USR-012             | 200         | PASSOU |
| RT-09 | PUT /usuario/:id             | Atualizar usuario de outro            | RN-USR-012             | 403         | PASSOU |
| RT-10 | PATCH /usuario/:id           | Atualizacao parcial                   | RN-USR-012             | 200         | PASSOU |
| RT-11 | DELETE /usuario/:id          | Excluir com senha correta             | RN-USR-018             | 204         | PASSOU |
| RT-12 | DELETE /usuario/:id          | Excluir com senha incorreta           | RN-USR-018             | 401         | PASSOU |
| RT-13 | DELETE /usuario/:id          | Excluir com itens em andamento        | RN-USR-019             | 400         | PASSOU |
| RT-14 | GET /usuario/:id/itens       | Listar itens do usuario               | RF-015                 | 200         | PASSOU |
| RT-15 | GET /usuario/:id/itens       | Usuario inexistente                   | RF-015                 | 404         | PASSOU |
| RT-16 | GET /usuario/:id/avaliacoes  | Listar avaliacoes do usuario          | RF-017                 | 200         | PASSOU |
| RT-17 | PATCH /usuario/:id/suspender | Usuario comum bloqueado               | RN-USR-025             | 403         | PASSOU |
| RT-18 | PATCH /usuario/:id/suspender | Admin suspende usuario                | RN-USR-025             | 200         | PASSOU |
| RT-19 | PATCH /usuario/:id/reativar  | Admin reativa usuario suspenso        | RN-USR-026             | 200         | PASSOU |
| RT-20 | PATCH /usuario/:id/reativar  | Reativar usuario nao suspenso         | RN-USR-026             | 400         | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes de rotas de usuario aprovados (20/20)
- Nenhuma resposta com campo `senha` exposto
- Status HTTP corretos para todos os cenarios
- Rotas protegidas exigindo sessão válida (498 sem bearer)
- Autorizacao por perfil bloqueando usuario comum em rotas administrativas (403)
- Validacao Zod bloqueando payloads invalidos antes do service
- Propagacao correta de erros do service para o cliente
- Arquivo `usuarioRoutes.js` coberto pelo relatorio de cobertura

---

## 9. Observacoes

- A suíte monta o roteador real (`usuarioRoutes.js`), usa autenticação controlada no Jest e exercita autorização, Zod e controller. A validação real Better Auth + PostgreSQL fica nos testes específicos de autenticação.
- O handler `atualizarParcial` do controller reutiliza `usuarioService.atualizar`; o mock de teste deve configurar `atualizar`, nao `atualizarParcial`.
- O controller `atualizar` repassa `req.user` ao service — a verificacao de ownership e responsabilidade do service via parametro `actor`.
- Os testes de `suspender` e `reativar` usam token de administrador; ha cenario adicional que confirma o bloqueio (403) de usuario comum em rota administrativa.
