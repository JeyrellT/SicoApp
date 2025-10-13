import React, { useState, useEffect } from 'react';
import { 
  Table, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Database,
  FileText,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 50%, #dfe7f0 100%);
          position: relative;
        }

        .schema-analysis-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 300px;
          background: 
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .schema-analysis-panel > * {
          position: relative;
          z-index: 1;
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
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          padding: 30px;
          border-radius: 16px;
          margin-bottom: 25px;
          box-shadow: 
            0 4px 16px rgba(59, 130, 246, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          position: relative;
          overflow: hidden;
        }

        .schema-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
        }

        .schema-title {
          font-size: 1.9em;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }

        .schema-title svg {
          color: #3b82f6;
          filter: drop-shadow(0 2px 6px rgba(59, 130, 246, 0.3));
        }

        .schema-subtitle {
          color: #64748b;
          font-size: 1em;
          line-height: 1.6;
        }

        .filters-section {
          background: linear-gradient(135deg, #ffffff 0%, #fefeff 100%);
          padding: 25px;
          border-radius: 16px;
          margin-bottom: 25px;
          box-shadow: 
            0 4px 16px rgba(147, 51, 234, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(147, 51, 234, 0.1);
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.15em;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 18px;
        }

        .filters-header svg {
          color: #8b5cf6;
          filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3));
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
          padding: 10px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95em;
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 180px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .filter-select:hover:not(:disabled) {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 
            0 0 0 4px rgba(59, 130, 246, 0.1),
            0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .filter-select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .clear-filters-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .clear-filters-btn:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        }

        .active-filters {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 2px solid #e5e7eb;
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 0.9em;
        }

        .filter-tag {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          padding: 6px 14px;
          border-radius: 16px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
        }

        .schema-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
        }

        .file-list {
          background: linear-gradient(135deg, #ffffff 0%, #fefeff 100%);
          border-radius: 16px;
          padding: 20px;
          overflow-y: auto;
          box-shadow: 
            0 4px 16px rgba(59, 130, 246, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }

        .file-list-title {
          font-size: 1.15em;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 3px solid #e5e7eb;
          background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .file-item {
          padding: 14px;
          margin-bottom: 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          background: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .file-item:hover {
          background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
          border-color: #3b82f6;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .file-item.selected {
          background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
          border-color: #3b82f6;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
          transform: translateX(8px);
        }

        .file-item-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.92em;
          margin-bottom: 6px;
        }

        .file-item-stats {
          font-size: 0.82em;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }

        .file-item-quality {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .quality-badge {
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 0.75em;
          font-weight: 700;
          color: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .file-detail {
          background: linear-gradient(135deg, #ffffff 0%, #fefeff 100%);
          border-radius: 16px;
          padding: 25px;
          overflow-y: auto;
          box-shadow: 
            0 4px 16px rgba(139, 92, 246, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.1);
        }

        .detail-header {
          margin-bottom: 30px;
          padding-bottom: 25px;
          border-bottom: 3px solid #e5e7eb;
          position: relative;
        }

        .detail-header::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 120px;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
        }

        .detail-title {
          font-size: 1.5em;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }

        .detail-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 18px;
          margin-top: 18px;
        }

        .metric-card {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          padding: 18px;
          border-radius: 12px;
          border-left: 5px solid #3b82f6;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
          border-left-width: 5px;
        }

        .metric-label {
          font-size: 0.82em;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
          font-weight: 700;
        }
        }

        .metric-value {
          font-size: 1.6em;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }

        .section-title {
          font-size: 1.25em;
          font-weight: 700;
          color: #1e293b;
          margin: 30px 0 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-title svg {
          color: #8b5cf6;
          filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3));
        }

        .issues-list {
          margin-bottom: 30px;
        }

        .issue-item {
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .issue-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .issue-item.error {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-left: 5px solid #ef4444;
        }

        .issue-item.warning {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-left: 5px solid #f59e0b;
        }

        .issue-item.info {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left: 5px solid #3b82f6;
        }

        .columns-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 0.9em;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }

        .columns-table th {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          padding: 14px;
          text-align: left;
          font-weight: 700;
          color: white;
          border-bottom: none;
          position: sticky;
          top: 0;
          z-index: 10;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.85em;
        }

        .columns-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
          background: white;
        }

        .columns-table tr:hover td {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          cursor: pointer;
        }

        .columns-table tr.selected td {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          font-weight: 600;
        }

        .column-name {
          font-weight: 700;
          color: #1e293b;
        }

        .column-mapped {
          color: #64748b;
          font-size: 0.9em;
          font-style: italic;
          margin-left: 8px;
        }

        .data-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 14px;
          font-size: 0.85em;
          font-weight: 600;
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
          color: #1e293b;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .completeness-bar {
          width: 110px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .completeness-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
        }

        .completeness-fill.low {
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        }

        .completeness-fill.medium {
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
        }

        .column-detail {
          margin-top: 25px;
          padding: 25px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 16px;
          border: 2px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
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
