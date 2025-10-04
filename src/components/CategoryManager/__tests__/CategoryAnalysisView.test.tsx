import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import CategoryAnalysisView from '../CategoryAnalysisView';

jest.mock('../../../context/SicopContext', () => ({
  useSicop: () => ({
    isLoaded: true
  })
}));

const mockOverview = {
  totalLineas: 1,
  totalMonto: 1000,
  cobertura: 100,
  categorias: [
    {
      categoria: 'Tecnología y sistemas',
      totalLineas: 1,
      porcentaje: 100,
      montoTotal: 1000,
      ejemplos: [
        {
          numeroCartel: '2025-001',
          descripcionLinea: 'Servicio de mantenimiento de servidores',
          presupuestoLinea: 1000,
          codigoInstitucion: '123',
          palabrasCoincidentes: ['servicio']
        }
      ],
      instituciones: [],
      tendenciaMensual: []
    }
  ],
  sinCategorizar: {
    lineas: 0,
    ejemplos: []
  }
};

const analyzeMock = jest.fn().mockReturnValue(mockOverview);

jest.mock('../../../services/CategoryAnalysisService', () => ({
  CategoryAnalysisService: {
    analyzeSystemCategories: analyzeMock
  }
}));

describe('CategoryAnalysisView auto-refresh', () => {
  beforeEach(() => {
    analyzeMock.mockClear();
  });

  it('re-executes analysis when category configuration or manual categories change', async () => {
    render(<CategoryAnalysisView />);

    // Initial run on mount
    expect(analyzeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('categoryConfigurationUpdated'));
    });

    await waitFor(() => {
      expect(analyzeMock).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      window.dispatchEvent(new Event('manualCategoriesUpdated'));
    });

    await waitFor(() => {
      expect(analyzeMock).toHaveBeenCalledTimes(3);
    });
  });
});
