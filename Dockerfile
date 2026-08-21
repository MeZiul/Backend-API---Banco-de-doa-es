FROM node:24-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /node-app

# Esta camada só muda quando as dependências mudam, permitindo rebuild offline
# do código e do schema quando a imagem já foi preparada anteriormente.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .

EXPOSE 7340
CMD ["npm", "start"]
