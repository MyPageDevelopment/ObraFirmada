/**
 * Servicio Prisma - Gestión de conexión a base de datos
 * SOLID - Single Responsibility: Solo maneja conexión Prisma
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Conectado a la base de datos MySQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
