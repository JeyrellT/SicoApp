/**
 * SICOP Analytics - Pantalla de ingreso.
 *
 * Formulario de correo/contraseña. Si el usuario tiene debe_cambiar_password
 * en true, se muestra el formulario de cambio obligatorio antes de dar
 * acceso a la app.
 *
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/cliente';
import './LoginScreen.css';

/** Traduce errores comunes del backend a mensajes en español de Costa Rica. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Correo o contraseña incorrectos.';
    if (error.status === 429) return 'Demasiados intentos. Espere un momento e intente de nuevo.';
    if (error.detalle) return error.detalle;
  }
  return 'No se pudo conectar con el servidor. Intente de nuevo.';
}

export const LoginScreen: React.FC = () => {
  const { login, usuario, cambiarPassword, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarSubmitLogin = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  // Si el login ya trajo un usuario que debe cambiar la contraseña, se
  // bloquea el paso hacia la app con el formulario obligatorio.
  if (usuario?.debe_cambiar_password) {
    return <FormularioCambioObligatorio onCancelar={logout} onCambiar={cambiarPassword} />;
  }

  return (
    <div className="login-pantalla">
      <div className="login-fondo" aria-hidden="true" />
      <div className="login-tarjeta">
        <div className="login-encabezado">
          <div className="login-logo">
            <ShieldCheck size={28} />
          </div>
          <h1>SICOP Analytics</h1>
          <p>Ingresá con tu correo institucional para continuar</p>
        </div>

        <form className="login-formulario" onSubmit={manejarSubmitLogin} noValidate>
          <label className="login-campo">
            <span className="login-etiqueta">Correo electrónico</span>
            <div className="login-input-envoltorio">
              <Mail size={18} className="login-icono" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@institucion.go.cr"
                disabled={enviando}
              />
            </div>
          </label>

          <label className="login-campo">
            <span className="login-etiqueta">Contraseña</span>
            <div className="login-input-envoltorio">
              <Lock size={18} className="login-icono" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={enviando}
              />
              <button
                type="button"
                className="login-boton-ojo"
                onClick={() => setMostrarPassword((v) => !v)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="login-boton-submit" disabled={enviando}>
            {enviando ? (
              <span>Ingresando…</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Ingresar</span>
              </>
            )}
          </button>
        </form>

        <p className="login-pie">SICOP Analytics · Saenz Fallas S.A.</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cambio de contraseña obligatorio
// ---------------------------------------------------------------------------

const FormularioCambioObligatorio: React.FC<{
  onCambiar: (body: { password_actual: string; password_nueva: string }) => Promise<void>;
  onCancelar: () => void;
}> = ({ onCambiar, onCancelar }) => {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setError(null);

    if (passwordNueva !== passwordConfirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (passwordNueva.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      await onCambiar({ password_actual: passwordActual, password_nueva: passwordNueva });
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-pantalla">
      <div className="login-fondo" aria-hidden="true" />
      <div className="login-tarjeta">
        <div className="login-encabezado">
          <div className="login-logo">
            <Lock size={28} />
          </div>
          <h1>Cambio de contraseña obligatorio</h1>
          <p>Por seguridad, debés definir una contraseña nueva antes de continuar</p>
        </div>

        <form className="login-formulario" onSubmit={manejarSubmit} noValidate>
          <label className="login-campo">
            <span className="login-etiqueta">Contraseña actual</span>
            <div className="login-input-envoltorio">
              <Lock size={18} className="login-icono" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                disabled={enviando}
              />
            </div>
          </label>

          <label className="login-campo">
            <span className="login-etiqueta">Contraseña nueva</span>
            <div className="login-input-envoltorio">
              <Lock size={18} className="login-icono" />
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                disabled={enviando}
              />
            </div>
          </label>

          <label className="login-campo">
            <span className="login-etiqueta">Confirmar contraseña nueva</span>
            <div className="login-input-envoltorio">
              <Lock size={18} className="login-icono" />
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                disabled={enviando}
              />
            </div>
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="login-boton-submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar y continuar'}
          </button>

          <button
            type="button"
            className="login-boton-secundario"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar y salir
          </button>
        </form>
      </div>
    </div>
  );
};
