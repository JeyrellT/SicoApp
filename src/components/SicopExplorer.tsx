import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSicop } from '../context/SicopContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import Timeline from './Timeline';
import VirtualizedTable, { SimpleColumn } from './VirtualizedTable';
import { formatCurrency, formatDate, formatNumber, colorPalette } from '../utils/formatting';
import './SicopExplorer.css';

const SicopExplorer: React.FC = () => {
  const { isLoaded, buscarCartelPorNumero, sugerirCarteles, instituciones } = useSicop();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ numeroCartel: string; nombreCartel: string; codigoInstitucion: string }>>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'timeline' | 'contracts'>('overview');

  useEffect(() => {
    if (!query) { setSuggestions([]); return; }
    const id = setTimeout(() => {
      const s = sugerirCarteles(query, 10);
      setSuggestions(s);
    }, 180);
    return () => clearTimeout(id);
  }, [query, sugerirCarteles]);

  // Debug quick check for provided sample (does not affect UI)
  useEffect(() => {
    if (!isLoaded) return;
    const probe = '20250401505';
    try {
      const ds = buscarCartelPorNumero(probe);
      if (ds) {
        console.log('🔎 Probe dossier for 20250401505:', { numeroCartel: ds.numeroCartel, kpis: ds.kpis, cartel: ds.cartel });
      } else {
        console.log('🔎 Probe dossier NOT found for 20250401505');
      }
    } catch (e) {
      console.warn('Probe error 20250401505:', e);
    }
  }, [isLoaded, buscarCartelPorNumero]);

  const onSelectSuggestion = useCallback((nro: string) => {
    setQuery(nro);
    setSuggestions([]);
  }, []);

  const onSearch = useCallback(() => {
    if (!query) return;
    setLoading(true);
    const dossier = buscarCartelPorNumero(query);
    setSelected(dossier);
    setLoading(false);
  }, [query, buscarCartelPorNumero]);

  const instName = useMemo(() => {
    if (!selected?.cartel?.codigoInstitucion) return '';
    const inst = instituciones?.find(i => i.codigoInstitucion === selected.cartel.codigoInstitucion);
    return inst?.nombreInstitucion || selected.cartel.codigoInstitucion;
  }, [selected, instituciones]);

  const instCode = useMemo(() => {
    return selected?.cartel?.codigoInstitucion || '';
  }, [selected]);

  const lineasCols: SimpleColumn<any>[] = [
    { key: 'numeroLinea', header: '#', width: 60, align: 'center' },
    { key: 'descripcionLinea', header: 'Descripción', width: 420 },
    { key: 'unidadMedida', header: 'Unidad', width: 90 },
    { key: 'cantidadRequerida', header: 'Cantidad', width: 100, align: 'right', cell: r => formatNumber(r.cantidadRequerida, { decimals: 0 }) },
    { key: 'presupuestoLinea', header: 'Presupuesto', width: 140, align: 'right', cell: r => formatCurrency(r.presupuestoLinea) }
  ];

  const ofertasCols: SimpleColumn<any>[] = [
    { key: 'idProveedor', header: 'Proveedor', width: 200 },
    { key: 'fechaOferta', header: 'Fecha', width: 120, cell: r => formatDate(r.fechaOferta) },
    { key: 'montoOferta', header: 'Monto', width: 160, align: 'right', cell: r => formatCurrency(r.montoOferta) },
    { key: 'estadoOferta', header: 'Estado', width: 120 }
  ];

  const adjCols: SimpleColumn<any>[] = [
    { key: 'numeroLinea', header: 'Línea', width: 60, align: 'center' },
    { key: 'idProveedorAdjudicado', header: 'Proveedor Ganador', width: 240 },
    { key: 'cantidadAdjudicada', header: 'Cant.', width: 90, align: 'right' },
    { key: 'precioAdjudicado', header: 'Precio', width: 140, align: 'right', cell: r => formatCurrency(r.precioAdjudicado) },
    { key: 'montoLineaAdjudicada', header: 'Monto Línea', width: 160, align: 'right', cell: r => formatCurrency(r.montoLineaAdjudicada) }
  ];

  const contratosCols: SimpleColumn<any>[] = [
    { key: 'idContrato', header: 'Contrato', width: 160 },
    { key: 'fechaFirma', header: 'Firma', width: 120, cell: r => formatDate(r.fechaFirma) },
    { key: 'montoContrato', header: 'Monto', width: 160, align: 'right', cell: r => formatCurrency(r.montoContrato) },
    { key: 'estadoContrato', header: 'Estado', width: 120 }
  ];

  const ordenesCols: SimpleColumn<any>[] = [
    { key: 'idOrden', header: 'Orden', width: 140 },
    { key: 'fechaOrden', header: 'Fecha', width: 120, cell: r => formatDate(r.fechaOrden) },
    { key: 'montoOrden', header: 'Monto', width: 140, align: 'right', cell: r => formatCurrency(r.montoOrden) },
    { key: 'descripcionOrden', header: 'Detalle', width: 260 }
  ];

  const recepcionesCols: SimpleColumn<any>[] = [
    { key: 'idRecepcion', header: 'Recepción', width: 160 },
    { key: 'fechaRecepcion', header: 'Fecha', width: 120, cell: r => formatDate(r.fechaRecepcion) },
    { key: 'cantidadRecibida', header: 'Cant.', width: 100, align: 'right', cell: r => formatNumber(r.cantidadRecibida, { decimals: 0 }) },
    { key: 'conformeEntrega', header: 'Conforme', width: 120, cell: r => r.conformeEntrega ? '✅ Sí' : '❌ No' }
  ];

  const lineasRecibidasCols: SimpleColumn<any>[] = [
    { key: 'numeroLinea', header: 'Línea', width: 70, align: 'center' },
    { key: 'cantidadOfertasRecibidas', header: 'Ofertas', width: 100, align: 'right' },
    { key: 'mejorOferta', header: 'Mejor', width: 120, align: 'right', cell: r => formatCurrency(r.mejorOferta) },
    { key: 'peorOferta', header: 'Peor', width: 120, align: 'right', cell: r => formatCurrency(r.peorOferta) },
    { key: 'promedioOfertas', header: 'Promedio', width: 120, align: 'right', cell: r => formatCurrency(r.promedioOfertas) },
    { key: 'desierta', header: 'Desierta', width: 100, cell: r => r.desierta ? 'Sí' : 'No' }
  ];

  const lineasOfertadasCols: SimpleColumn<any>[] = [
    { key: 'numeroLinea', header: 'Línea', width: 70, align: 'center' },
    { key: 'idProveedor', header: 'Proveedor', width: 220 },
    { key: 'precioUnitarioOfertado', header: 'Precio Unit.', width: 140, align: 'right', cell: r => formatCurrency(r.precioUnitarioOfertado) },
    { key: 'cantidadOfertada', header: 'Cantidad', width: 110, align: 'right', cell: r => formatNumber(r.cantidadOfertada) },
    { key: 'montoOfertadoLinea', header: 'Monto Línea', width: 160, align: 'right', cell: r => formatCurrency(r.montoOfertadoLinea) }
  ];

  const garantiasCols: SimpleColumn<any>[] = [
    { key: 'idGarantia', header: 'Garantía', width: 160 },
    { key: 'tipoGarantia', header: 'Tipo', width: 140 },
    { key: 'montoGarantia', header: 'Monto', width: 160, align: 'right', cell: r => formatCurrency(r.montoGarantia) },
    { key: 'emisorGarantia', header: 'Emisor', width: 200 },
    { key: 'fechaInicio', header: 'Inicio', width: 120, cell: r => formatDate(r.fechaInicio) },
    { key: 'fechaVencimiento', header: 'Vence', width: 120, cell: r => formatDate(r.fechaVencimiento) }
  ];

  // 📊 Data processing for charts
  const offerComparisonData = useMemo(() => {
    if (!selected?.ofertas) return [];
    return selected.ofertas
      .slice(0, 10)
      .map((oferta: any) => ({
        proveedor: oferta.idProveedor?.substring(0, 20) || 'N/A',
        monto: oferta.montoOferta || 0,
        estado: oferta.estadoOferta || 'Desconocido'
      }))
      .sort((a: any, b: any) => a.monto - b.monto);
  }, [selected]);

  const providerDistributionData = useMemo(() => {
    if (!selected?.lineasOfertadas) return [];
    const providerCounts = selected.lineasOfertadas.reduce((acc: any, linea: any) => {
      const prov = linea.idProveedor || 'Sin identificar';
      acc[prov] = (acc[prov] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(providerCounts)
      .map(([name, value]: [string, any]) => ({ name: name.substring(0, 25), value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8);
  }, [selected]);

  const timelineData = useMemo(() => {
    if (!selected?.timeline) return [];
    return selected.timeline
      .map((event: any, idx: number) => ({
        fase: event.evento?.substring(0, 20) || `Fase ${idx + 1}`,
        fecha: event.fecha ? new Date(event.fecha).getTime() : 0,
        dias: idx > 0 && selected.timeline[idx - 1]?.fecha 
          ? Math.floor((new Date(event.fecha).getTime() - new Date(selected.timeline[idx - 1].fecha).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }))
      .filter((d: any) => d.fecha > 0);
  }, [selected]);

  const competitionMetrics = useMemo(() => {
    if (!selected?.kpis) return { competitionIndex: 0, savings: 0, avgResponseTime: 0, compliance: 0 };
    
    const ofertas = selected.ofertas?.length || 0;
    const lineas = selected.lineas?.length || 1;
    const competitionIndex = Math.min((ofertas / lineas) * 10, 100);
    
    const presupuesto = selected.kpis.presupuestoTotal || 0;
    const adjudicado = selected.kpis.montoAdjudicado || 0;
    const savings = presupuesto > 0 ? ((presupuesto - adjudicado) / presupuesto) * 100 : 0;
    
    const timeline = selected.timeline || [];
    const publicacion = timeline.find((e: any) => e.evento?.toLowerCase().includes('public'));
    const apertura = timeline.find((e: any) => e.evento?.toLowerCase().includes('apert'));
    const avgResponseTime = publicacion?.fecha && apertura?.fecha 
      ? Math.floor((new Date(apertura.fecha).getTime() - new Date(publicacion.fecha).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const compliance = selected.recepciones?.filter((r: any) => r.conformeEntrega).length || 0;
    const totalRecepciones = selected.recepciones?.length || 1;
    const complianceRate = (compliance / totalRecepciones) * 100;
    
    return { 
      competitionIndex: Math.round(competitionIndex), 
      savings: Math.round(savings * 10) / 10,
      avgResponseTime,
      compliance: Math.round(complianceRate)
    };
  }, [selected]);

  const recursosCols: SimpleColumn<any>[] = [
    { key: 'idRecurso', header: 'Recurso', width: 140 },
    { key: 'idProveedor', header: 'Proveedor', width: 220 },
    { key: 'fechaPresentacion', header: 'Fecha', width: 130, cell: r => formatDate(r.fechaPresentacion) },
    { key: 'estadoRecurso', header: 'Estado', width: 140 },
    { key: 'resultadoRecurso', header: 'Resultado', width: 160 },
    { key: 'motivoRecurso', header: 'Motivo', width: 300 }
  ];

  const reajustesCols: SimpleColumn<any>[] = [
    { key: 'idReajuste', header: 'Reajuste', width: 140 },
    { key: 'fechaReajuste', header: 'Fecha', width: 130, cell: r => formatDate(r.fechaReajuste) },
    { key: 'porcentajeReajuste', header: '%', width: 100, align: 'right', cell: r => (r.porcentajeReajuste != null ? `${r.porcentajeReajuste}%` : '—') },
    { key: 'montoReajuste', header: 'Monto', width: 140, align: 'right', cell: r => formatCurrency(r.montoReajuste) },
    { key: 'nuevoMontoContrato', header: 'Nuevo Monto', width: 160, align: 'right', cell: r => formatCurrency(r.nuevoMontoContrato) },
    { key: 'motivoReajuste', header: 'Motivo', width: 300 }
  ];

  return (
    <div className="sicop-explorer">
      {/* 🔍 Search Section */}
      <div className="search-card">
        <h2>🔎 Explorador SICOP</h2>
        <p>Busca por número SICOP para ver el dossier completo: cartel, líneas, ofertas, adjudicación y contratos con análisis avanzado.</p>
        <div className="search-wrapper">
          <div className="search-input-container">
            <input
              className="search-input"
              placeholder="Ej: 2024LN-000123-0001101101"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
              aria-label="Buscar por número SICOP"
            />
            {suggestions.length > 0 && (
              <div className="suggestions-list" role="listbox" aria-label="Sugerencias">
                {suggestions.map(s => (
                  <div key={s.numeroCartel} className="suggestion-item" onClick={() => onSelectSuggestion(s.numeroCartel)}>
                    <div className="suggestion-item-title">{s.numeroCartel}</div>
                    <div className="suggestion-item-subtitle">{s.nombreCartel}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="search-btn" onClick={onSearch} disabled={!isLoaded || !query || loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {selected && (
        <>
          {/* 📊 Header Card with Cartel Info + Basic KPIs */}
          <div className="header-card">
            <div className="header-banner">
              <div className="header-badge">LICITACIÓN PÚBLICA</div>
              <div className="header-title-section">
                <h1 className="header-main-title">{selected.cartel?.nombreCartel || 'Cartel Sin Nombre'}</h1>
                <div className="header-metadata">
                  <span className="header-meta-item">
                    <span className="meta-icon">📋</span>
                    <span className="meta-label">SICOP:</span>
                    <span className="meta-value">{selected.numeroCartel}</span>
                  </span>
                  {instCode && (
                    <span className="header-meta-item">
                      <span className="meta-icon">🏢</span>
                      <span className="meta-label">Institución:</span>
                      <span className="meta-value">{instCode}</span>
                    </span>
                  )}
                  <span className="header-meta-item">
                    <span className="meta-icon">🏛️</span>
                    <span className="meta-label">{instName}</span>
                  </span>
                </div>
              </div>
              <div className="header-chips">
                {selected.cartel?.estadoCartel && (
                  <span className="chip chip-status">
                    <span className="chip-icon">📋</span>
                    {selected.cartel.estadoCartel}
                  </span>
                )}
                {selected.cartel?.codigoProcedimiento && (
                  <span className="chip chip-procedure">
                    <span className="chip-icon">🔖</span>
                    {selected.cartel.codigoProcedimiento}
                  </span>
                )}
                {selected.cartel?.codigoSistema && (
                  <span className="chip chip-system">
                    <span className="chip-icon">💻</span>
                    {selected.cartel.codigoSistema}
                  </span>
                )}
              </div>
            </div>
            <div className="header-kpis">
              <div className="kpi-mini">
                <span className="kpi-mini-label">Presupuesto</span>
                <strong className="kpi-mini-value">{formatCurrency(selected.kpis?.montoEstimado)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Ofertas</span>
                <strong className="kpi-mini-value">{formatNumber(selected.kpis?.ofertasRecibidas)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Participantes</span>
                <strong className="kpi-mini-value">{formatNumber(selected.kpis?.proveedoresParticipantes)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Ganadores</span>
                <strong className="kpi-mini-value">{formatNumber(selected.kpis?.proveedoresGanadores)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Adjudicado</span>
                <strong className="kpi-mini-value">{formatCurrency(selected.kpis?.montoAdjudicado)}</strong>
              </div>
            </div>
          </div>

          {/* 🎯 Enhanced KPIs with Competition Metrics */}
          <div className="kpi-grid-enhanced">
            <div className="kpi-card-enhanced">
              <div className="kpi-enhanced-header">
                <div className="kpi-enhanced-icon">🏆</div>
              </div>
              <div className="kpi-enhanced-label">Índice de Competencia</div>
              <div className="kpi-enhanced-value">{competitionMetrics.competitionIndex}%</div>
              <div className={`kpi-enhanced-trend ${competitionMetrics.competitionIndex > 50 ? 'positive' : 'neutral'}`}>
                {competitionMetrics.competitionIndex > 50 ? '↑ Alta competencia' : '→ Media competencia'}
              </div>
            </div>
            <div className="kpi-card-enhanced">
              <div className="kpi-enhanced-header">
                <div className="kpi-enhanced-icon">💰</div>
              </div>
              <div className="kpi-enhanced-label">Ahorro Obtenido</div>
              <div className="kpi-enhanced-value">{competitionMetrics.savings.toFixed(1)}%</div>
              <div className={`kpi-enhanced-trend ${competitionMetrics.savings > 0 ? 'positive' : 'negative'}`}>
                {competitionMetrics.savings > 0 ? '↑ Bajo presupuesto' : '↓ Sobre presupuesto'}
              </div>
            </div>
            <div className="kpi-card-enhanced">
              <div className="kpi-enhanced-header">
                <div className="kpi-enhanced-icon">⏱️</div>
              </div>
              <div className="kpi-enhanced-label">Tiempo de Respuesta</div>
              <div className="kpi-enhanced-value">{competitionMetrics.avgResponseTime} días</div>
              <div className={`kpi-enhanced-trend ${competitionMetrics.avgResponseTime < 15 ? 'positive' : 'neutral'}`}>
                {competitionMetrics.avgResponseTime < 15 ? '↑ Rápido' : '→ Normal'}
              </div>
            </div>
            <div className="kpi-card-enhanced">
              <div className="kpi-enhanced-header">
                <div className="kpi-enhanced-icon">✅</div>
              </div>
              <div className="kpi-enhanced-label">Cumplimiento</div>
              <div className="kpi-enhanced-value">{competitionMetrics.compliance}%</div>
              <div className={`kpi-enhanced-trend ${competitionMetrics.compliance > 80 ? 'positive' : 'neutral'}`}>
                {competitionMetrics.compliance > 80 ? '↑ Excelente' : '→ Aceptable'}
              </div>
            </div>
          </div>

          {/* 🗂️ Tab Navigation */}
          <div className="tab-nav">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Vista General
            </button>
            <button 
              className={`tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
              onClick={() => setActiveTab('offers')}
            >
              💼 Ofertas y Competencia
            </button>
            <button 
              className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              ⏱️ Línea de Tiempo
            </button>
            <button 
              className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contracts')}
            >
              📃 Contratos y Ejecución
            </button>
          </div>

          {/* 📊 Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="chart-card">
                <h3>📦 Líneas del Cartel</h3>
                <VirtualizedTable data={selected.lineas || []} columns={lineasCols} height={340} resizable />
              </div>

              <div className="chart-grid">
                <div className="chart-card">
                  <h3>📨 Análisis de Líneas Recibidas</h3>
                  <VirtualizedTable data={selected.lineasRecibidas || []} columns={lineasRecibidasCols} height={280} />
                </div>
                <div className="chart-card">
                  <h3>📝 Análisis de Líneas Ofertadas</h3>
                  <VirtualizedTable data={selected.lineasOfertadas || []} columns={lineasOfertadasCols} height={280} />
                </div>
              </div>
            </>
          )}

          {/* 💼 Offers & Competition Tab */}
          {activeTab === 'offers' && (
            <>
              <div className="chart-grid">
                <div className="chart-card">
                  <h3>📊 Comparación de Ofertas</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={offerComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="offerGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#667eea" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#764ba2" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="proveedor" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="monto" fill="url(#offerGradient)" name="Monto Oferta" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>🎯 Distribución por Proveedor</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={providerDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {providerDistributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colorPalette.categorical[index % colorPalette.categorical.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ 
                        background: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-grid">
                <div className="table-card">
                  <h3>
                    💼 Ofertas Recibidas
                    <span className="table-badge">{selected.ofertas?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.ofertas || []} columns={ofertasCols} height={320} />
                </div>
                <div className="table-card">
                  <h3>
                    🏆 Adjudicaciones
                    <span className="table-badge">{selected.lineasAdjudicadas?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.lineasAdjudicadas || []} columns={adjCols} height={320} />
                </div>
              </div>
            </>
          )}

          {/* ⏱️ Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              <div className="chart-card">
                <h3>⏱️ Línea de Tiempo del Proceso</h3>
                <Timeline data={selected.timeline} title="Hitos del Proceso" valueFormat="number" height={280} showBrush={false} />
                {selected.kpis?.ttaDias != null && (
                  <div style={{ marginTop: 16, padding: '16px', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '12px', color: '#6b7280', fontWeight: 600 }}>
                    ⏱️ TTA (Apertura → Adjudicación): <strong style={{ color: '#667eea', fontSize: '18px' }}>{selected.kpis.ttaDias} días</strong>
                  </div>
                )}
              </div>

              {timelineData.length > 0 && (
                <div className="chart-card">
                  <h3>📈 Progreso por Fase</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#667eea" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#764ba2" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="fase" tick={{ fill: '#6b7280', fontSize: 11 }} angle={-20} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} label={{ value: 'Días', angle: -90, position: 'insideLeft' }} />
                      <Tooltip contentStyle={{ 
                        background: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} />
                      <Area type="monotone" dataKey="dias" stroke="#667eea" strokeWidth={3} fill="url(#timelineGradient)" name="Días transcurridos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* 📃 Contracts & Execution Tab */}
          {activeTab === 'contracts' && (
            <>
              <div className="chart-grid">
                <div className="table-card">
                  <h3>
                    📃 Contratos
                    <span className="table-badge">{selected.contratos?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.contratos || []} columns={contratosCols} height={300} />
                </div>
                <div className="table-card">
                  <h3>
                    🧾 Órdenes de Compra
                    <span className="table-badge">{selected.ordenes?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.ordenes || []} columns={ordenesCols} height={300} />
                </div>
              </div>

              <div className="chart-grid">
                <div className="table-card">
                  <h3>
                    📦 Recepciones
                    <span className="table-badge">{selected.recepciones?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.recepciones || []} columns={recepcionesCols} height={300} />
                </div>
                <div className="table-card">
                  <h3>
                    🛡️ Garantías
                    <span className="table-badge">{selected.garantias?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.garantias || []} columns={garantiasCols} height={300} />
                </div>
              </div>

              <div className="chart-grid">
                <div className="table-card">
                  <h3>
                    ⚖️ Recursos / Objeciones
                    <span className="table-badge">{selected.recursos?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.recursos || []} columns={recursosCols} height={280} />
                </div>
                <div className="table-card">
                  <h3>
                    🔁 Reajustes de Precios
                    <span className="table-badge">{selected.reajustes?.length || 0}</span>
                  </h3>
                  <VirtualizedTable data={selected.reajustes || []} columns={reajustesCols} height={280} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SicopExplorer;
