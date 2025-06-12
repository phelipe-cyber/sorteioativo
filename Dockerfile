# Dockerfile

# Passo 1: Use uma imagem base oficial do Node.js. A versão Alpine é leve.
FROM node:18-slim AS development

# Passo 2: Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Passo 3: Copie os arquivos de dependência primeiro para aproveitar o cache do Docker
COPY package*.json ./

# Passo 4: Instale as dependências do projeto
RUN npm install

# Passo 5: Copie o restante do código da sua aplicação para o diretório de trabalho
COPY . .

# Passo 6: Exponha a porta que o Next.js usa para o desenvolvimento
EXPOSE 3000

# Passo 7: O comando para iniciar a aplicação em modo de desenvolvimento
CMD ["npm", "run", "dev"]