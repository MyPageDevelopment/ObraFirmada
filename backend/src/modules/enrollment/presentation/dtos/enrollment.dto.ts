/**
 * DTOs para el módulo de Enrolamiento
 * SOLID - Single Responsibility: Cada DTO valida una responsabilidad específica
 * SEGURIDAD: Validaciones contra OWASP y Ley 19.628
 */

import { IsString, IsEmail, Matches, IsNotEmpty, IsBase64, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para iniciar enrolamiento
 * Valida datos iniciales del trabajador
 */
export class InitiateEnrollmentDto {
  /**
   * RUT chileno sin puntos ni guión
   * Formato: 12345678-9
   * Se valida con dígito verificador
   */
  @IsString()
  @IsNotEmpty({ message: 'El RUT es requerido' })
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[0-9kK]$|^\d{8}-[0-9kK]$/, {
    message: 'El RUT debe estar en formato válido (ej: 12345678-9)',
  })
  rut: string;

  /**
   * Email del trabajador
   * Se valida formato RFC 5322
   */
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(255)
  email: string;

  /**
   * Nombre completo del trabajador
   */
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  fullName: string;
}

/**
 * DTO para captura de biometría
 * SEGURIDAD CRÍTICA: Se recibe imagen en Base64 y se convierte a hash irreversible
 */
export class CaptureBiometricDto {
  /**
   * ID de usuario siendo enrolado
   */
  @IsString()
  @IsNotEmpty({ message: 'El ID de usuario es requerido' })
  userId: string;

  /**
   * Imagen facial en Base64
   * Se valida tamaño máximo y formato
   * NUNCA se almacena en la BD, solo el hash SHA-256
   */
  @IsBase64({}, { message: 'La imagen debe estar en formato Base64' })
  @IsNotEmpty({ message: 'La imagen facial es requerida' })
  facialImage: string;

  /**
   * Tipo de biometría: FACIAL, PALM, IRIS
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^(FACIAL|PALM|IRIS)$/)
  biometricType: 'FACIAL' | 'PALM' | 'IRIS';
}

/**
 * DTO para firma de consentimiento
 * SEGURIDAD: Cumple requisitos de Ley 19.628 de Chile
 */
export class SignConsentDto {
  /**
   * ID de usuario que firma
   */
  @IsString()
  @IsNotEmpty({ message: 'El ID de usuario es requerido' })
  userId: string;

  /**
   * Indicador: Usuario acepta términos de privacidad
   */
  @IsNotEmpty({ message: 'Debe aceptar los términos' })
  acceptsPrivacyTerms: boolean;

  /**
   * Indicador: Usuario acepta procesamiento de biometría
   */
  @IsNotEmpty({ message: 'Debe aceptar el procesamiento biométrico' })
  acceptsBiometricProcessing: boolean;

  /**
   * Indicador: Usuario acepta firma de documentos digitales
   */
  @IsNotEmpty({ message: 'Debe aceptar la firma digital de documentos' })
  acceptsDigitalSignature: boolean;

  /**
   * IP del cliente (para auditoría)
   */
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  /**
   * User Agent del navegador (para auditoría)
   */
  @IsString()
  @IsNotEmpty()
  userAgent: string;
}

/**
 * DTO de respuesta para enrolamiento completado
 */
export class EnrollmentResponseDto {
  userId: string;
  rut: string;
  email: string;
  fullName: string;
  enrollmentStatus: string;
  isConsentSigned: boolean;
  createdAt: Date;
}
