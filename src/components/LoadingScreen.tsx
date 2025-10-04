// ================================
// COMPONENTE DE CARGA DE DATOS
// ================================
// Muestra el progreso de carga y estadísticas iniciales

import React from 'react';
import { useSicop } from '../context/SicopContext';

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

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '20px' }}>
            ⚠️ Error de Carga
          </h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            {error}
          </p>
          <button
            onClick={handleLoadData}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#27ae60', marginBottom: '30px' }}>
            ✅ Datos Cargados Exitosamente
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ padding: '15px', background: '#ecf0f1', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {estadisticasGenerales.carteles?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Carteles</div>
            </div>
            
            <div style={{ padding: '15px', background: '#ecf0f1', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {estadisticasGenerales.contratos?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Contratos</div>
            </div>
            
            <div style={{ padding: '15px', background: '#ecf0f1', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {estadisticasGenerales.proveedores?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Proveedores</div>
            </div>
            
            <div style={{ padding: '15px', background: '#ecf0f1', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                {estadisticasGenerales.instituciones?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Instituciones</div>
            </div>
          </div>

          <p style={{ color: '#666', marginBottom: '20px' }}>
            El sistema está listo para consultas y análisis
          </p>
          
          <button
            onClick={onDataLoaded}
            style={{
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🚀 Continuar a la Aplicación
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '720px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '10px', color: '#2c3e50' }}>📊 Cargando Datos SICOP</h2>
          <div style={{ color: '#7f8c8d', marginBottom: '24px', fontSize: '14px' }}>
            {loadingStage || 'Preparando'}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#ecf0f1',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: '#3498db',
                transition: 'width 0.3s ease',
                borderRadius: '10px'
              }} />
            </div>
            <div style={{ marginTop: '10px', color: '#666' }}>
              {loadingProgress}% completado
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '10px' }}>
            {[
              { label: 'Abrir', icon: '📂', threshold: 5 },
              { label: 'Categorizar', icon: '🧭', threshold: 25 },
              { label: 'Identificar', icon: '🧩', threshold: 60 },
              { label: 'Limpiar', icon: '🧼', threshold: 75 }
            ].map((step, idx) => {
              const active = loadingProgress >= step.threshold;
              return (
                <div key={idx} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: active ? '#e8f6ff' : '#f4f6f8',
                  border: `1px solid ${active ? '#bfe3ff' : '#e0e6ea'}`,
                  color: active ? '#2c3e50' : '#7f8c8d',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '6px' }}>{step.icon}</div>
                  <div style={{ fontSize: '12px' }}>{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Estado inicial - pantalla de entrada enriquecida
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', width: 'min(100%, 1000px)' }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '14px', color: '#3498db', fontWeight: 600, letterSpacing: 0.4, marginBottom: '8px' }}>Dashboard SICOP</div>
          <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '32px', lineHeight: 1.2 }}>Inteligencia de Compras Públicas</h1>
          <p style={{ marginTop: '12px', color: '#60717d', lineHeight: 1.7 }}>
            Analiza licitaciones de Costa Rica y descubre oportunidades con un enfoque moderno y visual. Esta pantalla es el punto de partida del dashboard; aún no se han cargado datos.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '24px' }}>
            <div style={{ background: '#f8fbff', border: '1px solid #e3efff', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 18 }}>🗂️</div>
              <div style={{ fontSize: 13, color: '#7f8c8d', marginTop: 6 }}>Fuentes</div>
              <div style={{ fontSize: 14, color: '#2c3e50' }}>Archivos CSV públicos de SICOP</div>
            </div>
            <div style={{ background: '#f8fbff', border: '1px solid #e3efff', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 18 }}>🧠</div>
              <div style={{ fontSize: 13, color: '#7f8c8d', marginTop: 6 }}>Método</div>
              <div style={{ fontSize: 14, color: '#2c3e50' }}>Normaliza, indexa y cruza relaciones</div>
            </div>
            <div style={{ background: '#f8fbff', border: '1px solid #e3efff', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 18 }}>📊</div>
              <div style={{ fontSize: 13, color: '#7f8c8d', marginTop: 6 }}>Análisis</div>
              <div style={{ fontSize: 14, color: '#2c3e50' }}>Tendencias, competencia y alertas</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
            <button onClick={handleLoadData} style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '14px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
              🚀 Iniciar Carga
            </button>
            <div style={{ alignSelf: 'center', fontSize: 12, color: '#95a5a6' }}>Los datos se leen desde `public/cleaned`</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: 14, color: '#2c3e50', fontWeight: 600, marginBottom: 10 }}>¿Qué hará el cargador?</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#60717d', lineHeight: 1.7 }}>
            <li>Abrir archivos y detectar codificación</li>
            <li>Categorizar y normalizar cabeceras</li>
            <li>Identificar claves y relaciones</li>
            <li>Limpiar valores y formatos</li>
            <li>Construir índices para búsquedas</li>
            <li>Generar estadísticas base del dashboard</li>
          </ul>
          <div style={{ marginTop: 16, fontSize: 12, color: '#95a5a6' }}>
            No se muestran datos aún; esta sección explica el proceso que ejecutará el dashboard.
          </div>
        </div>
      </div>
    </div>
  );
};
