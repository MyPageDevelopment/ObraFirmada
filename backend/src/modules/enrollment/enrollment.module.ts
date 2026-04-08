/**
 * Módulo de Enrolamiento
 * SOLID - Encapsulación: Define cuáles son los servicios públicos
 * Arquitectura Hexagonal: Separa Domain, Application, Infrastructure
 */

import { Module, Global } from '@nestjs/common';
import { EnrollmentController } from './presentation/controllers/enrollment.controller';
import { EnrollmentService } from './application/services/enrollment.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaService } from '@shared/services/prisma.service';
import { CryptographyService } from '@shared/services/cryptography.service';
import { IUserRepository } from './domain/interfaces/user-repository.interface';

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
  ],
  exports: [PrismaService, CryptographyService, 'IUserRepository'],
})
export class EnrollmentModule {}
