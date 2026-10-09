# Issue 170 — dependências e compatibilidade

Data da inspeção: 09/10/2026. Base: `8790016`.

## Plano antes da validação final

1. Capturar `npm audit --json` integral e com `--omit=dev` antes e depois, mantendo as árvores resolvidas no lockfile. As contagens representam pacotes afetados, não vulnerabilidades exploráveis distintas.
2. Atualizar Sharp para 0.35.5 e Nodemailer para 10.0.16: ambos são usados pelo runtime em uploads raster e recuperação de senha. Validar rejeição/decodificação completa de JPEG/PNG/WebP, dimensões e compensação; SMTP local sintético com o `MailService`/`SendMail` reais, sem servidor ou credenciais externos.
3. Alinhar os pacotes OpenTelemetry publicados (auto-instrumentations 0.81.0, SDK 0.223.0, resources/Jaeger 2.12.0). Não há import/configuração desses SDKs em `src/`, `server.js`, scripts de execução ou Dockerfile: sua presença instalada não comprova observabilidade implementada. Manter os SDKs, sem adicionar instrumentação ao app.
4. Fixar Firebase Admin na versão 13.10.0, já resolvida no lockfile inicial, e atualizar Google Auth para 10.9.1. Ambos não possuem integração ativa no código atual; manter compatibilidade de importação e inicialização sintética. As linhas 14/11 requerem Node >=22 e não serão impostas ao contrato Node20/22/24.
5. Atualizar transitivas vulneráveis dentro de seus intervalos publicados. Para versões fixadas pelo fornecedor, avaliar overrides específicos com provas: MySQL2 da CLI Prisma/BetterAuth (o app usa PostgreSQL), deepmerge-ts de `@prisma/config` (configuração local é objeto simples), uuid CJS de Jaeger/Google. Prisma Client, CLI e adapter continuam em **7.9.1**. Não aceitar o downgrade para 6 sugerido automaticamente pelo audit.
6. Avaliar Jest 30.5.2 em conjunto com globals/Babel-Jest para corrigir a árvore de ferramentas. Usar o guia oficial de migração e a suite completa; nenhuma atualização forçada ou remoção de assertivas para mascarar incompatibilidade.
7. Documentar alertas residuais sem patch publicado. `braces@3.0.3` e `sprintf-js@1.1.3` permanecem versões publicadas mais recentes na inspeção. Não inventar versões, diminuir Prisma ou expor secrets para deixar o relatório verde.

## Fontes primárias consultadas

- Sharp [0.35.0](https://sharp.pixelplumbing.com/changelog/v0.35.0/) e [0.35.5](https://sharp.pixelplumbing.com/changelog/v0.35.5/): requer Node >=20.9, remove opções depreciadas que o DoaI não usa; mantém `failOn`, metadata e formatos raster usados. Mudanças de libvips e formatos adicionais não ampliam a whitelist do DoaI.
- Nodemailer [8](https://github.com/nodemailer/nodemailer/releases/tag/v8.0.0), [9](https://github.com/nodemailer/nodemailer/releases/tag/v9.0.0), [10](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0), [patches atuais](https://github.com/nodemailer/nodemailer/releases) e [SMTP](https://nodemailer.com/smtp): Node >=20 na linha 10, builds ESM/CJS; testar a configuração explícita host/port/secure/auth e o envio text/html existente. Não há uso de SES, envio raw ou transportes removidos na fachada do app.
- [OpenTelemetry SDK 0.223.0](https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.223.0) e [auto-instrumentations 0.81.0](https://github.com/open-telemetry/opentelemetry-js-contrib/releases/tag/auto-instrumentations-node-v0.81.0), metadados `engines/dependencies/peerDependencies` do registry npm para alinhar as famílias.
- [Firebase 13.10.0](https://github.com/firebase/firebase-admin-node/releases/tag/v13.10.0), [Google Auth 10.0.0](https://github.com/googleapis/google-auth-library-nodejs/releases/tag/v10.0.0) e metadados npm de 10.9.1: preservar Node20 e evitar alegar login Google/cloud validado apenas por import.
- [deepmerge-ts 8](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0): corrige referências circulares; mudança de merge de Map avaliada contra `prisma.config.ts` sem Maps. O override deverá passar geração, validate, migrations e persistência reais antes de aceite.
- [Jest 29→30](https://jestjs.io/docs/upgrading-to-jest30): verificar mudanças de matchers e comparação, mocks e descoberta; testar sem remover verificações de domínio.

Os JSONs contêm URLs públicas dos advisories e metadados npm; não contêm `.env`, tokens, credenciais ou configurações da VM. Resultados finais e exposição dos resíduos estão registrados abaixo.

## Implementação e evidências

| Pacote / fonte de exposição | Antes resolvido | Depois resolvido / ação |
| --- | --- | --- |
| Sharp — `src/utils/itemImage.js`, imagens enviadas por usuários | 0.34.5 | 0.35.5; whitelist JPEG/PNG/WebP e limite de pixels preservados |
| Nodemailer — `src/utils/SendMail.js`, e-mails de recuperação | 7.0.13 | 10.0.16; SMTP/configuração explícita mantidos |
| OTEL auto / SDK / resources / Jaeger — instalado, sem integração no app | 0.59.0 / 0.201.1 / 2.10.0 / 2.10.0 | 0.81.0 / 0.223.0 / 2.12.0 / 2.12.0 |
| Firebase Admin / Google Auth — instalado, sem integração no app | 13.10.0 / 9.15.1 | 13.10.0 fixado / 10.9.1 |
| Prisma CLI / Client / adapter-pg — geração e PostgreSQL real | 7.9.1 / 7.9.1 / 7.9.1 | Sem mudança de versão, migrations ou schema |
| MySQL2 — dependência Prisma CLI e Better Auth; app usa PostgreSQL | 3.15.3 | Override 3.24.5; nenhuma conexão MySQL criada |
| deepmerge-ts — configuração Prisma, sem objetos Map no projeto | 7.1.5 | Override específico de `@prisma/config` para 8.0.2 |
| UUID — wrappers CJS Jaeger / Google | 8.3.2 / 9.0.1 | Overrides específicos para 11.1.1; API CJS v4/v5 e bounds testados |
| qs — parsing HTTP Express | 6.15.3 | 6.16.0 dentro do intervalo publicado; testes HTTP existentes passam |
| moment — transitive de timezone | 2.30.1 | 2.31.0 dentro do intervalo |
| js-yaml — tooling e documentação | 3.15.1 | 3.15.2; o alerta restante deriva de sprintf-js, não do merge corrigido |
| Jest / globals / Babel-Jest — testes e instrumentação de cobertura | 29.7.0 | 30.5.2 em conjunto; nenhuma assertiva removida |
| Nodemon — apenas comando `dev`, instalado como dependência de produção | 3.1.14 | Removido; `npm run dev` usa `node --watch server.js`, sem mudar `npm start` |

O watcher nativo é [estável desde Node20.13](https://nodejs.org/docs/latest-v20.x/api/cli.html#--watch), abaixo do mínimo do projeto. O smoke verifica início e reinício reais após modificar um módulo sintético, em pasta temporária própria, encerrando somente a árvore criada pelo teste.

Os overrides foram escolhidos por versões publicadas, advisories e [UUID11.1.1](https://github.com/uuidjs/uuid/releases/tag/v11.1.1)/[MySQL2 3.24.5](https://github.com/sidorares/node-mysql2/releases/tag/v3.24.5). Não houve `npm audit fix --force`, downgrade, mudança de provedor de persistência ou de contratos da API. O SDK Google/Firebase não teve login/cloud real testado: o smoke apenas comprova import/configuração sintética sem solicitar token externo.

### Checks executados em Windows / Node24.15

- `npm ci --no-audit --no-fund` antes: PASS; reinstalação final pelo lockfile: PASS, 987 pacotes instalados.
- Raster/compensação/CORP/autenticação: 3 suítes, 48 testes Jest PASS. Incluem JPEG/PNG/WebP, rejeição SVG/animação/truncamento/dimensões, proprietários e compensação física.
- Suite completa com Jest30: 39 suítes, 444 testes PASS, sem alterar testes existentes. Overrides de descoberta necessários para o caminho `.worktrees` no Windows: `--testPathIgnorePatterns node_modules --testMatch '**/src/tests/**/*.spec.js'`.
- `npm run test:dependencies`: PASS. Usa `MailService` e `SendMail` reais, servidor SMTP somente em 127.0.0.1, autenticação sintética, mensagem text/html e link de recuperação, modo desabilitado e rejeição 550. A mensagem de erro 550 é intencional e o serviço deve convertê-la em falha de recuperação.
- Mesmo smoke: SDKs e UUID CJS PASS; watcher nativo e reload PASS. Nenhuma credencial SMTP/cloud real ou endpoint externo foi usado.
- `check:migration`, `db:validate`, `test:compat`, `test:db`, `test:auth:http`: PASS. As verificações com banco utilizaram exclusivamente `doai_test` no container local próprio identificado por label, papel temporário com senha em memória e remoção do papel ao final. A geração Prisma passou com o override deepmerge8; migrations do teste não tinham pendências. Não foi usado banco de produção.
- `git diff --check` e `node --check scripts/dependency-contract-smoke.js`: PASS.

### Linux Alpine / Docker

- Build do Dockerfile vigente: PASS, imagem local própria `doai-codex-qa170:local`, labels deste chat/issue170. Nenhuma alteração no Dockerfile, volume, serviço da equipe ou produção.
- Base resolvida `node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`; geração Prisma7.9.1 na imagem PASS.
- Containers temporários com `--rm --network none`, sem volumes e sem secrets: `test:dependencies` PASS (SMTP somente dentro do próprio container, SDKs/UUID e watcher/reload). Raster e CORP reais com Sharp binário Linux: 2 suítes, 26 testes PASS.
- A imagem instala ferramentas dev conforme o Dockerfile atual e reportou 19 alertas moderados; não declarar imagem livre de vulnerabilidades com base no omit=dev.

### Resultado npm e risco residual

| Inventário | Antes | Depois |
| --- | --- | --- |
| Integral | 89: 44 altas, 45 moderadas, 0 críticas | 19: 0 altas, 19 moderadas, 0 críticas |
| `--omit=dev` | 60: 17 altas, 43 moderadas, 0 críticas | 0 alertas |

Evidência completa: `audit-before-full.json`, `audit-before-production.json`, `audit-after-full.json`, `audit-after-production.json`. São snapshots desta data; não garantem ausência de futuros advisories nem substituem auditoria de código, containers ou configuração de produção.

Os 19 pacotes restantes são a propagação de um advisory de [sprintf-js — precisão não limitada](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) pela árvore Jest/Babel → instrumentação Istanbul/NYC → js-yaml3 → argparse. Não existe versão publicada corrigida de sprintf-js na inspeção. A API não importa nem recebe formatos para essa árvore; a superfície é tooling/teste/cobertura. O Dockerfile atual executa `npm ci --include=dev`, portanto também instala esse tooling na imagem: **zero no omit=dev não significa zero na imagem**. Não usar os downgrades para Jest25/globals27 sugeridos pelo audit. A retirada de tooling da imagem exige preservar a disponibilidade da CLI Prisma durante migrations e pode ser planejada separadamente.
