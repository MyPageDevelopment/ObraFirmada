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
   * SEGURIDAD: Se valida que no exista RUT duplicado a nivel DB
   */
  async create(rut: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        rut,
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

  async existsByRut(rut: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { rut },
      select: { id: true },
    });
    return !!user;
  }
}
