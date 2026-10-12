FROM node:24-alpine AS build

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /node-app

# A geração do Prisma Client precisa do CLI de desenvolvimento, mas acontece
# durante o build e não quando o processo da API inicia.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .

# O Compose local aplica migrations com a Prisma CLI e continua usando scripts
# npm; esse target é somente para desenvolvimento. O target runtime abaixo é o
# estágio final padrão das imagens de produção.
FROM build AS development
CMD ["npm", "start"]

# Não leve a suíte de testes para o estágio de runtime.
FROM build AS production-source
RUN rm -rf -- /node-app/src/tests

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /node-app

# Instala do lockfile somente dependências de produção em uma árvore limpa.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o cliente gerado para a mesma plataforma Alpine/Node da imagem final.
COPY --from=build /node-app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /node-app/package.json ./package.json
COPY --from=build /node-app/server.js ./server.js
COPY --from=production-source /node-app/src ./src
# This exact collection is read by the Postman docs route at runtime.
COPY --from=build /node-app/documentacao/postman/API-DOAI-FLUXO-PRINCIPAL.postman_collection.json ./documentacao/postman/API-DOAI-FLUXO-PRINCIPAL.postman_collection.json

# Verifica a árvore final depois da instalação e da cópia do cliente gerado.
# Não instancia PrismaClient nem tenta conexão com banco.
RUN test -f node_modules/.prisma/client/index.js \
    && test ! -d node_modules/jest \
    && test ! -d node_modules/babel-jest \
    && test ! -d node_modules/@jest/globals \
    && test ! -d node_modules/supertest \
    && test ! -d node_modules/cross-env \
    && test ! -d node_modules/@babel/preset-env \
    && test ! -d node_modules/prisma \
    && test ! -e node_modules/.bin/prisma \
    && node --input-type=module -e 'import { Prisma, PrismaClient } from "@prisma/client"; import { PrismaPg } from "@prisma/adapter-pg"; import sharp from "sharp"; import { createRequire } from "node:module"; import path from "node:path"; import { statSync } from "node:fs"; import { verificarTodasParidades } from "./src/utils/verificarParidadeSchemas.js"; import { buildWebCollection } from "./src/postman/collection.js"; import { registerApiReference } from "./src/docs/scalar.js"; const expected = ["Usuario", "Administracao", "Avaliacao", "Categoria", "Denuncia", "Interesse", "ItemDoacao", "Notificacao"]; const models = Prisma.dmmf.datamodel.models.map(({ name }) => name); if (expected.some((name) => !models.includes(name))) throw new Error("Generated Prisma Client does not match the expected schema models"); verificarTodasParidades(); if (typeof PrismaClient !== "function" || typeof PrismaPg !== "function") throw new Error("Prisma runtime imports are unavailable"); if (typeof sharp !== "function" || !sharp.versions?.sharp) throw new Error("sharp runtime load failed"); const require = createRequire(import.meta.url); const scalar = path.join(path.dirname(require.resolve("@scalar/api-reference")), "browser", "standalone.js"); if (typeof registerApiReference !== "function" || !statSync(scalar).isFile()) throw new Error("Scalar runtime asset is missing"); const requests = buildWebCollection().requests.length; if (requests !== 27) throw new Error("Postman runtime collection is incomplete"); console.log(JSON.stringify({ prismaVersion: Prisma.prismaVersion.client, prismaModels: models.length, parityModels: expected.length, collectionRequests: requests, sharpLoaded: true, scalarBundlePresent: true, databaseConnectionAttempted: false }));'

RUN mkdir -p /node-app/uploads

EXPOSE 7340
CMD ["node", "server.js"]
