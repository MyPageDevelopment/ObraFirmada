/**
 * Implementación del Repositorio de Usuarios con Prisma ORM
 * SOLID - Une la interfaz IUserRepository con la implementación Prisma
 * Pattern: Repository Pattern + Dependency Injection
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/services/prisma.service';
import { User } from '@prisma/client';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Crear nuevo usuario
   * SEGURIDAD: Se valida que no exista RUT o email duplicados a nivel DB
   */
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.prisma.user.create({
      data: {
        rut: data.rut,
        email: data.email,
        fullName: data.fullName,
        facialBiometricVector: data.facialBiometricVector,
        palmBiometricVector: data.palmBiometricVector,
        isConsentSigned: data.isConsentSigned || false,
        enrollmentStatus: data.enrollmentStatus || 'PENDING',
        biometricAttempts: 0,
        encryptedAdditionalData: data.encryptedAdditionalData,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByRut(rut: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { rut },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Actualizar usuario
   * SEGURIDAD: Solo actualiza campos permitidos
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    // Campos sensibles que NO se pueden actualizar directamente
    const { id: _, createdAt, ...safeData } = data as any;

    return this.prisma.user.update({
      where: { id },
      data: safeData,
    });
  }

  async existsByRut(rut: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { rut },
      select: { id: true },
    });
    return !!user;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }
}
