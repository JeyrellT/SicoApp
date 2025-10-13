import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  FileText,
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
  CalendarCheck
} from 'lucide-react';
import { fileValidationService, FILE_SCHEMAS } from '../services/FileValidationService';
import type { AnalysisReport, FileValidationResult, GroupSummary, YearCoverageSummary } from '../services/FileValidationService';

export const ValidationReportPanel: React.FC = () => {
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  
  // Filtros de fecha
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const report = await fileValidationService.analyzeAllFiles(selectedMonth, selectedYear);
      setAnalysisReport(report);
    } catch (error) {
      console.error('Error analyzing files:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const downloadReport = async () => {
    try {
      const reportText = await fileValidationService.generateValidationReport();
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `validation_report_${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} color="#d32f2f" />;
      case 'warning': return <AlertTriangle size={16} color="#f57c00" />;
      case 'info': return <Info size={16} color="#1976d2" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="validation-report loading">
        <RefreshCw className="spinner" size={32} />
        <p>Analizando archivos...</p>
      </div>
    );
  }

  if (!analysisReport) {
    return (
      <div className="validation-report error">
        <AlertCircle size={48} />
        <p>No se pudo cargar el análisis de validación</p>
      </div>
    );
  }

  const groupSummaries: GroupSummary[] = analysisReport.groupSummaries || [];
  const yearCoverage: YearCoverageSummary[] = analysisReport.yearCoverage || [];

  const totalYearsWithData = yearCoverage.length;
  const totalMonthsWithData = yearCoverage.reduce((acc, year) => acc + year.monthsWithData, 0);
  const totalMonthsExpected = totalYearsWithData * 12;
  const totalMonthsMissing = Math.max(totalMonthsExpected - totalMonthsWithData, 0);
  const averageMonthlyCompletion = totalMonthsExpected > 0
    ? (totalMonthsWithData / totalMonthsExpected) * 100
    : 0;
  const latestYearSummary = yearCoverage[0] || null;
  const hasGroupSummaries = groupSummaries.length > 0;
  const hasYearCoverage = yearCoverage.length > 0;

  return (
    <div className="validation-report">
      <style>{`
        .validation-report {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .validation-report.loading,
        .validation-report.error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #666;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .report-title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .report-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 0.95em;
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
          background: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .date-filters-section {
          background: #f0f4ff;
          border: 1px solid #d0dff5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .filter-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filters-container {
          display: flex;
          gap: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-size: 0.9em;
          font-weight: 500;
          color: #333;
        }

        .filter-select {
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 0.95em;
          min-width: 180px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .filter-select:hover {
          border-color: #667eea;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn-clear-filters {
          padding: 10px 20px;
          background: #f57c00;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9em;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-clear-filters:hover {
          background: #e65100;
        }

        .active-filters-info {
          margin-top: 15px;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #1976d2;
          font-size: 0.95em;
          color: #333;
          font-weight: 500;
        }

        .summary-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #667eea;
        }

        .summary-card.warning {
          border-left-color: #f57c00;
        }

        .summary-card.error {
          border-left-color: #d32f2f;
        }

        .summary-card.success {
          border-left-color: #4CAF50;
        }

        .summary-label {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-value {
          font-size: 2.5em;
          font-weight: 700;
          color: #333;
        }

        .summary-subvalue {
          font-size: 0.85em;
          color: #999;
          margin-top: 5px;
        }

        .completeness-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
        }

        .completeness-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s;
        }

        .missing-files-section {
          background: #fff9e6;
          border-left: 4px solid #f57c00;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .missing-files-title {
          font-size: 1.2em;
          font-weight: 600;
          color: #f57c00;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .missing-files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }

        .missing-file-item {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffe0b2;
        }

        .missing-file-type {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }

        .missing-file-desc {
          font-size: 0.9em;
          color: #666;
        }

        .recommendations-section {
          background: #e3f2fd;
          border-left: 4px solid #1976d2;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .recommendations-title {
          font-size: 1.2em;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .recommendation-item {
          background: white;
          padding: 12px 15px;
          border-radius: 6px;
          margin-bottom: 10px;
          display: flex;
          align-items: start;
          gap: 10px;
        }

        .recommendation-number {
          background: #1976d2;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85em;
          font-weight: 600;
          flex-shrink: 0;
        }

        .files-validation-section {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .section-title {
          font-size: 1.3em;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
        }

        .file-validation-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 15px;
          overflow: hidden;
        }

        .file-validation-header {
          padding: 15px 20px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.2s;
        }

        .file-validation-header:hover {
          background: #e9ecef;
        }

        .file-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .file-status-icon {
          flex-shrink: 0;
        }

        .file-name {
          font-weight: 500;
          color: #333;
        }

        .file-type-badge {
          background: #667eea;
          color: white;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.85em;
        }

        .file-stats {
          display: flex;
          gap: 20px;
          font-size: 0.9em;
          color: #666;
        }

        .file-validation-details {
          padding: 20px;
          background: white;
          border-top: 1px solid #e0e0e0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
        }

        .stat-label {
          font-size: 0.85em;
          color: #666;
          margin-bottom: 5px;
        }

        .stat-value {
          font-size: 1.3em;
          font-weight: 600;
          color: #333;
        }

        .issues-list {
          margin-top: 15px;
        }

        .issue-item {
          display: flex;
          align-items: start;
          gap: 10px;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          background: #f8f9fa;
          border-left: 3px solid #ccc;
        }

        .issue-item.error {
          background: #ffebee;
          border-left-color: #d32f2f;
        }

        .issue-item.warning {
          background: #fff9e6;
          border-left-color: #f57c00;
        }

        .issue-item.info {
          background: #e3f2fd;
          border-left-color: #1976d2;
        }

        .issue-message {
          flex: 1;
          font-size: 0.95em;
        }

        .issue-field-tag {
          display: inline-block;
          background: rgba(0,0,0,0.1);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: monospace;
          margin-top: 5px;
        }

        .coverage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .coverage-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
        }

        .coverage-field {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 8px;
        }

        .coverage-bar-container {
          background: #e0e0e0;
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
        }

        .coverage-bar-fill {
          height: 100%;
          background: #4CAF50;
          transition: width 0.3s;
        }

        .coverage-bar-fill.low {
          background: #d32f2f;
        }

        .coverage-bar-fill.medium {
          background: #f57c00;
        }

        .coverage-percentage {
          font-size: 0.85em;
          color: #666;
          margin-top: 5px;
        }

        .group-coverage-section,
        .year-coverage-section {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          margin-bottom: 30px;
        }

        .coverage-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .coverage-table th,
        .coverage-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
          font-size: 0.95em;
        }

        .coverage-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .coverage-table tr:last-child td {
          border-bottom: none;
        }

        .chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .chip {
          background: #f0f4ff;
          color: #3f51b5;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.85em;
        }

        .chip-empty {
          background: #ffebee;
          color: #c62828;
        }

        .chip-warning {
          background: #fff8e1;
          color: #ef6c00;
        }

        .chip-ok {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .count-label {
          font-weight: 600;
          color: #333;
        }

        .group-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eef2ff;
          color: #3f51b5;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75em;
          margin-left: 8px;
        }

        .progress-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .progress-meter {
          width: 120px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #42a5f5 0%, #1e88e5 100%);
        }
      `}</style>

      <div className="report-header">
        <h2 className="report-title">
          <FileText size={28} />
          Reporte de Validación
        </h2>
        <div className="report-actions">
          <button className="btn btn-secondary" onClick={loadAnalysis}>
            <RefreshCw size={18} />
            Actualizar
          </button>
          <button className="btn btn-primary" onClick={downloadReport}>
            <Download size={18} />
            Descargar Reporte
          </button>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="date-filters-section">
        <h3 className="filter-title">
          <Info size={20} />
          Filtrar por Período de Carga (LITES)
        </h3>
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="month-select">Mes:</label>
            <select 
              id="month-select"
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Todos los meses</option>
              <option value="01">Enero</option>
              <option value="02">Febrero</option>
              <option value="03">Marzo</option>
              <option value="04">Abril</option>
              <option value="05">Mayo</option>
              <option value="06">Junio</option>
              <option value="07">Julio</option>
              <option value="08">Agosto</option>
              <option value="09">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="year-select">Año:</label>
            <select 
              id="year-select"
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Todos los años</option>
              {Array.from({ length: 10 }, (_, i) => 2025 - i).map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          {(selectedMonth || selectedYear) && (
            <button 
              className="btn btn-clear-filters"
              onClick={() => {
                setSelectedMonth('');
                setSelectedYear('');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        {(selectedMonth || selectedYear) && (
          <div className="active-filters-info">
            Mostrando datos de: {selectedMonth ? `${['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][parseInt(selectedMonth)]}` : 'Todos los meses'}{selectedYear ? ` ${selectedYear}` : ''}
          </div>
        )}
      </div>

      {/* Resumen General */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">
            <FileText size={18} />
            Total de Archivos
          </div>
          <div className="summary-value">{analysisReport.totalFiles}</div>
          <div className="summary-subvalue">
            Archivos analizados
          </div>
        </div>

        <div className="summary-card success">
          <div className="summary-label">
            <CheckCircle size={18} />
            Archivos Válidos
          </div>
          <div className="summary-value">{analysisReport.validFiles}</div>
          <div className="summary-subvalue">
            {analysisReport.totalFiles > 0 
              ? `${((analysisReport.validFiles / analysisReport.totalFiles) * 100).toFixed(1)}% sin errores`
              : 'No hay archivos'}
          </div>
        </div>

        <div className="summary-card error">
          <div className="summary-label">
            <AlertCircle size={18} />
            Con Errores
          </div>
          <div className="summary-value">{analysisReport.filesWithErrors}</div>
          <div className="summary-subvalue">
            Requieren corrección
          </div>
        </div>

        <div className="summary-card warning">
          <div className="summary-label">
            <AlertTriangle size={18} />
            Con Advertencias
          </div>
          <div className="summary-value">{analysisReport.filesWithWarnings}</div>
          <div className="summary-subvalue">
            Revisar datos
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            <TrendingUp size={18} />
            Completitud
          </div>
          <div className="summary-value">{analysisReport.completeness.toFixed(1)}%</div>
          <div className="completeness-bar">
            <div 
              className="completeness-fill" 
              style={{ width: `${analysisReport.completeness}%` }}
            />
          </div>
          <div className="summary-subvalue">
            {analysisReport.totalFiles} de {FILE_SCHEMAS.length} tipos
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            <Calendar size={18} />
            Años con datos
          </div>
          <div className="summary-value">{totalYearsWithData}</div>
          <div className="summary-subvalue">
            {latestYearSummary ? `Último año: ${latestYearSummary.year}` : 'Sin registros disponibles'}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            <CalendarCheck size={18} />
            Cobertura mensual
          </div>
          <div className="summary-value">{averageMonthlyCompletion.toFixed(1)}%</div>
          <div className="summary-subvalue">
            {totalMonthsExpected > 0
              ? `${totalMonthsWithData} de ${totalMonthsExpected} meses con datos (${totalMonthsMissing} pendientes)`
              : 'Sin periodos registrados'}
          </div>
        </div>
      </div>

      {/* Cobertura por grupo de archivos */}
      <div className="group-coverage-section">
        <h3 className="section-title">Cobertura por grupo de datos</h3>
        {hasGroupSummaries ? (
          <table className="coverage-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Tipos cargados</th>
                <th>Tipos pendientes</th>
                <th>Completitud</th>
              </tr>
            </thead>
            <tbody>
              {groupSummaries.map(summary => {
                const completionWidth = Math.min(summary.completion, 100);
                return (
                  <tr key={summary.group}>
                    <td>
                      {summary.group}
                      <span className="group-badge">Total {summary.totalTypes}</span>
                    </td>
                    <td>
                      <div className="count-label">
                        {summary.loadedTypes.length} / {summary.totalTypes}
                      </div>
                      <div className="chip-list">
                        {summary.loadedTypes.length === 0 ? (
                          <span className="chip chip-empty">Sin datos</span>
                        ) : (
                          summary.loadedTypes.map(type => (
                            <span key={type} className="chip">{type}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="count-label">{summary.missingTypes.length}</div>
                      <div className="chip-list">
                        {summary.missingTypes.length === 0 ? (
                          <span className="chip chip-ok">Completo</span>
                        ) : (
                          summary.missingTypes.map(type => (
                            <span key={type} className="chip chip-warning">{type}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="progress-badge">
                        <div className="progress-meter">
                          <div className="progress-fill" style={{ width: `${completionWidth}%` }} />
                        </div>
                        <span>{summary.completion.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay agrupaciones disponibles.</p>
        )}
      </div>

      {/* Cobertura anual y mensual */}
      <div className="year-coverage-section">
        <h3 className="section-title">Cobertura por año y mes</h3>
        {hasYearCoverage ? (
          <table className="coverage-table">
            <thead>
              <tr>
                <th>Año</th>
                <th>Meses con datos</th>
                <th>Meses faltantes</th>
                <th>Completitud</th>
                <th>Meses sin datos</th>
              </tr>
            </thead>
            <tbody>
              {yearCoverage.map(summary => {
                const completionWidth = Math.min(summary.completion, 100);
                const missingMonths = summary.detail.filter(item => !item.hasData);
                return (
                  <tr key={summary.year}>
                    <td>{summary.year}</td>
                    <td>{summary.monthsWithData}</td>
                    <td>{summary.monthsMissing}</td>
                    <td>
                      <div className="progress-badge">
                        <div className="progress-meter">
                          <div className="progress-fill" style={{ width: `${completionWidth}%` }} />
                        </div>
                        <span>{summary.completion.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      {missingMonths.length === 0 ? (
                        <span className="chip chip-ok">Cobertura completa</span>
                      ) : (
                        <div className="chip-list">
                          {missingMonths.map(month => (
                            <span key={`${summary.year}-${month.month}`} className="chip chip-warning">{month.monthLabel}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No hay información temporal disponible para los criterios seleccionados.</p>
        )}
      </div>

      {/* Archivos Faltantes */}
      {analysisReport.missingFileTypes.length > 0 && (
        <div className="missing-files-section">
          <h3 className="missing-files-title">
            <AlertTriangle size={24} />
            Tipos de Archivos Faltantes ({analysisReport.missingFileTypes.length})
          </h3>
          <div className="missing-files-grid">
            {analysisReport.missingFileTypes.map(type => {
              const schema = analysisReport.fileValidations.find(v => v.type === type);
              return (
                <div key={type} className="missing-file-item">
                  <div className="missing-file-type">{type}</div>
                  <div className="missing-file-desc">
                    {schema?.type || 'Archivo de datos SICOP'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {analysisReport.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3 className="recommendations-title">
            <Info size={24} />
            Recomendaciones
          </h3>
          {analysisReport.recommendations.map((rec, index) => (
            <div key={index} className="recommendation-item">
              <div className="recommendation-number">{index + 1}</div>
              <div>{rec}</div>
            </div>
          ))}
        </div>
      )}

      {/* Validación por Archivo */}
      <div className="files-validation-section">
        <h3 className="section-title">Validación Detallada por Archivo</h3>
        
        {analysisReport.fileValidations.map((validation: FileValidationResult) => (
          <div key={validation.fileId} className="file-validation-item">
            <div 
              className="file-validation-header"
              onClick={() => toggleFileExpansion(validation.fileId)}
            >
              <div className="file-header-left">
                <div className="file-status-icon">
                  {validation.isValid ? (
                    <CheckCircle size={20} color="#4CAF50" />
                  ) : (
                    <AlertCircle size={20} color="#d32f2f" />
                  )}
                </div>
                <div>
                  <div className="file-name">{validation.fileName}</div>
                  <span className="file-type-badge">{validation.type}</span>
                </div>
              </div>
              <div className="file-stats">
                <span>{validation.stats.totalRecords.toLocaleString()} registros</span>
                <span>{validation.issues.length} problema(s)</span>
              </div>
            </div>

            {expandedFiles.has(validation.fileId) && (
              <div className="file-validation-details">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">Registros Totales</div>
                    <div className="stat-value">
                      {validation.stats.totalRecords.toLocaleString()}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Registros Válidos</div>
                    <div className="stat-value">
                      {validation.stats.validRecords.toLocaleString()}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Tasa de Validez</div>
                    <div className="stat-value">
                      {validation.stats.totalRecords > 0
                        ? ((validation.stats.validRecords / validation.stats.totalRecords) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                </div>

                {validation.issues.length > 0 && (
                  <div className="issues-list">
                    <h4 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={20} />
                      Problemas Detectados ({validation.issues.length})
                    </h4>
                    {/* Errores primero */}
                    {validation.issues.filter(i => i.type === 'error').map((issue, index) => (
                      <div key={`error-${index}`} className={`issue-item ${issue.type}`}>
                        {getIssueIcon(issue.type)}
                        <div className="issue-message">
                          <strong>ERROR:</strong> {issue.message}
                          {issue.field && <div className="issue-field-tag">
                            Campo: {issue.field}
                          </div>}
                        </div>
                      </div>
                    ))}
                    {/* Advertencias */}
                    {validation.issues.filter(i => i.type === 'warning').map((issue, index) => (
                      <div key={`warning-${index}`} className={`issue-item ${issue.type}`}>
                        {getIssueIcon(issue.type)}
                        <div className="issue-message">
                          <strong>ADVERTENCIA:</strong> {issue.message}
                          {issue.field && <div className="issue-field-tag">
                            Campo: {issue.field}
                          </div>}
                        </div>
                      </div>
                    ))}
                    {/* Información */}
                    {validation.issues.filter(i => i.type === 'info').map((issue, index) => (
                      <div key={`info-${index}`} className={`issue-item ${issue.type}`}>
                        {getIssueIcon(issue.type)}
                        <div className="issue-message">
                          <strong>INFO:</strong> {issue.message}
                          {issue.field && <div className="issue-field-tag">
                            Campo: {issue.field}
                          </div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(validation.stats.fieldsCoverage).length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '15px', color: '#333' }}>Cobertura de Campos:</h4>
                    <div className="coverage-grid">
                      {Object.entries(validation.stats.fieldsCoverage).map(([field, coverage]) => (
                        <div key={field} className="coverage-item">
                          <div className="coverage-field">{field}</div>
                          <div className="coverage-bar-container">
                            <div 
                              className={`coverage-bar-fill ${
                                coverage < 50 ? 'low' : coverage < 80 ? 'medium' : ''
                              }`}
                              style={{ width: `${coverage}%` }}
                            />
                          </div>
                          <div className="coverage-percentage">{coverage.toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
