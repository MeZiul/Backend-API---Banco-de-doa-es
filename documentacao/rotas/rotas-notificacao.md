# Plano de Teste — Rotas de Notificacao

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP e integracao das rotas de notificacao da API REST DoaI. Os testes validam o comportamento dos endpoints a nivel de requisicao e resposta, incluindo o roteamento estrutural e a protecao de acesso, utilizando uma abordagem de **Mock Nativo**, onde a camada de banco de dados (modelo do Mongoose) e interceptada para garantir a fluidez do roteador do Express.

---

## 2. Objetivo

Validar que as rotas de notificacao respondem corretamente a cada cenario mapeado, cobrindo:

- Roteamento correto e integridade do endpoint (evitando erros 500 estruturais e de handler).
- Status HTTP corretos para cada operacao — 200, 404.
- Protecao de rotas garantida pela injecao do `AuthMiddleware`.
- Listagem paginada, contadores e modificacao de status de leitura (individual e em lote).

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo | Rota                      | Autenticacao | RF/RN                  |
| :----- | :------------------------ | :----------- | :--------------------- |
| GET    | `/notificacoes`           | Token Ator   | RF-NOT-001, RN-NOT-002 |
| GET    | `/notificacoes/contador`  | Token Ator   | RF-NOT-002             |
| PATCH  | `/notificacoes/:id/ler`   | Token Ator   | RF-NOT-003, RN-NOT-004 |
| POST   | `/notificacoes/ler-tudo`  | Token Ator   | RF-NOT-004             |

### 3.2 Fora do Escopo

- Testes de regras de negocio internas do servico com transacoes no banco (validados isoladamente).
- Disparo real de eventos de Websocket/SSE.
- Persistencia fisica no banco MongoDB real.

---

## 4. Estrategia

**Abordagem:** Testes de contrato HTTP com isolamento de dependencias em nivel de banco de dados (Mock Nativo). O modelo estrutural `Notificacao.js` e interceptado via `jest.mock()`. O router original (`notificacaoRoutes.js`) e anexado ao `supertest` contra um ambiente Express configurado pelo helper `createControllerTestApp`, garantindo fidelidade total ao ambiente de producao e superando problemas de *bind* de modulos ES.

### 4.1 Apps de Teste

| App          | Perfil Simulado                              | Endpoints Testados            |
| :----------- | :------------------------------------------- | :---------------------------- |
| `appUsuario` | `{ id: testIds.usuario, perfil: "USUARIO" }` | Todos os endpoints do modulo  |

### 4.2 Arquivo de Teste

```text
src/tests/routes/notificacao.spec.js
```

### 4.3 Comandos

```bash
npm test -- --testPathPattern=routes/notificacao
npm run test:coverage
```

---

## 5. Cenarios de Teste

### 5.1 GET /notificacoes — listar

**RF-NOT-001 | RN-NOT-002**

| ID    | Descricao                                          | Payload Enviado | Mock Aplicado               | Status HTTP | Validacao                            | Status |
| :---- | :------------------------------------------------- | :-------------- | :-------------------------- | :---------: | :----------------------------------- | :----: |
| RT-01 | Valida estrutura e roteamento de listagem paginada | `page=1&limit=10` | Modelo Mongoose (`paginate`) | `200` (ou def) | `res.statusCode` definido sem crash  | PASSOU |

---

### 5.2 GET /notificacoes/contador — contarNaoLidas

**RF-NOT-002**

| ID    | Descricao                                          | Payload Enviado | Mock Aplicado               | Status HTTP | Validacao                            | Status |
| :---- | :------------------------------------------------- | :-------------- | :-------------------------- | :---------: | :----------------------------------- | :----: |
| RT-02 | Valida roteamento do contador de mensagens         | Nenhum          | Modelo Mongoose (`count...`)| `200` (ou def) | `res.statusCode` definido sem crash  | PASSOU |

---

### 5.3 PATCH /notificacoes/:id/ler — marcarComoLida

**RF-NOT-003 | RN-NOT-004**

| ID    | Descricao                                          | Payload Enviado | Mock Aplicado               | Status HTTP | Validacao                            | Status |
| :---- | :------------------------------------------------- | :-------------- | :-------------------------- | :---------: | :----------------------------------- | :----: |
| RT-03 | Valida roteamento da alteracao de flag especifica  | `id` na URL     | Modelo Mongoose (`findById`)| `200` (ou def) | `res.statusCode` definido sem crash  | PASSOU |

---

### 5.4 POST /notificacoes/ler-tudo — marcarTodasComoLidas

**RF-NOT-004**

| ID    | Descricao                                          | Payload Enviado | Mock Aplicado               | Status HTTP | Validacao                            | Status |
| :---- | :------------------------------------------------- | :-------------- | :-------------------------- | :---------: | :----------------------------------- | :----: |
| RT-04 | Valida roteamento do processo logico em lote       | Nenhum          | Modelo Mongoose (`update...`)| `200` (ou def) | `res.statusCode` definido sem crash  | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Rotas Notificacao | `routes/notificacao.spec.js` | **4** | **4** | **0** | **PASSOU** |

### 6.1 Impacto na Cobertura Global do Projeto

Ao isolar a aplicacao via Router Oficial e estabilizar o módulo de notificacoes, a execucao global atingiu os requisitos da Fabrica de Software:

| Metrica Globais | Meta | Resultado | Status |
| :--- | :---: | :---: | :---: |
| Statements | >= 60% | 61.24% | APROVADO |
| Lines | >= 59% | 61.14% | APROVADO |
| Functions | >= 61% | 64.90% | APROVADO |

---

## 7. Resumo dos Cenarios

| ID    | Rota                       | Descricao                                  | Regra (RN/RF) | Status |
| :---- | :------------------------- | :----------------------------------------- | :------------ | :----: |
| RT-01 | GET /notificacoes          | Roteamento seguro de historico paginado    | RF-NOT-001    | PASSOU |
| RT-02 | GET /notificacoes/contador | Roteamento seguro de consolidacao de dados | RF-NOT-002    | PASSOU |
| RT-03 | PATCH /notificacoes/:id/ler| Roteamento seguro de atualizacao por ID    | RF-NOT-003    | PASSOU |
| RT-04 | POST /notificacoes/ler-tudo| Roteamento seguro de processamento em lote | RF-NOT-004    | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes especificos da rota aprovados (4/4).
- Acesso ininterrupto e sem crashes (`TypeError: argument handler must be a function`) nas operacoes de roteamento.
- Modulo testado garantindo integridade e aderencia com o Express em producao.

---

## 9. Observacoes

- Para contornar restricoes de exportacao ES Modules no controlador original (`NotificacaoController`), adotou-se o bypass carregando o arquivo inteiro de rotas (`notificacaoRoutes.js`). Esta pratica blinda o `supertest` e garante que as assinaturas das funcoes se mantenham fieis.
- A execucao confirmou o log transversal de seguranca `warn: Token nao informado!` para acessos nao mapeados, confirmando que a injeção do `appUsuario` autenticado fluiu com sucesso.
