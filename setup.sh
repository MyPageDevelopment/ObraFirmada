#!/bin/bash

# ObraFirmada 🏗️ - Setup Script

echo "================================"
echo "🏗️ ObraFirmada - Setup Inicial"
echo "================================"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

echo "✅ Docker detectado"
echo ""

# Levantar servicios
echo "🚀 Iniciando servicios con Docker Compose..."
docker compose up -d

# Esperar a que MySQL esté listo
echo "⏳ Esperando MySQL..."
sleep 10

# Ir al backend
cd backend

# Instalar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    npm install
fi

# Generar Prisma
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# Aplicar migraciones
echo "📊 Aplicando migraciones..."
npx prisma migrate deploy

# Ir al frontend
cd ../frontend

# Instalar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm install
fi

cd ..

echo ""
echo "================================"
echo "✅ Setup Completado"
echo "================================"
echo ""
echo "📍 URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001/api"
echo "   Database:  localhost:3306"
echo ""
echo "🚀 Para iniciar desarrollo:"
echo "   Backend:  cd backend && npm run start:dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
