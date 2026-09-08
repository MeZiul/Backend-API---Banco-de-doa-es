# Collections Postman - DoaI

O runtime atual usa Prisma e PostgreSQL. As collections desta pasta podem apontar para a API local ou para a API pública, conforme o arquivo escolhido.

## Arquivos

- `doai-todas-rotas.postman_collection.json`: referência técnica ampla com exemplos das rotas implementadas.
- `API-DOAI.postman_collection.json`: fluxo anterior da apresentação, mantido para histórico.
- `API-DOAI-FLUXO-PRINCIPAL.postman_collection.json`: fluxo principal completo e automatizado da API pública.

## Preparação local

Suba a API e os bancos:

```bash
docker compose up --build -d
```

Crie a massa de desenvolvimento quando necessário:

```bash
npm run db:seed
```

O seed limpa e recria os dados do banco configurado. Não o execute em um banco que contenha dados que devam ser preservados.

## Usuários de desenvolvimento

- Administrador: `admin@doai.com`
- Doador: `joao@email.com`
- Beneficiária: `ana@email.com`

As senhas de desenvolvimento ficam nas variáveis da collection e correspondem à massa criada pelo seed. Tokens, IDs de usuário, categoria, item, interesse, avaliações e denúncia são preenchidos pelos scripts das próprias requests.

## Fluxo principal automatizado

Importe:

```text
API-DOAI-FLUXO-PRINCIPAL.postman_collection.json
```

A collection utiliza diretamente:

```text
https://api.doai.fs.fslab.dev
```

Execute as requests em ordem, do passo `00` ao `26`. Não é necessário copiar tokens ou IDs.

O roteiro cobre:

1. disponibilidade da API e do Swagger JSON;
2. login do doador;
3. seleção automática de uma categoria ativa;
4. criação do item;
5. login da beneficiária;
6. pesquisa e consulta do item;
7. manifestação e acompanhamento do interesse;
8. notificação ao doador;
9. aceite e notificação à beneficiária;
10. reserva, entrega e recebimento;
11. avaliações das duas partes;
12. criação de denúncia;
13. login e notificação do administrador;
14. resolução administrativa;
15. notificação do resultado aos envolvidos;
16. consulta administrativa do histórico.

Cada request contém testes básicos de status e regra de negócio. Uma falha aparece na aba `Test Results` do Postman e deve ser investigada antes de continuar.

## Reutilizar localmente

Para executar o mesmo fluxo contra o Docker local, altere o valor da variável `baseUrl` e substitua o host das URLs pela opção **Edit > Find and Replace** do Postman:

```text
http://localhost:7340
```

Se a VM publicar a API pela porta 80, o endereço público continua sem porta explícita. Internamente, o Compose deve mapear `80:7340`.

## Reiniciar o roteiro

O fluxo cria registros novos a cada execução. Para repetir:

1. execute novamente o seed no ambiente de demonstração, se puder descartar a massa atual;
2. reimporte a collection ou limpe as variáveis geradas;
3. execute novamente do passo `00`.

O título do item usa `{{$timestamp}}`, reduzindo colisões entre execuções. A categoria é consultada pela API e não possui fallback de ObjectId legado.
