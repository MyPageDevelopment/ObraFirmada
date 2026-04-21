# 🏗️ ObraFirmada - Plataforma de Firma de Documentos Laborales

Plataforma segura para firma digital de documentos laborales en construcción con enrolamiento biométrico irreversible y cumplimiento de Ley 19.628 (Chile).

## 📋 Sobre el Proyecto

**ObraFirmada** es una solución empresarial para la industria de la construcción en Chile que permite:

- ✅ Enrolamiento biométrico seguro (Facial/Palma)
- ✅ Firma digital de documentos laborales
- ✅ Cumplimiento normativo (Ley 19.628)
- ✅ Auditoría completa de acciones
- ✅ Encriptación de datos sensibles

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js)                     │
│  [Enrollment UI] → [Biometric Capture] → [Success Screen]   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
│  [Controllers] → [Services] → [Repositories] → [Database]   │
│  Hexagonal Architecture + SOLID Principles                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (MySQL 8.0 + Prisma)                   │
│  [Users] [DocumentSignatures] [AuditLogs]                   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Con Docker (Recomendado)

```bash
# Clonar o navegar al proyecto
cd obrafirme

# Iniciar servicios
docker compose up -d

# Frontend
http://localhost:3000

# Backend
http://localhost:3001/api

# Base de datos
localhost:3306
```

### Local Development

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📁 Estructura de Carpetas

```
obrafirme/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   └── enrollment/          # HU-01: Enrolamiento
│   │   │       ├── domain/          # Interfaces & Contratos
│   │   │       ├── application/     # Lógica de Negocio
│   │   │       ├── infrastructure/  # Repositorios & ORM
│   │   │       └── presentation/    # Controllers & DTOs
│   │   ├── shared/
│   │   │   └── services/            # Prisma, Criptografía
│   │   └── app.module.ts
│   ├── prisma/
│   │   ├── schema.prisma            # Modelo de datos
│   │   └── init.sql
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── enrollment/          # Flujo de enrolamiento
│   │   │   ├── page.tsx             # Inicio
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   └── enrollment/          # Componentes React
│   │   ├── lib/
│   │   │   ├── services/            # API Client
│   │   │   └── utils/               # RUT Validator, Camera
│   │   └── app/globals.css
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.js
│
├── docker-compose.yml               # Orquestación
└── README.md
```

## 🔐 Seguridad Implementada

### Biometría
- 🔒 Hash SHA-256 irreversible con salt criptográfico
- ✅ NUNCA se almacenan imágenes originales
- 🛡️ Cumple NIST SP 800-192

### Datos
- 🔐 Encriptación AES-256-GCM para datos sensibles
- ✅ Validación OWASP de inputs
- 🚫 No hay filtración de stack traces

### Cumplimiento Legal
- 📋 Ley 19.628 (Protección de Datos Personales - Chile)
- ✅ Formularios de consentimiento explícito
- 📊 Auditoría completa de eventos

## 💡 Conceptos Clave

### Validación de RUT Chileno

```typescript
// ✅ Soporta múltiples formatos
isValidChileanRut('12.345.678-9');  // true
isValidChileanRut('12345678-9');    // true
isValidChileanRut('12345678-K');    // true (dígito K)

// Implementa Módulo 11
// Pesos: 2,3,4,5,6,7,2,3...
```

### Hash Biométrico Irreversible

```
ENTRADA:  Imagen facial (JPG, ~200KB)
    ↓
    └─ Generar salt criptográfico (16 bytes)
    ↓
    └─ Concatenar imagen + salt
    ↓
    └─ SHA-256 → 64 caracteres hex
    ↓
SALIDA: "a1b2c3d4e5f6... (irreversible)"
        ❌ Imposible recuperar imagen original
```

### Patrón Repository (SOLID - D)

```typescript
// 1. Define contrato
interface IUserRepository {
  create(data): Promise<User>;
  findById(id): Promise<User | null>;
}

// 2. Implementa con tecnología específica
class PrismaUserRepository implements IUserRepository { }

// 3. Inyecta interfaz en service
class EnrollmentService {
  constructor(private repo: IUserRepository) {}
  // Usa repo sin conocer implementación
}
```

## 📊 HU-01: Enrolamiento Biométrico y Consentimiento

### Flujo de Usuario

```
┌─────────────────────────────────────────┐
│  1. CONSENTIMIENTO (Ley 19.628)         │
│  - Leer Aviso de Privacidad             │
│  - Aceptar explícitamente               │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  2. FORMULARIO INICIAL                  │
│  - RUT (validar checksum)               │
│  - Email                                 │
│  - Nombre completo                      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  3. CAPTURA BIOMÉTRICA                  │
│  - Acceder a cámara del dispositivo     │
│  - Capturar foto (facial/palma)        │
│  - Convertir a Base64                   │
└──────────────┬──────────────────────────┘
               ↓
         [BACKEND PROCESSING]
      SHA-256 Hash (irreversible)
               ↓
┌─────────────────────────────────────────┐
│  4. CONSENTIMIENTO DIGITAL              │
│  - Firmar electrónicamente              │
│  - Activar cuenta                       │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  ✅ ENROLAMIENTO COMPLETADO             │
│  - Listo para firmar documentos         │
└─────────────────────────────────────────┘
```

### Endpoints API

```http
POST /api/enrollment/initiate
{
  "rut": "12.345.678-9",
  "email": "juan@ejemplo.com",
  "fullName": "Juan Pérez García"
}

POST /api/enrollment/capture-biometric
{
  "userId": "user-123",
  "facialImage": "base64...",
  "biometricType": "FACIAL"
}

POST /api/enrollment/sign-consent
{
  "userId": "user-123",
  "acceptsPrivacyTerms": true,
  "acceptsBiometricProcessing": true,
  "acceptsDigitalSignature": true,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}

GET /api/enrollment/status/:userId
```

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js | 14.2.0 |
| Frontend | React | 18.2.0 |
| Frontend | Tailwind CSS | 3.4.1 |
| Backend | NestJS | 10.2.10 |
| Backend | TypeScript | 5.3.3 |
| Database | MySQL | 8.0.35 |
| ORM | Prisma | 5.6.0 |
| Runtime | Node.js | 20-alpine |
| Container | Docker | Latest |

## 📚 SOLID Principles Aplicados

- **S**ingle Responsibility: Cada servicio hace una cosa
- **O**pen/Closed: Extensible sin modificar código existente
- **L**iskov: IUserRepository intercambiable
- **I**nterface Segregation: DTOs específicos y ligeros
- **D**ependency Inversion: Inyección de interfaces

## 🔍 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📖 Documentación

### Backend
- [Swagger/OpenAPI](http://localhost:3001/api) (Pendiente)
- [Prisma Schema](backend/prisma/schema.prisma)
- [README Backend](backend/README.md)

### Frontend
- [README Frontend](frontend/README.md)
- [Componentes](frontend/src/components/)

## 🚨 Errores Comunes

### Puerto 3306 en uso
```bash
# Windows
netstat -ano | findstr :3306
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3306
kill -9 <PID>
```

### Permisos de cámara
- Firefox: Revisar configuración de privacidad
- Chrome: Verificar `chrome://settings/content/camera`
- Safari: System Preferences → Security & Privacy

### Base de datos
```bash
# Conectarse a MySQL en Docker
docker exec -it obrafirmada_mysql mysql -uobrafirmada_user -p obrafirmada_dev
```

## 📄 Licencia

Propietario - ObraFirmada 2026

## 👥 Equipo

- **Arquitecto**: Senior Fullstack Developer
- **Especialista en Seguridad**: Cybersecurity Expert
- **PM**: Project Manager

---

**Última actualización**: Abril 7, 2026
**Versión**: 1.0.0-alpha
**Estado**: 🟡 Development (HU-01 Completada)
