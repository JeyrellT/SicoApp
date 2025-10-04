import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Database, 
  Trash2, 
  Download, 
  ChevronRight,
  HardDrive,
  FileText,
  Archive,
  Filter,
  Eye,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cacheService, CachedFile, CacheMetadata, CachedData } from '../services/CacheService';
import { consolidationService } from '../services/DataConsolidationService';

interface GroupedFiles {
  [year: number]: {
    [month: number]: {
      [type: string]: CachedFile[];
    };
  };
}

export const CacheManager: React.FC<{
  onDataChange?: () => void;
}> = ({ onDataChange }) => {
  const [metadata, setMetadata] = useState<CacheMetadata | null>(null);
  const [groupedFiles, setGroupedFiles] = useState<GroupedFiles>({});
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Estados para previsualización
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  /**
   * Obtener listas únicas de años, meses y tipos para los filtros
   */
  const availableYears = useMemo(() => {
    if (!metadata) return [];
    return [...new Set(metadata.files.map(f => f.year))].sort((a, b) => b - a);
  }, [metadata]);

  const availableMonths = useMemo(() => {
    if (!metadata) return [];
    let months = metadata.files.map(f => f.month);
    if (selectedYear !== null) {
      months = metadata.files.filter(f => f.year === selectedYear).map(f => f.month);
    }
    return [...new Set(months)].sort((a, b) => a - b);
  }, [metadata, selectedYear]);

  const availableTypes = useMemo(() => {
    if (!metadata) return [];
    return [...new Set(metadata.files.map(f => f.type))].sort();
  }, [metadata]);

  /**
   * Filtrar archivos basados en los filtros seleccionados
   */
  const filteredGroupedFiles = useMemo(() => {
    if (!metadata) return {};
    
    let files = metadata.files;
    
    if (selectedYear !== null) {
      files = files.filter(f => f.year === selectedYear);
    }
    if (selectedMonth !== null) {
      files = files.filter(f => f.month === selectedMonth);
    }
    if (selectedType !== null) {
      files = files.filter(f => f.type === selectedType);
    }
    
    // Reagrupar archivos filtrados
    const grouped: GroupedFiles = {};
    files.forEach(file => {
      if (!grouped[file.year]) {
        grouped[file.year] = {};
      }
      if (!grouped[file.year][file.month]) {
        grouped[file.year][file.month] = {};
      }
      if (!grouped[file.year][file.month][file.type]) {
        grouped[file.year][file.month][file.type] = [];
      }
      grouped[file.year][file.month][file.type].push(file);
    });
    
    return grouped;
  }, [metadata, selectedYear, selectedMonth, selectedType]);

  /**
   * Análisis de consistencia de datos
   */
  const consistencyAnalysis = useMemo(() => {
    if (!metadata || metadata.files.length === 0) return null;
    
    const analysis: any = {
      totalYears: availableYears.length,
      totalMonths: new Set(metadata.files.map(f => f.month)).size,
      byYear: {} as any,
      byType: {} as any,
      trends: [] as any[]
    };
    
    // Análisis por año
    availableYears.forEach(year => {
      const yearFiles = metadata.files.filter(f => f.year === year);
      const yearMonths = [...new Set(yearFiles.map(f => f.month))];
      
      analysis.byYear[year] = {
        totalFiles: yearFiles.length,
        totalRecords: yearFiles.reduce((sum, f) => sum + f.recordCount, 0),
        months: yearMonths.length,
        avgRecordsPerFile: Math.round(yearFiles.reduce((sum, f) => sum + f.recordCount, 0) / yearFiles.length),
        types: [...new Set(yearFiles.map(f => f.type))]
      };
    });
    
    // Análisis por tipo
    availableTypes.forEach(type => {
      const typeFiles = metadata.files.filter(f => f.type === type);
      const years = [...new Set(typeFiles.map(f => f.year))];
      
      analysis.byType[type] = {
        totalFiles: typeFiles.length,
        totalRecords: typeFiles.reduce((sum, f) => sum + f.recordCount, 0),
        years: years.length,
        avgRecordsPerFile: Math.round(typeFiles.reduce((sum, f) => sum + f.recordCount, 0) / typeFiles.length),
        coverage: `${years.length}/${availableYears.length} años`
      };
    });
    
    // Tendencias
    if (availableYears.length > 1) {
      const latestYear = availableYears[0];
      const previousYear = availableYears[1];
      
      const latestYearRecords = analysis.byYear[latestYear].totalRecords;
      const previousYearRecords = analysis.byYear[previousYear].totalRecords;
      const change = latestYearRecords - previousYearRecords;
      const percentChange = ((change / previousYearRecords) * 100).toFixed(1);
      
      analysis.trends.push({
        type: 'yearly',
        description: `Cambio de ${previousYear} a ${latestYear}`,
        value: change > 0 ? `+${percentChange}%` : `${percentChange}%`,
        positive: change > 0
      });
    }
    
    return analysis;
  }, [metadata, availableYears, availableTypes]);

  /**
   * Carga los metadatos y estadísticas del caché
   */
  const loadCacheData = async () => {
    setLoading(true);
    try {
      const meta = await cacheService.getMetadata();
      const stats = await cacheService.getCacheStats();
      
      setMetadata(meta);
      setCacheStats(stats);
      
      // No necesitamos agrupar aquí, ya que lo hacemos con useMemo
    } catch (error) {
      console.error('Error loading cache data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCacheData();
  }, []);

  /**
   * Previsualizar un archivo (primeras 5 filas)
   */
  const previewFileData = async (fileId: string) => {
    setLoadingPreview(true);
    try {
      const cachedData: CachedData | null = await cacheService.getFile(fileId);
      if (cachedData && cachedData.data) {
        setPreviewData(cachedData.data.slice(0, 5));
        setPreviewFile(fileId);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      alert('Error al cargar la previsualización');
    } finally {
      setLoadingPreview(false);
    }
  };

  /**
   * Cerrar previsualización
   */
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewData([]);
  };

  /**
   * Limpiar todos los filtros
   */
  const clearFilters = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedType(null);
  };

  /**
   * Alterna la expansión de un año
   */
  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  /**
   * Alterna la expansión de un mes
   */
  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`;
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMonths(newExpanded);
  };

  /**
   * Elimina un archivo
   */
  const deleteFile = async (fileId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return;
    }

    try {
      await cacheService.deleteFile(fileId);
      await loadCacheData();
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error al eliminar el archivo');
    }
  };

  /**
   * Elimina todos los archivos de un mes
   */
  const deleteMonth = async (year: number, month: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Eliminar todos los archivos de ${monthNames[month - 1]} ${year}?`)) {
      return;
    }

    try {
      await cacheService.deleteFilesByMonth(year, month);
      await loadCacheData();
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting month:', error);
      alert('Error al eliminar los archivos del mes');
    }
  };

  /**
   * Elimina todos los archivos de un año
   */
  const deleteYear = async (year: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Eliminar todos los archivos del año ${year}?`)) {
      return;
    }

    try {
      await cacheService.deleteFilesByYear(year);
      await loadCacheData();
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting year:', error);
      alert('Error al eliminar los archivos del año');
    }
  };

  /**
   * Limpia todo el caché
   */
  const clearAllCache = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('¿ELIMINAR TODOS los archivos del caché? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await cacheService.clearCache();
      await loadCacheData();
      onDataChange?.();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error al limpiar el caché');
    }
  };

  /**
   * Descarga datos consolidados de archivos seleccionados
   */
  const downloadConsolidated = async (year?: number, month?: number, type?: string) => {
    try {
      const options: any = {};
      if (year) options.years = [year];
      if (month) options.months = [month];
      if (type) options.types = [type];

      const fileName = `consolidado_${type || 'todos'}_${year || 'todos'}_${month || 'todos'}.csv`;
      await consolidationService.downloadConsolidatedCSV(fileName, options);
    } catch (error) {
      console.error('Error downloading consolidated data:', error);
      alert('Error al descargar datos consolidados');
    }
  };

  /**
   * Formatea bytes a tamaño legible
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Renderizar tabla de previsualización
   */
  const renderPreviewTable = () => {
    if (!previewData || previewData.length === 0) return null;
    
    const columns = Object.keys(previewData[0]);
    
    return (
      <div className="preview-modal">
        <div className="preview-content">
          <div className="preview-header">
            <h3>
              <Eye size={20} />
              Previsualización de Datos (Primeras 5 filas)
            </h3>
            <button className="btn-close" onClick={closePreview}>×</button>
          </div>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {columns.map((col, colIdx) => (
                      <td key={colIdx}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="cache-manager loading">Cargando datos del caché...</div>;
  }

  return (
    <div className="cache-manager">
      <style>{`
        .cache-manager {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .cache-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 25px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .cache-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.8em;
          font-weight: 700;
          color: #1a1a1a;
        }

        .cache-actions {
          display: flex;
          gap: 10px;
        }

        /* Filtros */
        .filters-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 0.85em;
          font-weight: 500;
          color: #666;
        }

        .filter-select {
          padding: 10px 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95em;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: #4CAF50;
        }

        .filter-select:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .active-filters {
          font-size: 0.9em;
          color: #4CAF50;
          font-weight: 500;
        }

        /* Estadísticas mejoradas */
        .cache-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #4CAF50, #2196F3);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9em;
          color: #666;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 2.2em;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .stat-subvalue {
          font-size: 0.85em;
          color: #888;
          margin-top: 8px;
          font-weight: 500;
        }

        /* Análisis de consistencia */
        .consistency-section {
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .consistency-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 1.3em;
          font-weight: 700;
          color: #1a1a1a;
        }

        .consistency-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .consistency-card {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 18px;
          border-left: 4px solid #4CAF50;
        }

        .consistency-card-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          font-size: 1.05em;
        }

        .consistency-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 0.9em;
        }

        .consistency-item:last-child {
          border-bottom: none;
        }

        .consistency-label {
          color: #666;
        }

        .consistency-value {
          font-weight: 600;
          color: #333;
        }

        .trend-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #e8f5e9;
          padding: 15px;
          border-radius: 8px;
          margin-top: 10px;
        }

        .trend-card.negative {
          background: #ffebee;
        }

        .trend-value {
          font-size: 1.3em;
          font-weight: 700;
          color: #2e7d32;
        }

        .trend-value.negative {
          color: #c62828;
        }

        /* Grupos de archivos mejorados */
        .year-group {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          margin-bottom: 20px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.2s;
        }

        .year-group:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .year-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 2px solid #e0e0e0;
        }

        .year-header:hover {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
        }

        .year-info {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
        }

        .year-title {
          font-size: 1.3em;
          font-weight: 700;
          color: #1a1a1a;
        }

        .year-badge {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 0.85em;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
        }

        .year-actions {
          display: flex;
          gap: 10px;
        }

        .month-group {
          border-top: 1px solid #e8e8e8;
          background: #fafafa;
        }

        .month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px 14px 48px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .month-header:hover {
          background: #f0f0f0;
        }

        .month-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .month-title {
          font-size: 1.1em;
          font-weight: 600;
          color: #333;
        }

        .month-badge {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
        }

        .type-group {
          padding: 12px 24px 12px 72px;
          border-top: 1px solid #e8e8e8;
        }

        .type-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          margin-bottom: 10px;
        }

        .type-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #555;
          font-size: 1.05em;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: white;
          border: 2px solid #e8e8e8;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .file-item:hover {
          border-color: #4CAF50;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
          transform: translateX(4px);
        }

        .file-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .file-name {
          font-size: 0.95em;
          font-weight: 600;
          color: #1a1a1a;
        }

        .file-meta {
          display: flex;
          gap: 18px;
          font-size: 0.85em;
          color: #888;
        }

        .file-actions {
          display: flex;
          gap: 8px;
        }

        /* Previsualización modal */
        .preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .preview-content {
          background: white;
          border-radius: 12px;
          max-width: 95%;
          max-height: 90%;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 25px;
          background: #f8f9fa;
          border-bottom: 2px solid #e0e0e0;
        }

        .preview-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 1.3em;
          color: #1a1a1a;
        }

        .btn-close {
          background: #f44336;
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 1.5em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #d32f2f;
          transform: scale(1.1);
        }

        .preview-table-container {
          overflow: auto;
          max-height: calc(90vh - 100px);
          padding: 20px;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
        }

        .preview-table th {
          background: #4CAF50;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .preview-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .preview-table tr:hover {
          background: #f5f5f5;
        }

        /* Botones mejorados */
        .btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 0.9em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .btn-icon {
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          border-radius: 6px;
        }

        .btn-icon:hover {
          color: #333;
          background: rgba(0, 0, 0, 0.05);
        }

        .btn-preview {
          background: #2196F3;
          color: white;
        }

        .btn-preview:hover {
          background: #1976D2;
          box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-danger:hover {
          background: #d32f2f;
          box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
          box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
          border: 2px solid #e0e0e0;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
          border-color: #ccc;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .empty-state-icon {
          margin: 0 auto 20px;
          color: #ddd;
        }

        .empty-state h3 {
          color: #666;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #999;
        }

        .chevron-icon {
          transition: transform 0.2s;
        }

        .chevron-icon.expanded {
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .cache-header {
            flex-direction: column;
            gap: 15px;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .cache-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="cache-header">
        <div className="cache-title">
          <Database size={32} />
          <span>Gestor de Archivos en Caché</span>
        </div>
        <div className="cache-actions">
          <button className="btn btn-secondary" onClick={loadCacheData}>
            Actualizar
          </button>
          {metadata && metadata.files.length > 0 && (
            <button className="btn btn-danger" onClick={clearAllCache}>
              <Trash2 size={16} />
              Limpiar todo
            </button>
          )}
        </div>
      </div>

      {/* Sección de Filtros */}
      {metadata && metadata.files.length > 0 && (
        <div className="filters-section">
          <div className="filters-header">
            <Filter size={20} />
            <span>Filtros de Búsqueda</span>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Año</label>
              <select
                className="filter-select"
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todos los años</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Mes</label>
              <select
                className="filter-select"
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todos los meses</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{monthNames[month - 1]}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Tipo de Archivo</label>
              <select
                className="filter-select"
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
              >
                <option value="">Todos los tipos</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="filter-actions">
            {(selectedYear || selectedMonth || selectedType) && (
              <>
                <span className="active-filters">
                  Filtros activos: {[selectedYear, selectedMonth && monthNames[selectedMonth - 1], selectedType].filter(Boolean).join(' / ')}
                </span>
                <button className="btn btn-secondary" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {cacheStats && (
        <div className="cache-stats">
          <div className="stat-card">
            <div className="stat-label">
              <FileText size={20} />
              Total de Archivos
            </div>
            <div className="stat-value">{cacheStats.totalFiles}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Archive size={20} />
              Total de Registros
            </div>
            <div className="stat-value">{cacheStats.totalRecords.toLocaleString()}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <HardDrive size={20} />
              Tamaño del Caché
            </div>
            <div className="stat-value">{formatBytes(cacheStats.totalSize)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Calendar size={20} />
              Rango de Años
            </div>
            <div className="stat-value">
              {cacheStats.yearsList.length > 0
                ? `${Math.min(...cacheStats.yearsList)} - ${Math.max(...cacheStats.yearsList)}`
                : 'N/A'}
            </div>
            <div className="stat-subvalue">
              {cacheStats.yearsList.length} año(s)
            </div>
          </div>
        </div>
      )}

      {/* Análisis de Consistencia */}
      {consistencyAnalysis && metadata && metadata.files.length > 0 && (
        <div className="consistency-section">
          <div className="consistency-header">
            <BarChart3 size={24} />
            <span>Análisis de Consistencia de Datos</span>
          </div>
          
          <div className="consistency-grid">
            {/* Análisis por Año */}
            <div className="consistency-card">
              <div className="consistency-card-title">Resumen por Año</div>
              {Object.keys(consistencyAnalysis.byYear).map(year => (
                <div key={year} className="consistency-item">
                  <span className="consistency-label">Año {year}</span>
                  <span className="consistency-value">
                    {consistencyAnalysis.byYear[year].totalFiles} archivos / {consistencyAnalysis.byYear[year].totalRecords.toLocaleString()} registros
                  </span>
                </div>
              ))}
            </div>

            {/* Análisis por Tipo */}
            <div className="consistency-card">
              <div className="consistency-card-title">Cobertura por Tipo de Archivo</div>
              {Object.keys(consistencyAnalysis.byType).slice(0, 5).map(type => (
                <div key={type} className="consistency-item">
                  <span className="consistency-label">{type}</span>
                  <span className="consistency-value">
                    {consistencyAnalysis.byType[type].coverage}
                  </span>
                </div>
              ))}
            </div>

            {/* Tendencias */}
            {consistencyAnalysis.trends.length > 0 && (
              <div className="consistency-card">
                <div className="consistency-card-title">Tendencias</div>
                {consistencyAnalysis.trends.map((trend: any, idx: number) => (
                  <div key={idx} className={`trend-card ${trend.positive ? '' : 'negative'}`}>
                    <TrendingUp size={20} />
                    <div>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>{trend.description}</div>
                      <div className={`trend-value ${trend.positive ? '' : 'negative'}`}>
                        {trend.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alertas de Consistencia */}
            <div className="consistency-card">
              <div className="consistency-card-title">
                <AlertCircle size={18} style={{ marginRight: '6px' }} />
                Estado de Consistencia
              </div>
              <div className="consistency-item">
                <span className="consistency-label">Total de Años</span>
                <span className="consistency-value">{consistencyAnalysis.totalYears}</span>
              </div>
              <div className="consistency-item">
                <span className="consistency-label">Meses únicos</span>
                <span className="consistency-value">{consistencyAnalysis.totalMonths}</span>
              </div>
              <div className="consistency-item">
                <span className="consistency-label">Tipos de archivo</span>
                <span className="consistency-value">{Object.keys(consistencyAnalysis.byType).length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {metadata && metadata.files.length === 0 ? (
        <div className="empty-state">
          <Database size={64} className="empty-state-icon" />
          <h3>No hay archivos en caché</h3>
          <p>Comienza cargando archivos CSV para organizarlos por año y mes</p>
        </div>
      ) : (
        <div className="files-tree">
          {Object.keys(filteredGroupedFiles)
            .map(Number)
            .sort((a, b) => b - a)
            .map(year => {
              const yearData = filteredGroupedFiles[year];
              const yearFileCount = Object.values(yearData).reduce(
                (acc, monthData) =>
                  acc +
                  Object.values(monthData).reduce(
                    (acc2, files) => acc2 + files.length,
                    0
                  ),
                0
              );

              return (
                <div key={year} className="year-group">
                  <div className="year-header" onClick={() => toggleYear(year)}>
                    <div className="year-info">
                      <ChevronRight
                        size={20}
                        className={`chevron-icon ${expandedYears.has(year) ? 'expanded' : ''}`}
                      />
                      <Calendar size={20} />
                      <span className="year-title">{year}</span>
                      <span className="year-badge">{yearFileCount} archivos</span>
                    </div>
                    <div className="year-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        onClick={() => downloadConsolidated(year)}
                        title="Descargar consolidado del año"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => deleteYear(year)}
                        title="Eliminar todos los archivos del año"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {expandedYears.has(year) &&
                    Object.keys(yearData)
                      .map(Number)
                      .sort((a, b) => b - a)
                      .map(month => {
                        const monthData = yearData[month];
                        const monthFileCount = Object.values(monthData).reduce(
                          (acc, files) => acc + files.length,
                          0
                        );
                        const monthKey = `${year}-${month}`;

                        return (
                          <div key={monthKey} className="month-group">
                            <div className="month-header" onClick={() => toggleMonth(year, month)}>
                              <div className="month-info">
                                <ChevronRight
                                  size={18}
                                  className={`chevron-icon ${
                                    expandedMonths.has(monthKey) ? 'expanded' : ''
                                  }`}
                                />
                                <span className="month-title">{monthNames[month - 1]}</span>
                                <span className="month-badge">{monthFileCount} archivos</span>
                              </div>
                              <div className="year-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="btn-icon"
                                  onClick={() => downloadConsolidated(year, month)}
                                  title="Descargar consolidado del mes"
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={() => deleteMonth(year, month)}
                                  title="Eliminar todos los archivos del mes"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {expandedMonths.has(monthKey) &&
                              Object.keys(monthData)
                                .sort()
                                .map(type => {
                                  const files = monthData[type];

                                  return (
                                    <div key={type} className="type-group">
                                      <div className="type-header">
                                        <div className="type-title">
                                          <FileText size={16} />
                                          <span>{type}</span>
                                          <span style={{ color: '#999', fontSize: '0.9em' }}>
                                            ({files.length})
                                          </span>
                                        </div>
                                        <button
                                          className="btn-icon"
                                          onClick={() => downloadConsolidated(year, month, type)}
                                          title="Descargar consolidado del tipo"
                                        >
                                          <Download size={14} />
                                        </button>
                                      </div>

                                      <div className="file-list">
                                        {files.map(file => (
                                          <div key={file.id} className="file-item">
                                            <div className="file-info">
                                              <div className="file-name">{file.fileName}</div>
                                              <div className="file-meta">
                                                <span>{file.recordCount.toLocaleString()} registros</span>
                                                <span>{formatBytes(file.size)}</span>
                                                <span>
                                                  {new Date(file.uploadDate).toLocaleDateString()}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="file-actions">
                                              <button
                                                className="btn btn-preview"
                                                onClick={() => previewFileData(file.id)}
                                                title="Previsualizar datos"
                                              >
                                                <Eye size={16} />
                                                Ver datos
                                              </button>
                                              <button
                                                className="btn-icon"
                                                onClick={() => deleteFile(file.id)}
                                                title="Eliminar archivo"
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                          </div>
                        );
                      })}
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de Previsualización */}
      {previewFile && renderPreviewTable()}
      
      {loadingPreview && (
        <div className="preview-modal">
          <div style={{ color: 'white', fontSize: '1.2em' }}>Cargando previsualización...</div>
        </div>
      )}
    </div>
  );
};
