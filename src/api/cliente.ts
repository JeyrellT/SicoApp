/**
 * SICOP Analytics - Cliente HTTP para la API backend.
 *
 * Wrapper sobre fetch que agrega:
 *  - Base URL configurable vía REACT_APP_API_URL.
 *  - Inyección automática del header Authorization.
 *  - Refresh automático del access token ante un 401, con cola de
 *    peticiones concurrentes para evitar disparar múltiples refresh.
 *  - Errores tipados (ApiError) con helpers de clasificación.
 *  - Serialización de query params (omite undefined/null).
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import type { LoginResponse } from './tipos';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const CLAVE_ACCESS_TOKEN = 'sicop_access';
export const CLAVE_REFRESH_TOKEN = 'sicop_refresh';

/** Evento disparado en window cuando la sesión no pudo renovarse. */
export const EVENTO_SESION_EXPIRADA = 'sicop:sesion-expirada';

// ---------------------------------------------------------------------------
// Error tipado
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly status: number;
  readonly detalle: string;

  constructor(status: number, detalle: string) {
    super(detalle || `Error de API (status ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.detalle = detalle;
  }

  /** true si el backend respondió 403 (perfil sin el permiso requerido). */
  esPermisoDenegado(): boolean {
    return this.status === 403;
  }

  /** true si el backend respondió 401 (sin sesión o token vencido). */
  esNoAutenticado(): boolean {
    return this.status === 401;
  }

  /** true si el backend respondió 429 (límite de tasa excedido). */
  esLimiteTasa(): boolean {
    return this.status === 429;
  }
}

// ---------------------------------------------------------------------------
// Manejo de tokens
// ---------------------------------------------------------------------------

export function obtenerAccessToken(): string | null {
  return localStorage.getItem(CLAVE_ACCESS_TOKEN);
}

export function obtenerRefreshToken(): string | null {
  return localStorage.getItem(CLAVE_REFRESH_TOKEN);
}

export function guardarTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(CLAVE_ACCESS_TOKEN, accessToken);
  localStorage.setItem(CLAVE_REFRESH_TOKEN, refreshToken);
}

export function limpiarTokens(): void {
  localStorage.removeItem(CLAVE_ACCESS_TOKEN);
  localStorage.removeItem(CLAVE_REFRESH_TOKEN);
}

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

/** Forma documental de un objeto de query params (valores primitivos). */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * El tipo del parámetro se declara como `object` en vez de `QueryParams`
 * (que tiene índice de tipo `string` explícito) porque TypeScript exige
 * que el argumento tenga también un índice explícito para ser asignable a
 * un `Record<string, X>` — cosa que las interfaces del contrato (RangoPeriodo,
 * ParametrosCatalogo, etc.) no tienen. `object` no impone esa restricción y
 * `Object.entries` funciona igual en runtime.
 */
function serializarQuery(params?: object): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null) continue;
    usp.append(clave, String(valor));
  }
  const cadena = usp.toString();
  return cadena ? `?${cadena}` : '';
}

// ---------------------------------------------------------------------------
// Cola de refresh: evita que múltiples 401 concurrentes disparen múltiples
// refresh simultáneos. Todas las peticiones que lleguen mientras un refresh
// está en curso esperan la misma promesa.
// ---------------------------------------------------------------------------

let promesaRefreshEnCurso: Promise<string> | null = null;

async function refrescarAccessToken(): Promise<string> {
  if (promesaRefreshEnCurso) {
    return promesaRefreshEnCurso;
  }

  promesaRefreshEnCurso = (async () => {
    const refreshToken = obtenerRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, 'No hay sesión activa');
    }

    const respuesta = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!respuesta.ok) {
      throw new ApiError(respuesta.status, 'No se pudo renovar la sesión');
    }

    const datos: LoginResponse = await respuesta.json();
    guardarTokens(datos.access_token, datos.refresh_token);
    return datos.access_token;
  })();

  try {
    return await promesaRefreshEnCurso;
  } finally {
    promesaRefreshEnCurso = null;
  }
}

/** Limpia la sesión y notifica al resto de la app que expiró. */
function manejarSesionExpirada(): void {
  limpiarTokens();
  window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA));
}

// ---------------------------------------------------------------------------
// Petición central
// ---------------------------------------------------------------------------

export interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: object;
  signal?: AbortSignal;
  /** Si es true, no se envía el header Authorization (endpoints públicos). */
  publico?: boolean;
}

async function construirRespuestaError(respuesta: Response): Promise<ApiError> {
  let detalle = respuesta.statusText;
  try {
    const cuerpo = await respuesta.json();
    if (cuerpo && typeof cuerpo.detail === 'string') {
      detalle = cuerpo.detail;
    }
  } catch {
    // El cuerpo no era JSON válido; se conserva el statusText.
  }
  return new ApiError(respuesta.status, detalle);
}

async function ejecutarFetch(
  ruta: string,
  opciones: OpcionesPeticion,
  reintentoTrasRefresh = false
): Promise<Response> {
  const { method = 'GET', body, params, signal, publico = false } = opciones;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (!publico) {
    const token = obtenerAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const respuesta = await fetch(`${BASE_URL}${ruta}${serializarQuery(params)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // Reintento único tras un refresh exitoso; nunca para endpoints públicos
  // ni para el propio endpoint de refresh (evita loops).
  if (
    respuesta.status === 401 &&
    !publico &&
    !reintentoTrasRefresh &&
    obtenerRefreshToken() &&
    !ruta.startsWith('/v1/auth/refresh')
  ) {
    try {
      await refrescarAccessToken();
    } catch {
      manejarSesionExpirada();
      throw new ApiError(401, 'La sesión expiró. Iniciá sesión de nuevo.');
    }
    return ejecutarFetch(ruta, opciones, true);
  }

  if (respuesta.status === 401 && !publico) {
    manejarSesionExpirada();
  }

  return respuesta;
}

/**
 * Realiza una petición a la API y devuelve el cuerpo ya parseado como JSON.
 * Lanza ApiError si la respuesta no es 2xx.
 */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const respuesta = await ejecutarFetch(ruta, opciones);

  if (!respuesta.ok) {
    throw await construirRespuestaError(respuesta);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  return (await respuesta.json()) as T;
}

export const clienteApi = {
  get: <T>(ruta: string, params?: object, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'GET', params, signal }),
  getPublico: <T>(ruta: string, params?: object, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'GET', params, signal, publico: true }),
  post: <T>(ruta: string, body?: unknown, params?: object, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'POST', body, params, signal }),
  postPublico: <T>(ruta: string, body?: unknown, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'POST', body, signal, publico: true }),
  put: <T>(ruta: string, body?: unknown, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'PUT', body, signal }),
  patch: <T>(ruta: string, body?: unknown, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'PATCH', body, signal }),
  delete: <T>(ruta: string, signal?: AbortSignal) =>
    peticion<T>(ruta, { method: 'DELETE', signal }),
};
