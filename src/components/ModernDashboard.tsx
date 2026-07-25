// ================================
// DASHBOARD SICOP ANALYTICS - CONECTADO A LA API BACKEND
// ================================
// Todo el cálculo agregado (sumas, agrupaciones, promedios sobre filas
// crudas) ahora lo hace el backend. Este componente sólo formatea y
// presenta lo que devuelven los endpoints de /v1/dashboard/*.

import React, { useState, useMemo, useEffect } from 'react';
import {
  useResumen,
  useSerie,
  useCategorias,
  useTiposProcedimiento,
  useTopInstituciones,
  useTopProveedores,
  useFiltros
} from '../hooks/api';
import { AdvancedFilters } from './AdvancedFilters';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis,
  AreaChart, Area
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
  proveedores: number;
}

interface MetricaTemporalProps {
  data: any[];
  title: string;
  height?: number;
}

// Paletas de color por defecto (estáticas, fuera del componente para que
// las dependencias de useMemo sean estables entre renders)
const COLORES_DEFECTO_CATEGORIA: Record<string, string> = {
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
const PALETA_TIPOS = ['#82ca9d', '#a0d8ef', '#f7b267', '#f79d84', '#c3aed6', '#a8e6cf', '#ffd3b6', '#ffaaa5'];

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
          {typeof value === 'number' ? value.toLocaleString('es-CR') : value}
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

    {data.length === 0 ? (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', fontSize: 14 }}>
        Sin datos para el rango seleccionado
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip formatter={(value: any) => [value.toLocaleString('es-CR'), 'Procedimientos']} />
          <Area
            type="monotone"
            dataKey="cantidad"
            stroke="#667eea"
            fillOpacity={1}
            fill="url(#colorGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
);

const SectorCard: React.FC<{ sector: SectorData; index: number }> = ({ sector, index }) => (
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
          <div style={{
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
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              letterSpacing: '0.03em',
              animation: index === 0 ? 'pulse 2s ease-in-out infinite' : 'none'
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
            <span style={{ color: '#6c757d' }}>Líneas: </span>
            <span style={{ fontWeight: 600, color: '#28a745' }}>{sector.count.toLocaleString('es-CR')}</span>
          </div>
          <div>
            <span style={{ color: '#6c757d' }}>Participación: </span>
            <span style={{ fontWeight: 600, color: '#667eea' }}>{sector.value.toFixed(1)}%</span>
          </div>
          <div>
            <span style={{ color: '#6c757d' }}>Proveedores: </span>
            <span style={{ fontWeight: 600, color: '#f39c12' }}>{sector.proveedores || 'N/A'}</span>
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          <span style={{ color: '#6c757d' }}>Monto Total: </span>
          {(() => { const v = withTooltip(formatCRCCompact(sector.monto_total || 0), sector.monto_total); return (
            <span title={v.title} style={{ fontWeight: 600, color: '#dc3545' }}>{v.text}</span>
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
  // Rango de periodo (yyyymm) — único filtro que soportan los endpoints
  // de dashboard del backend.
  const [desdeSel, setDesdeSel] = useState<number | undefined>(undefined);
  const [hastaSel, setHastaSel] = useState<number | undefined>(undefined);
  const [desde, setDesde] = useState<number | undefined>(undefined);
  const [hasta, setHasta] = useState<number | undefined>(undefined);

  // Estados para el modal de configuración de colores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [customTipoColors, setCustomTipoColors] = useState<Record<string, string>>({});
  const [tempColors, setTempColors] = useState<Record<string, string>>({});
  const [tempTipoColors, setTempTipoColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (showColorSettings) {
      setTempColors({ ...customColors });
      setTempTipoColors({ ...customTipoColors });
    }
  }, [showColorSettings, customColors, customTipoColors]);

  useEffect(() => {
    const savedColors = localStorage.getItem('sicop_custom_category_colors');
    const savedTipoColors = localStorage.getItem('sicop_custom_subcategory_colors');

    if (savedColors) {
      try {
        setCustomColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error al cargar colores personalizados:', e);
      }
    }

    if (savedTipoColors) {
      try {
        setCustomTipoColors(JSON.parse(savedTipoColors));
      } catch (e) {
        console.error('Error al cargar colores de tipos de procedimiento:', e);
      }
    }
  }, []);

  const saveCustomColors = (colors: Record<string, string>, tipoColors: Record<string, string>) => {
    localStorage.setItem('sicop_custom_category_colors', JSON.stringify(colors));
    localStorage.setItem('sicop_custom_subcategory_colors', JSON.stringify(tipoColors));
    setCustomColors(colors);
    setCustomTipoColors(tipoColors);
  };

  const resetColors = () => {
    localStorage.removeItem('sicop_custom_category_colors');
    localStorage.removeItem('sicop_custom_subcategory_colors');
    setCustomColors({});
    setCustomTipoColors({});
  };

  // ================================
  // DATOS DESDE LA API
  // ================================

  const rango = useMemo(() => ({ desde, hasta }), [desde, hasta]);

  const filtrosQuery = useFiltros();
  const resumenQuery = useResumen(rango);
  const serieQuery = useSerie(rango);
  const categoriasQuery = useCategorias({ ...rango, limite: 20 });
  const tiposQuery = useTiposProcedimiento(rango);
  const topInstitucionesQuery = useTopInstituciones({ ...rango, limite: 10 });
  const topProveedoresQuery = useTopProveedores({ ...rango, limite: 10 });

  const isLoadingFilters = [
    resumenQuery.isFetching,
    serieQuery.isFetching,
    categoriasQuery.isFetching,
    tiposQuery.isFetching,
    topInstitucionesQuery.isFetching,
    topProveedoresQuery.isFetching
  ].some(Boolean);

  const handleApplyFilters = () => {
    setDesde(desdeSel);
    setHasta(hastaSel);
  };

  const handleClearFilters = () => {
    setDesdeSel(undefined);
    setHastaSel(undefined);
    setDesde(undefined);
    setHasta(undefined);
  };

  // Categorías (objeto de gasto) tal como las agrega el backend
  const sectoresReales = useMemo((): SectorData[] => {
    return (categoriasQuery.data || []).map((cat) => {
      const color = customColors[cat.objeto_gasto] || COLORES_DEFECTO_CATEGORIA[cat.objeto_gasto] || '#95a5a6';
      return {
        name: cat.objeto_gasto,
        value: cat.participacion_pct,
        count: cat.lineas,
        color,
        monto_total: cat.monto_crc,
        promedio_monto: cat.lineas > 0 ? cat.monto_crc / cat.lineas : 0,
        proveedores: cat.proveedores_distintos
      };
    });
  }, [categoriasQuery.data, customColors]);

  // Distribución por tipo de procedimiento (reemplaza a las subcategorías,
  // que ya no existen en el contrato de la API)
  const tiposDistribucion = useMemo(() => {
    return (tiposQuery.data || []).map((t, index) => ({
      name: t.tipo_procedimiento,
      value: t.participacion_pct,
      lineas: t.lineas,
      procedimientos: t.procedimientos,
      monto_crc: t.monto_crc,
      color: customTipoColors[t.tipo_procedimiento] || PALETA_TIPOS[index % PALETA_TIPOS.length]
    }));
  }, [tiposQuery.data, customTipoColors]);

  // Métricas derivadas de los KPIs ya agregados por el backend (razones
  // simples entre agregados, no recomputación sobre filas crudas)
  const resumen = resumenQuery.data;
  const metricsReales = useMemo(() => {
    if (!resumen) {
      return { tasaAdjudicacion: '0.0', competenciaPromedio: '0.0', eficienciaProveedores: '0.0' };
    }
    return {
      tasaAdjudicacion: (resumen.procedimientos ? (resumen.ordenes / resumen.procedimientos) * 100 : 0).toFixed(1),
      competenciaPromedio: (resumen.procedimientos ? (resumen.ofertas / resumen.procedimientos) : 0).toFixed(1),
      eficienciaProveedores: (resumen.proveedores ? (resumen.ofertas / resumen.proveedores) * 100 : 0).toFixed(1)
    };
  }, [resumen]);

  const tendenciasMensuales = useMemo(
    () => (serieQuery.data || []).map(p => ({ mes: p.etiqueta, cantidad: p.procedimientos, monto: p.monto_crc })),
    [serieQuery.data]
  );

  const topInstituciones = topInstitucionesQuery.data || [];
  const topProveedores = topProveedoresQuery.data || [];

  // Alertas inteligentes construidas a partir de agregados del backend
  const alertasInteligentes: AlertItem[] = useMemo(() => {
    if (!resumen) return [];
    const alerts: AlertItem[] = [];

    if (sectoresReales[0]) {
      alerts.push({
        id: 'sector-dominante',
        type: 'info',
        title: 'Categoría Dominante Detectada',
        message: `${sectoresReales[0].name} representa el ${sectoresReales[0].value.toFixed(1)}% de las líneas (${sectoresReales[0].count.toLocaleString('es-CR')} líneas)`,
        timestamp: new Date()
      });
    }

    alerts.push({
      id: 'tasa-adjudicacion',
      type: parseFloat(metricsReales.tasaAdjudicacion) < 50 ? 'warning' : 'success',
      title: 'Tasa de Adjudicación',
      message: `${metricsReales.tasaAdjudicacion}% de los procedimientos generaron una orden. ${parseFloat(metricsReales.tasaAdjudicacion) < 50 ? 'Menos de la mitad concluyó en orden.' : 'Ratio saludable de cierre.'}`,
      timestamp: moment().subtract(15, 'minutes').toDate()
    });

    alerts.push({
      id: 'competencia',
      type: parseFloat(metricsReales.competenciaPromedio) < 3 ? 'warning' : 'success',
      title: 'Nivel de Competencia',
      message: `Promedio de ${metricsReales.competenciaPromedio} ofertas por procedimiento. ${parseFloat(metricsReales.competenciaPromedio) < 3 ? 'Competencia limitada.' : 'Competencia saludable.'}`,
      timestamp: moment().subtract(30, 'minutes').toDate()
    });

    alerts.push({
      id: 'monto-total',
      type: 'info',
      title: 'Volumen Financiero',
      message: `Monto adjudicado: ${formatCurrency(resumen.monto_crc, { compact: true })}${resumen.variacion_monto_pct != null ? ` (${resumen.variacion_monto_pct >= 0 ? '+' : ''}${resumen.variacion_monto_pct.toFixed(1)}% vs. periodo anterior)` : ''}`,
      timestamp: moment().subtract(1, 'hour').toDate()
    });

    return alerts;
  }, [resumen, sectoresReales, metricsReales]);

  // ================================
  // RENDERIZADO
  // ================================

  if (resumenQuery.isLoading) {
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

  if (resumenQuery.isError) {
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
        <p style={{ color: '#a0aec0', margin: '0 0 16px 0' }}>
          {(resumenQuery.error as Error)?.message || 'Ocurrió un error inesperado al consultar la API.'}
        </p>
        <button
          onClick={() => resumenQuery.refetch()}
          style={{
            background: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const sinDatos = !resumen || resumen.procedimientos === 0;

  // Renderizar modal de configuración de colores
  const renderColorSettingsModal = () => {
    if (!showColorSettings) return null;

    const allCategories = sectoresReales.map(s => s.name);
    const allTipos = tiposDistribucion.map(t => t.name);

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
              📊 Categorías de gasto ({allCategories.length})
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
              📋 Tipos de procedimiento ({allTipos.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '4px'
            }}>
              {allTipos.map((tipo: string) => (
                <div key={tipo} style={{
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
                    value={tempTipoColors[tipo] || tiposDistribucion.find((t) => t.name === tipo)?.color || '#82ca9d'}
                    onChange={(e) => setTempTipoColors({ ...tempTipoColors, [tipo]: e.target.value })}
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
                    {tipo}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
                setTempTipoColors({});
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
                saveCustomColors(tempColors, tempTipoColors);
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
              Análisis Avanzado de Contratación Pública • {(resumen?.procedimientos ?? 0).toLocaleString('es-CR')} procedimientos • {sectoresReales.length} categorías
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            transform: 'translateZ(15px)'
          }}>
            <div
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
              Datos SICOP en vivo
            </div>
          </div>
        </div>
      </div>

      {/* Filtro de periodo */}
      <AdvancedFilters
        periodos={filtrosQuery.data?.periodos || []}
        desde={desdeSel}
        hasta={hastaSel}
        onDesdeChange={setDesdeSel}
        onHastaChange={setHastaSel}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoadingFilters}
        rangoAplicado={resumen ? { desde: resumen.periodo_desde, hasta: resumen.periodo_hasta } : undefined}
      />

      {sinDatos ? (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <Activity size={40} style={{ marginBottom: 12, opacity: 0.6 }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>No hay datos para el rango seleccionado</h3>
          <p style={{ margin: 0 }}>Ajuste el rango de periodo o límpielo para ver todo el historial disponible.</p>
        </div>
      ) : (
      <>
      {/* Grid de KPIs - Datos reales del backend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '28px',
        marginBottom: '48px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
        <KPICard
          title="Procedimientos"
          value={resumen!.procedimientos}
          subtitle="Procedimientos en el periodo"
          trend="stable"
          trendValue="Datos oficiales SICOP"
          icon={<FileText size={24} />}
          color="#3498db"
          badge="REAL"
        />

        <KPICard
          title="Órdenes Generadas"
          value={resumen!.ordenes}
          subtitle={`Tasa de adjudicación: ${metricsReales.tasaAdjudicacion}%`}
          trend={parseFloat(metricsReales.tasaAdjudicacion) >= 50 ? 'up' : 'down'}
          trendValue={parseFloat(metricsReales.tasaAdjudicacion) >= 50 ? 'Cierre saludable' : 'Cierre bajo'}
          icon={<Briefcase size={24} />}
          color="#27ae60"
          badge="REAL"
        />

        <KPICard
          title="Proveedores Adjudicados"
          value={resumen!.proveedores}
          subtitle={`Ofertas por proveedor: ${metricsReales.eficienciaProveedores}%`}
          trend="up"
          trendValue="Base de proveedores"
          icon={<Users size={24} />}
          color="#f39c12"
          badge="REAL"
        />

        <KPICard
          title="Ofertas Recibidas"
          value={resumen!.ofertas}
          subtitle={`Promedio: ${metricsReales.competenciaPromedio} ofertas/procedimiento`}
          trend={parseFloat(metricsReales.competenciaPromedio) >= 5 ? 'up' : 'down'}
          trendValue={parseFloat(metricsReales.competenciaPromedio) >= 5 ? 'Competencia alta' : 'Competencia limitada'}
          icon={<Target size={24} />}
          color="#9b59b6"
          badge="REAL"
        />

        <KPICard
          title="Monto Adjudicado"
          value={formatCRCCompact(resumen!.monto_crc)}
          subtitle="Colones (₡)"
          trend={resumen!.variacion_monto_pct == null ? 'stable' : resumen!.variacion_monto_pct >= 0 ? 'up' : 'down'}
          trendValue={resumen!.variacion_monto_pct == null ? 'Sin comparación disponible' : `${resumen!.variacion_monto_pct >= 0 ? '+' : ''}${resumen!.variacion_monto_pct.toFixed(1)}% vs. periodo anterior`}
          icon={<DollarSign size={24} />}
          color="#e74c3c"
          badge="REAL"
        />

        <KPICard
          title="Líneas Adjudicadas"
          value={resumen!.lineas_adjudicadas}
          subtitle={`Promedio: ${formatCRCCompact(resumen!.monto_promedio_crc)}/procedimiento`}
          trend="stable"
          trendValue="Detalle de adjudicación"
          icon={<FileText size={24} />}
          color="#16a085"
          badge="REAL"
        />

        <KPICard
          title="Instituciones Activas"
          value={resumen!.instituciones}
          subtitle={`${sectoresReales.length} categorías de gasto`}
          trend="stable"
          trendValue="Cobertura institucional"
          icon={<Building size={24} />}
          color="#17a2b8"
          badge="REAL"
        />
      </div>

      {/* Grid principal de análisis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '32px',
        marginBottom: '36px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
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
              Distribución por Categoría de Gasto
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${Number(value).toFixed(1)}% (${props.payload.count.toLocaleString('es-CR')} líneas)`,
                    props.payload.name
                  ] as any}
                />
              </PieChart>
            </ResponsiveContainer>

            <div>
              <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 8 }}>
                Distribución por <strong>Tipo de Procedimiento</strong>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={tiposDistribucion} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                    {tiposDistribucion.map((entry, index) => (
                      <Cell key={`tipocell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any, props: any) => [`${Number(value).toFixed(1)}%`, props.payload.name] as any} />
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

        <AlertPanel alerts={alertasInteligentes} />
      </div>

      {/* Tendencias temporales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginTop: '36px',
        perspective: '2000px',
        transformStyle: 'preserve-3d'
      }}>
        <MetricaTemporalChart
          data={tendenciasMensuales}
          title="Tendencia Mensual"
          height={280}
        />

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
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.15) 0%, rgba(52, 152, 219, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(52, 152, 219, 0.3)',
              boxShadow: '0 6px 20px rgba(52, 152, 219, 0.15)'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Tasa de Adjudicación</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3498db', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {metricsReales.tasaAdjudicacion}%
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 500 }}>
                Procedimientos → Órdenes
              </div>
            </div>

            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.15) 0%, rgba(39, 174, 96, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(39, 174, 96, 0.3)',
              boxShadow: '0 6px 20px rgba(39, 174, 96, 0.15)'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Competencia Promedio</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#27ae60', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                {metricsReales.competenciaPromedio}
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 500 }}>
                Ofertas por procedimiento
              </div>
            </div>

            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.15) 0%, rgba(243, 156, 18, 0.08) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              border: '2px solid rgba(243, 156, 18, 0.3)',
              boxShadow: '0 6px 20px rgba(243, 156, 18, 0.15)'
            }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.02em' }}>Ofertas por Proveedor</div>
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

      {/* Top entidades y proveedores */}
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

          {topInstituciones.length === 0 ? (
            <div style={{ padding: '20px', border: '2px dashed #e9ecef', borderRadius: 12, textAlign: 'center', color: '#6c757d', fontSize: 14 }}>
              Sin datos de instituciones para el rango seleccionado
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'grid', gap: 12, position: 'relative', zIndex: 1 }}>
              {topInstituciones.map((it, idx) => (
                <div
                  key={it.cedula}
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
                    {it.nombre !== it.cedula && (
                      <span style={{ marginLeft: 10, color: '#999', fontWeight: 500, fontSize: '13px' }}>({it.cedula})</span>
                    )}
                  </div>
                  <div style={{ color: '#6c757d', fontWeight: 600, fontSize: '13px' }}>{it.procedimientos.toLocaleString('es-CR')} procedimientos</div>
                  {(() => { const v = withTooltip(formatCRCCompact(it.monto_crc || 0), it.monto_crc); return (
                    <div title={v.title} style={{ fontWeight: 800, color: '#e74c3c', fontSize: '15px' }}>{v.text}</div>
                  );})()}
                </div>
              ))}
            </div>
          )}
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
          </h3>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {topProveedores.length === 0 ? (
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
                <div style={{ fontSize: 12 }}>No hay adjudicaciones para el rango seleccionado</div>
              </div>
            ) : (
              topProveedores.map((proveedor, index) => {
                const posicion = index + 1;
                const esTopTres = posicion <= 3;
                const montoFormateado = withTooltip(formatCRCCompact(proveedor.monto_crc || 0), proveedor.monto_crc);

                return (
                  <div
                    key={proveedor.cedula}
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
                        <span>• {proveedor.adjudicaciones.toLocaleString('es-CR')} adjudicaciones</span>
                      </div>
                    </div>

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
              })
            )}
          </div>

          {topProveedores.length > 0 && (
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
                      formatCRCCompact(topProveedores.reduce((sum, p) => sum + (p.monto_crc || 0), 0)),
                      topProveedores.reduce((sum, p) => sum + (p.monto_crc || 0), 0)
                    ).text}
                  </div>
                  <div>Total Top 10</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#495057' }}>
                    {topProveedores.reduce((sum, p) => sum + (p.adjudicaciones || 0), 0).toLocaleString('es-CR')}
                  </div>
                  <div>Adjudicaciones Totales</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
    </>
  );
};

export default ModernDashboard;
