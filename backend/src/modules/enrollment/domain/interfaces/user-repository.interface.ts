/**
 * Interfaz del Repositorio de Usuarios
 * SOLID - Inversión de Dependencias (D): EnrollmentService inyecta interfaz, no implementación
 * SOLID - Segregación de Interfaz (I): Contrato mínimo y específico
 */

import { User } from '@prisma/client';

/**
 * Contrato de acceso a datos para entidad User
 * Implementado por PrismaUserRepository
 * Permite inyectar diferentes implementaciones (Mock, SQL, NoSQL, etc.)
 */
export interface IUserRepository {
  /**
   * Crear un nuevo usuario con datos iniciales
   * @param rut RUT normalizado
   * @returns Usuario creado
   */
  create(rut: string): Promise<User>;

  /**
   * Buscar usuario por ID
   * @param id Identificador único
   * @returns Usuario encontrado o null
   */
  findById(id: string): Promise<User | null>;

  /**
   * Buscar usuario por RUT
   * @param rut RUT normalizado
   * @returns Usuario encontrado o null
   */
  findByRut(rut: string): Promise<User | null>;

  /**
   * Buscar usuario por email
   * @param rut RUT a verificar
   * @returns true si existe
   */
  existsByRut(rut: string): Promise<boolean>;
}
