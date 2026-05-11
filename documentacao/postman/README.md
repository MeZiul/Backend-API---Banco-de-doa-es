# Collections Postman - DoaI

Esta pasta contem duas collections para testar e apresentar a API.

## Arquivos

- `doai-todas-rotas.postman_collection.json`: collection tecnica com as rotas implementadas e exemplos de payload.
- `doai-apresentacao-fluxo-principal.postman_collection.json`: collection curta para a apresentacao, focada no fluxo doador -> item -> beneficiado -> interesse.

## Antes de usar

1. Suba a API:

```powershell
npm run dev
```

2. Se for demonstrar com dados prontos, rode o seed antes:

```powershell
npm run seed
```

O seed precisa de MongoDB acessivel. Os testes automatizados nao precisam de seed.

## Usuarios padrao do seed

Senha padrao:

```text
Senha@123
```

Usuarios uteis:

- Administrador: `admin@doai.com`
- Doador sugerido: `carlos@email.com`
- Beneficiado sugerido: `ana@email.com`

## Collection completa

Importe:

```text
doai-todas-rotas.postman_collection.json
```

Fluxo recomendado:

1. Rode `Login usuario comum`.
2. Rode `Login beneficiado`.
3. Rode `Login administrador`.
4. Rode `Listar categorias` para preencher `categoriaId`.
5. Rode `Criar item` para preencher `itemId`.
6. Rode as pastas de interesse, denuncia, administracao e avaliacao conforme a demonstracao.

## Collection da apresentacao

Importe:

```text
doai-apresentacao-fluxo-principal.postman_collection.json
```

Antes de apresentar, preencha as variaveis da collection:

- `doadorToken`
- `beneficiadoToken`

Se quiser evitar mostrar login, obtenha esses tokens antes pela collection completa e cole os valores aqui.

Fluxo para apresentar com Figma + Postman:

1. Rode `Buscar categorias e salvar primeira categoriaId`.
2. Mostre no Figma a tela do doador criando item.
3. Rode `Doador cria item de doacao`.
4. Mostre no Figma a tela do beneficiado pesquisando.
5. Rode `Beneficiado pesquisa produto`.
6. Rode `Beneficiado abre detalhes do item`.
7. Mostre no Figma o botao de demonstrar interesse.
8. Rode `Beneficiado demonstra interesse`.
9. Opcional: rode `Doador acompanha interesses recebidos`.
10. Opcional: rode `Doador aceita interesse`.

## Fallback se criacao de item falhar

Se a rota de item ainda nao estiver estavel na hora da apresentacao:

1. Rode o seed.
2. Na collection de apresentacao, rode `Fallback: buscar item existente e salvar itemId`.
3. Pule `Doador cria item de doacao`.
4. Continue a partir de `Beneficiado pesquisa produto` ou `Beneficiado abre detalhes do item`.
