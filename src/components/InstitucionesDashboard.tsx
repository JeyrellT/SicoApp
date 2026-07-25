import React, { useMemo, useCallback, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LabelList, Label } from 'recharts';
import { useDashboardStore } from '../stores/dashboardStore';
import { formatCurrency, formatNumber, colorPalette } from '../utils/formatting';
import { usePerfilInstitucion, useProcedimientos } from '../hooks/api';

// Import new components
import KPICard from './KPICard';
import Timeline from './Timeline';
import FiltersPanel from './FiltersPanel';
import { DebugPanel } from './DebugPanel';
import VirtualizedTable, { SimpleColumn } from './VirtualizedTable';

// Import CSS
import './InstitucionesDashboard.css';
import './KPICard.css';
import './Timeline.css';
import './FiltersPanel.css';

const dateFmtPeriodo = (periodo: number | undefined): string => {
  if (!periodo) return '—';
  const s = String(periodo);
  if (s.length !== 6) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
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
  // Use Zustand store instead of local state
  const {
    filters,
    view,
    setFiltersPanelCollapsed,
    clearFilters
  } = useDashboardStore();

  // Sync URL params on mount
  useEffect(() => {
    useDashboardStore.getState().syncFromURL();
  }, []);

  // Rango yyyymm derivado del rango de años elegido en el panel de filtros
  const rango = useMemo(() => {
    const desde = filters.anioDesde ? Number(filters.anioDesde) * 100 + 1 : undefined;
    const hasta = filters.anioHasta ? Number(filters.anioHasta) * 100 + 12 : undefined;
    return { desde, hasta };
  }, [filters.anioDesde, filters.anioHasta]);

  const cedula = filters.institucion || undefined;

  const perfilQuery = usePerfilInstitucion(cedula, rango);
  const data = perfilQuery.data;

  const procedimientosQuery = useProcedimientos({
    institucion: cedula,
    desde: rango.desde,
    hasta: rango.hasta,
    page: 1,
    page_size: 10
  });

  // Local UI state (must be top-level hooks to keep hook order stable)
  const [descExpandida, setDescExpandida] = React.useState<Set<string>>(() => new Set());

  const toggleDesc = useCallback((id: string) => {
    setDescExpandida(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Distribución por categoría de gasto (ya agregada por el backend)
  const sectorPieData = useMemo(() => {
    const categorias = data?.categorias || [];
    if (!categorias.length) return [] as Array<{
      name: string;
      value: number;
      percentage: number;
      formattedPercentage: string;
      baseColor: string;
      gradientId: string;
      shortName: string;
    }>;

    return categorias.map((item, index) => {
      const name = item.objeto_gasto;
      const value = item.lineas;
      const percentage = item.participacion_pct;
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
  }, [data]);

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
        <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="middle">
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
              <span className="sector-legend__value">{item.formattedPercentage} · {formatNumber(item.value)} líneas</span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [sectorPieData]);

  // KPI Cards Data — todos vienen ya agregados de PerfilInstitucion.resumen
  const kpiCardsData = useMemo(() => {
    if (!data?.resumen) return [];
    const r = data.resumen;
    return [
      { title: 'Procedimientos', value: r.procedimientos, format: 'number' as const, icon: '📋', dataset: [r.procedimientos] },
      { title: 'Ofertas recibidas', value: r.ofertas, format: 'number' as const, icon: '🧾', dataset: [r.ofertas] },
      { title: 'Líneas adjudicadas', value: r.lineas_adjudicadas, format: 'number' as const, icon: '✅', dataset: [r.lineas_adjudicadas] },
      { title: 'Proveedores únicos', value: r.proveedores, format: 'number' as const, icon: '🏢', dataset: [r.proveedores] },
      { title: 'Monto total adjudicado', value: r.monto_crc, format: 'currency' as const, icon: '💰', dataset: [r.monto_crc] },
      { title: 'Monto promedio por procedimiento', value: Math.round(r.monto_promedio_crc), format: 'currency' as const, icon: '📈', dataset: [r.monto_promedio_crc] }
    ];
  }, [data]);

  // Timeline: monto adjudicado por periodo (serie mensual del backend)
  const timelineData = useMemo(() => {
    if (!data?.serie?.length) return [];
    return data.serie.map((punto) => ({
      date: String(punto.periodo),
      value: punto.monto_crc || 0,
      label: formatCurrency(punto.monto_crc, { compact: true })
    }));
  }, [data]);

  // Top proveedores: la API ya devuelve el top-N ordenado por monto; se
  // reordena en memoria (sin recalcular agregados) para la segunda vista.
  const topPorMonto = useMemo(() => [...(data?.top_proveedores || [])].sort((a, b) => b.monto_crc - a.monto_crc), [data]);
  const topPorLineas = useMemo(() => [...(data?.top_proveedores || [])].sort((a, b) => b.lineas - a.lineas), [data]);

  const providerTooltip = useCallback((type: 'monto' | 'lineas') => ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row: any = payload[0].payload;
    if (type === 'monto') {
      return (
        <div className="enhanced-tooltip">
          <div className="enhanced-tooltip__header">{row.display}</div>
          <div className="enhanced-tooltip__value">{formatCurrency(row.monto)}</div>
          <div className="enhanced-tooltip__rank">{row.participacion_pct?.toFixed(2)}% del total</div>
        </div>
      );
    }
    return (
      <div className="enhanced-tooltip">
        <div className="enhanced-tooltip__header">{row.display}</div>
        <div className="enhanced-tooltip__value">{formatNumber(row.lineas)} líneas</div>
        <div className="enhanced-tooltip__rank">{row.participacion_pct?.toFixed(2)}% del total</div>
      </div>
    );
  }, []);

  const isLoading = perfilQuery.isLoading;
  const isError = perfilQuery.isError;
  const sinDatos = Boolean(data) && data!.resumen.procedimientos === 0;

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
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.6)); }
          50% { filter: drop-shadow(0 0 20px rgba(102, 126, 234, 1)); }
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

        {/* Institution Selection Required */}
        {!cedula && (
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

        {/* Loading State */}
        {cedula && isLoading && (
          <div className="dashboard-loading">
            <div className="loading-spinner" />
            <p>Cargando perfil de la institución...</p>
          </div>
        )}

        {/* Error State */}
        {cedula && isError && (
          <div className="dashboard-empty-state">
            <div className="empty-state-content">
              <span className="empty-state-icon">⚠️</span>
              <h2>Error al cargar el perfil</h2>
              <p>{(perfilQuery.error as Error)?.message || 'Ocurrió un error inesperado al consultar la API.'}</p>
              <button className="empty-state-btn" onClick={() => perfilQuery.refetch()}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* No Data State */}
        {cedula && !isLoading && !isError && sinDatos && (
          <div className="dashboard-empty-state">
            <div className="empty-state-content">
              <span className="empty-state-icon">📊</span>
              <h2>Sin datos disponibles</h2>
              <p>No se encontraron datos para la institución y el rango de años seleccionados.</p>
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
        {cedula && !isLoading && !isError && data && !sinDatos && (
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
                    🏛️ {data.nombre || cedula}
                  </h1>
                  <div style={{ display: 'flex', gap: '12px', transform: 'translateZ(10px)', flexWrap: 'wrap' }}>
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
                      Código: {data.cedula}
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
                      Periodo: {dateFmtPeriodo(data.periodo_desde)} — {dateFmtPeriodo(data.periodo_hasta)}
                    </span>
                    {data.indice_concentracion != null && (
                      <span style={{
                        background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.35) 0%, rgba(230, 126, 34, 0.35) 100%)',
                        backdropFilter: 'blur(10px)',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid rgba(255,255,255,0.2)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                      }}>
                        Índice de concentración: {formatNumber(data.indice_concentracion, { decimals: 3 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* KPI Cards Grid */}
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
                <KPICard key={index} {...kpi} />
              ))}
            </section>

            {/* Main Content Grid */}
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
                    title="Evolución temporal (monto adjudicado)"
                    valueFormat="currency"
                    height={300}
                    showBrush={true}
                    showEvents={false}
                  />
                </aside>
              )}

              {/* Main Charts Area */}
              <div className="charts-area" style={{ display: 'grid', gap: '24px' }}>

                {/* Top Providers Charts */}
                <div className="charts-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  perspective: '2000px',
                  transformStyle: 'preserve-3d'
                }}>
                  <Card title="🏆 Top proveedores por monto" className="chart-card">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topPorMonto.map((x) => ({
                        name: x.nombre || x.cedula,
                        display: `${x.nombre || x.cedula} (${x.cedula})`,
                        monto: x.monto_crc,
                        participacion_pct: x.participacion_pct
                      }))} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradMonto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                            <stop offset="100%" stopColor="#764ba2" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v, { compact: true })} stroke="#64748b" style={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={providerTooltip('monto')} cursor={{ fill: 'rgba(102, 126, 234, 0.08)' }} />
                        <Bar dataKey="monto" fill="url(#gradMonto)" radius={[10, 10, 0, 0]}>
                          <LabelList dataKey="monto" position="top" formatter={(val: any) => formatCurrency(Number(val) || 0, { compact: true }) as any} style={{ fontSize: 12, fill: '#1e293b', fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="📊 Top proveedores por líneas adjudicadas" className="chart-card">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topPorLineas.map((x) => ({
                        name: x.nombre || x.cedula,
                        display: `${x.nombre || x.cedula} (${x.cedula})`,
                        lineas: x.lineas,
                        participacion_pct: x.participacion_pct
                      }))} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradLineas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f093fb" stopOpacity={1} />
                            <stop offset="100%" stopColor="#f5576c" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis stroke="#64748b" style={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={providerTooltip('lineas')} cursor={{ fill: 'rgba(240, 147, 251, 0.08)' }} />
                        <Bar dataKey="lineas" fill="url(#gradLineas)" radius={[10, 10, 0, 0]}>
                          <LabelList dataKey="lineas" position="top" formatter={(val: any) => formatNumber(Number(val) || 0) as any} style={{ fontSize: 12, fill: '#1e293b', fontWeight: 800 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Sector Distribution & Tipos de Procedimiento */}
                <div className="charts-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  perspective: '2000px',
                  transformStyle: 'preserve-3d'
                }}>
                  <Card title="🎯 Distribución por categoría de gasto" className="chart-card">
                    <div className="sector-chart">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <defs>
                            {sectorPieData.map((item) => (
                              <linearGradient key={item.gradientId} id={item.gradientId} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={item.baseColor} stopOpacity={1} />
                                <stop offset="100%" stopColor={item.baseColor} stopOpacity={0.7} />
                              </linearGradient>
                            ))}
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
                          >
                            {sectorPieData.map((item, index) => (
                              <Cell key={`cell-${index}`} fill={`url(#${item.gradientId})`} stroke="#ffffff" strokeWidth={3} />
                            ))}
                            <Label content={renderSectorLabel} />
                          </Pie>
                          <Tooltip formatter={(v: any, n: any, p: any) => [`${v} líneas (${(p.payload.percentage || 0).toFixed(1)}%)`, n]} />
                          {(() => {
                            const total = sectorPieData.reduce((s, x) => s + x.value, 0);
                            const top = sectorPieData[0];
                            const pctTop = total && top ? top.percentage.toFixed(1) : '0';
                            return (
                              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontFamily: 'inherit', fill: '#334155' }}>
                                <tspan x="50%" dy="-0.5em" fontSize={18} fontWeight={800} fill="#667eea">{total}</tspan>
                                <tspan x="50%" dy="1.3em" fill="#64748b" fontSize={12}>líneas totales</tspan>
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

                  <Card title="📌 Tipos de procedimiento" className="chart-card">
                    {data.tipos_procedimiento && data.tipos_procedimiento.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                        {data.tipos_procedimiento.map((t) => (
                          <div key={t.tipo_procedimiento} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: 10,
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(102, 126, 234, 0.06)',
                            border: '1px solid rgba(102, 126, 234, 0.15)'
                          }}>
                            <span style={{ fontWeight: 600, color: '#2c3e50', fontSize: 13 }}>{t.tipo_procedimiento}</span>
                            <span style={{ fontSize: 12, color: '#6c757d' }}>{t.procedimientos.toLocaleString('es-CR')} proc.</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#667eea' }}>{t.participacion_pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data">📊 Sin datos de tipos de procedimiento</div>
                    )}
                  </Card>
                </div>

              </div>
            </div>

            {/* Tabla de procedimientos recientes */}
            <section className="tables-section" aria-label="Procedimientos" style={{
              display: 'grid',
              gap: '24px',
              marginTop: '24px',
              perspective: '2000px',
              transformStyle: 'preserve-3d'
            }}>
              <Card title="Procedimientos recientes">
                {procedimientosQuery.isLoading ? (
                  <div className="no-data">Cargando procedimientos...</div>
                ) : procedimientosQuery.isError ? (
                  <div className="no-data">
                    Error al cargar procedimientos.{' '}
                    <button onClick={() => procedimientosQuery.refetch()} style={{ marginLeft: 8, cursor: 'pointer' }}>Reintentar</button>
                  </div>
                ) : !procedimientosQuery.data?.items.length ? (
                  <div className="no-data">📊 No hay procedimientos para el rango seleccionado</div>
                ) : (
                  <VirtualizedTable
                    data={procedimientosQuery.data.items.map((p) => {
                      const descripcion = p.descripcion || '';
                      return {
                        cartel: p.nro_sicop,
                        numero: p.numero_procedimiento,
                        periodo: dateFmtPeriodo(p.periodo),
                        tipo: p.tipo_procedimiento || '—',
                        descripcion,
                        descripcionCorta: descripcion.length > 80 ? descripcion.slice(0, 77) + '…' : descripcion,
                        monto: p.monto_crc || 0,
                        lineas: p.lineas || 0,
                        invitados: p.invitados || 0
                      };
                    })}
                    columns={[
                      { key: 'numero', header: 'Procedimiento', width: 160 },
                      { key: 'periodo', header: 'Periodo', width: 90 },
                      { key: 'tipo', header: 'Tipo', width: 160 },
                      { key: 'descripcionCorta', header: 'Descripción', width: 380, cell: (r: any) => {
                        const id = r.cartel;
                        const isExp = descExpandida.has(id);
                        return (
                          <div
                            className={`desc-cell ${isExp ? 'expanded' : ''}`}
                            style={{ whiteSpace: isExp ? 'normal' : 'nowrap', cursor: 'pointer' }}
                            title={!isExp ? 'Click para expandir' : 'Click para contraer'}
                            onClick={() => toggleDesc(id)}
                          >
                            {isExp ? r.descripcion : r.descripcionCorta}
                          </div>
                        );
                      } },
                      { key: 'monto', header: 'Monto', width: 130, align: 'right', cell: (r: any) => formatCurrency(r.monto, { compact: true }) },
                      { key: 'lineas', header: 'Líneas', width: 90, align: 'right' },
                      { key: 'invitados', header: 'Invitados', width: 100, align: 'right' }
                    ] as SimpleColumn<any>[]}
                    height={280}
                    ariaLabel="Tabla de procedimientos recientes"
                    resizable
                  />
                )}
              </Card>
            </section>

          </>
        )}
      </main>
    </div>
  );
};

export default InstitucionesDashboard;
