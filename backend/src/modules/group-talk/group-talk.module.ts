import { Module } from '@nestjs/common';
import { GroupTalkController } from './presentation/controllers/group-talk.controller';
import { GroupTalkWorkflowService } from './application/services/group-talk-workflow.service';
import { GroupTalkPdfService } from './application/services/group-talk-pdf.service';
import { PrismaGroupTalkRepository } from './infrastructure/repositories/prisma-group-talk.repository';
import { EquipmentDeliveryModule } from '../equipment-delivery/equipment-delivery.module';

@Module({
  imports: [EquipmentDeliveryModule],
  controllers: [GroupTalkController],
  providers: [
    GroupTalkWorkflowService,
    GroupTalkPdfService,
    {
      provide: 'IGroupTalkRepository',
      useClass: PrismaGroupTalkRepository,
    },
  ],
  exports: [
    GroupTalkWorkflowService,
    GroupTalkPdfService,
    'IGroupTalkRepository',
  ],
})
export class GroupTalkModule {}
