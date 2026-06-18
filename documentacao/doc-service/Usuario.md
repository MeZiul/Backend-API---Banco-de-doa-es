# Plano de Teste — UsuarioService
---

## 1. Apresentacao

Este plano documenta os testes unitarios do `UsuarioService`, camada de regras de negocio do modulo de usuario da API REST DoaI. Os testes validam exclusivamente as regras de negocio especificadas na documentacao da API, com todas as dependencias externas substituidas por mocks controlados.

---

## 2. Objetivo

Validar que o `UsuarioService` aplica corretamente as regras de negocio, cobrindo:

- Cadastro com perfil `USUARIO` e situacao `ATIVO` — RF-001, RN-USR-005
- Unicidade de e-mail e CPF — RN-USR-002, RN-USR-006, RN-USR-007
- Senha sempre armazenada com hash, nunca em texto puro — RN-USR-004
- Senha nunca exposta na resposta de login — RN-USR-004
- Recuperacao de senha sem revelar existencia do e-mail (anti-enumeracao)
- Renovacao de token apenas para conta ATIVA
- Autorizacao por propriedade na atualizacao — RN-USR-012
- Protecao de campos sensiveis (cpf, perfil, situacao, senha) contra alteracao — RN-USR-013
- Exclusao logica com anonimizacao e verificacao de doacoes em andamento — RN-USR-018, RN-USR-019, RN-USR-020
- Suspensao com motivo e data obrigatorios — RN-USR-025
- Reativacao somente de usuario SUSPENSO — RN-USR-026
- Visibilidade de dados por perfil em listagem e consulta (admin x comum)

---

## 3. Escopo

### 3.1 Metodos Testados

| Metodo                                     | Descricao                                             | RN Associada            |
| ------------------------------------------ | ----------------------------------------------------- | ----------------------- |
| `cadastrar(dados)`                         | Cria usuario com perfil USUARIO e situacao ATIVO      | RN-USR-001 a RN-USR-007 |
| `login(email, senha)`                      | Autentica usuario e retorna token JWT + refreshToken  | RN-USR-008 a RN-USR-011 |
| `esqueciSenha(email)`                      | Gera token de recuperacao sem revelar o e-mail        | RN-USR-015              |
| `refreshToken(payload)`                    | Renova token de acesso para conta ativa               | RN-USR-011              |
| `redefinirSenha(token, novaSenha)`         | Redefine a senha a partir de token valido             | RN-USR-016              |
| `atualizar(id, dados, actor)`              | Atualiza dados do usuario com controle de propriedade | RN-USR-012, RN-USR-013  |
| `excluir(id, senha)`                       | Exclusao logica com anonimizacao de dados             | RN-USR-017 a RN-USR-020 |
| `suspender(id, { motivo, suspensao_ate })` | Suspende usuario com justificativa                    | RN-USR-023, RN-USR-025  |
| `reativar(id)`                             | Reativa usuario SUSPENSO                              | RN-USR-026              |
| `listar({ filtros, page, limit, actor })`  | Lista usuarios com visibilidade por perfil            | RF-014                  |
| `buscarPorId(id, actor)`                   | Consulta usuario com visibilidade por perfil          | RF-014                  |
| `listarItens(id)` / `listarAvaliacoes(id)` | Lista itens e avaliacoes de um usuario                | RF-015, RF-017          |

### 3.2 Fora do Escopo

- Testes de repository (utilizam banco real / banco em memoria, sem mock) — cobertos em suite propria de repository
- Testes de contrato HTTP (cobertos em `routes/usuario.spec.js`)
- Envio efetivo de e-mail em `esqueciSenha` (apenas a geracao do token e validada)

---

## 4. Estrategia

**Abordagem:** testes unitarios mockados — o `UsuarioService` e instanciado diretamente com repositories substituidos por `jest.fn()`. A biblioteca `bcryptjs` e mockada por modulo (`jest.mock("bcryptjs")`), permitindo controlar `compare` e `hash` de forma centralizada.

| Dependencia            | Mock                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `usuarioRepository`    | `buscarPorEmail`, `buscarPorCpf`, `buscarPorEmailComSenha`, `buscarPorId`, `buscarPorTokenRedefinicao`, `criar`, `atualizar`, `atualizarSenha`, `listar` |
| `itemDoacaoRepository` | `buscarEmAndamentoPorUsuario`, `cancelarItensPorUsuario`, `listarPorUsuario`                                                |
| `avaliacaoRepository`  | `listar`                                                                                                                    |
| `bcryptjs`             | `compare` e `hash` (via `jest.mock`)                                                                                        |

### 4.1 Arquivo de Teste

```
src/tests/services/usuarioService.spec.js
```
---

## 5. Cenarios de Teste

### 5.1 cadastrar

| ID    | Descricao                                                                      | Mock Configurado                                               | Resultado Esperado                                        | RN         | Status |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- | ---------- | ------ |
| SV-01 | Cadastro com dados validos retorna usuario com perfil USUARIO e situacao ATIVO | `buscarPorEmail: null`, `buscarPorCpf: null`, `criar: usuario` | `perfil = USUARIO`, `situacao = ATIVO`, `criar` 1x        | RN-USR-005 | PASSOU |
| SV-02 | Senha e hasheada antes de salvar (nunca em texto puro)                         | `buscarPorEmail/Cpf: null`, `bcrypt.hash` mockado              | `bcrypt.hash` chamado, `senha` salva != senha original    | RN-USR-004 | PASSOU |
| SV-03 | E-mail ja cadastrado lanca 409 e nao chama criar                               | `buscarPorEmail: usuario existente`                            | `CustomError { statusCode: 409 }`, `criar` nao chamado    | RN-USR-006 | PASSOU |
| SV-04 | CPF ja cadastrado lanca 409 e nao chama criar                                  | `buscarPorEmail: null`, `buscarPorCpf: usuario existente`      | `CustomError { statusCode: 409 }`, `criar` nao chamado    | RN-USR-007 | PASSOU |

---

### 5.2 login

| ID    | Descricao                                                                   | Mock Configurado                                                   | Resultado Esperado                                  | RN                     | Status |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | ---------------------- | ------ |
| SV-05 | Login valido retorna token, refreshToken e usuario sem senha                | `buscarPorEmailComSenha: usuario ATIVO`, `bcrypt.compare: true`    | `token` e `refreshToken` definidos, `senha` undefined | RN-USR-009, RN-USR-011 | PASSOU |
| SV-06 | Login com usuario inexistente lanca 401                                     | `buscarPorEmailComSenha: null`                                     | `CustomError { statusCode: 401 }`                   | RN-USR-009             | PASSOU |
| SV-07 | Login com senha incorreta lanca 401                                         | `buscarPorEmailComSenha: usuario`, `bcrypt.compare: false`         | `CustomError { statusCode: 401 }`                   | RN-USR-009             | PASSOU |
| SV-08 | Login com conta SUSPENSA lanca 403                                          | `buscarPorEmailComSenha: usuario SUSPENSO`, `bcrypt.compare: true` | `CustomError { statusCode: 403 }`                   | RN-USR-010             | PASSOU |
| SV-09 | Login com conta INATIVA lanca 403                                          | `buscarPorEmailComSenha: usuario INATIVO`, `bcrypt.compare: true`  | `CustomError { statusCode: 403 }`                   | RN-USR-010             | PASSOU |

---

### 5.3 esqueciSenha

| ID    | Descricao                                                  | Mock Configurado                          | Resultado Esperado                                              | RN         | Status |
| ----- | ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- | ---------- | ------ |
| SV-10 | E-mail existente gera token de recuperacao                | `buscarPorEmail: usuario`, `atualizar: ok` | `token` definido, `atualizar` chamado 1x                       | RN-USR-015 | PASSOU |
| SV-11 | E-mail inexistente nao revela existencia (anti-enumeracao) | `buscarPorEmail: null`                     | mensagem generica, sem `token`, `atualizar` nao chamado        | RN-USR-015 | PASSOU |

---

### 5.4 refreshToken

| ID    | Descricao                                       | Mock Configurado                       | Resultado Esperado                | RN         | Status |
| ----- | ----------------------------------------------- | -------------------------------------- | --------------------------------- | ---------- | ------ |
| SV-12 | Gera novo token para usuario ATIVO              | `buscarPorId: usuario ATIVO`           | token (string) definido           | RN-USR-011 | PASSOU |
| SV-13 | Usuario inexistente lanca 401                   | `buscarPorId: null`                    | `CustomError { statusCode: 401 }` | RN-USR-011 | PASSOU |
| SV-14 | Conta nao ATIVA lanca 403                       | `buscarPorId: usuario SUSPENSO`        | `CustomError { statusCode: 403 }` | RN-USR-011 | PASSOU |

---

### 5.5 redefinirSenha

| ID    | Descricao                                  | Mock Configurado                                             | Resultado Esperado                            | RN         | Status |
| ----- | ------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------- | ---------- | ------ |
| SV-15 | Token valido redefine a senha             | `buscarPorTokenRedefinicao: usuario (token valido)`, `atualizarSenha: ok` | mensagem de sucesso, `bcrypt.hash` chamado | RN-USR-016 | PASSOU |
| SV-16 | Token invalido lanca 400                   | `buscarPorTokenRedefinicao: null`                           | `CustomError { statusCode: 400 }`             | RN-USR-016 | PASSOU |
| SV-17 | Token expirado lanca 400                   | `buscarPorTokenRedefinicao: usuario (token expirado)`       | `CustomError { statusCode: 400 }`             | RN-USR-016 | PASSOU |

---

### 5.6 atualizar

| ID    | Descricao                                                              | Mock Configurado                                                                | Resultado Esperado                                  | RN         | Status |
| ----- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- | ------ |
| SV-18 | Atualizar proprio usuario retorna dados atualizados                   | `buscarPorId: usuario`, `buscarPorEmail: null`, `atualizar: atualizado`         | `nome` atualizado                                   | RN-USR-012 | PASSOU |
| SV-19 | Usuario inexistente lanca 404                                         | `buscarPorId: null`                                                             | `CustomError { statusCode: 404 }`                   | RN-USR-012 | PASSOU |
| SV-20 | Atualizar usuario de outro lanca 403                                  | `buscarPorId: usuario`, `actor.id != id`, `actor.perfil != ADMINISTRADOR`       | `CustomError { statusCode: 403 }`                   | RN-USR-012 | PASSOU |
| SV-21 | E-mail em uso por outro usuario lanca 409                             | `buscarPorId: usuario`, `buscarPorEmail: outro usuario`                          | `CustomError { statusCode: 409 }`                   | RN-USR-012 | PASSOU |
| SV-22 | Campos sensiveis (cpf, perfil, situacao, senha) sao ignorados         | `buscarPorId: usuario`, `buscarPorEmail: null`, `atualizar: mock`               | `atualizar` chamado sem cpf/perfil/situacao/senha   | RN-USR-013 | PASSOU |

---

### 5.7 excluir

| ID    | Descricao                                                       | Mock Configurado                                                                                                                         | Resultado Esperado                              | RN                     | Status |
| ----- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------- | ------ |
| SV-23 | Excluir conta com senha correta inativa usuario e cancela itens | `buscarPorId/EmailComSenha: usuario`, `bcrypt: true`, `buscarEmAndamento: []`, `atualizar/cancelarItens: ok`                              | `message: Conta excluida com sucesso`           | RN-USR-018, RN-USR-020 | PASSOU |
| SV-24 | Exclusao anonimiza dados e cancela itens do usuario            | idem SV-23                                                                                                                              | `situacao = INATIVO`, dados anonimizados, `cancelarItensPorUsuario` chamado | RN-USR-020 | PASSOU |
| SV-25 | Excluir conta com senha incorreta lanca 401                    | `buscarPorId/EmailComSenha: usuario`, `bcrypt: false`                                                                                    | `CustomError { statusCode: 401 }`               | RN-USR-018             | PASSOU |
| SV-26 | Excluir conta com itens em andamento lanca 400                 | `buscarPorId/EmailComSenha: usuario`, `bcrypt: true`, `buscarEmAndamento: [item]`                                                        | `CustomError { statusCode: 400 }`               | RN-USR-019             | PASSOU |

---

### 5.8 suspender

| ID    | Descricao                                                           | Mock Configurado                                            | Resultado Esperado                | RN         | Status |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- | ---------- | ------ |
| SV-27 | Suspender usuario ATIVO com motivo e data retorna situacao SUSPENSO | `buscarPorId: usuario ATIVO`, `atualizar: usuario SUSPENSO` | `situacao = SUSPENSO`             | RN-USR-025 | PASSOU |
| SV-28 | Suspender usuario INATIVO lanca 400                                 | `buscarPorId: usuario INATIVO`                              | `CustomError { statusCode: 400 }` | RN-USR-025 | PASSOU |
| SV-29 | Suspender sem motivo ou data lanca 400                              | `buscarPorId: usuario ATIVO`, motivo/data vazios            | `CustomError { statusCode: 400 }` | RN-USR-025 | PASSOU |

---

### 5.9 reativar

| ID    | Descricao                                        | Mock Configurado                                            | Resultado Esperado                | RN         | Status |
| ----- | ------------------------------------------------ | ----------------------------------------------------------- | --------------------------------- | ---------- | ------ |
| SV-30 | Reativar usuario SUSPENSO retorna situacao ATIVO | `buscarPorId: usuario SUSPENSO`, `atualizar: usuario ATIVO` | `situacao = ATIVO`                | RN-USR-026 | PASSOU |
| SV-31 | Reativar usuario que nao esta SUSPENSO lanca 400 | `buscarPorId: usuario ATIVO`                                | `CustomError { statusCode: 400 }` | RN-USR-026 | PASSOU |

---

### 5.10 listar

| ID    | Descricao                                              | Mock Configurado                                  | Resultado Esperado                              | RN     | Status |
| ----- | ----------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- | ------ | ------ |
| SV-32 | Admin recebe dados completos                          | `listar: { docs: [usuarioCompleto] }`, actor admin | `docs[0].cpf` presente                          | RF-014 | PASSOU |
| SV-33 | Usuario comum recebe campos limitados (sem cpf/email) | `listar: { docs: [usuarioCompleto] }`, actor comum | `docs[0].cpf` e `email` undefined               | RF-014 | PASSOU |

---

### 5.11 buscarPorId

| ID    | Descricao                                   | Mock Configurado                          | Resultado Esperado                 | RN     | Status |
| ----- | ------------------------------------------- | ----------------------------------------- | ---------------------------------- | ------ | ------ |
| SV-34 | Admin ve dados completos                    | `buscarPorId: usuarioCompleto`, actor admin | `cpf` presente                   | RF-014 | PASSOU |
| SV-35 | Proprio usuario ve dados completos          | `buscarPorId: usuarioCompleto`, actor = dono | `cpf` presente                  | RF-014 | PASSOU |
| SV-36 | Outro usuario recebe campos limitados       | `buscarPorId: usuarioCompleto`, actor outro | `cpf` e `email` undefined        | RF-014 | PASSOU |
| SV-37 | Usuario inexistente lanca 404               | `buscarPorId: null`                       | `CustomError { statusCode: 404 }`  | RF-014 | PASSOU |

---

### 5.12 listarItens / listarAvaliacoes

| ID    | Descricao                                          | Mock Configurado                                          | Resultado Esperado                 | RN     | Status |
| ----- | -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------- | ------ | ------ |
| SV-38 | listarItens retorna itens do usuario               | `buscarPorId: usuario`, `listarPorUsuario: [item]`        | array com 1 item                   | RF-015 | PASSOU |
| SV-39 | listarItens lanca 404 se usuario nao existe        | `buscarPorId: null`                                      | `CustomError { statusCode: 404 }`  | RF-015 | PASSOU |
| SV-40 | listarAvaliacoes retorna avaliacoes do usuario     | `buscarPorId: usuario`, `avaliacaoRepository.listar: ok`  | resultado paginado retornado       | RF-017 | PASSOU |

---

## 6. Resultado de Execucao

| Suite          | Arquivo                           | Testes | Aprovados | Reprovados | Status |
| -------------- | --------------------------------- | ------ | --------- | ---------- | ------ |
| UsuarioService | `services/usuarioService.spec.js` | **40** | **40**    | **0**      | PASSOU |

---

## 7. Observacoes

- A biblioteca `bcryptjs` e mockada por modulo (`jest.mock("bcryptjs")`), permitindo verificar tanto `compare` (login/exclusao) quanto `hash` (cadastro/redefinicao de senha) sem custo de criptografia real.
- O cenario de anti-enumeracao em `esqueciSenha` (SV-11) garante que a API nao revela se um e-mail esta cadastrado, retornando sempre a mesma mensagem generica.
- A protecao de campos sensiveis em `atualizar` (SV-22) valida que `cpf`, `perfil`, `situacao` e `senha` sao removidos do payload antes de salvar, impedindo auto-promocao de perfil.
- Os metodos `listar` e `buscarPorId` aplicam visibilidade por perfil: administradores recebem o documento completo, enquanto usuarios comuns recebem uma projecao limitada (sem cpf/email) — validado em SV-32 a SV-36.
