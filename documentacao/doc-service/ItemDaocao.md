# Plano de Teste — ItemDoacaoInteracao

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

- **Arquivo de Teste:** `src/tests/routes/itemDoacaoRoutes.spec.js`
- **Controlador Alvo:** `src/controllers/ItemDoacaoController.js`

### 4.2 Comandos de Execucao

```bash
npm test -- --testPathPattern=itemDoacaoRoutes
npm run test:coverage