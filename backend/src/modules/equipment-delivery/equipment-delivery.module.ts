/**
 * Módulo de Entrega de EPP y Documento Legal
 * Agrupa verificación biométrica 1:1, generación de PDF y sellado de integridad
 */

import { Module } from '@nestjs/common';
import { BiometricVerificationService } from './application/services/biometric-verification.service';
import { EquipmentDeliveryPdfService } from './application/services/equipment-delivery-pdf.service';
import { DocumentIntegrityService } from './application/services/document-integrity.service';
import { EquipmentDeliveryWorkflowService } from './application/services/equipment-delivery-workflow.service';
import { PrismaEquipmentDeliveryRepository } from './infrastructure/repositories/prisma-equipment-delivery.repository';
import { PrismaDocumentIntegrityRepository } from './infrastructure/repositories/prisma-document-integrity.repository';
import { EquipmentDeliveryController } from './presentation/controllers/equipment-delivery.controller';

@Module({
  controllers: [EquipmentDeliveryController],
  providers: [
    BiometricVerificationService,
    EquipmentDeliveryPdfService,
    DocumentIntegrityService,
    EquipmentDeliveryWorkflowService,
    {
      provide: 'IEquipmentDeliveryRepository',
      useClass: PrismaEquipmentDeliveryRepository,
    },
    {
      provide: 'IDocumentIntegrityRepository',
      useClass: PrismaDocumentIntegrityRepository,
    },
  ],
  exports: [
    BiometricVerificationService,
    EquipmentDeliveryPdfService,
    DocumentIntegrityService,
    EquipmentDeliveryWorkflowService,
    'IEquipmentDeliveryRepository',
    'IDocumentIntegrityRepository',
  ],
})
export class EquipmentDeliveryModule {}