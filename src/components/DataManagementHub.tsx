import React, { useState, useEffect } from 'react';
import { FileUploader } from './FileUploader';
import { CacheManager } from './CacheManager';
import { AdvancedConsolidation } from './AdvancedConsolidation';
import { ValidationReportPanel } from './ValidationReportPanel';
import { SchemaAnalysisPanel } from './SchemaAnalysisPanel';
import { Upload, Database, BarChart3, FileCheck, PlayCircle, Trash2, Table } from 'lucide-react';
import { cacheService } from '../services/CacheService';

type Tab = 'upload' | 'manage' | 'analyze' | 'validation' | 'schema';

export const DataManagementHub: React.FC<{
  onDataReady?: () => void;
  onLaunchApp?: () => void;
}> = ({ onDataReady, onLaunchApp }) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [hasData, setHasData] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  /**
   * Verificar si hay datos en el caché al cargar el componente
   */
  useEffect(() => {
    const checkCacheData = async () => {
      try {
        const metadata = await cacheService.getMetadata();
        const dataExists = metadata.files.length > 0;
        setHasData(dataExists);
        
        if (dataExists) {
          console.log(`✅ Datos detectados en caché: ${metadata.files.length} archivos, ${metadata.totalRecords} registros`);
          // Notificar que hay datos disponibles
          onDataReady?.();
        } else {
          console.log('ℹ️ No hay datos en el caché');
        }
      } catch (error) {
        console.error('Error verificando datos en caché:', error);
        setHasData(false);
      } finally {
        setIsCheckingCache(false);
      }
    };

    checkCacheData();
  }, [onDataReady]);

  const handleUploadComplete = () => {
    setHasData(true);
    setActiveTab('manage');
    onDataReady?.();
  };

  const handleDataChange = async () => {
    // Callback cuando cambian los datos en caché - verificar si realmente hay datos
    try {
      const metadata = await cacheService.getMetadata();
      const dataExists = metadata.files.length > 0;
      setHasData(dataExists);
      
      if (dataExists) {
        onDataReady?.();
      }
    } catch (error) {
      console.error('Error verificando cambios en datos:', error);
    }
  };

  /**
   * Limpia todos los datos del caché
   */
  const handleClearCache = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar TODOS los datos guardados? Esta acción no se puede deshacer.')) {
      try {
        await cacheService.clearCache();
        setHasData(false);
        setActiveTab('upload');
        console.log('✅ Todos los datos han sido eliminados exitosamente.');
        window.alert('✅ Todos los datos han sido eliminados exitosamente.');
      } catch (error) {
        console.error('Error limpiando caché:', error);
        window.alert('❌ Error al eliminar los datos. Verifica la consola.');
      }
    }
  };

  return (
    <div className="data-management-hub">
      <style>{`
        .data-management-hub {
          min-height: 100vh;
          background: #f5f5f5;
        }

        .hub-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hub-header-content {
          flex: 1;
        }

        .hub-header-actions {
          display: flex;
          gap: 15px;
        }

        .clear-cache-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
        }

        .clear-cache-button:hover {
          background: #ff0000;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 68, 68, 0.4);
        }

        .launch-app-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          font-size: 1.05em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .launch-app-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          background: #f8f9fa;
        }

        .launch-app-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .launch-app-button:disabled:hover {
          transform: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .hub-title {
          font-size: 2em;
          font-weight: 700;
          margin: 0 0 10px 0;
        }

        .hub-subtitle {
          font-size: 1.1em;
          opacity: 0.9;
          margin: 0;
        }

        .hub-tabs {
          display: flex;
          gap: 0;
          background: white;
          border-bottom: 2px solid #e0e0e0;
          padding: 0 40px;
        }

        .hub-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 30px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1em;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
          position: relative;
        }

        .hub-tab:hover {
          color: #333;
          background: #f8f9fa;
        }

        .hub-tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: white;
        }

        .hub-tab-badge {
          background: #4CAF50;
          color: white;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 0.75em;
          font-weight: 600;
        }

        .hub-content {
          padding: 40px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .welcome-section {
          background: white;
          border-radius: 12px;
          padding: 60px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .welcome-icon {
          margin: 0 auto 30px;
          color: #667eea;
        }

        .welcome-title {
          font-size: 2em;
          font-weight: 700;
          color: #333;
          margin: 0 0 15px 0;
        }

        .welcome-text {
          font-size: 1.1em;
          color: #666;
          margin: 0 0 30px 0;
          line-height: 1.6;
        }

        .welcome-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin-top: 50px;
          text-align: left;
        }

        .feature-card {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .feature-icon {
          color: #667eea;
          margin-bottom: 15px;
        }

        .feature-title {
          font-size: 1.2em;
          font-weight: 600;
          color: #333;
          margin: 0 0 10px 0;
        }

        .feature-description {
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 30px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }

        .cta-button:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #667eea;
        }

        .stat-label {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
        }
      `}</style>

      <div className="hub-header">
        <div className="hub-header-content">
          <h1 className="hub-title">Sistema de Gestión de Datos SICOP</h1>
          <p className="hub-subtitle">
            Carga, organiza y consolida archivos CSV por año y mes
          </p>
        </div>
        <div className="hub-header-actions">
          <button 
            className="clear-cache-button"
            onClick={handleClearCache}
            title="Eliminar todos los datos guardados"
          >
            <Trash2 size={18} />
            Limpiar Caché
          </button>
          <button 
            className="launch-app-button"
            onClick={onLaunchApp}
            disabled={!hasData || isCheckingCache}
            title={
              isCheckingCache 
                ? 'Verificando datos...' 
                : hasData 
                  ? 'Ir a la aplicación principal' 
                  : 'Primero carga datos para acceder a la aplicación'
            }
          >
            <PlayCircle size={20} />
            {isCheckingCache ? 'Verificando...' : 'Ir a Aplicación Principal'}
          </button>
        </div>
      </div>

      <div className="hub-tabs">
        <button
          className={`hub-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={20} />
          Cargar Archivos
        </button>

        <button
          className={`hub-tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          <FileCheck size={20} />
          Validación
          {hasData && <span className="hub-tab-badge">•</span>}
        </button>

        <button
          className={`hub-tab ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <Table size={20} />
          Análisis de Schema
          {hasData && <span className="hub-tab-badge">•</span>}
        </button>

        <button
          className={`hub-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          <Database size={20} />
          Gestionar Caché
        </button>

        <button
          className={`hub-tab ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          <BarChart3 size={20} />
          Analizar Datos
        </button>
      </div>

      <div className="hub-content">
        {activeTab === 'upload' && (
          <FileUploader onUploadComplete={handleUploadComplete} />
        )}

        {activeTab === 'validation' && (
          <ValidationReportPanel />
        )}

        {activeTab === 'schema' && (
          <SchemaAnalysisPanel />
        )}

        {activeTab === 'manage' && (
          <CacheManager onDataChange={handleDataChange} />
        )}

        {activeTab === 'analyze' && (
          <AdvancedConsolidation />
        )}
      </div>
    </div>
  );
};
