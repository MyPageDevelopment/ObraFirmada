import { Injectable } from '@nestjs/common';
import { GroupTalk, GroupTalkAttendee } from '@prisma/client';
import { PrismaService } from '@shared/services/prisma.service';
import {
  CreateGroupTalkInput,
  IGroupTalkRepository,
} from '../../domain/interfaces/group-talk-repository.interface';

@Injectable()
export class PrismaGroupTalkRepository implements IGroupTalkRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateGroupTalkInput): Promise<GroupTalk & { attendees: GroupTalkAttendee[] }> {
    return this.prisma.groupTalk.create({
      data: {
        title: data.title,
        speakerName: data.speakerName,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        attendees: {
          create: data.attendees.map((a) => ({
            rut: a.rut,
            fullName: a.fullName,
            biometricType: a.biometricType,
            isException: a.isException ?? false,
            witnessRut: a.witnessRut ?? null,
            witnessFullName: a.witnessFullName ?? null,
            witnessSignatureBase64: a.witnessSignatureBase64 ?? null,
          })),
        },
      },
      include: {
        attendees: true,
      },
    });
  }

  async findById(id: string): Promise<(GroupTalk & { attendees: GroupTalkAttendee[] }) | null> {
    return this.prisma.groupTalk.findUnique({
      where: { id },
      include: {
        attendees: true,
      },
    });
  }
}
