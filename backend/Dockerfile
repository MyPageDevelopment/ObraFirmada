FROM node:20-bookworm-slim

WORKDIR /app

# Prisma requiere OpenSSL disponible para detectar y generar el engine correcto
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
