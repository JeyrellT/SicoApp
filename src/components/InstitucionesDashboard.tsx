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
  <div className={`inst-card ${className}`} {...rest}>
    <h3 className="inst-card__title">{title}</h3>
    {children}
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

  // Obtener instituciones directamente del DataManager para mejor rendimiento
  const instituciones = useMemo(() => {
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

  // Enhanced tooltips for charts
  const createEnhancedTooltip = useCallback((dataKey: string, format: 'currency' | 'number' = 'number') => {
    return ({ active, payload, label }: any) => {
      if (!active || !payload || !payload.length) return null;

      const value = payload[0].value;
      const dataset = payload[0].payload.dataset || [];
      const rank = dataset.length > 1 ? dataset.findIndex((v: number) => v <= value) + 1 : 1;

      return (
        <div className="enhanced-tooltip">
          <div className="enhanced-tooltip__header">{label}</div>
          <div className="enhanced-tooltip__value">
            {format === 'currency' ? formatCurrency(value) : formatNumber(value)}
          </div>
          {rank > 0 && (
            <div className="enhanced-tooltip__rank">
              Posición #{rank} de {dataset.length}
            </div>
          )}
        </div>
      );
    };
  }, []);

  const proveedoresTopPorMonto = useMemo(() => {
    if (!data?.proveedores?.top_por_monto) return [];
    const arr = (data.proveedores.top_por_monto || []).slice(0, 12);
    const total = data?.proveedores?.top_por_monto?.reduce((s: number, p: any) => s + (p.monto || 0), 0) || 0;
    return arr.map((p: any) => {
      const pct = total > 0 ? ((p.monto / total) * 100) : 0;
      return { ...p, pct };
    });
  }, [data]);

  const proveedoresTopPorContratos = useMemo(() => {
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
    <div className="modern-dashboard">
      {/* Debug Panel */}
      <DebugPanel />

      {/* Filters Panel */}
      <FiltersPanel 
        isCollapsed={view.filtersPanelCollapsed}
        onToggle={() => setFiltersPanelCollapsed(!view.filtersPanelCollapsed)}
      />

      {/* Main Content */}
      <main className={`dashboard-main ${view.filtersPanelCollapsed ? 'filters-collapsed' : 'filters-expanded'}`}>
        
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
            {/* Header with Institution Info */}
            <header className="dashboard-header">
              <div className="institution-info">
                <h1 className="institution-name">{data.institucion?.nombre || filters.institucion}</h1>
                <div className="institution-meta">
                  <span className="institution-type">{data.institucion?.tipo || '—'}</span>
                  <span className="institution-code">Código: {data.institucion?.codigo || filters.institucion}</span>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="dashboard-actions">
                <button className="action-btn" title="Exportar datos">
                  📥 Exportar
                </button>
                <button className="action-btn" title="Compartir dashboard">
                  🔗 Compartir
                </button>
              </div>
            </header>

            {/* KPI Cards Grid */}
            <section className="kpi-grid" aria-label="Indicadores clave de rendimiento">
              {kpiCardsData.map((kpi, index) => (
                <KPICard
                  key={index}
                  {...kpi}
                  isSelected={view.selectedKPI === 'procesos' && kpi.title.includes('Procesos')}
                />
              ))}
            </section>

            {/* Main Content Grid */}
            <div className="content-grid">
              
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
              <div className="charts-area">
                
                {/* Top Providers Charts */}
                <div className="charts-row">
                  <Card title="🏆 Top 10 proveedores por monto" className="chart-card">
                    <ResponsiveContainer width="100%" height={320}>
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
                            <stop offset="100%" stopColor="#764ba2" stopOpacity={0.8} />
                          </linearGradient>
                          <filter id="shadowMonto">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2" floodColor="#667eea"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis tickFormatter={(v: number) => formatCurrency(v, { compact: true })} stroke="#64748b" style={{ fontSize: 12 }} />
                        <Tooltip content={providerTooltip('monto')} cursor={{ fill: 'rgba(102, 126, 234, 0.05)' }} />
                        <Bar dataKey="monto" fill="url(#gradMonto)" radius={[8,8,0,0]} filter="url(#shadowMonto)">
                          <LabelList dataKey="monto" position="top" formatter={(val: any) => formatCurrency(Number(val)||0,{compact:true}) as any} style={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card title="📊 Top 10 proveedores por contratos" className="chart-card">
                    <ResponsiveContainer width="100%" height={320}>
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
                            <stop offset="100%" stopColor="#f5576c" stopOpacity={0.8} />
                          </linearGradient>
                          <filter id="shadowContratos">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2" floodColor="#f093fb"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="name" hide />
                        <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                        <Tooltip content={providerTooltip('contratos')} cursor={{ fill: 'rgba(240, 147, 251, 0.05)' }} />
                        <Bar dataKey="contratos" fill="url(#gradContratos)" radius={[8,8,0,0]} filter="url(#shadowContratos)">
                          <LabelList dataKey="contratos" position="top" formatter={(val: any) => formatNumber(Number(val)||0) as any} style={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Sector Distribution & Keywords */}
                <div className="charts-row">
                  <Card title="🎯 Distribución por sectores" className="chart-card">
                    <div className="sector-chart">
                      <ResponsiveContainer width="100%" height={340}>
                        <PieChart>
                        <defs>
                          {sectorPieData.map((item, index) => (
                            <linearGradient key={item.gradientId} id={item.gradientId} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={item.baseColor} stopOpacity={1} />
                              <stop offset="100%" stopColor={item.baseColor} stopOpacity={0.7} />
                            </linearGradient>
                          ))}
                          <filter id="shadowPie">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
                          </filter>
                        </defs>
                        <Pie
                          data={sectorPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={135}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          filter="url(#shadowPie)"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {sectorPieData.map((item, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#${item.gradientId})`}
                              stroke="#ffffff" 
                              strokeWidth={2}
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
                          background: 'rgba(30, 41, 59, 0.95)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)'
                        }}
                        labelStyle={{ color: 'white', fontWeight: 600 }}
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
              <section className="offers-analytics" aria-label="Analítica de ofertas">
                <h2 className="section-title">🎪 Competencia en licitaciones</h2>
                <div className="offers-grid">
                  <div className="offer-kpis">
                    <div className="offer-kpi">
                      <div className="offer-kpi__label">📊 Promedio de ofertas</div>
                      <div className="offer-kpi__value">{(data.oportunidades.ofertas_analytics.promedio_ofertas || 0).toFixed(2)}</div>
                    </div>
                    <div className="offer-kpi">
                      <div className="offer-kpi__label">⚠️ Una sola oferta</div>
                      <div className="offer-kpi__value">{(data.oportunidades.ofertas_analytics.porcentaje_una_oferta || 0).toFixed(1)}%</div>
                    </div>
                    <div className="offer-kpi">
                      <div className="offer-kpi__label">🧾 Total ofertas</div>
                      <div className="offer-kpi__value">{numberFmt(data.oportunidades.ofertas_analytics.total_ofertas || 0)}</div>
                    </div>
                  </div>
                  <div className="offer-distribution">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.oportunidades.ofertas_analytics.distribucion}>
                        <defs>
                          <linearGradient id="gradOfertas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="ofertas" 
                          label={{ value: 'Número de ofertas', position: 'insideBottom', dy: 10, style: { fontWeight: 600 } }}
                          stroke="#64748b"
                        />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          formatter={(v: any, n: any, p: any) => [`${v} licitaciones (${(p.payload.percentage || 0).toFixed(1)}%)`, 'Licitaciones']}
                          contentStyle={{
                            background: 'rgba(30, 41, 59, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '12px 16px'
                          }}
                          labelStyle={{ color: 'white', fontWeight: 600 }}
                        />
                        <Bar dataKey="count" fill="url(#gradOfertas)" radius={[8,8,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}

            {/* Tablas modernas de licitaciones y contratos */}
            <section className="tables-section" aria-label="Licitaciones y contratos">
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
                  height={260}
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
                  height={300}
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
                  height={300}
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
                    height={320}
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
