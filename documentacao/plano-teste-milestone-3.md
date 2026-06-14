# Plano de Teste - Milestone 3

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
- concorrencia, compare-and-set e compensacoes;
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

Os testes usam os routers reais com `Supertest`, JWT local de teste e Services mockados.

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

As branches funcionais incluem validacoes com MongoDB descartavel para:

- indice unico parcial de interesse aceito;
- somente uma reserva concorrente;
- indices unicos de denuncia em analise;
- somente uma resolucao administrativa concorrente;
- compare-and-set de usuario e item;
- filtros e projecoes sem exposicao indevida.

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

Validacao integrada final da `dev`:

- testes unitarios dos tres Services: `3` suites e `68` testes aprovados;
- testes de endpoint dos tres modulos: `3` suites e `48` testes aprovados;
- suite completa atual: `26` suites e `226` testes aprovados;
- cobertura focada dos Services: `96,16%` statements, `84,67%` branches, `97,16%` funcoes e `96,30%` linhas;
- cobertura global: `78,19%` statements, `64,89%` branches, `74,21%` funcoes e `78,63%` linhas;
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

- Auditar dados existentes antes de criar indices unicos de Interesse e Denuncia.
- Compensacoes nao substituem completamente transacoes MongoDB em caso de queda abrupta do processo.
- Notificacoes podem ser perdidas sem outbox ou retry duravel.
- Os historicos administrativos retornam os 10 registros mais recentes por categoria para manter a resposta resumida.

## 10. Criterio de Aceite

- suite integrada aprovada apos os merges;
- Swagger inicializa sem referencias quebradas;
- rotas protegidas rejeitam usuario sem autenticacao ou permissao;
- fluxos principais e negativos demonstraveis;
- documentacao Markdown alinhada ao comportamento integrado;
- riscos residuais apresentados de forma explicita.
