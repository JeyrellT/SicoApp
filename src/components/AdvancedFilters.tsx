// ================================
// FILTROS DE PERIODO SICOP - RANGO yyyymm CONTRA LA API
// ================================
// La API de dashboard sólo admite filtrado por rango de periodo
// (?desde=yyyymm&hasta=yyyymm). Este componente ya no filtra por
// institución/categoría/palabras clave en memoria: esos filtros no existen
// en el contrato del backend para los endpoints de dashboard, así que se
// reemplazaron por un selector de rango de periodos disponible.

import React, { useMemo } from 'react';
import { Filter, X, Calendar, CheckCircle } from 'lucide-react';

// ================================
// UTILIDADES DE PERIODO (yyyymm)
// ================================

const etiquetaPeriodo = (periodo: number): string => {
  const s = String(periodo);
  if (s.length !== 6) return s;
  const anio = s.slice(0, 4);
  const mes = s.slice(4, 6);
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = parseInt(mes, 10) - 1;
  const nombreMes = nombres[idx] ?? mes;
  return `${nombreMes} ${anio}`;
};

// ================================
// INTERFACES Y TIPOS
// ================================

interface AdvancedFiltersProps {
  /** Periodos yyyymm disponibles (según /v1/dashboard/filtros), orden ascendente. */
  periodos: number[];
  desde?: number;
  hasta?: number;
  onDesdeChange: (periodo: number | undefined) => void;
  onHastaChange: (periodo: number | undefined) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  /** Rango real aplicado por el backend (puede recortar lo solicitado según el perfil del usuario). */
  rangoAplicado?: { desde?: number; hasta?: number };
}

// ================================
// COMPONENTE PRINCIPAL DE FILTROS DE PERIODO
// ================================

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  periodos,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  rangoAplicado
}) => {
  const hasActiveFilters = desde !== undefined || hasta !== undefined;

  const opcionesDesde = useMemo(() => periodos.filter(p => hasta === undefined || p <= hasta), [periodos, hasta]);
  const opcionesHasta = useMemo(() => periodos.filter(p => desde === undefined || p >= desde), [periodos, desde]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Filter size={20} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Rango de Periodo
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6c757d'
            }}>
              Selecciona el rango de meses a analizar
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {hasActiveFilters && (
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <CheckCircle size={14} />
              Rango personalizado
            </div>
          )}

          {isLoading && (
            <div style={{
              background: '#17a2b8',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div className="loading-spinner" style={{
                width: '12px',
                height: '12px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Cargando...
            </div>
          )}
        </div>
      </div>

      {/* Selectores de rango */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '16px'
      }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#495057', marginBottom: '8px' }}>
            <Calendar size={14} /> Desde
          </label>
          <select
            value={desde ?? ''}
            onChange={(e) => onDesdeChange(e.target.value ? Number(e.target.value) : undefined)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e9ecef',
              borderRadius: '12px',
              fontSize: '14px',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="">Todo el historial</option>
            {opcionesDesde.map(p => (
              <option key={p} value={p}>{etiquetaPeriodo(p)}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#495057', marginBottom: '8px' }}>
            <Calendar size={14} /> Hasta
          </label>
          <select
            value={hasta ?? ''}
            onChange={(e) => onHastaChange(e.target.value ? Number(e.target.value) : undefined)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e9ecef',
              borderRadius: '12px',
              fontSize: '14px',
              background: 'white',
              outline: 'none'
            }}
          >
            <option value="">Hasta el más reciente</option>
            {opcionesHasta.map(p => (
              <option key={p} value={p}>{etiquetaPeriodo(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {rangoAplicado && (rangoAplicado.desde !== undefined || rangoAplicado.hasta !== undefined) && (
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
          💡 Su perfil limita el rango visible. Mostrando datos de{' '}
          <strong>{rangoAplicado.desde ? etiquetaPeriodo(rangoAplicado.desde) : '—'}</strong> a{' '}
          <strong>{rangoAplicado.hasta ? etiquetaPeriodo(rangoAplicado.hasta) : '—'}</strong>.
        </p>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: '#dc3545',
              border: '2px solid #dc3545',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#dc3545';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#dc3545';
              }
            }}
          >
            <X size={16} />
            Limpiar rango
          </button>
        )}

        <button
          onClick={onApplyFilters}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: hasActiveFilters
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
          }}
        >
          <Filter size={16} />
          {hasActiveFilters ? 'Aplicar rango' : 'Ver todos los datos'}
        </button>
      </div>

      {/* Style Injection for Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdvancedFilters;
