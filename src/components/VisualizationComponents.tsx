// ================================
// COMPONENTES DE VISUALIZACIÓN AVANZADA
// ================================
// Conjunto de componentes reutilizables para gráficos y métricas

import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import _ from 'lodash';

// ================================
// INTERFACES
// ================================

interface MetricTrendProps {
  data: Array<{ date: string; value: number; label?: string }>;
  title: string;
  color?: string;
  height?: number;
  showTrend?: boolean;
}

interface ComparisonBarProps {
  data: Array<{ name: string; value: number; comparison?: number }>;
  title: string;
  height?: number;
  colors?: [string, string];
}

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
  centerText?: string;
  height?: number;
}

interface HeatmapProps {
  data: Array<{ day: string; hour: number; value: number }>;
  title: string;
  height?: number;
}

interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info';
  label: string;
  value: string | number;
  description?: string;
}

// ================================
// COMPONENTE DE TENDENCIA MÉTRICA
// ================================

export const MetricTrend: React.FC<MetricTrendProps> = ({
  data,
  title,
  color = '#3498db',
  height = 200,
  showTrend = true
}) => {
  const trendCalculation = () => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  const trend = trendCalculation();

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          {title}
        </h4>
        
        {showTrend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 500
          }}>
            {trend.direction === 'up' && <TrendingUp size={16} color="#27ae60" />}
            {trend.direction === 'down' && <TrendingDown size={16} color="#e74c3c" />}
            {trend.direction === 'stable' && <Minus size={16} color="#95a5a6" />}
            <span style={{
              color: trend.direction === 'up' ? '#27ae60' : 
                     trend.direction === 'down' ? '#e74c3c' : '#95a5a6'
            }}>
              {trend.percentage}%
            </span>
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: '#6c757d' }}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6c757d' }}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color.replace('#', '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ================================
// GRÁFICO DE BARRAS COMPARATIVO
// ================================

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  data,
  title,
  height = 250,
  colors = ['#3498db', '#95a5a6']
}) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  }}>
    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
      {title}
    </h4>
    
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 11, fill: '#6c757d' }}
          axisLine={false}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#6c757d' }}
          axisLine={false}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
        {data[0]?.comparison !== undefined && (
          <Bar dataKey="comparison" fill={colors[1]} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ================================
// GRÁFICO DONUT
// ================================

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  centerText,
  height = 250
}) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  }}>
    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
      {title}
    </h4>
    
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [`${value}%`, name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {centerText && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 600,
          color: '#2c3e50'
        }}>
          {centerText}
        </div>
      )}
    </div>
    
    <div style={{ marginTop: '16px' }}>
      {data.map((item, index) => (
        <div key={index} style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '6px',
          fontSize: '12px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: item.color,
            borderRadius: '2px',
            marginRight: '8px'
          }} />
          <span style={{ flex: 1 }}>{item.name}</span>
          <span style={{ fontWeight: 600 }}>{item.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

// ================================
// MAPA DE CALOR DE ACTIVIDAD
// ================================

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  title,
  height = 200
}) => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getIntensity = (day: string, hour: number) => {
    const point = data.find(d => d.day === day && d.hour === hour);
    return point ? point.value : 0;
  };

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef'
    }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
        {title}
      </h4>
      
      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${hours.length}, 1fr)`,
          gap: '2px',
          fontSize: '10px',
          minWidth: '600px'
        }}>
          <div></div>
          {hours.map(hour => (
            <div key={hour} style={{
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '9px'
            }}>
              {hour}h
            </div>
          ))}
          
          {days.map(day => (
            <React.Fragment key={day}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c757d',
                fontSize: '10px',
                minWidth: '30px'
              }}>
                {day}
              </div>
              {hours.map(hour => {
                const intensity = getIntensity(day, hour);
                const opacity = intensity / maxValue;
                
                return (
                  <div
                    key={`${day}-${hour}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: `rgba(52, 152, 219, ${opacity})`,
                      borderRadius: '2px',
                      border: '1px solid #f1f3f4'
                    }}
                    title={`${day} ${hour}:00 - ${intensity} eventos`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// ================================
// INDICADOR DE ESTADO
// ================================

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  value,
  description
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return { color: '#27ae60', icon: <CheckCircle size={16} />, bg: '#d5f4e6' };
      case 'warning':
        return { color: '#f39c12', icon: <AlertTriangle size={16} />, bg: '#fef5e7' };
      case 'error':
        return { color: '#e74c3c', icon: <AlertTriangle size={16} />, bg: '#fadbd8' };
      case 'info':
        return { color: '#3498db', icon: <TrendingUp size={16} />, bg: '#ebf3fd' };
      default:
        return { color: '#95a5a6', icon: <Minus size={16} />, bg: '#f8f9fa' };
    }
  };

  const config = getStatusConfig();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: config.bg,
      borderRadius: '8px',
      border: `1px solid ${config.color}20`
    }}>
      <div style={{ color: config.color, marginRight: '8px' }}>
        {config.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#2c3e50',
          marginBottom: '2px'
        }}>
          {label}: {value}
        </div>
        {description && (
          <div style={{
            fontSize: '12px',
            color: '#6c757d'
          }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

// ================================
// MINI GRÁFICO SPARKLINE
// ================================

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#3498db',
  height = 40
}) => {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ================================
// TARJETA DE MÉTRICA CON GRÁFICO
// ================================

interface MetricCardWithChartProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  sparklineData?: number[];
  color?: string;
}

export const MetricCardWithChart: React.FC<MetricCardWithChartProps> = ({
  title,
  value,
  change,
  trend,
  sparklineData,
  color = '#3498db'
}) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: sparklineData ? '12px' : '0'
    }}>
      <div>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#6c757d',
          marginBottom: '8px'
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#2c3e50',
          lineHeight: 1
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {change && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
            fontWeight: 500
          }}>
            {trend === 'up' && <TrendingUp size={14} color="#27ae60" />}
            {trend === 'down' && <TrendingDown size={14} color="#e74c3c" />}
            {trend === 'stable' && <Minus size={14} color="#95a5a6" />}
            <span style={{
              color: trend === 'up' ? '#27ae60' : 
                     trend === 'down' ? '#e74c3c' : '#95a5a6'
            }}>
              {change}
            </span>
          </div>
        )}
      </div>
    </div>
    
    {sparklineData && (
      <div style={{ height: '40px', marginTop: '12px' }}>
        <Sparkline data={sparklineData} color={color} />
      </div>
    )}
    
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '80px',
      height: '80px',
      background: `linear-gradient(135deg, ${color}15, transparent)`,
      borderRadius: '50%'
    }} />
  </div>
);

export default {
  MetricTrend,
  ComparisonBar,
  DonutChart,
  Heatmap,
  StatusIndicator,
  Sparkline,
  MetricCardWithChart
};
