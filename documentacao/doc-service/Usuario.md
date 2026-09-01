# Plano de Teste - UsuarioService

## 1. Objetivo

Validar as regras de domínio de usuário depois da separação entre dados cadastrais e autenticação. `UsuarioService` mantém cadastro, visibilidade, atualização, exclusão e situação; `AutenticacaoService` mantém senha, recuperação e sessões Better Auth.

## 2. Responsabilidades atuais

| Serviço | Responsabilidade |
|---|---|
| `UsuarioService` | CPF/e-mail, propriedade, perfil, situação, anonimização, itens e avaliações |
| `AutenticacaoService` | `Account.password`, login, recuperação, `Session`, refresh e logout |

`UsuarioRepository` não lê nem grava senha. A credencial é consultada somente em `Account` pelo serviço de autenticação.

## 3. Arquivo e estratégia

Arquivo: `src/tests/services/usuarioService.spec.js`.

O service é instanciado com mocks de `usuarioRepository`, `itemDoacaoRepository`, `avaliacaoRepository`, `autenticacaoService` e `transactionManager`. Não há criptografia nem banco real nessa suíte.

## 4. Cenários implementados

| Grupo | Regras verificadas |
|---|---|
| Cadastro | e-mail/CPF únicos, CPF válido e delegação da criação da credencial ao Better Auth |
| Atualização | existência, dono/admin, conflito de e-mail, bloqueio de CPF/perfil/situação e delegação da senha |
| Exclusão | senha verificada em `Account`, bloqueio por doação em andamento, anonimização, cancelamento de itens e revogação de sessões |
| Suspensão | motivo/data obrigatórios, conta inativa não suspensa e revogação de sessões |
| Reativação | somente conta `SUSPENSO` volta a `ATIVO` |
| Consulta | visibilidade completa para admin/dono e projeção limitada para terceiros |
| Relações | listagem de itens e avaliações com validação de existência |

## 5. Fluxos críticos

### Atualização de senha

1. O Zod valida complexidade.
2. `UsuarioService` remove `senha` do payload cadastral.
3. Os dados de domínio são atualizados em `Usuario`.
4. `AutenticacaoService.atualizarSenhaUsuario` gera bcrypt e atualiza `Account`.
5. Todas as sessões são revogadas.
6. A operação reutiliza a transação Prisma ativa.

### Exclusão lógica

1. Confirma existência e propriedade.
2. Compara a senha com `Account.password`.
3. Impede exclusão com doações em andamento.
4. Anonimiza `Usuario` e marca `INATIVO`.
5. Cancela itens elegíveis.
6. Revoga todas as sessões do usuário.

## 6. Comandos

```bash
npm test -- --runInBand src/tests/services/usuarioService.spec.js
npm test -- --runInBand src/tests/services/autenticacaoService.spec.js
npm run test:coverage -- --runInBand
```

## 7. Critério de aceite

- senha nunca retornada nem persistida em `Usuario`;
- alterações de acesso não aceitas pela rota comum;
- senha atualizada somente em `Account`;
- exclusão e suspensão revogam sessões;
- visibilidade respeita ator e perfil;
- todos os cenários da suíte aprovados.
