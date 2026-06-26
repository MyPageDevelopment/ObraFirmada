'use client';

import React, { useState } from 'react';
import { ConsentComponent } from '@/components/enrollment/consent-component';
import { BiometricCaptureComponent } from '@/components/enrollment/biometric-capture';
import { SignatureCaptureComponent } from '@/components/enrollment/signature-capture';
import { EnrollmentFormComponent } from '@/components/enrollment/enrollment-form';
import { enrollmentApi } from '@/lib/services/enrollment-api.service';
import { formatChileanRut } from '@/lib/utils/rut-validator';
import { ThemeHeader } from '@/components/common/ThemeHeader';

type EnrollmentStep = 'consent' | 'form' | 'signature' | 'biometric' | 'success' | 'error';

interface EnrollmentState {
  rut?: string;
  signatureBase64?: string;
  biometricImageBase64?: string;
  identityLogId?: string;
  capturedAt?: string;
  biometricType?: 'FACE' | 'PALM';
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
   * PASO 2: Usuario ingresa RUT
   */
  const handleFormSubmit = async (data: { rut: string }) => {
    setIsLoading(true);
    try {
      setEnrollmentData((prev) => ({
        ...prev,
        rut: data.rut,
      }));
      setStep('signature');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar RUT';
      setError(errorMessage);
      console.error('Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * PASO 3: Usuario captura firma manuscrita
   */
  const handleSignatureConfirm = async (signatureBase64: string) => {
    setIsLoading(true);
    try {
      setEnrollmentData((prev) => ({
        ...prev,
        signatureBase64,
      }));
      setStep('biometric');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar firma';
      setError(errorMessage);
      console.error('Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * PASO 4: Usuario captura biometria y se envia al backend
   */
  const handleBiometricCapture = async (imageBase64: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!enrollmentData.rut || !enrollmentData.signatureBase64) {
        throw new Error('Datos incompletos para registrar identidad');
      }

      const response = await enrollmentApi.registerIdentity({
        rut: formatChileanRut(enrollmentData.rut),
        biometricImageBase64: imageBase64,
        biometricType: 'FACE',
        signatureBase64: enrollmentData.signatureBase64,
      });

      setEnrollmentData((prev) => ({
        ...prev,
        biometricImageBase64: imageBase64,
        identityLogId: response.identityLogId,
        capturedAt: response.capturedAt,
        biometricType: response.biometricType,
      }));

      console.log('✅ Identidad registrada exitosamente');

      setStep('success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al capturar biometría';
      setError(errorMessage);
      console.error('Error:', errorMessage);
      setStep('error');
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

      case 'signature':
        return (
          <SignatureCaptureComponent
            onConfirm={handleSignatureConfirm}
            onBack={() => setStep('form')}
            isLoading={isLoading}
          />
        );

      case 'biometric':
        return (
          <BiometricCaptureComponent
            onCapture={handleBiometricCapture}
            biometricType="FACE"
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
        return <div className="font-bold text-lg">Error: Paso desconocido</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-main transition-colors duration-150">
      <ThemeHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        {renderCurrentStep()}
      </main>
    </div>
  );
}

/**
 * Pantalla de éxito al completar enrolamiento
 */
function SuccessScreenComponent({ enrollmentData }: { enrollmentData: EnrollmentState }) {
  return (
    <div className="bg-bg-card rounded-2xl shadow-2xl max-w-2xl w-full text-center border-4 border-border overflow-hidden select-none">
      {/* Header */}
      <div className="bg-success text-white px-6 py-8 border-b-4 border-border">
        <h1 className="text-4xl font-black mb-2">✅ Enrolamiento Completado</h1>
        <p className="text-sm opacity-90 font-bold">Tu cuenta está lista para usar en terreno</p>
      </div>

      {/* Contenido */}
      <div className="px-6 py-8 space-y-6">
        <div className="text-6xl mb-4">🎉</div>

        <div className="bg-bg-card border-4 border-border p-6 rounded-xl text-left space-y-3">
          <p className="font-black text-lg text-text-main">
            Identidad registrada correctamente
          </p>

          <div className="space-y-2 text-base font-bold">
            <p>
              <span className="font-black">RUT:</span> {enrollmentData.rut}
            </p>
            <p>
              <span className="font-black">Firma capturada:</span>{' '}
              {enrollmentData.signatureBase64 ? 'SÍ' : 'NO'}
            </p>
            <p>
              <span className="font-black">Biometría capturada:</span>{' '}
              {enrollmentData.biometricImageBase64 ? 'SÍ' : 'NO'}
            </p>
            <p className="break-all">
              <span className="font-black">Log ID:</span> {enrollmentData.identityLogId || 'Pendiente'}
            </p>
            <p>
              <span className="font-black">Capturado:</span> {enrollmentData.capturedAt || 'Pendiente'}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border-4 border-border p-4 rounded-xl text-sm text-left">
          <p className="font-black mb-2 text-secondary">✨ Lo que sucedió:</p>
          <ul className="list-disc pl-6 space-y-1 font-bold">
            <li>Leíste y aceptaste el aviso de privacidad</li>
            <li>Capturaste tu firma manuscrita digital</li>
            <li>Capturaste tu biometría con la cámara</li>
            <li>El backend procesó y registró tu identidad</li>
          </ul>
        </div>

        <div className="bg-bg-card border-4 border-border p-4 rounded-xl text-sm text-left">
          <p className="font-black mb-2 text-warning">🔐 Datos Sensibles:</p>
          <p className="font-bold">
            NUNCA se almacenará tu imagen original. Solo se guardará un hash criptográfico
            irreversible cifrado que permite verificar tu identidad en futuras sesiones.
          </p>
        </div>

        <button
          onClick={() => (window.location.href = '/')}
          className="w-full bg-secondary text-white py-4.5 rounded-xl font-black text-xl hover:bg-interactive-hover transition border-4 border-border active:scale-95"
        >
          ➡️ Volver al Menú Principal
        </button>
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
    <div className="bg-bg-card rounded-2xl shadow-2xl max-w-2xl w-full text-center border-4 border-border overflow-hidden select-none">
      {/* Header */}
      <div className="bg-danger text-white px-6 py-8 border-b-4 border-border">
        <h1 className="text-3xl font-black mb-2">❌ Error en el Enrolamiento</h1>
      </div>

      {/* Contenido */}
      <div className="px-6 py-8 space-y-6">
        <div className="text-6xl mb-4">⚠️</div>

        <div className="bg-bg-card border-4 border-border p-6 rounded-xl text-left">
          <p className="text-danger font-black mb-2">Detalles del Error:</p>
          <p className="text-text-main font-bold">{error}</p>
        </div>

        <p className="text-base text-text-muted font-bold">
          Por favor, intenta nuevamente o contacta al soporte técnico si el problema persiste.
        </p>

        <button
          onClick={onReset}
          className="w-full bg-secondary text-white py-4.5 rounded-xl font-black text-xl hover:bg-interactive-hover transition border-4 border-border active:scale-95"
        >
          🔄 Intentar Nuevamente
        </button>
      </div>
    </div>
  );
}
