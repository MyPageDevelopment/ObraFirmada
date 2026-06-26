import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { Readable } from 'node:stream';

export interface EquipmentItem {
  name: string;
  quantity: number;
  unit?: string;
  description?: string;
  code?: string;
}

export interface EquipmentDeliveryPdfInput {
  workerFullName: string;
  rut: string;
  biometricType: 'FACE' | 'PALM';
  deliveredAt: Date;
  signatureBase64: string;
  equipmentItems: EquipmentItem[];
  isException?: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
}

export interface GeneratedPdfDocument {
  pdfBuffer: Buffer;
  pdfStream: Readable;
}

@Injectable()
export class EquipmentDeliveryPdfService {
  async generate(input: EquipmentDeliveryPdfInput): Promise<GeneratedPdfDocument> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('Acta de entrega de EPP');
    pdfDoc.setAuthor('ObraFirmada');
    pdfDoc.setCreator('ObraFirmada Backend');
    pdfDoc.setProducer('ObraFirmada PDF Engine');
    pdfDoc.setSubject('Documento legal de entrega de EPP');
    pdfDoc.setKeywords(['ObraFirmada', 'EPP', 'SHA-256', input.rut]);
    pdfDoc.setCreationDate(input.deliveredAt);
    pdfDoc.setModificationDate(input.deliveredAt);

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const margin = 48;
    let cursorY = height - margin;

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY - requiredHeight < margin) {
        page = pdfDoc.addPage(PageSizes.A4);
        cursorY = page.getHeight() - margin;
        drawHeader();
      }
    };

    const drawText = (
      text: string,
      options: { font?: PDFFont; size?: number; x?: number; color?: ReturnType<typeof rgb>; maxWidth?: number; lineHeight?: number } = {},
    ) => {
      const font = options.font ?? regularFont;
      const size = options.size ?? 10;
      const x = options.x ?? margin;
      const color = options.color ?? rgb(0.12, 0.12, 0.12);
      const maxWidth = options.maxWidth ?? width - margin * 2;
      const lineHeight = options.lineHeight ?? size + 4;
      const lines = this.wrapText(text, font, size, maxWidth);

      for (const line of lines) {
        ensureSpace(lineHeight + 2);
        page.drawText(line, { x, y: cursorY, size, font, color });
        cursorY -= lineHeight;
      }
    };

    const drawHeader = () => {
      page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: rgb(0.08, 0.16, 0.28) });
      page.drawText('ObraFirmada', { x: margin, y: height - 48, size: 22, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText('Acta de entrega de elementos de protección personal', {
        x: margin,
        y: height - 70,
        size: 11,
        font: regularFont,
        color: rgb(0.9, 0.94, 1),
      });
      cursorY = height - 120;
    };

    drawHeader();

    drawText('Datos del trabajador', { font: boldFont, size: 13, color: rgb(0.08, 0.16, 0.28) });
    drawText(`Nombre: ${input.workerFullName}`);
    drawText(`RUT: ${input.rut}`);
    drawText(`Biometria autorizada: ${input.biometricType}`);
    drawText(`Timestamp del servidor: ${input.deliveredAt.toISOString()}`);

    cursorY -= 4;
    drawText('Implementos entregados', { font: boldFont, size: 13, color: rgb(0.08, 0.16, 0.28) });

    const tableHeaderHeight = 18;
    ensureSpace(tableHeaderHeight + 16);
    page.drawRectangle({ x: margin, y: cursorY - 4, width: width - margin * 2, height: tableHeaderHeight, color: rgb(0.91, 0.94, 0.97) });
    page.drawText('Item', { x: margin + 6, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('Cantidad', { x: width - margin - 110, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    page.drawText('Detalle', { x: width - margin - 60, y: cursorY + 1, size: 9, font: boldFont, color: rgb(0.12, 0.12, 0.12) });
    cursorY -= tableHeaderHeight + 8;

    for (const item of input.equipmentItems) {
      const rowText = item.description ? `${item.name} (${item.code ?? 'sin codigo'})` : item.name;
      const detailText = item.unit ? item.unit : item.description ?? '-';
      ensureSpace(28);
      page.drawText(rowText, { x: margin + 6, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12), maxWidth: width - margin * 2 - 150 });
      page.drawText(String(item.quantity), { x: width - margin - 110, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12) });
      page.drawText(detailText, { x: width - margin - 60, y: cursorY, size: 9, font: regularFont, color: rgb(0.12, 0.12, 0.12), maxWidth: 50 });
      cursorY -= 18;
    }

    cursorY -= 8;
    drawText('Firma del Trabajador', { font: boldFont, size: 11, color: rgb(0.08, 0.16, 0.28) });
    await this.drawSignature(pdfDoc, page, input.signatureBase64, margin, cursorY - 120, 220, 100);

    if (input.isException) {
      page.drawText('Firma validada bajo modalidad excepcional', {
        x: margin + 250,
        y: cursorY + 14,
        size: 8,
        font: boldFont,
        color: rgb(0.85, 0.26, 0.26),
      });
      page.drawText('mediante Testigo de Fe', {
        x: margin + 250,
        y: cursorY + 4,
        size: 8,
        font: boldFont,
        color: rgb(0.85, 0.26, 0.26),
      });
      page.drawText(`Testigo: ${input.witnessFullName ?? 'N/A'}`, {
        x: margin + 250,
        y: cursorY - 12,
        size: 9,
        font: regularFont,
        color: rgb(0.12, 0.12, 0.12),
      });
      page.drawText(`RUT: ${input.witnessRut ?? 'N/A'}`, {
        x: margin + 250,
        y: cursorY - 26,
        size: 9,
        font: regularFont,
        color: rgb(0.12, 0.12, 0.12),
      });
      if (input.witnessSignatureBase64) {
        await this.drawSignature(pdfDoc, page, input.witnessSignatureBase64, margin + 250, cursorY - 130, 200, 80);
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength);

    return {
      pdfBuffer,
      pdfStream: Readable.from([pdfBytes]), // Stream bytes directly to avoid duplicate copies
    };
  }

  private async drawSignature(
    pdfDoc: PDFDocument,
    page: PDFPage,
    signatureBase64: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    const base64 = this.stripDataUrl(signatureBase64);
    const imageBytes = Buffer.from(base64, 'base64');

    try {
      const png = await pdfDoc.embedPng(imageBytes);
      page.drawRectangle({ x, y, width, height, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
      page.drawImage(png, { x: x + 12, y: y + 10, width: width - 24, height: height - 20 });
      return;
    } catch {
      // Intento alternativo para firmas exportadas como JPEG
    }

    const jpg = await pdfDoc.embedJpg(imageBytes);
    page.drawRectangle({ x, y, width, height, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 });
    page.drawImage(jpg, { x: x + 12, y: y + 10, width: width - 24, height: height - 20 });
  }

  private stripDataUrl(value: string): string {
    return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, size);

      if (candidateWidth <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }
}