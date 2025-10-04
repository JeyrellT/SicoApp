import React, { useState, useEffect } from 'react';
import { 
  Table, 
  BarChart3, 
  Info,
  CheckCircle,
  AlertTriangle,
  Database,
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  Filter
} from 'lucide-react';
import { schemaAnalysisService } from '../services/SchemaAnalysisService';
import type { FileSchemaAnalysis, ColumnInfo, DataType } from '../services/SchemaAnalysisService';
import { cacheService } from '../services/CacheService';

interface SchemaAnalysisPanelProps {
  tableName?: string; // Si se proporciona, muestra solo esa tabla
  onClose?: () => void;
}

export const SchemaAnalysisPanel: React.FC<SchemaAnalysisPanelProps> = ({ tableName, onClose }) => {
  const [analyses, setAnalyses] = useState<FileSchemaAnalysis[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileSchemaAnalysis | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<ColumnInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros de fecha
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableDates();
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [tableName, selectedYear, selectedMonth]);

  const loadAvailableDates = async () => {
    try {
      const stats = await cacheService.getCacheStats();
      const years = stats.yearsList.map(y => String(y)).sort((a, b) => Number(b) - Number(a));
      setAvailableYears(years);
      
      // Meses del 1 al 12
      const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
      setAvailableMonths(months);
    } catch (error) {
      console.error('Error cargando fechas disponibles:', error);
    }
  };

  const loadAnalyses = async () => {
    setLoading(true);
    try {
      const allAnalyses = await schemaAnalysisService.analyzeAllFiles(
        selectedYear ? Number(selectedYear) : undefined,
        selectedMonth ? Number(selectedMonth) : undefined
      );
      
      if (tableName) {
        const filtered = allAnalyses.filter(a => a.tableName === tableName);
        setAnalyses(filtered);
        if (filtered.length > 0) setSelectedFile(filtered[0]);
      } else {
        setAnalyses(allAnalyses);
      }
    } catch (error) {
      console.error('Error cargando análisis de schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
  };

  const getMonthName = (month: string): string => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthNum = parseInt(month, 10);
    return monthNames[monthNum - 1] || month;
  };

  const getDataTypeIcon = (type: DataType) => {
    const icons: Record<DataType, string> = {
      'string': '📝',
      'number': '🔢',
      'date': '📅',
      'boolean': '☑️',
      'currency': '💰',
      'percentage': '📊',
      'id': '🔑',
      'code': '🏷️',
      'mixed': '🔀',
      'null': '∅',
      'email': '📧',
      'phone': '📞'
    };
    return icons[type] || '❓';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return '#4caf50';
    if (score >= 70) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <div className="schema-analysis-panel loading">
        <Activity className="spinner" size={40} />
        <p>Analizando schemas...</p>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="schema-analysis-panel empty">
        <Database size={48} color="#999" />
        <p>No hay datos para analizar</p>
      </div>
    );
  }

  return (
    <div className="schema-analysis-panel">
      <style>{`
        .schema-analysis-panel {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f7fa;
        }

        .schema-analysis-panel.loading,
        .schema-analysis-panel.empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 20px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .schema-header {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .schema-title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .schema-subtitle {
          color: #666;
          font-size: 0.95em;
        }

        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
        }

        .filters-controls {
          display: flex;
          gap: 15px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.9em;
          font-weight: 500;
          color: #555;
        }

        .filter-select {
          padding: 8px 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 0.95em;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
          min-width: 180px;
        }

        .filter-select:hover:not(:disabled) {
          border-color: #2196f3;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .filter-select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .clear-filters-btn {
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9em;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .clear-filters-btn:hover {
          background: #d32f2f;
        }

        .active-filters {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 0.9em;
        }

        .filter-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 500;
        }

        .schema-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
        }

        .file-list {
          background: white;
          border-radius: 8px;
          padding: 15px;
          overflow-y: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .file-list-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }

        .file-item {
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .file-item:hover {
          background: #f0f4ff;
        }

        .file-item.selected {
          background: #e3f2fd;
          border-color: #2196f3;
        }

        .file-item-name {
          font-weight: 600;
          color: #333;
          font-size: 0.9em;
          margin-bottom: 4px;
        }

        .file-item-stats {
          font-size: 0.8em;
          color: #666;
          display: flex;
          justify-content: space-between;
        }

        .file-item-quality {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
        }

        .quality-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: 600;
          color: white;
        }

        .file-detail {
          background: white;
          border-radius: 8px;
          padding: 20px;
          overflow-y: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .detail-header {
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .detail-title {
          font-size: 1.4em;
          font-weight: 700;
          color: #333;
          margin-bottom: 10px;
        }

        .detail-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .metric-card {
          background: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #2196f3;
        }

        .metric-label {
          font-size: 0.8em;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .metric-value {
          font-size: 1.5em;
          font-weight: 700;
          color: #333;
        }

        .section-title {
          font-size: 1.2em;
          font-weight: 600;
          color: #333;
          margin: 25px 0 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .issues-list {
          margin-bottom: 25px;
        }

        .issue-item {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .issue-item.error {
          background: #ffebee;
          border-left: 4px solid #f44336;
        }

        .issue-item.warning {
          background: #fff3e0;
          border-left: 4px solid #ff9800;
        }

        .issue-item.info {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
        }

        .columns-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 0.9em;
        }

        .columns-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #ddd;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .columns-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }

        .columns-table tr:hover {
          background: #f9fafb;
          cursor: pointer;
        }

        .columns-table tr.selected {
          background: #e3f2fd;
        }

        .column-name {
          font-weight: 600;
          color: #333;
        }

        .column-mapped {
          color: #666;
          font-size: 0.9em;
          font-style: italic;
        }

        .data-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: 500;
          background: #e0e0e0;
          color: #333;
        }

        .completeness-bar {
          width: 100px;
          height: 20px;
          background: #eee;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .completeness-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s;
        }

        .completeness-fill.low {
          background: #f44336;
        }

        .completeness-fill.medium {
          background: #ff9800;
        }

        .column-detail {
          margin-top: 20px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px solid #e0e0e0;
        }

        .column-detail-title {
          font-size: 1.3em;
          font-weight: 700;
          color: #333;
          margin-bottom: 15px;
        }

        .column-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .detail-stat {
          padding: 10px;
          background: white;
          border-radius: 6px;
        }

        .detail-stat-label {
          font-size: 0.8em;
          color: #666;
          margin-bottom: 5px;
        }

        .detail-stat-value {
          font-size: 1.2em;
          font-weight: 600;
          color: #333;
        }

        .sample-values {
          margin-top: 15px;
        }

        .sample-values-title {
          font-size: 1em;
          font-weight: 600;
          color: #333;
          margin-bottom: 10px;
        }

        .sample-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sample-chip {
          padding: 6px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 16px;
          font-size: 0.85em;
          color: #333;
        }

        .top-values-table {
          width: 100%;
          margin-top: 10px;
          font-size: 0.9em;
        }

        .top-values-table th {
          text-align: left;
          padding: 8px;
          background: white;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #ddd;
        }

        .top-values-table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }

        .schema-mapping {
          margin-top: 20px;
          padding: 15px;
          background: #f0f4ff;
          border-radius: 6px;
          border: 1px solid #d0dff5;
        }

        .schema-mapping-title {
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 10px;
        }

        .mapping-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
        }

        .mapping-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85em;
          color: #333;
        }

        .mapping-arrow {
          color: #2196f3;
          font-weight: bold;
        }
      `}</style>

      <div className="schema-header">
        <div className="schema-title">
          <Table size={28} />
          Análisis de Schemas y Datos
        </div>
        <div className="schema-subtitle">
          Inspección detallada de tipos de datos, estadísticas y calidad - Similar a Tableau Prep
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="filters-section">
        <div className="filters-header">
          <Filter size={18} />
          <span>Filtros Temporales</span>
        </div>
        <div className="filters-controls">
          <div className="filter-group">
            <label>
              <Calendar size={16} />
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <Calendar size={16} />
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="filter-select"
              disabled={!selectedYear}
            >
              <option value="">Todos los meses</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          {(selectedYear || selectedMonth) && (
            <button
              onClick={handleClearFilters}
              className="clear-filters-btn"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
        
        {(selectedYear || selectedMonth) && (
          <div className="active-filters">
            <strong>Filtros activos:</strong>
            {selectedYear && <span className="filter-tag">Año: {selectedYear}</span>}
            {selectedMonth && <span className="filter-tag">Mes: {getMonthName(selectedMonth)}</span>}
          </div>
        )}
      </div>

      <div className="schema-layout">
        {/* Lista de archivos */}
        <div className="file-list">
          <div className="file-list-title">Tablas ({analyses.length})</div>
          {analyses.map(analysis => (
            <div
              key={analysis.tableName}
              className={`file-item ${selectedFile?.tableName === analysis.tableName ? 'selected' : ''}`}
              onClick={() => {
                setSelectedFile(analysis);
                setSelectedColumn(null);
              }}
            >
              <div className="file-item-name">{analysis.tableName}</div>
              <div className="file-item-stats">
                <span>📊 {analysis.totalRows.toLocaleString()} filas</span>
                <span>📋 {analysis.totalColumns} cols</span>
              </div>
              <div className="file-item-quality">
                <div 
                  className="quality-badge"
                  style={{ background: getQualityColor(analysis.qualityScore) }}
                >
                  {analysis.qualityScore.toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle del archivo seleccionado */}
        <div className="file-detail">
          {selectedFile ? (
            <>
              <div className="detail-header">
                <div className="detail-title">
                  <FileText size={24} style={{ marginRight: '8px', display: 'inline' }} />
                  {selectedFile.tableName}
                </div>
                <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '5px' }}>
                  Archivo: {selectedFile.originalFileName}
                </div>

                <div className="detail-metrics">
                  <div className="metric-card">
                    <div className="metric-label">Total Registros</div>
                    <div className="metric-value">{selectedFile.totalRows.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Columnas</div>
                    <div className="metric-value">{selectedFile.totalColumns}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Calidad</div>
                    <div className="metric-value" style={{ color: getQualityColor(selectedFile.qualityScore) }}>
                      {selectedFile.qualityScore.toFixed(0)}%
                    </div>
                  </div>
                  {selectedFile.expectedSchema && (
                    <div className="metric-card">
                      <div className="metric-label">Campos Requeridos</div>
                      <div className="metric-value">{selectedFile.expectedSchema.requiredFields.length}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Problemas detectados - Separados por tipo */}
              {selectedFile.issues.length > 0 && (() => {
                const transformations = selectedFile.issues.filter(i => i.severity === 'info');
                const errors = selectedFile.issues.filter(i => i.severity === 'error');
                const warnings = selectedFile.issues.filter(i => i.severity === 'warning');
                
                return (
                  <>
                    {/* Transformaciones Aplicadas (INFO) */}
                    {transformations.length > 0 && (
                      <>
                        <div className="section-title" style={{ color: '#2196f3' }}>
                          <CheckCircle size={20} />
                          Transformaciones Aplicadas ({transformations.length})
                        </div>
                        <div className="issues-list">
                          {transformations.map((issue, idx) => (
                            <div key={idx} className="issue-item info">
                              <CheckCircle size={18} color="#2196f3" />
                              <div>{issue.message}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Problemas Críticos (ERROR) */}
                    {errors.length > 0 && (
                      <>
                        <div className="section-title" style={{ color: '#f44336' }}>
                          <AlertTriangle size={20} />
                          Problemas Críticos ({errors.length})
                        </div>
                        <div className="issues-list">
                          {errors.map((issue, idx) => (
                            <div key={idx} className="issue-item error">
                              <AlertTriangle size={18} color="#f44336" />
                              <div>
                                {issue.message}
                                {issue.column && <span style={{ color: '#666' }}> (columna: {issue.column})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Advertencias (WARNING) */}
                    {warnings.length > 0 && (
                      <>
                        <div className="section-title" style={{ color: '#ff9800' }}>
                          <AlertTriangle size={20} />
                          Advertencias ({warnings.length})
                        </div>
                        <div className="issues-list">
                          {warnings.map((issue, idx) => (
                            <div key={idx} className="issue-item warning">
                              <AlertTriangle size={18} color="#ff9800" />
                              <div>
                                {issue.message}
                                {issue.column && <span style={{ color: '#666' }}> (columna: {issue.column})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Mapeo de headers aplicado */}
              {Object.keys(selectedFile.headerMapping).length > 0 && (
                <div className="schema-mapping">
                  <div className="schema-mapping-title">
                    📋 Schema Aplicado - Mapeo de Columnas
                  </div>
                  <div className="mapping-list">
                    {Object.entries(selectedFile.headerMapping).slice(0, 10).map(([from, to]) => (
                      <div key={from} className="mapping-item">
                        <span style={{ color: '#666' }}>{from}</span>
                        <span className="mapping-arrow">→</span>
                        <span style={{ fontWeight: 600 }}>{to}</span>
                      </div>
                    ))}
                    {Object.keys(selectedFile.headerMapping).length > 10 && (
                      <div className="mapping-item" style={{ color: '#999', fontStyle: 'italic' }}>
                        ... y {Object.keys(selectedFile.headerMapping).length - 10} más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tabla de columnas */}
              <div className="section-title">
                <BarChart3 size={20} />
                Análisis Descriptivo de Columnas
              </div>
              
              <table className="columns-table">
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Tipo</th>
                    <th>Completitud</th>
                    <th>Valores Únicos</th>
                    <th>Estadísticas</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFile.columns.map(col => (
                    <tr
                      key={col.columnName}
                      className={selectedColumn?.columnName === col.columnName ? 'selected' : ''}
                      onClick={() => setSelectedColumn(col)}
                    >
                      <td>
                        <div className="column-name">{col.columnName}</div>
                        {col.mappedName && col.mappedName !== col.columnName && (
                          <div className="column-mapped">→ {col.mappedName}</div>
                        )}
                      </td>
                      <td>
                        <span className="data-type-badge">
                          <span>{getDataTypeIcon(col.dataType)}</span>
                          <span>{col.dataType}</span>
                        </span>
                      </td>
                      <td>
                        <div className="completeness-bar">
                          <div
                            className={`completeness-fill ${
                              col.completeness < 50 ? 'low' : col.completeness < 80 ? 'medium' : ''
                            }`}
                            style={{ width: `${col.completeness}%` }}
                          />
                        </div>
                        <div style={{ fontSize: '0.8em', marginTop: '3px' }}>
                          {col.completeness.toFixed(1)}%
                        </div>
                      </td>
                      <td>
                        {col.uniqueCount.toLocaleString()}
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          ({col.distinctness.toFixed(1)}%)
                        </div>
                      </td>
                      <td>
                        {col.min !== undefined && (
                          <div style={{ fontSize: '0.85em' }}>
                            Min: {col.min.toLocaleString()}<br />
                            Max: {col.max?.toLocaleString()}<br />
                            Media: {col.mean?.toLocaleString()}
                          </div>
                        )}
                        {col.minLength !== undefined && (
                          <div style={{ fontSize: '0.85em' }}>
                            Long: {col.minLength}-{col.maxLength}<br />
                            Promedio: {col.avgLength?.toFixed(1)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Detalle de columna seleccionada */}
              {selectedColumn && (
                <div className="column-detail">
                  <div className="column-detail-title">
                    Detalle de Columna: {selectedColumn.columnName}
                  </div>

                  <div className="column-detail-grid">
                    <div className="detail-stat">
                      <div className="detail-stat-label">Tipo de Dato</div>
                      <div className="detail-stat-value">
                        {getDataTypeIcon(selectedColumn.dataType)} {selectedColumn.dataType}
                      </div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Confianza</div>
                      <div className="detail-stat-value">
                        {(selectedColumn.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Total Valores</div>
                      <div className="detail-stat-value">
                        {selectedColumn.totalValues.toLocaleString()}
                      </div>
                    </div>
                    <div className="detail-stat">
                      <div className="detail-stat-label">Valores Nulos</div>
                      <div className="detail-stat-value">
                        {selectedColumn.nullCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Valores de muestra */}
                  {selectedColumn.sampleValues.length > 0 && (
                    <div className="sample-values">
                      <div className="sample-values-title">Valores de Muestra:</div>
                      <div className="sample-chips">
                        {selectedColumn.sampleValues.map((val, idx) => (
                          <div key={idx} className="sample-chip">
                            {String(val).substring(0, 50)}
                            {String(val).length > 50 ? '...' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top valores (si es categórico) */}
                  {selectedColumn.topValues && selectedColumn.topValues.length > 0 && (
                    <div className="sample-values">
                      <div className="sample-values-title">Valores Más Frecuentes:</div>
                      <table className="top-values-table">
                        <thead>
                          <tr>
                            <th>Valor</th>
                            <th>Frecuencia</th>
                            <th>Porcentaje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedColumn.topValues.slice(0, 10).map((item, idx) => (
                            <tr key={idx}>
                              <td>{String(item.value).substring(0, 50)}</td>
                              <td>{item.count.toLocaleString()}</td>
                              <td>{item.percentage.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Problemas de calidad */}
                  {selectedColumn.issues && selectedColumn.issues.length > 0 && (
                    <div className="sample-values">
                      <div className="sample-values-title">⚠️ Problemas de Calidad:</div>
                      <div style={{ paddingLeft: '10px' }}>
                        {selectedColumn.issues.map((issue, idx) => (
                          <div key={idx} style={{ marginBottom: '5px', color: '#f57c00' }}>
                            • {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patrones detectados */}
                  {selectedColumn.patterns && selectedColumn.patterns.length > 0 && (
                    <div className="sample-values">
                      <div className="sample-values-title">🔍 Patrones Detectados:</div>
                      <div style={{ paddingLeft: '10px' }}>
                        {selectedColumn.patterns.map((pattern, idx) => (
                          <div key={idx} style={{ marginBottom: '5px', color: '#1976d2' }}>
                            • {pattern}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
              <Database size={64} color="#ccc" />
              <p style={{ marginTop: '20px', fontSize: '1.1em' }}>
                Selecciona una tabla para ver su análisis detallado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
