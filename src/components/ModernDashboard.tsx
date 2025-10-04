// ================================
// DASHBOARD SICOP ANALYTICS - VERSIÓN MEJORADA CON DATOS REALES
// ================================

import React, { useState, useMemo, useEffect } from 'react';
import { useSicop } from '../context/SicopContext';
import { dataManager } from '../data/DataManager';
import { AdvancedFilters } from './AdvancedFilters';
import { 
  ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis,
  BarChart, Bar, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle,
  Building, FileText, Target, Users,
  AlertCircle, Activity, DollarSign,
  Calendar, Clock, Briefcase
} from 'lucide-react';
import moment from 'moment';
import { formatCRCCompact, withTooltip } from '../utils/format';

// ================================
// INTERFACES Y TIPOS
// ================================

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  action?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  badge?: string;
}

interface SectorData {
  name: string;
  value: number;
  count: number;
  color: string;
  monto_total: number;
  promedio_monto: number;
  instituciones: number;
}

interface MetricaTemporalProps {
  data: any[];
  title: string;
  height?: number;
}

// Datos para dashboard desde DataManager (calculados de CSV)
const DASH_DEFAULT = { kpi_metrics: { total_contratos: 0, total_carteles: 0, total_proveedores: 0, total_ofertas: 0, total_lineas: 0, promedio_lineas_por_cartel: 0, tasa_exito: 0, crecimiento_contratos: 0, contratos_recientes: 0, carteles_recientes: 0 }, sector_analysis: [] as any[], monto_total_contratos: 0, tendencias_mensuales: [] as any[], tendencias_diarias: [] as any[] };
const COMP_DEFAULT = { top_instituciones: [], top_proveedores: [], offers_histogram: [], tta_distribution: [], tta_stats: { n: 0, mediana: 0, p90: 0 }, hhi_market: { hhi: 0, top5Share: 0 } } as any;

// ================================
// COMPONENTES AUXILIARES
// ================================

const KPICard: React.FC<KPICardProps> = ({ 
  title, value, subtitle, trend, trendValue, icon, color, onClick, badge 
}) => (
  <div 
    onClick={onClick}
    style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '1px solid #e9ecef',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s ease',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      if (onClick) e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      if (onClick) e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    {badge && (
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: 600
      }}>
        {badge}
      </div>
    )}
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          fontWeight: 500, 
          color: '#6c757d' 
        }}>
          {title}
        </h3>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#2c3e50',
          marginBottom: '4px'
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: '#adb5bd' 
          }}>
            {subtitle}
          </p>
        )}
        {trend && trendValue && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginTop: '8px',
            fontSize: '12px',
            color: trend === 'up' ? '#28a745' : trend === 'down' ? '#dc3545' : '#6c757d'
          }}>
            {trend === 'up' ? <TrendingUp size={14} /> : 
             trend === 'down' ? <TrendingDown size={14} /> : 
             <Activity size={14} />}
            <span style={{ marginLeft: '4px' }}>{trendValue}</span>
          </div>
        )}
      </div>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '12px', 
        background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
    </div>
  </div>
);

const MetricaTemporalChart: React.FC<MetricaTemporalProps> = ({ data, title, height = 300 }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e9ecef'
  }}>
    <h3 style={{ 
      margin: '0 0 20px 0', 
      fontSize: '18px', 
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <Calendar size={20} />
      {title}
    </h3>
    
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
  <XAxis dataKey={data && data.length && 'dia' in data[0] ? 'dia' : 'mes'} />
        <YAxis />
        <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Carteles']} />
        <Area 
          type="monotone" 
          dataKey="cantidad" 
          stroke="#667eea" 
          fillOpacity={1} 
          fill="url(#colorGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const SectorCard: React.FC<{ sector: any; index: number }> = ({ sector, index }) => (
  <div style={{
    background: index < 3 ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)' : 'white',
    border: `2px solid ${index < 3 ? '#667eea' : '#e9ecef'}`,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    transition: 'transform 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
  }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: sector.color,
            borderRadius: '4px'
          }} />
          <span style={{ 
            fontWeight: 600, 
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            {sector.name}
          </span>
          {index < 3 && (
            <span style={{
              background: '#667eea',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600
            }}>
              TOP {index + 1}
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '8px', 
          marginTop: '8px',
          fontSize: '12px'
        }}>
          <div>
            <span style={{ color: '#6c757d' }}>Licitaciones: </span>
            <span style={{ fontWeight: 600, color: '#28a745' }}>{sector.count}</span>
          </div>
          <div>
            <span style={{ color: '#6c757d' }}>Porcentaje: </span>
            <span style={{ fontWeight: 600, color: '#667eea' }}>{sector.value}%</span>
          </div>
          <div>
            <span style={{ color: '#6c757d' }}>Instituciones: </span>
            <span style={{ fontWeight: 600, color: '#f39c12' }}>{sector.instituciones || 'N/A'}</span>
          </div>
        </div>
        
        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          <span style={{ color: '#6c757d' }}>Monto Total: </span>
          {(() => { const v = withTooltip(formatCRCCompact(sector.monto_total || 0), sector.monto_total); return (
            <span title={v.title} style={{ fontWeight: 600, color: '#dc3545' }}>{v.text}</span>
          );})()}
          <span style={{ color: '#6c757d', marginLeft: '8px' }}>Promedio: </span>
          {(() => { const v = withTooltip(formatCRCCompact(sector.promedio_monto || 0), sector.promedio_monto); return (
            <span title={v.title} style={{ fontWeight: 600, color: '#17a2b8' }}>{v.text}</span>
          );})()}
        </div>
      </div>
    </div>
  </div>
);

const AlertPanel: React.FC<{ alerts: AlertItem[] }> = ({ alerts }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e9ecef'
  }}>
    <h3 style={{ 
      margin: '0 0 20px 0', 
      fontSize: '18px', 
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <AlertCircle size={20} />
      Alertas Inteligentes ({alerts.length})
    </h3>
    
    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {alerts.map((alert) => (
        <div key={alert.id} style={{
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '12px',
          background: alert.type === 'error' ? '#fff5f5' :
                     alert.type === 'warning' ? '#fffbf0' :
                     alert.type === 'success' ? '#f0fff4' : '#f8f9fa',
          border: `1px solid ${
            alert.type === 'error' ? '#feb2b2' :
            alert.type === 'warning' ? '#fbd38d' :
            alert.type === 'success' ? '#9ae6b4' : '#e9ecef'
          }`
        }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '14px',
            marginBottom: '4px',
            color: '#2c3e50'
          }}>
            {alert.title}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#6c757d',
            marginBottom: '8px'
          }}>
            {alert.message}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#adb5bd'
          }}>
            {moment(alert.timestamp).fromNow()}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ================================
// COMPONENTE PRINCIPAL
// ================================

export const ModernDashboard: React.FC = () => {
  const { 
    instituciones, 
    error,
    isLoaded
  } = useSicop();

  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<string>('');
  const [filtersApplied, setFiltersApplied] = useState<{ institucion?: string[]; sector?: string[]; keywords?: string[] }>({});
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // ================================
  // DATOS REALES MEJORADOS
  // ================================

  // Cargar métricas del DataManager (con filtros aplicados)
  // Importante: dependemos también de isLoaded para recalcular una vez que DataManager termina la carga inicial.
  // Antes sólo dependía de filtersApplied, por lo que tras la carga asíncrona los arrays (incluyendo top_proveedores)
  // permanecían vacíos hasta aplicar un filtro manual.
  // Recalcular métricas sólo cuando cambian filtros; la carga inicial ya dispara un setState en el provider
  const dashboardData = useMemo(
    () => dataManager.getDashboardMetrics?.(filtersApplied) || DASH_DEFAULT,
    [filtersApplied]
  );
  const complementData = useMemo(
    () => dataManager.getComplementaryDashboard?.(filtersApplied) || COMP_DEFAULT,
    [filtersApplied]
  );

  // Datos para los filtros avanzados
  const availableInstitutions = useMemo(() => {
    if (!isLoaded) return [];
    return dataManager.getAvailableInstitutions?.() || [];
  }, [isLoaded]);

  const availableCategories = useMemo(() => {
    if (!isLoaded) return [];
    return dataManager.getAvailableCategories?.() || [];
  }, [isLoaded]);

  // TEMP DEBUG: Log TTA data incoming from DataManager
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const distLen = complementData?.tta_distribution?.length || 0;
      const sumCarteles = (complementData?.tta_distribution || []).reduce((s: number, r: any) => s + (r.carteles || 0), 0);
      console.log('[ModernDashboard][TTA] complementData change:', {
        distLen,
        distribution: complementData?.tta_distribution,
        stats: complementData?.tta_stats,
        sumCarteles,
        filtersApplied
      });
    } catch (e) {
      console.warn('[ModernDashboard][TTA] Logging error', e);
    }
  }, [complementData, filtersApplied, isLoaded]);

  // Escuchar cambios en configuración de categorías para forzar recálculo
  useEffect(() => {
    const handleCategoryConfigUpdate = () => {
      console.log('🔄 Configuración de categorías actualizada, forzando recálculo de dashboard');
      // Limpiar filtros para forzar recálculo completo
      setFiltersApplied({});
      setSearchKeywords('');
      // Forzar actualización del dashboard después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    window.addEventListener('categoryConfigurationUpdated', handleCategoryConfigUpdate);
    window.addEventListener('manualCategoriesUpdated', handleCategoryConfigUpdate);

    return () => {
      window.removeEventListener('categoryConfigurationUpdated', handleCategoryConfigUpdate);
      window.removeEventListener('manualCategoriesUpdated', handleCategoryConfigUpdate);
    };
  }, []);

  // Sectores con datos calculados del análisis
  const sectoresReales = useMemo((): SectorData[] => {
    const colores: Record<string, string> = {
      'Mantenimiento, reparación y limpieza': '#3498db',
      'Suministros de oficina y papelería': '#f39c12',
      'Tecnología y sistemas': '#9b59b6',
      'Vehículos, transporte y repuestos': '#16a085',
      'Salud, medicina y laboratorio': '#e74c3c',
      'Seguridad y vigilancia': '#8e44ad',
      'Construcción y materiales de obra': '#d35400',
      'Alimentos y servicios de catering': '#27ae60',
      'Servicios profesionales y consultoría': '#1abc9c',
      'Educación, cultura y recreación': '#e67e22',
      'Logística y servicios generales': '#2ecc71',
      'Herramientas industriales y electrodomésticos': '#c0392b',
      'Otros': '#95a5a6'
    };

    return (dashboardData.sector_analysis || []).map((sector: any) => ({
      name: sector.sector.replace('_', ' '),
      value: sector.percentage,
      count: sector.count,
      color: colores[sector.sector as keyof typeof colores] || '#95a5a6',
      monto_total: sector.total_monto,
      promedio_monto: sector.promedio_monto,
      instituciones: sector.instituciones_unicas
    }));
  }, [dashboardData]);

  const sectorOptions = useMemo(() => {
    const list = (dashboardData.sector_analysis || []).map((s: any) => s.sector);
    return Array.from(new Set(list));
  }, [dashboardData]);

  // ================================
  // FUNCIONES DE MANEJO DE FILTROS
  // ================================

  const handleApplyFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const keywords = searchKeywords.trim() 
        ? searchKeywords.split(/\s+/).filter(k => k.length > 0)
        : [];
      
      setFiltersApplied({
        ...(selectedInstitutions.length > 0 ? { institucion: selectedInstitutions } : {}),
        ...(selectedCategories.length > 0 ? { sector: selectedCategories } : {}),
        ...(keywords.length > 0 ? { keywords } : {})
      });
    } finally {
      setTimeout(() => setIsLoadingFilters(false), 500); // Small delay for UX
    }
  };

  const handleClearFilters = () => {
    setSelectedInstitutions([]);
    setSelectedCategories([]);
    setSearchKeywords('');
    setFiltersApplied({});
  };

  // Subcategorías agregadas por filtro: si no hay filtro de sector, combina todas
  const subcategoriasData = useMemo(() => {
    const analysis = (dashboardData as any).subcategory_analysis || {};
    const sectoresFiltrados: string[] = (filtersApplied.sector && filtersApplied.sector.length)
      ? (filtersApplied.sector as string[])
      : Object.keys(analysis);
    const agg: Record<string, number> = {};
    sectoresFiltrados.forEach((sec) => {
      const arr = analysis[sec] || [];
      arr.forEach((item: any) => {
        agg[item.subcategory] = (agg[item.subcategory] || 0) + (item.count || 0);
      });
    });
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [dashboardData, filtersApplied]);

  // Métricas calculadas con datos reales
  const metricsReales = useMemo(() => {
    const data = dashboardData.kpi_metrics;
    return {
      tasaConversion: (data.total_carteles ? (data.total_contratos / data.total_carteles) * 100 : 0).toFixed(1),
      eficienciaProveedores: (data.total_proveedores ? (data.total_ofertas / data.total_proveedores) * 100 : 0).toFixed(1),
      competenciaPromedio: (data.total_carteles ? (data.total_ofertas / data.total_carteles) : 0).toFixed(1),
      montoTotalEstimado: sectoresReales.reduce((sum, sector) => sum + sector.monto_total, 0),
      sectorMayor: sectoresReales[0]?.name || 'N/A',
      proporcionServicios: sectoresReales
        .filter(s => s.name.toLowerCase().includes('servicio'))
        .reduce((sum, s) => sum + s.value, 0)
    };
  }, [sectoresReales, dashboardData]);

  // Tendencias diarias desde DataManager (datos reales)
  const tendenciasDiarias = useMemo(() => dashboardData.tendencias_diarias || [], [dashboardData]);
  const offersHistogram = useMemo(() => complementData.offers_histogram || [], [complementData]);
  const ttaDistribution = useMemo(() => complementData.tta_distribution || [], [complementData]);
  const ttaStats = useMemo(() => complementData.tta_stats || { n: 0, mediana: 0, p90: 0 }, [complementData]);
  const topInstituciones = useMemo(() => complementData.top_instituciones || [], [complementData]);
  const topProveedores = useMemo(() => complementData.top_proveedores || [], [complementData]);
  const hhiMarket = useMemo(() => complementData.hhi_market || { hhi: 0, top5Share: 0 }, [complementData]);

  // Alertas inteligentes con datos reales
  const alertasInteligentes: AlertItem[] = useMemo(() => [
    {
      id: 'sector-dominante',
      type: 'info',
      title: 'Sector Dominante Detectado',
      message: `${sectoresReales[0]?.name} representa el ${sectoresReales[0]?.value}% de las licitaciones (${sectoresReales[0]?.count.toLocaleString()} procedimientos)`,
      timestamp: new Date()
    },
    {
      id: 'tasa-conversion',
      type: metricsReales.tasaConversion > '100' ? 'warning' : 'success',
      title: 'Tasa de Conversión',
      message: `${metricsReales.tasaConversion}% de conversión carteles-contratos. ${parseFloat(metricsReales.tasaConversion) > 100 ? 'Algunos procedimientos generan múltiples contratos' : 'Ratio normal'}`,
      timestamp: moment().subtract(15, 'minutes').toDate()
    },
    {
      id: 'competencia',
      type: parseFloat(metricsReales.competenciaPromedio) < 5 ? 'warning' : 'success',
      title: 'Nivel de Competencia',
      message: `Promedio de ${metricsReales.competenciaPromedio} ofertas por cartel. ${parseFloat(metricsReales.competenciaPromedio) < 5 ? 'Competencia limitada' : 'Competencia saludable'}`,
      timestamp: moment().subtract(30, 'minutes').toDate()
    },
    {
      id: 'monto-total',
      type: 'info',
      title: 'Volumen Financiero',
      message: `Monto total: ₡${((dashboardData.monto_total_contratos || 0)/1_000_000_000).toFixed(1)} mil millones`,
      timestamp: moment().subtract(1, 'hour').toDate()
    }
  ], [sectoresReales, metricsReales, dashboardData]);

  // ================================
  // RENDERIZADO
  // ================================

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        <Activity className="animate-spin" size={24} style={{ marginRight: '12px' }} />
        Cargando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fff5f5',
        border: '1px solid #feb2b2',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <AlertTriangle size={48} color="#e53e3e" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: '#e53e3e', marginBottom: '8px' }}>Error al cargar datos</h3>
        <p style={{ color: '#a0aec0', margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      
      {/* Header Premium */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '24px',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '36px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🏛️ SICOP Analytics Pro
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#6c757d',
              fontSize: '18px'
            }}>
              Análisis Avanzado de Contratación Pública • {dashboardData.kpi_metrics.total_carteles.toLocaleString()} licitaciones • {sectoresReales.length} sectores
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => alert('Download functionality moved to separate component')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6c5ce7 0%, #00cec9 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              title="Download moved to separate component"
            >
              Info
            </button>
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={16} />
              Datos Reales
            </div>
          </div>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <AdvancedFilters
        institutions={availableInstitutions}
        categories={availableCategories}
        selectedInstitutions={selectedInstitutions}
        selectedCategories={selectedCategories}
        searchKeywords={searchKeywords}
        onInstitutionsChange={setSelectedInstitutions}
        onCategoriesChange={setSelectedCategories}
        onSearchKeywordsChange={setSearchKeywords}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoadingFilters}
      />

      {/* Grid de KPIs Avanzados */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <KPICard
          title="Total Carteles"
          value={dashboardData.kpi_metrics.total_carteles}
          subtitle="Procedimientos de licitación"
          trend="stable"
          trendValue="Datos oficiales SICOP"
          icon={<FileText size={24} />}
          color="#3498db"
          badge="REAL"
        />
        
        <KPICard
          title="Contratos Generados"
          value={dashboardData.kpi_metrics.total_contratos}
          subtitle={`Tasa conversión: ${metricsReales.tasaConversion}%`}
          trend={parseFloat(metricsReales.tasaConversion) > 100 ? "up" : "stable"}
          trendValue={parseFloat(metricsReales.tasaConversion) > 100 ? "Múltiples contratos/cartel" : "1:1 ratio"}
          icon={<Briefcase size={24} />}
          color="#27ae60"
          badge="REAL"
        />
        
        <KPICard
          title="Proveedores Activos"
          value={dashboardData.kpi_metrics.total_proveedores}
          subtitle={`Eficiencia: ${metricsReales.eficienciaProveedores}%`}
          trend="up"
          trendValue="Base amplia de proveedores"
          icon={<Users size={24} />}
          color="#f39c12"
          badge="REAL"
        />
        
        <KPICard
          title="Ofertas Recibidas"
          value={dashboardData.kpi_metrics.total_ofertas}
          subtitle={`Promedio: ${metricsReales.competenciaPromedio} ofertas/cartel`}
          trend={parseFloat(metricsReales.competenciaPromedio) > 5 ? "up" : "down"}
          trendValue={parseFloat(metricsReales.competenciaPromedio) > 5 ? "Competencia alta" : "Competencia limitada"}
          icon={<Target size={24} />}
          color="#9b59b6"
          badge="REAL"
        />
        
        <KPICard
          title="Monto Total"
          value={formatCRCCompact(dashboardData.monto_total_contratos || 0)}
          subtitle="Miles de millones de colones"
          trend="up"
          trendValue="Volumen alto de contratación"
          icon={<DollarSign size={24} />}
          color="#e74c3c"
          badge="REAL"
        />
        
        <KPICard
          title="Total Líneas"
          value={dashboardData.kpi_metrics.total_lineas}
          subtitle={`Promedio: ${dashboardData.kpi_metrics.promedio_lineas_por_cartel} líneas/cartel`}
          trend={dashboardData.kpi_metrics.promedio_lineas_por_cartel > 5 ? "up" : "stable"}
          trendValue={dashboardData.kpi_metrics.promedio_lineas_por_cartel > 5 ? "Carteles complejos" : "Carteles simples"}
          icon={<FileText size={24} />}
          color="#16a085"
          badge="REAL"
        />
        
        <KPICard
          title="Sectores Activos"
          value={sectoresReales.length}
          subtitle={`Dominante: ${metricsReales.sectorMayor}`}
          trend="stable"
          trendValue={`${metricsReales.proporcionServicios.toFixed(1)}% servicios`}
          icon={<Building size={24} />}
          color="#17a2b8"
          badge="CALC"
        />
      </div>

      {/* Grid principal de análisis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Distribución sectorial con datos reales */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '20px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Distribución por Sectores
            <span style={{
              background: '#28a745',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              DATOS REALES
            </span>
          </h3>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '300px 300px 1fr',
            gap: '24px',
            alignItems: 'center'
          }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sectoresReales}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sectoresReales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} onClick={() => {
                      // Seleccionar este sector específico
                      setSelectedCategories([entry.name]);
                    }} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: string, props: any) => [
                    `${value}% (${props.payload.count.toLocaleString()} licitaciones)`,
                    props.payload.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div>
              <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 8 }}>
                {filtersApplied.sector && filtersApplied.sector.length
                  ? (
                    <>
                      Subcategorías de: <strong>{(filtersApplied.sector as string[]).join(', ')}</strong>
                    </>
                  )
                  : (
                    <>
                      Subcategorías de: <strong>Todos los sectores</strong>
                    </>
                  )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={subcategoriasData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                    {subcategoriasData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell key={`subcell-${index}`} fill={["#82ca9d", "#a0d8ef", "#f7b267", "#f79d84", "#c3aed6", "#a8e6cf", "#ffd3b6", "#ffaaa5"][index % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: string) => [`${value.toLocaleString()} carteles`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {sectoresReales.map((sector, index) => (
                <SectorCard key={sector.name} sector={sector} index={index} />
              ))}
            </div>
          </div>
        </div>

        {/* Panel de alertas inteligentes */}
        <AlertPanel alerts={alertasInteligentes} />
      </div>

      {/* Tendencias temporales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        <MetricaTemporalChart 
          data={tendenciasDiarias}
          title="Tendencias Mensual"
          height={250}
        />
        
        {/* Métricas de eficiencia */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚡ Métricas de Eficiencia
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #3498db15 0%, #3498db25 100%)',
              borderRadius: '12px',
              border: '1px solid #3498db'
            }}>
              <div style={{ fontWeight: 600, color: '#2c3e50' }}>Tasa de Conversión</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3498db' }}>
                {metricsReales.tasaConversion}%
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Carteles → Contratos
              </div>
            </div>
            
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #27ae6015 0%, #27ae6025 100%)',
              borderRadius: '12px',
              border: '1px solid #27ae60'
            }}>
              <div style={{ fontWeight: 600, color: '#2c3e50' }}>Competencia Promedio</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#27ae60' }}>
                {metricsReales.competenciaPromedio}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Ofertas por cartel
              </div>
            </div>
            
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #f39c1215 0%, #f39c1225 100%)',
              borderRadius: '12px',
              border: '1px solid #f39c12'
            }}>
              <div style={{ fontWeight: 600, color: '#2c3e50' }}>Participación Proveedores</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f39c12' }}>
                {metricsReales.eficienciaProveedores}%
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                Eficiencia del mercado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complementos: Top entidades y proveedores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginTop: '24px'
      }}>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>🏢 Top 10 Instituciones por Monto</h3>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {topInstituciones.map((it: any, idx: number) => (
              <div key={it.codigo} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10, border: '1px solid #e9ecef' }}>
                <div style={{ fontWeight: 600, color: '#2c3e50' }}>
                  {idx + 1}. {it.nombre}
                  {it.nombre !== it.codigo && (
                    <span style={{ marginLeft: 8, color: '#999', fontWeight: 400 }}>({it.codigo})</span>
                  )}
                </div>
                <div style={{ color: '#6c757d' }}>{it.carteles.toLocaleString()} carteles</div>
                {(() => { const v = withTooltip(formatCRCCompact(it.monto||0), it.monto); return (
                  <div title={v.title} style={{ fontWeight: 700, color: '#e74c3c' }}>{v.text}</div>
                );})()}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            👷 Top 10 Proveedores por Monto
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              NUEVO
            </span>
          </h3>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {(() => {
              const proveedores = topProveedores || [];
              
              if (proveedores.length === 0) {
                return (
                  <div style={{
                    padding: '20px',
                    border: '2px dashed #e9ecef',
                    borderRadius: 12,
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: 14
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>📊</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin datos de proveedores</div>
                    <div style={{ fontSize: 12 }}>Verifique que los datos CSV estén cargados correctamente</div>
                  </div>
                );
              }
              
              return proveedores.map((proveedor: any, index: number) => {
                const posicion = index + 1;
                const esTopTres = posicion <= 3;
                const montoFormateado = withTooltip(formatCRCCompact(proveedor.monto || 0), proveedor.monto);
                
                return (
                  <div 
                    key={proveedor.id || proveedor.cedula} 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: esTopTres ? '2px solid #667eea' : '1px solid #e9ecef',
                      background: esTopTres 
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                        : 'white',
                      transition: 'all 0.2s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Posición */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: esTopTres 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#f8f9fa',
                      color: esTopTres ? 'white' : '#6c757d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700
                    }}>
                      {posicion}
                    </div>
                    
                    {/* Información del proveedor */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: '#2c3e50',
                        fontSize: 14,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {proveedor.nombre}
                      </div>
                      <div style={{ 
                        fontSize: 11, 
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>ID: {proveedor.cedula}</span>
                        {proveedor.lineas && (
                          <span>• {proveedor.lineas} líneas</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges de posición especial */}
                    {esTopTres && (
                      <div style={{
                        background: posicion === 1 ? '#ffd700' : posicion === 2 ? '#c0c0c0' : '#cd7f32',
                        color: posicion === 1 ? '#8b6914' : posicion === 2 ? '#4a4a4a' : '#5c3e1a',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {posicion === 1 ? '🥇 LÍDER' : posicion === 2 ? '🥈 2DO' : '🥉 3RO'}
                      </div>
                    )}
                    
                    {/* Monto */}
                    <div 
                      title={montoFormateado.title} 
                      style={{ 
                        fontWeight: 700, 
                        color: esTopTres ? '#667eea' : '#27ae60',
                        fontSize: esTopTres ? 15 : 14,
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {montoFormateado.text}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          
          {/* Estadísticas del panel */}
          {topProveedores && topProveedores.length > 0 && (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: 8,
              border: '1px solid #dee2e6'
            }}>
              <div style={{ 
                fontSize: 11, 
                color: '#6c757d',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 8,
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#495057' }}>
                    {withTooltip(
                      formatCRCCompact(topProveedores.reduce((sum: number, p: any) => sum + (p.monto || 0), 0)),
                      topProveedores.reduce((sum: number, p: any) => sum + (p.monto || 0), 0)
                    ).text}
                  </div>
                  <div>Total Top 10</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#495057' }}>
                    {topProveedores.reduce((sum: number, p: any) => sum + (p.lineas || 0), 0).toLocaleString()}
                  </div>
                  <div>Líneas Totales</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#495057' }}>
                    {(topProveedores.reduce((sum: number, p: any) => sum + (p.lineas || 0), 0) / topProveedores.length).toFixed(1)}
                  </div>
                  <div>Líneas/Proveedor</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complementos: Histogramas y tiempos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginTop: '24px'
      }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e9ecef' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>📦 Ofertas por cartel (histograma)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={offersHistogram}>
              <XAxis dataKey="ofertas" />
              <YAxis />
              <Tooltip formatter={(v: any) => [`${v.toLocaleString()} carteles`, 'Cantidad']} />
              <Bar dataKey="carteles" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6c757d' }}>Distribución de número de oferentes por cartel</div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e9ecef' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⏱️ Velocidad de Adjudicación
            {ttaStats.n > 0 && (
              <span style={{ background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                n={ttaStats.n}
              </span>
            )}
          </h3>
          {(() => {
            const total = ttaStats.n || 0;
            const distMap: Record<string, number> = {};
            (ttaDistribution || []).forEach((d: any) => { distMap[d.rango] = d.carteles; });
            const buckets = ['0-15','16-30','31-60','61-90','>90'];
            const enriched = buckets.map(b => ({
              rango: b,
              valor: distMap[b] || 0,
              pct: total ? (100 * (distMap[b] || 0) / total) : 0
            }));
            const activos = enriched.filter(e => e.valor > 0).length;
            const pct015 = enriched[0].pct;
            const pct3030 = enriched[1].pct;
            const velocidad = pct015 >= 70 ? 'Muy rápida' : pct015 >= 50 ? 'Rápida' : pct015 >= 30 ? 'Media' : 'Lenta';
            const interpretacion = (() => {
              if (!total) return 'Sin datos de adjudicación firme disponibles.';
              if (activos <= 2 && pct015 > 80) return 'La gran mayoría de los procesos se adjudican en las primeras dos semanas.';
              if (pct015 > 60 && pct3030 > 20) return 'Predominio de adjudicaciones tempranas con una segunda cola moderada.';
              if (activos >= 4) return 'Distribución más dispersa: revisar cuellos de botella en rangos altos.';
              return 'Distribución concentrada en tramos cortos.';
            })();
            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', height: 40, borderRadius: 12, overflow: 'hidden', border: '1px solid #e9ecef', background: '#f8f9fa' }}>
                    {enriched.map((b, i) => (
                      <div key={b.rango} style={{
                        flex: b.pct || 0,
                        background: b.valor === 0 ? 'transparent' : ['#27ae60','#52be80','#f1c40f','#e67e22','#c0392b'][i],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: b.valor === 0 ? '#adb5bd' : 'white',
                        fontWeight: 600,
                        transition: 'flex 0.4s ease'
                      }} title={`${b.rango} días: ${b.valor.toLocaleString()} (${b.pct.toFixed(1)}%)`}>
                        {b.pct >= 6 ? `${b.rango} (${b.pct.toFixed(0)}%)` : (b.valor > 0 ? b.rango : '')}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                    <div style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
                      <div style={{ fontSize: 11, color: '#6c757d' }}>Mediana</div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: 16 }}>{ttaStats.mediana || 0} d</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
                      <div style={{ fontSize: 11, color: '#6c757d' }}>P90</div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: 16 }}>{ttaStats.p90 || 0} d</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
                      <div style={{ fontSize: 11, color: '#6c757d' }}>≤15 días</div>
                      <div style={{ fontWeight: 700, color: '#27ae60', fontSize: 16 }}>{pct015.toFixed(1)}%</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
                      <div style={{ fontSize: 11, color: '#6c757d' }}>Tramos activos</div>
                      <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: 16 }}>{activos}</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg,#27ae6015,#27ae6030)', borderRadius: 10, border: '1px solid #27ae60' }}>
                      <div style={{ fontSize: 11, color: '#2c3e50' }}>Velocidad</div>
                      <div style={{ fontWeight: 700, color: '#27ae60', fontSize: 16 }}>{velocidad}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: '#495057', background: '#f8f9fa', padding: '12px 14px', borderRadius: 10, border: '1px solid #e9ecef' }}>
                    {interpretacion}
                    {total > 0 && ` • P90=${ttaStats.p90} días • Concentración ${(pct015 + pct3030).toFixed(1)}% en ≤30 días.`}
                  </div>
                  <div style={{ fontSize: 11, color: '#adb5bd' }}>Distribución construida sobre adjudicaciones firmes válidas (excluye casos sin fecha válida o tiempo ≤0).</div>
                </div>
              </>
            );
          })()}
          <div style={{ marginTop: 16, fontSize: 11, color: '#6c757d' }}>HHI mercado={(hhiMarket.hhi||0).toFixed(3)} • Top5={(hhiMarket.top5Share*100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
