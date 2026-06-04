/**
 * Controller de Entrega de EPP
 * Expone el flujo legal: validacion 1:1, generacion de PDF y sellado de integridad
 */

import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  CreateEquipmentDeliveryDto,
  BiometricVerificationResponseDto,
  VerifyBiometricDto,
} from '../dtos/equipment-delivery.dto';
import { EquipmentDeliveryWorkflowService } from '../../application/services/equipment-delivery-workflow.service';

@Controller('api/equipment-delivery')
export class EquipmentDeliveryController {
  constructor(private equipmentDeliveryWorkflowService: EquipmentDeliveryWorkflowService) {}

  /**
   * POST /api/equipment-delivery/documents
   * Genera el acta de entrega de EPP en PDF y devuelve el archivo sellado
   */
  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Body() dto: CreateEquipmentDeliveryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.equipmentDeliveryWorkflowService.createDeliveryDocument(dto);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="acta-entrega-epp.pdf"');
    response.setHeader('X-Document-Integrity-Id', result.documentIntegrityId);
    response.setHeader('X-Document-Sha256', result.sha256);
    response.setHeader('X-Equipment-Delivery-Id', result.equipmentDeliveryId);

    return new StreamableFile(result.sealedPdfBuffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="acta-entrega-epp.pdf"',
    });
  }

  /**
   * POST /api/equipment-delivery/verify
   * Permite validar solo la biometria 1:1 sin generar documento
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyBiometric(
    @Body() dto: VerifyBiometricDto,
  ): Promise<BiometricVerificationResponseDto> {
    return this.equipmentDeliveryWorkflowService.verifyBiometricOnly(dto);
  }
}