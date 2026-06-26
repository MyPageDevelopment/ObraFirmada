import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateGroupTalkDto } from '../dtos/group-talk.dto';
import { GroupTalkWorkflowService } from '../../application/services/group-talk-workflow.service';

@Controller('api/group-talks')
export class GroupTalkController {
  constructor(private groupTalkWorkflowService: GroupTalkWorkflowService) {}

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Body() dto: CreateGroupTalkDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.groupTalkWorkflowService.createGroupTalk(dto);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="acta-charla-grupal.pdf"');
    response.setHeader('X-Group-Talk-Id', result.groupTalkId);
    response.setHeader('X-Document-Sha256', result.sha256);

    return new StreamableFile(result.sealedPdfBuffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="acta-charla-grupal.pdf"',
    });
  }
}
