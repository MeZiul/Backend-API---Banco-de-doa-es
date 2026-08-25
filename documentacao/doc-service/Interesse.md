# Plano de Teste - InteresseService

## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar o ciclo completo de manifestacao de interesse, incluindo autorizacao, estados, concorrencia, notificacoes e contrato HTTP.

## 2. Estrategia

- Testes unitarios do `InteresseService` com repositories e dependencias mockadas.
- Testes de endpoint com router real, JWT, schemas Zod e Service mockado.
- Validacao real descartavel no PostgreSQL de teste para indices, repositories e rollback transacional.

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
- Criacao, aceite e cancelamento aceito atualizam interesse e item na mesma transacao Prisma.
- Eventos relevantes geram notificacoes best-effort.
- A consulta de interessados de um item exige usuario ativo e somente pode ser feita pelo doador proprietario.

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

Validacao integrada final:

- recorte focado dos tres modulos, incluindo Services, endpoints e repositories alterados: **8 suites e 123 testes aprovados**;
- Services alvo: **97,51% de statements**, **100% de funcoes**, **97,50% de linhas** e **85,35% de branches**;
- Controllers e routers alvo com **100% de linhas**.
- smoke PostgreSQL: migrations, conexao, repositories, relacoes e rollback aprovados;
- suite global: **343 de 345 testes aprovados**; as 2 falhas restantes estao fora destes modulos, em Usuario e Perfil.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/InteresseService.spec.js
npm.cmd test -- --runInBand src/tests/routes/interesse.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Antes de criar o indice unico em banco existente, auditar duplicatas com status `ACEITO`.
- Notificacoes sao best-effort; sem outbox/retry duravel, uma falha pode causar perda de aviso sem impedir a operacao principal.
