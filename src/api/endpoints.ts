/**
 * SICOP Analytics - Funciones tipadas por endpoint de la API.
 *
 * Cada función corresponde 1:1 con un endpoint del contrato documentado.
 * No agrega lógica de negocio: solo arma la ruta, los params y el tipo
 * de retorno.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import { clienteApi, guardarTokens, limpiarTokens } from './cliente';
import type {
  ActualizarUsuarioRequest,
  CambiarPasswordRequest,
  Categoria,
  CargaEtl,
  Contraparte,
  CrearUsuarioRequest,
  CrearUsuarioResponse,
  DetalleProcedimiento,
  FiltrosDashboard,
  InstitucionCatalogo,
  LoginRequest,
  LoginResponse,
  Pagina,
  ParametrosCatalogo,
  ParametrosPerfilEntidad,
  ParametrosProcedimientos,
  ParametrosUsuariosAdmin,
  Perfil,
  PerfilInstitucion,
  PerfilProveedor,
  Preferencias,
  ProcedimientoItem,
  ProveedorCatalogo,
  PuntoSerie,
  RangoPeriodo,
  ResumenKPI,
  SaludDatos,
  SaludVivo,
  TipoProcedimiento,
  TopInstitucion,
  TopProveedor,
  Usuario,
} from './tipos';

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const datos = await clienteApi.postPublico<LoginResponse>('/v1/auth/login', body);
  guardarTokens(datos.access_token, datos.refresh_token);
  return datos;
}

export async function refrescarSesion(refreshToken: string): Promise<LoginResponse> {
  const datos = await clienteApi.postPublico<LoginResponse>('/v1/auth/refresh', {
    refresh_token: refreshToken,
  });
  guardarTokens(datos.access_token, datos.refresh_token);
  return datos;
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await clienteApi.post<void>('/v1/auth/logout', { refresh_token: refreshToken });
  } finally {
    limpiarTokens();
  }
}

export function obtenerUsuarioActual(signal?: AbortSignal): Promise<Usuario> {
  return clienteApi.get<Usuario>('/v1/auth/yo', undefined, signal);
}

export function cambiarPassword(body: CambiarPasswordRequest): Promise<void> {
  return clienteApi.post<void>('/v1/auth/cambiar-password', body);
}

export function obtenerPerfiles(signal?: AbortSignal): Promise<Perfil[]> {
  return clienteApi.get<Perfil[]>('/v1/auth/perfiles', undefined, signal);
}

export function obtenerPreferencias(signal?: AbortSignal): Promise<Preferencias> {
  return clienteApi.get<Preferencias>('/v1/auth/preferencias', undefined, signal);
}

export function guardarPreferencias(body: Preferencias): Promise<Preferencias> {
  return clienteApi.put<Preferencias>('/v1/auth/preferencias', body);
}

// ---------------------------------------------------------------------------
// Salud (público)
// ---------------------------------------------------------------------------

export function obtenerSaludVivo(signal?: AbortSignal): Promise<SaludVivo> {
  return clienteApi.getPublico<SaludVivo>('/salud/vivo', undefined, signal);
}

export function obtenerSaludDatos(signal?: AbortSignal): Promise<SaludDatos> {
  return clienteApi.getPublico<SaludDatos>('/salud/datos', undefined, signal);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function obtenerResumen(
  rango?: RangoPeriodo,
  signal?: AbortSignal
): Promise<ResumenKPI> {
  return clienteApi.get<ResumenKPI>('/v1/dashboard/resumen', rango, signal);
}

export function obtenerSerie(
  rango?: RangoPeriodo,
  signal?: AbortSignal
): Promise<PuntoSerie[]> {
  return clienteApi.get<PuntoSerie[]>('/v1/dashboard/serie', rango, signal);
}

export function obtenerTopInstituciones(
  rango?: RangoPeriodo & { limite?: number },
  signal?: AbortSignal
): Promise<TopInstitucion[]> {
  return clienteApi.get<TopInstitucion[]>('/v1/dashboard/top-instituciones', rango, signal);
}

export function obtenerTopProveedores(
  rango?: RangoPeriodo & { limite?: number },
  signal?: AbortSignal
): Promise<TopProveedor[]> {
  return clienteApi.get<TopProveedor[]>('/v1/dashboard/top-proveedores', rango, signal);
}

export function obtenerCategorias(
  rango?: RangoPeriodo & { limite?: number },
  signal?: AbortSignal
): Promise<Categoria[]> {
  return clienteApi.get<Categoria[]>('/v1/dashboard/categorias', rango, signal);
}

export function obtenerTiposProcedimiento(
  rango?: RangoPeriodo,
  signal?: AbortSignal
): Promise<TipoProcedimiento[]> {
  return clienteApi.get<TipoProcedimiento[]>('/v1/dashboard/tipos-procedimiento', rango, signal);
}

export function obtenerFiltrosDashboard(signal?: AbortSignal): Promise<FiltrosDashboard> {
  return clienteApi.get<FiltrosDashboard>('/v1/dashboard/filtros', undefined, signal);
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export function obtenerInstituciones(
  params?: ParametrosCatalogo,
  signal?: AbortSignal
): Promise<Pagina<InstitucionCatalogo>> {
  return clienteApi.get<Pagina<InstitucionCatalogo>>('/v1/catalogo/instituciones', params, signal);
}

export function obtenerProveedores(
  params?: ParametrosCatalogo,
  signal?: AbortSignal
): Promise<Pagina<ProveedorCatalogo>> {
  return clienteApi.get<Pagina<ProveedorCatalogo>>('/v1/catalogo/proveedores', params, signal);
}

// ---------------------------------------------------------------------------
// Perfiles de entidad
// ---------------------------------------------------------------------------

export function obtenerPerfilInstitucion(
  cedula: string,
  params?: ParametrosPerfilEntidad,
  signal?: AbortSignal
): Promise<PerfilInstitucion> {
  return clienteApi.get<PerfilInstitucion>(
    `/v1/instituciones/${encodeURIComponent(cedula)}/perfil`,
    params,
    signal
  );
}

export function obtenerPerfilProveedor(
  cedula: string,
  params?: ParametrosPerfilEntidad,
  signal?: AbortSignal
): Promise<PerfilProveedor> {
  return clienteApi.get<PerfilProveedor>(
    `/v1/proveedores/${encodeURIComponent(cedula)}/perfil`,
    params,
    signal
  );
}

// Re-exportado para quien necesite el tipo Contraparte junto a estas funciones.
export type { Contraparte };

// ---------------------------------------------------------------------------
// Procedimientos
// ---------------------------------------------------------------------------

export function obtenerProcedimientos(
  params?: ParametrosProcedimientos,
  signal?: AbortSignal
): Promise<Pagina<ProcedimientoItem>> {
  return clienteApi.get<Pagina<ProcedimientoItem>>('/v1/procedimientos', params, signal);
}

/** Requiere permiso 'detalle' en el perfil del usuario; el backend responde 403 si falta. */
export function obtenerDetalleProcedimiento(
  nroSicop: string,
  signal?: AbortSignal
): Promise<DetalleProcedimiento> {
  return clienteApi.get<DetalleProcedimiento>(
    `/v1/procedimientos/${encodeURIComponent(nroSicop)}`,
    undefined,
    signal
  );
}

// ---------------------------------------------------------------------------
// Administración (requiere permiso 'admin')
// ---------------------------------------------------------------------------

export function obtenerUsuariosAdmin(
  params?: ParametrosUsuariosAdmin,
  signal?: AbortSignal
): Promise<Pagina<Usuario>> {
  return clienteApi.get<Pagina<Usuario>>('/v1/admin/usuarios', params, signal);
}

export function crearUsuarioAdmin(body: CrearUsuarioRequest): Promise<CrearUsuarioResponse> {
  return clienteApi.post<CrearUsuarioResponse>('/v1/admin/usuarios', body);
}

export function actualizarUsuarioAdmin(
  id: number,
  body: ActualizarUsuarioRequest
): Promise<Usuario> {
  return clienteApi.patch<Usuario>(`/v1/admin/usuarios/${id}`, body);
}

export function obtenerCargasEtl(limite = 30, signal?: AbortSignal): Promise<CargaEtl[]> {
  return clienteApi.get<CargaEtl[]>('/v1/admin/cargas', { limite }, signal);
}

export function ejecutarEtl(periodo?: number, forzar?: boolean): Promise<void> {
  return clienteApi.post<void>('/v1/admin/etl/ejecutar', undefined, { periodo, forzar });
}
