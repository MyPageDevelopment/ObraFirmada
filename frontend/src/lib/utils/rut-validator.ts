/**
 * Utilidades de Validación de RUT Chileno
 * Implementa el algoritmo de dígito verificador (Módulo 11)
 */

/**
 * Normaliza RUT chileno
 * Entrada: 123456789 o 12.345.678-9 o 12345678-9
 * Salida: 12345678-9
 */
export function normalizeChileanRut(rut: string): string {
  // Remover puntos, espacios y guiones
  let normalized = rut.replace(/[\.\s-]/g, '');

  // Validar que tenga dígitos
  if (!/^\d{7,8}[0-9kK]$/.test(normalized)) {
    throw new Error('Formato de RUT inválido');
  }

  // Separar números y dígito verificador
  const numbers = normalized.slice(0, -1);
  const verifier = normalized.slice(-1).toLowerCase();

  // Asegurar 8 dígitos
  const paddedNumbers = numbers.padStart(8, '0');

  return `${paddedNumbers}-${verifier}`;
}

/**
 * Valida dígito verificador de RUT
 * Algoritmo: Módulo 11 con pesos 2-7
 */
export function validateChileanRutChecksum(rut: string): boolean {
  const normalized = normalizeChileanRut(rut);
  const match = normalized.match(/^(\d{8})-([0-9k])$/);

  if (!match) {
    return false;
  }

  const numbers = match[1];
  const providedVerifier = match[2];

  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;

  for (let i = numbers.length - 1; i >= 0; i--) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier++;
    if (multiplier > 7) {
      multiplier = 2;
    }
  }

  const remainder = 11 - (sum % 11);
  let calculatedVerifier: string;

  if (remainder === 11) {
    calculatedVerifier = '0';
  } else if (remainder === 10) {
    calculatedVerifier = 'k';
  } else {
    calculatedVerifier = remainder.toString();
  }

  return calculatedVerifier === providedVerifier;
}

/**
 * Valida RUT completo
 * @returns true si RUT es válido
 */
export function isValidChileanRut(rut: string): boolean {
  try {
    return validateChileanRutChecksum(rut);
  } catch {
    return false;
  }
}

/**
 * Formatea RUT para mostrar
 * Entrada: 12345678-9
 * Salida: 12.345.678-9
 */
export function formatChileanRut(rut: string): string {
  try {
    const normalized = normalizeChileanRut(rut);
    const match = normalized.match(/^(\d{2})(\d{3})(\d{3})-(.+)$/);

    if (!match) {
      return rut;
    }

    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  } catch {
    return rut;
  }
}
