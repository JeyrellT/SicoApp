import React, { useRef, useCallback, useState } from 'react';
import './VirtualizedTable.css';

export interface SimpleColumn<T extends object> {
  key: keyof T | string;
  header: string;
  width?: number; // px
  align?: 'left' | 'right' | 'center';
  cell?: (row: T) => React.ReactNode;
}

export interface VirtualizedTableProps<T extends object> {
  data: T[];
  columns: SimpleColumn<T>[];
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  ariaLabel?: string;
  resizable?: boolean;
}

function VirtualizedTable<T extends object>({
  data,
  columns,
  height = 420,
  rowHeight = 40,
  overscan = 6,
  onRowClick,
  emptyMessage = 'Sin registros',
  ariaLabel = 'Tabla de datos',
  resizable = false
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemCount = data.length;
  const [scrollTop, setScrollTop] = useState(0);
  const [colWidths, setColWidths] = useState<{ [k: string]: number }>(() => {
    const map: { [k: string]: number } = {};
    columns.forEach(c => { map[String(c.key)] = c.width || 160; });
    return map;
  });
  const dragInfo = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragInfo.current) return;
    const delta = e.clientX - dragInfo.current.startX;
    setColWidths(w => ({ ...w, [dragInfo.current!.key]: Math.max(60, dragInfo.current!.startWidth + delta) }));
  }, []);
  const onMouseUp = useCallback(() => { dragInfo.current = null; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }, [onMouseMove]);
  const startDrag = (key: string, e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault(); e.stopPropagation();
    dragInfo.current = { key, startX: e.clientX, startWidth: colWidths[key] };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(itemCount, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  const visible = data.slice(startIndex, endIndex);

  const totalWidth = columns.reduce((sum, c) => sum + (colWidths[String(c.key)] || c.width || 160), 0);

  const RowRenderer = useCallback((row: T, index: number) => {
    const realIndex = startIndex + index;
    return (
      <div
        key={realIndex}
        role="row"
        aria-rowindex={realIndex + 1}
        className={`vt-row ${realIndex % 2 === 0 ? 'even' : 'odd'}`}
        style={{ position: 'absolute', top: realIndex * rowHeight, height: rowHeight, width: totalWidth }}
        onClick={() => onRowClick && onRowClick(row)}
        tabIndex={0}
      >
        {columns.map(col => {
          let value: any = col.cell ? col.cell(row) : (row as any)[col.key];
          if (value == null || value === '') value = '—';
          // Convert Date objects to ISO date (YYYY-MM-DD)
          if (value instanceof Date) {
            value = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
          } else if (typeof value === 'object' && !React.isValidElement(value)) {
            // Fallback string conversion for accidental object values
            value = String(value);
          }
          return (
            <div
              role="cell"
              key={String(col.key)}
              className="vt-cell"
              style={{ width: colWidths[String(col.key)] || col.width || 160, textAlign: col.align || 'left' }}
            >
              {value}
            </div>
          );
        })}
      </div>
    );
  }, [columns, onRowClick, rowHeight, startIndex, totalWidth, colWidths]);

  if (itemCount === 0) {
    return <div className="vt-empty" aria-label="Tabla vacía">{emptyMessage}</div>;
  }

  return (
    <div className="vt-scroll-outer">
      <div className="vt-wrapper" role="table" aria-label={ariaLabel} style={{ width: totalWidth }}>
        <div className="vt-header" role="rowgroup">
          <div className="vt-row vt-row--header" role="row" style={{ width: totalWidth }}>
            {columns.map(col => {
              const key = String(col.key);
              const w = colWidths[key] || col.width || 160;
              return (
                <div
                  key={key}
                  role="columnheader"
                  className="vt-cell vt-cell--header"
                  style={{ width: w, position: 'relative' }}
                >
                  {col.header}
                  {resizable && (
                    <span
                      className="vt-resize-handle"
                      onMouseDown={(e) => startDrag(key, e)}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Redimensionar columna ${col.header}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="vt-body" role="rowgroup" ref={containerRef} onScroll={onScroll} style={{ height, position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ height: itemCount * rowHeight, position: 'relative', width: totalWidth }}>
            {visible.map((r, i) => RowRenderer(r, i))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export default React.memo(VirtualizedTable, (prevProps, nextProps) => {
  // Solo re-renderizar si cambió la data, columns, height o rowHeight
  return (
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.height === nextProps.height &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.onRowClick === nextProps.onRowClick
  );
}) as typeof VirtualizedTable;
