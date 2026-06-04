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
}

export const equipmentDeliveryApi = new EquipmentDeliveryApiService();