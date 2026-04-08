/**
 * ARQUITECTURA OBRAFIRMADA - Documentación Técnica
 * 
 * Diseñada con Arquitectura Hexagonal (Puertos y Adaptadores)
 * Principios SOLID estrictamente aplicados
 * Cumplimiento normativo: Ley 19.628 Chile, OWASP, NIST
 */

# 🏗️ Arquitectura Hexagonal - ObraFirmada

## Principios Fundamentales

### 1. Arquitectura en Capas (Hexagonal)

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│            Controllers | DTOs | HTTP Handlers                │
│  (REST/GraphQL - Adaptador externo)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ Boundary
┌──────────────────────┴──────────────────────────────────────┐
│                  Application Layer                           │
│          Services | Use Cases | Direct Handlers              │
│         (Lógica de Negocio implementada)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ Boundary
┌──────────────────────┴──────────────────────────────────────┐
│                    Domain Layer                              │
│     Entities | Value Objects | Interfaces (Puertos)         │
│       (Core de negocio, sin dependencias externas)           │
└──────────────────────┬──────────────────────────────────────┘
                       │ Boundary
┌──────────────────────┴──────────────────────────────────────┐
│              Infrastructure Layer                            │
│      Repositories | Database | Cache | Email (Adaptadores)  │
│         (Implementaciones concretas de puertos)              │
└─────────────────────────────────────────────────────────────┘
```

### 2. SOLID Principles - Aplicación Práctica

#### S - Single Responsibility Principle

**✅ CORRECTO:**
```typescript
// Cada servicio tiene UNA responsabilidad
@Injectable()
export class EnrollmentService {
  // SOLO maneja lógica de enrolamiento
  async initiateEnrollment(dto) { }
  async captureBiometric(dto) { }
}

@Injectable()
export class CryptographyService {
  // SOLO maneja criptografía
  generateBiometricHash(image) { }
  encryptSensitiveData(data) { }
}
```

**❌ EVITAR:**
```typescript
// NO hacer todo en un servicio
@Injectable()
export class SuperService {
  enrollUser() { }
  sendEmail() { }
  generateReport() { }
  validatePayment() { }
  // ❌ Demasiadas responsabilidades
}
```

#### O - Open/Closed Principle

**✅ CORRECTO:**
```typescript
// Abierto a extensión, cerrado a modificación
export interface IUserRepository {
  create(data): Promise<User>;
  findById(id): Promise<User | null>;
}

// Nueva implementación de caché sin modificar código existente
@Injectable()
export class CachedUserRepository implements IUserRepository {
  constructor(
    private prismaRepo: PrismaUserRepository,
    private cache: CacheService
  ) {}
  
  async findById(id: string): Promise<User | null> {
    // Usa caché, pero sigue el mismo contrato
  }
}
```

#### L - Liskov Substitution Principle

**✅ CORRECTO:**
```typescript
// Cualquier implementación de IUserRepository 
// puede reemplazar a otra sin romper el sistema
const repo: IUserRepository = new PrismaUserRepository(prisma);
// ó
const repo: IUserRepository = new CachedUserRepository(prisma, cache);
// ó
const repo: IUserRepository = new MockUserRepository(); // para tests

// El código cliente NO cambia
const service = new EnrollmentService(repo);
```

#### I - Interface Segregation Principle

**✅ CORRECTO:**
```typescript
// Interfaces específicas y pequeñas
export interface IUserRepository {
  create(data): Promise<User>;
  findById(id): Promise<User | null>;
}

export interface IEmailService {
  sendWelcomeEmail(email: string): Promise<void>;
}

// Cliente solo depende de lo que necesita
@Injectable()
export class EnrollmentService {
  constructor(
    private userRepo: IUserRepository,
    private emailService?: IEmailService // Opcional
  ) {}
}
```

**❌ EVITAR:**
```typescript
// Interfaz "fat" con métodos no necesarios
export interface IGiantService {
  createUser() { }
  sendEmail() { }
  generateReport() { }
  validatePayment() { }
  uploadFile() { }
  // Cliente debe implementar TODO incluso si necesita 1
}
```

#### D - Dependency Inversion Principle

**✅ CORRECTO:**
```typescript
// Service depende de ABSTRACTO (interfaz)
@Injectable()
export class EnrollmentService {
  constructor(private userRepository: IUserRepository) {
    // Recibe interfaz, no implementación concreta
  }
}

// Inyección en módulo
{
  provide: 'IUserRepository',
  useClass: PrismaUserRepository  // Intercambiable
}
```

**❌ EVITAR:**
```typescript
// Service depende de CONCRETO (mala práctica)
@Injectable()
export class EnrollmentService {
  private userRepository = new PrismaUserRepository();
  // ❌ Acoplado a Prisma, no testeable
}
```

## Estructura del Módulo Enrollment

```
src/modules/enrollment/
│
├── domain/                          ← CORE DE NEGOCIO
│   └── interfaces/
│       └── user-repository.interface.ts  # Puerto: define contrato
│
├── application/                     ← LÓGICA DE NEGOCIO
│   └── services/
│       └── enrollment.service.ts    # Orchestra la lógica
│
├── infrastructure/                  ← IMPLEMENTACIONES
│   └── repositories/
│       └── prisma-user.repository.ts  # Adaptador: implementa puerto
│
└── presentation/                    ← HTTP
    ├── controllers/
    │   └── enrollment.controller.ts # HTTP Handler
    └── dtos/
        └── enrollment.dto.ts        # Validación de entrada
```

## Flujo de Datos - Enrolamiento

```
HTTP REQUEST (POST /api/enrollment/initiate)
    ↓
[EnrollmentController]  ← Presentation Layer
    ↓
Validar DTO con class-validator (OWASP)
    ↓
[EnrollmentService]     ← Application Layer
    ↓
Validar RUT chileno (checksum Módulo 11)
    ↓
[IUserRepository]       ← Domain Layer (Puerto)
    ↓
[PrismaUserRepository]  ← Infrastructure Layer (Adaptador)
    ↓
[Prisma ORM]
    ↓
[MySQL Database]        ← Persistencia

RESPONSE: EnrollmentResponseDto
```

## Patrones Aplicados

### 1. Repository Pattern

**Objetivo:** Abstracción de persistencia

```typescript
// Puerto (Domain)
export interface IUserRepository {
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
}

// Adaptador (Infrastructure)
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}
  
  async create(data) { return this.prisma.user.create({ data }); }
  async findById(id) { return this.prisma.user.findUnique({ where: { id } }); }
  async update(id, data) { return this.prisma.user.update({ where: { id }, data }); }
}

// Uso (Application)
@Injectable()
export class EnrollmentService {
  constructor(private userRepository: IUserRepository) {}
  
  async initiateEnrollment(dto) {
    return this.userRepository.create({ /* ... */ });
  }
}
```

### 2. Dependency Injection Pattern

```typescript
// NestJS resuelve dependencias automáticamente
@Module({
  providers: [
    PrismaService,
    CryptographyService,
    EnrollmentService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository
    }
  ]
})
export class EnrollmentModule {}

// El framework inyecta en constructores
@Injectable()
export class EnrollmentService {
  constructor(
    @Inject('IUserRepository')  // ← NestJS inyecta
    private userRepository: IUserRepository,
    private cryptography: CryptographyService
  ) {}
}
```

### 3. DTO Pattern (Data Transfer Object)

```typescript
// Separa validación de lógica de negocio
export class InitiateEnrollmentDto {
  @IsString()
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[0-9kK]$|^\d{8}-[0-9kK]$/)
  rut: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  fullName: string;
}

// Controller usa DTO
@Post('initiate')
async initiateEnrollment(@Body() dto: InitiateEnrollmentDto) {
  // DTO ya está validado por class-validator
  return this.service.initiateEnrollment(dto);
}
```

## Seguridad - Capas de Protección

### 1. Presentation Layer
- ✅ Validación de DTO con class-validator
- ✅ CORS restrictivo
- ✅ Rate limiting

### 2. Application Layer
- ✅ Lógica de negocio segura
- ✅ Validaciones adicionales
- ✅ Auditoría de eventos

### 3. Domain Layer
- ✅ Contratos claros
- ✅ Validaciones de negocio
- ✅ Encapsulación de datos

### 4. Infrastructure Layer
- ✅ Encriptación de datos sensibles
- ✅ Hashing de biometría (SHA-256)
- ✅ Validación de integridad

### 5. Database Layer
- ✅ Constraints únicas (RUT, email)
- ✅ Índices para queries rápidas
- ✅ Auditoría automática

## Flujo de Biometría - Irreversible

```
CLIENTE (Frontend)
├─ Capturar imagen facial
├─ Convertir a Base64
└─ Enviar al servidor

SERVIDOR (Backend)
├─ Recibir Base64
├─ Generar SALT criptográfico (16 bytes)
├─ Decodificar Base64 → Buffer binario
├─ Concatenar Buffer + SALT
├─ Aplicar SHA-256 → Hash hexadecimal (64 chars)
├─ Validar que sea SHA-256 válido
├─ PERSISTIR SOLO el hash
│  ❌ LA IMAGEN NUNCA SE GUARDA
│  ❌ EL SALT NO SE GUARDA
│  ❌ NO SE PUEDE RECUPERAR IMAGEN
├─ Registrar en AuditLog
└─ Retornar éxito

RESULTADO:
✅ Usuario identificado por hash único
✅ Imposible recuperar imagen original
✅ Cumple Ley 19.628
✅ Compatible con NIST SP 800-192
```

## Testing Strategy

### Unit Tests
```typescript
// Test del Service sin dependencias externas
describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockCrypto: jest.Mocked<CryptographyService>;

  beforeEach(async => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      // ...
    };
    
    service = new EnrollmentService(mockUserRepository, mockCrypto);
  });

  it('should create user when valid RUT', async () => {
    // Test solo la lógica del servicio
  });
});
```

### Integration Tests
```typescript
// Test el flujo completo con DB real
describe('Enrollment Flow (Integration)', () => {
  it('should complete full enrollment flow', async () => {
    // 1. Initiate
    // 2. Capture Biometric
    // 3. Sign Consent
    // 4. Verify database state
  });
});
```

## Nextjs Architecture

### App Router (Recomendado en Next.js 14)

```
src/app/
├── page.tsx             # Inicio (/ )
├── layout.tsx           # Layout raíz
├── globals.css          # Estilos globales
└── enrollment/
    ├── page.tsx         # /enrollment
    ├── layout.tsx       # Layout de enrolamiento
    └── layout.css       # Estilos
```

### Componentes React

```typescript
// Componente sin estado (Presentacional)
export function ConsentComponent({ onAccept, onReject, isLoading }) {
  return <div>...</div>
}

// Componente con estado (Contenedor)
export default function EnrollmentPage() {
  const [step, setStep] = useState<EnrollmentStep>('consent');
  // Maneja flujo de enrolamiento
}
```

## Monitoreo y Observabilidad

### Logs Estructurados
```typescript
console.log('✅ Biometría capturada', {
  userId,
  biometricType,
  timestamp: new Date().toISOString(),
  hashLength: hash.length
});
```

### AuditLog Model (Prisma)
```prisma
model AuditLog {
  id String @id @default(cuid())
  userId String?
  eventType String      // ENROLLMENT_START, BIOMETRIC_CAPTURE, etc
  description String
  ipAddress String?
  userAgent String?
  result String         // SUCCESS, FAILURE
  metadata String?      // JSON
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
}
```

## Performance Considerations

1. **Database Indexing**
   ```prisma
   @@index([rut])
   @@index([email])
   @@index([enrollmentStatus])
   ```

2. **API Response Caching**
   - GET endpoints: 5 minutos
   - POST: No cacheable

3. **Image Compression**
   - Base64 JPEG con calidad 0.9
   - Máximo 5MB

## Disaster Recovery

### Backup Strategy
```sql
-- Daily backup
mysqldump -u obrafirmada_user -p obrafirmada_dev > backup_$(date +%Y%m%d).sql
```

### Migration Rollback
```bash
npx prisma migrate resolve --rolled-back init
```

---

**Documento de Arquitectura**
**Versión:** 1.0
**Última actualización:** Abril 7, 2026
