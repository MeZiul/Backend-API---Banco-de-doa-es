# Plano de Teste - AdministracaoService

## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar as regras de moderacao administrativa, autorizacao, auditoria, consistencia e tratamento de estados invalidos do modulo de Administracao.

## 2. Estrategia

- Testes unitarios do `AdministracaoService` com repositories mockados.
- Testes de endpoint com o router real, JWT de teste, `AuthMiddleware`, `EnsureAdminMiddleware`, schemas Zod e Service mockado.
- Testes de concorrencia, compensacao e integracao final fazem parte da suite atual.

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
- Data de suspensao deve ser uma data e hora ISO 8601 valida.
- Detalhe administrativo agrega os 10 registros mais recentes de itens, interesses, avaliacoes e denuncias relacionadas.
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

Validacao integrada final:

- suite conjunta dos tres Services: **68 testes aprovados**;
- Services alvo: **96,16% de statements**, **97,16% de funcoes**, **96,30% de linhas** e **84,67% de branches**.

- suite conjunta dos tres modulos: **48 testes de endpoint aprovados**;
- Controllers e routers dos tres modulos: **100% de linhas**;
- recorte completo dos testes de endpoint: **84,28% de statements**, **71,54% de branches**, **77,77% de funcoes** e **84,04% de linhas**.
- suite completa: **26 suites e 226 testes aprovados**.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/AdministracaoService.spec.js
npm.cmd test -- --runInBand src/tests/routes/administracao.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Compensacoes reduzem inconsistencias, mas uma queda do processo entre mutacao e auditoria ainda exige reconciliacao enquanto nao houver transacoes com replica set.
