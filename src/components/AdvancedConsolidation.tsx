import React, { useState } from 'react';
import { Settings, Filter, Download, TrendingUp } from 'lucide-react';
import { useDataConsolidation } from '../hooks/useSicopData';

interface ConsolidationFilters {
  years: number[];
  months: number[];
  types: string[];
  deduplicateBy: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const CSV_TYPES = [
  'Contratos', 'Proveedores_unido', 'LineasContratadas', 'LineasAdjudicadas',
  'Ofertas', 'ProcedimientoAdjudicacion', 'InstitucionesRegistradas'
];

export const AdvancedConsolidation: React.FC = () => {
  const { consolidate, downloadCSV, loading } = useDataConsolidation();
  
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<ConsolidationFilters>({
    years: [currentYear],
    months: [],
    types: [],
    deduplicateBy: '',
    sortBy: '',
    sortOrder: 'asc',
  });

  const [result, setResult] = useState<any>(null);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  const handleYearToggle = (year: number) => {
    setFilters(prev => ({
      ...prev,
      years: prev.years.includes(year)
        ? prev.years.filter(y => y !== year)
        : [...prev.years, year],
    }));
  };

  const handleMonthToggle = (month: number) => {
    setFilters(prev => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month],
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  };

  const handleConsolidate = async () => {
    try {
      const options: any = {};
      
      if (filters.years.length > 0) options.years = filters.years;
      if (filters.months.length > 0) options.months = filters.months;
      if (filters.types.length > 0) options.types = filters.types;
      if (filters.deduplicateBy) options.deduplicateBy = filters.deduplicateBy;
      if (filters.sortBy) {
        options.sortBy = filters.sortBy;
        options.sortOrder = filters.sortOrder;
      }

      const consolidatedData = await consolidate(options);
      setResult(consolidatedData);
    } catch (error) {
      console.error('Error consolidating:', error);
      alert('Error al consolidar datos');
    }
  };

  const handleDownload = async () => {
    try {
      const options: any = {};
      
      if (filters.years.length > 0) options.years = filters.years;
      if (filters.months.length > 0) options.months = filters.months;
      if (filters.types.length > 0) options.types = filters.types;

      const fileName = `consolidado_${filters.years.join('-')}_${Date.now()}.csv`;
      await downloadCSV(fileName, options);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Error al descargar archivo');
    }
  };

  return (
    <div className="advanced-consolidation">
      <style>{`
        .advanced-consolidation {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;
        }

        .page-title {
          font-size: 2em;
          font-weight: 700;
          color: #333;
        }

        .filters-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 30px;
        }

        .filters-panel {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .filter-section {
          margin-bottom: 25px;
        }

        .filter-section:last-child {
          margin-bottom: 0;
        }

        .filter-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .checkbox-item:hover {
          background: #f5f5f5;
        }

        .checkbox-input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label {
          flex: 1;
          cursor: pointer;
          user-select: none;
        }

        .input-field {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95em;
          margin-top: 8px;
        }

        .input-field:focus {
          outline: none;
          border-color: #667eea;
        }

        .select-field {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95em;
          margin-top: 8px;
          background: white;
        }

        .select-field:focus {
          outline: none;
          border-color: #667eea;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 25px;
        }

        .btn {
          width: 100%;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 1em;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-secondary {
          background: #4CAF50;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #45a049;
        }

        .btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .results-panel {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }

        .results-title {
          font-size: 1.3em;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }

        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 2em;
          font-weight: 700;
        }

        .stat-subvalue {
          font-size: 0.85em;
          opacity: 0.8;
          margin-top: 5px;
        }

        .empty-results {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #667eea;
          color: white;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: 500;
        }
      `}</style>

      <div className="page-header">
        <Settings size={32} color="#667eea" />
        <h1 className="page-title">Consolidación Avanzada</h1>
      </div>

      <div className="filters-container">
        <div className="filters-panel">
          <div className="filter-section">
            <div className="filter-title">
              <Filter size={18} />
              Años
            </div>
            <div className="checkbox-group">
              {years.map(year => (
                <label key={year} className="checkbox-item">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={filters.years.includes(year)}
                    onChange={() => handleYearToggle(year)}
                  />
                  <span className="checkbox-label">{year}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">Meses</div>
            <div className="checkbox-group">
              {months.map(month => (
                <label key={month.value} className="checkbox-item">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={filters.months.includes(month.value)}
                    onChange={() => handleMonthToggle(month.value)}
                  />
                  <span className="checkbox-label">{month.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">Tipos de Archivo</div>
            <div className="checkbox-group">
              {CSV_TYPES.map(type => (
                <label key={type} className="checkbox-item">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={filters.types.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                  />
                  <span className="checkbox-label">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">Deduplicar por campo</div>
            <input
              type="text"
              className="input-field"
              placeholder="ej: id, codigo, etc."
              value={filters.deduplicateBy}
              onChange={(e) => setFilters(prev => ({ ...prev, deduplicateBy: e.target.value }))}
            />
          </div>

          <div className="filter-section">
            <div className="filter-title">Ordenar por</div>
            <input
              type="text"
              className="input-field"
              placeholder="Nombre del campo"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            />
            <select
              className="select-field"
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleConsolidate}
              disabled={loading || filters.years.length === 0}
            >
              <TrendingUp size={18} />
              {loading ? 'Consolidando...' : 'Consolidar'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={loading || filters.years.length === 0}
            >
              <Download size={18} />
              Descargar CSV
            </button>
          </div>
        </div>

        <div className="results-panel">
          {result ? (
            <>
              <div className="results-header">
                <div className="results-title">
                  <TrendingUp size={24} />
                  Resultados
                </div>
                <span className="badge">
                  {result.metadata.filesIncluded} archivos
                </span>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total de Registros</div>
                  <div className="stat-value">
                    {result.metadata.totalRecords.toLocaleString()}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Rango de Años</div>
                  <div className="stat-value">
                    {result.metadata.yearRange.min} - {result.metadata.yearRange.max}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Rango de Meses</div>
                  <div className="stat-value">
                    {result.metadata.monthRange.min} - {result.metadata.monthRange.max}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Tipos Incluidos</div>
                  <div className="stat-value">{result.metadata.types.length}</div>
                  <div className="stat-subvalue">
                    {result.metadata.types.join(', ')}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-results">
              <Filter size={64} style={{ margin: '0 auto 20px', color: '#ddd' }} />
              <h3>Sin resultados</h3>
              <p>Selecciona filtros y haz clic en "Consolidar" para ver los resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
