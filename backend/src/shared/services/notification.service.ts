import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { IEquipmentDeliveryRepository } from '../../modules/equipment-delivery/domain/interfaces/equipment-delivery-repository.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @Inject('IEquipmentDeliveryRepository')
    private readonly equipmentDeliveryRepository: IEquipmentDeliveryRepository,
  ) {
    const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP credentials not provided. Using console/mock mailer.');
    }
  }

  @OnEvent('delivery.created')
  async handleDeliveryCreatedEvent(payload: { deliveryId: string; workerRut: string; workerFullName: string }) {
    this.logger.log(`Received delivery.created event for deliveryId: ${payload.deliveryId}`);
    try {
      // 1. Send Email (Nodemailer)
      const emailSent = await this.sendEmail(payload);
      
      // 2. Send SMS/WhatsApp (Mock Twilio)
      const smsSent = await this.sendMockSms(payload);

      // 3. Update Status in database
      const status = (emailSent && smsSent) ? 'SENT' : 'FAILED';
      await this.equipmentDeliveryRepository.updateStatus(payload.deliveryId, status);
      this.logger.log(`Notification status updated to ${status} for deliveryId: ${payload.deliveryId}`);
    } catch (err) {
      this.logger.error(`Error sending notifications for deliveryId: ${payload.deliveryId}`, err);
      try {
        await this.equipmentDeliveryRepository.updateStatus(payload.deliveryId, 'FAILED');
      } catch (dbErr) {
        this.logger.error('Failed to update status to FAILED in DB', dbErr);
      }
    }
  }

  private async sendEmail(payload: { workerRut: string; workerFullName: string }): Promise<boolean> {
    const to = process.env.NOTIFICATION_EMAIL || 'prevencionista@obrafirmada.cl';
    const subject = `[ObraFirmada] Acta de Entrega de EPP Registrada - ${payload.workerFullName}`;
    const text = `Se ha registrado una entrega de EPP para el trabajador ${payload.workerFullName} (RUT: ${payload.workerRut}).\nEl acta digital sellada con integridad SHA-256 está disponible en el panel de auditoría.`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"ObraFirmada" <noreply@obrafirmada.cl>',
          to,
          subject,
          text,
        });
        this.logger.log(`Email successfully sent via SMTP to ${to}`);
        return true;
      } catch (err: any) {
        this.logger.error(`SMTP sendMail failed: ${err.message || err}`);
        return false;
      }
    } else {
      this.logger.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
      return true;
    }
  }

  private async sendMockSms(payload: { workerRut: string; workerFullName: string }): Promise<boolean> {
    const phone = process.env.NOTIFICATION_PHONE || '+56912345678';
    const message = `[ObraFirmada] Hola ${payload.workerFullName}, tu entrega de EPP ha sido registrada con éxito.`;
    
    this.logger.log(`[MOCK TWILIO SMS/WHATSAPP] To: ${phone} | Message: ${message}`);
    return true;
  }
}
