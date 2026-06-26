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
  latitude?: number | null;
  longitude?: number | null;
  isException?: boolean;
  witnessRut?: string | null;
  witnessFullName?: string | null;
  witnessSignatureBase64?: string | null;
  notificationStatus?: string;
}

export interface IEquipmentDeliveryRepository {
  create(data: CreateEquipmentDeliveryInput): Promise<EquipmentDelivery>;
  findById(id: string): Promise<EquipmentDelivery | null>;
  findMany(options: {
    skip: number;
    take: number;
    rut?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<EquipmentDelivery[]>;
  count(options: { rut?: string; startDate?: Date; endDate?: Date }): Promise<number>;
  updateStatus(id: string, status: string): Promise<EquipmentDelivery>;
}