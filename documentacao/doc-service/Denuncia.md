# Plano de Teste - DenunciaService

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI - Banco de Doacoes | Milestone 3

## 1. Objetivo

Validar criacao, consulta, atualizacao, remocao e resolucao de denuncias com controle de acesso, consistencia e auditoria.

## 2. Estrategia

- Testes unitarios com repositories e dependencia de item mockados.
- Testes de endpoint com router real, JWT, schemas Zod e Service mockado.
- Validacao real descartavel dos indices unicos e da resolucao concorrente na branch funcional.

Arquivos:

```text
src/tests/services/DenunciaService.spec.js
src/tests/routes/denuncia.spec.js
```

## 3. Regras Cobertas

- Somente usuario ativo pode registrar denuncia.
- Alvo deve ser item ou usuario existente.
- Usuario nao pode denunciar a si mesmo.
- Nao pode haver denuncia duplicada `EM_ANALISE` do mesmo denunciante para o mesmo alvo.
- Administradores ativos recebem notificacao best-effort depois da criacao.
- Usuario comum visualiza somente as proprias denuncias.
- Somente o autor pode atualizar ou remover.
- Atualizacao e remocao exigem status `EM_ANALISE`; a remocao condiciona atomicamente ID, autor e status.
- Resolucao administrativa ocorre uma unica vez e gera auditoria.
- Denuncia procedente pode cancelar item ou suspender usuario.
- Resultado e notificacoes sao enviados aos envolvidos.

## 4. Cenarios Principais

| Grupo | Cenarios validados |
| --- | --- |
| Listagens e consulta | isolamento por denunciante, consulta do autor/admin e terceiro bloqueado |
| Criacao | item, usuario, alvo invalido/inexistente, usuario inativo, duplicidade e notificacao administrativa |
| Atualizacao | sucesso, preservacao de campos, terceiro bloqueado e estado final |
| Remocao | sucesso, terceiro bloqueado, estado final e corrida com resolucao administrativa |
| Resolucao | procedente contra item, procedente contra usuario, improcedente, resultado invalido e concorrencia |
| Contrato HTTP | autenticacao, query/body/ID invalidos, aliases, status e propagacao de erros |

## 5. Evidencias

Branch de consistencia `133-admin-denuncia-consistencia-auditoria`:

- validacao real confirmou indice unico de denuncia em analise;
- somente uma resolucao concorrente venceu;
- mutacoes administrativas condicionais e compensacoes foram exercitadas.

Validacao integrada final:

- recorte focado dos tres modulos, incluindo Services, endpoints e repositories alterados: **8 suites e 123 testes aprovados**;
- Services alvo: **97,51% de statements**, **100% de funcoes**, **97,50% de linhas** e **85,35% de branches**;
- Controllers e routers alvo com **100% de linhas**.
- smoke PostgreSQL: migrations, conexao, repositories, relacoes e rollback aprovados;
- suite global: **343 de 345 testes aprovados**; as 2 falhas restantes estao fora destes modulos, em Usuario e Perfil.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/DenunciaService.spec.js
npm.cmd test -- --runInBand src/tests/routes/denuncia.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Antes de criar os indices unicos em banco existente, auditar denuncias duplicadas `EM_ANALISE`.
- Resolucao, moderacao do alvo e auditoria usam uma transacao Prisma; notificacoes permanecem best-effort depois do commit.
