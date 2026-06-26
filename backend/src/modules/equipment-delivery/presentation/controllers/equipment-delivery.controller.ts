/**
 * Controller de Entrega de EPP
 * Expone el flujo legal: validacion 1:1, generacion de PDF y sellado de integridad
 */

import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  CreateEquipmentDeliveryDto,
  BiometricVerificationResponseDto,
  VerifyBiometricDto,
  CreateEquipmentDeliveryResponseDto,
} from '../dtos/equipment-delivery.dto';
import { EquipmentDeliveryWorkflowService } from '../../application/services/equipment-delivery-workflow.service';

@Controller('api/equipment-delivery')
export class EquipmentDeliveryController {
  constructor(private equipmentDeliveryWorkflowService: EquipmentDeliveryWorkflowService) {}

  /**
   * GET /api/equipment-delivery/list
   * Retorna listado paginado y filtrado de entregas
   */
  @Get('list')
  async listDeliveries(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rut') rut?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.max(1, parseInt(limit || '20', 10));
    const skip = (pageNum - 1) * limitNum;

    let startD: Date | undefined;
    let endD: Date | undefined;
    if (startDate) {
      startD = new Date(startDate);
    }
    if (endDate) {
      endD = new Date(endDate);
    }

    return this.equipmentDeliveryWorkflowService.listDeliveries({
      skip,
      take: limitNum,
      rut,
      startDate: startD,
      endDate: endD,
    });
  }

  /**
   * POST /api/equipment-delivery/export-zip
   * Retorna un archivo comprimido ZIP con los PDFs de las entregas seleccionadas
   */
  @Post('export-zip')
  @HttpCode(HttpStatus.OK)
  async exportZip(
    @Body() body: { ids: string[] },
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const zipBuffer = await this.equipmentDeliveryWorkflowService.exportZip(body.ids);

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', 'attachment; filename="actas-entrega.zip"');

    return new StreamableFile(zipBuffer, {
      type: 'application/zip',
      disposition: 'attachment; filename="actas-entrega.zip"',
    });
  }

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

    return new StreamableFile(result.pdfStream, {
      type: 'application/pdf',
      disposition: 'attachment; filename="acta-entrega-epp.pdf"',
    });
  }

  /**
   * POST /api/equipment-delivery/batch
   * Permite registrar multiples actas de entrega de EPP en un unico lote transaccional (ACID)
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async createDocumentBatch(
    @Body() dtos: CreateEquipmentDeliveryDto[],
  ): Promise<CreateEquipmentDeliveryResponseDto[]> {
    return this.equipmentDeliveryWorkflowService.createDeliveryBatch(dtos);
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

  /**
   * POST /api/equipment-delivery/webhook
   * Webhook expuesto para que los proveedores actualicen el estado de entrega en tiempo real
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() body: { deliveryId: string; status: 'PENDING' | 'SENT' | 'FAILED' },
  ) {
    if (!body.deliveryId || !body.status) {
      throw new BadRequestException('Falta deliveryId o status en el payload del Webhook');
    }
    return this.equipmentDeliveryWorkflowService.updateNotificationStatus(body.deliveryId, body.status);
  }
}