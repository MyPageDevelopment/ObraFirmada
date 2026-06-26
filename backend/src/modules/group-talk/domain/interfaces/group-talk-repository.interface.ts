import { GroupTalk, GroupTalkAttendee } from '@prisma/client';

export interface CreateGroupTalkAttendeeInput {
  rut: string;
  fullName: string;
  biometricType: 'FACE' | 'PALM';
  isException?: boolean;
  witnessRut?: string | null;
  witnessFullName?: string | null;
  witnessSignatureBase64?: string | null;
}

export interface CreateGroupTalkInput {
  title: string;
  speakerName: string;
  latitude?: number | null;
  longitude?: number | null;
  attendees: CreateGroupTalkAttendeeInput[];
}

export interface IGroupTalkRepository {
  create(data: CreateGroupTalkInput): Promise<GroupTalk & { attendees: GroupTalkAttendee[] }>;
  findById(id: string): Promise<(GroupTalk & { attendees: GroupTalkAttendee[] }) | null>;
}
