import React, { useState, useEffect, useMemo } from 'react';
import { useSicop } from '../../context/SicopContext';
import { dataManager } from '../../data/DataManager';
import DetailedCategoryModal from './DetailedCategoryModal';

// Tipos locales basados en la estructura de DataManager
interface CategoryAnalysis {
  categoria: string;
  totalLineas: number;
  porcentaje: number;
  montoTotal: number;
  ejemplos: Array<{
    numeroCartel: string;
    descripcionLinea: string;
    presupuestoLinea: number;
    codigoInstitucion: string;
    palabrasCoincidentes: string[];
  }>;
  instituciones: Array<{
    codigo: string;
    nombre: string;
    lineas: number;
    monto: number;
  }>;
  tendenciaMensual: Array<{ mes: string; lineas: number; monto: number }>;
}

interface SystemCategoryOverview {
  totalLineas: number;
  totalMonto: number;
  cobertura: number;
  categorias: CategoryAnalysis[];
  sinCategorizar: {
    lineas: number;
    ejemplos: string[];
  };
}

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Función para resaltar palabras clave en verde
const highlightKeywords = (text: string, keywords: string[]) => {
  if (!keywords || keywords.length === 0) return [{ text, highlighted: false }];
  
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  
  // Crear un patrón regex con todas las palabras clave
  const pattern = new RegExp(
    `(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  
  const matches = [...text.matchAll(pattern)];
  
  matches.forEach(match => {
    if (match.index !== undefined) {
      // Agregar texto antes del match
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlighted: false });
      }
      // Agregar el match resaltado
      parts.push({ text: match[0], highlighted: true });
      lastIndex = match.index + match[0].length;
    }
  });
  
  // Agregar texto restante
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }
  
  return parts.length > 0 ? parts : [{ text, highlighted: false }];
};

const modernCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  padding: 24,
  marginBottom: 20,
  transition: 'all 0.3s ease'
};

const statsCard: React.CSSProperties = {
  ...modernCard,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

const successBadge: React.CSSProperties = {
  ...badge,
  background: '#dcfce7',
  color: '#166534'
};

const warningBadge: React.CSSProperties = {
  ...badge,
  background: '#fef3c7',
  color: '#92400e'
};

const infoBadge: React.CSSProperties = {
  ...badge,
  background: '#dbeafe',
  color: '#1e40af'
};

export default function CategoryAnalysisView() {
  const { isLoaded } = useSicop();
  const [overview, setOverview] = useState<SystemCategoryOverview | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<CategoryAnalysis | null>(null);

  // Función para convertir datos de DataManager a formato CategoryAnalysis
  const analyzeCategories = async () => {
    if (!isLoaded) return;
    
    setLoading(true);
    try {
      console.log('[CategoryAnalysisView] 🔍 Obteniendo datos de DataManager...');
      
      // Obtener métricas del dashboard (misma fuente que ModernDashboard)
      const dashboardData = dataManager.getDashboardMetrics?.({}) || null;
      console.log('[CategoryAnalysisView] Datos recibidos:', dashboardData);
      
      if (!dashboardData?.sector_analysis) {
        console.warn('[CategoryAnalysisView] No hay sector_analysis en dashboardData');
        setOverview({
          totalLineas: 0,
          totalMonto: 0,
          cobertura: 0,
          categorias: [],
          sinCategorizar: { lineas: 0, ejemplos: [] }
        });
        return;
      }

      const sectorAnalysis = dashboardData.sector_analysis;
      console.log('[CategoryAnalysisView] sector_analysis:', sectorAnalysis);

      // Obtener ejemplos REALES de clasificación usando la misma lógica que DataManager
      const obtenerEjemplosReales = (nombreSector: string): CategoryAnalysis['ejemplos'] => {
        try {
          console.log(`[CategoryAnalysisView] 🔍 Buscando ejemplos para: ${nombreSector}`);
          
          // Obtener datos base (mismas tablas que usa asignarSectorPorCartel)
          const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
          const carteles: any[] = dataManager.obtenerDatos('DetalleCarteles') || [];
          
          // Crear mapa de carteles por ID
          const cartelPorId = new Map(carteles.map(c => [c.numeroCartel, c]));
          
          // Agrupar líneas por cartel
          const porCartel: Record<string, any[]> = {};
          lineas.forEach(l => {
            if (l.numeroCartel) {
              if (!porCartel[l.numeroCartel]) porCartel[l.numeroCartel] = [];
              porCartel[l.numeroCartel].push(l);
            }
          });

          // Obtener reglas del sector
          const sectorRules = dataManager.getSectorRules();
          const reglas = sectorRules[nombreSector] || [];
          
          if (reglas.length === 0) {
            console.warn(`[CategoryAnalysisView] ⚠️ No hay reglas para sector: ${nombreSector}`);
            return [];
          }

          console.log(`[CategoryAnalysisView] Reglas para ${nombreSector}:`, reglas.length);

          // Función para normalizar texto (misma que DataManager)
          const normalizarTexto = (texto: string): string => {
            return (texto || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
          };

          // Función para clasificar un texto y obtener coincidencias
          const clasificarTexto = (texto: string): { esMatch: boolean; coincidencias: string[] } => {
            if (!texto) return { esMatch: false, coincidencias: [] };
            
            const textoNorm = normalizarTexto(texto);
            const coincidencias: string[] = [];
            let score = 0;

            for (const regex of reglas) {
              if (regex.test(textoNorm)) {
                score++;
                // Extraer la palabra/frase que coincidió
                const match = textoNorm.match(regex);
                if (match && match[0]) {
                  const coincidencia = match[0].trim();
                  if (coincidencia && !coincidencias.includes(coincidencia)) {
                    coincidencias.push(coincidencia);
                  }
                }
              }
            }

            return { esMatch: score > 0, coincidencias };
          };

          // Función de votación (replica la lógica de asignarSectorPorCartel)
          const votarPorCartel = (numeroCartel: string): {
            sector: string;
            score: number;
            coincidencias: string[];
            textos: Array<{ fuente: string; texto: string; coincidencias: string[] }>;
          } => {
            const scoresPorSector: Record<string, number> = {};
            const coincidenciasPorSector: Record<string, Set<string>> = {};
            const textosPorSector: Record<string, Array<{ fuente: string; texto: string; coincidencias: string[] }>> = {};

            // Inicializar para todos los sectores
            Object.keys(sectorRules).forEach(s => {
              scoresPorSector[s] = 0;
              coincidenciasPorSector[s] = new Set();
              textosPorSector[s] = [];
            });

            const agregarVoto = (texto: string, fuente: string) => {
              if (!texto) return;
              
              // Clasificar contra TODOS los sectores
              Object.entries(sectorRules).forEach(([sector, reglasDelSector]) => {
                const textoNorm = normalizarTexto(texto);
                const coincidencias: string[] = [];
                let score = 0;

                for (const regex of reglasDelSector) {
                  if (regex.test(textoNorm)) {
                    score++;
                    const match = textoNorm.match(regex);
                    if (match && match[0]) {
                      const coincidencia = match[0].trim();
                      if (coincidencia && !coincidencias.includes(coincidencia)) {
                        coincidencias.push(coincidencia);
                        coincidenciasPorSector[sector].add(coincidencia);
                      }
                    }
                  }
                }

                if (score > 0) {
                  scoresPorSector[sector] += score;
                  textosPorSector[sector].push({
                    fuente,
                    texto: texto.substring(0, 200), // Limitar longitud
                    coincidencias
                  });
                }
              });
            };

            // Votar por líneas del cartel
            const lineasDelCartel = porCartel[numeroCartel] || [];
            lineasDelCartel.forEach((linea: any, idx: number) => {
              agregarVoto(linea.descripcionLinea, `Línea ${idx + 1}`);
            });

            // Votar por datos del cartel
            const cartel = cartelPorId.get(numeroCartel);
            if (cartel) {
              agregarVoto(cartel.nombreCartel, 'Nombre del cartel');
              agregarVoto(cartel.descripcionCartel, 'Descripción del cartel');
              agregarVoto(cartel.clasificacionObjeto, 'Clasificación del objeto');
            }

            // Encontrar sector ganador
            const sectoresOrdenados = Object.entries(scoresPorSector)
              .filter(([_, score]) => score > 0)
              .sort((a, b) => b[1] - a[1]);

            if (sectoresOrdenados.length === 0) {
              return { sector: 'Otros', score: 0, coincidencias: [], textos: [] };
            }

            const [sectorGanador, scoreGanador] = sectoresOrdenados[0];
            return {
              sector: sectorGanador,
              score: scoreGanador,
              coincidencias: Array.from(coincidenciasPorSector[sectorGanador]),
              textos: textosPorSector[sectorGanador]
            };
          };

          // Clasificar todos los carteles y filtrar por sector objetivo
          const ejemplosEncontrados: Array<{
            numeroCartel: string;
            descripcionLinea: string;
            presupuestoLinea: number;
            codigoInstitucion: string;
            palabrasCoincidentes: string[];
            score: number;
            textos: Array<{ fuente: string; texto: string; coincidencias: string[] }>;
          }> = [];

          // Procesar todos los carteles
          const cartelesSet = new Set(Object.keys(porCartel).concat(carteles.map(c => c.numeroCartel).filter(Boolean)));
          
          cartelesSet.forEach(numeroCartel => {
            const resultado = votarPorCartel(numeroCartel);
            
            // Si este cartel fue clasificado en el sector que buscamos
            if (resultado.sector === nombreSector && resultado.score > 0) {
              const cartel = cartelPorId.get(numeroCartel);
              const lineasDelCartel = porCartel[numeroCartel] || [];
              
              // Obtener el mejor texto descriptivo (priorizar descripción de línea > nombre cartel > descripción cartel)
              let descripcionPrincipal = '';
              if (lineasDelCartel.length > 0 && lineasDelCartel[0].descripcionLinea) {
                descripcionPrincipal = lineasDelCartel[0].descripcionLinea;
              } else if (cartel?.nombreCartel) {
                descripcionPrincipal = cartel.nombreCartel;
              } else if (cartel?.descripcionCartel) {
                descripcionPrincipal = cartel.descripcionCartel;
              } else {
                descripcionPrincipal = 'Sin descripción disponible';
              }

              ejemplosEncontrados.push({
                numeroCartel: numeroCartel,
                descripcionLinea: descripcionPrincipal,
                presupuestoLinea: lineasDelCartel.reduce((sum: number, l: any) => sum + (l.presupuestoLinea || 0), 0),
                codigoInstitucion: cartel?.codigoInstitucion || '',
                palabrasCoincidentes: resultado.coincidencias,
                score: resultado.score,
                textos: resultado.textos
              });
            }
          });

          console.log(`[CategoryAnalysisView] ✅ Encontrados ${ejemplosEncontrados.length} ejemplos para ${nombreSector}`);

          // Ordenar por score (más coincidencias primero) y tomar top 50
          return ejemplosEncontrados
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)
            .map(({ score, textos, ...ejemplo }) => ejemplo);

        } catch (error) {
          console.error(`[CategoryAnalysisView] ❌ Error obteniendo ejemplos para ${nombreSector}:`, error);
          return [];
        }
      };

      // Calcular totales
      const totalCarteles = sectorAnalysis.reduce((sum, s) => sum + s.count, 0);
      const totalMonto = sectorAnalysis.reduce((sum, s) => sum + s.total_monto, 0);
      
      // Encontrar sin categorizar
      const sinCateg = sectorAnalysis.find(s => s.sector === 'Sin categorizar' || s.sector === 'Otros');
      const lineasSinCat = sinCateg?.count || 0;
      const cobertura = totalCarteles > 0 ? ((totalCarteles - lineasSinCat) / totalCarteles) * 100 : 0;

      // Convertir sector_analysis a CategoryAnalysis CON EJEMPLOS REALES
      const categorias: CategoryAnalysis[] = sectorAnalysis
        .filter(s => s.sector !== 'Sin categorizar' && s.sector !== 'Otros')
        .map(sector => {
          const ejemplos = obtenerEjemplosReales(sector.sector);
          console.log(`[CategoryAnalysisView] Sector "${sector.sector}": ${ejemplos.length} ejemplos`);
          
          return {
            categoria: sector.sector,
            totalLineas: sector.count,
            porcentaje: sector.percentage,
            montoTotal: sector.total_monto,
            ejemplos,
            instituciones: [], // TODO: Agregar distribución por institución si se requiere
            tendenciaMensual: [] // TODO: Agregar si se requiere
          };
        });

      console.log('[CategoryAnalysisView] ✅ Categorías procesadas:', categorias.length);

      setOverview({
        totalLineas: totalCarteles,
        totalMonto,
        cobertura,
        categorias,
        sinCategorizar: {
          lineas: lineasSinCat,
          ejemplos: []
        }
      });
    } catch (error) {
      console.error('[CategoryAnalysisView] ❌ Error analizando categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      analyzeCategories();
    }
  }, [isLoaded]);

  // Escuchar cambios en configuración de categorías
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const handleRefresh = () => {
      console.log('[CategoryAnalysisView] 🔄 Configuración actualizada, refrescando...');
      analyzeCategories();
    };

    window.addEventListener('categoryConfigurationUpdated', handleRefresh);
    window.addEventListener('manualCategoriesUpdated', handleRefresh);
    window.addEventListener('subcategoryConfigurationUpdated', handleRefresh);

    return () => {
      window.removeEventListener('categoryConfigurationUpdated', handleRefresh);
      window.removeEventListener('manualCategoriesUpdated', handleRefresh);
      window.removeEventListener('subcategoryConfigurationUpdated', handleRefresh);
    };
  }, [isLoaded]);

  const openDetailedView = (category: CategoryAnalysis) => {
    setModalCategory(category);
    setShowDetailedModal(true);
  };

  const closeDetailedView = () => {
    setShowDetailedModal(false);
    setModalCategory(null);
  };

  const filteredCategories = useMemo(() => {
    if (!overview || !searchTerm) return overview?.categorias || [];
    
    const search = searchTerm.toLowerCase();
    return overview.categorias.filter(cat => 
      cat.categoria.toLowerCase().includes(search) ||
      cat.ejemplos.some(ej => ej.descripcionLinea.toLowerCase().includes(search))
    );
  }, [overview, searchTerm]);

  if (!isLoaded) {
    return (
      <div style={modernCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Cargando datos...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={modernCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 16 }}>
            Analizando categorías del sistema...
          </div>
          <div style={{ 
            width: 200, 
            height: 4, 
            background: '#e5e7eb', 
            margin: '0 auto',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: '60%',
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={modernCard}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <button 
            onClick={analyzeCategories}
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
            Analizar Categorías del Sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Modal detallado de categoría */}
      {showDetailedModal && modalCategory && (
        <DetailedCategoryModal 
          category={modalCategory}
          onClose={closeDetailedView}
        />
      )}

      {/* Header con estadísticas generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {overview.categorias.length}
          </div>
          <div style={{ opacity: 0.9 }}>Categorías Activas</div>
        </div>
        
        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {formatPercent(overview.cobertura)}
          </div>
          <div style={{ opacity: 0.9 }}>Cobertura Total</div>
        </div>
        
        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {overview.totalLineas.toLocaleString()}
          </div>
          <div style={{ opacity: 0.9 }}>Líneas Analizadas</div>
        </div>
        
        <div style={statsCard}>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            {overview.sinCategorizar.lineas.toLocaleString()}
          </div>
          <div style={{ opacity: 0.9 }}>Sin Categorizar</div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div style={modernCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar categorías o ejemplos..."
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
          <button
            onClick={analyzeCategories}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Lista de categorías */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCategory ? '1fr 1fr' : '1fr', gap: 20 }}>
        <div>
          {filteredCategories.map((categoria, index) => (
            <div
              key={categoria.categoria}
              style={{
                ...categoryCard,
                background: selectedCategory?.categoria === categoria.categoria 
                  ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                  : modernCard.background
              }}
              onClick={() => setSelectedCategory(
                selectedCategory?.categoria === categoria.categoria ? null : categoria
              )}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: 20, 
                    fontWeight: 700,
                    color: '#1f2937'
                  }}>
                    {categoria.categoria}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={successBadge}>
                      {categoria.totalLineas.toLocaleString()} líneas
                    </span>
                    <span style={infoBadge}>
                      {formatPercent(categoria.porcentaje)}
                    </span>
                    <span style={warningBadge}>
                      {formatMoney(categoria.montoTotal)}
                    </span>
                  </div>
                </div>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, hsl(${index * 137.5 % 360}, 70%, 60%) 0%, hsl(${(index * 137.5 + 60) % 360}, 70%, 70%) 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 18
                }}>
                  #{index + 1}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                  Ejemplos principales:
                </div>
                <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
                  {categoria.ejemplos.slice(0, 3).map((ejemplo, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{ejemplo.numeroCartel}:</span> {ejemplo.descripcionLinea.slice(0, 100)}
                      {ejemplo.descripcionLinea.length > 100 && '...'}
                      <div style={{ marginTop: 4 }}>
                        {ejemplo.palabrasCoincidentes.map(palabra => (
                          <span key={palabra} style={{
                            ...badge,
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: 10
                          }}>
                            {palabra}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  Top instituciones: {categoria.instituciones.slice(0, 2).map(i => i.codigo).join(', ')}
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
                    Ver todos los ejemplos
                  </button>
                  <div style={{
                    color: selectedCategory?.categoria === categoria.categoria ? '#3b82f6' : '#9ca3af',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {selectedCategory?.categoria === categoria.categoria ? 'Ver menos' : 'Ver detalles'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panel de detalles */}
        {selectedCategory && (
          <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
            <div style={modernCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                  {selectedCategory.categoria}
                </h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Estadísticas detalladas */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                      {selectedCategory.totalLineas.toLocaleString()}
                    </div>
                    <div style={{ color: '#6b7280' }}>Líneas</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                      {formatMoney(selectedCategory.montoTotal)}
                    </div>
                    <div style={{ color: '#6b7280' }}>Monto Total</div>
                  </div>
                </div>
              </div>

              {/* Top instituciones */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#374151' }}>
                  Top Instituciones
                </h4>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {selectedCategory.instituciones.slice(0, 8).map((inst, i) => (
                    <div key={inst.codigo} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < 7 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{inst.codigo}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {inst.nombre.slice(0, 30)}{inst.nombre.length > 30 && '...'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {inst.lineas} líneas
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {formatMoney(inst.monto)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ejemplos completos */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#374151' }}>
                  Ejemplos de Líneas Capturadas
                </h4>
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {selectedCategory.ejemplos.slice(0, 8).map((ejemplo, i) => (
                    <div key={i} style={{
                      padding: 12,
                      marginBottom: 8,
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderLeft: '4px solid #3b82f6'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: '#1f2937' }}>
                          {ejemplo.numeroCartel}
                        </span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {ejemplo.codigoInstitucion}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 1.4 }}>
                        {ejemplo.descripcionLinea}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {ejemplo.palabrasCoincidentes.map(palabra => (
                            <span key={palabra} style={{
                              ...badge,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: 10
                            }}>
                              {palabra}
                            </span>
                          ))}
                        </div>
                        {ejemplo.presupuestoLinea && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>
                            {formatMoney(ejemplo.presupuestoLinea)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección de líneas sin categorizar */}
      {overview.sinCategorizar.lineas > 0 && (
        <div style={modernCard}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
            ⚠️ Líneas Sin Categorizar ({overview.sinCategorizar.lineas.toLocaleString()})
          </h3>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {overview.sinCategorizar.ejemplos.slice(0, 15).map((ejemplo, i) => (
              <div key={i} style={{
                padding: 8,
                marginBottom: 4,
                background: '#fef2f2',
                borderRadius: 6,
                fontSize: 14,
                color: '#374151'
              }}>
                {ejemplo}
              </div>
            ))}
            {overview.sinCategorizar.ejemplos.length > 15 && (
              <div style={{ textAlign: 'center', padding: 8, color: '#6b7280' }}>
                ... y {overview.sinCategorizar.lineas - 15} más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}