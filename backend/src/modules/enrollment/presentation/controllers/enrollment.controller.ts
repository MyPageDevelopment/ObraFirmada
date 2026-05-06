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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentService } from '../../application/services/enrollment.service';
import {
  RegisterIdentityDto,
  RegisterIdentityResponseDto,
  IdentityStatusResponseDto,
} from '../dtos/enrollment.dto';

@Controller('api/enrollment')
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  /**
   * POST /api/enrollment/register-identity
   * Registra identidad biometrica y firma manuscrita
   * 
   * SEGURIDAD CRITICA:
   * - Recibe imagen en Base64
   * - Genera hash irreversible
   * - Encripta con AES-256-GCM
   * - Imagen NUNCA se persiste
   * 
   * @param dto RUT + imagen biometrica + firma
   * @returns Log de identidad creado
   */
  @Post('register-identity')
  @HttpCode(HttpStatus.CREATED)
  async registerIdentity(
    @Body() dto: RegisterIdentityDto,
  ): Promise<RegisterIdentityResponseDto> {
    // VALIDACIÓN: Base64 debe ser válido
    if (!dto.biometricImageBase64 || !this.isValidBase64(dto.biometricImageBase64)) {
      throw new BadRequestException('Imagen inválida o no está en formato Base64');
    }

    if (!dto.signatureBase64 || !this.isValidBase64(dto.signatureBase64)) {
      throw new BadRequestException('Firma inválida o no está en formato Base64');
    }

    return this.enrollmentService.registerIdentity(dto);
  }

  /**
   * GET /api/enrollment/status/:rut
   * Obtiene estado de identidad por RUT
   * 
   * @param rut RUT del usuario
   * @returns Estado actual de identidad
   */
  @Get('status/:rut')
  @HttpCode(HttpStatus.OK)
  async getIdentityStatus(
    @Param('rut') rut: string,
  ): Promise<IdentityStatusResponseDto> {
    return this.enrollmentService.getIdentityStatus(rut);
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
