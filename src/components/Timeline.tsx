import React, { useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Brush, ReferenceLine, Tooltip } from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatting';
import { useDashboardStore } from '../stores/dashboardStore';

interface TimelineData {
  date: string;
  value: number;
  label?: string;
  eventos?: Array<{ tipo: string; descripcion: string }>;
}

interface TimelineProps {
  data: TimelineData[];
  title: string;
  valueFormat: 'currency' | 'number';
  height?: number;
  showBrush?: boolean;
  showEvents?: boolean;
  onRangeChange?: (startIndex: number, endIndex: number) => void;
  loading?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
  data = [],
  title,
  valueFormat,
  height = 200,
  showBrush = true,
  showEvents = false,
  onRangeChange,
  loading = false
}) => {
  const { filters, setDateRange } = useDashboardStore();

  const processedData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      index,
      formattedDate: formatDate(item.date, { format: 'short' }),
      formattedValue: valueFormat === 'currency' 
        ? formatCurrency(item.value, { compact: true })
        : item.value.toLocaleString('es-CR')
    }));
  }, [data, valueFormat]);

  const handleBrushChange = useCallback((brushData: any) => {
    if (!brushData || !processedData.length) return;

    const { startIndex, endIndex } = brushData;
    const startDate = new Date(processedData[startIndex]?.date);
    const endDate = new Date(processedData[endIndex]?.date);

    if (startDate && endDate) {
      setDateRange({ start: startDate, end: endDate });
      onRangeChange?.(startIndex, endIndex);
    }
  }, [processedData, setDateRange, onRangeChange]);

  const eventLines = useMemo(() => {
    if (!showEvents || !data.length) return [];
    
    return data
      .filter(item => item.eventos && item.eventos.length > 0)
      .map(item => ({
        date: item.date,
        eventos: item.eventos
      }));
  }, [data, showEvents]);

  const customTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const eventos = data.eventos || [];

    return (
      <div className="timeline-tooltip">
        <div className="timeline-tooltip__header">
          <span className="timeline-tooltip__date">
            {formatDate(label, { format: 'medium' })}
          </span>
        </div>
        <div className="timeline-tooltip__content">
          <div className="timeline-tooltip__value">
            <span className="timeline-tooltip__label">Valor:</span>
            <span className="timeline-tooltip__amount">
              {data.formattedValue}
            </span>
          </div>
          {eventos.length > 0 && (
            <div className="timeline-tooltip__events">
              <span className="timeline-tooltip__events-label">Eventos:</span>
              {eventos.map((evento: any, idx: number) => (
                <div key={idx} className="timeline-tooltip__event">
                  <span className="timeline-tooltip__event-type">
                    {evento.tipo}:
                  </span>
                  <span className="timeline-tooltip__event-desc">
                    {evento.descripcion}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="timeline-container loading">
        <div className="timeline-header">
          <h3 className="timeline-title">{title}</h3>
        </div>
        <div className="timeline-skeleton" style={{ height }} />
      </div>
    );
  }

  if (!processedData.length) {
    return (
      <div className="timeline-container empty">
        <div className="timeline-header">
          <h3 className="timeline-title">{title}</h3>
        </div>
        <div className="timeline-empty" style={{ height }}>
          <div className="timeline-empty__content">
            <span className="timeline-empty__icon">📈</span>
            <span className="timeline-empty__text">
              No hay datos temporales para mostrar
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3 className="timeline-title">{title}</h3>
        <div className="timeline-controls">
          <button 
            className="timeline-btn timeline-btn--reset"
            onClick={() => setDateRange({})}
            disabled={!filters.dateRange.start && !filters.dateRange.end}
            aria-label="Limpiar selección de fechas"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: showBrush ? 60 : 20 }}>
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => 
                valueFormat === 'currency' 
                  ? formatCurrency(value, { compact: true })
                  : value.toLocaleString('es-CR', { notation: 'compact' })
              }
            />

            {/* Event reference lines */}
            {eventLines.map((event, idx) => (
              <ReferenceLine 
                key={idx}
                x={event.date}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
              />
            ))}

            <Line
              type="monotone"
              dataKey="value"
              stroke="#2c7be5"
              strokeWidth={2}
              dot={{ fill: '#2c7be5', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: '#2c7be5', strokeWidth: 2, fill: '#fff' }}
              connectNulls={false}
            />

            {showBrush && (
              <Brush
                dataKey="formattedDate"
                height={30}
                stroke="#2c7be5"
                fill="rgba(44, 123, 229, 0.1)"
                onChange={handleBrushChange}
                tickFormatter={(value, index) => {
                  const item = processedData[index];
                  return item ? formatDate(item.date, { format: 'short' }) : '';
                }}
              />
            )}

            {/* Custom tooltip */}
            <Tooltip 
              content={customTooltip}
              cursor={{
                stroke: 'rgba(44, 123, 229, 0.2)',
                strokeWidth: 1,
                strokeDasharray: '5 5'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Range indicator */}
      {(filters.dateRange.start || filters.dateRange.end) && (
        <div className="timeline-range">
          <span className="timeline-range__label">Rango seleccionado:</span>
          <span className="timeline-range__dates">
            {formatDate(filters.dateRange.start)} - {formatDate(filters.dateRange.end)}
          </span>
        </div>
      )}
    </div>
  );
};

export default Timeline;