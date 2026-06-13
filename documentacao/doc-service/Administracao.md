# Plano de Teste - AdministracaoService

## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar as regras de moderacao administrativa, autorizacao, auditoria, consistencia e tratamento de estados invalidos do modulo de Administracao.

## 2. Estrategia

- Testes unitarios do `AdministracaoService` com repositories mockados.
- Testes de endpoint com o router real, JWT de teste, `AuthMiddleware`, `EnsureAdminMiddleware`, schemas Zod e Service mockado.
- Testes de concorrencia e compensacao ficam nas branches funcionais correspondentes.

Arquivos:

```text
src/tests/services/AdministracaoService.spec.js
src/tests/routes/administracao.spec.js
```

## 3. Regras Cobertas

- Somente administradores podem executar operacoes administrativas.
- Listagens e consultas administrativas normalizam paginacao e filtros.
- Bloqueio exige justificativa e registra auditoria.
- Somente usuario suspenso pode ser desbloqueado.
- Inativacao e cancelamento de item geram registro administrativo.
- Denuncia somente pode ser resolvida enquanto estiver `EM_ANALISE`.
- Resultado da denuncia deve ser `PROCEDENTE` ou `IMPROCEDENTE`.
- Denuncia procedente pode cancelar item ou suspender usuario.
- Recursos inexistentes retornam `404`.
- Operacoes concorrentes e falhas de auditoria devem ser tratadas sem deixar estado silenciosamente inconsistente.

## 4. Cenarios Principais

| Grupo | Cenarios validados |
| --- | --- |
| Autorizacao | usuario comum bloqueado; administrador por perfil ou papel permitido |
| Consultas | acoes, alvo, administrador, usuarios, itens e denuncias |
| Moderacao de usuario | bloquear, exigir justificativa, desbloquear, inativar |
| Moderacao de item | cancelar item e registrar auditoria |
| Resolucao de denuncia | procedente contra item, procedente contra usuario, improcedente e estados invalidos |
| Erros | IDs invalidos, recursos inexistentes, conflitos e falhas operacionais |
| Contrato HTTP | JWT, status HTTP, payload padronizado, aliases e validacao Zod |

## 5. Evidencias

Branch de testes unitarios `136-unit-admin-interesse-denuncia`:

- suite conjunta dos tres Services: **56 testes aprovados**;
- Administracao, Interesse e Denuncia: **100% de statements, funcoes e linhas**;
- cobertura conjunta de branches: **80%**.

Branch de endpoints `137-endpoints-admin-interesse-denuncia`:

- suite conjunta dos tres modulos: **47 testes aprovados**;
- Controllers e routers dos tres modulos: **100% de linhas**;
- cobertura focada: **96,56% de statements e linhas**.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/AdministracaoService.spec.js
npm.cmd test -- --runInBand src/tests/routes/administracao.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- O detalhe administrativo de usuario ainda nao agrega todo o historico resumido previsto no contrato oficial.
- Compensacoes reduzem inconsistencias, mas uma queda do processo entre mutacao e auditoria ainda exige reconciliacao enquanto nao houver transacoes com replica set.
- Ao integrar as branches `130` a `137`, preservar autorizacao por situacao atual, compare-and-set, compensacoes, notificacoes, filtros seguros e todos os cenarios de teste.
