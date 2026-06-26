import { Injectable } from '@nestjs/common';
import { DocumentIntegrity, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/services/prisma.service';
import {
  CreateDocumentIntegrityInput,
  IDocumentIntegrityRepository,
} from '../../domain/interfaces/document-integrity-repository.interface';

@Injectable()
export class PrismaDocumentIntegrityRepository implements IDocumentIntegrityRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateDocumentIntegrityInput): Promise<DocumentIntegrity> {
    return this.prisma.documentIntegrity.create({
      data: {
        equipmentDeliveryId: data.equipmentDeliveryId,
        algorithm: data.algorithm,
        sha256: data.sha256,
        metadata: (data.metadata === null ? Prisma.JsonNull : data.metadata) as Prisma.InputJsonValue,
      },
    });
  }

  async findByEquipmentDeliveryId(equipmentDeliveryId: string): Promise<DocumentIntegrity | null> {
    return this.prisma.documentIntegrity.findUnique({
      where: { equipmentDeliveryId },
    });
  }
}