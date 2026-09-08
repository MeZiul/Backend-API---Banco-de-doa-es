# Plano de Teste - AdministracaoService

## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar as regras de moderacao administrativa, autorizacao, auditoria, consistencia e tratamento de estados invalidos do modulo de Administracao.

## 2. Estrategia

- Testes unitarios do `AdministracaoService` com repositories mockados.
- Testes de endpoint com o router real, JWT de teste, `AuthMiddleware`, `EnsureAdminMiddleware`, schemas Zod e Service mockado.
- Testes de concorrencia, transacao Prisma e integracao PostgreSQL fazem parte da suite atual.

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
- Inativacao cancela itens disponiveis, revalida doacoes em andamento dentro da transacao serializavel e bloqueia conflitos.
- Denuncia somente pode ser resolvida enquanto estiver `EM_ANALISE`.
- Resultado da denuncia deve ser `PROCEDENTE` ou `IMPROCEDENTE`.
- Denuncia procedente pode cancelar item ou suspender usuario.
- Recursos inexistentes retornam `404`.
- Data de suspensao deve ser uma data e hora ISO 8601 valida.
- Detalhe administrativo agrega os 10 registros mais recentes de itens, interesses, avaliacoes e denuncias relacionadas.
- Operacoes concorrentes usam compare-and-set; mutacao e auditoria confirmam ou fazem rollback juntas.
- Destinatarios de cancelamentos sao consultados depois do commit da moderacao.

## 4. Cenarios Principais

| Grupo | Cenarios validados |
| --- | --- |
| Autorizacao | usuario comum bloqueado; administrador por perfil ou papel permitido |
| Consultas | acoes, alvo, administrador, usuarios, itens e denuncias |
| Moderacao de usuario | bloquear, exigir justificativa, desbloquear, inativar, revalidar andamento e tratar conflito serializavel |
| Moderacao de item | cancelar item e registrar auditoria |
| Resolucao de denuncia | procedente contra item, procedente contra usuario, improcedente e estados invalidos |
| Erros | IDs invalidos, recursos inexistentes, conflitos e falhas operacionais |
| Contrato HTTP | JWT, status HTTP, payload padronizado, aliases e validacao Zod |

## 5. Evidencias

Validacao integrada final:

- recorte focado dos tres modulos, incluindo Services, endpoints e repositories alterados: **8 suites e 123 testes aprovados**;
- Services alvo: **97,51% de statements**, **100% de funcoes**, **97,50% de linhas** e **85,35% de branches**;
- Controllers e routers dos tres modulos: **100% de linhas**;
- smoke PostgreSQL: migrations, conexao, repositories, relacoes e rollback aprovados;
- suite global: **343 de 345 testes aprovados**; as 2 falhas restantes estao fora destes modulos, em Usuario e Perfil.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/AdministracaoService.spec.js
npm.cmd test -- --runInBand src/tests/routes/administracao.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Notificacoes sao best-effort e acontecem depois do commit; sem outbox/retry duravel, uma falha pode causar perda do aviso sem desfazer a moderacao.
