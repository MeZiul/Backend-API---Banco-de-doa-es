# Contratos HTTP e requisitos atuais

Referência da BE#171, reconciliada com o código em 10/10/2026. Este documento descreve o backend. Aceite de uma tela, funcionamento em produção, disponibilidade e desempenho exigem evidências próprias.

## Autoridade e inventário

O fluxo executável é `routes → controllers → services → repositories → Prisma → PostgreSQL`. Os validators Zod e as regras dos services determinam as entradas e autorizações. `prisma/schema.prisma` e as migrations determinam a persistência. O JSON em `/docs.json` é o mesmo consumido pelo Scalar em `/docs`; os módulos em `src/docs/paths/` definem as operações e `currentContracts.js` converte os validators de escrita para OpenAPI 3.

O inventário tem **50 paths e 71 operações de domínio**, comparados por teste com as rotas realmente registradas pelo Express. Não inclui a infraestrutura `/`, `/docs`, `/docs.json`, assets, `/robots.txt`, `/uploads` estáticos nem o handler nativo `/api/auth/*`. Não publica endpoints apenas planejados, como `PATCH /itens/{id}` ou upload genérico. Os endpoints nativos Better Auth que contornariam políticas de cadastro ou credenciais continuam bloqueados.

Os documentos de milestone e a revisão antiga preservam requisitos históricos, rotas `/usuarios` e Mongo/Mongoose. Seus números, cobertura e checkmarks não constituem aceite atual. O contrato usa `/usuario`, `/itemdoacao` e os aliases explícitos em `/itens` para cancelamento e consulta de interesses.

## Runtime e referência interativa

Use Node **22.12+ na linha 22 ou Node 24**. Prisma 7 e o Scalar instalado restringem o runtime; Docker já usa Node 24. `@scalar/api-reference` está fixado em `1.73.1`. Seu bundle UMD é servido em `/docs/assets/scalar.js`; não há CDN, fontes remotas, proxy, telemetria habilitada ou persistência de autorização. `swagger-jsdoc` permanece como gerador OpenAPI; `swagger-ui-express` foi removido.

O HTML recebe nonce aleatório e `Cache-Control: no-store`. A CSP específica permite o bundle e o inicializador por nonce, estilos dinâmicos do Scalar e conexão à própria origem e aos servidores OpenAPI configurados. Não permite `unsafe-eval` nem script inline sem nonce. JSON, assets, API e 404 mantêm o Helmet global. A permissão `dotfiles: allow` atende somente o arquivo absoluto do bundle instalado, permitindo executá-lo em worktrees sem expor pastas ocultas por URL.

`OPENAPI_DEV_URL` e `OPENAPI_PROD_URL` substituem os antigos nomes `SWAGGER_DEV_URL`/`SWAGGER_PROD_URL`. As URLs são opcionais, deduplicadas e priorizadas conforme `NODE_ENV`; sem configuração, o servidor `/` usa a origem da página. A interface resolve esse fallback para `window.location.origin`, evitando que o cliente Scalar produza `//itemdoacao`; o JSON mantém o servidor relativo importável. O link `/docs/postman` é o ponto de integração da entrega Postman e precisa da rota correspondente antes do aceite integrado. O download OpenAPI funciona independentemente dela.

QA local no Edge: renderização desktop 1440×1000 e mobile 390×844, sem overflow horizontal, sem erros de console/página e sem requisições externas; download com 50 paths/71 operações; navegação por teclado; cliente HTTP GET `/itemdoacao` com resposta 200 em fixture sintética, sem banco. A montagem usa um ID próprio para impedir auto-inicialização do standalone com defaults. O Zod 4 embutido no pacote tenta `Function('')` para detectar suporte a JIT, captura a rejeição e usa seu parser sem JIT: o navegador registra **um evento CSP de eval bloqueado**, sem falha funcional. Essa dependência não foi modificada e a CSP não concede `unsafe-eval`. Teste de persistência/autenticação real e integração Postman são gates separados.

## Sessões, autorização e respostas

- `POST /usuario` cadastra conta com CPF validado e único, sem conceder sessão automática. `perfil`, `situacao`, contadores e identidade são controlados pelo servidor. Campos desconhecidos são rejeitados no cadastro e na atualização do usuário/perfil.
- `POST /auth/login` retorna o envelope `data: { token, usuario }`. O token é uma sessão **opaca**, persistida em `Session`, revogável e enviada em `Authorization: Bearer <token>`. Não é JWT. Senhas ficam em `Account.password` como hash; recuperação usa `Verification` e resposta genérica que não revela a existência da conta.
- Logout revoga a sessão atual. Refresh rotaciona o token atomicamente; o anterior deixa de valer. Alteração de senha revoga sessões. O Bearer no Scalar permanece somente na sessão da página e não é salvo por `persistAuth`.
- As leituras públicas de categorias e itens declaram `security: []`. As demais operações herdam ou declaram Bearer e mantêm verificações de papel, situação e autoria do código. Ser administrador não concede acesso irrestrito às operações de proprietário; a rota específica de cancelamento `/itens/{id}/cancelar` permite proprietário ou administrador.
- O formato comum é `{ data, message, errors }`; algumas rotas de imagem têm resposta própria, descrita no OpenAPI. Os status incluem `400` para entrada/regra inválida, `403` para permissão, `404` para recurso inexistente, `409` para conflito quando usado pelo controller, `429` para rate limit e `498` para sessão inválida/ausente nas rotas protegidas. As respostas permanecem as definidas por cada operação, sem uma padronização nova nesta tarefa.
- IDs novos são UUID. O campo HTTP `_id` é preservado pela compatibilidade Prisma. Validators que ainda aceitam ObjectId legado não tornam um ID legado automaticamente consultável no banco UUID.

Schemas gerados representam tipos, campos, limites e enumerações dos validators. Refinamentos Zod, normalização de aliases, verificação de CPF, unicidade, prazo e autorização são executados pelo código e descritos no contrato; a conversão não consegue representar todas essas condições. Objetos Zod que descartam campos extras são descritos como permissivos com descarte; objetos strict declaram `additionalProperties: false`.

## Itens, interesses, avaliações e moderação

`GET /itemdoacao` lista itens disponíveis sem login. Os filtros consumidos são `busca`, `categoria_id`, `cidade`, `uf`, `condicao_item` e `ordenacao` (`recentes`, `antigos`, `visualizados`, `interessados`); página padrão 1 e limite padrão 20, máximo 100. Nem todo alias aceito pelo validator é consumido pelo controller público; use os nomes documentados.

O fluxo é `DISPONIVEL → RESERVADO → AGUARDANDO_CONFIRMACAO → DOADO`: usuário manifesta interesse, doador aceita, doador confirma entrega, participante aceito confirma recebimento. CAS e transações impedem que duas ações concorrentes concluam a mesma transição. A conclusão incrementa `total_doacoes` uma vez, na mesma transação. Estado, doador, reserva e contadores não são campos editáveis nos corpos de escrita.

Fotos usam `POST /itemdoacao/{id}/fotos`, multipart `fotos`, e remoção pelo ID da foto na rota do item. Exigem proprietário e item disponível. Até cinco fotos; JPEG, PNG e WebP estáticos; até 5 MB por arquivo e 4096 pixels por dimensão. Conteúdo é decodificado/reencodificado, MIME divergente e formatos não aceitos são rejeitados. As imagens raster públicas têm CORP cross-origin específico; o restante mantém a política global.

Avaliações exigem doação concluída, participação correspondente ao tipo e criação em até 30 dias. Uma avaliação por participante/item. Somente o autor edita/remove; edição aceita nota e/ou comentário, sem alterar alvo, item, tipo ou autoria. Não há nova janela de 30 dias para edição nesta entrega. Avaliação e COUNT/AVG da reputação são atualizados na mesma transação, com serialização por usuário avaliado.

Denúncias distinguem alvo ITEM/USUARIO e seus IDs, incluindo aliases previstos pelos validators. Autor só altera denúncia em análise; administração resolve com resultado PROCEDENTE/IMPROCEDENTE e registra a ação. Perfis administrativos e proteções contra autoalteração seguem os guards existentes. Notificações são emitidas best-effort; não existe outbox durável nem garantia de entrega externa nesta implementação.

## Matriz de requisito e evidência

“Implementado e testado no recorte” refere-se aos testes unitários/HTTP existentes; não comprova persistência real, frontend ou produção. Os smokes PostgreSQL listados são verificações adicionais reproduzíveis e precisam de `TEST_DATABASE_URL` local isolada. Não há fallback para `DATABASE_URL` em testes.

| Requisito | Implementação atual | Evidência verificável | Estado e limite |
|---|---|---|---|
| RF-001 cadastro / RF-002 login | `/usuario`, `/auth/login`, Better Auth | `cadastroCpf.spec.js`, `auth.spec.js`, `better-auth-http-smoke.js` | Implementado e testado no recorte; smoke real exige banco próprio |
| RF-003 acesso público | GET categorias/itens com `security: []` | `categoria.spec.js`, `itemDoacao.spec.js`, `docs.spec.js` | Backend público; aceite da home é frontend |
| RF-004 atualizar dados / RF-014 perfil | `/usuario/{id}`, GET/PUT `/perfil` | `usuario.spec.js`, `perfil.spec.js`, `usuarioService.spec.js` | Implementado; campos sensíveis protegidos |
| RF-005 redefinir senha | `/auth/esqueci-senha`, `/auth/redefinir-senha` | `auth.spec.js`, `autenticacaoService.spec.js` | HTTP testado; entrega real de e-mail não verificada por estes mocks |
| RF-006/007/008 itens | criação/edição/cancelamento | `itemDoacao.spec.js`, `ItemDoacaoService.spec.js` | Implementado; não existe PATCH genérico de edição |
| RF-009/016 interesses | `/interesses`, `/itens/{id}/interesses` | `interesse.spec.js`, `InteresseService.spec.js` | Implementado; situação/autoria e concorrência cobertas no recorte |
| RF-010/011 filtros/listagem | feed paginado disponível, filtros do controller | `itemDoacao.spec.js`, `FiltrosProjecoes.spec.js` | Implementado; UI e performance exigem evidências próprias |
| RF-012 fotos | upload/remoção por item | `ImagemItemService.spec.js`, `uploadsCorp.spec.js` | Conteúdo/permissões testados; armazenamento físico tem smoke próprio |
| RF-013 notificações | `/notificacoes`, integração best-effort | `notificacao.spec.js`, `notificacaoAuthScope.spec.js` | API testada; push/e-mail externo e outbox não comprovados |
| RF-015 itens doados / RF-019 status | histórico e fluxo de estados | `ItemDoacaoConcorrencia.spec.js`, `InteresseService.spec.js` | Backend implementado; telas têm tarefas separadas |
| RF-017 feedback/reputação | `/avaliacoes`, transação COUNT/AVG | `avaliacao.spec.js`, `AvaliacaoService.spec.js`, `avaliacao-transaction-smoke.js` | Código e testes; prova SQL adicional pelo smoke isolado |
| RF-018 denúncia/moderação | `/denuncias`, `/admin/*` | `denuncia.spec.js`, `administracao.spec.js` | Backend implementado; interface administrativa separada |
| RF-020 exclusão/desativação | DELETE `/usuario/{id}` e `/perfil` | `usuario.spec.js`, `perfil.spec.js` | Semânticas distintas descritas por rota; exportação LGPD não implementada |
| RF-021 visualizações | contador ao consultar detalhe | `ItemDoacaoService.spec.js` | Código/recorte unitário; sem análise de visitantes únicos |
| RF-022 condições da doação | `condicoes_doacao` é texto livre opcional, máximo 500 caracteres | Validator `ItemDoacaoSchema.js` e inventário | Diverge da revisão histórica que propõe opções predefinidas; enum depende de decisão de produto |
| RF-023 compartilhar | integração do consumidor | Inventário de rotas | Não há endpoint dedicado; aceite de UI separado |
| RF-024 conclusão/contador | CAS, transação e incremento único | `ItemDoacaoConcorrencia.spec.js`, `doacoes-counter-smoke.js` | Implementado/testado no recorte; SQL real tem smoke próprio |
| RNF desempenho/carga | sem benchmark novo nesta entrega | BE#172 | Não verificado; não afirmar throughput/SLA |
| RNF compatibilidade | contrato `_id`, UUID, Node22/24, OpenAPI3 | `prisma-compat.test.mjs`, `docs.spec.js`, QA Scalar | Compatibilidade testada no recorte; clientes externos dependem de integração |
| RNF segurança | guards, sessões, CSP, limites e validação | suites auth/guards/upload/docs; audit BE#170 separado | Controles testados; não equivale a auditoria de segurança completa |
| BE#171 referência/contratos | Scalar local, downloads, inventário e Zod | `docs.spec.js`, `swagger.spec.js` atualizado para Scalar | Testes automatizados e QA navegador; Postman depende da entrega própria |

## Reprodução e limite de aceite

No PowerShell, use `npm.cmd`. Validação focada: `npm.cmd test -- --runInBand --testMatch='**/src/tests/routes/docs.spec.js' --testPathIgnorePatterns='/node_modules/'`. A suíte completa troca o match por `**/src/tests/**/*.spec.js`. O override evita o desalinhamento de caminhos de worktree Windows no Jest; não altera os testes ou seus guards.

O teste documental compara as 71 operações, verifica referências de schemas, parâmetros obrigatórios de path, rotas públicas, campos de escrita, download, nonce distinto, bundle local, CSP global nas demais respostas e rejeição de requisição protegida sem sessão. QA de navegador deve verificar renderização, desktop/mobile, teclado, rede e console, descarga JSON e execução de requisição pela origem configurada. O merge e a revisão independente são gates adicionais; este documento não registra deploy nem aprovação de produção.
