# ObraFirmada - Frontend

## Descripción

Frontend de ObraFirmada desarrollado con Next.js 14 y Tailwind CSS para enrolamiento biométrico y firma de documentos laborales.

### Stack Tecnológico

- **Next.js 14** - Framework React con SSR
- **React 18** - Librería UI
- **TypeScript** - Tipado estricto
- **Tailwind CSS** - Utilidades de estilo
- **Axios** - Cliente HTTP
- **Zustand** - State management

### Características

✅ Flujo de Enrolamiento Completo:
- ✓ Aceptación de consentimiento de privacidad
- ✓ Formulario inicial con validación de RUT
- ✓ Captura de imagen biométrica con cámara
- ✓ Procesamiento de biometría
- ✓ Confirmación de enrolamiento

### Páginas

```
src/app/
├── page.tsx              # Página de inicio
├── enrollment/
│   ├── page.tsx         # Flujo principal de enrolamiento
│   └── layout.tsx       # Layout específico
```

### Componentes

```
src/components/enrollment/
├── consent-component.tsx      # Aceptación de privacidad
├── enrollment-form.tsx        # Formulario inicial
└── biometric-capture.tsx      # Captura de cámara
```

### Servicios

```
src/lib/
├── services/
│   └── enrollment-api.service.ts    # API client
└── utils/
    ├── rut-validator.ts             # Validación RUT
    └── camera.service.ts            # Acceso a cámara
```

## Instalación

### Con Docker Compose

```bash
# Desde la raíz del proyecto
docker compose up -d
```

### Local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Flujo de Enrolamiento

```
1. Pantalla de Consentimiento
   ↓ (User scrolls to bottom & accepts)
   
2. Formulario Inicial
   ├── Validación de RUT chileno
   ├── Email válido
   └── Nombre completo
   ↓ (Submit)

3. Captura Biométrica
   ├── Acceso a cámara del dispositivo
   ├── Preview en tiempo real
   └── Captura de foto
   ↓ (Confirm)

4. Procesamiento Backend
   ├── Hash SHA-256 de imagen
   ├── Firma de consentimiento
   └── Activación de cuenta
   ↓

5. Pantalla de Éxito
   └── Redirección a Dashboard
```

## Validación de RUT Chileno

La función `validateChileanRut()` implementa:

- Normalización de formato (12.345.678-9 → 12345678-9)
- Validación de dígito verificador
- Algoritmo módulo 11 con pesos 2-7

```typescript
import { isValidChileanRut, formatChileanRut } from '@/lib/utils/rut-validator';

// Validar
isValidChileanRut('12345678-9'); // true/false

// Formatear
formatChileanRut('12345678-9'); // '12.345.678-9'
```

## Acceso a Cámara

El componente `BiometricCaptureComponent` proporciona:

- Solicitud de permiso de cámara (con manejo de errores)
- Preview en tiempo real
- Captura de frames
- Conversión a Base64

```typescript
import { CameraService } from '@/lib/utils/camera.service';

// Solicitar acceso
const stream = await CameraService.requestCameraAccess();

// Capturar frame
const base64 = CameraService.captureFrame(videoElement);

// Detener
CameraService.stopMediaStream(stream);
```

## Estilos

Tailwind personalizado con temas:

```tailwind
colors:
  primary: #1F2937    (Gris oscuro)
  secondary: #FFA500  (Naranja)
  danger: #EF4444     (Rojo)
  success: #10B981    (Verde)
```

## API Integration

El servicio `enrollmentApi` encapsula todas las llamadas:

```typescript
import { enrollmentApi } from '@/lib/services/enrollment-api.service';

// Iniciar
enrollmentApi.initiateEnrollment({ rut, email, fullName });

// Capturar biometría
enrollmentApi.captureBiometric({ userId, facialImage, biometricType });

// Firmar consentimiento
enrollmentApi.signConsent({ userId, accepts... });

// Obtener estado
enrollmentApi.getEnrollmentStatus(userId);
```

## Testing Local

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start
```

## Accesibilidad

- ✅ Validaciones en tiempo real
- ✅ Mensajes de error descriptivos
- ✅ Focus states claros
- ✅ Soporte para keyboard navigation
- ✅ Contraste de colores WCAG AA

## Seguridad

- 🔒 HTTPS only (en producción)
- 🔐 No se almacenan credenciales en cliente
- ✅ CSRF protection
- 🛡️ Content Security Policy

## Performance

- ⚡ Next.js Image Optimization
- 📦 Code splitting automático
- 🎯 Tree shaking
- 🚀 Vercel deployment ready

## Contacto

support@obrafirmada.cl
