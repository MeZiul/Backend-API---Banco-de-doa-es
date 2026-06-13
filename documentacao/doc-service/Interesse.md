# Plano de Teste - InteresseService

## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar o ciclo completo de manifestacao de interesse, incluindo autorizacao, estados, concorrencia, notificacoes e contrato HTTP.

## 2. Estrategia

- Testes unitarios do `InteresseService` com repositories e dependencias mockadas.
- Testes de endpoint com router real, JWT, schemas Zod e Service mockado.
- Validacao real descartavel para indice unico e corrida de aceite na branch funcional.

Arquivos:

```text
src/tests/services/InteresseService.spec.js
src/tests/routes/interesse.spec.js
```

## 3. Regras Cobertas

- Somente usuario ativo pode manifestar interesse.
- Item deve existir e estar `DISPONIVEL`.
- Usuario nao pode manifestar interesse no proprio item.
- Nao pode existir interesse ativo duplicado para o mesmo usuario e item.
- Somente o doador pode aceitar ou recusar.
- Somente interesse `PENDENTE` pode ser aceito ou recusado.
- Somente um interesse pode vencer o aceite concorrente.
- Aceite reserva o item e recusa os demais pendentes.
- Somente o interessado pode cancelar.
- Cancelamento de interesse aceito reabre o item.
- Eventos relevantes geram notificacoes best-effort.

## 4. Cenarios Principais

| Grupo | Cenarios validados |
| --- | --- |
| Listagens | proprios interesses, recebidos pelo doador, filtros e consulta por item |
| Consulta | interessado, doador e administrador permitidos; terceiro bloqueado |
| Criacao | sucesso, usuario inexistente/inativo, item inexistente/indisponivel/proprio e duplicidade |
| Aceite | sucesso, terceiro bloqueado, estado invalido, item indisponivel e corrida |
| Recusa | sucesso e estado invalido |
| Cancelamento | pendente, aceito, terceiro bloqueado e estado final |
| Contrato HTTP | autenticacao, aliases, query/body/ID invalidos, status e erros operacionais |

## 5. Evidencias

Branch de consistencia `132-interesse-consistencia-concorrencia`:

- validacao real confirmou somente uma reserva concorrente;
- indice unico parcial rejeitou segundo interesse `ACEITO` para o mesmo item.

Branch de testes unitarios `136-unit-admin-interesse-denuncia`:

- suite conjunta dos tres Services: **56 testes aprovados**;
- Services alvo com **100% de statements, funcoes e linhas**.

Branch de endpoints `137-endpoints-admin-interesse-denuncia`:

- suite conjunta dos tres modulos: **47 testes aprovados**;
- Controllers e routers alvo com **100% de linhas**.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/InteresseService.spec.js
npm.cmd test -- --runInBand src/tests/routes/interesse.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Antes de criar o indice unico em banco existente, auditar duplicatas com status `ACEITO`.
- Notificacoes sao best-effort; sem outbox/retry duravel, uma falha pode causar perda de aviso sem impedir a operacao principal.
- Ao integrar branches, preservar operacoes atomicas, compensacoes e testes de concorrencia.
