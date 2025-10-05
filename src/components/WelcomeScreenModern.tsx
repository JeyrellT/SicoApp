/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Componente de Pantalla de Bienvenida Moderna
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Database, 
  BarChart3, 
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  PlayCircle,
  Settings,
  Check
} from 'lucide-react';
import { dataLoaderService } from '../services/DataLoaderService';

export const WelcomeScreenModern: React.FC<{ 
  onManageData: () => void;
  onLaunchApp: () => void;
}> = ({ onManageData, onLaunchApp }) => {
  const [hasCache, setHasCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [logoError, setLogoError] = useState(false);

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
    <div className="modern-welcome">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .modern-welcome {
          min-height: 100vh;
          background: 
            linear-gradient(135deg, #667eea 0%, #764ba2 100%),
            url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
        }

        .modern-welcome::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 8s ease-in-out infinite;
        }

        .modern-container {
          max-width: 1600px;
          width: 100%;
          background: rgba(255, 255, 255, 0.98);
          border-radius: 35px;
          padding: 60px;
          box-shadow: 
            0 40px 120px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          position: relative;
          z-index: 1;
          animation: scaleIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(20px);
        }

        /* Header Logo */
        .logo-section {
          text-align: center;
          margin-bottom: 50px;
          padding-bottom: 40px;
          position: relative;
          animation: fadeIn 0.8s ease-out;
        }

        .logo-section::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 300px;
          height: 3px;
          background: linear-gradient(90deg, transparent, #667eea, #764ba2, transparent);
        }

        .logo-section img {
          max-width: 220px;
          height: auto;
          display: block;
          margin: 0 auto 25px;
          animation: float 4s ease-in-out infinite;
          filter: drop-shadow(0 15px 30px rgba(102, 126, 234, 0.35));
          transition: all 0.4s ease;
        }

        .logo-section img:hover {
          transform: scale(1.08) rotate(2deg);
        }

        .copyright-badge {
          display: inline-block;
          padding: 12px 28px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border-radius: 50px;
          font-size: 0.95em;
          color: #333;
          font-weight: 600;
          margin-bottom: 10px;
          border: 2px solid rgba(102, 126, 234, 0.2);
          animation: fadeIn 1s ease-out 0.3s both;
        }

        .copyright-badge strong {
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hq-brand {
          font-size: 0.85em;
          color: #666;
          margin-top: 8px;
          font-weight: 500;
          animation: fadeIn 1.2s ease-out 0.5s both;
        }

        /* Hero Section */
        .hero-section {
          text-align: center;
          margin-bottom: 60px;
          animation: fadeIn 1s ease-out 0.4s both;
        }

        .hero-icon-group {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .hero-icon {
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(102, 126, 234, 0.4));
        }

        .hero-icon:nth-child(2) {
          animation-delay: 0.2s;
        }

        .hero-icon:nth-child(3) {
          animation-delay: 0.4s;
        }

        .hero-title {
          font-size: 4em;
          font-weight: 900;
          margin: 0 0 20px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -2px;
          line-height: 1.1;
        }

        .hero-subtitle {
          font-size: 1.5em;
          color: #555;
          margin: 0;
          line-height: 1.6;
          font-weight: 400;
        }

        /* Action Cards */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
          margin-bottom: 60px;
          animation: slideUp 1s ease-out 0.6s both;
        }

        .action-card-modern {
          background: white;
          border-radius: 25px;
          padding: 50px 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          border: 3px solid transparent;
          box-shadow: 
            0 15px 35px rgba(0, 0, 0, 0.1),
            0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .action-card-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(102, 126, 234, 0.15),
            transparent
          );
          transition: left 0.6s;
        }

        .action-card-modern:hover::before {
          left: 100%;
        }

        .action-card-modern:hover {
          transform: translateY(-15px) scale(1.03);
          box-shadow: 
            0 30px 80px rgba(102, 126, 234, 0.3),
            0 0 0 4px rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .action-card-modern.disabled {
          opacity: 0.55;
          cursor: not-allowed;
          background: linear-gradient(135deg, #f5f5f5, #efefef);
        }

        .action-card-modern.disabled:hover {
          transform: none;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          border-color: transparent;
        }

        .action-icon-wrapper {
          width: 100px;
          height: 100px;
          margin: 0 auto 25px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-radius: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 3s ease-in-out infinite;
          transition: all 0.3s ease;
        }

        .action-card-modern:hover .action-icon-wrapper {
          background: linear-gradient(135deg, #667eea, #764ba2);
          transform: rotate(8deg) scale(1.1);
        }

        .action-card-modern:hover .action-icon-wrapper svg {
          color: white !important;
        }

        .action-card-modern.disabled .action-icon-wrapper {
          background: #ddd;
        }

        .card-title {
          font-size: 2em;
          font-weight: 800;
          margin: 0 0 15px 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .action-card-modern.disabled .card-title {
          background: #999;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .card-description {
          color: #666;
          line-height: 1.8;
          margin: 0 0 30px 0;
          font-size: 1.1em;
        }

        .card-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 18px 45px;
          border-radius: 50px;
          font-size: 1.15em;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all 0.4s ease;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          position: relative;
          overflow: hidden;
        }

        .card-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .card-button:hover::before {
          width: 400px;
          height: 400px;
        }

        .card-button:hover {
          transform: scale(1.1);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
        }

        .action-card-modern.disabled .card-button {
          background: linear-gradient(135deg, #999, #777);
          cursor: not-allowed;
          box-shadow: none;
        }

        .action-card-modern.disabled .card-button:hover {
          transform: none;
        }

        /* Cache Info */
        .cache-status {
          margin-top: 25px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(67, 160, 71, 0.1));
          border-radius: 15px;
          border-left: 5px solid #4CAF50;
          animation: fadeIn 0.6s ease-out;
        }

        .cache-status strong {
          color: #2E7D32;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .cache-details {
          color: #388E3C;
          font-size: 0.95em;
          line-height: 1.6;
        }

        /* Features Grid */
        .features-showcase {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-bottom: 50px;
          animation: slideUp 1.2s ease-out 0.8s both;
        }

        .feature-item {
          background: linear-gradient(135deg, #f8f9ff, #ffffff);
          padding: 35px 25px;
          border-radius: 20px;
          text-align: center;
          border: 2px solid rgba(102, 126, 234, 0.1);
          transition: all 0.4s ease;
        }

        .feature-item:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .feature-icon-circle {
          width: 70px;
          height: 70px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 4s ease-in-out infinite;
        }

        .feature-item:nth-child(2) .feature-icon-circle {
          animation-delay: 0.2s;
        }

        .feature-item:nth-child(3) .feature-icon-circle {
          animation-delay: 0.4s;
        }

        .feature-name {
          font-size: 1.3em;
          font-weight: 700;
          color: #333;
          margin: 0 0 10px 0;
        }

        .feature-desc {
          color: #666;
          font-size: 0.95em;
          line-height: 1.6;
        }

        /* Footer */
        .footer-section {
          text-align: center;
          padding-top: 40px;
          border-top: 2px solid rgba(102, 126, 234, 0.1);
          animation: fadeIn 1.4s ease-out 1s both;
        }

        .footer-text {
          color: #666;
          font-size: 0.95em;
          line-height: 1.8;
        }

        .footer-text strong {
          color: #333;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .footer-brand {
          margin-top: 12px;
          font-size: 0.9em;
          color: #999;
          font-style: italic;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .action-grid,
          .features-showcase {
            grid-template-columns: 1fr;
          }
          
          .hero-title {
            font-size: 3em;
          }
        }

        @media (max-width: 768px) {
          .modern-container {
            padding: 40px 30px;
          }

          .hero-title {
            font-size: 2.5em;
          }

          .hero-subtitle {
            font-size: 1.2em;
          }
        }
      `}</style>

      <div className="modern-container">
        {/* Logo y Copyright */}
        <div className="logo-section">
          {!logoError ? (
            <img 
              src={`${process.env.PUBLIC_URL}/logo-hq-analytics.png`}
              alt="HQ Analytics - High Technology Quality" 
              onError={() => {
                console.error('Error loading logo');
                setLogoError(true);
              }}
            />
          ) : (
            <div style={{
              width: '220px',
              height: '220px',
              margin: '0 auto 25px',
              background: 'linear-gradient(135deg, #C5A647 0%, #2C3E50 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'white',
              padding: '30px'
            }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '10px' }}>HQ</div>
              <div style={{ fontSize: '0.9em', textAlign: 'center' }}>High Technology Quality Analytics</div>
            </div>
          )}
          
          <div className="copyright-badge">
            <strong>© 2025 Saenz Fallas S.A.</strong> - Todos los derechos reservados
          </div>
          <div className="hq-brand">
            HQ Analytics™ - High Technology Quality Analytics
          </div>
        </div>

        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-icon-group">
            <Database size={60} className="hero-icon" style={{ color: '#667eea' }} />
            <BarChart3 size={60} className="hero-icon" style={{ color: '#764ba2' }} />
            <TrendingUp size={60} className="hero-icon" style={{ color: '#667eea' }} />
          </div>
          <h1 className="hero-title">Sistema de Análisis SICOP</h1>
          <p className="hero-subtitle">
            Plataforma integral para gestión inteligente y análisis avanzado de licitaciones públicas
          </p>
        </div>

        {/* Action Cards */}
        <div className="action-grid">
          {/* Card 1: Gestionar Datos */}
          <div className="action-card-modern" onClick={onManageData}>
            <div className="action-icon-wrapper">
              <Settings size={50} style={{ color: '#667eea' }} />
            </div>
            <h3 className="card-title">Gestionar Datos</h3>
            <p className="card-description">
              Carga, organiza y consolida archivos CSV por año y mes. 
              Mantén tus datos siempre actualizados con nuestra gestión inteligente.
            </p>
            <button className="card-button">
              <Upload size={22} />
              <span>Ir a Gestión de Datos</span>
            </button>
          </div>

          {/* Card 2: Ir a Aplicación */}
          <div 
            className={`action-card-modern ${!hasCache ? 'disabled' : ''}`}
            onClick={hasCache ? onLaunchApp : undefined}
          >
            <div className="action-icon-wrapper">
              <PlayCircle size={50} style={{ color: hasCache ? '#667eea' : '#999' }} />
            </div>
            <h3 className="card-title">Ir a Aplicación</h3>
            <p className="card-description">
              Accede a la aplicación principal con análisis en tiempo real, 
              visualizaciones interactivas y reportes detallados.
            </p>
            <button className="card-button">
              <BarChart3 size={22} />
              <span>{hasCache ? 'Lanzar Aplicación' : 'Requiere Datos'}</span>
            </button>
            
            {hasCache && !checking && cacheStats && (
              <div className="cache-status">
                <strong>
                  <Check size={18} />
                  Sistema Listo
                </strong>
                <div className="cache-details">
                  {cacheStats.totalRecords?.toLocaleString()} registros disponibles
                  {cacheStats.lastUpdated && ` • Actualizado: ${new Date(cacheStats.lastUpdated).toLocaleDateString()}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="features-showcase">
          <div className="feature-item">
            <div className="feature-icon-circle">
              <Sparkles size={35} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Análisis Inteligente</h4>
            <p className="feature-desc">
              Algoritmos avanzados para detectar patrones y tendencias en tus datos
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-circle">
              <Zap size={35} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Alto Rendimiento</h4>
            <p className="feature-desc">
              Procesamiento ultrarrápido de grandes volúmenes de información
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-circle">
              <Shield size={35} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Datos Seguros</h4>
            <p className="feature-desc">
              Máxima seguridad y privacidad en el manejo de tu información
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <p className="footer-text">
            Desarrollado con excelencia por <strong>Saenz Fallas S.A.</strong>
          </p>
          <p className="footer-text">
            HQ Analytics™ - Sistema de análisis de alta calidad tecnológica
          </p>
          <p className="footer-brand">
            Software de uso exclusivo • Todos los derechos reservados • 2025
          </p>
        </div>
      </div>
    </div>
  );
};
