import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoryAnalysisView from '../CategoryAnalysisView';
import { CategoryService } from '../../../services/CategoryService';

// IMPORTANTE: jest.mock() se eleva (hoist) al inicio del módulo, antes de
// cualquier import. Por eso las variables que usa la fábrica deben llamarse
// mock* (convención que Jest reconoce y excluye del chequeo de "no se puede
// referenciar una variable fuera de alcance").
const mockUseCategorias = jest.fn();
const mockUseResumen = jest.fn();
const mockUseFiltros = jest.fn();

jest.mock('../../../hooks/api', () => ({
  useCategorias: (...args: unknown[]) => mockUseCategorias(...args),
  useResumen: (...args: unknown[]) => mockUseResumen(...args),
  useFiltros: (...args: unknown[]) => mockUseFiltros(...args)
}));

const mockCategoriasData = [
  {
    objeto_gasto: '1.08.99',
    lineas: 120,
    monto_crc: 5_000_000,
    monto_usd: 9000,
    proveedores_distintos: 15,
    participacion_pct: 42.5
  },
  {
    objeto_gasto: '2.03.01',
    lineas: 80,
    monto_crc: 2_500_000,
    monto_usd: 4200,
    proveedores_distintos: 9,
    participacion_pct: 21.3
  }
];

const mockResumenData = {
  periodo_desde: 202401,
  periodo_hasta: 202412,
  procedimientos: 300,
  lineas_adjudicadas: 1000,
  monto_crc: 50_000_000,
  monto_usd: 90000,
  instituciones: 40,
  proveedores: 120,
  ofertas: 900,
  ordenes: 250,
  monto_ordenes_crc: 40_000_000,
  invitaciones: 500,
  monto_promedio_crc: 50000,
  variacion_monto_pct: 3.2
};

function mockHooksOk() {
  mockUseCategorias.mockReturnValue({
    data: mockCategoriasData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  });
  mockUseResumen.mockReturnValue({
    data: mockResumenData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  });
  mockUseFiltros.mockReturnValue({ data: undefined, isLoading: false, isError: false });
}

describe('CategoryAnalysisView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consulta la API a través de los hooks de dashboard (useCategorias, useResumen, useFiltros)', async () => {
    mockHooksOk();

    render(<CategoryAnalysisView />);

    expect(mockUseCategorias).toHaveBeenCalled();
    expect(mockUseResumen).toHaveBeenCalled();
    expect(mockUseFiltros).toHaveBeenCalled();

    // Deja que se resuelva la carga (async) de reglas/configuración desde
    // CategoryService antes de terminar el test.
    await waitFor(() => expect(screen.getByText('1.08.99')).toBeInTheDocument());
  });

  it('muestra un estado de carga mientras las consultas están en curso', async () => {
    mockUseCategorias.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    mockUseResumen.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    mockUseFiltros.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<CategoryAnalysisView />);

    await waitFor(() => expect(screen.getByText(/Cargando categorías desde el servidor/i)).toBeInTheDocument());
  });

  it('muestra un estado de error con opción de reintentar cuando falla la API', async () => {
    const refetchCategorias = jest.fn();
    const refetchResumen = jest.fn();

    mockUseCategorias.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('fallo de red'),
      refetch: refetchCategorias
    });
    mockUseResumen.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchResumen
    });
    mockUseFiltros.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<CategoryAnalysisView />);

    await waitFor(() => expect(screen.getByText(/No se pudieron cargar las categorías/i)).toBeInTheDocument());
    expect(screen.getByText('fallo de red')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    expect(refetchCategorias).toHaveBeenCalledTimes(1);
    expect(refetchResumen).toHaveBeenCalledTimes(1);
  });

  it('muestra un estado vacío cuando el backend no devuelve categorías', async () => {
    mockUseCategorias.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
    mockUseResumen.mockReturnValue({
      data: mockResumenData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    });
    mockUseFiltros.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<CategoryAnalysisView />);

    await waitFor(() => expect(screen.getByText(/No hay datos de categorías disponibles/i)).toBeInTheDocument());
  });

  it('vuelve a leer las reglas manuales cuando se disparan categoryConfigurationUpdated y manualCategoriesUpdated', async () => {
    mockHooksOk();
    const spyGetAllRules = jest.spyOn(CategoryService, 'getAllRules');

    render(<CategoryAnalysisView />);

    await waitFor(() => expect(spyGetAllRules).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(new Event('categoryConfigurationUpdated'));
    });
    await waitFor(() => expect(spyGetAllRules).toHaveBeenCalledTimes(2));

    await act(async () => {
      window.dispatchEvent(new Event('manualCategoriesUpdated'));
    });
    await waitFor(() => expect(spyGetAllRules).toHaveBeenCalledTimes(3));
  });

  it('agrupa una categoría bajo el nombre de una regla manual activa que coincide con el objeto de gasto', async () => {
    mockHooksOk();

    localStorage.setItem(
      'sicop.manualCategories.v1',
      JSON.stringify([
        {
          id: 'regla-1',
          nombre: 'Tecnología',
          palabrasClave: ['1.08'],
          instituciones: [],
          activo: true,
          color: '#3b82f6'
        }
      ])
    );

    render(<CategoryAnalysisView />);

    expect(await screen.findByText('Tecnología')).toBeInTheDocument();
    expect(screen.getByText('2.03.01')).toBeInTheDocument();
  });
});
