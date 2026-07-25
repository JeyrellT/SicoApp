import { render, screen } from '@testing-library/react';
import App from './App';
import { QueryProvider } from './api/QueryProvider';
import { AuthProvider } from './auth/AuthContext';

beforeEach(() => {
  // Sin backend disponible en el entorno de pruebas: se evita que las
  // queries (GET /salud/datos, GET /v1/auth/yo) intenten red real.
  global.fetch = jest.fn(() => Promise.reject(new Error('red deshabilitada en pruebas')));
  window.localStorage.clear();
});

function renderApp() {
  return render(
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  );
}

test('sin sesión activa, muestra la pantalla de ingreso', async () => {
  renderApp();

  expect(await screen.findByRole('heading', { name: /SICOP Analytics/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
});
