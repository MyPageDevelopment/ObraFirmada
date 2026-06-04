import { Injectable } from '@nestjs/common';
import { EquipmentDelivery, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/services/prisma.service';
import {
  CreateEquipmentDeliveryInput,
  IEquipmentDeliveryRepository,
} from '../../domain/interfaces/equipment-delivery-repository.interface';

@Injectable()
export class PrismaEquipmentDeliveryRepository implements IEquipmentDeliveryRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEquipmentDeliveryInput): Promise<EquipmentDelivery> {
    return this.prisma.equipmentDelivery.create({
      data: {
        userId: data.userId,
        rut: data.rut,
        workerFullName: data.workerFullName,
        equipmentItems: data.equipmentItems as Prisma.InputJsonValue,
        signatureBase64: data.signatureBase64,
        deliveredAt: data.deliveredAt,
        biometricValidatedAt: data.biometricValidatedAt ?? null,
        signedAt: data.signedAt ?? null,
      },
    });
  }

  async findById(id: string): Promise<EquipmentDelivery | null> {
    return this.prisma.equipmentDelivery.findUnique({
      where: { id },
    });
  }
}