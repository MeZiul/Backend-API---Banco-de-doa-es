FROM node:24-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /node-app

# Copiamos o schema antes das dependências porque @prisma/client pode executar
# geração no postinstall em algumas versões.
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm install --include=dev
RUN npm run prisma:generate

COPY . .

EXPOSE 7340
CMD ["npm", "start"]
