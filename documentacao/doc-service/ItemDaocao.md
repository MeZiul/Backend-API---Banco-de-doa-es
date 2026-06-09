# Plano de Teste — ItemDoacao

## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de integracao das rotas de interacao e gerenciamento de estados os itens de doacao no `ItemDoacaoController`. Os testes validam os fluxos de cancelamento de ofertas de doacao e a listagem de usuarios interessados, com isolamento logico da camada de servicos por meio de mocks estruturados.

---

## 2. Objetivo

Validar que as rotas de interacao do item de doacao aplicam corretamente as regras de negocio e restricoes de seguranca, cobrindo:

- Cancelamento de item disponivel mudando o estado para `CANCELADO` — RF-ITM-001
- Validacao de tamanho minimo do motivo de cancelamento via Zod — RN-ITM-002
- Restricao de propriedade (apenas o doador dono do item ou administradores podem cancelar) — RN-ITM-003
- Restricao de acesso a lista de interessados (apenas o doador dono do item pode listar) — RN-ITM-004
- Tratamento de erro 404 para recursos e itens inexistentes no banco de dados — RN-ITM-005

---

## 3. Escopo

### 3.1 Metodos e Endpoints Testados

| Metodo HTTP | Endpoint | Descricao | RN Associada |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/itens/:id/cancelar` | Realiza o cancelamento logico de um item informando uma justificativa. | RF-ITM-001, RN-ITM-002, RN-ITM-003 |
| `GET` | `/itens/:id/interesses` | Lista todos os perfis de usuarios que demonstraram interesse no item. | RN-ITM-004, RN-ITM-005 |

### 3.2 Fora do Escopo

- Testes de persistencia direta em banco de dados real (MongoDB).
- Fluxo de upload ou remocao de imagens associadas ao item de doacao.
- Logica de aceite ou recusa de um interesse especifico (coberto em `interesse.spec.js`).

---

## 4. Estrategia

**Abordagem:** Testes de integracao de contrato e comportamento com isolamento de dependencias (`Mock de Arquivo`). A classe do servico `ItemDoacaoService.js` e totalmente interceptada via `jest.mock()`, forcando retornos controlados sincronos e assincronos.

| Dependencia Interceptada | Mocks Injetados | Objetivo |
| :--- | :--- | :--- |
| `ItemDoacaoService.js` | `cancelarItem`, `listarInteresses` | Evitar buffering do Mongoose e simular sucesso/erros operacionais. |

### 4.1 Arquivos Envolvidos

- **Arquivo de Teste:** `src/tests/routes/itemDoacao.spec.js`
- **Controlador Alvo:** `src/controllers/ItemDoacaoController.js`

### 4.2 Comandos de Execucao

```bash
npm test -- --testPathPattern=itemDoacaoRoutes
npm run test:coverage
```
## 5. Cenarios de Teste — Notificacoes

### 5.1 listar

**Regras cobertas:** RF-NOT-001, RN-NOT-002

| ID    | Descricao                                                       | Mock Configurado                | Resultado Esperado                                         | RN         | Status |
| ----- | --------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| SV-18 | Listar notificacoes com query de paginacao retorna lista valida | `listar: objeto paginado`       | Status HTTP **200**, docs retornados com tamanho correto.   | RN-NOT-002 | PASSOU |

---

### 5.2 contarNaoLidas

**Regras cobertas:** RF-NOT-002

| ID    | Descricao                                                       | Mock Configurado                | Resultado Esperado                                         | RN         | Status |
| ----- | --------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| SV-19 | Contador de mensagens pendentes retorna numero inteiro positivo  | `contarNaoLidas: { total: 5 }`  | Status HTTP **200**, chave `total` contendo valor esperado. | RF-NOT-002 | PASSOU |

---

### 5.3 marcarComoLida

**Regras cobertas:** RF-NOT-003, RN-NOT-004

| ID    | Descricao                                                       | Mock Configurado                | Resultado Esperado                                         | RN         | Status |
| ----- | --------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| SV-20 | Atualizar uma notificacao especifica altera flag para lida       | `marcarComoLida: { lida: true }`| Status HTTP **200**, campo `lida` igual a true no retorno.  | RF-NOT-003 | PASSOU |
| SV-21 | Tentar atualizar notificacao inexistente lanca erro 404         | `marcarComoLida: CustomError 404` | Status HTTP **404**, mensagem de erro operacional tratada.  | RN-NOT-004 | PASSOU |

---

### 5.4 marcarTodasComoLidas

**Regras cobertas:** RF-NOT-004

| ID    | Descricao                                                       | Mock Configurado                | Resultado Esperado                                         | RN         | Status |
| ----- | --------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| SV-22 | Confirmar leitura em lote zera pendencias de notificacao do ator| `marcarTodasComoLidas: objeto`   | Status HTTP **200**, contagem de modificados maior que 0.  | RF-NOT-004 | PASSOU |

---

## 6. Resultado de Execucao

| Suite              | Arquivo                              | Testes | Aprovados | Reprovados | Status |
| ------------------ | ------------------------------------ | :----: | :-------: | :--------: | :----: |
| NotificacaoRoutes  | `routes/notificacaoRoutes.spec.js`   | **5** | **5** | **0** | PASSOU |

### 6.1 Cobertura — Notificacao Module

| Metrica    | Meta   | Resultado | Status   |
| ---------- | ------ | --------- | -------- |
| Statements | >= 60% | 100.00%   | APROVADO |
| Branches   | >= 45% | 100.00%   | APROVADO |
| Functions  | >= 61% | 100.00%   | APROVADO |
| Lines      | >= 59% | 100.00%   | APROVADO |

---

## 7. Resumo dos Cenarios (Rastreabilidade)

| ID    | Metodo             | Descricao                                                    | Regra (RN/RF) | Status |
| ----- | ------------------ | ------------------------------------------------------------ | ------------- | :----: |
| SV-18 | `GET` (listar)     | Retorna historico paginado de alertas do usuario             | RF-NOT-001    | PASSOU |
| SV-19 | `GET` (contador)   | Retorna o total consolidado de alertas pendentes de leitura  | RF-NOT-002    | PASSOU |
| SV-20 | `PATCH` (ler)      | Modifica o estado de lida de uma notificacao por ID          | RF-NOT-003    | PASSOU |
| SV-21 | `PATCH` (ler)      | Trata erro 404 para ID de notificacao inexistente            | RN-NOT-004    | PASSOU |
| SV-22 | `POST` (ler-tudo)  | Executa a limpeza logica de todas as pendencias em lote       | RF-NOT-004    | PASSOU |

---

## 8. Observacoes

- Todas as rotas deste modulo estao protegidas sob o escopo do `AuthMiddleware`. Qualquer tentativa de requisicao sem um token JWT valido nos headers resultara em falha de autenticacao (401), validada de forma transversal na suite de testes.
- A rota `GET /notificacoes` utiliza o middleware `validate` interceptando parâmetros de query via Zod, garantindo tipagem forte para os dados de paginacao antes da execucao do controlador.