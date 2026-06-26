# Arquitectura del Sistema - ObraFirmada

Este documento describe la arquitectura de software, las decisiones de diseño y los flujos clave del proyecto **ObraFirmada**.

## 1. Arquitectura General
El proyecto sigue una arquitectura desacoplada:
- **Backend**: Construido con **NestJS** aplicando principios de **Arquitectura Hexagonal (Puertos y Adaptadores)** y principios SOLID.
- **Frontend**: Desarrollado con **Next.js (App Router)** y TypeScript, implementado como una **Progressive Web App (PWA)** para soportar la firma y registro de asistencia en terreno sin conexión.
- **Base de Datos**: **MySQL** gestionado a través de **Prisma ORM**.

---

## 2. Decisiones de Diseño y Seguridad (Zero-Trust)
1. **Privacidad Biométrica (Ley 19.628)**:
   - No se almacenan imágenes de rostros ni firmas manuscritas en texto plano en ningún servidor o almacenamiento temporal.
   - Las características faciales se extraen en vectores biométricos numéricos y se almacenan cifrados simétricamente mediante **AES-256-GCM** en el backend.
2. **Validación del RUT Chileno**:
   - Algoritmo estricto de módulo 11 tanto en cliente (para retroalimentación de interfaz) como en backend (para validación a nivel de dominio).
3. **Cifrado en IndexedDB**:
   - En modo offline, el frontend almacena los datos de asistencia temporalmente en una base de datos local **IndexedDB** cifrada mediante la **API Web Cryptography (AES-GCM)**.
4. **Integridad de Documentos**:
   - Cada acta PDF generada en el backend pasa por un servicio criptográfico que genera un Checksum **SHA-256** único sobre el stream del PDF. Este hash se registra en la tabla `DocumentIntegrity` para validaciones de fiscalización de la Dirección del Trabajo (DT).
5. **Geofencing**:
   - Las coordenadas GPS reportadas por el cliente son verificadas matemáticamente en el backend contra las coordenadas de la obra oficial usando la **Fórmula de Haversine**. Si la distancia supera los 500 metros (configurable), se bloquea la transacción por razones de seguridad.

---

## 3. Estructura de Módulos (Backend)
La estructura sigue una Arquitectura Hexagonal organizada por capacidades:
- `domain/`: Modelos de negocio, entidades y puertos (interfaces para bases de datos o servicios externos).
- `application/`: Casos de uso, servicios de aplicación y DTOs.
- `infrastructure/`: Implementaciones de puertos (Prisma, criptografía) y adaptadores de salida.
- `presentation/`: Controladores HTTP y de red (Adaptadores de entrada).

---

## 4. Flujo de Trabajo Offline a Online
1. **Detección de Conexión**: El Service Worker y `navigator.onLine` determinan el estado de conexión del navegador.
2. **Firma Offline**: Las transacciones capturadas offline se cifran en memoria con una clave de sesión del navegador y se guardan en IndexedDB.
3. **Sincronización Batch**: Al recuperar la conexión (`online`), el servicio de sincronización recupera el lote offline, lo desencripta y lo transmite mediante un batch upload (`POST /api/equipment-delivery/batch`) al backend, procesando la transacción de forma atómica en base de datos.
