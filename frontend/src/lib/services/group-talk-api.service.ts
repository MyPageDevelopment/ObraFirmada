import axios, { AxiosInstance } from 'axios';

export interface GroupTalkAttendeePayload {
  rut: string;
  fullName: string;
  biometricType: 'FACE' | 'PALM';
  isException?: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
}

export interface CreateGroupTalkRequest {
  title: string;
  speakerName: string;
  latitude?: number;
  longitude?: number;
  attendees: GroupTalkAttendeePayload[];
}

class GroupTalkApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    });
  }

  async createGroupTalkDocument(data: CreateGroupTalkRequest): Promise<Blob> {
    const response = await this.api.post<Blob>('/group-talks/documents', data, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const groupTalkApi = new GroupTalkApiService();
