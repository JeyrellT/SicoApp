// ================================
// COMPONENTE DE CARGA DE DATOS
// ================================
// Muestra el progreso de carga y estadísticas iniciales

import React from 'react';
import { useSicop } from '../context/SicopContext';
import { 
  Loader, 
  CheckCircle2, 
  AlertTriangle, 
  PlayCircle,
  Database,
  Sparkles,
  BarChart3,
  Rocket,
  FileCode,
  Compass,
  Puzzle,
  BrainCircuit
} from 'lucide-react';

interface LoadingScreenProps {
  onDataLoaded?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onDataLoaded }) => {
  const { 
    isLoaded, 
    isLoading, 
    loadingProgress,
    loadingStage,
    error, 
    cargarDatos, 
    limpiarError,
    estadisticasGenerales 
  } = useSicop();

  React.useEffect(() => {
    if (isLoaded && onDataLoaded) {
      onDataLoaded();
    }
  }, [isLoaded, onDataLoaded]);

  const handleLoadData = async () => {
    limpiarError();
    try {
      await cargarDatos();
    } catch (err) {
      console.error('Error iniciando carga:', err);
    }
  };

  // ================================
  // STYLES - FULL HD MODERN
  // ================================
  const styles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(30px); filter: blur(5px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(30, 58, 138, 0.3); }
      50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(30, 58, 138, 0.4); }
    }

    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    .loading-screen-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
      animation: fadeIn 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
    }

    .loading-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 25%, #0369a1 50%, #075985 75%, #0c4a6e 100%);
      padding: 40px 50px;
      box-shadow: 0 15px 40px rgba(30, 58, 138, 0.35);
      border-bottom: 5px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      text-align: center;
    }

    .loading-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 15% 40%, rgba(59, 130, 246, 0.25) 0%, transparent 40%), 
        radial-gradient(circle at 85% 60%, rgba(14, 165, 233, 0.2) 0%, transparent 40%);
      pointer-events: none;
      animation: shimmer 8s linear infinite;
    }

    .loading-header-content {
      position: relative;
      z-index: 1;
    }

    .loading-title {
      margin: 0 0 12px 0;
      color: white;
      font-size: 38px;
      font-weight: 800;
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.25);
      letter-spacing: -1px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .loading-subtitle {
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-size: 18px;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .loading-content-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 50px;
      width: 100%;
    }

    .loading-box {
      background: white;
      padding: 50px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.12);
      width: 100%;
      animation: scaleIn 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
      border: 1px solid rgba(0,0,0,0.05);
    }

    .retry-button {
      background: linear-gradient(135deg, #1e3a8a, #0c4a6e);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .retry-button:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 30px rgba(30, 58, 138, 0.4);
    }

    .icon-wrapper.success {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
      color: #10b981;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 24px;
      margin-bottom: 35px;
      animation: fadeIn 0.8s ease-out 0.3s both;
    }

    .stat-item {
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.04), rgba(12, 74, 110, 0.04));
      border-radius: 16px;
      padding: 25px;
      text-align: center;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.3s ease;
    }

    .stat-item:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.07);
      border-color: rgba(30, 58, 138, 0.1);
    }

    .stat-value {
      font-size: 34px;
      font-weight: 800;
      color: #1e3a8a;
      line-height: 1.1;
    }

    .stat-label {
      font-size: 14px;
      color: #4b5563;
      margin-top: 8px;
      font-weight: 600;
    }

    .continue-button {
      background: linear-gradient(135deg, #1e3a8a, #0c4a6e);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 17px;
      font-weight: 700;
      box-shadow: 0 8px 20px rgba(30, 58, 138, 0.3);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .continue-button:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 30px rgba(30, 58, 138, 0.4);
    }

    .loading-content-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      width: 100%;
    }

    .progress-bar-container {
      width: 100%;
      height: 24px;
      background-color: #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 15px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }

    .progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #1e3a8a, #0369a1, #0c4a6e);
      background-size: 200% 200%;
      transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
      border-radius: 12px;
      animation: shimmer 2s linear infinite;
    }

    .progress-text {
      margin-top: 15px;
      color: #1e3a8a;
      font-weight: 700;
      font-size: 18px;
      text-align: center;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 30px;
    }

    .step-item {
      padding: 16px;
      border-radius: 12px;
      background: #f3f4f6;
      border: 2px solid #e5e7eb;
      color: #9ca3af;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      transition: all 0.4s ease;
      font-weight: 600;
    }

    .step-item.active {
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.08), rgba(12, 74, 110, 0.08));
      border-color: #1e3a8a;
      color: #1e3a8a;
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.05);
    }

    .step-icon {
      margin-bottom: 10px;
    }

    .initial-screen-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 30px;
      width: min(100%, 1200px);
      animation: fadeIn 0.8s ease-out;
    }

    .main-card, .info-card {
      background: white;
      padding: 45px;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.05);
    }

    .main-card-subtitle {
      font-size: 16px;
      color: #1e3a8a;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .main-card-title {
      margin: 0;
      color: #1e293b;
      font-size: 42px;
      line-height: 1.2;
      font-weight: 800;
      margin-bottom: 20px;
    }

    .main-card-description {
      margin-top: 15px;
      color: #4b5563;
      line-height: 1.8;
      font-size: 17px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 30px;
    }

    .feature-item {
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.04), rgba(12, 74, 110, 0.04));
      border: 1px solid rgba(30, 58, 138, 0.1);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }
    
    .feature-icon {
      font-size: 28px;
    }

    .feature-label {
      font-size: 13px;
      color: #4b5563;
      margin-top: 8px;
      font-weight: 600;
    }

    .feature-value {
      font-size: 14px;
      color: #1e293b;
      margin-top: 5px;
      font-weight: 500;
    }

    .start-button-container {
      display: flex;
      gap: 16px;
      margin-top: 35px;
      align-items: center;
    }

    .start-button {
      background: linear-gradient(135deg, #1e3a8a, #0c4a6e);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 17px;
      font-weight: 700;
      box-shadow: 0 8px 20px rgba(30, 58, 138, 0.3);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .start-button:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 30px rgba(30, 58, 138, 0.4);
    }

    .data-source-info {
      font-size: 14px;
      color: #4b5563;
      font-weight: 500;
    }

    .data-source-info code {
      background: rgba(30, 58, 138, 0.1);
      padding: 3px 8px;
      border-radius: 6px;
      font-family: 'Fira Code', monospace;
      color: #1e3a8a;
      font-weight: 600;
    }

    .info-card-title {
      font-size: 18px;
      color: #1e293b;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .info-list {
      margin: 0;
      padding-left: 25px;
      color: #4b5563;
      line-height: 2;
      font-size: 15px;
      list-style-type: '✓ ';
    }

    .info-list li {
      padding-left: 10px;
    }

    .info-note {
      margin-top: 25px;
      font-size: 14px;
      color: #4b5563;
      background: rgba(30, 58, 138, 0.05);
      padding: 15px;
      border-radius: 12px;
      border-left: 4px solid #1e3a8a;
      line-height: 1.7;
    }
  `;

  if (error) {
    return (
      <div className="loading-screen-container">
        {/* Header estilizado */}
        <div className="loading-header">
          <div className="loading-header-content">
            <h1 className="loading-title">
              ⚠️ Error de Carga
            </h1>
            <p className="loading-subtitle">
              Ocurrió un problema al cargar los datos
            </p>
          </div>
        </div>

        {/* Contenido de error */}
        <div className="loading-content-wrapper">
          <div className="loading-box">
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px'
            }}>
              ⚠️
            </div>
            <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.6' }}>
              {error}
            </p>
            <button
              onClick={handleLoadData}
              className="retry-button"
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoaded) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-screen-container">
          <div className="loading-header">
            <div className="loading-header-content">
              <h1 className="loading-title">
                <CheckCircle2 size={32} />
                Datos Cargados Exitosamente
              </h1>
              <p className="loading-subtitle">
                El sistema está listo para el análisis
              </p>
            </div>
          </div>

          <div className="loading-content-wrapper">
            <div className="loading-box" style={{ maxWidth: '800px' }}>
              <div className="icon-wrapper success">
                <CheckCircle2 size={45} />
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{estadisticasGenerales.carteles?.toLocaleString() || 0}</div>
                  <div className="stat-label">Carteles</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{estadisticasGenerales.contratos?.toLocaleString() || 0}</div>
                  <div className="stat-label">Contratos</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{estadisticasGenerales.proveedores?.toLocaleString() || 0}</div>
                  <div className="stat-label">Proveedores</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{estadisticasGenerales.instituciones?.toLocaleString() || 0}</div>
                  <div className="stat-label">Instituciones</div>
                </div>
              </div>

              <p className="error-message" style={{ fontSize: '17px', marginBottom: '35px' }}>
                Todos los datos han sido procesados y están listos para consultas y análisis.
              </p>
              
              <button onClick={onDataLoaded} className="continue-button">
                <Rocket size={20} />
                Continuar a la Aplicación
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    const steps = [
      { label: 'Abrir', icon: <FileCode size={24} />, threshold: 5 },
      { label: 'Categorizar', icon: <Compass size={24} />, threshold: 25 },
      { label: 'Identificar', icon: <Puzzle size={24} />, threshold: 60 },
      { label: 'Limpiar', icon: <Sparkles size={24} />, threshold: 75 }
    ];

    return (
      <>
        <style>{styles}</style>
        <div className="loading-screen-container">
          <div className="loading-header">
            <div className="loading-header-content">
              <h1 className="loading-title">
                <Loader size={32} className="loader-icon" />
                Cargando Datos SICOP
              </h1>
              <p className="loading-subtitle">
                Preparando sistema de análisis de contrataciones públicas
              </p>
            </div>
          </div>

          <div className="loading-content-wrapper">
            <div className="loading-box" style={{ maxWidth: '800px' }}>
              <div style={{ color: '#4b5563', marginBottom: '24px', fontSize: '16px', textAlign: 'center', fontWeight: '600' }}>
                {loadingStage || 'Preparando...'}
              </div>
              
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${loadingProgress}%` }} />
              </div>
              <div className="progress-text">
                {loadingProgress}% completado
              </div>

              <div className="steps-grid">
                {steps.map((step, idx) => {
                  const active = loadingProgress >= step.threshold;
                  return (
                    <div key={idx} className={`step-item ${active ? 'active' : ''}`}>
                      <div className="step-icon">{step.icon}</div>
                      <div style={{ fontSize: '14px' }}>{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Estado inicial - pantalla de entrada enriquecida
  return (
    <>
      <style>{styles}</style>
      <div className="loading-screen-container">
        <div className="loading-header">
          <div className="loading-header-content">
            <h1 className="loading-title">Dashboard SICOP</h1>
            <p className="loading-subtitle">
              Inteligencia de Compras Públicas de Costa Rica
            </p>
          </div>
        </div>

        <div className="loading-content-wrapper">
          <div className="initial-screen-grid">
            <div className="main-card">
              <div className="main-card-subtitle">
                Sistema de Análisis
              </div>
              <h2 className="main-card-title">
                Analiza Licitaciones Públicas
              </h2>
              <p className="main-card-description">
                Descubre oportunidades, tendencias y competencia en las compras públicas de Costa Rica con un enfoque moderno y visual. 
                Esta pantalla es el punto de partida del dashboard; aún no se han cargado datos.
              </p>

              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon"><Database size={28} /></div>
                  <div className="feature-label">Fuentes</div>
                  <div className="feature-value">CSV públicos SICOP</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon"><BrainCircuit size={28} /></div>
                  <div className="feature-label">Método</div>
                  <div className="feature-value">Normaliza e indexa</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon"><BarChart3 size={28} /></div>
                  <div className="feature-label">Análisis</div>
                  <div className="feature-value">Tendencias y alertas</div>
                </div>
              </div>

              <div className="start-button-container">
                <button onClick={handleLoadData} className="start-button">
                  <PlayCircle size={20} />
                  Iniciar Carga
                </button>
                <div className="data-source-info">
                  Datos desde <code>public/cleaned</code>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-title">
                ¿Qué hará el cargador?
              </div>
              <ul className="info-list">
                <li>Abrir archivos y detectar codificación</li>
                <li>Categorizar y normalizar cabeceras</li>
                <li>Identificar claves y relaciones</li>
                <li>Limpiar valores y formatos</li>
                <li>Construir índices para búsquedas</li>
                <li>Generar estadísticas base</li>
              </ul>
              <div className="info-note">
                💡 No se muestran datos aún; esta sección explica el proceso que ejecutará el dashboard.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
