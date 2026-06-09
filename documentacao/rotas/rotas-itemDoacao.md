# Plano de Teste — Rotas de Item de Doação

## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP e integracao das rotas de interacao de itens de doacao da API REST DoaI. Os testes validam o comportamento dos endpoints a nivel de requisicao e resposta, incluindo status HTTP, payload retornado, validacao estrutural de dados de entrada via Zod e controle de autorizacao, mantendo o `ItemDoacaoService` completamente mockado.

---

## 2. Objetivo

Validar que as rotas de interacao de itens respondem corretamente a cada cenario, cobrindo:

- Status HTTP corretos para cada operacao — 200, 400, 403, 404
- Payload de resposta conforme o contrato `CommonResponse` da API
- Controle de acesso por propriedade e regras de negocio
- Validacao de entrada via Zod antes de chegar a camada de servicos
- Propagacao correta dos erros operacionais do servico para o cliente

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo | Rota | Autenticacao | RF/RN |
| :--- | :--- | :--- | :--- |
| PATCH | /itens/:id/cancelar | Token dono/admin | RF-ITM-001, RN-ITM-002 |
| GET | /itens/:id/interesses | Token dono/admin | RN-ITM-004, RN-ITM-005 |

### 3.2 Fora do Escopo

- Testes de regras de negocio internas do service (cobertos em isolamento)
- Testes de persistencia direta em banco de dados real
- Upload de arquivos de imagem e fluxo de midia de itens

---

## 4. Estrategia

**Abordagem:** Testes de contrato HTTP com isolamento de dependencias. O `ItemDoacaoService` e interceptado via `jest.mock()`. As requisicoes sao simuladas usando o `supertest` contra um ambiente Express configurado pelo helper `createControllerTestApp`.

### 4.1 Apps de Teste

| App | Perfil Simulado | Endpoints Testados |
| :--- | :--- | :--- |
| appUsuario | { id: testIds.usuario, perfil: "USUARIO" } | PATCH cancelar, GET interesses |

### 4.2 Arquivo de Teste

`src/tests/routes/itemDoacao.spec.js`

### 4.3 Comandos

`npm test -- --testPathPattern=routes/itemDoacaoRoutes`
`npm run test:coverage`

---

## 5. Cenarios de Teste

### 5.1 PATCH /itens/:id/cancelar — cancelarItem

**RF-ITM-001 | RN-ITM-002**

| ID | Descricao | Payload Enviado | Mock Service | Status HTTP | Validacao | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| RT-01 | Cancelamento valido altera status para CANCELADO | { motivo: "O item sofreu uma avaria..." } | cancelarItem: resolves(itemCancelado) | 200 | data.status igual a "CANCELADO" | PASSOU |
| RT-02 | Erro de permissao ao tentar cancelar item alheio | { motivo: "Motivo valido com tamanho adequado" } | cancelarItem: CustomError 403 | 403 | Mensagem de falta de permissao tratada | PASSOU |
| RT-03 | Envio de justificativa menor que 10 caracteres | { motivo: "Curto" } | Zod bloqueia antes do servico | 400 | Erro estrutural, service nao e chamado | PASSOU |

---

### 5.2 GET /itens/:id/interesses — listarInteresses

**RN-ITM-004 | RN-ITM-005**

| ID | Descricao | Payload Enviado | Mock Service | Status HTTP | Validacao | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| RT-04 | Doador consulta lista de interessados com sucesso | Nenhum body enviado | listarInteresses: resolves([interessados]) | 200 | data e retornado como um array valido | PASSOU |
| RT-05 | Consulta de interesses de item inexistente | Nenhum body enviado | listarInteresses: CustomError 404 | 404 | Mensagem de item nao encontrado | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Rotas ItemDoacao | routes/itemDoacao.spec.js | **5** | **5** | **0** | **PASSOU** |

### 6.1 Cobertura — ItemDoacaoController (Novos Métodos)

| Metrica | Meta | Resultado | Status |
| :--- | :---: | :---: | :---: |
| Statements | >= 60% | 100.00% | APROVADO |
| Branches | >= 45% | 100.00% | APROVADO |
| Functions | >= 61% | 100.00% | APROVADO |
| Lines | >= 59% | 100.00% | APROVADO |

---

## 7. Resumo dos Cenarios

| ID | Rota | Descricao | Regra (RN/RF) | Status HTTP | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| RT-01 | PATCH /itens/:id/cancelar | Mudanca de status concluida pelo dono | RF-ITM-001 | 200 | PASSOU |
| RT-02 | PATCH /itens/:id/cancelar | Rejeicao por falta de ownership do item | RN-ITM-003 | 403 | PASSOU |
| RT-03 | PATCH /itens/:id/cancelar | Payload recusado pelo validador do Zod | RN-ITM-002 | 400 | PASSOU |
| RT-04 | GET /itens/:id/interesses | Listagem de interacoes do item consultado | RN-ITM-004 | 200 | PASSOU |
| RT-05 | GET /itens/:id/interesses | Recurso solicitado nao existe no banco | RN-ITM-005 | 404 | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes especificos de rotas de interacao aprovados (5/5)
- Bloqueio imediato de justificativas invalidas ou ausentes na camada de controle (Zod)
- Status HTTP condizentes com os resultados operacionais do service
- Isolamento total da suite garantido pelo mock da classe `ItemDoacaoService`

---

## 9. Observacoes

- O arquivo do controlador `ItemDoacaoController.js` exporta uma instancia pre-configurada, dispensando instanciamento explicito no arquivo de especificacao.
- O mapeamento do middleware do Zod intercepta a requisicao e responde com erro `400` antes de executar a lógica de negócios, otimizando o fluxo de execucao de falhas estruturais em RT-03.