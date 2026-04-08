FROM node:20-alpine

WORKDIR /app

# Prisma requiere OpenSSL en runtime/build en Alpine
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Ejecutar migraciones de Prisma y compilar
RUN npx prisma generate && npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
