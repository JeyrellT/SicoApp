/**
 * SICOP Analytics - Tipos TypeScript del contrato de la API backend.
 *
 * Este archivo refleja el contrato autoritativo documentado en el backend
 * (FastAPI). No inventar campos ni endpoints: si el backend cambia, este
 * archivo debe actualizarse en conjunto.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

export interface Perfil {
  id: number;
  codigo: 'admin' | 'analista' | 'consulta';
  nombre: string;
  descripcion: string;
  permisos: string[];
  limite_page_size: number;
  limite_consultas_dia: number;
  meses_historia: number;
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  organizacion: string | null;
  activo: boolean;
  debe_cambiar_password: boolean;
  ultimo_acceso: string | null;
  creado_en: string;
  perfil: Perfil;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  usuario: Usuario;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nueva: string;
}

export interface FiltroGuardado {
  [clave: string]: unknown;
}

export interface Preferencias {
  filtros_guardados: FiltroGuardado[];
  instituciones_seguidas: string[];
  proveedores_seguidos: string[];
  config_dashboard: Record<string, unknown>;
  actualizado_en: string;
}

// ---------------------------------------------------------------------------
// Salud (público)
// ---------------------------------------------------------------------------

export interface SaludVivo {
  estado: string;
  version: string;
}

export interface SaludDatos {
  estado: string;
  periodos: number[];
  periodo_min: number;
  periodo_max: number;
  ultima_carga: string;
  ultima_carga_periodo: number;
  ultima_carga_estado: 'parcial' | 'final';
  ultima_carga_exito: boolean;
  filas_totales: number;
  meses_retencion: number;
  version_api: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Parámetros comunes a los endpoints de dashboard: rango de periodo yyyymm. */
export interface RangoPeriodo {
  desde?: number;
  hasta?: number;
}

export interface ResumenKPI {
  periodo_desde: number;
  periodo_hasta: number;
  procedimientos: number;
  lineas_adjudicadas: number;
  monto_crc: number;
  monto_usd: number;
  instituciones: number;
  proveedores: number;
  ofertas: number;
  ordenes: number;
  monto_ordenes_crc: number;
  invitaciones: number;
  monto_promedio_crc: number;
  variacion_monto_pct: number | null;
}

export interface PuntoSerie {
  periodo: number;
  etiqueta: string;
  procedimientos: number;
  lineas: number;
  monto_crc: number;
  monto_usd: number;
}

export interface TopInstitucion {
  cedula: string;
  nombre: string;
  procedimientos: number;
  monto_crc: number;
}

export interface TopProveedor {
  cedula: string;
  nombre: string;
  adjudicaciones: number;
  monto_crc: number;
}

export interface Categoria {
  objeto_gasto: string;
  lineas: number;
  monto_crc: number;
  monto_usd: number;
  proveedores_distintos: number;
  participacion_pct: number;
}

export interface TipoProcedimiento {
  tipo_procedimiento: string;
  procedimientos: number;
  lineas: number;
  monto_crc: number;
  participacion_pct: number;
}

export interface FiltrosDashboard {
  periodos: number[];
  anios: number[];
  tipos_procedimiento: string[];
  objetos_gasto: string[];
  monedas: string[];
  actualizado_en: string;
}

// ---------------------------------------------------------------------------
// Paginación genérica
// ---------------------------------------------------------------------------

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface InstitucionCatalogo {
  cedula: string;
  nombre: string;
  [clave: string]: unknown;
}

export interface ProveedorCatalogo {
  cedula: string;
  nombre: string;
  [clave: string]: unknown;
}

export interface ParametrosCatalogo {
  page?: number;
  page_size?: number;
  buscar?: string;
  con_actividad?: boolean;
}

// ---------------------------------------------------------------------------
// Perfiles de entidad
// ---------------------------------------------------------------------------

export interface Contraparte {
  cedula: string;
  nombre: string;
  lineas: number;
  monto_crc: number;
  participacion_pct: number;
}

export interface ParametrosPerfilEntidad {
  desde?: number;
  hasta?: number;
  top?: number;
}

export interface PerfilInstitucion {
  cedula: string;
  nombre: string;
  periodo_desde: number;
  periodo_hasta: number;
  resumen: ResumenKPI;
  serie: PuntoSerie[];
  top_proveedores: Contraparte[];
  categorias: Categoria[];
  tipos_procedimiento: TipoProcedimiento[];
  indice_concentracion: number | null;
}

export interface PerfilProveedor {
  cedula: string;
  nombre: string;
  periodo_desde: number;
  periodo_hasta: number;
  resumen: ResumenKPI;
  serie: PuntoSerie[];
  top_instituciones: Contraparte[];
  categorias: Categoria[];
  tasa_exito_pct: number | null;
}

// ---------------------------------------------------------------------------
// Procedimientos
// ---------------------------------------------------------------------------

export interface ProcedimientoItem {
  nro_sicop: string;
  numero_procedimiento: string;
  descripcion: string;
  ced_institucion: string;
  institucion: string;
  tipo_procedimiento: string;
  modalidad: string;
  periodo: number;
  lineas: number;
  monto_crc: number;
  invitados: number;
}

export interface ParametrosProcedimientos {
  buscar?: string;
  institucion?: string;
  desde?: number;
  hasta?: number;
  page?: number;
  page_size?: number;
}

/**
 * Detalle de un procedimiento. El backend no documenta la forma exacta más
 * allá de ser un superconjunto de ProcedimientoItem; se modela como tal con
 * campos adicionales abiertos para no inventar estructura no confirmada.
 */
export interface DetalleProcedimiento extends ProcedimientoItem {
  [clave: string]: unknown;
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export interface ParametrosUsuariosAdmin {
  page?: number;
  page_size?: number;
  buscar?: string;
}

export interface CrearUsuarioRequest {
  email: string;
  nombre: string;
  organizacion?: string;
  perfil_codigo: string;
  password?: string;
}

export interface CrearUsuarioResponse {
  usuario: Usuario;
  password_temporal: string | null;
}

export interface ActualizarUsuarioRequest {
  nombre?: string;
  organizacion?: string;
  perfil_codigo?: string;
  activo?: boolean;
}

export interface CargaEtl {
  [clave: string]: unknown;
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** Forma del cuerpo de error devuelto por FastAPI. */
export interface ErrorApi {
  detail: string;
}
