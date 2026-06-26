/**
 * Componente de Captura de Firma Manuscrita (Canvas)
 * HU-02: Permite dibujar y exportar firma en Base64
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SignatureCaptureProps {
  onConfirm: (signatureBase64: string) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function SignatureCaptureComponent({ onConfirm, onBack, isLoading = false }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('No se pudo inicializar el canvas');
      return;
    }

    // Fondo blanco para evitar transparencia en Base64
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!acceptedPrivacy) {
      setError('Debes aceptar el Aviso de Privacidad (Ley 19.628) para poder firmar');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !acceptedPrivacy) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (!acceptedPrivacy) {
      setError('Debes aceptar el Aviso de Privacidad (Ley 19.628) para poder firmar');
      return;
    }

    if (!hasSignature) {
      setError('Debes firmar antes de continuar');
      return;
    }

    const signatureBase64 = canvas.toDataURL('image/png').split(',')[1];
    onConfirm(signatureBase64);
  };

  return (
    <div className="bg-bg-card rounded-2xl shadow-2xl max-w-3xl w-full border-4 border-border overflow-hidden text-text-main select-none">
      <div className="bg-secondary text-white px-6 py-8 border-b-4 border-border">
        <h1 className="text-3xl font-black mb-2">✍️ Firma Manuscrita</h1>
        <p className="text-sm opacity-90 font-bold">Dibuja tu firma dentro del recuadro</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="bg-bg-card border-4 border-border p-4 rounded-xl text-sm text-text-main font-bold">
          ℹ️ Usa el mouse o tu dedo para firmar. Tu firma se guardará como imagen cifrada.
        </div>

        {/* Checkbox de Privacidad Ley 19.628 */}
        <div className="flex items-center space-x-4 cursor-pointer py-5 px-6 bg-bg-card rounded-2xl border-4 border-border">
          <input
            type="checkbox"
            id="privacy-terms-checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => {
              setAcceptedPrivacy(e.target.checked);
              if (e.target.checked) {
                setError(null);
              }
            }}
            className="w-10 h-10 flex-shrink-0 border-4 border-border text-secondary focus:ring-secondary accent-secondary cursor-pointer"
          />
          <label htmlFor="privacy-terms-checkbox" className="text-base md:text-lg text-text-main cursor-pointer select-none leading-relaxed">
            <span className="font-black">Aviso de Privacidad (Ley 19.628):</span> Entiendo y acepto que mi firma manuscrita será recopilada y almacenada de forma segura junto con mi registro de identidad para efectos de verificación legal de documentos laborales.
          </label>
        </div>

        <div className={`border-4 border-dashed border-border rounded-xl bg-white transition duration-200 ${!acceptedPrivacy ? 'opacity-40 cursor-not-allowed select-none' : ''}`}>
          <canvas
            ref={canvasRef}
            width={720}
            height={320}
            className={`w-full h-64 md:h-72 touch-none ${!acceptedPrivacy ? 'pointer-events-none' : 'cursor-crosshair'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {error && <p className="text-sm text-danger font-black">❌ {error}</p>}
      </div>

      <div className="bg-bg-card px-8 py-6 flex flex-col sm:flex-row gap-4 justify-between border-t-4 border-border">
        <div className="flex gap-4">
          {onBack && (
            <button
              onClick={onBack}
              disabled={isLoading}
              className="px-8 py-4.5 border-4 border-border text-text-main bg-bg-card rounded-xl font-bold text-lg hover:bg-bg-main transition active:scale-95 disabled:opacity-50"
            >
              ⬅️ Volver
            </button>
          )}
          <button
            onClick={handleClear}
            disabled={isLoading || !acceptedPrivacy}
            className="px-8 py-4.5 border-4 border-border text-text-main bg-bg-card rounded-xl font-bold text-lg hover:bg-bg-main transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🧹 Limpiar
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={isLoading || !acceptedPrivacy || !hasSignature}
          className="px-10 py-5 bg-success text-white rounded-xl font-black text-xl hover:bg-green-600 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-border"
        >
          {isLoading ? '⏳ Guardando...' : '✅ Confirmar Firma'}
        </button>
      </div>
    </div>
  );
}
