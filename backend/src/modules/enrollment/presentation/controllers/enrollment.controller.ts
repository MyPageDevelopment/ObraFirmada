/**
 * Controller de Enrolamiento
 * SOLID - Single Responsibility: Solo maneja HTTP, delega lógica al Service
 * SEGURIDAD: Validación de DTOs, captura de IP/User-Agent para auditoría
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentService } from '../../application/services/enrollment.service';
import {
  InitiateEnrollmentDto,
  CaptureBiometricDto,
  SignConsentDto,
  EnrollmentResponseDto,
} from '../dtos/enrollment.dto';
import { Request } from 'express';

@Controller('api/enrollment')
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  /**
   * POST /api/enrollment/initiate
   * Inicia el proceso de enrolamiento
   * Valida RUT chileno y datos iniciales del usuario
   * 
   * @param dto Datos del usuario
   * @returns Usuario creado con estado PENDING
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiateEnrollment(
    @Body() dto: InitiateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentService.initiateEnrollment(dto);
  }

  /**
   * POST /api/enrollment/capture-biometric
   * Captura imagen biométrica (facial o palma)
   * 
   * SEGURIDAD CRÍTICA:
   * - Recibe imagen en Base64
   * - Convierte a hash SHA-256 irreversible
   * - Imagen NUNCA se persiste en la BD
   * 
   * @param dto Imagen en Base64 + userId
   * @returns Usuario con biometría procesada
   */
  @Post('capture-biometric')
  @HttpCode(HttpStatus.OK)
  async captureBiometric(
    @Body() dto: CaptureBiometricDto,
  ): Promise<EnrollmentResponseDto> {
    // VALIDACIÓN: Base64 debe ser válido
    if (!dto.facialImage || !this.isValidBase64(dto.facialImage)) {
      throw new BadRequestException('Imagen inválida o no está en formato Base64');
    }

    return this.enrollmentService.captureBiometric(dto);
  }

  /**
   * POST /api/enrollment/sign-consent
   * Firma el Aviso de Privacidad (Ley 19.628 Chile)
   * 
   * El usuario DEBE aceptar explícitamente:
   * 1. Términos de privacidad
   * 2. Procesamiento biométrico
   * 3. Firma digital de documentos
   * 
   * @param dto Consentimiento y metadatos
   * @param req Request de Express (para capturar IP)
   * @returns Usuario con consentimiento firmado
   */
  @Post('sign-consent')
  @HttpCode(HttpStatus.OK)
  async signConsent(
    @Body() dto: SignConsentDto,
    @Req() req: Request,
  ): Promise<EnrollmentResponseDto> {
    // AUDITORÍA: Capturar IP y User-Agent para investigaciones
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'UNKNOWN';
    const userAgent = (req.headers['user-agent'] as string) || 'UNKNOWN';

    // Actualizar DTO con metadatos
    dto.ipAddress = ipAddress;
    dto.userAgent = userAgent;

    return this.enrollmentService.signConsent(dto);
  }

  /**
   * GET /api/enrollment/status/:userId
   * Obtiene estado actual del enrolamiento
   * 
   * Estados posibles:
   * - PENDING: Iniciado pero sin biometría
   * - BIOMETRIC_CAPTURED: Biometría capturada, falta consentimiento
   * - ACTIVE: Enrolamiento completado
   * - SUSPENDED: Demasiados intentos fallidos
   * 
   * @param userId ID del usuario
   * @returns Estado actual del enrolamiento
   */
  @Get('status/:userId')
  @HttpCode(HttpStatus.OK)
  async getEnrollmentStatus(
    @Param('userId') userId: string,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentService.getEnrollmentStatus(userId);
  }

  /**
   * Valida que un string sea Base64 válido
   * @param str String a validar
   * @returns true si es Base64 válido
   */
  private isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }
}
