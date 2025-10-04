import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./services/DataLoaderService', () => ({
  dataLoaderService: {
    hasDataInCache: jest.fn().mockResolvedValue(false),
    getCacheStats: jest.fn().mockResolvedValue({
      totalFiles: 0,
      totalRecords: 0,
      years: [],
      types: []
    }),
    loadDataFromCache: jest.fn().mockResolvedValue(undefined)
  }
}));

test('renders welcome screen with primary actions', async () => {
  render(<App />);

  expect(await screen.findByText(/Sistema de Análisis SICOP/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /¿Qué deseas hacer\?/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Ir a Gestión de Datos/i })).toBeInTheDocument();
});
