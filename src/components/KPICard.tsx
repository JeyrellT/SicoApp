import React, { useState, useMemo } from 'react';
import { formatCurrency, formatNumber, formatPercentage, generateMicroInsights, getConcentrationLevel, MicroInsight } from '../utils/formatting';
import { useDashboardStore } from '../stores/dashboardStore';

interface KPICardProps {
  title: string;
  value: number | null | undefined;
  format: 'currency' | 'number' | 'percentage';
  isClickable?: boolean;
  onClick?: () => void;
  dataset?: number[];
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  subtitle?: string;
  isSelected?: boolean;
  loading?: boolean;
  sparklineData?: number[];
  comparison?: {
    label: string;
    value: number;
    benchmark: 'sector' | 'national' | 'historical';
  };
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  format,
  isClickable = false,
  onClick,
  dataset = [],
  previousValue,
  trend,
  size = 'medium',
  icon,
  subtitle,
  isSelected = false,
  loading = false,
  sparklineData = [],
  comparison
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { view } = useDashboardStore();

  const formattedValue = useMemo(() => {
    if (loading) return '—';
    
    switch (format) {
      case 'currency':
        return formatCurrency(value, { compact: true });
      case 'percentage':
        return formatPercentage(value);
      case 'number':
      default:
        return formatNumber(value, { compact: true });
    }
  }, [value, format, loading]);

  const microInsights = useMemo(() => {
    if (!value || !dataset.length) return [];
    return generateMicroInsights(value, dataset, previousValue, title);
  }, [value, dataset, previousValue, title]);

  const concentrationInfo = useMemo(() => {
    if (title.toLowerCase().includes('concentración') && value) {
      return getConcentrationLevel(value);
    }
    return null;
  }, [title, value]);

  const trendIcon = useMemo(() => {
    if (!trend) return null;
    
    const icons = {
      up: '↗️',
      down: '↘️', 
      stable: '→'
    };
    
    const colors = {
      up: '#10b981',
      down: '#ef4444',
      stable: '#6b7280'
    };
    
    return (
      <span style={{ color: colors[trend], fontSize: '14px', marginLeft: '4px' }}>
        {icons[trend]}
      </span>
    );
  }, [trend]);

  const sparkline = useMemo(() => {
    if (!sparklineData.length) return null;
    
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min;
    
    if (range === 0) return null;
    
    const points = sparklineData.map((v, i) => {
      const x = (i / (sparklineData.length - 1)) * 40;
      const y = 20 - ((v - min) / range) * 16;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width="44" height="24" className="kpi-sparkline">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </svg>
    );
  }, [sparklineData]);

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={`kpi-card ${size} ${isClickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${loading ? 'loading' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : -1}
      role={isClickable ? 'button' : 'article'}
      aria-label={`${title}: ${formattedValue}${isClickable ? '. Haga clic para filtrar.' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="kpi-card__header">
        <div className="kpi-card__title-section">
          {icon && <div className="kpi-card__icon">{icon}</div>}
          <div>
            <h3 className="kpi-card__title">{title}</h3>
            {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}
          </div>
        </div>
        {sparkline && (
          <div className="kpi-card__sparkline">
            {sparkline}
          </div>
        )}
      </div>

      <div className="kpi-card__value-section">
        <div className="kpi-card__main-value">
          {loading ? (
            <div className="kpi-card__skeleton" />
          ) : (
            <>
              <span className="kpi-card__value">{formattedValue}</span>
              {trendIcon}
            </>
          )}
        </div>

        {concentrationInfo && (
          <div className="kpi-card__concentration">
            <span 
              className="kpi-card__concentration-badge"
              style={{ backgroundColor: concentrationInfo.color }}
            >
              {concentrationInfo.level}
            </span>
            <span className="kpi-card__concentration-desc">
              {concentrationInfo.description}
            </span>
          </div>
        )}

        {comparison && (
          <div className="kpi-card__comparison">
            <span className="kpi-card__comparison-label">{comparison.label}:</span>
            <span className="kpi-card__comparison-value">
              {formatNumber(comparison.value, { compact: true, showSign: true })}
            </span>
            <span className="kpi-card__comparison-benchmark">
              vs {comparison.benchmark}
            </span>
          </div>
        )}
      </div>

      {/* Micro-insights tooltip */}
      {showTooltip && microInsights.length > 0 && (
        <div className="kpi-card__tooltip" role="tooltip">
          <div className="kpi-card__tooltip-content">
            {microInsights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`kpi-card__insight ${insight.sentiment}`}
              >
                <span className="kpi-card__insight-value">{insight.value}</span>
                <span className="kpi-card__insight-context">{insight.context}</span>
              </div>
            ))}
          </div>
          <div className="kpi-card__tooltip-arrow" />
        </div>
      )}

      {/* Click indicator */}
      {isClickable && (
        <div className="kpi-card__click-indicator" aria-hidden="true">
          👆
        </div>
      )}
    </div>
  );
};

export default KPICard;