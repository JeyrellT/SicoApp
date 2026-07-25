/**
 * SICOP Analytics - Fábrica de claves de query para React Query.
 *
 * Centraliza la forma de las query keys para que invalidaciones y refetch
 * manuales sean consistentes entre hooks.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import type {
  ParametrosCatalogo,
  ParametrosPerfilEntidad,
  ParametrosProcedimientos,
  RangoPeriodo,
} from '../../api/tipos';

export const clavesQuery = {
  raiz: ['sicop'] as const,

  saludDatos: () => [...clavesQuery.raiz, 'salud', 'datos'] as const,

  resumen: (rango?: RangoPeriodo) => [...clavesQuery.raiz, 'dashboard', 'resumen', rango] as const,
  serie: (rango?: RangoPeriodo) => [...clavesQuery.raiz, 'dashboard', 'serie', rango] as const,
  topInstituciones: (rango?: RangoPeriodo & { limite?: number }) =>
    [...clavesQuery.raiz, 'dashboard', 'top-instituciones', rango] as const,
  topProveedores: (rango?: RangoPeriodo & { limite?: number }) =>
    [...clavesQuery.raiz, 'dashboard', 'top-proveedores', rango] as const,
  categorias: (rango?: RangoPeriodo & { limite?: number }) =>
    [...clavesQuery.raiz, 'dashboard', 'categorias', rango] as const,
  tiposProcedimiento: (rango?: RangoPeriodo) =>
    [...clavesQuery.raiz, 'dashboard', 'tipos-procedimiento', rango] as const,
  filtros: () => [...clavesQuery.raiz, 'dashboard', 'filtros'] as const,

  instituciones: (params?: ParametrosCatalogo) =>
    [...clavesQuery.raiz, 'catalogo', 'instituciones', params] as const,
  proveedores: (params?: ParametrosCatalogo) =>
    [...clavesQuery.raiz, 'catalogo', 'proveedores', params] as const,

  perfilInstitucion: (cedula: string, params?: ParametrosPerfilEntidad) =>
    [...clavesQuery.raiz, 'instituciones', cedula, 'perfil', params] as const,
  perfilProveedor: (cedula: string, params?: ParametrosPerfilEntidad) =>
    [...clavesQuery.raiz, 'proveedores', cedula, 'perfil', params] as const,

  procedimientos: (params?: ParametrosProcedimientos) =>
    [...clavesQuery.raiz, 'procedimientos', params] as const,
  detalleProcedimiento: (nroSicop: string) =>
    [...clavesQuery.raiz, 'procedimientos', nroSicop, 'detalle'] as const,

  preferencias: () => [...clavesQuery.raiz, 'auth', 'preferencias'] as const,
};
