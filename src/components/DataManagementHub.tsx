/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Hub de Gestión de Datos
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useEffect } from 'react';
import { FileUploader } from './FileUploader';
import { CacheManager } from './CacheManager';
import { AdvancedConsolidation } from './AdvancedConsolidation';
import { ValidationReportPanel } from './ValidationReportPanel';
import { SchemaAnalysisPanel } from './SchemaAnalysisPanel';
import { GuidedTour, TourStep } from './GuidedTour';
import { Upload, Database, BarChart3, FileCheck, PlayCircle, Trash2, Table, Home } from 'lucide-react';
import { cacheService } from '../services/CacheService';

type Tab = 'upload' | 'manage' | 'analyze' | 'validation' | 'schema';

export const DataManagementHub: React.FC<{
  onDataReady?: () => void;
  onLaunchApp?: () => void;
  onGoBack?: () => void;
  startTour?: boolean;
  onTourComplete?: () => void;
}> = ({ onDataReady, onLaunchApp, onGoBack, startTour = false, onTourComplete }) => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [hasData, setHasData] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  /**
   * Iniciar tour guiado cuando se solicita
   */
  useEffect(() => {
    if (startTour && !isCheckingCache) {
      // Pequeño delay para que el componente se renderice completamente
      const timer = setTimeout(() => {
        setShowTour(true);
        setActiveTab('upload'); // Asegurar que empieza en la primera pestaña
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [startTour, isCheckingCache]);

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

  /**
   * Definición de pasos del tour guiado
   */
  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '🎓 Bienvenido al Sistema de Gestión de Datos SICOP',
      content: (
        <div>
          <p><strong>Este tour te mostrará el flujo completo de trabajo:</strong></p>
          <ol style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>📁 <strong>Cargar</strong> archivos CSV</li>
            <li>✅ <strong>Validar</strong> datos (análisis general)</li>
            <li>🔍 <strong>Schema</strong> (análisis detallado si hay errores)</li>
            <li>� <strong>Cache</strong> (revisar datos históricos)</li>
            <li>📊 <strong>Análisis</strong> (exportar - opcional)</li>
            <li>🗑️ <strong>Limpiar</strong> cache cuando sea necesario</li>
            <li>🚀 <strong>Lanzar</strong> aplicación principal</li>
          </ol>
          <p style={{ marginTop: '15px', fontSize: '0.9em', opacity: 0.8 }}>
            💡 <em>Seguiremos el flujo profesional de trabajo con datos.</em>
          </p>
        </div>
      ),
      position: 'center'
    },
    {
      id: 'upload-tab',
      title: '📁 Paso 1: Cargar Archivos CSV',
      content: (
        <div>
          <p><strong>Todo empieza aquí: carga tus archivos CSV de SICOP.</strong></p>
          <p>Funcionalidades:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>✨ Arrastra y suelta archivos CSV</li>
            <li>📂 Selecciona múltiples archivos a la vez</li>
            <li>⚡ Progreso de carga en tiempo real</li>
            <li>💾 Guardado automático en caché</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            � <em>Los datos quedan disponibles para análisis inmediato.</em>
          </p>
        </div>
      ),
      targetSelector: '[data-tour="upload-tab"]',
      position: 'bottom'
    },
    {
      id: 'upload-area',
      title: '📤 Zona de Carga - Tipos de Archivos',
      content: (
        <div>
          <p><strong>Aquí arrastras tus archivos CSV de SICOP.</strong></p>
          <p>Archivos soportados:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>🏛️ <strong>Carteles</strong> - Licitaciones públicas</li>
            <li>📄 <strong>Contratos</strong> - Contratos adjudicados</li>
            <li>🚫 <strong>Sanciones</strong> - Proveedores sancionados</li>
            <li>📨 <strong>Invitaciones</strong> - Procedimientos por invitación</li>
            <li>🗳️ <strong>Votaciones</strong> - Resultados de votaciones</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            💡 <em>El sistema detecta automáticamente el tipo de cada archivo.</em>
          </p>
        </div>
      ),
      targetSelector: '.file-uploader',
      position: 'right'
    },
    {
      id: 'validation-tab',
      title: '✅ Paso 2: Validación - Análisis General',
      content: (
        <div>
          <p><strong>IMPORTANTE: Después de cargar, siempre revisa la validación primero.</strong></p>
          <p>Aquí verás el análisis general de calidad:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>⚠️ Campos vacíos o incompletos</li>
            <li>� Errores de formato</li>
            <li>⚡ Registros duplicados</li>
            <li>� Estadísticas de calidad general</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#ff6b6b' }}>
            � <em>Si hay muchos errores, pasa a la pestaña "Schema" para análisis detallado.</em>
          </p>
        </div>
      ),
      targetSelector: '[data-tour="validation-tab"]',
      position: 'bottom',
      onEnter: () => setActiveTab('validation')
    },
    {
      id: 'schema-tab',
      title: '� Paso 3: Análisis de Schema - Diagnóstico Profundo',
      content: (
        <div>
          <p><strong>Si la validación muestra errores, usa esta pestaña para identificar QUÉ está pasando.</strong></p>
          <p>Análisis detallado por archivo:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>📋 Estructura de columnas detectadas</li>
            <li>🔢 Tipos de datos por campo</li>
            <li>📊 Valores únicos y estadísticas</li>
            <li>⚠️ Inconsistencias en el schema</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            � <em>Te ayuda a identificar problemas en la estructura de los archivos CSV.</em>
          </p>
        </div>
      ),
      targetSelector: '[data-tour="schema-tab"]',
      position: 'bottom',
      onEnter: () => setActiveTab('schema')
    },
    {
      id: 'manage-tab',
      title: '� Paso 4: Gestionar Cache - Datos Históricos',
      content: (
        <div>
          <p><strong>Aquí revisas TODOS los datos guardados: actuales e históricos.</strong></p>
          <p>Información disponible:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>� Lista completa de archivos cargados</li>
            <li>📅 Fechas de carga de cada archivo</li>
            <li>🔢 Número de registros por tipo</li>
            <li>💾 Tamaño total del caché</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            � <em>Útil para verificar qué datos tienes disponibles para análisis.</em>
          </p>
        </div>
      ),
      targetSelector: '[data-tour="manage-tab"]',
      position: 'bottom',
      onEnter: () => setActiveTab('manage')
    },
    {
      id: 'cache-manager',
      title: '📂 Vista Detallada del Cache',
      content: (
        <div>
          <p><strong>Detalle de cada archivo guardado en el caché:</strong></p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>🏷️ Tipo de archivo (Cartel, Contrato, etc.)</li>
            <li>🔢 Cantidad exacta de registros</li>
            <li>📊 Porcentaje del total de datos</li>
            <li>🗑️ Eliminar archivos individuales si es necesario</li>
          </ul>
        </div>
      ),
      targetSelector: '.cache-manager',
      position: 'left'
    },
    {
      id: 'analyze-tab',
      title: '📈 Paso 5: Análisis de Datos (Opcional)',
      content: (
        <div>
          <p><strong>Esta pestaña es OPCIONAL: úsala para exportar o transformar datos.</strong></p>
          <p>Funciones avanzadas:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>📥 Exportar datos consolidados (CSV/Excel)</li>
            <li>📊 Generar reportes personalizados</li>
            <li>🔍 Aplicar filtros y transformaciones</li>
            <li>📈 Visualizar estadísticas agregadas</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            💡 <em>No es necesario para continuar a la aplicación principal.</em>
          </p>
        </div>
      ),
      targetSelector: '[data-tour="analyze-tab"]',
      position: 'bottom',
      onEnter: () => setActiveTab('analyze')
    },
    {
      id: 'clear-cache-button',
      title: '🗑️ Paso 6: Limpiar Cache',
      content: (
        <div>
          <p><strong>Usa este botón cuando necesites empezar de cero.</strong></p>
          <p>¿Cuándo limpiar el caché?</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>🔄 Tienes nuevos archivos con datos actualizados</li>
            <li>⚠️ Los datos actuales tienen muchos errores</li>
            <li>� Quieres liberar espacio en el navegador</li>
            <li>🔧 Necesitas empezar un análisis completamente nuevo</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#ff6b6b' }}>
            ⚠️ <em>CUIDADO: Esta acción elimina TODOS los datos guardados y NO se puede deshacer.</em>
          </p>
        </div>
      ),
      targetSelector: '.clear-cache-button',
      position: 'bottom'
    },
    {
      id: 'app-button',
      title: '🚀 Paso 7: Lanzar Aplicación Principal',
      content: (
        <div>
          <p><strong>Una vez validados tus datos, este botón te lleva a los dashboards.</strong></p>
          <p>En la aplicación principal podrás:</p>
          <ul style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px' }}>
            <li>📊 Ver dashboards interactivos con gráficas</li>
            <li>🏛️ Analizar instituciones y proveedores</li>
            <li>📈 Generar reportes ejecutivos avanzados</li>
            <li>🔍 Explorar datos con filtros dinámicos</li>
            <li>📉 Análisis de tendencias y estadísticas</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#667eea' }}>
            ✅ <em>El botón se activa automáticamente cuando hay datos en caché.</em>
          </p>
        </div>
      ),
      targetSelector: '.launch-app-button',
      position: 'bottom'
    },
    {
      id: 'complete',
      title: '🎉 ¡Tour Completado!',
      content: (
        <div>
          <p><strong>Ahora conoces el flujo profesional de trabajo con datos SICOP.</strong></p>
          <p style={{ marginTop: '15px' }}>Resumen del flujo:</p>
          <ol style={{ textAlign: 'left', marginLeft: '20px', marginTop: '10px', lineHeight: '1.8' }}>
            <li><strong>Cargar</strong> → Sube tus CSV</li>
            <li><strong>Validar</strong> → Revisa calidad general</li>
            <li><strong>Schema</strong> → Diagnóstico si hay errores</li>
            <li><strong>Cache</strong> → Ver datos históricos</li>
            <li><strong>Análisis</strong> → Exportar (opcional)</li>
            <li><strong>Limpiar</strong> → Cuando sea necesario</li>
            <li><strong>Lanzar</strong> → Ir a dashboards</li>
          </ol>
          <p style={{ marginTop: '15px', fontSize: '0.95em', fontWeight: 'bold', color: '#667eea' }}>
            ✨ ¡Estás listo para trabajar profesionalmente con tus datos!
          </p>
        </div>
      ),
      position: 'center'
    }
  ];

  /**
   * Manejar finalización del tour
   */
  const handleTourComplete = () => {
    setShowTour(false);
    setActiveTab('upload'); // Volver a la pestaña inicial
    onTourComplete?.();
    console.log('✅ Tour guiado completado');
  };

  return (
    <div className="data-management-hub">
      <style>{`
        .data-management-hub {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          position: relative;
          overflow-x: hidden;
        }

        /* Background decorative elements */
        .data-management-hub::before {
          content: '';
          position: fixed;
          top: -50%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: float 20s ease-in-out infinite;
        }

        .data-management-hub::after {
          content: '';
          position: fixed;
          bottom: -50%;
          left: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(118, 75, 162, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: float 25s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.05); }
        }

        .hub-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 25%, #0369a1 50%, #075985 75%, #0c4a6e 100%);
          color: white;
          padding: 40px 50px;
          box-shadow: 0 10px 30px rgba(30, 58, 138, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 10;
          border-bottom: 4px solid rgba(255, 255, 255, 0.15);
        }

        .hub-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(14, 165, 233, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        .hub-header-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .hub-header-actions {
          display: flex;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .back-home-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 0.95em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .back-home-button:hover {
          background: white;
          color: #1e3a8a;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.4);
          border-color: white;
        }

        .clear-cache-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.95em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
        }

        .clear-cache-button:hover {
          background: linear-gradient(135deg, #ff0000 0%, #aa0000 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(255, 68, 68, 0.5);
        }

        .launch-app-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: white;
          color: #1e3a8a;
          border: 2px solid white;
          border-radius: 12px;
          font-size: 1.05em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;
        }

        .launch-app-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(30, 58, 138, 0.1), transparent);
          transition: left 0.5s;
        }

        .launch-app-button:hover::before {
          left: 100%;
        }

        .launch-app-button:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 10px 30px rgba(255, 255, 255, 0.5);
          background: #f8f9ff;
        }

        .launch-app-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.5);
        }

        .launch-app-button:disabled:hover {
          transform: none;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
        }

        .hub-title {
          font-size: 2.2em;
          font-weight: 800;
          margin: 0 0 10px 0;
          letter-spacing: -0.5px;
          color: white;
          text-shadow: 
            0 2px 10px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(30, 58, 138, 0.5),
            0 0 60px rgba(14, 74, 110, 0.3);
        }

        .hub-subtitle {
          font-size: 1.15em;
          opacity: 0.95;
          margin: 0;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.2),
            0 0 20px rgba(30, 58, 138, 0.3);
        }

        .hub-tabs {
          display: flex;
          gap: 0;
          background: white;
          border-bottom: 2px solid #e0e7ef;
          padding: 0 50px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 5;
        }

        .hub-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 32px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1em;
          font-weight: 600;
          color: #64748b;
          border-bottom: 3px solid transparent;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .hub-tab::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #1e3a8a, #0c4a6e);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hub-tab:hover {
          color: #1e3a8a;
          background: linear-gradient(180deg, rgba(30, 58, 138, 0.08) 0%, rgba(30, 58, 138, 0.02) 100%);
        }

        .hub-tab:hover::before {
          transform: translateX(-50%) scaleX(0.5);
        }

        .hub-tab.active {
          color: #1e3a8a;
          border-bottom-color: transparent;
          background: linear-gradient(180deg, rgba(30, 58, 138, 0.12) 0%, rgba(30, 58, 138, 0.04) 100%);
          font-weight: 700;
        }

        .hub-tab.active::before {
          transform: translateX(-50%) scaleX(1);
        }

        .hub-tab-badge {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
        }

        .hub-content {
          padding: 50px 60px;
          max-width: 1600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 0 0 16px 16px;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.03);
          min-height: 500px;
        }

        .welcome-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          border-radius: 20px;
          padding: 70px;
          text-align: center;
          box-shadow: 0 8px 24px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.1);
          position: relative;
          overflow: hidden;
        }

        .welcome-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .welcome-icon {
          margin: 0 auto 30px;
          color: #1e3a8a;
          filter: drop-shadow(0 4px 12px rgba(30, 58, 138, 0.3));
          position: relative;
          z-index: 1;
        }

        .welcome-title {
          font-size: 2.2em;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 15px 0;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 1;
        }

        .welcome-text {
          font-size: 1.15em;
          color: #64748b;
          margin: 0 0 30px 0;
          line-height: 1.7;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 1;
        }

        .welcome-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          margin-top: 50px;
          text-align: left;
          position: relative;
          z-index: 1;
        }

        .feature-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          padding: 30px;
          border-radius: 16px;
          border-left: 5px solid #667eea;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.08);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(102, 126, 234, 0.1);
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.4s;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
          border-left-width: 5px;
        }

        .feature-card:hover::before {
          opacity: 1;
        }

        .feature-icon {
          color: #667eea;
          margin-bottom: 15px;
          filter: drop-shadow(0 2px 6px rgba(102, 126, 234, 0.25));
          position: relative;
          z-index: 1;
        }

        .feature-title {
          font-size: 1.25em;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
          position: relative;
          z-index: 1;
        }

        .feature-description {
          color: #64748b;
          line-height: 1.6;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.15em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 32px rgba(102, 126, 234, 0.5);
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 35px;
        }

        .stat-box {
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.08);
          border-left: 5px solid #667eea;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .stat-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        }

        .stat-label {
          font-size: 0.95em;
          color: #64748b;
          margin-bottom: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 2em;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .data-management-hub {
            padding: 30px;
          }

          .hub-header {
            padding: 30px 40px;
          }

          .hub-title {
            font-size: 1.8em;
          }

          .hub-tabs {
            padding: 0 30px;
          }

          .hub-content {
            padding: 35px 40px;
          }

          .welcome-section {
            padding: 50px 40px;
          }

          .welcome-features {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .data-management-hub {
            padding: 20px;
            border-radius: 0;
          }

          .hub-header {
            padding: 25px 20px;
            flex-direction: column;
            gap: 20px;
          }

          .hub-header-content {
            text-align: center;
          }

          .hub-header-actions {
            flex-direction: column;
            width: 100%;
          }

          .back-home-button,
          .clear-cache-button,
          .launch-app-button {
            width: 100%;
            justify-content: center;
          }

          .hub-title {
            font-size: 1.5em;
          }

          .hub-subtitle {
            font-size: 1em;
          }

          .hub-tabs {
            padding: 0 15px;
            overflow-x: auto;
            flex-wrap: nowrap;
          }

          .hub-tab {
            padding: 16px 20px;
            font-size: 0.9em;
            white-space: nowrap;
          }

          .hub-content {
            padding: 25px 20px;
          }

          .welcome-section {
            padding: 35px 25px;
          }

          .welcome-title {
            font-size: 1.6em;
          }

          .welcome-text {
            font-size: 1em;
          }

          .quick-stats {
            grid-template-columns: 1fr;
          }

          .stat-value {
            font-size: 1.6em;
          }
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
            className="back-home-button"
            onClick={onGoBack}
            title="Volver a la pantalla de inicio"
          >
            <Home size={18} />
            Volver al Inicio
          </button>
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
            title="Ir a la aplicación principal"
          >
            <PlayCircle size={20} />
            Ir a Aplicación Principal
          </button>
        </div>
      </div>

      <div className="hub-tabs">
        <button
          className={`hub-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
          data-tour="upload-tab"
        >
          <Upload size={20} />
          Cargar Archivos
        </button>

        <button
          className={`hub-tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
          data-tour="validation-tab"
        >
          <FileCheck size={20} />
          Validación
          {hasData && <span className="hub-tab-badge">•</span>}
        </button>

        <button
          className={`hub-tab ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
          data-tour="schema-tab"
        >
          <Table size={20} />
          Análisis de Schema
          {hasData && <span className="hub-tab-badge">•</span>}
        </button>

        <button
          className={`hub-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
          data-tour="manage-tab"        >
          <Database size={20} />
          Gestionar Caché
        </button>

        <button
          className={`hub-tab ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyze')}
          data-tour="analyze-tab"
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

      {/* Tour Guiado */}
      {showTour && (
        <GuidedTour 
          steps={tourSteps}
          onComplete={handleTourComplete}
          onSkip={handleTourComplete}
          autoStart={true}
        />
      )}
    </div>
  );
};
