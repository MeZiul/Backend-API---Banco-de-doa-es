# Revisão de Requisitos, Segurança e Cobertura de Testes

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte o `README.md`.


## Visão geral

| Indicador | Resultado |
|---|---:|
| Requisitos implementados | **22** |
| Requisitos funcionais implementados | **20** |
| Requisitos não funcionais implementados | **2** |
| Requisitos ou endpoints não implementados | **5** |
| Falhas críticas de segurança | **3** |
| Falhas de segurança de alta prioridade | **5** |
| Pontos registrados na revisão | **36** |
| Arquivos sem cobertura total | **60** |

## Sumário

1. [Requisitos implementados](#1-requisitos-implementados)
2. [Requisitos não implementados](#2-requisitos-não-implementados)
3. [Inconsistências e bugs em requisitos existentes](#3-inconsistências-e-bugs-em-requisitos-existentes)
4. [Requisitos não funcionais pendentes](#4-requisitos-não-funcionais-pendentes)
5. [Falhas de segurança e autorização](#5-falhas-de-segurança-e-autorização)
6. [Regras documentadas não cumpridas](#6-regras-documentadas-não-cumpridas)
7. [Bugs técnicos e código morto](#7-bugs-técnicos-e-código-morto)
8. [Resumo dos apontamentos](#8-resumo-dos-apontamentos)
9. [Cobertura de testes](#9-cobertura-de-testes)
10. [Funcionalidades futuras sugeridas](#10-funcionalidades-futuras-sugeridas)

---

## 1. Requisitos implementados

### Requisitos funcionais

| Requisito | Funcionalidade | Status |
|---|---|:---:|
| **RF-001** | Cadastro | ✅ |
| **RF-002** | Login | ✅ |
| **RF-004** | Atualizar dados | ✅ |
| **RF-005** | Redefinir senha | ✅ |
| **RF-006** | Cadastrar item | ✅ |
| **RF-007** | Atualizar item | ✅ |
| **RF-008** | Deletar item | ✅ |
| **RF-009** | Manifestar interesse no item | ✅ |
| **RF-011** | Ver lista de itens | ✅ |
| **RF-012** | Inserir fotos | ✅ |
| **RF-013** | Notificação do interesse | ✅ |
| **RF-014** | Visualizar perfil | ✅ |
| **RF-015** | Acesso a itens doados | ✅ |
| **RF-016** | Acesso a lista de manifestação de interesse | ✅ |
| **RF-017** | Sistema de feedback | ✅ |
| **RF-018** | Denunciar item ou doador | ✅ |
| **RF-019** | Status do item | ✅ |
| **RF-020** | Exclusão de conta | ✅ |
| **RF-021** | Exibir número de visualizações | ✅ |
| **RF-024** | Confirmação de doação | ✅ |

### Requisitos não funcionais

| Requisito | Funcionalidade | Status |
|---|---|:---:|
| **RNF-003** | Compatibilidade | ✅ |
| **RNF-004** | Segurança | ✅ |

---

## 2. Requisitos não implementados

- **RF-003:** Acesso à página inicial sem login.

  - Responsabilidade delegada ao Frontend.

- **RF-023:** Compartilhar item.

  - Requisito opcional e não implementado.

- **Rotas de Perfil:** faltam as implementações previstas na seção 3 da documentação:

  - `3.1 GET /perfil`
  - `3.2 PUT /perfil`
  - `3.3 DELETE /perfil`

- **Atualização parcial de item:** não existe a rota prevista no contrato:

  - `PATCH /itens/:id`

- **Rotas genéricas de upload:** não existem os endpoints:

  - `POST /uploads`
  - `DELETE /uploads`

---

## 3. Inconsistências e bugs em requisitos existentes

### RF-010 — Filtrar itens

O requisito precisa de correção. O parâmetro está implementado como opcional, mas deveria ser obrigatório conforme a especificação.

Além disso, alguns filtros são recebidos, mas ignorados silenciosamente pela implementação:

- `status` do item;
- `usuario_id` do item.

### RF-022 — Requisitos de doação

O requisito foi implementado incorretamente. O código aceita uma `string` livre, mas deveria restringir o valor a opções predefinidas.

### Rotas de Itens

Existe divergência entre a documentação e a implementação da rota de cancelamento:

- Documentação: `5.5 PATCH /itens/:id`
- Implementação atual: `5.8 PUT /itens/:id/cancelar`

Também existem dois prefixos diferentes sendo utilizados para recursos relacionados a itens:

- `/itemdoacao`
- `/itens`

Essa coexistência gera inconsistência no contrato da API.

### Rotas de Usuário

Existe divergência de nomenclatura com o uso do prefixo singular:

- `/usuario`

A própria pendência já é reconhecida no `README`, mas ainda não foi corrigida.

---

## 4. Requisitos não funcionais pendentes

### RNF-001 — Usabilidade

> **Status:** 🟡 A confirmar

Como o requisito determina que o sistema deve ser intuitivo para usuários com pouca experiência, será necessário realizar testes práticos de usabilidade na interface.

Essa validação depende principalmente do Frontend.

### RNF-002 — Desempenho

> **Status:** 🟡 A confirmar

É necessário executar testes de carga na API para verificar se o carregamento das páginas permanece abaixo de três segundos mesmo com um grande volume de dados.

---

## 5. Falhas de segurança e autorização

### 🔴 Severidade crítica

#### Escalonamento de privilégio administrativo

A rota:

```http
PATCH /admin/usuarios/:id/perfil
```

utiliza apenas o `AuthMiddleware` e não realiza uma verificação explícita de perfil administrativo.

Com isso, qualquer usuário autenticado pode potencialmente alterar o próprio perfil ou o perfil de outro usuário para `ADMINISTRADOR`.

A rota deve exigir também uma validação administrativa, como:

```text
EnsureAdminMiddleware
```

ou uma autorização equivalente.

#### Token de redefinição de senha exposto na resposta

No fluxo `esqueciSenha`, o token de redefinição é devolvido diretamente no corpo da resposta HTTP.

Além disso, o token não é enviado por e-mail porque o arquivo `MailService.js` está vazio.

Esse comportamento pode permitir que uma pessoa solicite a redefinição da senha de outra conta e obtenha diretamente o token necessário para assumir essa conta.

O endpoint deve:

1. gerar o token;
2. armazenar apenas uma versão segura dele;
3. enviar o link ao e-mail associado à conta;
4. nunca devolver o token diretamente na resposta pública.

#### Confirmação de recebimento sem validar o usuário

O fluxo `confirmarRecebimento` ignora o usuário autenticado.

Consequentemente, qualquer usuário pode potencialmente marcar como `DOADO` um item relacionado a terceiros.

A confirmação deve validar, no mínimo:

- o usuário autenticado;
- o interesse aceito;
- o destinatário do item;
- o vínculo entre o item e a transação.


### 🟠 Severidade alta

#### Refresh token não é realmente verificado

O fluxo de renovação apresenta dois problemas:

1. a rota exige um access token ainda válido, anulando o propósito do refresh token;
2. o novo token é gerado sem a propriedade `situacao`.

Como consequência, requisições realizadas com o token renovado podem receber `403` nas rotas de `/itemdoacao`.

O fluxo correto deve validar o refresh token de forma independente e gerar um novo access token com todas as claims obrigatórias.

#### Endpoint de avaliações sem escopo de usuário

No endpoint:

```http
GET /avaliacoes
```

o `req.user` é ignorado pelo service.

Assim, a rota pode retornar avaliações de todos os usuários, em vez de limitar o resultado ao usuário autenticado ou ao escopo previsto pela documentação.

#### Middlewares de segurança instalados, mas não utilizados

As seguintes dependências estão instaladas, porém não estão configuradas na aplicação:

- `helmet`;
- `cors`;
- `express-rate-limit`.

A ausência dessas proteções deixa a API sem cabeçalhos de segurança, política explícita de origem e limitação de requisições.

#### Blacklist de logout mantida apenas em memória

A blacklist de tokens usada no logout é armazenada em memória.

Isso significa que os tokens bloqueados voltam a ser aceitos quando:

- o servidor reinicia;
- a aplicação é redeployada;
- outra instância da API recebe a requisição.

A blacklist precisa ser armazenada em um mecanismo persistente e compartilhado, como Redis ou banco de dados.

#### Usuário suspenso continua acessando parte da aplicação

O `EnsureActiveUserMiddleware` está aplicado somente em algumas áreas:

- interesses;
- denúncias;
- administração.

Um usuário suspenso depois de obter um JWT continua podendo usar as demais rotas enquanto o token permanecer válido.

A verificação de situação deve ser aplicada globalmente às rotas autenticadas ou incorporada ao middleware principal de autenticação.

---

## 6. Regras documentadas não cumpridas

### Validação incompleta de CPF

O CPF é validado apenas pelo tamanho da string.

Não existe validação dos dígitos verificadores, permitindo o cadastro de CPFs estruturalmente inválidos.

### Alteração de senha descartada silenciosamente

O schema de atualização aceita o campo de senha, mas o service executa uma remoção equivalente a:

```javascript
delete dados.senha;
```

A solicitação de alteração é, portanto, ignorada sem que o usuário receba um erro ou aviso.

O sistema deve escolher um comportamento explícito:

- permitir a alteração com validação adequada; ou
- rejeitar o campo no schema e orientar o uso de uma rota específica.

### Total de doações nunca é atualizado

O campo `total_doacoes` existe, mas não é incrementado quando uma doação é concluída.

Isso impede que o perfil apresente corretamente o histórico de doações do usuário.

### Interesses nunca expiram automaticamente

O status `EXPIRADO` existe no enum, mas nenhum fluxo da aplicação atribui esse status.

Também não existe job ou rotina periódica para:

- identificar interesses antigos;
- expirar reservas;
- liberar itens que ficaram bloqueados sem confirmação.

### Notificações declaradas, mas nunca emitidas

Os tipos abaixo estão declarados, porém não são utilizados:

- `DOACAO_CONFIRMADA`
- `AVALIACAO_RECEBIDA`

Além disso, a criação de uma nova denúncia não gera notificação para a administração.

### Exclusão de item utiliza hard delete

A documentação determina que a exclusão deve alterar o status do item para `CANCELADO`.

A implementação atual realiza exclusão física do registro.

Isso pode deixar dados relacionados órfãos, incluindo:

- interesses;
- avaliações;
- notificações;
- denúncias;
- referências históricas.

O cancelamento deve preservar o registro e seu histórico.

### Fluxos divergentes de suspensão

Existem dois caminhos diferentes para moderação de usuários.

A suspensão realizada por:

```http
/usuario/:id/suspender
```

não produz os mesmos efeitos do fluxo administrativo.

Esse caminho não realiza adequadamente:

- notificação;
- auditoria;
- registro padronizado da ação.

Os fluxos de moderação devem utilizar uma única regra de negócio.

### Filtros de usuário ignorados

Alguns filtros de usuário são recebidos, mas não aplicados corretamente:

- `email`;
- `cpf`;
- `perfil`.

A API não informa que os parâmetros foram ignorados, produzindo resultados diferentes do esperado sem retornar erro.

---

## 7. Bugs técnicos e código morto

### Filtro MIME rejeita arquivos JPEG

O middleware de upload utiliza:

```text
image-jpeg
```

O MIME correto é:

```text
image/jpeg
```

Como consequência, arquivos JPEG válidos podem ser rejeitados.

### Dockerfile referencia arquivo inexistente

O `Dockerfile` tenta copiar:

```text
.env.example
```

Entretanto, o arquivo existente possui o nome:

```text
.env EXAMPLE
```

Essa divergência pode interromper o processo de build da imagem.

### Uploads não possuem volume persistente

O arquivo de composição não configura um volume para o diretório de uploads.

Com isso, arquivos enviados podem ser perdidos quando o container for removido ou recriado.

### Endpoint de exemplo fica pendente

A rota:

```http
GET /examples
```

está registrada em produção, mas aponta para um controller vazio.

Como nenhuma resposta é enviada, a requisição permanece aberta até ocorrer timeout.

A rota deve ser removida da produção ou receber uma implementação válida.

### Arquivos vazios

Os seguintes arquivos possuem zero bytes:

- `auditoriaRoutes.js`
- `MailService.js`

Esses arquivos indicam funcionalidades incompletas ou código estrutural sem implementação.

### Propriedade incorreta no model de usuário

O campo `cidade` do model `Usuario` utiliza:

```javascript
require
```

em vez de:

```javascript
required
```

Consequentemente, a obrigatoriedade do campo pode não estar sendo aplicada pelo Mongoose.

### Dependência com possível typo-squatting

Existe uma dependência chamada:

```text
mogoose
```

O nome esperado da biblioteca oficial é:

```text
mongoose
```

Essa dependência deve ser removida e investigada, pois pode representar um erro de digitação ou um pacote de typo-squatting.

Também é recomendável:

- revisar o `package-lock.json`;
- verificar se o pacote foi instalado;
- executar auditoria de dependências;
- substituir todas as referências pela biblioteca oficial.

### Verificação de paridade de schemas incompleta

O mecanismo que verifica a paridade dos schemas não cobre:

- `ItemDoacao`;
- `Notificacao`.

Esses recursos podem sofrer divergências entre documentação, validação e modelo sem que o teste de proteção detecte o problema.

---

## 8. Resumo dos apontamentos

| Categoria                                 | Quantidade de pontos |
| ----------------------------------------- | -------------------: |
| Requisitos ou endpoints não implementados |                    5 |
| Inconsistências de contrato e requisitos  |                    5 |
| Requisitos não funcionais a confirmar     |                    2 |
| Falhas críticas de segurança              |                    3 |
| Falhas de segurança de alta prioridade    |                    5 |
| Regras documentadas não cumpridas         |                    8 |
| Bugs técnicos e código morto              |                    8 |
| **Total de pontos registrados**           |               **36** |

---

## 9. Cobertura de testes

O relatório abaixo lista apenas os arquivos que não alcançaram **100% simultaneamente** nas métricas de statements, branches, functions e lines.
### Legenda das métricas

| Sigla | Métrica                             |
| ----- | ----------------------------------- |
| **S** | Statements, instruções executáveis  |
| **B** | Branches, ramificações condicionais |
| **F** | Functions, funções e métodos        |
| **L** | Lines, linhas executáveis           |


### `controllers` — 11 arquivos

| Arquivo                      |      S |      B |      F |      L | Linhas não cobertas                                          |
| ---------------------------- | -----: | -----: | -----: | -----: | ------------------------------------------------------------ |
| `AdministracaoController.js` |   100% |  62,5% |   100% |   100% | —                                                            |
| `AutenticacaoController.js`  | 87,87% |    50% |   100% | 87,87% | `26, 34, 48, 57`                                             |
| `AvaliacaoController.js`     | 93,54% |    50% |   100% | 93,54% | `17, 25`                                                     |
| `CategoriaController.js`     | 96,77% |    50% |   100% | 96,77% | `17`                                                         |
| `DenunciaController.js`      |   100% |    75% |   100% |   100% | —                                                            |
| `ImagemItemController.js`    |  9,09% |     0% |     0% |  9,09% | `7-32, 40-65`                                                |
| `InteresseController.js`     |   100% | 66,66% |   100% |   100% | —                                                            |
| `ItemDoacaoController.js`    | 41,26% | 68,75% | 36,36% | 41,26% | `8-17, 22-45, 50-55, 60-74, 79-89, 93-101, 110-121, 180-182` |
| `NotificacaoController.js`   | 70,83% |  12,5% |    80% | 70,83% | `19, 28, 37, 46-61`                                          |
| `PerfilController.js`        |  7,14% |     0% |     0% |  7,14% | `8-45`                                                       |
| `UsuarioController.js`       | 94,28% |    50% |   100% | 94,28% | `37, 81, 112, 127`                                           |


### `middlewares` — 6 arquivos

| Arquivo                         |      S |      B |    F |      L | Linhas não cobertas          |
| ------------------------------- | -----: | -----: | ---: | -----: | ---------------------------- |
| `AuthMiddleware.js`             | 75,86% |  61,9% | 100% | 75,86% | `20, 27, 37, 43, 52, 67, 70` |
| `EnsureActiveUserMiddleware.js` |  87,5% | 83,33% | 100% |  87,5% | `10, 43`                     |
| `EnsureAdminMiddleware.js`      |   100% | 66,66% | 100% |   100% | —                            |
| `authorize.js`                  |  90,9% | 58,33% | 100% |    90% | `27`                         |
| `uploadMiddleware.js`           | 27,27% |     0% |   0% | 27,27% | `9-14, 19-24`                |
| `validateMiddleware.js`         |    60% |    20% |  75% | 58,33% | `18, 23-32`                  |


### `models` — 2 arquivos

| Arquivo            |      S |    B |      F |      L | Linhas não cobertas |
| ------------------ | -----: | ---: | -----: | -----: | ------------------- |
| `Administracao.js` | 43,75% |   0% |    25% | 53,84% | `46-61, 90-93`      |
| `Denuncia.js`      | 77,77% | 100% | 33,33% | 77,77% | `25-35`             |


### `repositories` — 8 arquivos

| Arquivo                      |      S |      B |      F |      L | Linhas não cobertas           |
| ---------------------------- | -----: | -----: | -----: | -----: | ----------------------------- |
| `AdministracaoRepository.js` | 55,55% | 52,63% | 33,33% | 55,55% | `14-32`                       |
| `AvaliacaoRepository.js`     | 22,22% |     0% |    25% | 22,22% | `11-26, 45-51`                |
| `CategoriaRepository.js`     |    25% |     0% | 33,33% |    25% | `11-20`                       |
| `DenunciaRepository.js`      | 76,47% | 60,86% | 55,55% | 76,47% | `15-31, 63`                   |
| `InteresseRepository.js`     |  62,5% | 69,23% |    50% |  62,5% | `14-36, 52, 84`               |
| `ItemDoacaoRepository.js`    | 34,78% |    50% | 33,33% | 34,78% | `31-42, 84-114, 136-178, 223` |
| `NotificacaoRepository.js`   | 85,71% |     0% | 83,33% | 85,71% | `10`                          |
| `UsuarioRepository.js`       | 46,66% | 44,44% |    30% | 46,66% | `34-64, 111`                  |


### `repositories/base` — 1 arquivo

| Arquivo             |      S |  B |      F |   L | Linhas não cobertas |
| ------------------- | -----: | -: | -----: | --: | ------------------- |
| `BaseRepository.js` | 22,22% | 0% | 33,33% | 25% | `6-21`              |


### `repositories/filters` — 7 arquivos

| Arquivo                         |      S |      B |    F |      L | Linhas não cobertas |
| ------------------------------- | -----: | -----: | ---: | -----: | ------------------- |
| `AdministracaoFilterBuilder.js` |   100% |    50% | 100% |   100% | —                   |
| `AvaliacaoFilterBuilder.js`     |     0% |     0% |   0% |     0% | `3-24`              |
| `CategoriaFilterBuilder.js`     |     0% |     0% |   0% |     0% | `3-19`              |
| `DenunciaFilterBuilder.js`      | 96,87% |    50% | 100% |   100% | —                   |
| `InteresseFilterBuilder.js`     | 95,65% |    50% | 100% |   100% | —                   |
| `ItemDoacaoFilterBuilder.js`    |  87,5% | 53,57% | 100% | 86,84% | `42, 49, 84-88`     |
| `UsuarioFilterBuilder.js`       | 94,11% | 59,09% | 100% |   100% | —                   |


### `services` — 7 arquivos

| Arquivo                   |      S |      B |      F |      L | Linhas não cobertas                                                                  |
| ------------------------- | -----: | -----: | -----: | -----: | ------------------------------------------------------------------------------------ |
| `AdministracaoService.js` | 92,62% | 77,22% | 94,73% | 92,79% | `207, 339, 478, 505, 523, 540, 551-555, 596, 627, 634, 710, 726, 738, 751, 818, 840` |
| `AvaliacaoService.js`     | 95,34% | 84,74% |   100% | 95,34% | `157, 192-199`                                                                       |
| `CategoriaService.js`     |   100% |    75% |   100% |   100% | —                                                                                    |
| `DenunciaService.js`      |   100% | 93,75% |   100% |   100% | —                                                                                    |
| `InteresseService.js`     | 98,83% | 91,37% |   100% | 98,83% | `198, 531`                                                                           |
| `NotificacaoService.js`   | 92,59% | 83,33% | 88,88% |  92,3% | `12, 19`                                                                             |
| `UsuarioService.js`       |    99% | 86,95% |   100% |    99% | `209`                                                                                |


### `tests` — 1 arquivo

| Arquivo   |    S |      B |    F |    L | Linhas não cobertas |
| --------- | ---: | -----: | ---: | ---: | ------------------- |
| `test.js` | 100% | 66,66% | 100% | 100% | —                   |


### `utils/helpers` — 5 arquivos

| Arquivo             |      S |      B |      F |      L | Linhas não cobertas                            |
| ------------------- | -----: | -----: | -----: | -----: | ---------------------------------------------- |
| `CommonResponse.js` | 78,57% | 43,75% | 83,33% | 78,57% | `37-39`                                        |
| `CustomError.js`    |   100% |    50% |   100% |   100% | —                                              |
| `StatusService.js`  |  37,5% | 14,28% | 66,66% | 28,57% | `24-30`                                        |
| `errorHandler.js`   | 44,18% | 45,83% | 66,66% | 45,23% | `27-36, 48-49, 74-77, 89-91, 109-110, 134-139` |
| `messages.js`       |  7,69% |   100% |     4% |  7,69% | `7-41, 48-93`                                  |


### `utils/validators/schemas/zod` — 6 arquivos

| Arquivo                    |      S |      B |      F |      L | Linhas não cobertas |
| -------------------------- | -----: | -----: | -----: | -----: | ------------------- |
| `AvaliacaoSchema.js`       | 85,71% |   100% |    75% | 85,71% | `15`                |
| `DenunciaSchema.js`        |    85% | 92,85% |   100% |    85% | `43-48, 60`         |
| `GerenciarPerfilSchema.js` | 33,33% |   100% |     0% | 33,33% | `5-8`               |
| `InteresseSchema.js`       |   100% | 93,75% |   100% |   100% | —                   |
| `ItemDoacaoSchema.js`      |    50% |   100% |     0% |    50% | `15`                |
| `UsuarioSchema.js`         |  92,3% |   100% | 66,66% |  92,3% | `40`                |


### `utils/validators/schemas/zod/querys` — 6 arquivos

| Arquivo                       |    S |      B |    F |    L | Linhas não cobertas |
| ----------------------------- | ---: | -----: | ---: | ---: | ------------------- |
| `AdministracaoQuerySchema.js` | 100% | 77,41% | 100% | 100% | —                   |
| `AvaliacaoQuerySchema.js`     | 100% | 70,58% | 100% | 100% | —                   |
| `CategoriaQuerySchema.js`     | 100% | 81,25% | 100% | 100% | —                   |
| `DenunciaQuerySchema.js`      | 100% | 88,88% | 100% | 100% | —                   |
| `InteresseQuerySchema.js`     | 100% | 95,23% | 100% | 100% | —                   |
| `UsuarioQuerySchema.js`       | 100% | 85,18% | 100% | 100% | `25-30, 37, 49`     |


### Resumo da cobertura

| Diretório                             | Arquivos sem cobertura total |
| ------------------------------------- | ---------------------------: |
| `controllers`                         |                           11 |
| `middlewares`                         |                            6 |
| `models`                              |                            2 |
| `repositories`                        |                            8 |
| `repositories/base`                   |                            1 |
| `repositories/filters`                |                            7 |
| `services`                            |                            7 |
| `tests`                               |                            1 |
| `utils/helpers`                       |                            5 |
| `utils/validators/schemas/zod`        |                            6 |
| `utils/validators/schemas/zod/querys` |                            6 |
| **Total**                             |              **60 arquivos** |

---

## 10. Funcionalidades futuras sugeridas

As propostas abaixo representam possíveis evoluções do sistema e não fazem parte do escopo atualmente implementado.

| Nº | Funcionalidade                                         | Descrição                                                                                                                                                                                                                                                                                    |
| -: | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1 | **Busca geográfica por proximidade**                   | Implementar índice geoespacial `2dsphere` e disponibilizar o endpoint `GET /itens?lat=&lng=&raio_km=`. Essa funcionalidade está diretamente alinhada ao propósito de fortalecer comunidades locais, substituindo o filtro atual baseado apenas na correspondência exata de cidade e UF.      |
|  2 | **Expiração automática de interesses e reservas**      | Criar um job responsável por marcar interesses antigos como `EXPIRADO`, utilizando o enum já existente, e liberar itens reservados que não receberam confirmação dentro do prazo definido. Isso evita que itens fiquem indefinidamente bloqueados por doadores ou interessados inativos.     |
|  3 | **Lista de desejos e alertas por categoria**           | Permitir que o usuário registre combinações de categoria e cidade de interesse. Quando um item compatível for anunciado, o sistema deverá gerar uma notificação utilizando a infraestrutura de notificações já existente.                                                                    |
|  4 | **Dashboard administrativo**                           | Criar o endpoint `GET /admin/dashboard` para apresentar indicadores como quantidade de itens por status e categoria, taxa de conversão de interesses em doações, tempo médio até a conclusão da entrega e quantidade de denúncias por motivo.                                                |
|  5 | **Reputação e badges**                                 | Implementar o cálculo de indicadores públicos do usuário, como total de doações concluídas, taxa de conclusão e distintivos de reputação, como `Doador Ouro`. Essas informações poderão ser exibidas no perfil público.                                                                      |
|  6 | **Confirmação de entrega por código ou QR Code**       | Gerar um código de seis dígitos ou QR Code no momento em que o interesse for aceito. O código deverá ser validado durante a entrega para confirmar que o item foi recebido pela pessoa correta, corrigindo a ausência de verificação de identidade no fluxo atual de `confirmarRecebimento`. |
|  7 | **Exportação e anonimização de dados conforme a LGPD** | Implementar os endpoints pendentes de `/perfil`, incluindo a exportação dos dados pessoais do usuário em formato JSON e a anonimização dos dados mediante solicitação. A implementação poderá aproveitar a estrutura de anonimização já existente no projeto.                                |


---
