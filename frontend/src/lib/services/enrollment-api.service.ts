/**
 * Servicio de API para comunicación con backend
 * Encapsula llamadas HTTP al servidor de enrolamiento
 */

import axios, { AxiosInstance } from 'axios';

export interface InitiateEnrollmentRequest {
  rut: string;
  email: string;
  fullName: string;
}

export interface CaptureBiometricRequest {
  userId: string;
  facialImage: string;
  biometricType: 'FACIAL' | 'PALM' | 'IRIS';
}

export interface SignConsentRequest {
  userId: string;
  acceptsPrivacyTerms: boolean;
  acceptsBiometricProcessing: boolean;
  acceptsDigitalSignature: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface EnrollmentResponse {
  userId: string;
  rut: string;
  email: string;
  fullName: string;
  enrollmentStatus: string;
  isConsentSigned: boolean;
  createdAt: string;
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
   * Inicia el proceso de enrolamiento
   */
  async initiateEnrollment(data: InitiateEnrollmentRequest): Promise<EnrollmentResponse> {
    const response = await this.api.post<EnrollmentResponse>('/enrollment/initiate', data);
    return response.data;
  }

  /**
   * Captura y procesa biometría
   * SEGURIDAD: Imagen se convierte a Base64 antes de enviar
   */
  async captureBiometric(data: CaptureBiometricRequest): Promise<EnrollmentResponse> {
    const response = await this.api.post<EnrollmentResponse>('/enrollment/capture-biometric', data);
    return response.data;
  }

  /**
   * Firma consentimiento de privacidad
   */
  async signConsent(data: SignConsentRequest): Promise<EnrollmentResponse> {
    const response = await this.api.post<EnrollmentResponse>('/enrollment/sign-consent', data);
    return response.data;
  }

  /**
   * Obtiene estado actual de enrolamiento
   */
  async getEnrollmentStatus(userId: string): Promise<EnrollmentResponse> {
    const response = await this.api.get<EnrollmentResponse>(`/enrollment/status/${userId}`);
    return response.data;
  }
}

export const enrollmentApi = new EnrollmentApiService();
