/**
 * Componente de Captura de Biometría (Cámara)
 * Captura imagen facial/palmar y la convierte a Base64
 * SEGURIDAD: Imagen se procesa en cliente antes de enviarse al servidor
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CameraService } from '@/lib/utils/camera.service';

interface BiometricCaptureProps {
  onCapture: (imageBase64: string) => void;
  biometricType: 'FACE' | 'PALM';
  isLoading?: boolean;
}

export function BiometricCaptureComponent({
  onCapture,
  biometricType,
  isLoading = false,
}: BiometricCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasInitializedRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Inicializar cámara al montar
  useEffect(() => {
    if (hasInitializedRef.current) {
      return undefined;
    }
    hasInitializedRef.current = true;

    const initializeCamera = async () => {
      try {
        const mediaStream = await CameraService.requestCameraAccess();
        setStream(mediaStream);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al acceder a la cámara');
      }
    };

    initializeCamera();

    return () => {
      if (stream) {
        CameraService.stopMediaStream(stream);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!stream || !video) {
      return undefined;
    }

    let canceled = false;
    const handleLoadedMetadata = async () => {
      try {
        await video.play();
        if (!canceled) {
          setCameraReady(true);
        }
      } catch {
        if (!canceled) {
          setError('No se pudo reproducir el video de la camara');
        }
      }
    };

    video.srcObject = stream;
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      canceled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [stream]);

  const handleCapture = () => {
    if (videoRef.current) {
      try {
        const imageBase64 = CameraService.captureFrame(videoRef.current);
        setCapturedImage(imageBase64);
        // Pausar video cuando se capture
        videoRef.current.pause();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al capturar imagen');
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const getTitleAndInstructions = () => {
    if (biometricType === 'FACE') {
      return {
        title: '📸 Captura tu Rostro',
        instructions: [
          'Colócate frente a la cámara',
          'Asegúrate de tener buena iluminación',
          'Mantén tu rostro centrado y visible',
          'Evita usar gafas de sol',
        ],
      };
    } else {
      return {
        title: '🖐️ Captura tu Palma',
        instructions: [
          'Coloca tu mano abierta frente a la cámara',
          'Asegúrate de capturar toda la palma',
          'Mantén una buena iluminación',
          'Evita sombras en tu mano',
        ],
      };
    }
  };

  const { title, instructions } = getTitleAndInstructions();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-danger mb-4">❌ Error de Cámara</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-sm text-gray-600">
            Por favor, asegúrate de que has concedido permisos de cámara a este navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-secondary text-white px-6 py-8 border-b-4 border-orange-600">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-sm opacity-90">
            {biometricType === 'FACE' ? 'Verificación de identidad facial' : 'Verificación de biometría de palma'}
          </p>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 px-6 py-4 border-b-2 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
          <ul className="list-disc pl-6 text-sm text-blue-800 space-y-1">
            {instructions.map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ul>
        </div>

        {/* Video o Imagen Capturada */}
        <div className="aspect-video bg-black relative overflow-hidden">
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={`data:image/jpeg;base64,${capturedImage}`}
              alt="Captura biometrica"
              className="w-full h-full object-cover"
            />
          )}

          {/* Marco de guía visual */}
          <div className="absolute inset-0 pointer-events-none">
            {biometricType === 'FACE' && (
              <svg className="w-full h-full" viewBox="0 0 640 480">
                <circle
                  cx="320"
                  cy="240"
                  r="120"
                  fill="none"
                  stroke="rgba(255, 165, 0, 0.5)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            )}
          </div>

          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <div className="text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-secondary border-t-transparent rounded-full"></div>
                <p className="mt-3 text-sm">Inicializando camara...</p>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="bg-gray-100 px-6 py-4 flex gap-4 justify-end">
          {!capturedImage ? (
            <>
              <button
                onClick={handleCapture}
                disabled={isLoading || !cameraReady}
                className="px-8 py-3 bg-secondary text-white rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 text-lg"
              >
                📷 Capturar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetake}
                disabled={isLoading}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                🔄 Reintentar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="px-6 py-2 bg-success text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
              >
                {isLoading ? '⏳ Enviando...' : '✅ Confirmar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
