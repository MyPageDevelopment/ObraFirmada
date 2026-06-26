import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CryptographyService } from '@shared/services/cryptography.service';
import { IIdentityLogRepository } from '@modules/enrollment/domain/interfaces/identity-log-repository.interface';
import { BiometricVerificationResponseDto, VerifyBiometricDto } from '../../presentation/dtos/equipment-delivery.dto';

@Injectable()
export class BiometricVerificationService {
  constructor(
    @Inject('IIdentityLogRepository')
    private identityLogRepository: IIdentityLogRepository,
    private cryptographyService: CryptographyService,
  ) {}

  async verify1To1(dto: VerifyBiometricDto): Promise<BiometricVerificationResponseDto> {
    if (!this.cryptographyService.isValidChileanRut(dto.rut)) {
      throw new BadRequestException('RUT chileno invalido');
    }

    const normalizedRut = this.cryptographyService.normalizeChileanRut(dto.rut);
    const latestLog = await this.identityLogRepository.findLatestByRut(normalizedRut);

    if (!latestLog) {
      throw new UnauthorizedException('No existe biometria registrada para el RUT indicado');
    }

    const encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new InternalServerErrorException('Configuracion de cifrado no disponible');
    }

    if (!latestLog.biometricSalt) {
      throw new InternalServerErrorException('El registro biometrico no contiene salt verificable');
    }

    if (!dto.biometricImageBase64) {
      throw new BadRequestException('La imagen biométrica es requerida');
    }

    const storedHash = this.cryptographyService.decryptSensitiveData(
      latestLog.encryptedBiometricVector,
      encryptionKey,
    );
    const liveHash = this.cryptographyService.generateBiometricHash(
      dto.biometricImageBase64,
      Buffer.from(latestLog.biometricSalt, 'hex'),
    );

    const matched = this.safeTimingEqual(storedHash, liveHash);
    if (!matched) {
      throw new UnauthorizedException('Validacion biometrica 1:1 fallida');
    }

    if (latestLog.biometricType !== dto.biometricType) {
      throw new UnauthorizedException('El tipo de biometria no coincide con el registro autorizado');
    }

    return {
      verified: true,
      userId: latestLog.userId,
      identityLogId: latestLog.id,
      rut: normalizedRut,
      biometricType: latestLog.biometricType as 'FACE' | 'PALM',
      verifiedAt: new Date(),
    };
  }

  private safeTimingEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }
}