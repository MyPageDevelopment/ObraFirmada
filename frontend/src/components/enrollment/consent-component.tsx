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
    <div className="bg-bg-card rounded-2xl shadow-2xl max-w-2xl w-full border-4 border-border overflow-hidden text-text-main select-none">
      {/* Header */}
      <div className="bg-secondary text-white px-6 py-8 border-b-4 border-border">
        <h1 className="text-3xl font-black mb-2">🔐 Aviso de Privacidad</h1>
        <p className="text-sm opacity-90 font-bold">
          Conforme a la Ley 19.628 sobre Protección de Datos Personales
        </p>
      </div>

      {/* Contenido del consentimiento */}
      <div
        className="h-64 overflow-y-auto bg-bg-card p-6 border-b-4 border-border"
        onScroll={handleScroll}
      >
        <div className="text-text-main space-y-4 text-sm leading-relaxed">
          <section>
            <h2 className="font-black text-lg mb-2 text-primary">1. Recopilación de Datos</h2>
            <p>
              ObraFirmada recopila información personal incluyendo nombres, RUT, correo electrónico
              y datos biométricos (imágenes faciales/palmares) para fines de verificación de
              identidad en la firma de documentos laborales.
            </p>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2 text-primary">2. Procesamiento Biométrico</h2>
            <p>
              Los datos biométricos NUNCA se almacenan en forma de imágenes. Se convierten
              irreversiblemente a vectores matemáticos (hashes criptográficos SHA-256) que
              permiten verificación de identidad sin recuperar las imágenes originales.
            </p>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2 text-primary">3. Uso de Datos</h2>
            <p>Sus datos se utilizarán exclusivamente para:</p>
            <ul className="list-disc pl-6 mt-2 text-xs font-bold">
              <li>Verificación de identidad en enrolamiento</li>
              <li>Firma digital de documentos laborales</li>
              <li>Auditoría y cumplimiento legal</li>
            </ul>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2 text-primary">4. Seguridad</h2>
            <p>
              Los datos se protegen mediante encriptación AES-256-GCM, almacenamiento en servidores
              seguros con acceso restringido, y cumplimiento de estándares OWASP y NIST.
            </p>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2 text-primary">5. Derechos del Usuario</h2>
            <p>
              Usted tiene derecho a acceder, rectificar y eliminar sus datos. Contacte a
              privacy@obrafirmada.cl para ejercer estos derechos.
            </p>
          </section>

          <section>
            <h2 className="font-black text-lg mb-2 text-primary">
              6. Aceptación Explícita (Requerida)
            </h2>
            <p className="font-bold text-warning flex items-center gap-2">
              <span>⚠️</span> Debe desplazarse hasta el final y aceptar explícitamente para continuar.
            </p>
          </section>
        </div>
      </div>

      {/* Indicador de scroll */}
      {!scrolledToBottom && (
        <div className="bg-warning text-white dark:text-black px-6 py-3.5 border-b-4 border-border text-base font-extrabold flex items-center gap-2">
          <span>⬇️</span> Desplácese hacia abajo para ver todas las políticas
        </div>
      )}

      {/* Checkboxes de aceptación */}
      <div className="px-6 py-6 space-y-4 bg-bg-card border-b-4 border-border">
        <label className="flex items-center space-x-4 cursor-pointer py-2">
          <input
            type="checkbox"
            disabled={!scrolledToBottom}
            checked={acceptedAll && scrolledToBottom}
            onChange={(e) => setAcceptedAll(e.target.checked)}
            className="w-10 h-10 flex-shrink-0 border-4 border-border text-secondary focus:ring-secondary disabled:opacity-50 accent-secondary cursor-pointer"
          />
          <span className="text-base text-text-main leading-snug">
            <span className="font-black">Acepto los términos de privacidad</span>
            <br />
            <span className="text-sm text-text-muted">
              Debo desplazarme hasta el final para habilitar esta opción
            </span>
          </span>
        </label>

        <label className="flex items-center space-x-4 cursor-pointer py-2">
          <input
            type="checkbox"
            disabled={!scrolledToBottom}
            checked={acceptedAll && scrolledToBottom}
            onChange={() => {}}
            className="w-10 h-10 flex-shrink-0 border-4 border-border text-secondary focus:ring-secondary disabled:opacity-50 accent-secondary cursor-pointer"
          />
          <span className="text-base text-text-main font-bold leading-snug">
            Acepto el procesamiento de datos biométricos para verificación
          </span>
        </label>

        <label className="flex items-center space-x-4 cursor-pointer py-2">
          <input
            type="checkbox"
            disabled={!scrolledToBottom}
            checked={acceptedAll && scrolledToBottom}
            onChange={() => {}}
            className="w-10 h-10 flex-shrink-0 border-4 border-border text-secondary focus:ring-secondary disabled:opacity-50 accent-secondary cursor-pointer"
          />
          <span className="text-base text-text-main font-bold leading-snug">
            Acepto la firma digital de documentos laborales
          </span>
        </label>
      </div>

      {/* Botones de acción */}
      <div className="bg-bg-card px-6 py-6 flex gap-4 justify-end">
        <button
          onClick={onReject}
          disabled={isLoading}
          type="button"
          className="px-6 py-4.5 border-4 border-border text-text-main font-black rounded-xl hover:bg-bg-main active:scale-95 transition-all disabled:opacity-50 text-base"
        >
          ❌ Rechazar
        </button>

        <button
          onClick={onAccept}
          disabled={!acceptedAll || !scrolledToBottom || isLoading}
          type="button"
          className="px-8 py-4.5 bg-secondary text-white rounded-xl font-black border-4 border-border hover:bg-interactive-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          {isLoading ? '⏳ Procesando...' : '✅ Aceptar y Continuar'}
        </button>
      </div>
    </div>
  );
}
