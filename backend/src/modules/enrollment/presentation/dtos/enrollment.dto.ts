/**
 * DTOs para el módulo de Enrolamiento
 * SOLID - Single Responsibility: Cada DTO valida una responsabilidad específica
 * SEGURIDAD: Validaciones contra OWASP y Ley 19.628
 */

import { IsString, Matches, IsNotEmpty, IsBase64 } from 'class-validator';

/**
 * DTO para registrar identidad biometrica
 * SEGURIDAD CRITICA: Recibe imagen Base64 y firma manuscrita
 */
export class RegisterIdentityDto {
  /**
   * RUT chileno sin puntos ni guion
   * Formato: 12345678-9 o 12.345.678-9
   */
  @IsString()
  @IsNotEmpty({ message: 'El RUT es requerido' })
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[0-9kK]$|^\d{8}-[0-9kK]$/, {
    message: 'El RUT debe estar en formato válido (ej: 12345678-9)',
  })
  rut!: string;

  /**
   * Imagen biometrica en Base64
   * NUNCA se almacena en la BD, solo el vector cifrado
   */
  @IsBase64({}, { message: 'La imagen debe estar en formato Base64' })
  @IsNotEmpty({ message: 'La imagen biometrica es requerida' })
  biometricImageBase64!: string;

  /**
   * Tipo de biometria: FACE, PALM
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^(FACE|PALM)$/)
  biometricType!: 'FACE' | 'PALM';

  /**
   * Firma manuscrita digital en Base64 (canvas)
   */
  @IsBase64({}, { message: 'La firma debe estar en formato Base64' })
  @IsNotEmpty({ message: 'La firma es requerida' })
  signatureBase64!: string;
}

/**
 * DTO de respuesta para registro de identidad
 */
export class RegisterIdentityResponseDto {
  userId: string;
  identityLogId: string;
  rut: string;
  biometricType: 'FACE' | 'PALM';
  capturedAt: Date;
}

/**
 * DTO de respuesta para estado de identidad
 */
export class IdentityStatusResponseDto {
  rut: string;
  hasIdentityLog: boolean;
  lastCapturedAt: Date | null;
  totalLogs: number;
}
