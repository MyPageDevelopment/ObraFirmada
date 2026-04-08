# 🚀 GUÍA RÁPIDA - ObraFirmada

## ¿Qué es ObraFirmada?

**ObraFirmada** es una plataforma segura de firma digital para documentos laborales en construcción (Chile) con enrolamiento biométrico.

### HU-01 Completada ✅
- Enrolamiento biométrico
- Validación de RUT chileno
- Consentimiento de privacidad (Ley 19.628)
- Arquitectura Hexagonal + SOLID

---

## 📋 Índice Rápido

1. **[Inicio (5 min)](#-inicio-rápido-5-min)**
2. **[Estrutura (2 min)](#-estructura-del-proyecto)**
3. **[Desarrollo (10 min)](#-desarrollo-local)**
4. **[API (5 min)](#-endpoints-api)**
5. **[Seguridad (5 min)](#-features-seguridad)**

---

## 🎯 Inicio Rápido (5 min)

### Opción 1: Docker (Recomendado)

```bash
# 1. Navegar al proyecto
cd obrafirme

# 2. Verificar estructura
python3 validate-project.py   # En Windows: python validate-project.py

# 3. Iniciar servicios
docker compose up -d

# 4. Esperar ~10 seg y abrir navegador
http://localhost:3000
```

✅ **¡Listo!** Frontend + Backend + MySQL corriendo.

### Opción 2: Local (Sin Docker)

```bash
# Backend
cd backend
npm install
npx prisma db push    # Crear BD
npm run start:dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev

# Abrir
http://localhost:3000
```

---

## 📁 Estructura del Proyecto

```
obrafirme/                      # 🏗️ Raíz del proyecto
│
├── 📦 backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/enrollment/  # 🎯 Módulo principal
│   │   │   ├── domain/          # Interfaces
│   │   │   ├── application/     # Servicios
│   │   │   ├── infrastructure/  # BD
│   │   │   └── presentation/    # HTTP
│   │   ├── shared/services/     # Criptografía
│   │   └── app.module.ts
│   ├── prisma/schema.prisma     # 🗄️ Modelo datos
│   ├── package.json
│   └── Dockerfile
│
├── 🎨 frontend/                # Next.js UI
│   ├── src/
│   │   ├── app/enrollment/      # 🎯 Páginas
│   │   ├── components/          # React componentes
│   │   └── lib/                 # Utilidades
│   ├── package.json
│   └── tailwind.config.js
│
├── 📚 Documentación
│   ├── README.md                # 👈 Empieza aquí
│   ├── ARCHITECTURE.md          # Detalles técnicos
│   ├── HU-01-DETALLE-TECNICO.md # Especificación
│   ├── RESUMEN-EJECUTIVO.md     # Para gerencia
│   └── DEVELOPMENT.md           # Dev commands
│
├── 🐳 docker-compose.yml        # Infraestructura
└── 📋 .env.example              # Variables de entorno
```

---

## 💻 Desarrollo Local

### Terminal 1: Backend

```bash
cd backend

# Primera vez
npm install
npx prisma generate
npx prisma db push

# Desarrollo
npm run start:dev

# Otros comandos útiles
npm run build              # Build para producción
npm run lint               # Verificar código
npm test                   # Ejecutar tests (pendiente)
```

### Terminal 2: Frontend

```bash
cd frontend

# Primera vez
npm install

# Desarrollo
npm run dev

# Otros comandos
npm run build              # Build para producción
npm run type-check         # Verificar tipos TypeScript
```

### Base de datos

```bash
# Dentro de Docker
docker exec -it obrafirmada_mysql mysql -u obrafirmada_user -p obrafirmada_dev

# Usuarios
mysql> SELECT rut, email, enrollmentStatus FROM User;

# Auditoría
mysql> SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT 10;
```

### Prisma Studio (Visual)

```bash
cd backend
npx prisma studio

# Abre: http://localhost:5555
```

---

## 🔌 Endpoints API

### 1️⃣ Iniciar Enrolamiento

```http
POST http://localhost:3001/api/enrollment/initiate

Content-Type: application/json

{
  "rut": "12345678-9",
  "email": "juan@ejemplo.com",
  "fullName": "Juan Pérez García"
}

# Response 201
{
  "userId": "clr9f2xc00000...",
  "rut": "12345678-9",
  "enrollmentStatus": "PENDING"
}
```

### 2️⃣ Capturar Biometría

```http
POST http://localhost:3001/api/enrollment/capture-biometric

{
  "userId": "clr9f2xc00000...",
  "facialImage": "base64...JPG_IMAGE",
  "biometricType": "FACIAL"
}

# Response 200
{
  "userId": "clr9f2xc00000...",
  "enrollmentStatus": "BIOMETRIC_CAPTURED"
}
```

### 3️⃣ Firmar Consentimiento

```http
POST http://localhost:3001/api/enrollment/sign-consent

{
  "userId": "clr9f2xc00000...",
  "acceptsPrivacyTerms": true,
  "acceptsBiometricProcessing": true,
  "acceptsDigitalSignature": true,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}

# Response 200
{
  "userId": "clr9f2xc00000...",
  "enrollmentStatus": "ACTIVE",
  "isConsentSigned": true
}
```

### 4️⃣ Obtener Estado

```http
GET http://localhost:3001/api/enrollment/status/clr9f2xc00000...
```

---

## 🔐 Features de Seguridad

### ✅ Biometría Irreversible
```
Imagen (200KB) ──> SHA-256 ──> Hash (64 chars)
                    + Salt
         ❌ Imagen NO se guarda
```

### ✅ Validación RUT
```
12.345.678-9  ──> Módulo 11  ──> ✅ Válido
                    Pesos 2-7
```

### ✅ Encriptación
```
Datos sensibles  ──> AES-256-GCM  ──> Base64
                      + IV único
```

### ✅ Auditoría
```
Cada evento registra:
- Quién: userId
- Cuándo: timestamp
- Qué: eventType
- Dónde: ipAddress
- Cómo: userAgent
```

---

## 🐛 Troubleshooting

### Puerto 3306 (MySQL) en uso
```bash
# Windows
lsof -i :3306
kill -9 <PID>

# macOS/Linux
lsof -i :3306 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Permiso de cámara denegado
1. Firefox: Revisar preferencias de privacidad
2. Chrome: `chrome://settings/content/camera`
3. Safari: System Preferences → Security & Privacy
4. Edge: `edge://settings/content/camera`

### Base de datos no se conecta
```bash
# Verificar estado de MySQL
docker compose logs db

# Recrear volumen
docker compose down
docker volume rm obrafirme_mysql_data
docker compose up -d
```

### Cambios no aplican en frontend
```bash
# Limpiar caché de Next.js
rm -rf frontend/.next
npm run dev
```

---

## 📊 Testing

### RUT Válido para Testing
```
✅ 12345678-9    (Ejemplo válido)
✅ 18456791-9    (RUT real valid)
❌ 12345678-8    (Checksum inválido)
```

### Imagen Biométrica
- Cualquier JPG/PNG de rostro
- Máximo 5MB
- Se convierte a Base64 automáticamente

### Emails de Testing
- `juan@ejemplo.com`
- `maria@test.cl`
- `trabajo@empresa.com`

---

## 📖 Documentación Completa

| Documento | Para Quién | Contenido |
|-----------|-----------|----------|
| **README.md** | Todos | Inicio y compilación |
| **ARCHITECTURE.md** | Desarrolladores | Detalles arhitéctonico |
| **HU-01-DETALLE-TECNICO.md** | Técnicos | Especificación detallada |
| **RESUMEN-EJECUTIVO.md** | Gerencia | Overview del proyecto |
| **backend/README.md** | Backend devs | Setup backend |
| **frontend/README.md** | Frontend devs | Setup frontend |

---

## 🎓 Conceptos Clave

### Arquitectura Hexagonal
```
Exterior (HTTP, DB) ←→ Interior (Lógica)
Permite cambiar tecnologías sin afectar lógica
```

### SOLID Principles
```
S: Cada servicio hace UNA cosa
O: Se extiende sin modificar
L: Implementaciones intercambiables
I: Interfaces pequeñas y específicas
D: Depender de abstracciones
```

### Patrón Repository
```
Service (no sabe de Prisma)
    ↓ usa
IUserRepository (interfaz)
    ↓ implementada por
PrismaUserRepository (concreta)
    ↓ usa
Prisma ORM
```

---

## 🚀 Deploy (Próxime)

### Producción
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Variables env para prod
```env
NODE_ENV=production
DATABASE_URL=mysql://user:pass@db-prod:3306/obrafirmada
JWT_SECRET=super-secret-key-xxxxx
CORS_ORIGIN=https://obrafirmada.cl
```

---

## 📞 Soporte

| Canal | Contacto |
|-------|----------|
| Email | support@obrafirmada.cl |
| Issues | GitHub Issues |
| Docs | En el proyecto |

---

## ✅ Checklist Inicial

- [ ] Cloné/descargué el proyecto
- [ ] Validé estructura: `python3 validate-project.py`
- [ ] Ejecuté `docker compose up -d`
- [ ] Abrí http://localhost:3000
- [ ] Probé el flujo de enrolamiento
- [ ] Revisé la BD en Prisma Studio
- [ ] Leí ARCHITECTURE.md

**¡Listo para desarrollar!** 🚀

---

## 🎯 Próximas Pasos

1. **Desarrollo**: Implementar HU-02 (Firma de Documentos)
2. **Testing**: Crear suite de tests
3. **API Docs**: Generar Swagger/OpenAPI
4. **Deploy**: Configurar CI/CD
5. **Monitoreo**: Agregar logging y observabilidad

---

**Última actualización**: Abril 7, 2026  
**Versión**: 1.0.0-alpha
