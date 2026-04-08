# ObraFirmada Development

## Quick Commands

```bash
# Iniciar todo
docker compose up -d

# Parar
docker compose down

# Ver logs
docker compose logs -f app
docker compose logs -f db

# Acceder a MySQL
docker exec -it obrafirmada_mysql mysql -u obrafirmada_user -p obrafirmada_dev

# Generar migrations
cd backend
npx prisma migrate dev --name <nombre>

# Ver UI Prisma
npx prisma studio

# Frontend dev
cd frontend
npm run dev

# Backend dev
cd backend
npm run start:dev
```

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- MySQL: localhost:3306
- Prisma Studio: http://localhost:5555

## Database Credentials

- Usuario: obrafirmada_user
- Contraseña: obrafirmada_dev_password
- Base de datos: obrafirmada_dev

## Estructura del Proyecto

```
obrafirme/
├── backend/          # NestJS + Prisma
├── frontend/         # Next.js 14
├── docker-compose.yml
├── .env.example
└── README.md
```

## HU-01 Completada ✅

Enrolamiento Biométrico y Consentimiento de Datos:
- Validación de RUT chileno
- Captura de biometría (Facial)
- Hash SHA-256 irreversible
- Consentimiento de privacidad (Ley 19.628)
- Patrón Repository con SOLID

## Próximas HU

- HU-02: Firma de Documentos Laborales
- HU-03: Auditoría y Reportes
- HU-04: Administración de Usuarios
