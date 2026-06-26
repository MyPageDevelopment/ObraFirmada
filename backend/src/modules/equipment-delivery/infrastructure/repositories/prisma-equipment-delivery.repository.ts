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
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isException: data.isException ?? false,
        witnessRut: data.witnessRut ?? null,
        witnessFullName: data.witnessFullName ?? null,
        witnessSignatureBase64: data.witnessSignatureBase64 ?? null,
        notificationStatus: data.notificationStatus ?? 'PENDING',
      },
    });
  }

  async findById(id: string): Promise<EquipmentDelivery | null> {
    return this.prisma.equipmentDelivery.findUnique({
      where: { id },
    });
  }

  async findMany(options: {
    skip: number;
    take: number;
    rut?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<EquipmentDelivery[]> {
    const where: Prisma.EquipmentDeliveryWhereInput = {};

    if (options.rut) {
      where.rut = { contains: options.rut };
    }

    if (options.startDate || options.endDate) {
      where.deliveredAt = {};
      if (options.startDate) {
        where.deliveredAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.deliveredAt.lte = options.endDate;
      }
    }

    return this.prisma.equipmentDelivery.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { deliveredAt: 'desc' },
      include: {
        documentIntegrity: true,
      },
    });
  }

  async count(options: { rut?: string; startDate?: Date; endDate?: Date }): Promise<number> {
    const where: Prisma.EquipmentDeliveryWhereInput = {};

    if (options.rut) {
      where.rut = { contains: options.rut };
    }

    if (options.startDate || options.endDate) {
      where.deliveredAt = {};
      if (options.startDate) {
        where.deliveredAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.deliveredAt.lte = options.endDate;
      }
    }

    return this.prisma.equipmentDelivery.count({
      where,
    });
  }

  async updateStatus(id: string, status: string): Promise<EquipmentDelivery> {
    return this.prisma.equipmentDelivery.update({
      where: { id },
      data: { notificationStatus: status },
    });
  }
}