# Plano de Teste — UsuarioService

## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes unitarios do `UsuarioService`, camada de regras de negocio do modulo de usuario da API REST DoaI. Os testes validam exclusivamente as regras de negocio especificadas na documentacao da API, com todas as dependencias externas substituidas por mocks controlados.

---

## 2. Objetivo

Validar que o `UsuarioService` aplica corretamente as regras de negocio, cobrindo:

- Cadastro com perfil `USUARIO` e situacao `ATIVO` — RF-001, RN-USR-005
- Unicidade de e-mail e CPF — RN-USR-002, RN-USR-006
- Senha nunca exposta na resposta — RN-USR-004
- Autorizacao por propriedade na atualizacao — RN-USR-012
- Protecao do campo CPF contra alteracao — RN-USR-013
- Exclusao logica com verificacao de doacoes em andamento — RN-USR-018, RN-USR-019, RN-USR-020
- Suspensao com motivo e data obrigatorios — RN-USR-025
- Reativacao somente de usuario SUSPENSO — RN-USR-026

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo                                     | Descricao                                             | RN Associada            |
| ------------------------------------------ | ----------------------------------------------------- | ----------------------- |
| `cadastrar(dados)`                         | Cria usuario com perfil USUARIO e situacao ATIVO      | RN-USR-001 a RN-USR-007 |
| `login(email, senha)`                      | Autentica usuario e retorna token JWT                 | RN-USR-008 a RN-USR-011 |
| `atualizar(id, dados, actor)`              | Atualiza dados do usuario com controle de propriedade | RN-USR-012, RN-USR-013  |
| `excluir(id, senha)`                       | Exclusao logica com anonimizacao de dados             | RN-USR-017 a RN-USR-020 |
| `suspender(id, { motivo, suspensao_ate })` | Suspende usuario com justificativa                    | RN-USR-023, RN-USR-025  |
| `reativar(id)`                             | Reativa usuario SUSPENSO                              | RN-USR-026              |

### 3.2 Fora do Escopo

- Testes de repository com banco real
- Testes de contrato HTTP (cobertos em `routes/usuario.spec.js`)
- Envio de e-mail em `esqueciSenha`
- Metodos `listar`, `buscarPorId`, `listarItens`, `listarAvaliacoes`, `refreshToken`

---

## 4. Estrategia

**Abordagem:** testes unitarios mockados — o `UsuarioService` e instanciado diretamente com repositories substituidos por `jest.fn()`.

| Dependencia            | Mock                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `usuarioRepository`    | `buscarPorEmail`, `buscarPorCpf`, `buscarPorEmailComSenha`, `buscarPorId`, `criar`, `atualizar`, `atualizarSenha`, `listar` |
| `itemDoacaoRepository` | `buscarEmAndamentoPorUsuario`, `cancelarItensPorUsuario`, `listarPorUsuario`                                                |
| `avaliacaoRepository`  | `listar`                                                                                                                    |
| `bcryptjs`             | `compare` (via `jest.spyOn`)                                                                                                |

### 4.1 Arquivo de Teste

```
src/tests/services/usuarioService.spec.js
```

### 4.2 Comandos

```bash
npm test -- --testPathPattern=usuarioService
npm run test:coverage
```

---

## 5. Cenarios de Teste

### 5.1 cadastrar

**Regras cobertas:** RN-USR-001, RN-USR-002, RN-USR-004, RN-USR-005, RN-USR-006, RN-USR-007

| ID    | Descricao                                                                      | Mock Configurado                                               | Resultado Esperado                                         | RN         | Status |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| SV-01 | Cadastro com dados validos retorna usuario com perfil USUARIO e situacao ATIVO | `buscarPorEmail: null`, `buscarPorCpf: null`, `criar: usuario` | `perfil = USUARIO`, `situacao = ATIVO`, `criar` chamado 1x | RN-USR-005 | PASSOU |
| SV-02 | E-mail ja cadastrado lanca CustomError 409                                     | `buscarPorEmail: usuario existente`                            | `CustomError { statusCode: 409 }`                          | RN-USR-006 | PASSOU |
| SV-03 | CPF ja cadastrado lanca CustomError 409                                        | `buscarPorEmail: null`, `buscarPorCpf: usuario existente`      | `CustomError { statusCode: 409 }`                          | RN-USR-006 | PASSOU |

---

### 5.2 login

**Regras cobertas:** RN-USR-008, RN-USR-009, RN-USR-010, RN-USR-011

| ID    | Descricao                                                           | Mock Configurado                                                   | Resultado Esperado                          | RN                     | Status |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- | ---------------------- | ------ |
| SV-04 | Login com credenciais validas retorna token JWT e usuario sem senha | `buscarPorEmailComSenha: usuario ATIVO`, `bcrypt.compare: true`    | `token` definido, `usuario.senha` undefined | RN-USR-009, RN-USR-011 | PASSOU |
| SV-05 | Login com usuario inexistente lanca 401                             | `buscarPorEmailComSenha: null`                                     | `CustomError { statusCode: 401 }`           | RN-USR-009             | PASSOU |
| SV-06 | Login com conta SUSPENSA lanca 403                                  | `buscarPorEmailComSenha: usuario SUSPENSO`, `bcrypt.compare: true` | `CustomError { statusCode: 403 }`           | RN-USR-010             | PASSOU |
| SV-07 | Login com conta INATIVA lanca 403                                   | `buscarPorEmailComSenha: usuario INATIVO`, `bcrypt.compare: true`  | `CustomError { statusCode: 403 }`           | RN-USR-010             | PASSOU |

---

### 5.3 atualizar

**Regras cobertas:** RN-USR-012, RN-USR-013, RN-USR-014

| ID    | Descricao                                           | Mock Configurado                                                                | Resultado Esperado                        | RN         | Status |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | ---------- | ------ |
| SV-08 | Atualizar proprio usuario retorna dados atualizados | `buscarPorId: usuario`, `buscarPorEmail: null`, `atualizar: usuario atualizado` | `nome` atualizado, `atualizar` chamado 1x | RN-USR-012 | PASSOU |
| SV-09 | Atualizar usuario de outro lanca 403                | `buscarPorId: usuario`, `actor.id != id`, `actor.perfil != ADMINISTRADOR`       | `CustomError { statusCode: 403 }`         | RN-USR-012 | PASSOU |
| SV-10 | Campo CPF no body e ignorado antes de salvar        | `buscarPorId: usuario`, `buscarPorEmail: null`, `atualizar: mock`               | `atualizar` chamado sem o campo `cpf`     | RN-USR-013 | PASSOU |

---

### 5.4 excluir

**Regras cobertas:** RN-USR-017, RN-USR-018, RN-USR-019, RN-USR-020

| ID    | Descricao                                                       | Mock Configurado                                                                                                                         | Resultado Esperado                    | RN                     | Status |
| ----- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------- | ------ |
| SV-11 | Excluir conta com senha correta inativa usuario e cancela itens | `buscarPorId: usuario`, `buscarPorEmailComSenha: usuario`, `bcrypt: true`, `buscarEmAndamento: []`, `atualizar: ok`, `cancelarItens: ok` | `message: Conta excluida com sucesso` | RN-USR-018, RN-USR-020 | PASSOU |
| SV-12 | Excluir conta com senha incorreta lanca 401                     | `buscarPorId: usuario`, `buscarPorEmailComSenha: usuario`, `bcrypt: false`                                                               | `CustomError { statusCode: 401 }`     | RN-USR-018             | PASSOU |
| SV-13 | Excluir conta com itens em andamento lanca 400                  | `buscarPorId: usuario`, `buscarPorEmailComSenha: usuario`, `bcrypt: true`, `buscarEmAndamento: [item]`                                   | `CustomError { statusCode: 400 }`     | RN-USR-019             | PASSOU |

---

### 5.5 suspender

**Regras cobertas:** RN-USR-023, RN-USR-025

| ID    | Descricao                                                           | Mock Configurado                                            | Resultado Esperado                | RN         | Status |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- | ---------- | ------ |
| SV-14 | Suspender usuario ATIVO com motivo e data retorna situacao SUSPENSO | `buscarPorId: usuario ATIVO`, `atualizar: usuario SUSPENSO` | `situacao = SUSPENSO`             | RN-USR-025 | PASSOU |
| SV-15 | Suspender usuario INATIVO lanca 400                                 | `buscarPorId: usuario INATIVO`                              | `CustomError { statusCode: 400 }` | RN-USR-025 | PASSOU |

---

### 5.6 reativar

**Regras cobertas:** RN-USR-026

| ID    | Descricao                                        | Mock Configurado                                            | Resultado Esperado                | RN         | Status |
| ----- | ------------------------------------------------ | ----------------------------------------------------------- | --------------------------------- | ---------- | ------ |
| SV-16 | Reativar usuario SUSPENSO retorna situacao ATIVO | `buscarPorId: usuario SUSPENSO`, `atualizar: usuario ATIVO` | `situacao = ATIVO`                | RN-USR-026 | PASSOU |
| SV-17 | Reativar usuario que nao esta SUSPENSO lanca 400 | `buscarPorId: usuario ATIVO`                                | `CustomError { statusCode: 400 }` | RN-USR-026 | PASSOU |

---

## 6. Resultado de Execucao

| Suite          | Arquivo                           | Testes | Aprovados | Reprovados | Status |
| -------------- | --------------------------------- | ------ | --------- | ---------- | ------ |
| UsuarioService | `services/usuarioService.spec.js` | **17** | **17**    | **0**      | PASSOU |

### 6.1 Cobertura — UsuarioService

| Metrica    | Meta   | Resultado | Status     |
| ---------- | ------ | --------- | ---------- |
| Statements | >= 60% | 61.11%    | APROVADO   |
| Branches   | >= 45% | 55.55%    | APROVADO   |
| Functions  | >= 61% | 53.33%    | A MELHORAR |
| Lines      | >= 59% | 61.11%    | APROVADO   |

---

## 7. Resumo dos Cenarios

| ID    | Metodo      | Descricao                                        | RN                     | Status |
| ----- | ----------- | ------------------------------------------------ | ---------------------- | ------ |
| SV-01 | `cadastrar` | Cadastro valido — perfil USUARIO, situacao ATIVO | RN-USR-005             | PASSOU |
| SV-02 | `cadastrar` | E-mail duplicado lanca 409                       | RN-USR-006             | PASSOU |
| SV-03 | `cadastrar` | CPF duplicado lanca 409                          | RN-USR-006             | PASSOU |
| SV-04 | `login`     | Login valido retorna token sem senha             | RN-USR-009, RN-USR-011 | PASSOU |
| SV-05 | `login`     | Login usuario inexistente retorna 401            | RN-USR-009             | PASSOU |
| SV-06 | `login`     | Login conta SUSPENSA retorna 403                 | RN-USR-010             | PASSOU |
| SV-07 | `login`     | Login conta INATIVA retorna 403                  | RN-USR-010             | PASSOU |
| SV-08 | `atualizar` | Atualizar proprio usuario retorna 200            | RN-USR-012             | PASSOU |
| SV-09 | `atualizar` | Atualizar usuario de outro retorna 403           | RN-USR-012             | PASSOU |
| SV-10 | `atualizar` | CPF ignorado no body de atualizacao              | RN-USR-013             | PASSOU |
| SV-11 | `excluir`   | Excluir conta com senha correta                  | RN-USR-018, RN-USR-020 | PASSOU |
| SV-12 | `excluir`   | Excluir conta com senha incorreta retorna 401    | RN-USR-018             | PASSOU |
| SV-13 | `excluir`   | Excluir com itens em andamento retorna 400       | RN-USR-019             | PASSOU |
| SV-14 | `suspender` | Suspender usuario ATIVO                          | RN-USR-025             | PASSOU |
| SV-15 | `suspender` | Suspender usuario INATIVO lanca 400              | RN-USR-025             | PASSOU |
| SV-16 | `reativar`  | Reativar usuario SUSPENSO                        | RN-USR-026             | PASSOU |
| SV-17 | `reativar`  | Reativar usuario nao SUSPENSO lanca 400          | RN-USR-026             | PASSOU |

---

## 8. Observacoes

- `listarAvaliacoes` chama `this.avaliacaoRepository` mas o constructor nao recebe `avaliacaoRepository` — ponto de melhoria identificado.
- Metodos `listar`, `buscarPorId`, `listarItens`, `refreshToken` nao foram cobertos neste plano — candidatos a expansao futura.
- A funcao `atualizar` remove `cpf`, `perfil`, `situacao` e `senha` do body antes de salvar — validado em SV-10.
