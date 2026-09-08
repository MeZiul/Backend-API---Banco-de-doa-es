# Plano de Teste — CategoriaService

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `CategoriaService`, camada de regras de negocio do modulo de categoria da API REST DoaI. Os testes validam exclusivamente as regras de negocio especificadas na documentacao da API, com todas as dependencias externas substituidas por mocks controlados.

---

## 2. Objetivo

Validar que o `CategoriaService` aplica corretamente as regras de negocio, cobrindo:

- Criacao de categoria com nome unico — RF-003
- Unicidade de nome na criacao e na atualizacao — RN-CAT
- Exclusao de categoria existente com verificacao de existencia
- Listagem com filtro por situacao — usuario comum so ve ativas, admin ve todas
- Busca por ID com tratamento de recurso nao encontrado

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo                     | Descricao                                          | RN Associada |
| -------------------------- | -------------------------------------------------- | ------------ |
| `criar(dados)`             | Cria categoria com nome unico                      | RF-003       |
| `atualizar(id, dados)`     | Atualiza categoria existente com validacao de nome | RF-003       |
| `deletar(id)`              | Remove categoria existente                         | RF-003       |
| `listar(filtros, isAdmin)` | Lista categorias com filtro por situacao           | RF-003       |
| `buscarPorId(id)`          | Busca categoria por ID                             | RF-003       |

### 3.2 Fora do Escopo

- Testes de repository (utilizam banco real / banco em memoria, sem mock) — cobertos em suite propria de repository
- Testes de contrato HTTP (cobertos em `routes/categoria.spec.js`)
- Testes de autorizacao por perfil (cobertos no middleware `authorize`)

---

## 4. Estrategia

**Abordagem:** testes unitarios mockados — o `CategoriaService` e instanciado diretamente com o repository substituido por `jest.fn()`.

| Dependencia           | Mock                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `categoriaRepository` | `buscarPorNome`, `buscarPorId`, `criar`, `atualizar`, `deletar`, `listar` |

### 4.1 Arquivo de Teste

```
src/tests/services/categoriaService.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 criar

**Regras cobertas:** RF-003

| ID        | Descricao                                       | Mock Configurado                           | Resultado Esperado                                     | Status |
| --------- | ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ------ |
| SV-CAT-01 | Criacao com nome unico retorna categoria criada | `buscarPorNome: null`, `criar: categoria`  | `nome = Roupas`, `criar` chamado 1x                    | PASSOU |
| SV-CAT-02 | Nome ja existente lanca CustomError 409         | `buscarPorNome: categoria existente`       | `CustomError { statusCode: 409 }`, `criar` nao chamado | PASSOU |

---

### 5.2 atualizar

**Regras cobertas:** RF-003

| ID        | Descricao                                        | Mock Configurado                                                                  | Resultado Esperado                                         | Status |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| SV-CAT-03 | Atualiza categoria existente com sucesso         | `buscarPorId: categoria`, `buscarPorNome: null`, `atualizar: categoria atualizada` | `nome = Roupas Novas`, `atualizar` chamado 1x              | PASSOU |
| SV-CAT-04 | Categoria nao encontrada lanca 404               | `buscarPorId: null`                                                               | `CustomError { statusCode: 404 }`, `atualizar` nao chamado | PASSOU |
| SV-CAT-05 | Novo nome ja usado por outra categoria lanca 409 | `buscarPorId: categoria`, `buscarPorNome: outra categoria`                         | `CustomError { statusCode: 409 }`, `atualizar` nao chamado | PASSOU |
| SV-CAT-06 | Atualiza sem mudar nome nao consulta buscarPorNome | `buscarPorId: categoria`, `atualizar: categoria`                                 | `atualizar` chamado 1x, `buscarPorNome` nao chamado        | PASSOU |

---

### 5.3 deletar

**Regras cobertas:** RF-003

| ID        | Descricao                              | Mock Configurado                              | Resultado Esperado                                      | Status |
| --------- | -------------------------------------- | --------------------------------------------- | ------------------------------------------------------ | ------ |
| SV-CAT-07 | Deleta categoria existente com sucesso | `buscarPorId: categoria`, `deletar: categoria` | `deletar` chamado com id correto                       | PASSOU |
| SV-CAT-08 | Categoria nao encontrada lanca 404     | `buscarPorId: null`                           | `CustomError { statusCode: 404 }`, `deletar` nao chamado | PASSOU |

---

### 5.4 listar

**Regras cobertas:** RF-003

| ID        | Descricao                                    | Mock Configurado                     | Resultado Esperado                            | Status |
| --------- | -------------------------------------------- | ------------------------------------ | --------------------------------------------- | ------ |
| SV-CAT-09 | Usuario comum lista apenas categorias ativas | `listar: { docs: [], totalDocs: 0 }` | `listar` chamado com `filtros.ativo = true`   | PASSOU |
| SV-CAT-10 | Admin lista todas incluindo inativas         | `listar: { docs: [], totalDocs: 0 }` | `listar` chamado sem `filtros.ativo`          | PASSOU |

---

### 5.5 buscarPorId

**Regras cobertas:** RF-003

| ID        | Descricao                          | Mock Configurado         | Resultado Esperado                | Status |
| --------- | ---------------------------------- | ------------------------ | --------------------------------- | ------ |
| SV-CAT-11 | Retorna categoria existente        | `buscarPorId: categoria` | `nome = Roupas`                   | PASSOU |
| SV-CAT-12 | Categoria nao encontrada lanca 404 | `buscarPorId: null`      | `CustomError { statusCode: 404 }` | PASSOU |

---

## 6. Resultado de Execucao

| Suite            | Arquivo                             | Testes | Aprovados | Reprovados | Status |
| ---------------- | ----------------------------------- | ------ | --------- | ---------- | ------ |
| CategoriaService | `services/categoriaService.spec.js` | **12** | **12**    | **0**      | PASSOU |

---

## 7. Resumo dos Cenarios

| ID        | Metodo        | Descricao                   | Status |
| --------- | ------------- | --------------------------- | ------ |
| SV-CAT-01 | `criar`       | Nome unico — sucesso        | PASSOU |
| SV-CAT-02 | `criar`       | Nome duplicado — 409        | PASSOU |
| SV-CAT-03 | `atualizar`   | Atualiza com sucesso        | PASSOU |
| SV-CAT-04 | `atualizar`   | Nao encontrada — 404        | PASSOU |
| SV-CAT-05 | `atualizar`   | Nome em uso por outra — 409 | PASSOU |
| SV-CAT-06 | `atualizar`   | Sem mudar nome              | PASSOU |
| SV-CAT-07 | `deletar`     | Deleta com sucesso          | PASSOU |
| SV-CAT-08 | `deletar`     | Nao encontrada — 404        | PASSOU |
| SV-CAT-09 | `listar`      | Usuario comum — so ativas   | PASSOU |
| SV-CAT-10 | `listar`      | Admin — todas               | PASSOU |
| SV-CAT-11 | `buscarPorId` | Encontrada — sucesso        | PASSOU |
| SV-CAT-12 | `buscarPorId` | Nao encontrada — 404        | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes do CategoriaService aprovados (12/12)
- Nome duplicado bloqueado na criacao e na atualizacao
- Categoria inexistente retorna 404 em todos os metodos que dependem de existencia
- Usuario comum so lista categorias ativas
- Admin lista todas as categorias

---

## 9. Observacoes

- O `CategoriaService` nao recebe `actor` como parametro — o controle de perfil (quem pode criar, atualizar ou deletar) e feito no middleware `authorize("ADMINISTRADOR")` na camada de rotas.
- O parametro `isAdmin` no metodo `listar` controla quais categorias aparecem: `true` mostra todas, `false` apenas as ativas.
- Nao ha validacao de campos obrigatorios no service — essa responsabilidade pertence ao schema Zod na camada de controller.
