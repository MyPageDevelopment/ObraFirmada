/**
 * Servicio de Enrolamiento - Lógica de Negocio
 * SOLID - Single Responsibility: Orquesta enrolamiento sin manejar HTTP directamente
 * SOLID - Inversión de Dependencias: Inyecta IUserRepository, no PrismaUserRepository
 * SEGURIDAD: Maneja biometría de forma segura e irreversible
 */

import { Injectable, BadRequestException, ConflictException, InternalServerErrorException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { CryptographyService } from '@shared/services/cryptography.service';
import { InitiateEnrollmentDto, CaptureBiometricDto, SignConsentDto, EnrollmentResponseDto } from '../../presentation/dtos/enrollment.dto';

@Injectable()
export class EnrollmentService {
  /**
   * Constructor con Inyección de Dependencias
   * SOLID - Inversión: Recibe interfaz IUserRepository, no implementación concreta
   * Permite testing con mocks e intercambiar implementaciones
   */
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private cryptographyService: CryptographyService,
  ) {}

  /**
   * FASE 1: Iniciar enrolamiento
   * Valida datos del usuario y crea registro inicial
   * @param dto Datos del usuario
   * @returns Usuario creado con estado PENDING
   */
  async initiateEnrollment(dto: InitiateEnrollmentDto): Promise<EnrollmentResponseDto> {
    // SEGURIDAD: Validar RUT chileno (se valida en DTO también, pero redundancia es seguridad)
    if (!this.cryptographyService.isValidChileanRut(dto.rut)) {
      throw new BadRequestException('RUT chileno inválido');
    }

    // Normalizar RUT
    const normalizedRut = this.cryptographyService.normalizeChileanRut(dto.rut);

    // SEGURIDAD: Verificar que RUT no exista (duplicate check)
    const existingByRut = await this.userRepository.existsByRut(normalizedRut);
    if (existingByRut) {
      throw new ConflictException('RUT ya está registrado en el sistema');
    }

    // SEGURIDAD: Verificar que email no exista
    const existingByEmail = await this.userRepository.existsByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException('Email ya está registrado en el sistema');
    }

    try {
      // Crear usuario con estado PENDING (sin biometría aún)
      const user = await this.userRepository.create({
        rut: normalizedRut,
        email: dto.email,
        fullName: dto.fullName,
        facialBiometricVector: '', // Placeholder, se llenará en siguiente fase
        enrollmentStatus: 'PENDING',
        isConsentSigned: false,
        biometricAttempts: 0,
      } as any);

      return this.mapUserToResponse(user);
    } catch (error: unknown) {
      // SEGURIDAD: No exponer detalles de errores de DB
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2002') {
        throw new ConflictException('Datos duplicados: RUT o email ya existen');
      }
      throw new InternalServerErrorException('Error al crear usuario');
    }
  }

  /**
   * FASE 2: Capturar y procesar biometría
   * SEGURIDAD CRÍTICA: Recibe imagen Base64, la convierte a hash SHA-256 irreversible
   * La imagen NUNCA se almacena en la BD
   * 
   * Flujo:
   * 1. Validar usuario existe y está en estado PENDING
   * 2. Generar salt criptográfico único
   * 3. Convertir imagen Base64 a hash SHA-256 + salt
   * 4. Almacenar solo el hash
   * 5. Actualizar estado a BIOMETRIC_CAPTURED
   * 
   * @param dto Datos con imagen biométrica en Base64
   * @returns Usuario actualizado
   */
  async captureBiometric(dto: CaptureBiometricDto): Promise<EnrollmentResponseDto> {
    // Validar que usuario existe
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Validar que está en estado PENDING
    if (user.enrollmentStatus !== 'PENDING') {
      throw new BadRequestException(`El usuario no puede capturar biometría en estado ${user.enrollmentStatus}`);
    }

    try {
      // SEGURIDAD CRÍTICA: Generar salt único para esta biometría
      const salt = this.cryptographyService.generateCryptographicSalt();

      // SEGURIDAD CRÍTICA: Convertir imagen Base64 a hash irreversible
      const biometricHash = this.cryptographyService.generateBiometricHash(dto.facialImage, salt);

      // Validar que el hash sea válido (64 caracteres hexadecimales para SHA-256)
      if (!this.isValidSha256Hash(biometricHash)) {
        throw new InternalServerErrorException('Error al generar hash biométrico');
      }

      // Actualizar usuario con hash biométrico
      const updateData: any = {
        enrollmentStatus: 'BIOMETRIC_CAPTURED',
        lastBiometricAttemptAt: new Date(),
      };

      if (dto.biometricType === 'FACIAL') {
        updateData.facialBiometricVector = biometricHash;
      } else if (dto.biometricType === 'PALM') {
        updateData.palmBiometricVector = biometricHash;
      }

      const updatedUser = await this.userRepository.update(dto.userId, updateData);

      // AUDITORÍA: Registrar intento exitoso
      console.log(`✅ Biometría capturada para usuario ${dto.userId} - Tipo: ${dto.biometricType}`);

      return this.mapUserToResponse(updatedUser);
    } catch (error: unknown) {
      // AUDITORÍA: Registrar intento fallido
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`❌ Error capturando biometría: ${errorMessage}`);

      // Incrementar contador de intentos fallidos
      const currentAttempts = user.biometricAttempts + 1;
      await this.userRepository.update(dto.userId, {
        biometricAttempts: currentAttempts,
        lastBiometricAttemptAt: new Date(),
      } as any);

      // SEGURIDAD: Si hay demasiados intentos fallidos, suspender cuenta
      if (currentAttempts >= 5) {
        await this.userRepository.update(dto.userId, {
          enrollmentStatus: 'SUSPENDED',
        } as any);
        throw new BadRequestException('Demasiados intentos fallidos. Cuenta suspendida.');
      }

      throw error;
    }
  }

  /**
   * FASE 3: Firmar consentimiento de privacidad
   * CUMPLIMENTO LEY 19.628 CHILE
   * El usuario debe aceptar explícitamente el procesamiento de datos biométricos
   * 
   * @param dto Datos de consentimiento y aceptación
   * @returns Usuario con consentimiento firmado
   */
  async signConsent(dto: SignConsentDto): Promise<EnrollmentResponseDto> {
    // Validar que usuario existe
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // LÓGICA DE NEGOCIO: Todas las aceptaciones son requeridas
    if (!dto.acceptsPrivacyTerms || !dto.acceptsBiometricProcessing || !dto.acceptsDigitalSignature) {
      throw new BadRequestException('Debe aceptar todos los términos para continuar');
    }

    // SEGURIDAD: Validar que usuario tiene biometría capturada
    if (!user.facialBiometricVector) {
      throw new BadRequestException('La biometría debe ser capturada antes de firmar consentimiento');
    }

    try {
      // Actualizar usuario con consentimiento firmado
      const updatedUser = await this.userRepository.update(dto.userId, {
        isConsentSigned: true,
        consentSignedAt: new Date(),
        enrollmentStatus: 'ACTIVE', // Enrolamiento completo
      } as any);

      // AUDITORÍA: Registrar firma de consentimiento
      console.log(`✅ Consentimiento firmado para ${user.rut} - IP: ${dto.ipAddress}`);

      return this.mapUserToResponse(updatedUser);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`❌ Error firmando consentimiento: ${errorMessage}`);
      throw new InternalServerErrorException('Error al firmar consentimiento');
    }
  }

  /**
   * Obtener estado actual de enrolamiento
   * @param userId ID del usuario
   * @returns Estado del enrolamiento
   */
  async getEnrollmentStatus(userId: string): Promise<EnrollmentResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    return this.mapUserToResponse(user);
  }

  /**
   * Mapea entidad User a DTO de respuesta
   * NO incluye datos sensibles como hashes biométricos completos
   */
  private mapUserToResponse(user: any): EnrollmentResponseDto {
    return {
      userId: user.id,
      rut: user.rut,
      email: user.email,
      fullName: user.fullName,
      enrollmentStatus: user.enrollmentStatus,
      isConsentSigned: user.isConsentSigned,
      createdAt: user.createdAt,
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
