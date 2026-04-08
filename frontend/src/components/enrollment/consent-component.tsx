/**
 * Componente de Consentimiento de Privacidad
 * CUMPLIMIENTO LEY 19.628 CHILE
 * El usuario debe aceptar explícitamente el procesamiento de datos biométricos
 */

'use client';

import React, { useState } from 'react';

interface ConsentComponentProps {
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function ConsentComponent({ onAccept, onReject, isLoading = false }: ConsentComponentProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [acceptedAll, setAcceptedAll] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    setScrolledToBottom(isBottom);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-secondary text-white px-6 py-8 border-b-4 border-orange-600">
          <h1 className="text-3xl font-bold mb-2">🔐 Aviso de Privacidad</h1>
          <p className="text-sm opacity-90">
            Conforme a la Ley 19.628 sobre Protección de Datos Personales
          </p>
        </div>

        {/* Contenido del consentimiento */}
        <div
          className="h-64 overflow-y-auto bg-gray-50 p-6 border-b-2 border-gray-200"
          onScroll={handleScroll}
        >
          <div className="text-gray-700 space-y-4 text-sm leading-relaxed">
            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">1. Recopilación de Datos</h2>
              <p>
                ObraFirmada recopila información personal incluyendo nombres, RUT, correo electrónico
                y datos biométricos (imágenes faciales/palmares) para fines de verificación de
                identidad en la firma de documentos laborales.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">2. Procesamiento Biométrico</h2>
              <p>
                Los datos biométricos NUNCA se almacenan en forma de imágenes. Se convierten
                irreversiblemente a vectores matemáticos (hashes criptográficos SHA-256) que
                permiten verificación de identidad sin recuperar las imágenes originales.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">3. Uso de Datos</h2>
              <p>Sus datos se utilizarán exclusivamente para:</p>
              <ul className="list-disc pl-6 mt-2 text-xs">
                <li>Verificación de identidad en enrolamiento</li>
                <li>Firma digital de documentos laborales</li>
                <li>Auditoría y cumplimiento legal</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">4. Seguridad</h2>
              <p>
                Los datos se protegen mediante encriptación AES-256-GCM, almacenamiento en servidores
                seguros con acceso restringido, y cumplimiento de estándares OWASP y NIST.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">5. Derechos del Usuario</h2>
              <p>
                Usted tiene derecho a acceder, rectificar y eliminar sus datos. Contacte a
                privacy@obrafirmada.cl para ejercer estos derechos.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg mb-2 text-primary">
                6. Aceptación Explícita (Requerida)
              </h2>
              <p className="font-semibold text-orange-600">
                ⚠️ Debe desplazarse hasta el final y aceptar explícitamente para continuar.
              </p>
            </section>
          </div>
        </div>

        {/* Indicador de scroll */}
        {!scrolledToBottom && (
          <div className="bg-yellow-50 px-6 py-3 border-b-2 border-yellow-200 text-sm text-yellow-800">
            ⬇️ Desplácese hacia abajo para ver todas las políticas
          </div>
        )}

        {/* Checkboxes de aceptación */}
        <div className="px-6 py-6 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              disabled={!scrolledToBottom}
              checked={acceptedAll && scrolledToBottom}
              onChange={(e) => setAcceptedAll(e.target.checked)}
              className="mt-1 w-5 h-5 text-secondary disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Acepto los términos de privacidad</span>
              <br />
              <span className="text-xs text-gray-600">
                Debo desplazarme hasta el final para habilitar esta opción
              </span>
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              disabled={!scrolledToBottom}
              checked={acceptedAll && scrolledToBottom}
              onChange={() => {}}
              className="mt-1 w-5 h-5 text-secondary disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">
              Acepto el procesamiento de datos biométricos para verificación
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              disabled={!scrolledToBottom}
              checked={acceptedAll && scrolledToBottom}
              onChange={() => {}}
              className="mt-1 w-5 h-5 text-secondary disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">
              Acepto la firma digital de documentos laborales
            </span>
          </label>
        </div>

        {/* Botones de acción */}
        <div className="bg-gray-100 px-6 py-4 rounded-b-lg flex gap-4 justify-end">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            ❌ Rechazar
          </button>

          <button
            onClick={onAccept}
            disabled={!acceptedAll || !scrolledToBottom || isLoading}
            className="px-6 py-2 bg-secondary text-white rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Procesando...' : '✅ Aceptar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
