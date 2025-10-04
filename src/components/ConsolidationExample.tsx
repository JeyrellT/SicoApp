import React, { useState, useEffect } from 'react';
import { useSicopData } from '../hooks/useSicopData';
import { Download, TrendingUp, Calendar, BarChart2 } from 'lucide-react';

/**
 * Componente de ejemplo que muestra cómo usar los datos consolidados
 */
export const ConsolidationExample: React.FC = () => {
  const { cache, consolidation } = useSicopData();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableOptions();
  }, [cache.metadata]);

  const loadAvailableOptions = async () => {
    try {
      const cacheStats = await cache.getStats();
      setAvailableYears(cacheStats.yearsList || []);
      setAvailableTypes(cacheStats.fileTypes || []);
      
      if (cacheStats.yearsList.length > 0 && !selectedYear) {
        setSelectedYear(Math.max(...cacheStats.yearsList));
      }
      if (cacheStats.fileTypes.length > 0 && !selectedType) {
        setSelectedType(cacheStats.fileTypes[0]);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadStats = async () => {
    if (!selectedYear || !selectedType) return;

    try {
      const consolidatedStats = await consolidation.getStats({
        years: [selectedYear],
        types: [selectedType],
      });
      setStats(consolidatedStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDownload = async () => {
    if (!selectedYear || !selectedType) return;

    try {
      await consolidation.downloadCSV(
        `${selectedType}_${selectedYear}.csv`,
        {
          years: [selectedYear],
          types: [selectedType],
        }
      );
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Error al descargar el archivo');
    }
  };

  const handleConsolidate = async () => {
    await loadStats();
  };

  return (
    <div className="consolidation-example">
      <style>{`
        .consolidation-example {
          max-width: 1000px;
          margin: 0 auto;
          padding: 30px;
        }

        .example-header {
          margin-bottom: 30px;
        }

        .example-title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          margin-bottom: 10px;
        }

        .example-description {
          color: #666;
          line-height: 1.6;
        }

        .filters-section {
          background: white;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-label {
          font-weight: 500;
          color: #555;
        }

        .filter-select {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1em;
          background: white;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .actions-row {
          display: flex;
          gap: 15px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1em;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn-secondary {
          background: #4CAF50;
          color: white;
        }

        .btn-secondary:hover {
          background: #45a049;
        }

        .btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .stats-section {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .stat-icon {
          color: #667eea;
          margin-bottom: 10px;
        }

        .stat-label {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 2em;
          font-weight: 700;
          color: #333;
        }

        .stat-subvalue {
          font-size: 0.85em;
          color: #999;
          margin-top: 5px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .code-example {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
        }

        .code-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
        }

        pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 15px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 0.9em;
          line-height: 1.5;
        }
      `}</style>

      <div className="example-header">
        <h1 className="example-title">Consolidación de Datos - Ejemplo</h1>
        <p className="example-description">
          Este componente muestra cómo usar el sistema de consolidación para analizar
          datos de múltiples archivos CSV organizados por año y mes.
        </p>
      </div>

      <div className="filters-section">
        <h3>Filtros de Consolidación</h3>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Año</label>
            <select
              className="filter-select"
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value="">Seleccionar año</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Tipo de Archivo</label>
            <select
              className="filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Seleccionar tipo</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="actions-row">
          <button
            className="btn btn-primary"
            onClick={handleConsolidate}
            disabled={!selectedYear || !selectedType || consolidation.loading}
          >
            <BarChart2 size={20} />
            {consolidation.loading ? 'Consolidando...' : 'Consolidar Datos'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={!selectedYear || !selectedType || consolidation.loading}
          >
            <Download size={20} />
            Descargar CSV
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-section">
          <h3>Resultados de la Consolidación</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <BarChart2 size={24} className="stat-icon" />
              <div className="stat-label">Total de Registros</div>
              <div className="stat-value">{stats.totalRecords.toLocaleString()}</div>
            </div>

            <div className="stat-card">
              <Calendar size={24} className="stat-icon" />
              <div className="stat-label">Archivos Incluidos</div>
              <div className="stat-value">{stats.filesIncluded}</div>
            </div>

            <div className="stat-card">
              <TrendingUp size={24} className="stat-icon" />
              <div className="stat-label">Rango de Años</div>
              <div className="stat-value">{stats.yearRange}</div>
            </div>

            <div className="stat-card">
              <Download size={24} className="stat-icon" />
              <div className="stat-label">Tamaño</div>
              <div className="stat-value">{stats.sizeInMB} MB</div>
            </div>
          </div>
        </div>
      )}

      {!stats && (
        <div className="empty-state">
          <BarChart2 size={64} style={{ margin: '0 auto 20px', color: '#ddd' }} />
          <h3>Sin datos consolidados</h3>
          <p>Selecciona filtros y haz clic en "Consolidar Datos" para ver estadísticas</p>
        </div>
      )}

      <div className="code-example">
        <h3 className="code-title">Ejemplo de Código</h3>
        <pre>{`// Usar el hook useSicopData
const { cache, consolidation } = useSicopData();

// Consolidar datos de un año y tipo específico
const result = await consolidation.consolidate({
  years: [${selectedYear || '2024'}],
  types: ['${selectedType || 'Contratos'}'],
});

console.log('Total de registros:', result.metadata.totalRecords);
console.log('Archivos incluidos:', result.metadata.filesIncluded);

// Descargar como CSV
await consolidation.downloadCSV('reporte.csv', {
  years: [${selectedYear || '2024'}],
  types: ['${selectedType || 'Contratos'}'],
});`}</pre>
      </div>
    </div>
  );
};
