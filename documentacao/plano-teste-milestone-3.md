# Plano de Teste - Milestone 3

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## 1. Objetivo

Validar a API DoaI para a Milestone 3, incluindo testes unitarios e de endpoint, regras de negocio, autenticacao, autorizacao, consistencia, concorrencia e apresentacao pratica pelo Swagger.

Este plano complementa o plano da Milestone 2 e registra o aprofundamento realizado nos modulos de Administracao, Interesse e Denuncia.

## 2. Escopo desta Entrega

Modulos revisados com maior rigor:

- Administracao;
- Interesse;
- Denuncia.

Camadas e comportamentos validados:

- routes e contrato HTTP;
- middlewares de autenticacao, perfil administrativo e situacao atual do usuario;
- controllers e schemas Zod;
- services e regras de negocio;
- repositories, filtros e projecoes;
- models e indices de consistencia;
- notificacoes de eventos relevantes;
- concorrencia, compare-and-set e transacoes Prisma;
- documentacao Markdown e Swagger.

## 3. Estrategia

### 3.1 Testes unitarios

Os Services sao instanciados com repositories e dependencias mockadas. Esses testes validam decisoes de negocio sem depender de HTTP ou banco persistente.

Principais grupos:

- permissoes;
- estados validos e invalidos;
- recursos inexistentes;
- criacao e atualizacao;
- moderacao e auditoria;
- aceite, recusa e cancelamento;
- resolucao de denuncia.

### 3.2 Testes de endpoint

Os testes usam os routers reais com `Supertest`, identidade Bearer controlada no Jest e Services mockados. A sessão Better Auth real é validada em suíte e smoke próprios.

Eles validam:

- roteamento real;
- `AuthMiddleware`;
- `EnsureAdminMiddleware`;
- schemas Zod;
- normalizacao de aliases;
- status HTTP;
- resposta padronizada;
- propagacao de erros operacionais.

### 3.3 Validacoes de consistencia

O projeto inclui validacao descartavel com PostgreSQL exclusivo de testes para:

- indice unico parcial de interesse aceito;
- somente uma reserva concorrente;
- indices unicos de denuncia em analise;
- somente uma resolucao administrativa concorrente;
- compare-and-set de usuario e item;
- filtros e projecoes sem exposicao indevida.
- repositories reais e rollback transacional sem persistir massa de teste.
- migração de hashes legados para `Account`, sessão Bearer real e revogação persistida.

## 4. Fluxo Principal Associado as Regras

1. Usuario ativo manifesta interesse em item disponivel.
2. O sistema impede interesse duplicado e interesse no proprio item.
3. Doador aceita um interesse.
4. Apenas um aceite concorrente vence; item fica reservado e demais interesses sao recusados.
5. Usuario ativo registra denuncia contra item ou outro usuario.
6. O sistema impede autodenuncia e duplicidade em analise.
7. Administrador ativo consulta e resolve a denuncia.
8. Resolucao procedente aplica moderacao e registra auditoria.
9. Usuarios afetados recebem notificacoes best-effort.

## 5. Matriz de Cenarios

| Modulo | Fluxo principal | Cenarios negativos principais |
| --- | --- | --- |
| Interesse | criar, consultar, aceitar, recusar e cancelar | usuario inativo, item proprio/indisponivel, duplicidade, terceiro sem permissao, corrida de aceite |
| Denuncia | criar, consultar, atualizar e remover | autodenuncia, duplicidade, alvo inexistente, terceiro sem permissao, estado final, corrida |
| Administracao | listar, bloquear, desbloquear, inativar, cancelar item e resolver denuncia | usuario comum, auto-moderacao, recurso inexistente, estado invalido, conflito concorrente, falha de auditoria |

## 6. Evidencias por Branch

| Branch | Evidencia |
| --- | --- |
| `130-camadas-admin-interesse-denuncia` | realinhamento arquitetural e suite completa com 102 testes |
| `131-permissoes-situacao-usuario` | usuario ativo e permissoes; suite completa com 114 testes |
| `132-interesse-consistencia-concorrencia` | corrida/indice de Interesse; validacao real e 115 testes |
| `133-admin-denuncia-consistencia-auditoria` | indices, auditoria e compensacoes; validacao real e 117 testes |
| `134-notificacoes-admin-interesse-denuncia` | notificacoes e handlers; suite completa com 114 testes |
| `135-filtros-projecoes-admin-interesse-denuncia` | filtros/projecoes; validacao real e 111 testes |
| `136-unit-admin-interesse-denuncia` | base ampliada e integrada em 68 testes dos Services alvo |
| `137-endpoints-admin-interesse-denuncia` | base ampliada e integrada em 48 testes de endpoint dos tres modulos |

Validacao integrada atual da branch baseada na `dev`:

- recorte focado de Administracao, Interesse e Denuncia: `8` suites e `123` testes aprovados;
- cobertura focada dos Services: `97,51%` statements, `85,35%` branches, `100%` funcoes e `97,50%` linhas;
- Controllers e routers dos tres modulos: `100%` de linhas;
- smoke PostgreSQL: migrations, conexao, repositories, relacoes e rollback aprovados;
- suite global: `34` suites e `369` de `369` testes aprovados;
- cobertura global: `76,58%` statements, `62,08%` branches, `73,52%` funcoes e `78,67%` linhas;
- `AutenticacaoService`: `97,26%` statements, `84,78%` branches, `87,50%` funcoes e `97,18%` linhas;
- `createAuthMiddleware`: `94,11%` statements, `76,92%` branches, `100%` funcoes e `93,75%` linhas;
- migration smoke: hash legado preservado em `Account` e colunas antigas removidas dentro de transacao revertida;
- smokes Better Auth: cadastro, senha incorreta, login, Bearer, refresh, rejeicao do token antigo, logout e conta suspensa aprovados;
- Docker: imagem construida, migrations aplicadas, API conectada ao PostgreSQL e `/docs/`/`/docs.json` com HTTP `200`;
- importacao das fontes Swagger de Administracao, Interesse e Denuncia aprovada.

## 7. Comandos

Suite completa:

```powershell
npm.cmd test -- --runInBand
```

Cobertura:

```powershell
npm.cmd run test:coverage -- --runInBand
```

Services alvo:

```powershell
npm.cmd test -- --runInBand src/tests/services/AdministracaoService.spec.js src/tests/services/InteresseService.spec.js src/tests/services/DenunciaService.spec.js
```

Endpoints alvo:

```powershell
npm.cmd test -- --runInBand src/tests/routes/administracao.spec.js src/tests/routes/interesse.spec.js src/tests/routes/denuncia.spec.js
```

Integracao real isolada:

```powershell
docker compose up -d postgres-test
npm.cmd run test:db
npm.cmd run test:auth:migration
npm.cmd run test:auth
npm.cmd run test:auth:http
```

## 8. Evidencia para Apresentacao

Demonstrar:

- `npm.cmd test -- --runInBand`;
- `npm.cmd run test:coverage -- --runInBand`;
- Swagger em `http://localhost:7340/docs`;
- autenticacao Bearer Token;
- fluxo principal de Interesse;
- criacao e resolucao de Denuncia;
- bloqueio/cancelamento administrativo;
- documentacao Markdown das regras;
- grafico de branches e tarefas no GitLab;
- Docker e Docker Compose conforme infraestrutura entregue pela equipe.

## 9. Riscos Conhecidos

- A migration nao transporta dados de uma instalacao MongoDB antiga; a massa academica e recriada pelo seed.
- `TEST_DATABASE_URL` deve apontar para o banco exclusivo de testes na porta 5433.
- Notificacoes podem ser perdidas sem outbox ou retry duravel.
- Os historicos administrativos retornam os 10 registros mais recentes por categoria para manter a resposta resumida.

## 10. Criterio de Aceite

- suite integrada aprovada apos os merges;
- Swagger inicializa sem referencias quebradas;
- rotas protegidas rejeitam usuario sem autenticacao ou permissao;
- fluxos principais e negativos demonstraveis;
- documentacao Markdown alinhada ao comportamento integrado;
- riscos residuais apresentados de forma explicita.
