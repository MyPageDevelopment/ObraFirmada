/**
 * Implementacion del Repositorio de IdentityLog con Prisma ORM
 * Pattern: Repository Pattern + Dependency Injection
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/services/prisma.service';
import { IdentityLog } from '@prisma/client';
import { IIdentityLogRepository } from '../../domain/interfaces/identity-log-repository.interface';

@Injectable()
export class PrismaIdentityLogRepository implements IIdentityLogRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<IdentityLog, 'id' | 'createdAt'>): Promise<IdentityLog> {
    return this.prisma.identityLog.create({
      data: {
        userId: data.userId,
        rut: data.rut,
        encryptedBiometricVector: data.encryptedBiometricVector,
        signatureBase64: data.signatureBase64,
        biometricType: data.biometricType,
        capturedAt: data.capturedAt,
      },
    });
  }

  async findLatestByRut(rut: string): Promise<IdentityLog | null> {
    return this.prisma.identityLog.findFirst({
      where: { rut },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async countByRut(rut: string): Promise<number> {
    return this.prisma.identityLog.count({
      where: { rut },
    });
  }
}
