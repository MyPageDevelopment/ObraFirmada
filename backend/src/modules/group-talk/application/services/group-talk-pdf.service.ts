import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Readable } from 'node:stream';

export interface GroupTalkPdfAttendeeInput {
  rut: string;
  fullName: string;
  validatedAt: Date;
  biometricType: string;
  isException: boolean;
  witnessFullName?: string | null;
}

export interface GroupTalkPdfInput {
  title: string;
  speakerName: string;
  heldAt: Date;
  attendees: GroupTalkPdfAttendeeInput[];
}

@Injectable()
export class GroupTalkPdfService {
  async generate(input: GroupTalkPdfInput): Promise<{ pdfBuffer: Buffer; pdfStream: Readable }> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    const margin = 50;

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let cursorY = height - margin;

    // Header Title
    page.drawText('ACTA CONSOLIDADA DE ASISTENCIA A CHARLA DE SEGURIDAD', {
      x: margin,
      y: cursorY,
      size: 14,
      font: boldFont,
      color: rgb(0.08, 0.16, 0.28),
    });
    cursorY -= 25;

    // Subtitle
    page.drawText(`Tema: ${input.title}`, {
      x: margin,
      y: cursorY,
      size: 11,
      font: boldFont,
      color: rgb(0.12, 0.12, 0.12),
    });
    cursorY -= 15;

    page.drawText(`Relator: ${input.speakerName}`, {
      x: margin,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 15;

    page.drawText(`Fecha: ${input.heldAt.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`, {
      x: margin,
      y: cursorY,
      size: 10,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    cursorY -= 30;

    // Attendees Table Header
    page.drawRectangle({
      x: margin,
      y: cursorY - 4,
      width: width - margin * 2,
      height: 20,
      color: rgb(0.91, 0.94, 0.97),
    });
    page.drawText('Trabajador (RUT)', { x: margin + 6, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('Nombre Completo', { x: margin + 150, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('Hora Reg.', { x: width - margin - 150, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('Método Valid.', { x: width - margin - 80, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    cursorY -= 20;

    for (const attendee of input.attendees) {
      if (cursorY < margin + 40) {
        // Add new page
        page = pdfDoc.addPage([612, 792]);
        cursorY = height - margin;
        
        // Header on next page
        page.drawText(`Asistentes Charla: ${input.title} (Cont.)`, {
          x: margin,
          y: cursorY,
          size: 10,
          font: boldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        cursorY -= 25;

        // Re-draw table header
        page.drawRectangle({
          x: margin,
          y: cursorY - 4,
          width: width - margin * 2,
          height: 20,
          color: rgb(0.91, 0.94, 0.97),
        });
        page.drawText('Trabajador (RUT)', { x: margin + 6, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
        page.drawText('Nombre Completo', { x: margin + 150, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
        page.drawText('Hora Reg.', { x: width - margin - 150, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
        page.drawText('Método Valid.', { x: width - margin - 80, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
        cursorY -= 20;
      }

      const methodText = attendee.isException ? 'Testigo' : `Biométrico`;
      const formattedTime = new Date(attendee.validatedAt).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago' });

      page.drawText(attendee.rut, { x: margin + 6, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12) });
      page.drawText(attendee.fullName, { x: margin + 150, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12), maxWidth: 160 });
      page.drawText(formattedTime, { x: width - margin - 150, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12) });
      page.drawText(methodText, { x: width - margin - 80, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12) });

      // Add a line divider
      page.drawLine({
        start: { x: margin, y: cursorY - 4 },
        end: { x: width - margin, y: cursorY - 4 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });

      cursorY -= 18;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return {
      pdfBuffer,
      pdfStream: Readable.from([pdfBuffer]),
    };
  }
}
