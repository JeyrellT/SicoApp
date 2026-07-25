import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useProcedimientos, useDetalleProcedimiento } from '../hooks/api';
import { ApiError } from '../api/cliente';
import { formatCurrency, formatNumber } from '../utils/formatting';
import type { ProcedimientoItem } from '../api/tipos';
import './SicopExplorer.css';

// Claves de ProcedimientoItem que ya se muestran explícitamente en el
// encabezado/KPIs — el resto de las claves que devuelva el backend en el
// detalle (que es un superconjunto abierto, ver DetalleProcedimiento) se
// listan de forma genérica sin asumir su estructura.
const CLAVES_CONOCIDAS = new Set<string>([
  'nro_sicop', 'numero_procedimiento', 'descripcion', 'ced_institucion',
  'institucion', 'tipo_procedimiento', 'modalidad', 'periodo', 'lineas',
  'monto_crc', 'invitados'
]);

const etiquetaClave = (clave: string): string =>
  clave
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatearValorGenerico = (clave: string, valor: unknown): string => {
  if (valor == null) return '—';
  const claveLower = clave.toLowerCase();
  if (typeof valor === 'number') {
    if (claveLower.includes('monto') || claveLower.includes('precio')) {
      return formatCurrency(valor);
    }
    return formatNumber(valor);
  }
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') {
    try {
      const s = JSON.stringify(valor);
      return s.length > 200 ? `${s.slice(0, 197)}…` : s;
    } catch {
      return String(valor);
    }
  }
  return String(valor);
};

const SicopExplorer: React.FC = () => {
  const { tienePermiso } = useAuth();
  const puedeVerDetalle = tienePermiso('detalle');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [nroSeleccionado, setNroSeleccionado] = useState<string | undefined>(undefined);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const sugerenciasQuery = useProcedimientos(
    debouncedQuery.length >= 2 ? { buscar: debouncedQuery, page: 1, page_size: 8 } : undefined
  );
  const sugerencias = debouncedQuery.length >= 2 ? (sugerenciasQuery.data?.items || []) : [];

  const detalleQuery = useDetalleProcedimiento(nroSeleccionado, puedeVerDetalle);

  const onSelectSuggestion = (item: ProcedimientoItem) => {
    setQuery(item.numero_procedimiento || item.nro_sicop);
    setSuggestionsOpen(false);
    setNroSeleccionado(item.nro_sicop);
  };

  const onSearch = () => {
    if (!query.trim()) return;
    setSuggestionsOpen(false);
    // Si el texto coincide con una sugerencia exacta, usamos su nro_sicop;
    // si no, intentamos usar el texto tal cual como nro_sicop.
    const match = sugerencias.find(
      (s) => s.numero_procedimiento === query.trim() || s.nro_sicop === query.trim()
    );
    setNroSeleccionado(match ? match.nro_sicop : query.trim());
  };

  const detalle = detalleQuery.data;

  const camposAdicionales = useMemo(() => {
    if (!detalle) return [] as Array<[string, unknown]>;
    return Object.entries(detalle).filter(([clave]) => !CLAVES_CONOCIDAS.has(clave));
  }, [detalle]);

  const permisoDenegado = detalleQuery.isError && detalleQuery.error instanceof ApiError && detalleQuery.error.esPermisoDenegado();

  return (
    <div className="sicop-explorer">
      {/* Search Section */}
      <div className="search-card">
        <h2>🔎 Explorador SICOP</h2>
        <p>Busca por número de procedimiento o por texto libre para ver el detalle disponible en la API.</p>
        <div className="search-wrapper">
          <div className="search-input-container">
            <input
              className="search-input"
              placeholder="Ej: 2024LN-000123-0001101101"
              value={query}
              onChange={e => { setQuery(e.target.value); setSuggestionsOpen(true); }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
              aria-label="Buscar procedimiento"
            />
            {suggestionsOpen && sugerencias.length > 0 && (
              <div className="suggestions-list" role="listbox" aria-label="Sugerencias">
                {sugerencias.map(s => (
                  <div key={s.nro_sicop} className="suggestion-item" onClick={() => onSelectSuggestion(s)}>
                    <div className="suggestion-item-title">{s.numero_procedimiento}</div>
                    <div className="suggestion-item-subtitle">{s.descripcion} · {s.institucion}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="search-btn" onClick={onSearch} disabled={!query.trim()}>
            Buscar
          </button>
        </div>
      </div>

      {!puedeVerDetalle && nroSeleccionado && (
        <div className="search-card" style={{ textAlign: 'center', color: '#dc3545' }}>
          Su perfil no permite ver el detalle de procedimientos.
        </div>
      )}

      {puedeVerDetalle && nroSeleccionado && detalleQuery.isLoading && (
        <div className="search-card" style={{ textAlign: 'center' }}>
          Cargando detalle del procedimiento...
        </div>
      )}

      {puedeVerDetalle && nroSeleccionado && detalleQuery.isError && (
        <div className="search-card" style={{ textAlign: 'center', color: '#dc3545' }}>
          {permisoDenegado
            ? 'Su perfil no permite ver el detalle de procedimientos.'
            : (detalleQuery.error as Error)?.message || 'No se pudo cargar el detalle del procedimiento.'}
          {!permisoDenegado && (
            <div style={{ marginTop: 12 }}>
              <button className="search-btn" onClick={() => detalleQuery.refetch()}>Reintentar</button>
            </div>
          )}
        </div>
      )}

      {puedeVerDetalle && detalle && (
        <>
          {/* Header Card con datos del procedimiento */}
          <div className="header-card">
            <div className="header-banner">
              <div className="header-badge">{detalle.tipo_procedimiento || 'PROCEDIMIENTO'}</div>
              <div className="header-title-section">
                <h1 className="header-main-title">{detalle.descripcion || 'Sin descripción'}</h1>
                <div className="header-metadata">
                  <span className="header-meta-item">
                    <span className="meta-icon">📋</span>
                    <span className="meta-label">SICOP:</span>
                    <span className="meta-value">{detalle.nro_sicop}</span>
                  </span>
                  <span className="header-meta-item">
                    <span className="meta-icon">🔖</span>
                    <span className="meta-label">Procedimiento:</span>
                    <span className="meta-value">{detalle.numero_procedimiento}</span>
                  </span>
                  <span className="header-meta-item">
                    <span className="meta-icon">🏛️</span>
                    <span className="meta-label">{detalle.institucion} ({detalle.ced_institucion})</span>
                  </span>
                </div>
              </div>
              <div className="header-chips">
                {detalle.modalidad && (
                  <span className="chip chip-status">
                    <span className="chip-icon">📋</span>
                    {detalle.modalidad}
                  </span>
                )}
                {detalle.periodo && (
                  <span className="chip chip-procedure">
                    <span className="chip-icon">🗓️</span>
                    {String(detalle.periodo).slice(0, 4)}-{String(detalle.periodo).slice(4, 6)}
                  </span>
                )}
              </div>
            </div>
            <div className="header-kpis">
              <div className="kpi-mini">
                <span className="kpi-mini-label">Monto</span>
                <strong className="kpi-mini-value">{formatCurrency(detalle.monto_crc)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Líneas</span>
                <strong className="kpi-mini-value">{formatNumber(detalle.lineas)}</strong>
              </div>
              <div className="kpi-mini">
                <span className="kpi-mini-label">Invitados</span>
                <strong className="kpi-mini-value">{formatNumber(detalle.invitados)}</strong>
              </div>
            </div>
          </div>

          {/* Datos adicionales devueltos por el backend (estructura abierta) */}
          {camposAdicionales.length > 0 && (
            <div className="chart-card">
              <h3>📄 Datos adicionales del procedimiento</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {camposAdicionales.map(([clave, valor]) => (
                  <div key={clave} style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.15)'
                  }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{etiquetaClave(clave)}</div>
                    <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500, wordBreak: 'break-word' }}>
                      {formatearValorGenerico(clave, valor)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SicopExplorer;
