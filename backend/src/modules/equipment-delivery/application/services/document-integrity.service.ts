import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'node:stream';
import * as crypto from 'crypto';

export interface IntegrityStampResult {
  sourcePdfBuffer: Buffer;
  stampedPdfBuffer: Buffer;
  sha256: string;
  pdfStream: Readable;
}

@Injectable()
export class DocumentIntegrityService {
  computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async stampIntegrityMetadata(sourcePdfBuffer: Buffer, sha256: string): Promise<IntegrityStampResult> {
    const pdfDoc = await PDFDocument.load(sourcePdfBuffer);
    pdfDoc.setSubject(`SHA-256:${sha256}`);
    pdfDoc.setKeywords(['SHA-256', sha256, 'ObraFirmada']);
    pdfDoc.setProducer('ObraFirmada Backend');
    pdfDoc.setModificationDate(new Date());

    const stampedPdfBuffer = Buffer.from(await pdfDoc.save());

    return {
      sourcePdfBuffer,
      stampedPdfBuffer,
      sha256,
      pdfStream: Readable.from([stampedPdfBuffer]),
    };
  }

  async sealPdf(sourcePdfBuffer: Buffer): Promise<IntegrityStampResult> {
    const sha256 = this.computeSha256(sourcePdfBuffer);
    return this.stampIntegrityMetadata(sourcePdfBuffer, sha256);
  }
}