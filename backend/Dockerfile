FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Ejecutar migraciones de Prisma y compilar
RUN npx prisma generate && npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
