# ObraFirmada - Backend

## Descripción

Backend API para la plataforma ObraFirmada, especializado en enrolamiento biométrico y firma de documentos laborales.

### Stack Tecnológico

- **NestJS** - Framework web progresivo
- **TypeScript** - Tipado estricto
- **Prisma ORM** - Acceso a base de datos
- **MySQL 8.0** - Base de datos relacional
- **JWT** - Autenticación
- **Bcrypt** - Hash seguro
- **Docker** - Containerización

### Características Principales

✅ HU-01 Implementado:
- ✓ Enrolamiento biométrico (Facial/Palma)
- ✓ Validación de RUT chileno con dígito verificador
- ✓ Hash criptográfico irreversible de biometría (SHA-256)
- ✓ Consentimiento de privacidad (Ley 19.628)
- ✓ Inyección de dependencias SOLID
- ✓ Patrón Repository para persistencia

### Arquitectura

La aplicación sigue **Arquitectura Hexagonal (Puertos y Adaptadores)** con separación clara:

```
src/
├── modules/
│   └── enrollment/
│       ├── domain/           # Entidades y contratos (Interfaces)
│       ├── application/      # Lógica de negocio (Services)
│       ├── infrastructure/   # Implementaciones (Repositories, Prisma)
│       └── presentation/     # HTTP Controllers y DTOs
├── shared/
│   └── services/            # Servicios globales (Prisma, Criptografía)
└── app.module.ts            # Módulo raíz
```

### Seguridad

- 🔐 Hashing SHA-256 para biometría (irreversible)
- 🔒 Encriptación AES-256-GCM para datos sensibles
- ✅ Validación con class-validator (OWASP)
- 🛡️ CORS restringido
- 📋 Auditoría de eventos
- 🚫 No se almacenan imágenes originales

### SOLID Principles

1. **S**ingle Responsibility: Cada servicio tiene una responsabilidad única
2. **O**pen/Closed: Abierto a extensión, cerrado a modificación
3. **L**iskov Substitution: Implementaciones intercambiables via interfaces
4. **I**nterface Segregation: Interfaces específicas (IUserRepository)
5. **D**ependency Inversion: Inyección de interfaz, no de implementación

## Instalación

### Con Docker (Recomendado)

```bash
cd backend
docker compose up -d
```

### Local

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Crear migrations
npx prisma migrate dev --name init

# Iniciar en desarrollo
npm run start:dev
```

## Variables de Entorno

```env
NODE_ENV=development
DATABASE_URL=mysql://user:password@localhost:3306/obrafirmada_dev
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Enrolamiento

- `POST /api/enrollment/initiate` - Iniciar enrolamiento
- `POST /api/enrollment/capture-biometric` - Capturar biometría
- `POST /api/enrollment/sign-consent` - Firmar consentimiento
- `GET /api/enrollment/status/:userId` - Obtener estado

## Prisma Commands

```bash
# Abrir UI de Prisma Studio
npm run prisma:studio

# Generar migraciones
npm run prisma:migrate:dev

# Aplicar migraciones en producción
npm run prisma:migrate:prod
```

## Estructura de Archivos Importante

- `prisma/schema.prisma` - Definición del modelo de datos
- `src/modules/enrollment/` - Módulo principal de enrolamiento
- `src/shared/services/` - Servicios reutilizables
- `src/shared/guards/` - Guards de autenticación

## Desarrollo

```bash
# Linting
npm run lint

# Tests
npm run test
npm run test:watch

# Build
npm run build

# Producción
npm run start:prod
```

## Auditoría y Cumplimiento

- ✅ Ley 19.628 (Protección de Datos Personales - Chile)
- ✅ OWASP Top 10 Mitigations
- ✅ NIST SP 800-192 (Biometric Information)
- 📋 AuditLog automático de eventos

## Patrón Repository

El sistema implementa el **Repository Pattern** para abstracción de persistencia:

```typescript
// Interfaz - Define contrato
export interface IUserRepository {
  create(data): Promise<User>;
  findById(id): Promise<User | null>;
  // ...
}

// Implementación - Usa Prisma
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  // Implementación con Prisma
}

// Inyección - En el servicio
@Injectable()
export class EnrollmentService {
  constructor(private userRepository: IUserRepository) {}
}
```

## Contacto

Para reportar issues o sugerencias: support@obrafirmada.cl
