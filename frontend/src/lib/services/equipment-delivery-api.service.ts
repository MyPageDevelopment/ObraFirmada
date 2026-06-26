/**
 * Servicio de API para entrega de EPP
 * Recibe el acta PDF sellada y expone metadatos de integridad por cabecera
 */

import axios, { AxiosInstance } from 'axios';

export interface EquipmentItemPayload {
  name: string;
  quantity: number;
  unit?: string;
  description?: string;
  code?: string;
}

export interface CreateEquipmentDeliveryRequest {
  rut: string;
  workerFullName: string;
  biometricType: 'FACE' | 'PALM';
  biometricImageBase64: string;
  signatureBase64: string;
  equipmentItems: EquipmentItemPayload[];
  latitude?: number;
  longitude?: number;
  isException?: boolean;
  witnessRut?: string;
  witnessFullName?: string;
  witnessSignatureBase64?: string;
}

export interface CreateEquipmentDeliveryResult {
  pdfBlob: Blob;
  equipmentDeliveryId: string | null;
  documentIntegrityId: string | null;
  sha256: string | null;
}

class EquipmentDeliveryApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      },
    );
  }

  async createEquipmentDeliveryDocument(
    data: CreateEquipmentDeliveryRequest,
  ): Promise<CreateEquipmentDeliveryResult> {
    const response = await this.api.post<Blob>('/equipment-delivery/documents', data, {
      responseType: 'blob',
    });

    return {
      pdfBlob: response.data,
      equipmentDeliveryId: response.headers['x-equipment-delivery-id'] ?? null,
      documentIntegrityId: response.headers['x-document-integrity-id'] ?? null,
      sha256: response.headers['x-document-sha256'] ?? null,
    };
  }

  async listDeliveries(params: {
    page: number;
    limit: number;
    rut?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ deliveries: any[]; total: number }> {
    const response = await this.api.get('/equipment-delivery/list', {
      params,
      responseType: 'json',
    });
    return response.data;
  }

  async exportZip(ids: string[]): Promise<Blob> {
    const response = await this.api.post<Blob>('/equipment-delivery/export-zip', { ids }, {
      responseType: 'blob',
    });
    return response.data;
  }

  async verifyBiometric(data: {
    rut: string;
    biometricType: 'FACE' | 'PALM';
    biometricImageBase64: string;
  }): Promise<{ verified: boolean; workerFullName?: string }> {
    const response = await this.api.post('/equipment-delivery/verify', data, {
      responseType: 'json',
    });
    return response.data;
  }
}

export const equipmentDeliveryApi = new EquipmentDeliveryApiService();