/**
 * SICOP Analytics - Contexto de autenticación.
 *
 * Provee al árbol de la app: usuario actual, perfil, estado de carga y las
 * acciones login/logout/cambiarPassword/tienePermiso.
 *
 * Al montar, si hay un access token guardado, valida la sesión contra
 * GET /v1/auth/yo. Si el token venció pero hay refresh token, el propio
 * cliente HTTP (src/api/cliente.ts) se encarga de renovarlo de forma
 * transparente ante el primer 401.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  EVENTO_SESION_EXPIRADA,
  guardarTokens,
  limpiarTokens,
  obtenerAccessToken,
  obtenerRefreshToken,
} from '../api/cliente';
import {
  cambiarPassword as apiCambiarPassword,
  login as apiLogin,
  logout as apiLogout,
  obtenerUsuarioActual,
} from '../api/endpoints';
import type { CambiarPasswordRequest, Perfil, Usuario } from '../api/tipos';

export interface ContextoAuth {
  usuario: Usuario | null;
  perfil: Perfil | null;
  cargando: boolean;
  estaAutenticado: boolean;
  /** Devuelve el usuario autenticado, o lanza el error del backend si las credenciales son inválidas. */
  login: (email: string, password: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  cambiarPassword: (body: CambiarPasswordRequest) => Promise<void>;
  /** true si el perfil del usuario incluye el permiso indicado. */
  tienePermiso: (permiso: string) => boolean;
  /** Refresca los datos del usuario actual contra el backend (por ej. tras cambiar password). */
  refrescarUsuario: () => Promise<void>;
}

const AuthContext = createContext<ContextoAuth | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const cerrarSesionLocal = useCallback(() => {
    limpiarTokens();
    setUsuario(null);
  }, []);

  // Validación inicial de sesión al montar la app.
  useEffect(() => {
    let cancelado = false;

    async function validarSesion() {
      const token = obtenerAccessToken();
      if (!token) {
        setCargando(false);
        return;
      }
      try {
        const datosUsuario = await obtenerUsuarioActual();
        if (!cancelado) {
          setUsuario(datosUsuario);
        }
      } catch {
        // El cliente HTTP ya limpió los tokens y disparó sicop:sesion-expirada
        // si el refresh también falló. Si llegó otro tipo de error, igual
        // dejamos la sesión como no autenticada.
        if (!cancelado) {
          setUsuario(null);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    validarSesion();
    return () => {
      cancelado = true;
    };
  }, []);

  // Escucha el evento emitido por el cliente HTTP cuando un refresh falla.
  useEffect(() => {
    const manejador = () => setUsuario(null);
    window.addEventListener(EVENTO_SESION_EXPIRADA, manejador);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, manejador);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Usuario> => {
    const respuesta = await apiLogin({ email, password });
    guardarTokens(respuesta.access_token, respuesta.refresh_token);
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = obtenerRefreshToken();
    try {
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } finally {
      cerrarSesionLocal();
    }
  }, [cerrarSesionLocal]);

  const cambiarPassword = useCallback(async (body: CambiarPasswordRequest) => {
    await apiCambiarPassword(body);
    // La contraseña cambió correctamente: refrescamos el usuario para que
    // debe_cambiar_password quede en false.
    const datosUsuario = await obtenerUsuarioActual();
    setUsuario(datosUsuario);
  }, []);

  const refrescarUsuario = useCallback(async () => {
    const datosUsuario = await obtenerUsuarioActual();
    setUsuario(datosUsuario);
  }, []);

  const tienePermiso = useCallback(
    (permiso: string) => usuario?.perfil.permisos.includes(permiso) ?? false,
    [usuario]
  );

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      perfil: usuario?.perfil ?? null,
      cargando,
      estaAutenticado: usuario !== null,
      login,
      logout,
      cambiarPassword,
      tienePermiso,
      refrescarUsuario,
    }),
    [usuario, cargando, login, logout, cambiarPassword, tienePermiso, refrescarUsuario]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}
