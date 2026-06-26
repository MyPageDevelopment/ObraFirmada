/**
 * Componente de Formulario de Enrolamiento Inicial
 * Recopila datos del usuario y valida RUT chileno
 */

'use client';

import React, { useState } from 'react';
import { isValidChileanRut, formatChileanRut } from '@/lib/utils/rut-validator';

interface EnrollmentFormProps {
  onSubmit: (data: { rut: string }) => void;
  isLoading?: boolean;
}

export function EnrollmentFormComponent({ onSubmit, isLoading = false }: EnrollmentFormProps) {
  const [formData, setFormData] = useState({
    rut: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar RUT
    if (!formData.rut.trim()) {
      newErrors.rut = 'El RUT es requerido';
    } else if (!isValidChileanRut(formData.rut)) {
      newErrors.rut = 'RUT inválido (verifica el dígito verificador)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Formatear RUT conforme escribe
    if (name === 'rut') {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase(),
      }));
    }

    // Limpiar error cuando empieza a escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Formatear RUT al salir del campo
    if (name === 'rut' && formData.rut) {
      try {
        const formatted = formatChileanRut(formData.rut);
        setFormData((prev) => ({
          ...prev,
          rut: formatted,
        }));
      } catch {
        // Si falla el formato, dejar como está
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        const formatted = formatChileanRut(formData.rut);
        onSubmit({ rut: formatted });
      } catch {
        onSubmit(formData);
      }
    }
  };

  return (
    <div className="bg-bg-card rounded-2xl shadow-2xl max-w-2xl w-full border-4 border-border overflow-hidden text-text-main select-none">
      {/* Header */}
      <div className="bg-secondary text-white px-6 py-8 border-b-4 border-border">
        <h1 className="text-3xl font-black mb-2">✍️ Enrolamiento de Trabajador</h1>
        <p className="text-sm opacity-90 font-bold">Ingresa tus datos para iniciar el proceso de verificación</p>
      </div>

      {/* Logo/Branding */}
      <div className="text-center py-6 bg-bg-card border-b-4 border-border">
        <h2 className="text-2xl font-black text-primary">ObraFirmada</h2>
        <p className="text-xs text-text-muted font-semibold mt-1">Plataforma de Firma de Documentos Laborales</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
        {/* Campo RUT */}
        <div>
          <label htmlFor="rut" className="block text-base font-black text-text-main mb-2">
            RUT Chileno *
          </label>
          <input
            type="text"
            id="rut"
            name="rut"
            placeholder="12.345.678-9"
            value={formData.rut}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-3 border-4 rounded-xl focus:outline-none transition ${
              touched.rut && errors.rut
                ? 'border-danger bg-danger/10 text-text-main focus:border-danger'
                : 'border-border bg-bg-card text-text-main focus:border-secondary'
            }`}
            disabled={isLoading}
          />
          {touched.rut && errors.rut && (
            <p className="text-danger font-bold text-sm mt-2">❌ {errors.rut}</p>
          )}
          <p className="text-sm text-text-muted font-semibold mt-2">
            💡 Formato: 12.345.678-9 (puedes omitir puntos y guión)
          </p>
        </div>

        {/* Nota de seguridad */}
        <div className="bg-bg-card border-4 border-border p-4 rounded-xl">
          <p className="text-xs text-text-main font-bold">
            🔒 <span className="font-extrabold text-secondary">Tu información es segura:</span> Solo se usa para enrolamiento
            biométrico conforme a la Ley 19.628.
          </p>
        </div>

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-secondary text-white py-4.5 rounded-xl font-black text-xl hover:bg-interactive-hover transition border-4 border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳ Procesando...' : '➡️ Continuar'}
        </button>
      </form>
    </div>
  );
}
