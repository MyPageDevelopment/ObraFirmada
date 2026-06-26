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
  computeSha256(buffer: Uint8Array): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async stampIntegrityMetadata(sourcePdfBuffer: Uint8Array, sha256: string): Promise<IntegrityStampResult> {
    const pdfDoc = await PDFDocument.load(sourcePdfBuffer);
    pdfDoc.setSubject(`SHA-256:${sha256}`);
    pdfDoc.setKeywords(['SHA-256', sha256, 'ObraFirmada']);
    pdfDoc.setProducer('ObraFirmada Backend');
    pdfDoc.setModificationDate(new Date());

    const stampedPdfBytes = await pdfDoc.save();
    
    // Zero-copy conversions to avoid duplicating memory in RAM
    const stampedPdfBuffer = Buffer.from(stampedPdfBytes.buffer, stampedPdfBytes.byteOffset, stampedPdfBytes.byteLength);
    const sourceBuffer = Buffer.isBuffer(sourcePdfBuffer)
      ? sourcePdfBuffer
      : Buffer.from(sourcePdfBuffer.buffer, sourcePdfBuffer.byteOffset, sourcePdfBuffer.byteLength);

    return {
      sourcePdfBuffer: sourceBuffer,
      stampedPdfBuffer,
      sha256,
      pdfStream: Readable.from([stampedPdfBytes]), // Stream bytes directly
    };
  }

  async sealPdf(sourcePdfBuffer: Uint8Array): Promise<IntegrityStampResult> {
    const sha256 = this.computeSha256(sourcePdfBuffer);
    return this.stampIntegrityMetadata(sourcePdfBuffer, sha256);
  }
}