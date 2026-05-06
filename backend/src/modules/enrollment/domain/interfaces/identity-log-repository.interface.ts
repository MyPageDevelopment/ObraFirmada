/**
 * Interfaz del Repositorio de IdentityLog
 * SOLID - Inversion de Dependencias: se inyecta interfaz, no implementacion
 */

import { IdentityLog } from '@prisma/client';

export interface IIdentityLogRepository {
  /**
   * Crear un nuevo log de identidad
   * @param data Datos del log a crear
   * @returns Log creado
   */
  create(data: Omit<IdentityLog, 'id' | 'createdAt'>): Promise<IdentityLog>;

  /**
   * Obtener el ultimo log por RUT
   * @param rut RUT normalizado
   * @returns Ultimo log o null
   */
  findLatestByRut(rut: string): Promise<IdentityLog | null>;

  /**
   * Contar logs por RUT
   * @param rut RUT normalizado
   * @returns Total de logs
   */
  countByRut(rut: string): Promise<number>;
}
