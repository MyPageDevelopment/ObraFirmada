/**
 * Módulo Raíz de la Aplicación NestJS
 * SOLID - Orquesta todos los módulos
 */

import { Module } from '@nestjs/common';
import { EnrollmentModule } from '@modules/enrollment/enrollment.module';
import { EquipmentDeliveryModule } from '@modules/equipment-delivery/equipment-delivery.module';

@Module({
  imports: [EnrollmentModule, EquipmentDeliveryModule],
})
export class AppModule {}
