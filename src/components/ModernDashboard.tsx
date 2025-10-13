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
  Calendar, Clock, Briefcase, Settings, X, Save, RefreshCw
} from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '../utils/formatting';

// Helper functions migradas de format.ts
const formatCRCCompact = (n: number | null | undefined): string => {
  return formatCurrency(n, { compact: true });
};

const withTooltip = (value: string, full: number | null | undefined): { text: string; title: string } => {
  return { text: value, title: formatCurrency(full) };
};

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
  [key: string]: any;
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
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: `
        0 8px 32px rgba(0,0,0,0.1),
        0 0 0 1px rgba(255,255,255,0.2) inset,
        0 20px 60px rgba(102, 126, 234, 0.15)
      `,
      border: '2px solid rgba(255,255,255,0.3)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      position: 'relative',
      overflow: 'hidden',
      transform: 'translateZ(0) rotateX(0deg) rotateY(0deg)',
      transformStyle: 'preserve-3d',
      perspective: '1500px',
      willChange: 'transform, box-shadow',
      animation: 'card-float 6s ease-in-out infinite'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-20px) translateZ(30px) rotateX(5deg) scale(1.05)';
      e.currentTarget.style.boxShadow = `
        0 25px 70px rgba(0,0,0,0.25),
        0 0 0 2px rgba(255,255,255,0.4) inset,
        0 35px 100px ${color}40
      `;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0deg) scale(1)';
      e.currentTarget.style.boxShadow = `
        0 8px 32px rgba(0,0,0,0.1),
        0 0 0 1px rgba(255,255,255,0.2) inset,
        0 20px 60px rgba(102, 126, 234, 0.15)
      `;
    }}
  >
    {/* Efecto shimmer de fondo */}
    <div style={{
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
      backgroundSize: '500px 500px',
      animation: 'shimmer 4s linear infinite',
      pointerEvents: 'none',
      opacity: 0.6
    }} />

    {badge && (
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        animation: 'wiggle 2s ease-in-out infinite',
        letterSpacing: '0.05em',
        transform: 'translateZ(10px)'
      }}>
        {badge}
      </div>
    )}
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
      <div style={{ flex: 1, transform: 'translateZ(5px)' }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#6c757d',
          letterSpacing: '0.03em',
          textTransform: 'uppercase'
        }}>
          {title}
        </h3>
        <div style={{ 
          fontSize: '38px', 
          fontWeight: 800, 
          color: '#2c3e50',
          marginBottom: '8px',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          background: `linear-gradient(135deg, #2c3e50 0%, ${color} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p style={{ 
            margin: '0 0 12px 0', 
            fontSize: '13px', 
            color: '#adb5bd',
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}>
            {subtitle}
          </p>
        )}
        {trend && trendValue && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginTop: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: trend === 'up' ? '#28a745' : trend === 'down' ? '#dc3545' : '#6c757d',
            padding: '6px 12px',
            background: trend === 'up' ? 'rgba(40, 167, 69, 0.1)' : trend === 'down' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(108, 117, 125, 0.1)',
            borderRadius: '10px',
            width: 'fit-content',
            gap: '6px'
          }}>
            {trend === 'up' ? <TrendingUp size={16} /> : 
             trend === 'down' ? <TrendingDown size={16} /> : 
             <Activity size={16} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div 
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateZ(20px) scale(1.2) rotateZ(10deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateZ(10px) scale(1) rotateZ(0deg)';
        }}
        style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '20px', 
          background: `linear-gradient(135deg, ${color}15 0%, ${color}35 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          boxShadow: `0 8px 24px ${color}30, 0 0 0 1px ${color}20 inset`,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: 'translateZ(10px)',
          willChange: 'transform',
          animation: 'glow-pulse 3s ease-in-out infinite'
        }}>
        <div style={{ transform: 'scale(1.3)' }}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);

const MetricaTemporalChart: React.FC<MetricaTemporalProps> = ({ data, title, height = 300 }) => (
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
  }}>
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
    
    <h3 style={{ 
      margin: '0 0 20px 0', 
      fontSize: '18px', 
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
      zIndex: 1,
      letterSpacing: '-0.01em'
    }}>
      <Calendar size={20} style={{ 
        color: '#667eea',
        filter: 'drop-shadow(0 2px 8px rgba(102, 126, 234, 0.4))',
        animation: 'glow-pulse 2.5s ease-in-out infinite'
      }} />
      <span style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #667eea 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        {title}
      </span>
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
  <div 
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-6px) translateZ(10px) rotateX(3deg) scale(1.02)';
      e.currentTarget.style.boxShadow = index < 3 
        ? '0 12px 35px rgba(102, 126, 234, 0.3), 0 0 0 2px rgba(102, 126, 234, 0.4) inset'
        : '0 8px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3) inset';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) translateZ(0) rotateX(0deg) scale(1)';
      e.currentTarget.style.boxShadow = index < 3 
        ? '0 6px 20px rgba(102, 126, 234, 0.2)'
        : '0 4px 12px rgba(0,0,0,0.08)';
    }}
    style={{
    background: index < 3 
      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 50%, rgba(240, 147, 251, 0.08) 100%)' 
      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
    backdropFilter: 'blur(15px) saturate(160%)',
    WebkitBackdropFilter: 'blur(15px) saturate(160%)',
    border: index < 3 
      ? '2px solid rgba(102, 126, 234, 0.4)' 
      : '2px solid rgba(233, 236, 239, 0.6)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '14px',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: index < 3 
      ? '0 6px 20px rgba(102, 126, 234, 0.2)'
      : '0 4px 12px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
    transform: 'translateZ(0)',
    transformStyle: 'preserve-3d',
    willChange: 'transform, box-shadow'
  }}
  >
    {/* Efecto shimmer para top 3 */}
    {index < 3 && (
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
        backgroundSize: '400px 400px',
        animation: 'shimmer 5s linear infinite',
        pointerEvents: 'none'
      }} />
    )}
    
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15) rotateZ(5deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotateZ(0deg)';
            }}
            style={{
            width: '20px',
            height: '20px',
            backgroundColor: sector.color,
            borderRadius: '6px',
            boxShadow: `0 4px 12px ${sector.color}50`,
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform'
          }} />
          <span style={{ 
            fontWeight: 700, 
            fontSize: '13px',
            color: '#2c3e50',
            letterSpacing: '-0.01em'
          }}>
            {sector.name}
          </span>
          {index < 3 && (
            <span 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1) rotateZ(-3deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotateZ(0deg)';
              }}
              style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              letterSpacing: '0.03em',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform',
              animation: index === 0 ? 'pulse 2s ease-in-out infinite' : 'none'
            }}>
              TOP {index + 1}
            </span>
          )}
        </div>        <div style={{ 
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
  }}>
    {/* Efecto shimmer */}
    <div style={{
      position: 'absolute',
      top: '-50%',
      right: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 193, 7, 0.08) 50%, transparent 70%)',
      backgroundSize: '500px 500px',
      animation: 'shimmer 7s linear infinite',
      pointerEvents: 'none'
    }} />
    
    <h3 style={{ 
      margin: '0 0 20px 0', 
      fontSize: '18px', 
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
      zIndex: 1,
      letterSpacing: '-0.01em'
    }}>
      <AlertCircle size={20} style={{ 
        color: '#f39c12',
        filter: 'drop-shadow(0 2px 8px rgba(243, 156, 18, 0.4))',
        animation: 'glow-pulse 2.5s ease-in-out infinite'
      }} />
      <span style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #f39c12 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Alertas Inteligentes ({alerts.length})
      </span>
    </h3>
    
    <div style={{ maxHeight: '320px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(8px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          }}
          style={{
          padding: '20px 22px',
          borderRadius: '16px',
          marginBottom: '14px',
          background: alert.type === 'error' 
            ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.12) 0%, rgba(220, 53, 69, 0.08) 100%)' 
            : alert.type === 'warning' 
            ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.12) 0%, rgba(243, 156, 18, 0.08) 100%)' 
            : alert.type === 'success' 
            ? 'linear-gradient(135deg, rgba(40, 167, 69, 0.12) 0%, rgba(40, 167, 69, 0.08) 100%)' 
            : 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(102, 126, 234, 0.08) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `2px solid ${
            alert.type === 'error' ? 'rgba(220, 53, 69, 0.3)' :
            alert.type === 'warning' ? 'rgba(243, 156, 18, 0.3)' :
            alert.type === 'success' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(102, 126, 234, 0.3)'
          }`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, box-shadow'
        }}>
          <div style={{ 
            fontWeight: 700, 
            fontSize: '13px',
            marginBottom: '6px',
            color: '#2c3e50',
            letterSpacing: '-0.01em'
          }}>
            {alert.title}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: 1.5,
            fontWeight: 500
          }}>
            {alert.message}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#adb5bd',
            fontWeight: 500
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
    // instituciones, // Unused - available if needed
    error,
    isLoaded
  } = useSicop();

  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<string>('');
  const [filtersApplied, setFiltersApplied] = useState<{ institucion?: string[]; sector?: string[]; keywords?: string[] }>({});
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  
  // Estados para el modal de configuración de colores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [customSubcategoryColors, setCustomSubcategoryColors] = useState<Record<string, string>>({});
  const [tempColors, setTempColors] = useState<Record<string, string>>({});
  const [tempSubColors, setTempSubColors] = useState<Record<string, string>>({});

  // Sincronizar estados temporales cuando se abre el modal
  useEffect(() => {
    if (showColorSettings) {
      setTempColors({ ...customColors });
      setTempSubColors({ ...customSubcategoryColors });
    }
  }, [showColorSettings, customColors, customSubcategoryColors]);

  // Cargar colores personalizados desde localStorage al montar el componente
  useEffect(() => {
    const savedColors = localStorage.getItem('sicop_custom_category_colors');
    const savedSubColors = localStorage.getItem('sicop_custom_subcategory_colors');
    
    if (savedColors) {
      try {
        setCustomColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error al cargar colores personalizados:', e);
      }
    }
    
    if (savedSubColors) {
      try {
        setCustomSubcategoryColors(JSON.parse(savedSubColors));
      } catch (e) {
        console.error('Error al cargar colores de subcategorías:', e);
      }
    }
  }, []);

  // Función para guardar colores personalizados
  const saveCustomColors = (colors: Record<string, string>, subColors: Record<string, string>) => {
    localStorage.setItem('sicop_custom_category_colors', JSON.stringify(colors));
    localStorage.setItem('sicop_custom_subcategory_colors', JSON.stringify(subColors));
    setCustomColors(colors);
    setCustomSubcategoryColors(subColors);
  };

  // Función para resetear colores a los valores por defecto
  const resetColors = () => {
    localStorage.removeItem('sicop_custom_category_colors');
    localStorage.removeItem('sicop_custom_subcategory_colors');
    setCustomColors({});
    setCustomSubcategoryColors({});
  };

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
    const handleCategoryConfigUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Configuración de categorías actualizada, forzando recálculo de dashboard', customEvent.detail);
      
      // Invalidar caché del DataManager para forzar recálculo
      if (dataManager.invalidarCacheSectores) {
        console.log('[ModernDashboard] 🗑️ Invalidando caché de sectores del DataManager...');
        dataManager.invalidarCacheSectores();
      }
      
      // Forzar recálculo del dashboard manteniendo filtros actuales
      setFiltersApplied(prev => ({ ...prev })); // Trigger re-render sin cambiar filtros
      
      // Mostrar notificación al usuario
      console.log('✅ Dashboard actualizado con las nuevas categorías');
    };

    const handleManualCategoryUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Categoría manual actualizada, recalculando dashboard', customEvent.detail);
      
      // Invalidar caché del DataManager para forzar recálculo
      if (dataManager.invalidarCacheSectores) {
        console.log('[ModernDashboard] 🗑️ Invalidando caché de sectores del DataManager...');
        dataManager.invalidarCacheSectores();
      }
      
      // Forzar recálculo del dashboard
      setFiltersApplied(prev => ({ ...prev })); // Trigger re-render
      
      // Mostrar notificación
      const detail = customEvent.detail;
      if (detail?.isNew) {
        console.log(`✅ Nueva categoría "${detail.category?.nombre}" agregada. Dashboard actualizado.`);
      } else {
        console.log(`✅ Categoría actualizada. Dashboard recalculado.`);
      }
    };

    window.addEventListener('categoryConfigurationUpdated', handleCategoryConfigUpdate);
    window.addEventListener('manualCategoriesUpdated', handleManualCategoryUpdate);

    return () => {
      window.removeEventListener('categoryConfigurationUpdated', handleCategoryConfigUpdate);
      window.removeEventListener('manualCategoriesUpdated', handleManualCategoryUpdate);
    };
  }, []);

  // Sectores con datos calculados del análisis
  const sectoresReales = useMemo((): SectorData[] => {
    const coloresDefecto: Record<string, string> = {
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

    return (dashboardData.sector_analysis || []).map((sector: any) => {
      const sectorName = sector.sector.replace('_', ' ');
      // Usar color personalizado si existe, sino usar el color por defecto
      const color = customColors[sectorName] || coloresDefecto[sector.sector as keyof typeof coloresDefecto] || '#95a5a6';
      
      return {
        name: sectorName,
        value: sector.percentage,
        count: sector.count,
        color,
        monto_total: sector.total_monto,
        promedio_monto: sector.promedio_monto,
        instituciones: sector.instituciones_unicas
      };
    });
  }, [dashboardData, customColors]);

  // Opciones de sectores disponibles para filtrado (futuro uso)
  useMemo(() => {
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
    const coloresDefectoSub = ["#82ca9d", "#a0d8ef", "#f7b267", "#f79d84", "#c3aed6", "#a8e6cf", "#ffd3b6", "#ffaaa5"];
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
      .map(([name, value], index) => ({
        name,
        value,
        // Usar color personalizado si existe, sino usar color por defecto
        color: customSubcategoryColors[name] || coloresDefectoSub[index % coloresDefectoSub.length]
      }));
  }, [dashboardData, filtersApplied, customSubcategoryColors]);

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

  // Renderizar modal de configuración de colores
  const renderColorSettingsModal = () => {
    if (!showColorSettings) return null;
    
    // Obtener todas las categorías y subcategorías únicas
    const allCategories = sectoresReales.map(s => s.name);
    const allSubcategories = subcategoriasData.map((s: any) => s.name);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={() => setShowColorSettings(false)}
      >
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Settings size={28} />
              Configuración de Colores
            </h2>
            <button
              onClick={() => setShowColorSettings(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={24} color="#2c3e50" />
            </button>
          </div>

          {/* Categorías */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#2c3e50',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Categorías ({allCategories.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {allCategories.map(category => (
                <div key={category} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(102, 126, 234, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <input
                    type="color"
                    value={tempColors[category] || sectoresReales.find(s => s.name === category)?.color || '#95a5a6'}
                    onChange={(e) => setTempColors({ ...tempColors, [category]: e.target.value })}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2c3e50',
                    flex: 1
                  }}>
                    {category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subcategorías */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#2c3e50',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Subcategorías ({allSubcategories.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '4px'
            }}>
              {allSubcategories.map((subcategory: string) => (
                <div key={subcategory} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: 'rgba(40, 167, 69, 0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(40, 167, 69, 0.2)'
                }}>
                  <input
                    type="color"
                    value={tempSubColors[subcategory] || subcategoriasData.find((s: any) => s.name === subcategory)?.color || '#82ca9d'}
                    onChange={(e) => setTempSubColors({ ...tempSubColors, [subcategory]: e.target.value })}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#2c3e50',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {subcategory}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: '2px solid rgba(102, 126, 234, 0.2)'
          }}>
            <button
              onClick={() => {
                resetColors();
                setTempColors({});
                setTempSubColors({});
              }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <RefreshCw size={16} />
              Resetear
            </button>
            <button
              onClick={() => {
                saveCustomColors(tempColors, tempSubColors);
                setShowColorSettings(false);
              }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              <Save size={16} />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderColorSettingsModal()}
      <div style={{ 
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
      
      {/* Header Premium con Glassmorphism Avanzado */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.2) 100%)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        borderRadius: '28px',
        padding: '48px 56px',
        marginBottom: '42px',
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
        willChange: 'transform',
        zIndex: 1
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
          <div>
            <h1 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '3.2em',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textShadow: `
                0 2px 10px rgba(0,0,0,0.3),
                0 4px 20px rgba(102, 126, 234, 0.4),
                0 0 40px rgba(102, 126, 234, 0.2)
              `,
              transform: 'translateZ(20px)',
              perspective: '1500px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>
              🏛️ SICOP Analytics Pro
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#ffffff',
              fontSize: '1.1em',
              fontWeight: 600,
              textShadow: `
                0 2px 8px rgba(0,0,0,0.4),
                0 1px 3px rgba(0,0,0,0.3)
              `,
              letterSpacing: '0.01em',
              transform: 'translateZ(10px)',
              opacity: 0.98
            }}>
              Análisis Avanzado de Contratación Pública • {dashboardData.kpi_metrics.total_carteles.toLocaleString()} licitaciones • {sectoresReales.length} sectores
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            transform: 'translateZ(15px)'
          }}>
            <button
              onClick={() => alert('Download functionality moved to separate component')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05) rotateY(5deg)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(108, 92, 231, 0.4), 0 0 0 3px rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1) rotateY(0deg)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2), 0 0 40px rgba(108, 92, 231, 0.3)';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #00cec9 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2), 0 0 40px rgba(108, 92, 231, 0.3)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.02em',
                willChange: 'transform'
              }}
              title="Download moved to separate component"
            >
              <span style={{ position: 'relative', zIndex: 1 }}>📊 Info</span>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(0)',
                transition: 'transform 0.6s ease-out',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
            </button>
            <div 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08) rotateZ(2deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotateZ(0deg)';
              }}
              style={{
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 50%, #00b894 100%)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 8px 24px rgba(40, 167, 69, 0.3), 0 0 0 1px rgba(255,255,255,0.2) inset',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: 'pulse 3s ease-in-out infinite',
                letterSpacing: '0.03em',
                willChange: 'transform'
              }}
            >
              <Clock size={18} style={{ animation: 'glow-pulse 2s ease-in-out infinite' }} />
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

      {/* Grid de KPIs Avanzados - Optimizado Full HD */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '28px',
        marginBottom: '48px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
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

      {/* Grid principal de análisis - Premium Glassmorphism */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '32px',
        marginBottom: '36px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
        {/* Distribución sectorial con datos reales */}
        <div 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) translateZ(15px) rotateX(2deg)';
            e.currentTarget.style.boxShadow = `
              0 25px 70px rgba(0,0,0,0.2),
              0 0 0 2px rgba(255,255,255,0.4) inset,
              0 35px 100px rgba(102, 126, 234, 0.25)
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
          style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
          backdropFilter: 'blur(25px) saturate(180%)',
          WebkitBackdropFilter: 'blur(25px) saturate(180%)',
          borderRadius: '28px',
          padding: '36px',
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
        }}>
          {/* Brillo animado */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(102, 126, 234, 0.1) 50%, transparent 70%)',
            backgroundSize: '600px 600px',
            animation: 'shimmer 8s linear infinite',
            pointerEvents: 'none'
          }} />
          
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            position: 'relative',
            zIndex: 1,
            letterSpacing: '-0.01em'
          }}>
            <span style={{ fontSize: '22px', animation: 'glow-pulse 2.5s ease-in-out infinite' }}>📊</span>
            <span style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #667eea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Distribución por Sectores
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              letterSpacing: '0.03em',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              DATOS REALES
            </span>
            <button
              onClick={() => setShowColorSettings(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                color: 'white'
              }}
              title="Configurar colores de categorías"
            >
              <Settings size={18} />
            </button>
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
                    {subcategoriasData.map((entry: { name: string; value: number; color: string }, index: number) => (
                      <Cell key={`subcell-${index}`} fill={entry.color} />
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

      {/* Tendencias temporales - Optimizado Full HD */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginTop: '36px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
        <MetricaTemporalChart 
          data={tendenciasDiarias}
          title="Tendencias Mensual"
          height={280}
        />
        
        {/* Métricas de eficiencia - Premium Design */}
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
        }}>
          {/* Efecto shimmer */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(243, 156, 18, 0.08) 50%, transparent 70%)',
            backgroundSize: '500px 500px',
            animation: 'shimmer 6s linear infinite',
            pointerEvents: 'none'
          }} />
          
          <h3 style={{ 
            margin: '0 0 24px 0', 
            fontSize: '22px', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            position: 'relative',
            zIndex: 1,
            letterSpacing: '-0.01em'
          }}>
            <span style={{ fontSize: '26px', animation: 'glow-pulse 2.5s ease-in-out infinite' }}>⚡</span>
            <span style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #f39c12 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Métricas de Eficiencia
            </span>
          </h3>
          
          <div style={{ display: 'grid', gap: '18px', position: 'relative', zIndex: 1 }}>
            <div 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(8px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(52, 152, 219, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.15)';
              }}
              style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.15) 0%, rgba(52, 152, 219, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(52, 152, 219, 0.3)',
              boxShadow: '0 6px 20px rgba(52, 152, 219, 0.15)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform, box-shadow'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Tasa de Conversión</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3498db', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {metricsReales.tasaConversion}%
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 500 }}>
                Carteles → Contratos
              </div>
            </div>
            
            <div 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(8px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(39, 174, 96, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.15)';
              }}
              style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.15) 0%, rgba(39, 174, 96, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(39, 174, 96, 0.3)',
              boxShadow: '0 6px 20px rgba(39, 174, 96, 0.15)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform, box-shadow'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Competencia Promedio</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#27ae60', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {metricsReales.competenciaPromedio}
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 500 }}>
                Ofertas por cartel
              </div>
            </div>
            
            <div 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(8px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(243, 156, 18, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(243, 156, 18, 0.15)';
              }}
              style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.15) 0%, rgba(243, 156, 18, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(243, 156, 18, 0.3)',
              boxShadow: '0 6px 20px rgba(243, 156, 18, 0.15)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform, box-shadow'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Participación Proveedores</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f39c12', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {metricsReales.eficienciaProveedores}%
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 500 }}>
                Eficiencia del mercado
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complementos: Top entidades y proveedores - Premium Design */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginTop: '36px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
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
        }}>
          {/* Efecto shimmer */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(23, 162, 184, 0.08) 50%, transparent 70%)',
            backgroundSize: '600px 600px',
            animation: 'shimmer 7s linear infinite',
            pointerEvents: 'none'
          }} />
          
          <h3 style={{ 
            margin: '0 0 24px 0', 
            fontSize: '22px', 
            fontWeight: 700,
            position: 'relative',
            zIndex: 1,
            letterSpacing: '-0.01em'
          }}>
            <span style={{ fontSize: '26px', marginRight: '10px', animation: 'glow-pulse 2.5s ease-in-out infinite' }}>🏢</span>
            <span style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #17a2b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Top 10 Instituciones por Monto
            </span>
          </h3>
          
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'grid', gap: 12, position: 'relative', zIndex: 1 }}>
            {topInstituciones.map((it: any, idx: number) => (
              <div 
                key={it.codigo}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(23, 162, 184, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                }}
                style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto auto', 
                gap: 14, 
                alignItems: 'center', 
                padding: '14px 18px', 
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(233, 236, 239, 0.6)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                willChange: 'transform, box-shadow'
              }}>
                <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '15px', letterSpacing: '-0.01em' }}>
                  {idx + 1}. {it.nombre}
                  {it.nombre !== it.codigo && (
                    <span style={{ marginLeft: 10, color: '#999', fontWeight: 500, fontSize: '13px' }}>({it.codigo})</span>
                  )}
                </div>
                <div style={{ color: '#6c757d', fontWeight: 600, fontSize: '13px' }}>{it.carteles.toLocaleString()} carteles</div>
                {(() => { const v = withTooltip(formatCRCCompact(it.monto||0), it.monto); return (
                  <div title={v.title} style={{ fontWeight: 800, color: '#e74c3c', fontSize: '15px' }}>{v.text}</div>
                );})()}
              </div>
            ))}
          </div>
        </div>

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
        }}>
          {/* Efecto shimmer */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(102, 126, 234, 0.08) 50%, transparent 70%)',
            backgroundSize: '600px 600px',
            animation: 'shimmer 7s linear infinite',
            pointerEvents: 'none'
          }} />
          
          <h3 style={{ 
            margin: '0 0 24px 0', 
            fontSize: '22px', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            position: 'relative',
            zIndex: 1,
            letterSpacing: '-0.01em'
          }}>
            <span style={{ fontSize: '26px', animation: 'glow-pulse 2.5s ease-in-out infinite' }}>👷</span>
            <span style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #667eea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Top 10 Proveedores por Monto
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              letterSpacing: '0.03em',
              animation: 'pulse 2.5s ease-in-out infinite'
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
    </>
  );
};

export default ModernDashboard;
