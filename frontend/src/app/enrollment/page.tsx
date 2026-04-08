/**
 * Página Principal de Enrolamiento
 * Orquesta el flujo completo: Consentimiento → Formulario → Biometría → Finalización
 */

'use client';

import React, { useState } from 'react';
import { EnrollmentFormComponent } from '@/components/enrollment/enrollment-form';
import { ConsentComponent } from '@/components/enrollment/consent-component';
import { BiometricCaptureComponent } from '@/components/enrollment/biometric-capture';
import { enrollmentApi } from '@/lib/services/enrollment-api.service';

type EnrollmentStep = 'consent' | 'form' | 'biometric' | 'success' | 'error';

interface EnrollmentState {
  userId?: string;
  rut?: string;
  email?: string;
  fullName?: string;
}

export default function EnrollmentPage() {
  const [step, setStep] = useState<EnrollmentStep>('consent');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * PASO 1: Usuario acepta consentimiento de privacidad
   */
  const handleConsentAccept = async () => {
    setIsLoading(true);
    try {
      // En producción, aquí se registraría el consentimiento en el backend
      console.log('✅ Consentimiento aceptado - Continuando al formulario');
      setStep('form');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar consentimiento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentReject = () => {
    setStep('error');
    setError('❌ Debes aceptar las políticas de privacidad para continuar');
  };

  /**
   * PASO 2: Usuario completa formulario inicial
   */
  const handleFormSubmit = async (data: { rut: string; email: string; fullName: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Llamar al backend para iniciar enrolamiento
      const response = await enrollmentApi.initiateEnrollment(data);

      // Guardar datos y pasar a captura biométrica
      setEnrollmentData({
        userId: response.userId,
        rut: response.rut,
        email: response.email,
        fullName: response.fullName,
      });

      setStep('biometric');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar enrolamiento';
      setError(errorMessage);
      console.error('Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * PASO 3: Usuario captura biometría
   */
  const handleBiometricCapture = async (imageBase64: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!enrollmentData.userId) {
        throw new Error('Usuario no inicializado correctamente');
      }

      // Enviar biometría al backend
      const response = await enrollmentApi.captureBiometric({
        userId: enrollmentData.userId,
        facialImage: imageBase64,
        biometricType: 'FACIAL',
      });

      console.log('✅ Biometría capturada exitosamente');

      // Proceder a firmar consentimiento
      setEnrollmentData((prev) => ({
        ...prev,
        ...response,
      }));

      // Llamar a firmar consentimiento
      const consentResponse = await enrollmentApi.signConsent({
        userId: enrollmentData.userId,
        acceptsPrivacityTerms: true,
        acceptsBiometricProcessing: true,
        acceptsDigitalSignature: true,
        ipAddress: 'client-detected',
        userAgent: navigator.userAgent,
      });

      console.log('✅ Enrolamiento completado exitosamente');

      setEnrollmentData((prev) => ({
        ...prev,
        ...consentResponse,
      }));

      setStep('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al capturar biometría';
      setError(errorMessage);
      console.error('Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renderizar contenido según el paso actual
   */
  const renderCurrentStep = () => {
    switch (step) {
      case 'consent':
        return (
          <ConsentComponent
            onAccept={handleConsentAccept}
            onReject={handleConsentReject}
            isLoading={isLoading}
          />
        );

      case 'form':
        return (
          <EnrollmentFormComponent
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
        );

      case 'biometric':
        return (
          <BiometricCaptureComponent
            onCapture={handleBiometricCapture}
            biometricType="FACIAL"
            isLoading={isLoading}
          />
        );

      case 'success':
        return <SuccessScreenComponent enrollmentData={enrollmentData} />;

      case 'error':
        return (
          <ErrorScreenComponent
            error={error || 'Error desconocido'}
            onReset={() => {
              setStep('consent');
              setError(null);
              setEnrollmentData({});
            }}
          />
        );

      default:
        return <div>Error: Paso desconocido</div>;
    }
  };

  return renderCurrentStep();
}

/**
 * Pantalla de éxito al completar enrolamiento
 */
function SuccessScreenComponent({ enrollmentData }: { enrollmentData: EnrollmentState }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full text-center">
        {/* Header */}
        <div className="bg-success text-white px-6 py-8 border-b-4 border-green-600">
          <h1 className="text-4xl font-bold mb-2">✅ ¡Enrolamiento Completado!</h1>
          <p className="text-sm opacity-90">Tu cuenta está lista para usar</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-8 space-y-6">
          <div className="text-6xl mb-4">🎉</div>

          <div className="bg-green-50 border-l-4 border-success p-6 rounded text-left space-y-3">
            <p className="font-semibold text-lg text-gray-800">
              Bienvenido, <span className="text-success">{enrollmentData.fullName}</span>
            </p>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">RUT:</span> {enrollmentData.rut}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {enrollmentData.email}
              </p>
              <p>
                <span className="font-semibold">ID Usuario:</span> {enrollmentData.userId}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-sm text-blue-800">
            <p className="font-semibold mb-2">✨ Lo que sucedió:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Tu identidad fue verificada con éxito</li>
              <li>Tu biometría se procesó y encriptó de forma irreversible</li>
              <li>Aceptaste las políticas de privacidad</li>
              <li>Tu cuenta está lista para firmar documentos laborales</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm text-yellow-800">
            <p className="font-semibold mb-2">🔐 Datos Sensibles:</p>
            <p>
              NUNCA se almacenó tu imagen facial original. Solo se guardó un hash criptográfico
              irreversible que permite verificar tu identidad en futuras sesiones.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full bg-success text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition"
          >
            ➡️ Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pantalla de error
 */
function ErrorScreenComponent({
  error,
  onReset,
}: {
  error: string;
  onReset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full text-center">
        {/* Header */}
        <div className="bg-danger text-white px-6 py-8 border-b-4 border-red-600">
          <h1 className="text-3xl font-bold mb-2">❌ Error en el Enrolamiento</h1>
        </div>

        {/* Contenido */}
        <div className="px-6 py-8 space-y-6">
          <div className="text-6xl mb-4">⚠️</div>

          <div className="bg-red-50 border-l-4 border-danger p-6 rounded text-left">
            <p className="text-danger font-semibold mb-2">Detalles del Error:</p>
            <p className="text-gray-700">{error}</p>
          </div>

          <p className="text-sm text-gray-600">
            Por favor, intenta nuevamente o contacta al soporte técnico si el problema persiste.
          </p>

          <button
            onClick={onReset}
            className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-lg hover:bg-orange-600 transition"
          >
            🔄 Intentar Nuevamente
          </button>
        </div>
      </div>
    </div>
  );
}
