# Plano de Teste - Milestone 2

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


Este documento organiza o plano geral de testes da Milestone 2 da API DoaI. Ele deve ser usado como visao de integracao: fluxo principal, comandos de execucao, evidencias e limites da entrega.

Os detalhes por modulo ficam separados em `documentacao/doc-service/`.

## 1. Objetivo

Validar que os modulos entregues na Milestone 2 funcionam de forma integrada, com foco em:

- contrato HTTP das rotas implementadas;
- autenticacao e autorizacao por perfil;
- regras de negocio principais;
- cenarios negativos esperados;
- evidencia de testes e cobertura para apresentacao.

## 2. Escopo Geral

Modulos demonstraveis nesta milestone:

- `autenticacao`;
- `interesse`;
- `denuncia`;
- `administracao`;
- `avaliacao`;
- `usuario`, com implementacao e testes existentes, mas ainda com ajustes de contrato/documentacao pendentes;
- `categoria`, com rota registrada, mas fora do recorte principal de testes e documentacao desta milestone.

Camadas cobertas:

- testes de route/controller com `Supertest`;
- testes unitarios de service com dependencias mockadas;
- documentacao Markdown das rotas;
- Swagger em runtime para os modulos ja documentados em `src/docs/`.

Fora do escopo deste plano:

- testes E2E com frontend;
- testes com envio real de e-mail;
- testes de upload de imagens;
- testes de repository com MongoDB real;
- correcao completa de contrato das rotas de `usuario` e cobertura de `categoria`, previstas para milestone futura.

## 3. Planos Especificos de Teste

Os cenarios detalhados por modulo ficam nos arquivos abaixo:

| Modulo | Arquivo |
| ------ | ------- |
| Autenticacao | `documentacao/doc-service/Autenticacao.md` |
| Usuario | `documentacao/doc-service/Usuario.md` |
| Interesse | `documentacao/doc-service/Interesse.md` |
| Denuncia | `documentacao/doc-service/Denuncia.md` |
| Administracao | `documentacao/doc-service/Administracao.md` |
| Avaliacao | `documentacao/doc-service/Avaliacao.md` |

## 4. Estrategia de Teste

Os testes seguem duas abordagens:

- Route/controller: validam status HTTP, payload, autenticacao, autorizacao e propagacao de erros.
- Service: validam regras de negocio isoladas, usando repositories e dependencias externas mockadas.

Ferramentas:

- `Jest`;
- `Supertest`;
- `mongodb-memory-server`;
- mocks com `jest.fn()`;
- cobertura com `jest --coverage`.

Os scripts de teste configuram `NODE_ENV=test` e `USE_IN_MEMORY_DB=true`, entao nao dependem do seed nem do MongoDB local.

## 5. Comandos de Execucao

Suite completa:

```powershell
npm test
```

Fallback recomendado no PowerShell:

```powershell
npm.cmd test -- --runInBand
```

Cobertura:

```powershell
npm run test:coverage
```

Fallback de cobertura no PowerShell:

```powershell
npm.cmd run test:coverage -- --runInBand
```

## 6. Fluxo Principal da Milestone

Fluxo recomendado para demonstracao:

1. Usuario realiza login e obtem token JWT.
2. Usuario autenticado manifesta interesse em item disponivel.
3. Usuario autenticado cria denuncia contra item ou usuario.
4. Administrador consulta denuncias pendentes.
5. Administrador resolve denuncia e aplica moderacao quando necessario.
6. Doador aceita ou recusa interesse.
7. Apos doacao concluida, usuario registra avaliacao.

Esse fluxo demonstra autenticacao, autorizacao, mudanca de estado, moderacao administrativa e avaliacao vinculada ao ciclo de doacao.

## 7. Cenarios de Integracao por Modulo

### Autenticacao

Rotas cobertas:

- `POST /auth/login`;
- `POST /auth/esqueci-senha`;
- `PUT /auth/redefinir-senha`;
- `POST /auth/refresh-token`;
- `POST /auth/logout`.

Pontos validados:

- login com credenciais validas;
- rejeicao de payload invalido;
- recuperacao e redefinicao de senha;
- renovacao de token;
- blacklist de token no logout.

### Interesse

Rotas cobertas:

- `POST /interesses`;
- `GET /interesses`;
- `PUT /interesses/:id/aceitar`.

Pontos validados:

- criacao de interesse;
- listagem limitada ao usuario autenticado;
- propagacao de erro quando usuario sem permissao tenta aceitar interesse.

### Denuncia

Rotas cobertas:

- `POST /denuncias`;
- `GET /denuncias`;
- `PUT /denuncias/:id`.

Pontos validados:

- criacao de denuncia;
- listagem limitada ao usuario autenticado;
- erro ao atualizar denuncia fora da regra de negocio.

### Administracao

Rotas cobertas:

- `GET /admin/administracoes`;
- `GET /admin/denuncias`;
- `PUT /admin/usuarios/:id/bloquear`;
- `PUT /admin/denuncias/:id/resolver`.

Pontos validados:

- listagem de acoes administrativas;
- listagem de denuncias para moderacao;
- bloqueio de usuario;
- erro operacional ao resolver denuncia invalida.

### Avaliacao

Rotas cobertas:

- `POST /avaliacoes`;
- `GET /avaliacoes`;
- `PUT /avaliacoes/:id`;
- `DELETE /avaliacoes/:id`.

Pontos validados:

- criacao de avaliacao;
- listagem com filtros;
- atualizacao apenas de campos permitidos;
- rejeicao de campos sensiveis;
- erro ao remover avaliacao de outro usuario.

### Usuario

Rotas atualmente testadas:

- `POST /usuario`;
- `GET /usuario`;
- `GET /usuario/:id`;
- `PUT /usuario/:id`;
- `DELETE /usuario/:id`;
- `GET /usuario/:id/itens`;
- `PATCH /usuario/:id/suspender`;
- `PATCH /usuario/:id/reativar`.

Ponto de atencao:

- a documentacao-base define `/usuarios` no plural, mas a implementacao atual ainda usa `/usuario` no singular. A correcao de contrato ficou planejada para milestone futura.

## 8. Evidencias Atuais

Ultima validacao executada:

```powershell
npm.cmd run test:coverage -- --runInBand
```

Resultado:

| Item | Resultado |
| ---- | --------- |
| Test suites | 11 aprovadas |
| Testes | 67 aprovados |
| Statements | 62.95% |
| Branches | 48.09% |
| Functions | 67.66% |
| Lines | 62.66% |

Observacao: os `warn` exibidos durante os testes fazem parte dos cenarios negativos esperados, como payload invalido, permissao negada, senha incorreta e estado de negocio invalido.

## 9. Evidencias para a Apresentacao

Durante a apresentacao, demonstrar:

- execucao de `npm test` ou `npm.cmd test -- --runInBand`;
- tela de cobertura com `npm run test:coverage`;
- Swagger em `GET /docs`;
- uma rota de interesse no Postman;
- uma rota de denuncia no Postman;
- um exemplo de documentacao Markdown de rota;
- um exemplo de plano unitario em `documentacao/doc-service/`.

## 10. Riscos Conhecidos

- `usuario` ainda precisa alinhar caminho singular/plural com o contrato oficial.
- `categoria` esta registrada, mas ainda nao tem a mesma cobertura documental/testes dos modulos principais.
- Para demonstracao manual no Postman, o seed exige MongoDB local ativo ou outra URI Mongo configurada.
- Os testes automatizados nao precisam de seed, pois usam banco em memoria.

## 11. Resultado Esperado

Ao final da Milestone 2, a equipe deve conseguir apresentar:

- rotas principais documentadas em Markdown;
- Swagger acessivel em runtime;
- plano geral de teste por fluxo de integracao;
- planos unitarios por service;
- suite automatizada passando;
- cobertura de testes demonstravel;
- demonstracao pratica no Postman para os fluxos principais.
