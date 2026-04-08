@echo off
REM ObraFirmada - Setup Script para Windows

setlocal enabledelayedexpansion

color 0A
title ObraFirmada Setup

echo.
echo ================================
echo Inicializador ObraFirmada
echo ================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no esta instalado
    pause
    exit /b 1
)

echo OK Docker detectado
echo.

REM Levantar servicios
echo Iniciando servicios...
docker compose up -d

REM Esperar a MySQL
echo Esperando MySQL...
timeout /t 10

REM Backend
cd backend

if not exist "node_modules" (
    echo Instalando dependencias backend...
    call npm install
)

echo Generando Prisma...
call npx prisma generate

echo Aplicando migraciones...
call npx prisma migrate deploy

REM Frontend
cd ..\frontend

if not exist "node_modules" (
    echo Instalando dependencias frontend...
    call npm install
)

cd ..

echo.
echo ================================
echo OK Setup completado
echo ================================
echo.
echo URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001/api
echo   Database:  localhost:3306
echo.
echo Desarrollo:
echo   Backend:  cd backend ^&^& npm run start:dev
echo   Frontend: cd frontend ^&^& npm run dev
echo.
pause
