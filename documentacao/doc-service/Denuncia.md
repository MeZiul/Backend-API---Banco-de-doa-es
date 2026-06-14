# Plano de Teste - DenunciaService

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
- Usuario comum visualiza somente as proprias denuncias.
- Somente o autor pode atualizar ou remover.
- Atualizacao e remocao exigem status `EM_ANALISE`.
- Resolucao administrativa ocorre uma unica vez e gera auditoria.
- Denuncia procedente pode cancelar item ou suspender usuario.
- Resultado e notificacoes sao enviados aos envolvidos.

## 4. Cenarios Principais

| Grupo | Cenarios validados |
| --- | --- |
| Listagens e consulta | isolamento por denunciante, consulta do autor/admin e terceiro bloqueado |
| Criacao | item, usuario, alvo invalido/inexistente, usuario inativo e duplicidade |
| Atualizacao | sucesso, preservacao de campos, terceiro bloqueado e estado final |
| Remocao | sucesso, terceiro bloqueado e estado final |
| Resolucao | procedente contra item, procedente contra usuario, improcedente, resultado invalido e concorrencia |
| Contrato HTTP | autenticacao, query/body/ID invalidos, aliases, status e propagacao de erros |

## 5. Evidencias

Branch de consistencia `133-admin-denuncia-consistencia-auditoria`:

- validacao real confirmou indice unico de denuncia em analise;
- somente uma resolucao concorrente venceu;
- mutacoes administrativas condicionais e compensacoes foram exercitadas.

Validacao integrada final:

- suite conjunta dos tres Services: **68 testes aprovados**;
- Services alvo: **96,16% de statements**, **97,16% de funcoes**, **96,30% de linhas** e **84,67% de branches**.

- suite conjunta dos tres modulos: **48 testes de endpoint aprovados**;
- Controllers e routers alvo com **100% de linhas**.
- suite completa: **26 suites e 226 testes aprovados**.

## 6. Comandos

```powershell
npm.cmd test -- --runInBand src/tests/services/DenunciaService.spec.js
npm.cmd test -- --runInBand src/tests/routes/denuncia.spec.js
npm.cmd run test:coverage -- --runInBand
```

## 7. Riscos e Pendencias

- Antes de criar os indices unicos em banco existente, auditar denuncias duplicadas `EM_ANALISE`.
- Sem transacoes MongoDB, queda do processo entre mutacao e auditoria pode exigir reconciliacao manual.
