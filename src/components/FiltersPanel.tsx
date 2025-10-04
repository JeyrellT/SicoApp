import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboardStore, Bookmark } from '../stores/dashboardStore';
import { useSicop } from '../context/SicopContext';
import { dataManager } from '../data/DataManager';

interface FiltersPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ isCollapsed, onToggle }) => {
  const { isLoaded } = useSicop();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const {
    filters,
    view,
    setInstitucion,
    setAnioDesde,
    setAnioHasta,
    setProcedimientos,
    setCategoria,
    setEstado,
    setSearchInst,
    setKeyword,
    clearFilters,
    saveBookmark,
    loadBookmark,
    removeBookmark
  } = useDashboardStore();

  const [bookmarkName, setBookmarkName] = useState('');
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get institutions list with better performance
  const instituciones = useMemo(() => {
    if (!isLoaded) return [];
    try {
      return dataManager.getInstitucionesList();
    } catch (error) {
      console.error('❌ Error obteniendo lista de instituciones:', error);
      return [];
    }
  }, [isLoaded]);

  const filteredInstituciones = useMemo(() => {
    if (!filters.searchInst) return instituciones;
    const searchLower = filters.searchInst.toLowerCase();
    return instituciones.filter((i: any) => 
      (i.nombre || '').toLowerCase().includes(searchLower) ||
      (i.siglas || '').toLowerCase().includes(searchLower) ||
      String(i.codigoInstitucion || '').includes(filters.searchInst)
    );
  }, [instituciones, filters.searchInst]);

  const filtrosDisponibles = useMemo(() => {
    if (!isLoaded) return { anios: [], procedimientos: [], categorias: [], estados: [] };
    try {
      return dataManager.getInstitucionFilters() || { anios: [], procedimientos: [], categorias: [], estados: [] };
    } catch (error) {
      console.error('❌ Error obteniendo filtros disponibles:', error);
      return { anios: [], procedimientos: [], categorias: [], estados: [] };
    }
  }, [isLoaded]);

  // Semantic search for keywords
  useEffect(() => {
    if (filters.keyword && filters.keyword.length >= 2) {
      // Simulated keyword suggestions - in real app, this would come from API
      const mockSuggestions = [
        'medicamentos', 'equipos médicos', 'servicios profesionales',
        'mantenimiento', 'combustible', 'papelería', 'servicios de limpieza',
        'alimentos', 'transporte', 'seguridad', 'tecnología', 'construcción'
      ].filter(s => s.toLowerCase().includes(filters.keyword.toLowerCase()));
      
      setKeywordSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [filters.keyword]);

  const handleSaveBookmark = () => {
    if (bookmarkName.trim()) {
      saveBookmark(bookmarkName.trim());
      setBookmarkName('');
      setShowBookmarkInput(false);
    }
  };

  const handleKeywordSelect = (keyword: string) => {
    setKeyword(keyword);
    setShowSuggestions(false);
  };

  const handleClearFilters = () => {
    clearFilters();
    setKeyword('');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.anioDesde) count++;
    if (filters.anioHasta) count++;
    if (filters.procedimientos) count++;
    if (filters.categoria) count++;
    if (filters.estado) count++;
    if (filters.keyword) count++;
    return count;
  }, [filters]);

  return (
    <aside 
      className={`filters-panel ${isCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Panel de filtros"
    >
      <div className="filters-panel__header">
        <button
          className="filters-panel__toggle"
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expandir filtros' : 'Colapsar filtros'}
          aria-expanded={!isCollapsed}
        >
          <span className="filters-panel__toggle-icon">
            {isCollapsed ? '⚙️' : '✕'}
          </span>
          {!isCollapsed && (
            <span className="filters-panel__toggle-text">Filtros</span>
          )}
        </button>
        
        {!isCollapsed && activeFiltersCount > 0 && (
          <div className="filters-panel__badge">
            {activeFiltersCount}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="filters-panel__content">
          {/* Institution Selection */}
          <div className="filter-group">
            <label className="filter-label" htmlFor="search-inst">
              Buscar Institución
            </label>
            <input
              id="search-inst"
              type="text"
              placeholder="Nombre, siglas o código..."
              value={filters.searchInst}
              onChange={e => setSearchInst(e.target.value)}
              className="filter-input"
              aria-describedby="search-inst-help"
            />
            <small id="search-inst-help" className="filter-help">
              Busque por nombre, siglas o código de institución
            </small>
            
            <select 
              value={filters.institucion} 
              onChange={e => setInstitucion(e.target.value)} 
              className="filter-select"
              aria-label="Seleccionar institución"
            >
              <option value="">Seleccione institución…</option>
              {filteredInstituciones.map((i: any) => (
                <option key={i.codigoInstitucion} value={i.codigoInstitucion}>
                  {i.siglas ? `${i.siglas} - ${i.nombre}` : i.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="filter-group">
            <label className="filter-label">Rango de años</label>
            <div className="filter-row">
              <div className="filter-col">
                <label htmlFor="anio-desde" className="filter-sublabel">Desde</label>
                <select 
                  id="anio-desde"
                  value={filters.anioDesde} 
                  onChange={e => setAnioDesde(e.target.value)} 
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  {filtrosDisponibles.anios.map((a: number) => (
                    <option key={a} value={String(a)}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="filter-col">
                <label htmlFor="anio-hasta" className="filter-sublabel">Hasta</label>
                <select 
                  id="anio-hasta"
                  value={filters.anioHasta} 
                  onChange={e => setAnioHasta(e.target.value)} 
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  {filtrosDisponibles.anios.map((a: number) => (
                    <option key={a} value={String(a)}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Procedures */}
          <div className="filter-group">
            <label htmlFor="procedimientos" className="filter-label">
              Tipo de procedimiento
            </label>
            <select 
              id="procedimientos"
              value={filters.procedimientos} 
              onChange={e => setProcedimientos(e.target.value)} 
              className="filter-select"
            >
              <option value="">Todos</option>
              {filtrosDisponibles.procedimientos.map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="filter-group">
            <label htmlFor="categoria" className="filter-label">Categoría</label>
            <select 
              id="categoria"
              value={filters.categoria} 
              onChange={e => setCategoria(e.target.value)} 
              className="filter-select"
            >
              <option value="">Todas</option>
              {filtrosDisponibles.categorias.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="filter-group">
            <label htmlFor="estado" className="filter-label">Estado</label>
            <select 
              id="estado"
              value={filters.estado} 
              onChange={e => setEstado(e.target.value)} 
              className="filter-select"
            >
              <option value="">Todos</option>
              {filtrosDisponibles.estados.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Semantic Keyword Search */}
          <div className="filter-group">
            <label htmlFor="keyword-search" className="filter-label">
              Búsqueda semántica
            </label>
            <div className="filter-search-container">
              <input
                id="keyword-search"
                ref={searchInputRef}
                type="text"
                placeholder="Ej: medicamentos, servicios profesionales..."
                value={filters.keyword}
                onChange={e => setKeyword(e.target.value)}
                className="filter-input"
                aria-describedby="keyword-help"
                onFocus={() => filters.keyword.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <small id="keyword-help" className="filter-help">
                Busque por palabras clave en las descripciones
              </small>
              
              {showSuggestions && keywordSuggestions.length > 0 && (
                <div className="filter-suggestions">
                  {keywordSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="filter-suggestion"
                      onClick={() => handleKeywordSelect(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter Actions */}
          <div className="filter-actions">
            <button
              className="filter-btn filter-btn--clear"
              onClick={handleClearFilters}
              disabled={activeFiltersCount === 0}
              aria-label="Limpiar todos los filtros"
            >
              🗑️ Limpiar filtros
            </button>
            
            <button
              className="filter-btn filter-btn--bookmark"
              onClick={() => setShowBookmarkInput(!showBookmarkInput)}
              disabled={!filters.institucion}
              aria-label="Guardar filtros como favorito"
            >
              ⭐ Guardar
            </button>
          </div>

          {/* Bookmark Input */}
          {showBookmarkInput && (
            <div className="filter-bookmark-input">
              <input
                type="text"
                placeholder="Nombre del favorito..."
                value={bookmarkName}
                onChange={e => setBookmarkName(e.target.value)}
                className="filter-input"
                onKeyDown={e => e.key === 'Enter' && handleSaveBookmark()}
                autoFocus
              />
              <div className="filter-bookmark-actions">
                <button
                  className="filter-btn filter-btn--save"
                  onClick={handleSaveBookmark}
                  disabled={!bookmarkName.trim()}
                >
                  Guardar
                </button>
                <button
                  className="filter-btn filter-btn--cancel"
                  onClick={() => {
                    setShowBookmarkInput(false);
                    setBookmarkName('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Bookmarks List */}
          {view.bookmarks.length > 0 && (
            <div className="filter-bookmarks">
              <h4 className="filter-bookmarks__title">Favoritos guardados</h4>
              <div className="filter-bookmarks__list">
                {view.bookmarks.map((bookmark: Bookmark, idx: number) => (
                  <div key={idx} className="filter-bookmark">
                    <button
                      className="filter-bookmark__load"
                      onClick={() => loadBookmark(bookmark)}
                      title={`Aplicar filtros guardados: ${bookmark.name}`}
                    >
                      📌 {bookmark.name}
                    </button>
                    <button
                      className="filter-bookmark__remove"
                      onClick={() => removeBookmark(idx)}
                      aria-label={`Eliminar favorito ${bookmark.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default FiltersPanel;