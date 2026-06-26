import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateGroupTalkDto } from '../../presentation/dtos/group-talk.dto';
import { IGroupTalkRepository } from '../../domain/interfaces/group-talk-repository.interface';
import { GroupTalkPdfService } from './group-talk-pdf.service';
import { DocumentIntegrityService } from '../../../../modules/equipment-delivery/application/services/document-integrity.service';
import { CryptographyService } from '@shared/services/cryptography.service';
import { Readable } from 'node:stream';

export interface CreateGroupTalkResult {
  groupTalkId: string;
  sha256: string;
  sealedPdfBuffer: Buffer;
  pdfStream: Readable;
}

@Injectable()
export class GroupTalkWorkflowService {
  constructor(
    @Inject('IGroupTalkRepository')
    private groupTalkRepository: IGroupTalkRepository,
    private groupTalkPdfService: GroupTalkPdfService,
    private documentIntegrityService: DocumentIntegrityService,
    private cryptographyService: CryptographyService,
  ) {}

  async createGroupTalk(dto: CreateGroupTalkDto): Promise<CreateGroupTalkResult> {
    // 1. Geofencing check (500 meters from central Santiago site coordinates)
    const GEOFENCING_ENABLED = process.env.GEOFENCING_ENABLED !== 'false';
    const OFFICIAL_LAT = process.env.GEOFENCING_LAT ? parseFloat(process.env.GEOFENCING_LAT) : -33.4489;
    const OFFICIAL_LON = process.env.GEOFENCING_LON ? parseFloat(process.env.GEOFENCING_LON) : -70.6693;
    const MAX_RADIUS = process.env.GEOFENCING_RADIUS ? parseFloat(process.env.GEOFENCING_RADIUS) : 500;

    if (GEOFENCING_ENABLED && dto.latitude !== undefined && dto.latitude !== null && dto.longitude !== undefined && dto.longitude !== null) {
      const distance = this.calculateDistance(dto.latitude, dto.longitude, OFFICIAL_LAT, OFFICIAL_LON);
      if (distance > MAX_RADIUS) {
        throw new BadRequestException(
          `Ubicación fuera del perímetro de la obra para registrar charla (${Math.round(distance)}m > ${MAX_RADIUS}m)`,
        );
      }
    }

    const heldAt = new Date();

    // 2. Normalize RUTs of attendees
    const normalizedAttendees = dto.attendees.map((a) => ({
      rut: this.cryptographyService.normalizeChileanRut(a.rut),
      fullName: a.fullName,
      biometricType: a.biometricType,
      isException: a.isException ?? false,
      witnessRut: a.witnessRut ? this.cryptographyService.normalizeChileanRut(a.witnessRut) : null,
      witnessFullName: a.witnessFullName ?? null,
      witnessSignatureBase64: a.witnessSignatureBase64 ?? null,
    }));

    // 3. Save group talk and attendee lists to MySQL
    const talk = await this.groupTalkRepository.create({
      title: dto.title,
      speakerName: dto.speakerName,
      latitude: dto.latitude,
      longitude: dto.longitude,
      attendees: normalizedAttendees,
    });

    // 4. Generate the consolidated PDF document
    const pdf = await this.groupTalkPdfService.generate({
      title: dto.title,
      speakerName: dto.speakerName,
      heldAt,
      attendees: talk.attendees.map((a) => ({
        rut: a.rut,
        fullName: a.fullName,
        validatedAt: a.validatedAt,
        biometricType: a.biometricType,
        isException: a.isException,
        witnessFullName: a.witnessFullName,
      })),
    });

    // 5. Seal the PDF with a digital integrity hash (SHA-256)
    const integrity = await this.documentIntegrityService.sealPdf(pdf.pdfBuffer);

    return {
      groupTalkId: talk.id,
      sha256: integrity.sha256,
      sealedPdfBuffer: integrity.stampedPdfBuffer,
      pdfStream: integrity.pdfStream,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
