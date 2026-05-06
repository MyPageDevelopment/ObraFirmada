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
    if (!isDrawing) {
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

    if (!hasSignature) {
      setError('Debes firmar antes de continuar');
      return;
    }

    const signatureBase64 = canvas.toDataURL('image/png').split(',')[1];
    onConfirm(signatureBase64);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden">
        <div className="bg-secondary text-white px-6 py-8 border-b-4 border-orange-600">
          <h1 className="text-3xl font-bold mb-2">✍️ Firma Manuscrita</h1>
          <p className="text-sm opacity-90">Dibuja tu firma dentro del recuadro</p>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded text-sm text-amber-800">
            Usa el mouse o tu dedo para firmar. Tu firma se guardara como imagen cifrada.
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              width={720}
              height={320}
              className="w-full h-64 md:h-72 touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          {error && <p className="text-sm text-danger">❌ {error}</p>}
        </div>

        <div className="bg-gray-100 px-6 py-4 flex flex-wrap gap-3 justify-between">
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                disabled={isLoading}
                className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                ⬅️ Volver
              </button>
            )}
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              🧹 Limpiar
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-success text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
          >
            {isLoading ? '⏳ Guardando...' : '✅ Confirmar Firma'}
          </button>
        </div>
      </div>
    </div>
  );
}
