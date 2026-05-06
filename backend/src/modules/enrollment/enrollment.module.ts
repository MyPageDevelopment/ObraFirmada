/**
 * Módulo de Enrolamiento
 * SOLID - Encapsulación: Define cuáles son los servicios públicos
 * Arquitectura Hexagonal: Separa Domain, Application, Infrastructure
 */

import { Module, Global } from '@nestjs/common';
import { EnrollmentController } from './presentation/controllers/enrollment.controller';
import { EnrollmentService } from './application/services/enrollment.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaIdentityLogRepository } from './infrastructure/repositories/prisma-identity-log.repository';
import { PrismaService } from '@shared/services/prisma.service';
import { CryptographyService } from '@shared/services/cryptography.service';

@Global()
@Module({
  controllers: [EnrollmentController],
  providers: [
    PrismaService,
    CryptographyService,
    EnrollmentService,
    // INYECCIÓN DE DEPENDENCIAS: Proveer interfaz IUserRepository
    // Implementado por PrismaUserRepository
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    // INYECCION DE DEPENDENCIAS: Proveer interfaz IIdentityLogRepository
    // Implementado por PrismaIdentityLogRepository
    {
      provide: 'IIdentityLogRepository',
      useClass: PrismaIdentityLogRepository,
    },
  ],
  exports: [PrismaService, CryptographyService, 'IUserRepository', 'IIdentityLogRepository'],
})
export class EnrollmentModule {}
