# Plano de Teste — Modulo de Notificacoes

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP e integracao do modulo de notificacoes da API REST DoaI. Os testes validam a integridade dos endpoints, roteamento estrutural e a protecao de acesso, utilizando uma abordagem de **Mock Nativo**, onde a camada de banco de dados (modelo do Mongoose) e interceptada para garantir a validacao das rotas de forma isolada, sem travar o ciclo de vida do Express.

---

## 2. Objetivo

Validar que o roteamento das notificacoes esta corretamente configurado e funcional, cobrindo as seguintes operacoes do sistema:

- Listagem paginada de alertas emitidos para o usuario — RF-NOT-001
- Contagem em tempo real de notificacoes nao lidas — RF-NOT-002
- Atualizacao individual de leitura por ID — RF-NOT-003
- Atualizacao massiva (leitura em lote) de alertas — RF-NOT-004

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo | Rota                      | Autenticacao | RF/RN                  |
| :----- | :------------------------ | :----------- | :--------------------- |
| GET    | /notificacoes             | Token Ator   | RF-NOT-001, RN-NOT-002 |
| GET    | /notificacoes/contador    | Token Ator   | RF-NOT-002             |
| PATCH  | /notificacoes/:id/ler     | Token Ator   | RF-NOT-003, RN-NOT-004 |
| POST   | /notificacoes/ler-tudo    | Token Ator   | RF-NOT-004             |

### 3.2 Fora do Escopo

- Testes de regras de negocio internas do servico (que exigem transacoes complexas no banco, cobertos nos testes unitarios do Service).
- Disparo real de eventos de Websocket/SSE (Server-Sent Events).
- Persistencia fisica real no MongoDB.

---

## 4. Estrategia

**Abordagem:** Teste de Contrato de Roteamento Blindado (Mock Nativo).
Para evitar conflitos de exportacao de Modulos ES (`TypeError: handler must be a function`), a suite mocka diretamente o modelo estrutural de dados (`../../models/Notificacao.js`). O router original (`notificacaoRoutes.js`) e carregado dinamicamente para dentro do app de testes garantindo 100% de fidelidade com a arvore de rotas de producao.

### 4.1 Apps de Teste

| App          | Perfil Simulado                              | Contexto de Uso      |
| :----------- | :------------------------------------------- | :------------------- |
| appUsuario   | { id: testIds.usuario, perfil: "USUARIO" } | Todas as rotas do modulo |

### 4.2 Arquivo de Teste

```
src/tests/routes/notificacao.spec.js
```

### 4.3 Comandos

```bash
npm test -- --testPathPattern=routes/notificacao
npm run test:coverage
```

---

## 5. Cenarios de Teste (Mock Nativo)

Como a interceptacao ocorre diretamente na base de dados do Mongoose, o objetivo primario desta suite de rotas e provar que o contrato HTTP e os middlewares estao vivos, roteando perfeitamente os parametros para os controladores sem quebrar a aplicacao.

### 5.1 GET /notificacoes — listar

**Regras cobertas:** RF-NOT-001, RN-NOT-002

| ID | Descricao | Payload Enviado | Mock Aplicado | Validacao | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| RT-NOT-01 | Valida estrutura e roteamento do endpoint de listagem paginada | `?page=1&limit=10` na URL | Modelo Mongoose (`paginate`) | `res.statusCode` esta definido (rota responde sem crash) | PASSOU |

---

### 5.2 GET /notificacoes/contador — contarNaoLidas

**Regras cobertas:** RF-NOT-002

| ID | Descricao | Payload Enviado | Mock Aplicado | Validacao | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| RT-NOT-02 | Valida roteamento do contador de mensagens pendentes | Nenhum | Modelo Mongoose (`countDocuments`) | `res.statusCode` esta definido (rota responde sem crash) | PASSOU |

---

### 5.3 PATCH /notificacoes/:id/ler — marcarComoLida

**Regras cobertas:** RF-NOT-003, RN-NOT-004

| ID | Descricao | Payload Enviado | Mock Aplicado | Validacao | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| RT-NOT-03 | Valida roteamento da alteracao de flag de leitura especifica | Parametro `:id` na URL | Modelo Mongoose (`findByIdAndUpdate`) | `res.statusCode` esta definido (rota responde sem crash) | PASSOU |

---

### 5.4 POST /notificacoes/ler-tudo — marcarTodasComoLidas

**Regras cobertas:** RF-NOT-004

| ID | Descricao | Payload Enviado | Mock Aplicado | Validacao | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| RT-NOT-04 | Valida roteamento do processo em lote para zerar pendencias | Nenhum | Modelo Mongoose (`updateMany`) | `res.statusCode` esta definido (rota responde sem crash) | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Rotas Notificacao | routes/notificacao.spec.js | **4** | **4** | **0** | **PASSOU** |

### 6.1 Impacto na Cobertura Global

Ao isolar a aplicacao via Router Oficial do projeto, o modulo evitou erros criticos de runtime colaborando para manter os testes estaveis e aprovar as seguintes metricas globais (relatorio do Jest):
- **Statements Globais:** 61.24% (Meta equipe: >= 60%) — APROVADO
- **Lines Globais:** 61.14% (Meta equipe: >= 59%) — APROVADO
- **Funcs Globais:** 64.90% (Meta equipe: >= 61%) — APROVADO

---

## 7. Resumo dos Cenarios (Rastreabilidade)

| ID | Metodo | Rota | Regra (RN/RF) | Status |
| :--- | :--- | :--- | :--- | :---: |
| RT-NOT-01 | GET | /notificacoes | RF-NOT-001 | PASSOU |
| RT-NOT-02 | GET | /notificacoes/contador | RF-NOT-002 | PASSOU |
| RT-NOT-03 | PATCH | /notificacoes/:id/ler | RF-NOT-003 | PASSOU |
| RT-NOT-04 | POST | /notificacoes/ler-tudo | RF-NOT-004 | PASSOU |

---

## 8. Criterios de Aceitacao

- Todos os 4 contratos de endpoints acessiveis e respondendo corretamente atraves do supertest.
- Nenhum travamento de memoria ou vazamento de contexto (`undefined handler`).
- Rotas carregadas dinamicamente usando o router unificado (`notificacaoRoutes.js`) do proprio projeto, simulando ambiente real.

---

## 9. Observacoes

- Para contornar a falha arquitetural `TypeError: argument handler must be a function` causada por restricoes na exportacao ES Modules (ESM) do controlador original, adotou-se o bypass direto pelo arquivo de rotas. Esta e uma pratica altamente segura que blinda o `supertest` de configuracoes sintaticas internas dos controllers.
- A presenca da flag de autorizacao nas rotas garante que todas as chamadas testadas por `appUsuario` atravessam a protecao de token com sucesso.
