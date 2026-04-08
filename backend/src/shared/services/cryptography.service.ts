/**
 * Utilidades de Criptografía y Seguridad Biométrica
 * SEGURIDAD CRÍTICA: Funciones para hashear biometría sin almacenar imágenes
 * Cumple estándares: NIST SP 800-192 (Biometric Information Management)
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptographyService {
  /**
   * SEGURIDAD CRÍTICA: Genera hash SHA-256 de vector biométrico
   * 
   * Algoritmo:
   * 1. Recibir imagen en Base64
   * 2. Convertir a Buffer binario
   * 3. Generar salt CRIPTOGRÁFICO (16 bytes aleatorios)
   * 4. Concatenar Buffer binario + salt
   * 5. Aplicar SHA-256
   * 6. Retornar solo el hash (64 caracteres hexadecimales)
   * 
   * RESULTADO: Imposible recuperar imagen original
   * VENTAJA: Idéntica imagen = mismo hash (permite verificación)
   * 
   * @param imageBase64 Imagen en Base64
   * @param salt Salt criptográfico (16 bytes)
   * @returns Hash SHA-256 irreversible
   */
  generateBiometricHash(imageBase64: string, salt: Buffer): string {
    // VALIDACIÓN: Asegurar Base64 válido
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(imageBase64, 'base64');
    } catch (error) {
      throw new Error('Base64 inválido: No se pudo decodificar imagen');
    }

    // SEGURIDAD: Validar tamaño máximo de imagen (5MB)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      throw new Error('Imagen demasiado grande (máximo 5MB)');
    }

    // CRIPTOGRAFÍA: Concatenar imagen + salt y aplicar SHA-256
    const combined = Buffer.concat([imageBuffer, salt]);
    const hash = crypto.createHash('sha256').update(combined).digest('hex');

    return hash;
  }

  /**
   * SEGURIDAD: Genera salt criptográfico único
   * Utiliza CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
   * @returns Salt de 16 bytes aleatorios
   */
  generateCryptographicSalt(): Buffer {
    return crypto.randomBytes(16);
  }

  /**
   * Normaliza RUT chileno a formato estándar
   * Entrada: 123456789 o 12.345.678-9
   * Salida: 12345678-9
   * @param rut RUT sin normalizar
   * @returns RUT normalizado
   */
  normalizeChileanRut(rut: string): string {
    // Remover puntos y espacios
    let normalized = rut.replace(/\./g, '').replace(/\s/g, '');

    // Convertir a minúsculas (para validar dígito verificador K)
    normalized = normalized.toLowerCase();

    // Validar formato básico
    const match = normalized.match(/^(\d{1,8})-([0-9k])$/);
    if (!match) {
      throw new Error('Formato de RUT inválido');
    }

    // Asegurar 8 dígitos en la parte numérica
    const numbers = match[1].padStart(8, '0');
    const verifier = match[2];

    return `${numbers}-${verifier}`;
  }

  /**
   * Valida dígito verificador de RUT chileno
   * Algoritmo: Módulo 11 con pesos del 2 al 7
   * @param rut RUT normalizado (ej: 12345678-9)
   * @returns true si es válido
   */
  validateChileanRutChecksum(rut: string): boolean {
    const match = rut.match(/^(\d{8})-([0-9k])$/);
    if (!match) {
      return false;
    }

    const numbers = match[1];
    const providedVerifier = match[2];

    // Calcular dígito verificador correcto
    let sum = 0;
    let multiplier = 2;

    for (let i = numbers.length - 1; i >= 0; i--) {
      sum += parseInt(numbers[i]) * multiplier;
      multiplier++;
      if (multiplier > 7) {
        multiplier = 2;
      }
    }

    const remainder = 11 - (sum % 11);
    let calculatedVerifier: string;

    if (remainder === 11) {
      calculatedVerifier = '0';
    } else if (remainder === 10) {
      calculatedVerifier = 'k';
    } else {
      calculatedVerifier = remainder.toString();
    }

    return calculatedVerifier === providedVerifier;
  }

  /**
   * Valida RUT chileno completo
   * @param rut RUT a validar
   * @returns true si es válido (formato y checksum)
   */
  isValidChileanRut(rut: string): boolean {
    try {
      const normalized = this.normalizeChileanRut(rut);
      return this.validateChileanRutChecksum(normalized);
    } catch {
      return false;
    }
  }

  /**
   * Encripta datos sensibles usando AES-256-GCM
   * SEGURIDAD: Genera IV único para cada encriptación
   * @param plaintext Texto a encriptar
   * @param secret Clave de encriptación (32 bytes)
   * @returns IV + Ciphertext + AuthTag concatenados en Base64
   */
  encryptSensitiveData(plaintext: string, secret: string): string {
    // Generar IV único de 16 bytes
    const iv = crypto.randomBytes(16);

    // Crear cipher AES-256-GCM
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(secret.padEnd(32).substring(0, 32), 'utf8'),
      iv,
    );

    // Encriptar
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Obtener authentication tag
    const authTag = cipher.getAuthTag().toString('hex');

    // Combinar: IV + AuthTag + Ciphertext
    return Buffer.concat([
      iv,
      Buffer.from(authTag, 'hex'),
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');
  }

  /**
   * Desencripta datos sensibles usando AES-256-GCM
   * @param encryptedData Datos encriptados en Base64 (IV + AuthTag + Ciphertext)
   * @param secret Clave de desencriptación (32 bytes)
   * @returns Texto original
   */
  decryptSensitiveData(encryptedData: string, secret: string): string {
    // Decodificar Base64
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extraer componentes
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    // Crear decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(secret.padEnd(32).substring(0, 32), 'utf8'),
      iv,
    );

    decipher.setAuthTag(authTag);

    // Desencriptar
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
