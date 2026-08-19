# Collections Postman - DoaI

> **Nota de migração (18/08/2026):** este documento foi produzido antes da migração de persistência e pode conter referências históricas a MongoDB/Mongoose. O runtime atual usa Prisma + PostgreSQL. Para setup e comandos atuais, consulte `README.md` e `MIGRACAO_PRISMA.md`.


Esta pasta contem duas collections para testar e apresentar a API.

## Arquivos

- `doai-todas-rotas.postman_collection.json`: collection tecnica com as rotas implementadas e exemplos de payload.
- `API-DOAI.postman_collection.json`: collection curta para a apresentacao, focada no fluxo doador -> item -> beneficiado -> interesse. Ela salva tokens e IDs automaticamente nas variaveis da collection.

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
- Doador sugerido: `joao@email.com`
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
API-DOAI.postman_collection.json
```

Fluxo automatizado:

- `0 - Preparar categoria para o item` salva `categoriaId`
- `1 - Login como Joao (doador)` salva `joaoToken` e `joaoId`
- `2 - Joao cria item` salva `itemId`
- `4 - Login como Ana (interessada)` salva `anaToken` e `anaId`
- `5 - Ana manifesta interesse` salva `interesseId`
- `6 - Joao lista interesses recebidos` reforca/salva `interesseId`

Depois disso, os headers protegidos usam Bearer Token automaticamente e as URLs usam `{{itemId}}` e `{{interesseId}}` sem copiar nada manualmente.

### URLs diretas em localhost

Use estes endpoints se precisar conferir ou recriar as requests manualmente no PC da apresentacao:

```text
0 - Preparar categoria para o item
GET http://localhost:7340/categorias?page=1&limite=10

1 - Login como Joao (doador)
POST http://localhost:7340/auth/login

2 - Joao cria item
POST http://localhost:7340/itemdoacao

3 - Verificar item publico
GET http://localhost:7340/itemdoacao/{{itemId}}

4 - Login como Ana (interessada)
POST http://localhost:7340/auth/login

5 - Ana manifesta interesse
POST http://localhost:7340/interesses

6 - Joao lista interesses recebidos
GET http://localhost:7340/interesses/recebidos?page=1&limite=10

7 - Joao aceita o interesse
PUT http://localhost:7340/interesses/{{interesseId}}/aceitar

8 - Verificar item reservado
GET http://localhost:7340/itemdoacao/{{itemId}}

9 - Joao confirma entrega
PUT http://localhost:7340/itemdoacao/{{itemId}}/confirmar-entrega

10 - Ana confirma recebimento
PUT http://localhost:7340/itemdoacao/{{itemId}}/confirmar-recebimento
```

Fluxo para apresentar com Figma + Postman:

1. Rode `0 - Preparar categoria para o item`.
2. Mostre no Figma a tela do doador criando item.
3. Rode `1 - Login como Joao (doador)`.
4. Rode `2 - Joao cria item`.
5. Mostre no Figma a tela do beneficiado pesquisando.
6. Rode `3 - Verificar item publico`.
7. Rode `4 - Login como Ana (interessada)`.
8. Mostre no Figma o botao de demonstrar interesse.
9. Rode `5 - Ana manifesta interesse`.
10. Rode `6 - Joao lista interesses recebidos`.
11. Opcional: rode `7 - Joao aceita o interesse`.
12. Opcional: rode `8 - Verificar item reservado`.

## Fallback se criacao de item falhar

Se a rota de item ainda nao estiver estavel na hora da apresentacao:

1. Rode o seed.
2. Use a collection completa para listar itens e copiar um `itemId` para a variavel `itemId` da collection `API-DOAI`.
3. Pule `2 - Joao cria item`.
4. Continue a partir de `3 - Verificar item publico`.
