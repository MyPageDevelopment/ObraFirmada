/**
 * Servicio de API para comunicación con backend
 * Encapsula llamadas HTTP al servidor de enrolamiento
 */

import axios, { AxiosInstance } from 'axios';

export interface RegisterIdentityRequest {
  rut: string;
  biometricImageBase64: string;
  biometricType: 'FACE' | 'PALM';
  signatureBase64: string;
}

export interface RegisterIdentityResponse {
  userId: string;
  identityLogId: string;
  rut: string;
  biometricType: 'FACE' | 'PALM';
  capturedAt: string;
}

class EnrollmentApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // SEGURIDAD: Interceptor para manejar errores
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Registra identidad biometrica
   */
  async registerIdentity(data: RegisterIdentityRequest): Promise<RegisterIdentityResponse> {
    const response = await this.api.post<RegisterIdentityResponse>('/enrollment/register-identity', data);
    return response.data;
  }
}

export const enrollmentApi = new EnrollmentApiService();
