import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Database, 
  BarChart3, 
  Calendar, 
  Filter,
  TrendingUp,
  FileText,
  PlayCircle,
  Settings
} from 'lucide-react';
import { dataLoaderService } from '../services/DataLoaderService';

/**
 * Componente de bienvenida que explica el sistema
 */
export const WelcomeScreen: React.FC<{ 
  onManageData: () => void;
  onLaunchApp: () => void;
}> = ({ onManageData, onLaunchApp }) => {
  const [hasCache, setHasCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkCache();
  }, []);

  const checkCache = async () => {
    try {
      const hasData = await dataLoaderService.hasDataInCache();
      setHasCache(hasData);
      
      if (hasData) {
        const stats = await dataLoaderService.getCacheStats();
        setCacheStats(stats);
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="welcome-screen">
      <style>{`
        .welcome-screen {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .welcome-container {
          max-width: 1200px;
          background: white;
          border-radius: 20px;
          padding: 60px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .welcome-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .welcome-icon {
          color: #667eea;
          margin-bottom: 20px;
        }

        .welcome-title {
          font-size: 3em;
          font-weight: 800;
          color: #333;
          margin: 0 0 15px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-subtitle {
          font-size: 1.3em;
          color: #666;
          margin: 0;
          line-height: 1.6;
        }

        .action-section {
          background: #f8f9fa;
          padding: 40px;
          border-radius: 12px;
          margin-bottom: 50px;
        }

        .action-title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .action-subtitle {
          text-align: center;
          color: #666;
          margin: 0 0 30px 0;
          font-size: 1.1em;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .action-card {
          background: white;
          border: 3px solid #e0e0e0;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          border-color: #667eea;
        }

        .action-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f5f5f5;
        }

        .action-card.disabled:hover {
          transform: none;
          box-shadow: none;
          border-color: #e0e0e0;
        }

        .action-card-icon {
          color: #667eea;
          margin-bottom: 20px;
        }

        .action-card.disabled .action-card-icon {
          color: #999;
        }

        .action-card-title {
          font-size: 1.5em;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
        }

        .action-card-description {
          color: #666;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        .action-card-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 1.1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .action-card-button:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .action-card.disabled .action-card-button {
          background: #999;
          cursor: not-allowed;
        }

        .action-card.disabled .action-card-button:hover {
          transform: none;
          box-shadow: none;
        }

        .cache-info {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px 20px;
          border-radius: 6px;
          margin-top: 20px;
        }

        .cache-info-title {
          font-weight: 600;
          color: #1976d2;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cache-stats {
          color: #0d47a1;
          font-size: 0.95em;
          line-height: 1.8;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-bottom: 50px;
        }

        .feature-card {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
          border-color: #667eea;
        }

        .feature-icon {
          color: #667eea;
          margin-bottom: 20px;
        }

        .feature-title {
          font-size: 1.3em;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
        }

        .feature-description {
          color: #666;
          line-height: 1.6;
          margin: 0;
        }

        .workflow-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          border-radius: 12px;
          margin-bottom: 50px;
          color: white;
        }

        .workflow-title {
          font-size: 1.8em;
          font-weight: 700;
          margin: 0 0 30px 0;
          text-align: center;
        }

        .workflow-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .workflow-step {
          text-align: center;
        }

        .step-number {
          width: 50px;
          height: 50px;
          background: white;
          color: #667eea;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5em;
          font-weight: 700;
          margin: 0 auto 15px;
        }

        .step-icon {
          margin-bottom: 15px;
        }

        .step-title {
          font-weight: 600;
          margin-bottom: 8px;
        }

        .step-description {
          font-size: 0.9em;
          opacity: 0.9;
        }

        .benefits-section {
          margin-bottom: 50px;
        }

        .benefits-title {
          font-size: 1.8em;
          font-weight: 700;
          color: #333;
          margin: 0 0 30px 0;
          text-align: center;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .benefit-item {
          display: flex;
          align-items: start;
          gap: 15px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
        }

        .benefit-icon {
          color: #4CAF50;
          flex-shrink: 0;
        }

        .benefit-text {
          flex: 1;
        }

        .benefit-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }

        .benefit-description {
          color: #666;
          font-size: 0.95em;
          line-height: 1.5;
        }

        .cta-section {
          text-align: center;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 1.2em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .workflow-steps {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .welcome-container {
            padding: 40px 30px;
          }
          
          .features-grid,
          .workflow-steps,
          .benefits-grid {
            grid-template-columns: 1fr;
          }
          
          .welcome-title {
            font-size: 2em;
          }
        }
      `}</style>

      <div className="welcome-container">
        <div className="welcome-header">
          <Database size={80} className="welcome-icon" />
          <h1 className="welcome-title">Sistema de Análisis SICOP</h1>
          <p className="welcome-subtitle">
            Sistema integrado para gestión de datos y análisis de licitaciones
          </p>
        </div>

        {/* Sección de Acciones Principales */}
        <div className="action-section">
          <h2 className="action-title">¿Qué deseas hacer?</h2>
          <p className="action-subtitle">
            Elige una opción para comenzar
          </p>

          <div className="action-buttons">
            {/* Opción 1: Gestionar Datos */}
            <div className="action-card" onClick={onManageData}>
              <Settings size={64} className="action-card-icon" />
              <h3 className="action-card-title">Gestionar Datos</h3>
              <p className="action-card-description">
                Carga, organiza y consolida archivos CSV por año y mes.
                Actualiza datos periódicamente.
              </p>
              <button className="action-card-button">
                <Upload size={20} />
                Ir a Gestión de Datos
              </button>
            </div>

            {/* Opción 2: Ir a Aplicación */}
            <div 
              className={`action-card ${!hasCache ? 'disabled' : ''}`}
              onClick={hasCache ? onLaunchApp : undefined}
            >
              <PlayCircle size={64} className="action-card-icon" />
              <h3 className="action-card-title">Ir a Aplicación</h3>
              <p className="action-card-description">
                Accede a la aplicación principal de análisis y visualización
                de licitaciones.
              </p>
              <button className="action-card-button">
                <BarChart3 size={20} />
                {hasCache ? 'Lanzar Aplicación' : 'Requiere Datos'}
              </button>
              
              {hasCache && !checking && cacheStats && (
                <div className="cache-info">
                  <div className="cache-info-title">
                    <Database size={18} />
                    Datos en Cache
                  </div>
                  <div className="cache-stats">
                    ✓ {cacheStats.totalFiles} archivos cargados<br />
                    ✓ {cacheStats.totalRecords.toLocaleString()} registros totales<br />
                    ✓ {cacheStats.types.length} tipos de datos<br />
                    ✓ Años: {cacheStats.years.join(', ')}
                  </div>
                </div>
              )}
              
              {!hasCache && !checking && (
                <div className="cache-info" style={{ background: '#fff3e0', borderLeftColor: '#ff9800' }}>
                  <div className="cache-info-title" style={{ color: '#e65100' }}>
                    <FileText size={18} />
                    Sin datos
                  </div>
                  <div className="cache-stats" style={{ color: '#e65100' }}>
                    ⚠️ Primero debes cargar archivos CSV en "Gestionar Datos"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <Upload size={48} className="feature-icon" />
            <h3 className="feature-title">Carga Fácil</h3>
            <p className="feature-description">
              Arrastra y suelta archivos CSV. El sistema detecta automáticamente el tipo
              y te permite organizarlos por periodo.
            </p>
          </div>

          <div className="feature-card">
            <Database size={48} className="feature-icon" />
            <h3 className="feature-title">Almacenamiento Inteligente</h3>
            <p className="feature-description">
              Los datos se guardan en caché local usando IndexedDB para acceso rápido
              y persistente.
            </p>
          </div>

          <div className="feature-card">
            <BarChart3 size={48} className="feature-icon" />
            <h3 className="feature-title">Análisis Avanzado</h3>
            <p className="feature-description">
              Analiza licitaciones, proveedores, contratos y tendencias con herramientas
              visuales interactivas.
            </p>
          </div>
        </div>

        <div className="workflow-section">
          <h2 className="workflow-title">¿Cómo funciona?</h2>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <Upload size={32} className="step-icon" style={{ margin: '0 auto 15px' }} />
              <div className="step-title">Cargar</div>
              <div className="step-description">
                Sube archivos CSV desde tu computadora
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">2</div>
              <Calendar size={32} className="step-icon" style={{ margin: '0 auto 15px' }} />
              <div className="step-title">Organizar</div>
              <div className="step-description">
                Asigna año y mes a cada archivo
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">3</div>
              <Filter size={32} className="step-icon" style={{ margin: '0 auto 15px' }} />
              <div className="step-title">Consolidar</div>
              <div className="step-description">
                Los datos se consolidan automáticamente
              </div>
            </div>

            <div className="workflow-step">
              <div className="step-number">4</div>
              <TrendingUp size={32} className="step-icon" style={{ margin: '0 auto 15px' }} />
              <div className="step-title">Analizar</div>
              <div className="step-description">
                Usa la aplicación para análisis profundos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
