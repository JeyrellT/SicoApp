import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();

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

  type FilterKey = 'institucion' | 'anioDesde' | 'anioHasta' | 'procedimientos' | 'categoria' | 'estado' | 'keyword';

  interface ActiveFilterChip {
    keys: FilterKey[];
    label: string;
    icon?: string;
    tone?: 'primary' | 'neutral' | 'warning' | 'success';
  }

  const institutionsByCode = useMemo(() => {
    const map = new Map<string, { codigoInstitucion: string; nombre: string; siglas?: string }>();
    instituciones.forEach((inst: any) => {
      if (inst?.codigoInstitucion) {
        map.set(inst.codigoInstitucion, inst);
      }
    });
    return map;
  }, [instituciones]);

  const featuredInstituciones = useMemo(() => {
    const source = filters.searchInst ? filteredInstituciones : instituciones;
    return source.slice(0, 6);
  }, [filters.searchInst, filteredInstituciones, instituciones]);

  const selectedInstitution = filters.institucion
    ? institutionsByCode.get(filters.institucion)
    : undefined;

  const activeFilters: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];

    if (filters.institucion) {
      const info = institutionsByCode.get(filters.institucion);
      chips.push({
        keys: ['institucion'],
        label: info
          ? `${info.siglas ? `${info.siglas} · ` : ''}${info.nombre}`
          : filters.institucion,
        icon: '🏛️',
        tone: 'primary'
      });
    }

    if (filters.anioDesde || filters.anioHasta) {
      const label = filters.anioDesde && filters.anioHasta
        ? `Años ${filters.anioDesde} – ${filters.anioHasta}`
        : filters.anioDesde
          ? `Desde ${filters.anioDesde}`
          : `Hasta ${filters.anioHasta}`;
      chips.push({
        keys: ['anioDesde', 'anioHasta'],
        label,
        icon: '🗓️'
      });
    }

    if (filters.procedimientos) {
      chips.push({
        keys: ['procedimientos'],
        label: filters.procedimientos,
        icon: '📄',
        tone: 'neutral'
      });
    }

    if (filters.categoria) {
      chips.push({
        keys: ['categoria'],
        label: filters.categoria,
        icon: '🧩',
        tone: 'neutral'
      });
    }

    if (filters.estado) {
      chips.push({
        keys: ['estado'],
        label: filters.estado,
        icon: '⚡',
        tone: 'warning'
      });
    }

    if (filters.keyword) {
      chips.push({
        keys: ['keyword'],
        label: `“${filters.keyword}”`,
        icon: '🔎',
        tone: 'success'
      });
    }

    return chips;
  }, [filters, institutionsByCode]);

  const resultsCount = filteredInstituciones.length;

  const filterSectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 }
  };

  const buildTransition = (duration: number, ease: number[] = [0.4, 0, 0.2, 1]) =>
    shouldReduceMotion ? { duration: 0 } : { duration, ease };

  const filterSectionTransition = buildTransition(0.32, [0.22, 1, 0.36, 1]);
  const MotionAnimatePresence = AnimatePresence as unknown as React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>;

  const clearSpecificFilters = (keys: FilterKey[]) => {
    keys.forEach(key => {
      switch (key) {
        case 'institucion':
          setInstitucion('');
          setSearchInst('');
          break;
        case 'anioDesde':
          setAnioDesde('');
          break;
        case 'anioHasta':
          setAnioHasta('');
          break;
        case 'procedimientos':
          setProcedimientos('');
          break;
        case 'categoria':
          setCategoria('');
          break;
        case 'estado':
          setEstado('');
          break;
        case 'keyword':
          setKeyword('');
          break;
        default:
          break;
      }
    });
  };

  const handleQuickInstitutionSelect = (inst: { codigoInstitucion: string; nombre: string; siglas?: string }) => {
    if (!inst?.codigoInstitucion) return;
    setInstitucion(inst.codigoInstitucion);
    setSearchInst(inst.siglas || inst.nombre || '');
  };

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
    setInstitucion('');
    setSearchInst('');
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
          <motion.div
            className="filters-panel__summary"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={buildTransition(0.35, [0.22, 1, 0.36, 1])}
          >
            <div>
              <span className="filters-panel__summary-eyebrow">Panel institucional</span>
              <h2 className="filters-panel__summary-title">Explora instituciones</h2>
              <p className="filters-panel__summary-subtitle">
                Combina búsquedas semánticas con filtros precisos para descubrir oportunidades.
              </p>
            </div>
            <div className="filters-panel__summary-metric" aria-live="polite">
              <span className="filters-panel__summary-count">{resultsCount}</span>
              <span className="filters-panel__summary-label">coincidencias</span>
            </div>
          </motion.div>

          {activeFilters.length > 0 && (
            <motion.div
              className="filters-panel__active-chips"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={buildTransition(0.25)}
              role="list"
              aria-label="Filtros activos"
            >
              {activeFilters.map(chip => (
                <button
                  key={chip.keys.join('-')}
                  type="button"
                  className={`filter-chip filter-chip--${chip.tone ?? 'neutral'}`}
                  onClick={() => clearSpecificFilters(chip.keys)}
                >
                  {chip.icon && <span className="filter-chip__icon" aria-hidden>{chip.icon}</span>}
                  <span className="filter-chip__label">{chip.label}</span>
                  <span className="filter-chip__remove" aria-hidden>×</span>
                  <span className="sr-only">Quitar filtro {chip.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          <MotionAnimatePresence>
            {selectedInstitution && (
              <motion.div
                className="filters-panel__selection-card"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={buildTransition(0.25)}
              >
                <div className="selection-card__icon" aria-hidden>🏛️</div>
                <div className="selection-card__details">
                  <span className="selection-card__label">Institución seleccionada</span>
                  <strong className="selection-card__name">
                    {selectedInstitution.siglas ? `${selectedInstitution.siglas} · ` : ''}
                    {selectedInstitution.nombre}
                  </strong>
                  <span className="selection-card__code">Código {filters.institucion}</span>
                </div>
                <button
                  type="button"
                  className="selection-card__clear"
                  onClick={() => clearSpecificFilters(['institucion'])}
                >
                  Cambiar
                </button>
              </motion.div>
            )}
          </MotionAnimatePresence>

          {featuredInstituciones.length > 0 && (
            <motion.section
              className="filter-card filter-card--compact"
              variants={filterSectionVariants}
              initial="hidden"
              animate="visible"
              transition={filterSectionTransition}
            >
              <div className="filter-card__header">
                <span className="filter-card__eyebrow">Sugerencias rápidas</span>
                <h3 className="filter-card__title">Instituciones destacadas</h3>
                <p className="filter-card__description">
                  Accede a instituciones frecuentes con un solo toque.
                </p>
              </div>
              <div className="filters-panel__chips">
                {featuredInstituciones.map((inst: any) => (
                  <button
                    key={inst.codigoInstitucion}
                    type="button"
                    className={`filter-chip filter-chip--ghost ${filters.institucion === inst.codigoInstitucion ? 'filter-chip--active' : ''}`}
                    onClick={() => handleQuickInstitutionSelect(inst)}
                  >
                    <span className="filter-chip__label">
                      {inst.siglas ? `${inst.siglas}` : inst.nombre}
                    </span>
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Exploración avanzada</span>
              <h3 className="filter-card__title">Buscar institución</h3>
              <p className="filter-card__description">
                Escribe para filtrar y luego selecciona la institución específica.
              </p>
            </div>
            <div className="filter-card__body">
              <label className="filter-label" htmlFor="search-inst">
                Búsqueda rápida
              </label>
              <div className="filter-input-wrapper">
                <span className="filter-input__icon" aria-hidden>🔍</span>
                <input
                  id="search-inst"
                  type="text"
                  placeholder="Nombre, siglas o código..."
                  value={filters.searchInst}
                  onChange={e => setSearchInst(e.target.value)}
                  className="filter-input"
                  aria-describedby="search-inst-help"
                />
              </div>
              <small id="search-inst-help" className="filter-help">
                Busque por nombre, siglas o código de institución
              </small>

              <label className="filter-label filter-label--select" htmlFor="institucion-select">
                Resultados ({resultsCount})
              </label>
              <select 
                id="institucion-select"
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
          </motion.section>

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Periodo</span>
              <h3 className="filter-card__title">Rango de años</h3>
              <p className="filter-card__description">
                Limita los resultados al rango temporal relevante.
              </p>
            </div>
            <div className="filter-card__body">
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
          </motion.section>

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Modalidad</span>
              <h3 className="filter-card__title">Tipo de procedimiento</h3>
              <p className="filter-card__description">
                Identifica el tipo de proceso de compra que deseas analizar.
              </p>
            </div>
            <div className="filter-card__body">
              <select 
                id="procedimientos"
                value={filters.procedimientos} 
                onChange={e => setProcedimientos(e.target.value)} 
                className="filter-select"
                aria-label="Tipo de procedimiento"
              >
                <option value="">Todos</option>
                {filtrosDisponibles.procedimientos.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </motion.section>

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Clasificación</span>
              <h3 className="filter-card__title">Categoría</h3>
              <p className="filter-card__description">
                Centra el análisis en categorías estratégicas.
              </p>
            </div>
            <div className="filter-card__body">
              <select 
                id="categoria"
                value={filters.categoria} 
                onChange={e => setCategoria(e.target.value)} 
                className="filter-select"
                aria-label="Categoría"
              >
                <option value="">Todas</option>
                {filtrosDisponibles.categorias.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </motion.section>

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Seguimiento</span>
              <h3 className="filter-card__title">Estado</h3>
              <p className="filter-card__description">
                Filtra por el estado actual del procedimiento o contrato.
              </p>
            </div>
            <div className="filter-card__body">
              <select 
                id="estado"
                value={filters.estado} 
                onChange={e => setEstado(e.target.value)} 
                className="filter-select"
                aria-label="Estado"
              >
                <option value="">Todos</option>
                {filtrosDisponibles.estados.map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </motion.section>

          <motion.section
            className="filter-group filter-card"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
            <div className="filter-card__header">
              <span className="filter-card__eyebrow">Descubrimiento semántico</span>
              <h3 className="filter-card__title">Búsqueda inteligente</h3>
              <p className="filter-card__description">
                Encuentra coincidencias por palabras clave dentro de las descripciones.
              </p>
            </div>
            <div className="filter-card__body">
              <div className="filter-search-container">
                <div className="filter-input-wrapper">
                  <span className="filter-input__icon" aria-hidden>✨</span>
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
                </div>
                <small id="keyword-help" className="filter-help">
                  Busque por palabras clave en las descripciones
                </small>

                <MotionAnimatePresence>
                  {showSuggestions && keywordSuggestions.length > 0 && (
                    <motion.div
                      className="filter-suggestions"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={buildTransition(0.2)}
                    >
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
                    </motion.div>
                  )}
                </MotionAnimatePresence>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="filter-card filter-card--actions"
            variants={filterSectionVariants}
            initial="hidden"
            animate="visible"
            transition={filterSectionTransition}
          >
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
          </motion.section>

          <MotionAnimatePresence>
            {showBookmarkInput && (
              <motion.div
                className="filter-card filter-card--bookmark"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={buildTransition(0.25)}
              >
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
              </motion.div>
            )}
          </MotionAnimatePresence>

          {view.bookmarks.length > 0 && (
            <motion.section
              className="filter-card filter-card--bookmark-list"
              variants={filterSectionVariants}
              initial="hidden"
              animate="visible"
              transition={filterSectionTransition}
            >
              <div className="filter-bookmarks">
                <h4 className="filter-bookmarks__title">Favoritos guardados</h4>
                <div className="filter-bookmarks__list">
                  {view.bookmarks.map((bookmark: Bookmark, idx: number) => (
                    <motion.div
                      key={idx}
                      className="filter-bookmark"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, delay: idx * 0.03 }}
                    >
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
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </div>
      )}
    </aside>
  );
};

export default FiltersPanel;