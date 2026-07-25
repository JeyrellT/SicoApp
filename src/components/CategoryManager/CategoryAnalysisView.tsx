import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCategorias, useFiltros, useResumen } from '../../hooks/api';
import { CategoryService } from '../../services/CategoryService';
import type { CategoryConfiguration, ManualCategoryRule } from '../../types/categories';
import DetailedCategoryModal from './DetailedCategoryModal';
import { agruparCategorias } from './categoryGrouping';
import { formatMoney, formatPercent, modernCard } from './categoryStyles';
import type { CategoriaAgrupada } from './types';

const CONFIG_VACIA: CategoryConfiguration = { version: '1.0', categorias: {}, lastModified: '' };

const LIMITES_DISPONIBLES = [20, 50, 100] as const;

const statsCard: React.CSSProperties = {
  ...modernCard,
  background: 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)',
  color: 'white',
  textAlign: 'center' as const
};

const categoryCard: React.CSSProperties = {
  ...modernCard,
  cursor: 'pointer'
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  margin: '2px 4px'
};

const successBadge: React.CSSProperties = { ...badge, background: '#dcfce7', color: '#166534' };
const infoBadge: React.CSSProperties = { ...badge, background: '#dbeafe', color: '#1e40af' };
const warningBadge: React.CSSProperties = { ...badge, background: '#fef3c7', color: '#92400e' };
const manualBadge: React.CSSProperties = { ...badge, background: '#f3e8ff', color: '#7e22ce' };

export default function CategoryAnalysisView() {
  const [reglas, setReglas] = useState<ManualCategoryRule[]>([]);
  const [config, setConfig] = useState<CategoryConfiguration>(CONFIG_VACIA);
  const [searchTerm, setSearchTerm] = useState('');
  const [limite, setLimite] = useState<number>(50);
  const [selectedCategory, setSelectedCategory] = useState<CategoriaAgrupada | null>(null);
  const [modalCategory, setModalCategory] = useState<CategoriaAgrupada | null>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);

  const categoriasQuery = useCategorias({ limite });
  const resumenQuery = useResumen();
  const filtrosQuery = useFiltros();

  // Reglas manuales (capa de etiquetado del lado del cliente) + configuración
  // de activo/inactivo por categoría. Ambas viven en localStorage vía
  // CategoryService; se recargan al montar y cuando otros paneles disparan
  // los eventos de actualización.
  const cargarConfiguracionCliente = useCallback(async () => {
    setReglas(CategoryService.getAllRules());
    setConfig(await CategoryService.getCategoryConfiguration());
  }, []);

  useEffect(() => {
    cargarConfiguracionCliente();
  }, [cargarConfiguracionCliente]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => {
      cargarConfiguracionCliente();
    };

    window.addEventListener('categoryConfigurationUpdated', handleRefresh);
    window.addEventListener('manualCategoriesUpdated', handleRefresh);

    return () => {
      window.removeEventListener('categoryConfigurationUpdated', handleRefresh);
      window.removeEventListener('manualCategoriesUpdated', handleRefresh);
    };
  }, [cargarConfiguracionCliente]);

  const { categorias: categoriasAgrupadas, excluidas } = useMemo(
    () => agruparCategorias(categoriasQuery.data ?? [], reglas, config),
    [categoriasQuery.data, reglas, config]
  );

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categoriasAgrupadas;
    const search = searchTerm.toLowerCase();
    return categoriasAgrupadas.filter((cat) => cat.nombre.toLowerCase().includes(search));
  }, [categoriasAgrupadas, searchTerm]);

  const coberturaMostrada = useMemo(
    () => categoriasAgrupadas.reduce((sum, cat) => sum + cat.participacionPct, 0),
    [categoriasAgrupadas]
  );

  const openDetailedView = (category: CategoriaAgrupada) => {
    setModalCategory(category);
    setShowDetailedModal(true);
  };

  const closeDetailedView = () => {
    setShowDetailedModal(false);
    setModalCategory(null);
  };

  const isLoading = categoriasQuery.isLoading || resumenQuery.isLoading;
  const isError = categoriasQuery.isError || resumenQuery.isError;

  if (isError) {
    return (
      <div style={modernCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#dc2626', marginBottom: 16 }}>
            No se pudieron cargar las categorías desde el servidor.
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
            {categoriasQuery.error instanceof Error
              ? categoriasQuery.error.message
              : resumenQuery.error instanceof Error
              ? resumenQuery.error.message
              : 'Ocurrió un error inesperado al consultar el backend.'}
          </div>
          <button
            onClick={() => {
              categoriasQuery.refetch();
              resumenQuery.refetch();
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={modernCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Cargando categorías desde el servidor...</div>
        </div>
      </div>
    );
  }

  const resumen = resumenQuery.data;
  const totalObjetosGastoCatalogo = filtrosQuery.data?.objetos_gasto.length ?? null;

  return (
    <div>
      {showDetailedModal && modalCategory && (
        <DetailedCategoryModal category={modalCategory} onClose={closeDetailedView} />
      )}

      {/* Header con estadísticas generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{categoriasAgrupadas.length}</div>
          <div style={{ opacity: 0.9 }}>Categorías Mostradas</div>
        </div>

        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{formatPercent(coberturaMostrada)}</div>
          <div style={{ opacity: 0.9 }}>Cobertura Mostrada</div>
        </div>

        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {(resumen?.lineas_adjudicadas ?? 0).toLocaleString()}
          </div>
          <div style={{ opacity: 0.9 }}>Líneas Adjudicadas (Total)</div>
        </div>

        <div style={statsCard}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{formatMoney(resumen?.monto_crc ?? 0)}</div>
          <div style={{ opacity: 0.9 }}>Monto Total (CRC)</div>
        </div>
      </div>

      {/* Controles: búsqueda, cantidad de categorías a mostrar */}
      <div style={modernCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              type="text"
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 16,
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#6b7280' }}>Mostrar top:</span>
            <select
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
              style={{ padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            >
              {LIMITES_DISPONIBLES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion} objetos de gasto
                </option>
              ))}
            </select>
          </div>
        </div>
        {totalObjetosGastoCatalogo !== null && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
            Se muestran los {Math.min(limite, totalObjetosGastoCatalogo)} objetos de gasto con mayor monto adjudicado,
            de un catálogo de {totalObjetosGastoCatalogo.toLocaleString()} en el periodo consultado.
          </div>
        )}
      </div>

      {categoriasAgrupadas.length === 0 ? (
        <div style={modernCard}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 18, color: '#6b7280' }}>
              No hay datos de categorías disponibles para el periodo actual.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCategory ? '1fr 1fr' : '1fr', gap: 20 }}>
          <div>
            {filteredCategories.map((categoria, index) => (
              <div
                key={categoria.id}
                style={{
                  ...categoryCard,
                  background:
                    selectedCategory?.id === categoria.id
                      ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                      : modernCard.background
                }}
                onClick={() => setSelectedCategory(selectedCategory?.id === categoria.id ? null : categoria)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                      {categoria.nombre}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={successBadge}>{categoria.lineas.toLocaleString()} líneas</span>
                      <span style={infoBadge}>{formatPercent(categoria.participacionPct)}</span>
                      <span style={warningBadge}>{formatMoney(categoria.montoCrc)}</span>
                      {categoria.tipo === 'manual' && <span style={manualBadge}>Regla manual</span>}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, hsl(${(index * 137.5) % 360}, 70%, 60%) 0%, hsl(${
                        (index * 137.5 + 60) % 360
                      }, 70%, 70%) 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 18
                    }}
                  >
                    #{index + 1}
                  </div>
                </div>

                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  {categoria.detalle.length > 1
                    ? `Agrupa ${categoria.detalle.length} objetos de gasto: ${categoria.detalle
                        .map((d) => d.objeto_gasto)
                        .slice(0, 4)
                        .join(', ')}${categoria.detalle.length > 4 ? '…' : ''}`
                    : `Objeto de gasto: ${categoria.detalle[0]?.objeto_gasto}`}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 16,
                    borderTop: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    {categoria.proveedoresDistintos.toLocaleString()} proveedores distintos
                    {categoria.detalle.length > 1 ? ' (aprox.)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailedView(categoria);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      Ver detalle
                    </button>
                    <div
                      style={{
                        color: selectedCategory?.id === categoria.id ? '#3b82f6' : '#9ca3af',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {selectedCategory?.id === categoria.id ? 'Ver menos' : 'Seleccionar'}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div style={modernCard}>
                <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                  Ninguna categoría coincide con "{searchTerm}".
                </div>
              </div>
            )}
          </div>

          {selectedCategory && (
            <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
              <div style={modernCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{selectedCategory.nombre}</h3>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                      {selectedCategory.lineas.toLocaleString()}
                    </div>
                    <div style={{ color: '#6b7280' }}>Líneas</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                      {formatMoney(selectedCategory.montoCrc)}
                    </div>
                    <div style={{ color: '#6b7280' }}>Monto Total</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#374151' }}>
                    Objetos de gasto agrupados
                  </h4>
                  <div style={{ maxHeight: 260, overflow: 'auto' }}>
                    {selectedCategory.detalle
                      .slice()
                      .sort((a, b) => b.monto_crc - a.monto_crc)
                      .map((d) => (
                        <div
                          key={d.objeto_gasto}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{d.objeto_gasto}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.lineas.toLocaleString()} líneas</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{formatMoney(d.monto_crc)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {excluidas.lineas > 0 && (
        <div style={modernCard}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
            Categorías desactivadas por configuración
          </h3>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            {excluidas.lineas.toLocaleString()} líneas ({formatMoney(excluidas.montoCrc)}) pertenecen a objetos de
            gasto desactivados en "Configuración". Actívalos ahí para incluirlos en este análisis.
          </div>
        </div>
      )}
    </div>
  );
}
