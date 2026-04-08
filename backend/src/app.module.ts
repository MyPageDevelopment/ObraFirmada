/**
 * Módulo Raíz de la Aplicación NestJS
 * SOLID - Orquesta todos los módulos
 */

import { Module } from '@nestjs/common';
import { EnrollmentModule } from '@modules/enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
})
export class AppModule {}
