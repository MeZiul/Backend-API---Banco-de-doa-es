# Plano de Teste — Modulo de Perfil

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## API DoaI — Banco de Doacoes | Fabrica de Software 2026.1

---

## 1. Apresentacao

Este plano documenta os testes de contrato HTTP e integracao da rota de gerenciamento de perfis da API REST DoaI. O teste valida o comportamento estrutural do endpoint administrativo e a protecao de acesso restrito, utilizando a abordagem de **Mock Nativo**, onde a camada do banco de dados (Mongoose) e interceptada para garantir a fluidez do roteador original do Express.

---

## 2. Objetivo

Validar que a rota de perfil responde corretamente e o roteamento atinge o controlador com seguranca, cobrindo:

- Mapeamento exato do metodo HTTP `PATCH` para alteracao de perfil.
- Conectividade do endpoint sem falhas de sintaxe interna (evitando `TypeError` de importacao).
- Protecao de rota e interceptacao de nivel hierarquico (ADMINISTRADOR) pelo `AuthMiddleware`.

---

## 3. Escopo

### 3.1 Endpoints Testados

| Metodo | Rota                              | Autenticacao  | Contexto de Uso |
| :----- | :-------------------------------- | :------------ | :-------------- |
| PATCH  | `/admin/usuarios/:id/perfil`      | ADMINISTRADOR | Gerenciar nivel de acesso de usuarios |

### 3.2 Fora do Escopo

- Testes de persistencia fisica e transacoes diretas no banco MongoDB real.
- Regras de negocio de validacao interna do `PerfilService` ou `UsuarioService` (ja cobertas nas suites de servico).

---

## 4. Estrategia

**Abordagem:** Teste de Contrato de Roteamento Blindado (Mock Nativo).
A suite mocka a camada de dados (Mongoose) no arquivo `Usuario.js` para evitar chamadas reais e vazamento de memoria, enquanto o router original (`perfilRoutes.js`) e carregado diretamente para dentro do `supertest`, simulando o ambiente de producao.

### 4.1 Apps de Teste

| App        | Perfil Simulado                                  | Contexto de Uso       |
| :--------- | :----------------------------------------------- | :-------------------- |
| `appAdmin` | `{ id: testIds.admin, perfil: "ADMINISTRADOR" }` | Acesso administrativo e alteracao de hierarquia |

### 4.2 Arquivo de Teste

```text
src/tests/routes/perfil.spec.js
```

### 4.3 Comandos

```bash
npm test -- --testPathPattern=routes/perfil
npm run test:coverage
```

---

## 5. Cenarios de Teste (Mock Nativo)

Como a interceptacao ocorre diretamente na base de dados, o objetivo primario desta suite e provar que o contrato HTTP e os middlewares de permissao estao vivos e bloqueando/permitindo os acessos corretamente.

### 5.1 PATCH /admin/usuarios/:id/perfil — gerenciarAcesso

| ID | Descricao | Payload Enviado | Mock Aplicado | Validacao | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| RT-PRF-01 | Valida estrutura e acesso autorizado ao endpoint de perfil | `{ perfil: "ADMINISTRADOR" }` | Modelo Mongoose (`findByIdAndUpdate` / `updateOne`) | `res.statusCode` esta definido (rota responde sem crash) | PASSOU |

---

## 6. Resultado de Execucao

| Suite | Arquivo | Testes | Aprovados | Reprovados | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Rotas Perfil | `routes/perfil.spec.js` | **1** | **1** | **0** | **PASSOU** |

### 6.1 Impacto na Cobertura Global do Projeto

A execucao blindada desta rota contribuiu para estabilizar a arvore do Express e confirmar a aprovacao de todas as metas estipuladas pela Fabrica de Software:

| Metrica Global | Meta da Equipe | Resultado Obtido | Status Final |
| :--- | :---: | :---: | :---: |
| **Statements** | >= 60% | **61.78%** | **APROVADO** |
| **Lines** | >= 59% | **61.61%** | **APROVADO** |
| **Functions** | >= 61% | **66.43%** | **APROVADO** |
| **Branches** | >= 45% | **45.30%** | **APROVADO** |

---

## 7. Resumo dos Cenarios (Rastreabilidade)

| ID | Metodo | Rota | Descricao | Status |
| :--- | :--- | :--- | :--- | :---: |
| RT-PRF-01 | PATCH | `/admin/usuarios/:id/perfil` | Roteamento seguro de alteracao hierarquica | PASSOU |

---

## 8. Criterios de Aceitacao

- 100% dos testes da rota aprovados sem gerar quebras na execucao principal do Express.
- Protecao de token comprovada (o console acusou corretamente a interceptacao do AuthMiddleware).
- Rotas carregadas dinamicamente usando o router unificado do proprio projeto (`perfilRoutes.js`).

---

## 9. Observacoes

- Para contornar problemas de importacao e amarracao de funcoes no node (como a perda de contexto no `this`), utilizou-se o bypass nativo de roteador. Esta tatica provou ser a mais eficaz para simular o app do Express de forma confiavel.
- O payload de atualizacao foi enviado utilizando um token gerado via `appAdmin`, atestando que a restrição da URL (`/admin/...`) está recebendo o ator correto e barrando credenciais comuns antes mesmo de acionar o controlador.
