import { DocumentIntegrity, Prisma } from '@prisma/client';

export interface CreateDocumentIntegrityInput {
  equipmentDeliveryId: string;
  algorithm: string;
  sha256: string;
  metadata?: Prisma.InputJsonValue | null;
}

export interface IDocumentIntegrityRepository {
  create(data: CreateDocumentIntegrityInput): Promise<DocumentIntegrity>;
  findByEquipmentDeliveryId(equipmentDeliveryId: string): Promise<DocumentIntegrity | null>;
}