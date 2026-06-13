# Variante alpine para deixar mais leve.
FROM node:24-alpine

# Argumento de build
# NODE_ENV afeta se as dependências de desenvolvimento serão instaladas ou não.
# exemplo, se quiser imagem com ambiente de desenvolvimento, use:
# docker build --build-arg NODE_ENV=development -t meu-app .
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Define o diretório de trabalho dentro do container
WORKDIR /node-app

# Instalar as dependências do projeto,
# Antes de tudo para aproveitar o cache do Docker
COPY package.json package-lock.json ./
RUN npm ci

# Copia todo o projeto
COPY . .

# Utiliza o .env como valor padrão das variáveis de ambiente.
RUN cp .env.example .env

# Comando que será executado quando o container iniciar
ENTRYPOINT ["npm", "start"]