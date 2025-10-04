// ================================
// FORMATTING UTILITIES - COSTA RICA
// ================================
// Locale-specific formatting for currency, numbers, dates, and percentages
// with smart abbreviations and accessibility features

const CR_LOCALE = 'es-CR';

// Number formatting with K/M/MM abbreviations
export const formatNumber = (
  value: number | null | undefined,
  options: {
    compact?: boolean;
    decimals?: number;
    showSign?: boolean;
  } = {}
): string => {
  if (value == null || isNaN(value)) return '—';
  
  const { compact = false, decimals = 0, showSign = false } = options;
  
  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}MM`;
    } else if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
  }
  
  const formatter = new Intl.NumberFormat(CR_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'exceptZero' : 'auto'
  });
  
  return formatter.format(value);
};

// Currency formatting with ₡ symbol
export const formatCurrency = (
  value: number | null | undefined,
  options: {
    compact?: boolean;
    showDecimals?: boolean;
    showSign?: boolean;
  } = {}
): string => {
  if (value == null || isNaN(value)) return '—';
  
  const { compact = false, showDecimals = false, showSign = false } = options;
  
  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `₡${(value / 1_000_000_000).toFixed(1)}MM`;
    } else if (Math.abs(value) >= 1_000_000) {
      return `₡${(value / 1_000_000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1_000) {
      return `₡${(value / 1_000).toFixed(1)}K`;
    }
  }
  
  const formatter = new Intl.NumberFormat(CR_LOCALE, {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
    signDisplay: showSign ? 'exceptZero' : 'auto'
  });
  
  return formatter.format(value).replace('CRC', '₡');
};

// Percentage formatting
export const formatPercentage = (
  value: number | null | undefined,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string => {
  if (value == null || isNaN(value)) return '—';
  
  const { decimals = 1, showSign = false } = options;
  
  const formatter = new Intl.NumberFormat(CR_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'exceptZero' : 'auto'
  });
  
  return formatter.format(value / 100);
};

// Date formatting for Costa Rica
export const formatDate = (
  date: Date | string | null | undefined,
  options: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    includeTime?: boolean;
  } = {}
): string => {
  if (!date) return '—';
  
  const { format = 'short', includeTime = false } = options;
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return String(date);
  
  if (format === 'relative') {
    const rtf = new Intl.RelativeTimeFormat(CR_LOCALE, { numeric: 'auto' });
    const now = new Date();
    const diffInDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (Math.abs(diffInDays) < 1) return 'hoy';
    if (Math.abs(diffInDays) < 7) return rtf.format(diffInDays, 'day');
    if (Math.abs(diffInDays) < 30) return rtf.format(Math.floor(diffInDays / 7), 'week');
    if (Math.abs(diffInDays) < 365) return rtf.format(Math.floor(diffInDays / 30), 'month');
    return rtf.format(Math.floor(diffInDays / 365), 'year');
  }
  
  const dateStyle = format === 'short' ? 'short' : format === 'medium' ? 'medium' : 'long';
  
  const formatter = new Intl.DateTimeFormat(CR_LOCALE, {
    dateStyle: dateStyle as any,
    timeStyle: includeTime ? 'short' : undefined
  });
  
  return formatter.format(d);
};

// Smart insights helpers
export const calculateRank = (value: number, dataset: number[]): number => {
  if (!dataset.length) return 0;
  const sorted = [...dataset].sort((a, b) => b - a);
  const rank = sorted.findIndex(v => v <= value) + 1;
  return rank || dataset.length;
};

export const calculatePercentileRank = (value: number, dataset: number[]): number => {
  if (!dataset.length) return 0;
  const belowCount = dataset.filter(v => v < value).length;
  return (belowCount / dataset.length) * 100;
};

export const detectOutliers = (dataset: number[]): { 
  outliers: number[]; 
  threshold: { lower: number; upper: number } 
} => {
  if (dataset.length < 4) return { outliers: [], threshold: { lower: 0, upper: 0 } };
  
  const sorted = [...dataset].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  
  const outliers = dataset.filter(v => v < lower || v > upper);
  
  return { outliers, threshold: { lower, upper } };
};

export const concentrationIndex = (values: number[]): number => {
  if (!values.length) return 0;
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  
  // Herfindahl-Hirschman Index
  const shares = values.map(v => v / total);
  return shares.reduce((sum, share) => sum + share * share, 0) * 10000; // Scale to 0-10000
};

export const getConcentrationLevel = (hhi: number): { 
  level: 'Bajo' | 'Medio' | 'Alto'; 
  color: string;
  description: string;
} => {
  if (hhi < 1500) {
    return {
      level: 'Bajo',
      color: '#10b981',
      description: 'Mercado diversificado con muchos proveedores'
    };
  } else if (hhi < 2500) {
    return {
      level: 'Medio',
      color: '#f59e0b',
      description: 'Concentración moderada en pocos proveedores'
    };
  } else {
    return {
      level: 'Alto',
      color: '#ef4444',
      description: 'Alta concentración en muy pocos proveedores'
    };
  }
};

// Micro-insights generator
export interface MicroInsight {
  type: 'rank' | 'percentage' | 'trend' | 'outlier' | 'comparison';
  value: string;
  context: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export const generateMicroInsights = (
  value: number,
  dataset: number[],
  previousValue?: number,
  label?: string
): MicroInsight[] => {
  const insights: MicroInsight[] = [];
  
  if (dataset.length > 0) {
    // Rank insight
    const rank = calculateRank(value, dataset);
    const total = dataset.length;
    insights.push({
      type: 'rank',
      value: `#${rank} de ${total}`,
      context: rank <= 3 ? 'Top performer' : rank > total * 0.8 ? 'Abajo del promedio' : 'Posición media',
      sentiment: rank <= 3 ? 'positive' : rank > total * 0.8 ? 'negative' : 'neutral'
    });
    
    // Percentage of total
    const total_sum = dataset.reduce((sum, v) => sum + v, 0);
    if (total_sum > 0) {
      const percentage = (value / total_sum) * 100;
      insights.push({
        type: 'percentage',
        value: formatPercentage(percentage),
        context: 'del total',
        sentiment: percentage > 10 ? 'positive' : percentage < 1 ? 'negative' : 'neutral'
      });
    }
  }
  
  // Trend insight
  if (previousValue != null && previousValue > 0) {
    const change = ((value - previousValue) / previousValue) * 100;
    const direction = change > 0 ? '↗' : change < 0 ? '↘' : '→';
    insights.push({
      type: 'trend',
      value: `${direction} ${formatPercentage(Math.abs(change), { showSign: false })}`,
      context: change > 0 ? 'vs período anterior' : change < 0 ? 'vs período anterior' : 'sin cambio',
      sentiment: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    });
  }
  
  // Outlier detection
  if (dataset.length >= 4) {
    const { outliers } = detectOutliers(dataset);
    if (outliers.includes(value)) {
      insights.push({
        type: 'outlier',
        value: '⚠️ Atípico',
        context: 'Valor fuera del rango normal',
        sentiment: 'negative'
      });
    }
  }
  
  return insights;
};

// Color-blind friendly palette
export const colorPalette = {
  primary: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  sequential: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
  diverging: ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'],
  categorical: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    neutral: '#6b7280'
  }
};

// Accessibility helpers
export const getContrastColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};