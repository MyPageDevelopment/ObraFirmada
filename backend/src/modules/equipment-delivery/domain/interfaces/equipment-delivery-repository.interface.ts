import { EquipmentDelivery, Prisma } from '@prisma/client';

export interface CreateEquipmentDeliveryInput {
  userId: string;
  rut: string;
  workerFullName: string;
  equipmentItems: Prisma.JsonValue;
  signatureBase64: string;
  deliveredAt: Date;
  biometricValidatedAt?: Date | null;
  signedAt?: Date | null;
}

export interface IEquipmentDeliveryRepository {
  create(data: CreateEquipmentDeliveryInput): Promise<EquipmentDelivery>;
  findById(id: string): Promise<EquipmentDelivery | null>;
}