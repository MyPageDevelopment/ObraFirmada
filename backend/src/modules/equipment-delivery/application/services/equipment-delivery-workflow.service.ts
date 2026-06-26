import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Readable } from 'node:stream';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BiometricVerificationService } from './biometric-verification.service';
import { EquipmentDeliveryPdfService } from './equipment-delivery-pdf.service';
import { DocumentIntegrityService } from './document-integrity.service';
import {
  CreateEquipmentDeliveryDto,
  CreateEquipmentDeliveryResponseDto,
  BiometricVerificationResponseDto,
  VerifyBiometricDto,
} from '../../presentation/dtos/equipment-delivery.dto';
import { IEquipmentDeliveryRepository } from '../../domain/interfaces/equipment-delivery-repository.interface';
import { IDocumentIntegrityRepository } from '../../domain/interfaces/document-integrity-repository.interface';
import { IUserRepository } from '@modules/enrollment/domain/interfaces/user-repository.interface';
import { CryptographyService } from '@shared/services/cryptography.service';

export interface CreateEquipmentDeliveryDocumentResult extends CreateEquipmentDeliveryResponseDto {
  sealedPdfBuffer: Buffer;
  pdfStream: Readable;
}

@Injectable()
export class EquipmentDeliveryWorkflowService {
  constructor(
    private biometricVerificationService: BiometricVerificationService,
    private equipmentDeliveryPdfService: EquipmentDeliveryPdfService,
    private documentIntegrityService: DocumentIntegrityService,
    @Inject('IEquipmentDeliveryRepository')
    private equipmentDeliveryRepository: IEquipmentDeliveryRepository,
    @Inject('IDocumentIntegrityRepository')
    private documentIntegrityRepository: IDocumentIntegrityRepository,
    @Inject('IUserRepository')
    private userRepository: IUserRepository,
    private cryptographyService: CryptographyService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createDeliveryDocument(dto: CreateEquipmentDeliveryDto): Promise<CreateEquipmentDeliveryDocumentResult> {
    // 1. Geofencing Validation (Sprint 5)
    const GEOFENCING_ENABLED = process.env.GEOFENCING_ENABLED !== 'false';
    const OFFICIAL_LAT = process.env.GEOFENCING_LAT ? parseFloat(process.env.GEOFENCING_LAT) : -33.4489;
    const OFFICIAL_LON = process.env.GEOFENCING_LON ? parseFloat(process.env.GEOFENCING_LON) : -70.6693;
    const MAX_RADIUS = process.env.GEOFENCING_RADIUS ? parseFloat(process.env.GEOFENCING_RADIUS) : 500; // 500 meters

    if (GEOFENCING_ENABLED && dto.latitude !== undefined && dto.latitude !== null && dto.longitude !== undefined && dto.longitude !== null) {
      const distance = this.calculateDistance(dto.latitude, dto.longitude, OFFICIAL_LAT, OFFICIAL_LON);
      if (distance > MAX_RADIUS) {
        throw new BadRequestException(
          `Ubicación fuera del perímetro de la obra (${Math.round(distance)}m > ${MAX_RADIUS}m)`,
        );
      }
    }

    // 2. Resolve User & Validation based on flow type (Biometric vs Exception/Witness)
    let userId: string;
    let verified = false;
    let verifiedAt: Date | null = null;
    let biometricType: 'FACE' | 'PALM' = dto.biometricType || 'FACE';

    if (dto.isException) {
      if (!this.cryptographyService.isValidChileanRut(dto.rut)) {
        throw new BadRequestException('RUT chileno inválido');
      }
      const normalizedRut = this.cryptographyService.normalizeChileanRut(dto.rut);
      const user = await this.userRepository.findByRut(normalizedRut);
      if (!user) {
        throw new BadRequestException('El trabajador debe estar enrolado previamente para registrar una entrega');
      }
      userId = user.id;
      verified = true; // Authorized by witness
    } else {
      const verification = await this.biometricVerificationService.verify1To1(dto);
      userId = verification.userId;
      verified = verification.verified;
      verifiedAt = verification.verifiedAt;
      biometricType = verification.biometricType;
    }

    const deliveredAt = new Date();

    // 3. Persist delivery details including coordinates, exception type, and witness signature
    const delivery = await this.equipmentDeliveryRepository.create({
      userId,
      rut: this.cryptographyService.normalizeChileanRut(dto.rut),
      workerFullName: dto.workerFullName,
      equipmentItems: dto.equipmentItems as unknown as Prisma.JsonValue,
      signatureBase64: dto.signatureBase64,
      deliveredAt,
      biometricValidatedAt: verifiedAt,
      signedAt: deliveredAt,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isException: dto.isException ?? false,
      witnessRut: dto.witnessRut ? this.cryptographyService.normalizeChileanRut(dto.witnessRut) : null,
      witnessFullName: dto.witnessFullName ?? null,
      witnessSignatureBase64: dto.witnessSignatureBase64 ?? null,
      notificationStatus: 'PENDING',
    });

    // 4. Generate PDF including Witness details conditionally (Sprint 4)
    const pdfDocument = await this.equipmentDeliveryPdfService.generate({
      workerFullName: dto.workerFullName,
      rut: this.cryptographyService.normalizeChileanRut(dto.rut),
      biometricType,
      deliveredAt,
      signatureBase64: dto.signatureBase64,
      equipmentItems: dto.equipmentItems,
      isException: dto.isException ?? false,
      witnessRut: dto.witnessRut,
      witnessFullName: dto.witnessFullName,
      witnessSignatureBase64: dto.witnessSignatureBase64,
    });

    const integrity = await this.documentIntegrityService.sealPdf(pdfDocument.pdfBuffer);

    const documentIntegrity = await this.documentIntegrityRepository.create({
      equipmentDeliveryId: delivery.id,
      algorithm: 'SHA-256',
      sha256: integrity.sha256,
      metadata: {
        rut: this.cryptographyService.normalizeChileanRut(dto.rut),
        workerFullName: dto.workerFullName,
        itemCount: dto.equipmentItems.length,
        generatedAt: deliveredAt.toISOString(),
        isException: dto.isException ?? false,
      },
    });

    this.eventEmitter.emit('delivery.created', {
      deliveryId: delivery.id,
      workerRut: delivery.rut,
      workerFullName: delivery.workerFullName,
    });

    return {
      equipmentDeliveryId: delivery.id,
      documentIntegrityId: documentIntegrity.id,
      sha256: integrity.sha256,
      verified,
      verifiedAt: verifiedAt ?? deliveredAt,
      deliveredAt,
      sealedPdfBuffer: integrity.stampedPdfBuffer,
      pdfStream: integrity.pdfStream,
    };
  }

  async listDeliveries(options: {
    skip: number;
    take: number;
    rut?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const deliveries = await this.equipmentDeliveryRepository.findMany(options);
    const total = await this.equipmentDeliveryRepository.count({
      rut: options.rut,
      startDate: options.startDate,
      endDate: options.endDate,
    });
    return { deliveries, total };
  }

  async exportZip(ids: string[]): Promise<Buffer> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un acta para descargar');
    }

    const JSZip = require('jszip');
    const zip = new JSZip();

    for (const id of ids) {
      const delivery = await this.equipmentDeliveryRepository.findById(id);
      if (!delivery) continue;

      const biometricType = (delivery.biometricValidatedAt ? 'FACE' : 'PALM') as 'FACE' | 'PALM';
      const pdfDocument = await this.equipmentDeliveryPdfService.generate({
        workerFullName: delivery.workerFullName,
        rut: delivery.rut,
        biometricType,
        deliveredAt: delivery.deliveredAt,
        signatureBase64: delivery.signatureBase64,
        equipmentItems: delivery.equipmentItems as any,
        isException: delivery.isException,
        witnessRut: delivery.witnessRut || undefined,
        witnessFullName: delivery.witnessFullName || undefined,
        witnessSignatureBase64: delivery.witnessSignatureBase64 || undefined,
      });

      const filename = `acta-entrega-${delivery.rut}-${delivery.id}.pdf`;
      zip.file(filename, pdfDocument.pdfBuffer);
    }

    return zip.generateAsync({ type: 'nodebuffer' });
  }

  async verifyBiometricOnly(dto: VerifyBiometricDto): Promise<BiometricVerificationResponseDto> {
    return this.biometricVerificationService.verify1To1(dto);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}