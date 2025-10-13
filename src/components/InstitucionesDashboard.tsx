import React, { useMemo, useCallback, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LabelList, Label } from 'recharts';
import { useSicop } from '../context/SicopContext';
import { dataManager } from '../data/DataManager';
import { useDashboardStore } from '../stores/dashboardStore';
import { formatCurrency, formatNumber, colorPalette } from '../utils/formatting';

// Import new components
import KPICard from './KPICard';
import Timeline from './Timeline';
import FiltersPanel from './FiltersPanel';
import { DebugPanel } from './DebugPanel';
import VirtualizedTable, { SimpleColumn } from './VirtualizedTable';
import AdvancedKeywordsPanel from './AdvancedKeywordsPanel';
import { useState } from 'react';

// Import CSS
import './InstitucionesDashboard.css';
import './KPICard.css';
import './Timeline.css';
import './FiltersPanel.css';

const numberFmt = (n: number) => (n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 });
const dateFmt = (d: any) => {
  if (!d) return '—';
  if (d instanceof Date) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const dd = new Date(d);
  return isNaN(+dd) ? String(d) : `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}-${String(dd.getUTCDate()).padStart(2, '0')}`;
};

const Card: React.FC<{ title: string; children?: any; className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ title, children, className = '', ...rest }) => (
  <div 
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px) translateZ(12px) rotateX(1deg)';
      e.currentTarget.style.boxShadow = `
        0 20px 60px rgba(0,0,0,0.18),
        0 0 0 2px rgba(255,255,255,0.35) inset,
        0 30px 80px rgba(102, 126, 234, 0.22)
      `;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0deg)';
      e.currentTarget.style.boxShadow = `
        0 12px 40px rgba(0,0,0,0.12),
        0 0 0 1px rgba(255,255,255,0.25) inset,
        0 25px 70px rgba(102, 126, 234, 0.18)
      `;
    }}
    className={`inst-card ${className}`} 
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
      backdropFilter: 'blur(25px) saturate(180%)',
      WebkitBackdropFilter: 'blur(25px) saturate(180%)',
      borderRadius: '28px',
      padding: '32px',
      boxShadow: `
        0 12px 40px rgba(0,0,0,0.12),
        0 0 0 1px rgba(255,255,255,0.25) inset,
        0 25px 70px rgba(102, 126, 234, 0.18)
      `,
      border: '2px solid rgba(255,255,255,0.35)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: 'translateZ(0)',
      transformStyle: 'preserve-3d',
      willChange: 'transform, box-shadow'
    }}
    {...rest}
  >
    {/* Efecto shimmer */}
    <div style={{
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(45deg, transparent 30%, rgba(102, 126, 234, 0.08) 50%, transparent 70%)',
      backgroundSize: '500px 500px',
      animation: 'shimmer 6s linear infinite',
      pointerEvents: 'none'
    }} />
    
    <h3 
      className="inst-card__title"
      style={{
        position: 'relative',
        zIndex: 1,
        fontSize: '22px',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #2c3e50 0%, #667eea 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      {title}
    </h3>
    <div style={{ position: 'relative', zIndex: 1 }}>
      {children}
    </div>
  </div>
);

export const InstitucionesDashboard: React.FC = () => {
  const { isLoaded } = useSicop();
  
  // Use Zustand store instead of local state
  const {
    filters,
    view,
    setFiltersPanelCollapsed,
    setSelectedKPI,
    clearFilters
  } = useDashboardStore();

  // Sync URL params on mount
  useEffect(() => {
    useDashboardStore.getState().syncFromURL();
  }, []);

  // Instituciones disponibles (cargadas por FiltersPanel)
  // La lista se obtiene directamente del DataManager cuando se necesita
  useMemo(() => {
    if (!isLoaded) return [];
    try {
      return dataManager.getInstitucionesList();
    } catch (error) {
      console.error('❌ Error obteniendo lista de instituciones:', error);
      return [];
    }
  }, [isLoaded]);

  const params = useMemo(() => {
    const fd = filters.anioDesde ? new Date(`${filters.anioDesde}-01-01T00:00:00Z`) : undefined;
    const fh = filters.anioHasta ? new Date(`${filters.anioHasta}-12-31T00:00:00Z`) : undefined;
    return {
      institucion: filters.institucion,
      fechaDesde: fd,
      fechaHasta: fh,
      procedimientos: filters.procedimientos ? filters.procedimientos.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
      categorias: filters.categoria ? [filters.categoria] : undefined,
      estados: filters.estado ? [filters.estado] : undefined
    } as any;
  }, [filters.institucion, filters.anioDesde, filters.anioHasta, filters.procedimientos, filters.categoria, filters.estado]);

  const data = useMemo(() => {
    if (!filters.institucion || !isLoaded) return null;
    try { 
      console.log('🔍 InstitucionesDashboard: Calling getInstitucionDashboard with params:', params);
      const result = dataManager.getInstitucionDashboard(params);
      console.log('📊 InstitucionesDashboard: getInstitucionDashboard result:', result);
      if (result) {
        console.log('💰 KPIs:', result.kpis);
        console.log('👷 Proveedores sample:', result.proveedores?.top_por_monto?.slice(0, 3));
        console.log('📈 Procesos:', result.procesos);
      }
      return result;
    } catch (error) { 
      console.error('❌ InstitucionesDashboard: Error calling getInstitucionDashboard:', error);
      return null; 
    }
  }, [filters.institucion, params, isLoaded]);

  // Local UI state (must be top-level hooks to keep hook order stable)
  const [licitacionesExpanded, setLicitacionesExpanded] = useState<Set<string>>(() => new Set());
  const [clasificacionExpanded, setClasificacionExpanded] = useState<Set<string>>(() => new Set());

  const toggleLicitacionDesc = useCallback((id: string) => {
    setLicitacionesExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleClasificacionDesc = useCallback((id: string) => {
    setClasificacionExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Cache de sectores para evitar repetir expresiones
  const sectoresData = useMemo(() => (data?.sectores?.sector_analysis || []) as any[], [data]);

  const sectorPieData = useMemo(() => {
    if (!sectoresData.length) return [] as Array<{
      name: string;
      value: number;
      percentage: number;
      formattedPercentage: string;
      baseColor: string;
      gradientId: string;
      shortName: string;
    }>;

    const total = sectoresData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

    return sectoresData.map((item: any, index: number) => {
      const name = String(item.sector || `Sector ${index + 1}`);
      const value = item.count || 0;
      const percentage = total ? (value / total) * 100 : 0;
      const baseColor = colorPalette.primary[index % colorPalette.primary.length];
      const shortName = name.length > 24 ? `${name.slice(0, 21)}…` : name;

      return {
        name,
        value,
        percentage,
        formattedPercentage: `${percentage.toFixed(1)}%`,
        baseColor,
        gradientId: `sectorGrad-${index}`,
        shortName
      };
    });
  }, [sectoresData]);

  const renderSectorLabel = useCallback((props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
    const item = sectorPieData[index];
    if (!item || item.percentage < 4) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <g className="sector-label">
        <text
          x={x}
          y={y}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan fontSize={12} fontWeight={700}>{item.formattedPercentage}</tspan>
          <tspan x={x} dy="1.2em" fontSize={10} fontWeight={500}>{item.shortName}</tspan>
        </text>
      </g>
    );
  }, [sectorPieData]);

  const sectorLegend = useMemo(() => {
    if (!sectorPieData.length) return null;
    return (
      <div className="sector-legend" role="list">
        {sectorPieData.map((item, index) => (
          <div key={`${item.name}-${index}`} className="sector-legend__item" role="listitem">
            <span className="sector-legend__bullet" style={{ background: item.baseColor }} />
            <div className="sector-legend__meta">
              <span className="sector-legend__name">{item.name}</span>
              <span className="sector-legend__value">{item.formattedPercentage} · {formatNumber(item.value)} carteles</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [sectorPieData]);

  // KPI Cards Data
  const kpiCardsData = useMemo(() => {
    if (!data?.kpis) return [];
    
    const kpis = data.kpis;
    const proveedores = data.proveedores?.top_por_monto || [];
    const montosDataset = proveedores.map((p: any) => p.monto || 0);
    
    const ofertasAnalytics = data.oportunidades?.ofertas_analytics;
    return [
      {
        title: 'Procesos de contratación',
        value: kpis.procesos_contratacion,
        format: 'number' as const,
        icon: '📋',
        isClickable: true,
        dataset: [kpis.procesos_contratacion],
        onClick: () => setSelectedKPI('procesos')
      },
      ...(ofertasAnalytics ? [{
        title: 'Total ofertas',
        value: ofertasAnalytics.total_ofertas,
        format: 'number' as const,
        icon: '🧾',
        isClickable: false,
        dataset: [ofertasAnalytics.total_ofertas]
      }] : []),
      {
        title: 'Licitaciones adjudicadas', 
        value: kpis.licitaciones_adjudicadas,
        format: 'number' as const,
        icon: '✅',
        isClickable: true,
        dataset: [kpis.licitaciones_adjudicadas],
        onClick: () => setSelectedKPI('licitaciones')
      },
      {
        title: 'Proveedores únicos',
        value: kpis.proveedores_unicos_adjudicados,
        format: 'number' as const,
        icon: '🏢',
        isClickable: true,
        dataset: [kpis.proveedores_unicos_adjudicados],
        onClick: () => setSelectedKPI('proveedores')
      },
      {
        title: 'Índice de concentración',
        value: kpis.indice_concentracion_top3,
        format: 'percentage' as const,
        icon: '📊',
        subtitle: 'Top 3 proveedores',
        isClickable: true,
        dataset: [kpis.indice_concentracion_top3],
        onClick: () => setSelectedKPI('concentracion')
      },
      ...(kpis.monto_total_contratado_contratos != null ? [{
        title: 'Monto total contratos',
        value: kpis.monto_total_contratado_contratos,
        format: 'currency' as const,
        icon: '💰',
        isClickable: true,
        dataset: montosDataset,
        sparklineData: montosDataset.slice(0, 10),
        onClick: () => setSelectedKPI('monto_total')
      }] : []),
      ...(kpis.monto_promedio_contrato != null ? [{
        title: 'Monto promedio por contrato',
        value: Math.round(kpis.monto_promedio_contrato),
        format: 'currency' as const,
        icon: '📈',
        dataset: montosDataset,
        comparison: {
          label: 'vs sector',
          value: 15.2,
          benchmark: 'sector' as const
        }
      }] : [])
    ];
  }, [data, setSelectedKPI]);

  // Timeline data for contracts
  const timelineData = useMemo(() => {
    if (!data?.visuales?.serie_mensual_contratos) return [];
    
    return data.visuales.serie_mensual_contratos.map((item: any) => ({
      date: item.mes,
      value: item.monto || 0,
      label: formatCurrency(item.monto, { compact: true }),
      eventos: item.contratos > 50 ? [{ 
        tipo: 'Alta actividad',
        descripcion: `${item.contratos} contratos en este mes`
      }] : []
    }));
  }, [data]);

  // Tooltips personalizados y datos de proveedores procesados
  // Funcionalidad preparada para futuras mejoras en visualización de datos
  
  // Datos de proveedores top procesados (disponibles para futuras funcionalidades)
  useMemo(() => {
    if (!data?.proveedores?.top_por_monto) return [];
    const arr = (data.proveedores.top_por_monto || []).slice(0, 12);
    const total = data?.proveedores?.top_por_monto?.reduce((s: number, p: any) => s + (p.monto || 0), 0) || 0;
    return arr.map((p: any) => {
      const pct = total > 0 ? ((p.monto / total) * 100) : 0;
      return { ...p, pct };
    });
  }, [data]);

  useMemo(() => {
    if (!data?.proveedores?.top_por_contratos) return [];
    const arr = (data.proveedores.top_por_contratos || []).slice(0, 12);
    const total = data?.proveedores?.top_por_contratos?.reduce((s: number, p: any) => s + (p.contratos || 0), 0) || 0;
    return arr.map((p: any) => {
      const pct = total > 0 ? ((p.contratos / total) * 100) : 0;
      return { ...p, pct };
    });
  }, [data]);

  // Generic helper for provider bar chart tooltips (monto / contratos) to keep code DRY
  const providerTooltip = useCallback((type: 'monto' | 'contratos') => ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row: any = payload[0].payload;
    if (type === 'monto') {
      const total = data?.proveedores?.top_por_monto?.reduce((s: number, p: any) => s + (p.monto || 0), 0) || 0;
      const pct = total ? (row.monto / total) * 100 : 0;
      return (
        <div className="enhanced-tooltip">
          <div className="enhanced-tooltip__header">{row.display}</div>
            <div className="enhanced-tooltip__value">{formatCurrency(row.monto)}</div>
            <div className="enhanced-tooltip__rank">{pct.toFixed(2)}% del total</div>
        </div>
      );
    } else {
      const total = data?.proveedores?.top_por_contratos?.reduce((s: number, p: any) => s + (p.contratos || 0), 0) || 0;
      const pct = total ? (row.contratos / total) * 100 : 0;
      return (
        <div className="enhanced-tooltip">
          <div className="enhanced-tooltip__header">{row.display}</div>
          <div className="enhanced-tooltip__value">{formatNumber(row.contratos)} contratos</div>
          <div className="enhanced-tooltip__rank">{pct.toFixed(2)}% del total</div>
        </div>
      );
    }
  }, [data]);

  return (
    <div className="modern-dashboard" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      padding: '70px 80px',
      position: 'relative',
      overflow: 'hidden',
      perspective: '2000px',
      maxWidth: '1800px',
      margin: '0 auto'
    }}>
      
      {/* Partículas de fondo animadas */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            background: `radial-gradient(circle, rgba(255,255,255,${Math.random() * 0.3 + 0.1}) 0%, transparent 70%)`,
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float${i % 3} ${Math.random() * 20 + 15}s ease-in-out infinite`,
            filter: 'blur(25px)',
            transform: `rotate(${Math.random() * 360}deg)`,
            willChange: 'transform'
          }} />
        ))}
      </div>

      {/* Animaciones keyframes inyectadas */}
      <style>{`
        @keyframes float0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
          25% { transform: translate(100px, -100px) rotate(90deg); opacity: 0.6; }
          50% { transform: translate(200px, -50px) rotate(180deg); opacity: 0.4; }
          75% { transform: translate(100px, 50px) rotate(270deg); opacity: 0.7; }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(360deg); opacity: 0.4; }
          33% { transform: translate(-150px, 120px) rotate(240deg); opacity: 0.7; }
          66% { transform: translate(-50px, -100px) rotate(120deg); opacity: 0.5; }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.3; }
          50% { transform: translate(120px, 150px) rotate(180deg) scale(1.3); opacity: 0.8; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.6)); }
          50% { filter: drop-shadow(0 0 20px rgba(102, 126, 234, 1)); }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          50% { transform: translateY(-8px) rotateX(2deg); }
        }
      `}</style>

      {/* Debug Panel */}
      <DebugPanel />

      {/* Filters Panel */}
      <FiltersPanel 
        isCollapsed={view.filtersPanelCollapsed}
        onToggle={() => setFiltersPanelCollapsed(!view.filtersPanelCollapsed)}
      />

      {/* Main Content */}
      <main className={`dashboard-main ${view.filtersPanelCollapsed ? 'filters-collapsed' : 'filters-expanded'}`} style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Loading State */}
        {!isLoaded && (
          <div className="dashboard-loading">
            <div className="loading-spinner" />
            <p>Cargando datos del sistema...</p>
          </div>
        )}

        {/* Institution Selection Required */}
        {isLoaded && !filters.institucion && (
          <div className="dashboard-empty-state">
            <div className="empty-state-content">
              <span className="empty-state-icon">🏛️</span>
              <h2>Seleccione una institución</h2>
              <p>Use el panel de filtros para seleccionar una institución y comenzar el análisis.</p>
              <button 
                className="empty-state-btn"
                onClick={() => setFiltersPanelCollapsed(false)}
              >
                Abrir filtros
              </button>
            </div>
          </div>
        )}

        {/* No Data State */}
        {isLoaded && filters.institucion && !data && (
          <div className="dashboard-empty-state">
            <div className="empty-state-content">
              <span className="empty-state-icon">📊</span>
              <h2>Sin datos disponibles</h2>
              <p>No se encontraron datos para la institución y filtros seleccionados.</p>
              <button 
                className="empty-state-btn"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        {isLoaded && filters.institucion && data && (
          <>
            {/* Header Premium con Glassmorphism Avanzado */}
            <header style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.2) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              WebkitBackdropFilter: 'blur(25px) saturate(180%)',
              borderRadius: '24px',
              padding: '32px 40px',
              marginBottom: '32px',
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.15),
                0 0 0 1px rgba(255,255,255,0.1) inset,
                0 20px 60px rgba(102, 126, 234, 0.2)
              `,
              position: 'relative',
              overflow: 'hidden',
              transform: 'translateZ(0)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}>
              {/* Brillo animado de fondo */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                backgroundSize: '1000px 1000px',
                animation: 'shimmer 6s linear infinite',
                pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div className="institution-info">
                  <h1 style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '2.4em',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    textShadow: `
                      0 2px 10px rgba(0,0,0,0.3),
                      0 4px 20px rgba(102, 126, 234, 0.4),
                      0 0 40px rgba(102, 126, 234, 0.2)
                    `,
                    transform: 'translateZ(20px)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}>
                    🏛️ {data.institucion?.nombre || filters.institucion}
                  </h1>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px',
                    transform: 'translateZ(10px)'
                  }}>
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.2)',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      {data.institucion?.tipo || '—'}
                    </span>
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.2)',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      Código: {data.institucion?.codigo || filters.institucion}
                    </span>
                  </div>
                </div>
                
                {/* Quick Actions Premium */}
                <div style={{ display: 'flex', gap: '12px', transform: 'translateZ(15px)' }}>
                  <button 
                    className="action-btn"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(108, 92, 231, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      willChange: 'transform'
                    }}
                    title="Exportar datos"
                  >
                    📥 Exportar
                  </button>
                  <button 
                    className="action-btn"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(32, 201, 151, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #20c997 0%, #00b894 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      willChange: 'transform'
                    }}
                    title="Compartir dashboard"
                  >
                    🔗 Compartir
                  </button>
                </div>
              </div>
            </header>

            {/* KPI Cards Grid - Optimizado Full HD */}
            <section 
              className="kpi-grid" 
              aria-label="Indicadores clave de rendimiento"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
                marginBottom: '36px',
                perspective: '2000px',
                transformStyle: 'preserve-3d'
              }}
            >
              {kpiCardsData.map((kpi, index) => (
                <KPICard
                  key={index}
                  {...kpi}
                  isSelected={view.selectedKPI === 'procesos' && kpi.title.includes('Procesos')}
                />
              ))}
            </section>

            {/* Main Content Grid - Premium Layout */}
            <div className="content-grid" style={{
              display: 'grid',
              gap: '24px',
              perspective: '2000px',
              transformStyle: 'preserve-3d'
            }}>
              
              {/* Timeline Sidebar */}
              {view.timelineVisible && timelineData.length > 0 && (
                <aside className="timeline-sidebar">
                  <Timeline
                    data={timelineData}
                    title="Evolución temporal"
                    valueFormat="currency"
                    height={300}
                    showBrush={true}
                    showEvents={true}
                  />
                </aside>
              )}

              {/* Main Charts Area */}
              <div className="charts-area" style={{
                display: 'grid',
                gap: '24px'
              }}>
                
                {/* Top Providers Charts - Premium Grid */}
                <div className="charts-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  perspective: '2000px',
                  transformStyle: 'preserve-3d'
                }}>
                  <Card title="🏆 Top 10 proveedores por monto" className="chart-card">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.proveedores.top_por_monto.map((x: any) => {
                        const noNombre = !x.nombre || x.nombre === x.id;
                        return {
                          name: noNombre ? x.id : x.nombre,
                          id: x.id,
                          display: noNombre ? `ID ${x.id} (sin nombre)` : `${x.nombre} (ID ${x.id})`,
                          monto: x.monto
                        };
                      })} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradMonto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                            <stop offset="35%" stopColor="#764ba2" stopOpacity={0.95} />
                            <stop offset="70%" stopColor="#f093fb" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#764ba2" stopOpacity={0.85} />
                          </linearGradient>
                          <filter id="shadowMonto" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" floodColor="#667eea"/>
                            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.1" floodColor="#764ba2"/>
                            <feDropShadow dx="0" dy="12" stdDeviation="16" floodOpacity="0.06" floodColor="#f093fb"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v, { compact: true })} stroke="#64748b" style={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip 
                          content={providerTooltip('monto')} 
                          cursor={{ 
                            fill: 'rgba(102, 126, 234, 0.08)',
                            filter: 'blur(8px)'
                          }} 
                          wrapperStyle={{
                            outline: 'none',
                            filter: 'drop-shadow(0 8px 32px rgba(102, 126, 234, 0.25))'
                          }}
                        />
                        <Bar 
                          dataKey="monto" 
                          fill="url(#gradMonto)" 
                          radius={[10,10,0,0]} 
                          filter="url(#shadowMonto)"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer'
                          }}
                        >
                          <LabelList dataKey="monto" position="top" formatter={(val: any) => formatCurrency(Number(val)||0,{compact:true}) as any} style={{ fontSize: 12, fill: '#1e293b', fontWeight: 800, textShadow: '0 1px 2px rgba(255,255,255,0.8)' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="📊 Top 10 proveedores por contratos" className="chart-card">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.proveedores.top_por_contratos.map((x: any) => {
                        const noNombre = !x.nombre || x.nombre === x.id;
                        return {
                          name: noNombre ? x.id : x.nombre,
                          id: x.id,
                          display: noNombre ? `ID ${x.id} (sin nombre)` : `${x.nombre} (ID ${x.id})`,
                          contratos: x.contratos
                        };
                      })} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradContratos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f093fb" stopOpacity={1} />
                            <stop offset="35%" stopColor="#f5576c" stopOpacity={0.95} />
                            <stop offset="70%" stopColor="#ff8a80" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#f5576c" stopOpacity={0.85} />
                          </linearGradient>
                          <filter id="shadowContratos" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" floodColor="#f093fb"/>
                            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.1" floodColor="#f5576c"/>
                            <feDropShadow dx="0" dy="12" stdDeviation="16" floodOpacity="0.06" floodColor="#ff8a80"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis stroke="#64748b" style={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip 
                          content={providerTooltip('contratos')} 
                          cursor={{ 
                            fill: 'rgba(240, 147, 251, 0.08)',
                            filter: 'blur(8px)'
                          }}
                          wrapperStyle={{
                            outline: 'none',
                            filter: 'drop-shadow(0 8px 32px rgba(240, 147, 251, 0.25))'
                          }}
                        />
                        <Bar 
                          dataKey="contratos" 
                          fill="url(#gradContratos)" 
                          radius={[10,10,0,0]} 
                          filter="url(#shadowContratos)"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer'
                          }}
                        >
                          <LabelList dataKey="contratos" position="top" formatter={(val: any) => formatNumber(Number(val)||0) as any} style={{ fontSize: 12, fill: '#1e293b', fontWeight: 800, textShadow: '0 1px 2px rgba(255,255,255,0.8)' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Sector Distribution & Keywords */}
                <div className="charts-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  perspective: '2000px',
                  transformStyle: 'preserve-3d'
                }}>
                  <Card title="🎯 Distribución por sectores" className="chart-card">
                    <div className="sector-chart">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                        <defs>
                          {sectorPieData.map((item, index) => (
                            <linearGradient key={item.gradientId} id={item.gradientId} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={item.baseColor} stopOpacity={1} />
                              <stop offset="50%" stopColor={item.baseColor} stopOpacity={0.85} />
                              <stop offset="100%" stopColor={item.baseColor} stopOpacity={0.7} />
                            </linearGradient>
                          ))}
                          <filter id="shadowPie" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12"/>
                            <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.08"/>
                            <feDropShadow dx="0" dy="12" stdDeviation="20" floodOpacity="0.04"/>
                          </filter>
                        </defs>
                        <Pie
                          data={sectorPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={3}
                          dataKey="value"
                          labelLine={false}
                          filter="url(#shadowPie)"
                          animationBegin={0}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        >
                          {sectorPieData.map((item, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#${item.gradientId})`}
                              stroke="#ffffff" 
                              strokeWidth={3}
                              style={{
                                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                          <Label content={renderSectorLabel} />
                        </Pie>
                        <Tooltip formatter={(v: any, n: any, p: any) => {
                          const total = sectorPieData.reduce((s, x) => s + x.value, 0);
                          const pct = total ? (v / total) * 100 : 0;
                          return [`${v} carteles (${pct.toFixed(1)}%)`, n];
                        }} 
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '16px',
                          padding: '14px 18px',
                          boxShadow: '0 16px 48px rgba(102, 126, 234, 0.25), 0 8px 24px rgba(118, 75, 162, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                        }}
                        itemStyle={{
                          color: '#1e293b',
                          fontWeight: 700,
                          fontSize: '12px',
                          textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                        }}
                        labelStyle={{
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: '11px'
                        }}
                        wrapperStyle={{
                          outline: 'none',
                          filter: 'drop-shadow(0 12px 40px rgba(102, 126, 234, 0.3))'
                        }}
                        />
                        {/* Center label */}
                        {(() => {
                          const total = sectorPieData.reduce((s, x) => s + x.value, 0);
                          const top = sectorPieData[0];
                          const pctTop = total && top ? ((top.value / total) * 100).toFixed(1) : '0';
                          return (
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontFamily: 'inherit', fill: '#334155' }}>
                              <tspan x="50%" dy="-0.5em" fontSize={18} fontWeight={800} fill="#667eea">{total}</tspan>
                              <tspan x="50%" dy="1.3em" fill="#64748b" fontSize={12}>total carteles</tspan>
                              {top && (
                                <tspan x="50%" dy="1.3em" fill="#f093fb" fontSize={11} fontWeight={700}>{pctTop}% {top.name}</tspan>
                              )}
                            </text>
                          );
                        })()}
                        </PieChart>
                      </ResponsiveContainer>
                      {sectorLegend}
                    </div>
                  </Card>

                  <Card title="💬 Palabras clave (análisis semántico)" className="chart-card">
                    {data.bienes_servicios?.palabras_clave && data.bienes_servicios.palabras_clave.length > 0 ? (
                      <AdvancedKeywordsPanel keywords={data.bienes_servicios.palabras_clave.map((k: any) => ({ palabra: k.palabra, frecuencia: k.frecuencia ?? k.freq ?? 0 }))} />
                    ) : (
                      <div className="no-data">📊 Sin palabras clave disponibles</div>
                    )}
                  </Card>
                </div>

              </div>
            </div>

            {/* Ofertas / Competencia Analytics */}
            {data.oportunidades?.ofertas_analytics && (
              <section className="offers-analytics" aria-label="Analítica de ofertas" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,242,255,0.9) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                borderRadius: '24px',
                padding: '32px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 20px 60px rgba(102, 126, 234, 0.15), 0 8px 24px rgba(118, 75, 162, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                marginTop: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Shimmer overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'shimmer 3s infinite',
                  pointerEvents: 'none',
                  zIndex: 1
                }}/>
                <h2 className="section-title" style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#1e293b',
                  marginBottom: '20px',
                  textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                  position: 'relative',
                  zIndex: 2
                }}>🎪 Competencia en licitaciones</h2>
                <div className="offers-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '24px',
                  perspective: '2000px',
                  transformStyle: 'preserve-3d',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div className="offer-kpis" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    minWidth: '280px'
                  }}>
                    <div className="offer-kpi" style={{
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '2px solid rgba(102, 126, 234, 0.2)',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      transform: 'translateZ(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) translateZ(8px) rotateX(1deg)';
                      e.currentTarget.style.boxShadow = '0 12px 36px rgba(102, 126, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                    }}>
                      <div className="offer-kpi__label" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '6px'
                      }}>📊 Promedio de ofertas</div>
                      <div className="offer-kpi__value" style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
                      }}>{(data.oportunidades.ofertas_analytics.promedio_ofertas || 0).toFixed(2)}</div>
                    </div>
                    <div className="offer-kpi" style={{
                      background: 'linear-gradient(135deg, rgba(245, 87, 108, 0.1) 0%, rgba(240, 147, 251, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '2px solid rgba(245, 87, 108, 0.2)',
                      boxShadow: '0 8px 24px rgba(245, 87, 108, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      transform: 'translateZ(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) translateZ(8px) rotateX(1deg)';
                      e.currentTarget.style.boxShadow = '0 12px 36px rgba(245, 87, 108, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 87, 108, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                    }}>
                      <div className="offer-kpi__label" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '6px'
                      }}>⚠️ Una sola oferta</div>
                      <div className="offer-kpi__value" style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 2px 4px rgba(245, 87, 108, 0.2)'
                      }}>{(data.oportunidades.ofertas_analytics.porcentaje_una_oferta || 0).toFixed(1)}%</div>
                    </div>
                    <div className="offer-kpi" style={{
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '2px solid rgba(52, 211, 153, 0.2)',
                      boxShadow: '0 8px 24px rgba(52, 211, 153, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      transform: 'translateZ(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) translateZ(8px) rotateX(1deg)';
                      e.currentTarget.style.boxShadow = '0 12px 36px rgba(52, 211, 153, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(52, 211, 153, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                    }}>
                      <div className="offer-kpi__label" style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '6px'
                      }}>🧾 Total ofertas</div>
                      <div className="offer-kpi__value" style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 2px 4px rgba(52, 211, 153, 0.2)'
                      }}>{numberFmt(data.oportunidades.ofertas_analytics.total_ofertas || 0)}</div>
                    </div>
                  </div>
                  <div className="offer-distribution" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(240,255,244,0.5) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '20px',
                    border: '2px solid rgba(52, 211, 153, 0.2)',
                    boxShadow: '0 12px 40px rgba(52, 211, 153, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                  }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.oportunidades.ofertas_analytics.distribucion}>
                        <defs>
                          <linearGradient id="gradOfertas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="35%" stopColor="#34d399" stopOpacity={0.95} />
                            <stop offset="70%" stopColor="#6ee7b7" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                          </linearGradient>
                          <filter id="shadowOfertas" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" floodColor="#10b981"/>
                            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.1" floodColor="#34d399"/>
                            <feDropShadow dx="0" dy="12" stdDeviation="16" floodOpacity="0.06" floodColor="#6ee7b7"/>
                          </filter>
                        </defs>
                        <XAxis 
                          dataKey="ofertas" 
                          label={{ value: 'Número de ofertas', position: 'insideBottom', dy: 10, style: { fontWeight: 700, fontSize: 13, fill: '#1e293b' } }}
                          stroke="#64748b"
                          style={{ fontSize: 13, fontWeight: 600 }}
                        />
                        <YAxis stroke="#64748b" style={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip 
                          formatter={(v: any, n: any, p: any) => [`${v} licitaciones (${(p.payload.percentage || 0).toFixed(1)}%)`, 'Licitaciones']}
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.98)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '2px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '16px',
                            padding: '14px 18px',
                            boxShadow: '0 16px 48px rgba(52, 211, 153, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                          }}
                          itemStyle={{
                            color: '#1e293b',
                            fontWeight: 700,
                            fontSize: '12px',
                            textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                          }}
                          labelStyle={{ 
                            color: '#64748b', 
                            fontWeight: 600,
                            fontSize: '11px'
                          }}
                          wrapperStyle={{
                            outline: 'none',
                            filter: 'drop-shadow(0 12px 40px rgba(52, 211, 153, 0.3))'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#gradOfertas)" 
                          radius={[10,10,0,0]} 
                          filter="url(#shadowOfertas)"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer'
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}

            {/* Tablas modernas de licitaciones y contratos */}
            <section className="tables-section" aria-label="Licitaciones y contratos" style={{
              display: 'grid',
              gap: '24px',
              marginTop: '24px',
              perspective: '2000px',
              transformStyle: 'preserve-3d'
            }}>
              <Card title="Ofertas (resumen)">
                <VirtualizedTable
                  data={(data.oportunidades?.ofertas_resumen || []).map((o: any) => ({
                    cartel: o.numeroCartel,
                    descripcion: o.descripcion || '',
                    fecha: dateFmt(o.fechaOferta)
                  }))}
                  columns={[
                    { key: 'cartel', header: 'SICOP', width: 160 },
                    { key: 'descripcion', header: 'Descripción', width: 520 },
                    { key: 'fecha', header: 'Última oferta', width: 140 }
                  ] as SimpleColumn<any>[]}
                  height={220}
                  ariaLabel="Tabla de ofertas"
                  resizable
                />
              </Card>
              <Card title="Licitaciones recientes (tabla)">
                <VirtualizedTable
                  data={(data.oportunidades?.licitaciones_recientes || []).map((l: any) => {
                    const descripcion = (l.nombreCartel || '').toString();
                    return {
                      cartel: l.numeroCartel,
                      fecha: dateFmt(l.fechaPublicacion),
                      procedimiento: l.procedimiento || '—',
                      descripcion,
                      descripcionCorta: descripcion.length > 80 ? descripcion.slice(0, 77) + '…' : descripcion,
                      montoEstimado: l.montoEstimado || 0,
                      ofertas: l.ofertasRecibidas || 0,
                      estado: l.estado || '—'
                    };
                  })}
                  columns={[
                    { key: 'cartel', header: 'Cartel', width: 110 },
                    { key: 'fecha', header: 'Fecha', width: 100 },
                    { key: 'procedimiento', header: 'Procedimiento', width: 160 },
                    { key: 'descripcionCorta', header: 'Descripción', width: 380, cell: (r: any) => {
                      const id = r.cartel;
                      const isExp = licitacionesExpanded.has(id);
                      return (
                        <div
                          className={`desc-cell ${isExp ? 'expanded' : ''}`}
                          style={{ whiteSpace: isExp ? 'normal' : 'nowrap', cursor: 'pointer' }}
                          title={!isExp ? 'Click para expandir' : 'Click para contraer'}
                          onClick={() => toggleLicitacionDesc(id)}
                        >
                          {isExp ? r.descripcion : r.descripcionCorta}
                        </div>
                      );
                    } },
                    { key: 'montoEstimado', header: 'Estimado', width: 120, align: 'right', cell: (r: any) => formatCurrency(r.montoEstimado, { compact: true }) },
                    { key: 'ofertas', header: 'Ofertas', width: 90, align: 'right' },
                    { key: 'estado', header: 'Estado', width: 140 }
                  ] as SimpleColumn<any>[]}
                  height={240}
                  ariaLabel="Tabla de licitaciones recientes"
                  resizable
                />
              </Card>
              <Card title="Contratos (resumen)">
                <VirtualizedTable
                  data={(data.contratos_resumen || []).map((c: any) => ({
                    contrato: c.idContrato,
                    cartel: c.numeroCartel,
                    proveedor: c.proveedor,
                    fecha: dateFmt(c.fechaFirma),
                    monto: c.monto || 0,
                    estado: c.estado || '—'
                  }))}
                  columns={[
                    { key: 'contrato', header: 'Contrato', width: 110 },
                    { key: 'cartel', header: 'Cartel', width: 110 },
                    { key: 'proveedor', header: 'Proveedor', width: 220 },
                    { key: 'fecha', header: 'Firma', width: 110 },
                    { key: 'monto', header: 'Monto', width: 120, align: 'right', cell: (r: any) => formatCurrency(r.monto, { compact: true }) },
                    { key: 'estado', header: 'Estado', width: 140 }
                  ] as SimpleColumn<any>[]}
                  height={240}
                  ariaLabel="Tabla de contratos"
                  resizable
                />
              </Card>
            </section>

            {/* Tabla de clasificación sectorial */}
            {data.sectores?.sector_clasificacion && (
              <section className="tables-section" aria-label="Clasificación sectorial por cartel">
                <Card title="Clasificación de carteles (sector y subcategoría)">
                  <VirtualizedTable
                    data={(data.sectores.sector_clasificacion || []).map((r: any) => ({
                      cartel: r.numeroCartel,
                      sector: r.sector,
                      subcategoria: r.subcategoria,
                      descripcionCorta: (r.descripcion || '').length > 100 ? r.descripcion.slice(0,97)+'…' : (r.descripcion || ''),
                      descripcion: r.descripcion || ''
                    }))}
                    columns={[
                      { key: 'cartel', header: 'Cartel', width: 120 },
                      { key: 'sector', header: 'Sector', width: 140 },
                      { key: 'subcategoria', header: 'Subcategoría', width: 200 },
                      { key: 'descripcionCorta', header: 'Descripción', width: 480, cell: (r: any) => {
                        const id = r.cartel + r.subcategoria;
                        const isExp = clasificacionExpanded.has(id);
                        return (
                          <div
                            className={`desc-cell ${isExp ? 'expanded' : ''}`}
                            style={{ whiteSpace: isExp ? 'normal' : 'nowrap', cursor: 'pointer' }}
                            title={!isExp ? 'Click para expandir' : 'Click para contraer'}
                            onClick={() => toggleClasificacionDesc(id)}
                          >
                            {isExp ? r.descripcion : r.descripcionCorta}
                          </div>
                        );
                      } }
                    ] as SimpleColumn<any>[]}
                    height={260}
                    ariaLabel="Tabla de clasificación sectorial"
                    resizable
                  />
                </Card>
              </section>
            )}

            {/* (Se removió la sección de búsqueda de líneas por palabra clave a solicitud) */}

          </>
        )}
      </main>
    </div>
  );
};

export default InstitucionesDashboard;
