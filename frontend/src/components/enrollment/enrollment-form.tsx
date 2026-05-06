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
      onSubmit(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-secondary text-white px-6 py-8 border-b-4 border-orange-600">
          <h1 className="text-3xl font-bold mb-2">✍️ Enrolamiento de Trabajador</h1>
          <p className="text-sm opacity-90">Ingresa tus datos para iniciar el proceso de verificación</p>
        </div>

        {/* Logo/Branding */}
        <div className="text-center py-6 bg-gray-50 border-b">
          <h2 className="text-2xl font-bold text-primary">ObraFirmada</h2>
          <p className="text-xs text-gray-600 mt-1">Plataforma de Firma de Documentos Laborales</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
          {/* Campo RUT */}
          <div>
            <label htmlFor="rut" className="block text-sm font-semibold text-gray-700 mb-2">
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
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition ${
                touched.rut && errors.rut
                  ? 'border-danger focus:border-danger bg-red-50'
                  : 'border-gray-300 focus:border-secondary'
              }`}
              disabled={isLoading}
            />
            {touched.rut && errors.rut && (
              <p className="text-danger text-sm mt-1">❌ {errors.rut}</p>
            )}
            <p className="text-xs text-gray-600 mt-1">
              💡 Formato: 12.345.678-9 (puedes omitir puntos y guión)
            </p>
          </div>

          {/* Nota de seguridad */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-xs text-blue-800">
              🔒 <span className="font-semibold">Tu información es segura:</span> Solo se usa para enrolamiento
              biometrico conforme a la Ley 19.628.
            </p>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-secondary text-white py-3 rounded-lg font-bold text-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Procesando...' : '➡️ Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
