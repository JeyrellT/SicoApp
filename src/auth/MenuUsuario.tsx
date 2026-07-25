/**
 * SICOP Analytics - Menú de usuario (esquina superior).
 *
 * Muestra nombre y perfil del usuario autenticado, con opciones para
 * cambiar contraseña y cerrar sesión. Sin CSS externo: usa estilos en
 * línea con la misma paleta indigo/violeta del resto de la app para
 * mantenerse liviano y fácil de insertar en cualquier layout existente.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/cliente';

const estilos: Record<string, React.CSSProperties> = {
  contenedor: {
    position: 'relative',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
  },
  botonDisparador: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    borderRadius: 999,
    padding: '6px 14px 6px 6px',
    cursor: 'pointer',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  textoUsuario: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: 1.2,
  },
  nombre: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  perfil: {
    fontSize: 11,
    color: '#64748b',
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 260,
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 20px 40px -20px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.06)',
    zIndex: 50,
    overflow: 'hidden',
  },
  panelEncabezado: {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  panelNombre: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#1e293b',
  },
  panelCorreo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  panelInsignia: {
    display: 'inline-block',
    marginTop: 8,
    fontSize: 10.5,
    fontWeight: 600,
    color: '#4338ca',
    background: 'rgba(102, 126, 234, 0.12)',
    borderRadius: 999,
    padding: '2px 8px',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  opcion: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    border: 'none',
    background: 'transparent',
    padding: '11px 16px',
    fontSize: 13,
    color: '#334155',
    cursor: 'pointer',
    textAlign: 'left',
  },
  opcionPeligro: {
    color: '#dc2626',
  },
};

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export const MenuUsuario: React.FC<{ onCambiarPassword?: () => void }> = ({
  onCambiarPassword,
}) => {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera);
    return () => document.removeEventListener('mousedown', alHacerClicFuera);
  }, []);

  if (!usuario) return null;

  const manejarLogout = async () => {
    setCerrandoSesion(true);
    try {
      await logout();
    } catch (err) {
      // Aunque el backend falle en revocar el refresh token, la sesión
      // local ya se limpia dentro de logout(); no bloqueamos al usuario.
      if (!(err instanceof ApiError)) {
        console.error('Error inesperado al cerrar sesión', err);
      }
    } finally {
      setCerrandoSesion(false);
      setAbierto(false);
    }
  };

  return (
    <div style={estilos.contenedor} ref={contenedorRef}>
      <button
        type="button"
        style={estilos.botonDisparador}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span style={estilos.avatar}>{inicialesDe(usuario.nombre)}</span>
        <span style={estilos.textoUsuario}>
          <span style={estilos.nombre}>{usuario.nombre}</span>
          <span style={estilos.perfil}>{usuario.perfil.nombre}</span>
        </span>
        <ChevronDown size={16} color="#94a3b8" />
      </button>

      {abierto && (
        <div style={estilos.panel} role="menu">
          <div style={estilos.panelEncabezado}>
            <div style={estilos.panelNombre}>{usuario.nombre}</div>
            <div style={estilos.panelCorreo}>{usuario.email}</div>
            <span style={estilos.panelInsignia}>{usuario.perfil.codigo}</span>
          </div>

          {onCambiarPassword && (
            <button
              type="button"
              style={estilos.opcion}
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                onCambiarPassword();
              }}
            >
              <KeyRound size={16} />
              Cambiar contraseña
            </button>
          )}

          <button
            type="button"
            style={{ ...estilos.opcion, ...estilos.opcionPeligro }}
            role="menuitem"
            onClick={manejarLogout}
            disabled={cerrandoSesion}
          >
            <LogOut size={16} />
            {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
};

/** Ícono de respaldo simple para usar como avatar cuando no hay nombre disponible. */
export const IconoUsuarioGenerico: React.FC = () => <User size={18} />;
