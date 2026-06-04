import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Readable } from 'node:stream';
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
  ) {}

  async createDeliveryDocument(dto: CreateEquipmentDeliveryDto): Promise<CreateEquipmentDeliveryDocumentResult> {
    const verification = await this.biometricVerificationService.verify1To1(dto);
    const deliveredAt = new Date();

    const delivery = await this.equipmentDeliveryRepository.create({
      userId: verification.userId,
      rut: verification.rut,
      workerFullName: dto.workerFullName,
      equipmentItems: dto.equipmentItems as unknown as Prisma.JsonValue,
      signatureBase64: dto.signatureBase64,
      deliveredAt,
      biometricValidatedAt: verification.verifiedAt,
      signedAt: deliveredAt,
    });

    const pdfDocument = await this.equipmentDeliveryPdfService.generate({
      workerFullName: dto.workerFullName,
      rut: verification.rut,
      biometricType: verification.biometricType,
      deliveredAt,
      signatureBase64: dto.signatureBase64,
      equipmentItems: dto.equipmentItems,
    });

    const integrity = await this.documentIntegrityService.sealPdf(pdfDocument.pdfBuffer);

    const documentIntegrity = await this.documentIntegrityRepository.create({
      equipmentDeliveryId: delivery.id,
      algorithm: 'SHA-256',
      sha256: integrity.sha256,
      metadata: {
        rut: verification.rut,
        workerFullName: dto.workerFullName,
        itemCount: dto.equipmentItems.length,
        generatedAt: deliveredAt.toISOString(),
      },
    });

    return {
      equipmentDeliveryId: delivery.id,
      documentIntegrityId: documentIntegrity.id,
      sha256: integrity.sha256,
      verified: verification.verified,
      verifiedAt: verification.verifiedAt,
      deliveredAt,
      sealedPdfBuffer: integrity.stampedPdfBuffer,
      pdfStream: integrity.pdfStream,
    };
  }

  async verifyBiometricOnly(dto: VerifyBiometricDto): Promise<BiometricVerificationResponseDto> {
    return this.biometricVerificationService.verify1To1(dto);
  }
}