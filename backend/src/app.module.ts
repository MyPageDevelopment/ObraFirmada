/**
 * Módulo Raíz de la Aplicación NestJS
 * SOLID - Orquesta todos los módulos
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EnrollmentModule } from '@modules/enrollment/enrollment.module';
import { EquipmentDeliveryModule } from '@modules/equipment-delivery/equipment-delivery.module';
import { GroupTalkModule } from '@modules/group-talk/group-talk.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    EnrollmentModule,
    EquipmentDeliveryModule,
    GroupTalkModule,
  ],
})
export class AppModule {}
