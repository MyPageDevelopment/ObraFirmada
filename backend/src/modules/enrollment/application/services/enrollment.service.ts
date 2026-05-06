/**
 * Servicio de Enrolamiento - Lógica de Negocio
 * SOLID - Single Responsibility: Orquesta enrolamiento sin manejar HTTP directamente
 * SOLID - Inversión de Dependencias: Inyecta IUserRepository, no PrismaUserRepository
 * SEGURIDAD: Maneja biometría de forma segura e irreversible
 */

import { Injectable, BadRequestException, InternalServerErrorException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { IIdentityLogRepository } from '../../domain/interfaces/identity-log-repository.interface';
import { CryptographyService } from '@shared/services/cryptography.service';
import {
  RegisterIdentityDto,
  RegisterIdentityResponseDto,
  IdentityStatusResponseDto,
} from '../../presentation/dtos/enrollment.dto';

@Injectable()
export class EnrollmentService {
  /**
   * Constructor con Inyección de Dependencias
   * SOLID - Inversión: Recibe interfaz IUserRepository, no implementación concreta
   * Permite testing con mocks e intercambiar implementaciones
   */
  constructor(
    @Inject('IUserRepository')
    private userRepository: IUserRepository,
    @Inject('IIdentityLogRepository')
    private identityLogRepository: IIdentityLogRepository,
    private cryptographyService: CryptographyService,
  ) {}

  /**
   * Registrar identidad biometrica y firma manuscrita
   * SEGURIDAD CRITICA:
   * - Genera hash irreversible del vector
   * - Encripta el hash con AES-256-GCM
   * - La imagen original nunca se persiste
   */
  async registerIdentity(dto: RegisterIdentityDto): Promise<RegisterIdentityResponseDto> {
    if (!this.cryptographyService.isValidChileanRut(dto.rut)) {
      throw new BadRequestException('RUT chileno invalido');
    }

    const normalizedRut = this.cryptographyService.normalizeChileanRut(dto.rut);

    const encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new InternalServerErrorException('Configuracion de cifrado no disponible');
    }

    let user = await this.userRepository.findByRut(normalizedRut);
    if (!user) {
      try {
        user = await this.userRepository.create(normalizedRut);
      } catch (error: any) {
        throw new InternalServerErrorException('Error al crear usuario');
      }
    }

    // Dedupe: evitar doble registro inmediato por el mismo RUT
    const latestLog = await this.identityLogRepository.findLatestByRut(normalizedRut);
    if (latestLog) {
      const now = Date.now();
      const lastCaptured = latestLog.capturedAt.getTime();
      const withinWindow = now - lastCaptured < 15000;
      const sameSignature = latestLog.signatureBase64 === dto.signatureBase64;
      const sameType = latestLog.biometricType === dto.biometricType;

      if (withinWindow && sameSignature && sameType) {
        return {
          userId: latestLog.userId,
          identityLogId: latestLog.id,
          rut: normalizedRut,
          biometricType: latestLog.biometricType as 'FACE' | 'PALM',
          capturedAt: latestLog.capturedAt,
        };
      }
    }

    // Procesamiento seguro del vector biometrico
    const salt = this.cryptographyService.generateCryptographicSalt();
    let imageBase64 = dto.biometricImageBase64;
    const biometricHash = this.cryptographyService.generateBiometricHash(imageBase64, salt);

    if (!this.isValidSha256Hash(biometricHash)) {
      throw new InternalServerErrorException('Error al generar hash biometrico');
    }

    const encryptedVector = this.cryptographyService.encryptSensitiveData(biometricHash, encryptionKey);

    // Intento de liberar referencia a imagen en memoria
    imageBase64 = '';

    const identityLog = await this.identityLogRepository.create({
      userId: user.id,
      rut: normalizedRut,
      encryptedBiometricVector: encryptedVector,
      signatureBase64: dto.signatureBase64,
      biometricType: dto.biometricType,
      capturedAt: new Date(),
    });
    return {
      userId: user.id,
      identityLogId: identityLog.id,
      rut: normalizedRut,
      biometricType: identityLog.biometricType as 'FACE' | 'PALM',
      capturedAt: identityLog.capturedAt,
    };
  }

  /**
   * Obtener estado de identidad por RUT
   */
  async getIdentityStatus(rut: string): Promise<IdentityStatusResponseDto> {
    if (!this.cryptographyService.isValidChileanRut(rut)) {
      throw new BadRequestException('RUT chileno invalido');
    }

    const normalizedRut = this.cryptographyService.normalizeChileanRut(rut);
    const latestLog = await this.identityLogRepository.findLatestByRut(normalizedRut);
    const totalLogs = await this.identityLogRepository.countByRut(normalizedRut);

    return {
      rut: normalizedRut,
      hasIdentityLog: !!latestLog,
      lastCapturedAt: latestLog ? latestLog.capturedAt : null,
      totalLogs,
    };
  }

  /**
   * Válida que un string sea un hash SHA-256 válido
   * SHA-256 produce 64 caracteres hexadecimales
   */
  private isValidSha256Hash(hash: string): boolean {
    const sha256Regex = /^[a-f0-9]{64}$/i;
    return sha256Regex.test(hash);
  }
}
