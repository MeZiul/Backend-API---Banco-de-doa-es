# Postman web e integração MCP

`GET /docs/postman` abre o cliente web da coleção principal. A interface usa arquivos locais e requisições diretas para a mesma origem da API. `GET /docs/postman/collection` exige `Authorization: Bearer ...` de administrador ativo, verificado pelos mesmos middlewares da API. A coleção sanitizada não contém e-mails, senhas ou tokens predefinidos.

1. Obtenha uma sessão administrativa em `POST /auth/login`, por exemplo pelo cliente em `/docs`, e informe seu token no campo de abertura da coleção.
2. Preencha os e-mails e senhas das contas de demonstração João, Ana e administrador. As contas devem existir previamente e os participantes devem ser distintos. A página não cria usuários automaticamente.
3. Escolha uma etapa para revisar método, caminho, token e JSON. “Enviar requisição” usa o editor. “Executar as 27 etapas” usa os modelos originais, pede confirmação, captura tokens/UUIDs e para na primeira falha de HTTP ou verificação. As etapas criam e alteram registros reais.
4. A aba mostra HTTP, duração, corpo com campos sensíveis ocultos, verificações e histórico. “Parar” aborta a espera; uma operação já recebida pela API pode ter sido concluída. Confira o estado antes de repetir uma escrita.
5. “Sair e limpar” apaga os dados da aba e tenta revogar todos os tokens usados em `/auth/logout`. Se a rede falhar, a página informa que a revogação não foi confirmada. Recarregar ou fechar a aba apaga a memória local, mas não revoga sessões na API.

O modo multipart permite enviar até cinco arquivos JPEG/PNG/WebP para `/itemdoacao/{UUID}/fotos` com o campo `fotos`. O navegador define o boundary; a API mantém seus limites e validações próprios. O modo JSON limita o corpo a 64 KiB; resposta a 1 MiB; espera a 20 segundos. Não há proxy de requisições, scripts `pm.*`/`eval`, importação arbitrária de coleções, destinos externos ou armazenamento local de credenciais. A página mostra apenas as 27 etapas da coleção canônica, com verificações declarativas próprias; não substitui toda a aplicação Postman.

Cada Bearer enviado é registrado na memória antes da requisição. Substituir uma variável ou interromper a espera preserva o token anterior para revogação ao sair; os valores históricos também são ocultados quando aparecem em respostas e bloqueados em URLs. A regressão de navegador `node scripts/postman-session-smoke.mjs` verifica substituição após resposta e interrupção com três sessões sintéticas, sem banco ou conta real. Ela requer Playwright disponível no ambiente de QA; `POSTMAN_PLAYWRIGHT_PACKAGE` pode apontar ao `package.json` do runtime que fornece o módulo. O teste abre somente Edge headless com perfil temporário e um servidor HTTP efêmero em loopback.

## Postman MCP oficial

A integração local separada em `tools/postman-mcp` instala `@postman/postman-mcp-server` **2.13.0**, fixado em um lockfile próprio. Ela não entra nas dependências nem na inicialização do servidor Express e é excluída do contexto Docker da API, inclusive seu eventual `.env` local. Usa stdio e a configuração mínima de ferramentas do pacote oficial. O MCP administra recursos da conta Postman; o runner web executa requisições na API DoaI. Os tokens de autenticação dessas duas ferramentas têm finalidades diferentes.

```powershell
npm.cmd ci --prefix tools/postman-mcp --ignore-scripts
npm.cmd run check --prefix tools/postman-mcp
```

Para iniciar, gere pessoalmente uma chave na conta Postman e injete `POSTMAN_API_KEY` no ambiente do host MCP ou em um cofre de segredos. O exemplo separado `tools/postman-mcp/.env.example` contém apenas a variável vazia. Se optar pelo arquivo local `tools/postman-mcp/.env`, ele é ignorado pelo Git e pode ser carregado explicitamente:

```powershell
node --env-file=tools/postman-mcp/.env tools/postman-mcp/start.mjs
```

O exemplo `documentacao/postman/codex-mcp.toml.example` mostra uma configuração do Codex desativada por padrão, com a chave herdada do ambiente, sem valor literal. Ao habilitá-la, a lista `enabled_tools` expõe somente sete leituras da conta. O conjunto padrão oficial possui 42 ferramentas, inclusive `runCollection` e escritas; ampliar a lista exige revisar a necessidade e as coleções envolvidas. Ajuste o caminho e habilite no host local quando estiver pronto. Nenhuma configuração global do usuário é alterada pela instalação no repositório. A sintaxe da lista é documentada na [referência oficial do Codex](https://developers.openai.com/codex/config-reference/).

Sem a chave, o launcher recusa iniciar e o teste de instalação confirma apenas o pacote local. `npm.cmd run check:protocol --prefix tools/postman-mcp` valida initialize/listTools via stdio com uma credencial sintética, telemetria desativada e fetch bloqueado; não autentica conta nem chama ferramentas. A comprovação de conexão à conta exige habilitar o MCP no host e executar uma leitura, como listar os workspaces. Não publique a chave na VM nem a forneça ao JavaScript da página.

## Dependências e limites de validação

O audit isolado do MCP em 2026-10-10 passou de **20 alertas (1 crítico, 11 altos, 8 moderados)** para **12 alertas (0 críticos, 6 altos, 6 moderados)** após overrides compatíveis de Handlebars 4.7.10, Flatted 3.4.2, Lodash 4.18.1, node-forge 1.4.0, qs 6.16.0 e Underscore 1.13.8. O handshake do servidor oficial continuou aprovado. O pacote oficial permanece 2.13.0; o lockfile do backend não foi alterado.

Permanecem alertas no grafo Newman/Postman Runtime: Faker, CSV Parse, jose, UUID, node-forge e os pacotes que os consomem. A versão atual de node-forge ainda é apontada pelo audit; atualizar os demais para as versões que eliminam os alertas exigiria saltos de API ou CommonJS/ESM em consumidores legados. Não foram aplicados downgrade do servidor oficial, atualização forçada ou overrides incompatíveis. A integração instalada é local e permanece desativada no exemplo. O protocolo aprovado e a redução dos alertas não comprovam uma integração sem vulnerabilidades ou autenticação na conta.

O override de Handlebars corresponde à correção publicada pelo mantenedor em [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj). O risco de Faker e seu intervalo de versões estão em [GHSA-qxc2-j82w-r537](https://github.com/advisories/GHSA-qxc2-j82w-r537). Revalide `npm audit --prefix tools/postman-mcp` antes de ampliar o uso.

Fontes oficiais consultadas em 2026-10-10: [instalação local](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-local-server), [visão geral](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/overview/) e [repositório Postman Labs](https://github.com/postmanlabs/postman-mcp-server).
