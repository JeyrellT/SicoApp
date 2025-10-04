// ================================
// FILTROS AVANZADOS SICOP - COMPONENTE MODERNO E INTERACTIVO
// ================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Filter, ChevronDown, Building, Tag, CheckCircle, Loader } from 'lucide-react';

// ================================
// HOOK DE DEBOUNCE INTERNO
// ================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ================================
// INTERFACES Y TIPOS
// ================================

interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
  type?: 'institution' | 'category';
}

interface AdvancedFiltersProps {
  institutions: FilterOption[];
  categories: FilterOption[];
  selectedInstitutions: string[];
  selectedCategories: string[];
  searchKeywords?: string;
  onInstitutionsChange: (institutions: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onSearchKeywordsChange?: (keywords: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

interface MultiSelectProps {
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  icon: React.ReactNode;
  color: string;
  maxDisplayed?: number;
}

// ================================
// COMPONENTE DE MULTI-SELECT AVANZADO
// ================================

const AdvancedMultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder,
  searchPlaceholder,
  icon,
  color,
  maxDisplayed = 2
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // wrapper containing trigger
  const triggerRef = useRef<HTMLDivElement>(null);   // trigger button
  const portalContentRef = useRef<HTMLDivElement | null>(null); // actual dropdown in portal
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  
  // Debounce para mejorar rendimiento
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtrar opciones basado en búsqueda con debounce
  const filteredOptions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return options;
    const term = debouncedSearchTerm.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term)
    );
  }, [options, debouncedSearchTerm]);

  // Manejar estado de carga durante la búsqueda
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  // Cerrar dropdown al hacer clic fuera (incluye portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!isOpen) return;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePortal = portalContentRef.current?.contains(target);
      if (!insideTrigger && !insidePortal) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Posicionamiento dinámico del dropdown (portal)
  const recomputePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Intentar abrir hacia abajo; si no hay espacio, abrir hacia arriba
    const viewportH = window.innerHeight;
    const estimatedHeight = 420; // aprox altura máxima del panel
    const openUpwards = rect.bottom + estimatedHeight > viewportH && rect.top > estimatedHeight;
    const top = openUpwards ? rect.top - estimatedHeight - 8 : rect.bottom + 4;
    setDropdownPos({ top: Math.max(8, top + window.scrollY), left: rect.left + window.scrollX, width: rect.width });
  };

  useEffect(() => {
    if (isOpen) {
      recomputePosition();
      const handleResize = () => recomputePosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [isOpen]);

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleOption = (optionValue: string) => {
    const newSelection = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    onChange(newSelection);
  };

  const handleRemoveOption = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(selectedValues.filter(v => v !== optionValue));
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length <= maxDisplayed) {
      return selectedValues.map(value => {
        const option = options.find(opt => opt.value === value);
        return option?.label || value;
      }).join(', ');
    }
    return `${selectedValues.length} elementos seleccionados`;
  };

  const selectedOptions = selectedValues.map(value => 
    options.find(opt => opt.value === value)
  ).filter(Boolean) as FilterOption[];

  return (
    <div className="advanced-multiselect" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => {
          setIsOpen(o => !o);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'white',
          border: `2px solid ${isOpen ? color : '#e9ecef'}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minHeight: '48px',
          boxShadow: isOpen ? `0 4px 12px ${color}20` : '0 2px 8px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = '#e9ecef';
        }}
      >
        <div style={{ color: color, fontSize: '20px' }}>
          {icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedValues.length === 0 ? (
            <span style={{ color: '#6c757d', fontSize: '14px' }}>
              {placeholder}
            </span>
          ) : selectedValues.length <= maxDisplayed ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedOptions.map((option) => (
                <span
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: `${color}15`,
                    color: color,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: `1px solid ${color}30`
                  }}
                >
                  {option.label}
                  <X
                    size={14}
                    onClick={(e) => handleRemoveOption(option.value, e)}
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                  />
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: `${color}15`,
                  color: color,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: `1px solid ${color}30`
                }}
              >
                {selectedValues.length} seleccionados
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc3545',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
        
        <ChevronDown
          size={16}
          style={{
            color: '#6c757d',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </div>

      {/* Dropdown via Portal */}
      {isOpen && createPortal(
        <div
          ref={portalContentRef}
          style={{
            position: 'absolute',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            background: 'white',
            border: `2px solid ${color}`,
            borderRadius: '12px',
            boxShadow: `0 12px 40px ${color}33, 0 2px 8px rgba(0,0,0,0.15)`,
            zIndex: 5000,
            maxHeight: '420px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeInScale 120ms ease'
          }}
        >
          {/* Search Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e9ecef',
            background: '#f8f9fa'
          }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              {isSearching ? (
                <Loader size={16} style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  color: color,
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Search size={16} style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  color: '#6c757d' 
                }} />
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 40px',
                  border: `1px solid ${isSearching ? color : '#e9ecef'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = color}
                onBlur={(e) => e.target.style.borderColor = isSearching ? color : '#e9ecef'}
              />
            </div>
            
            {/* Quick Actions */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px'
            }}>
              <button
                onClick={() => onChange(filteredOptions.map(opt => opt.value))}
                style={{
                  background: `${color}10`,
                  color: color,
                  border: `1px solid ${color}30`,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Seleccionar todos
              </button>
              <button
                onClick={() => onChange([])}
                style={{
                  background: '#fff5f5',
                  color: '#dc3545',
                  border: '1px solid #feb2b2',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Limpiar selección
              </button>
            </div>
          </div>

          {/* Options List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '300px'
          }}>
            {isSearching ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                <Loader size={24} style={{ opacity: 0.7, marginBottom: '8px', animation: 'spin 1s linear infinite' }} />
                <div>Buscando...</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Filtrando resultados
                </div>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                <Search size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
                <div>No se encontraron resultados</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {searchTerm.trim() ? 'Intenta con otros términos de búsqueda' : 'No hay opciones disponibles'}
                </div>
              </div>
            ) : (
              <>
                {/* Información de resultados */}
                {searchTerm.trim() && (
                  <div style={{
                    padding: '8px 16px',
                    background: '#f8f9fa',
                    borderBottom: '1px solid #e9ecef',
                    fontSize: '12px',
                    color: '#6c757d',
                    fontWeight: 500
                  }}>
                    {filteredOptions.length} resultados encontrados
                    {searchTerm.trim() && ` para "${searchTerm}"`}
                  </div>
                )}
                
                {/* Lista de opciones */}
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleToggleOption(option.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8f9fa',
                        background: isSelected ? `${color}08` : 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? color : '#e9ecef'}`,
                          background: isSelected ? color : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isSelected && (
                          <CheckCircle size={12} color="white" />
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? color : '#2c3e50',
                          fontSize: '14px'
                        }}>
                          {option.label}
                        </div>
                        {option.count && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            marginTop: '2px'
                          }}>
                            {option.count.toLocaleString()} elementos
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ================================
// COMPONENTE PRINCIPAL DE FILTROS AVANZADOS
// ================================

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  institutions,
  categories,
  selectedInstitutions,
  selectedCategories,
  searchKeywords = '',
  onInstitutionsChange,
  onCategoriesChange,
  onSearchKeywordsChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false
}) => {
  const hasActiveFilters = selectedInstitutions.length > 0 || selectedCategories.length > 0 || searchKeywords.trim().length > 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      marginBottom: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Filter size={20} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Filtros Avanzados
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6c757d'
            }}>
              Busca y selecciona instituciones y categorías
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {hasActiveFilters && (
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <CheckCircle size={14} />
              {selectedInstitutions.length + selectedCategories.length + (searchKeywords ? 1 : 0)} filtros activos
            </div>
          )}
          
          {isLoading && (
            <div style={{
              background: '#17a2b8',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div className="loading-spinner" style={{
                width: '12px',
                height: '12px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Cargando...
            </div>
          )}
        </div>
      </div>

      {/* Search Keywords Input */}
      {onSearchKeywordsChange && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <Search 
              size={20} 
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchKeywords}
              onChange={(e) => onSearchKeywordsChange(e.target.value)}
              placeholder="Buscar por texto (ej: 'Saenz', 'computadoras', 'medicamentos')..."
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: 'white'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchKeywords && (
              <button
                onClick={() => onSearchKeywordsChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#dc3545';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '12px',
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            💡 Busca palabras clave en nombres de carteles, descripciones y líneas. Separa múltiples palabras con espacios.
          </p>
        </div>
      )}

      {/* Filters Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Instituciones Filter */}
        <AdvancedMultiSelect
          options={institutions}
          selectedValues={selectedInstitutions}
          onChange={onInstitutionsChange}
          placeholder="Seleccionar instituciones..."
          searchPlaceholder="Buscar instituciones por nombre o código..."
          icon={<Building size={20} />}
          color="#3498db"
        />

        {/* Categorías Filter */}
        <AdvancedMultiSelect
          options={categories}
          selectedValues={selectedCategories}
          onChange={onCategoriesChange}
          placeholder="Seleccionar categorías..."
          searchPlaceholder="Buscar categorías por nombre..."
          icon={<Tag size={20} />}
          color="#e74c3c"
        />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: '#dc3545',
              border: '2px solid #dc3545',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#dc3545';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#dc3545';
              }
            }}
          >
            <X size={16} />
            Limpiar filtros
          </button>
        )}
        
        <button
          onClick={onApplyFilters}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: hasActiveFilters 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
          }}
        >
          <Filter size={16} />
          {hasActiveFilters ? 'Aplicar filtros' : 'Ver todos los datos'}
        </button>
      </div>

      {/* Style Injection for Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdvancedFilters;
