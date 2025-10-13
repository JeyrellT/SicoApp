import React, { useState, useEffect, useMemo } from 'react';
import { useSicop } from '../../context/SicopContext';
import { dataManager } from '../../data/DataManager';
import DetailedCategoryModal from './DetailedCategoryModal';
import { formatMoney, formatPercent, modernCard } from './categoryStyles';

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
    // Nuevos campos para diferenciar nivel de coincidencia
    tipoCoincidencia: 'cartel' | 'lineas'; // Si coincidió en datos del cartel o en líneas específicas
    lineasCoincidentes?: Array<{
      descripcion: string;
      presupuesto: number;
      palabrasEncontradas: string[];
    }>; // Solo para tipoCoincidencia === 'lineas'
    todasLasLineas?: Array<{
      descripcion: string;
      presupuesto: number;
    }>; // Solo para tipoCoincidencia === 'cartel', para mostrar expandible
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<CategoryAnalysis | null>(null);

  // Función auxiliar para procesar en lotes sin bloquear UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const processBatch = async <T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T) => R,
    onProgress?: (progress: number) => void
  ): Promise<R[]> => {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Procesar lote
      const batchResults = batch.map(processor);
      results.push(...batchResults);
      
      // Actualizar progreso
      const currentBatch = Math.floor(i / batchSize) + 1;
      const progress = Math.round((currentBatch / totalBatches) * 100);
      onProgress?.(progress);
      
      // Dar tiempo al navegador para renderizar (evitar bloqueo)
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  };

  // Función para convertir datos de DataManager a formato CategoryAnalysis
  const analyzeCategories = async () => {
    if (!isLoaded) return;
    
    setLoading(true);
    setLoadingProgress(0);
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
      const obtenerEjemplosReales = async (nombreSector: string): Promise<CategoryAnalysis['ejemplos']> => {
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            tipoCoincidencia: 'cartel' | 'lineas'; // NUEVO: detectar dónde coincidió
            lineasConCoincidencias: Array<{ // NUEVO: líneas específicas que coincidieron
              descripcion: string;
              presupuesto: number;
              palabrasEncontradas: string[];
            }>;
          } => {
            const scoresPorSector: Record<string, number> = {};
            const coincidenciasPorSector: Record<string, Set<string>> = {};
            const textosPorSector: Record<string, Array<{ fuente: string; texto: string; coincidencias: string[] }>> = {};

            // NUEVO: Para rastrear coincidencias por tipo de fuente
            const scoreEnCartel: Record<string, number> = {};
            const scoreEnLineas: Record<string, number> = {};
            const lineasConCoincidenciasPorSector: Record<string, Array<{
              descripcion: string;
              presupuesto: number;
              palabrasEncontradas: string[];
            }>> = {};

            // Inicializar para todos los sectores
            Object.keys(sectorRules).forEach(s => {
              scoresPorSector[s] = 0;
              scoreEnCartel[s] = 0;
              scoreEnLineas[s] = 0;
              coincidenciasPorSector[s] = new Set();
              textosPorSector[s] = [];
              lineasConCoincidenciasPorSector[s] = [];
            });

            const agregarVoto = (texto: string, fuente: string, esLineaEspecifica: boolean = false, lineaData?: any) => {
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
                  
                  // NUEVO: Rastrear si el score vino del cartel o de las líneas
                  if (esLineaEspecifica) {
                    scoreEnLineas[sector] += score;
                    
                    // Guardar la línea específica que coincidió
                    if (lineaData) {
                      lineasConCoincidenciasPorSector[sector].push({
                        descripcion: lineaData.descripcionLinea || '',
                        presupuesto: lineaData.presupuestoLinea || 0,
                        palabrasEncontradas: coincidencias
                      });
                    }
                  } else {
                    scoreEnCartel[sector] += score;
                  }
                  
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
              agregarVoto(linea.descripcionLinea, `Línea ${idx + 1}`, true, linea); // NUEVO: marcado como línea específica
            });

            // Votar por datos del cartel
            const cartel = cartelPorId.get(numeroCartel);
            if (cartel) {
              agregarVoto(cartel.nombreCartel, 'Nombre del cartel', false); // NUEVO: marcado como cartel
              agregarVoto(cartel.descripcionCartel, 'Descripción del cartel', false);
              agregarVoto(cartel.clasificacionObjeto, 'Clasificación del objeto', false);
            }

            // Encontrar sector ganador
            const sectoresOrdenados = Object.entries(scoresPorSector)
              .filter(([_, score]) => score > 0)
              .sort((a, b) => b[1] - a[1]);

            if (sectoresOrdenados.length === 0) {
              return { 
                sector: 'Otros', 
                score: 0, 
                coincidencias: [], 
                textos: [],
                tipoCoincidencia: 'cartel',
                lineasConCoincidencias: []
              };
            }

            const [sectorGanador, scoreGanador] = sectoresOrdenados[0];
            
            // NUEVO: Determinar tipo de coincidencia
            // Si tiene más score en líneas, es coincidencia de líneas
            // Si tiene más score en cartel, es coincidencia de cartel
            const tipoCoincidencia: 'cartel' | 'lineas' = 
              scoreEnLineas[sectorGanador] > scoreEnCartel[sectorGanador] ? 'lineas' : 'cartel';
            
            return {
              sector: sectorGanador,
              score: scoreGanador,
              coincidencias: Array.from(coincidenciasPorSector[sectorGanador]),
              textos: textosPorSector[sectorGanador],
              tipoCoincidencia,
              lineasConCoincidencias: lineasConCoincidenciasPorSector[sectorGanador]
            };
          };

          // Clasificar todos los carteles y filtrar por sector objetivo
          const ejemplosEncontrados: Array<{
            numeroCartel: string;
            descripcionLinea: string;
            presupuestoLinea: number;
            codigoInstitucion: string;
            palabrasCoincidentes: string[];
            tipoCoincidencia: 'cartel' | 'lineas';
            lineasCoincidentes?: Array<{
              descripcion: string;
              presupuesto: number;
              palabrasEncontradas: string[];
            }>;
            todasLasLineas?: Array<{
              descripcion: string;
              presupuesto: number;
            }>;
            score: number;
            textos: Array<{ fuente: string; texto: string; coincidencias: string[] }>;
          }> = [];

          // Procesar todos los carteles EN LOTES para evitar bloqueo
          const cartelesSet = new Set(Object.keys(porCartel).concat(carteles.map(c => c.numeroCartel).filter(Boolean)));
          const cartelesArray = Array.from(cartelesSet);
          
          console.log(`[CategoryAnalysisView] 📦 Procesando ${cartelesArray.length} carteles en lotes para ${nombreSector}...`);
          
          // Procesar carteles en lotes de 100
          const BATCH_SIZE = 100;
          const procesarCartel = (numeroCartel: string) => {
            const resultado = votarPorCartel(numeroCartel);
            
            // Si este cartel fue clasificado en el sector que buscamos
            if (resultado.sector === nombreSector && resultado.score > 0) {
              const cartel = cartelPorId.get(numeroCartel);
              const lineasDelCartel = porCartel[numeroCartel] || [];
              
              // Obtener el mejor texto descriptivo
              let descripcionPrincipal = '';
              if (resultado.tipoCoincidencia === 'lineas' && resultado.lineasConCoincidencias.length > 0) {
                // Si coincidió en líneas, usar la primera línea coincidente
                descripcionPrincipal = resultado.lineasConCoincidencias[0].descripcion;
              } else if (cartel?.nombreCartel) {
                descripcionPrincipal = cartel.nombreCartel;
              } else if (cartel?.descripcionCartel) {
                descripcionPrincipal = cartel.descripcionCartel;
              } else if (lineasDelCartel.length > 0 && lineasDelCartel[0].descripcionLinea) {
                descripcionPrincipal = lineasDelCartel[0].descripcionLinea;
              } else {
                descripcionPrincipal = 'Sin descripción disponible';
              }

              // NUEVO: Preparar datos según tipo de coincidencia
              const ejemploData: any = {
                numeroCartel: numeroCartel,
                descripcionLinea: descripcionPrincipal,
                presupuestoLinea: lineasDelCartel.reduce((sum: number, l: any) => sum + (l.presupuestoLinea || 0), 0),
                codigoInstitucion: cartel?.codigoInstitucion || '',
                palabrasCoincidentes: resultado.coincidencias,
                tipoCoincidencia: resultado.tipoCoincidencia,
                score: resultado.score,
                textos: resultado.textos
              };

              // Si coincidió en líneas específicas, incluir solo esas líneas
              if (resultado.tipoCoincidencia === 'lineas') {
                ejemploData.lineasCoincidentes = resultado.lineasConCoincidencias;
              } else {
                // Si coincidió en el cartel, incluir todas las líneas para expandible
                ejemploData.todasLasLineas = lineasDelCartel.map((l: any) => ({
                  descripcion: l.descripcionLinea || '',
                  presupuesto: l.presupuestoLinea || 0
                }));
              }

              return ejemploData;
            }
            return null;
          };
          
          // Procesar en lotes
          for (let i = 0; i < cartelesArray.length; i += BATCH_SIZE) {
            const batch = cartelesArray.slice(i, i + BATCH_SIZE);
            const batchResults = batch.map(procesarCartel).filter(Boolean);
            ejemplosEncontrados.push(...batchResults);
            
            // Dar tiempo al navegador para renderizar (evitar "Page Unresponsive")
            if (i + BATCH_SIZE < cartelesArray.length) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }

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
      const totalCarteles = sectorAnalysis.reduce((sum: number, s: any) => sum + s.count, 0);
      const totalMonto = sectorAnalysis.reduce((sum: number, s: any) => sum + s.total_monto, 0);
      
      // Encontrar sin categorizar
      const sinCateg = sectorAnalysis.find((s: any) => s.sector === 'Sin categorizar' || s.sector === 'Otros');
      const lineasSinCat = sinCateg?.count || 0;
      const cobertura = totalCarteles > 0 ? ((totalCarteles - lineasSinCat) / totalCarteles) * 100 : 0;

      // Convertir sector_analysis a CategoryAnalysis CON EJEMPLOS REALES
      // PROCESAMIENTO POR LOTES - secuencial con await para evitar bloqueo
      const sectoresAFiltrar = sectorAnalysis.filter((s: any) => s.sector !== 'Sin categorizar' && s.sector !== 'Otros');
      const categorias: CategoryAnalysis[] = [];
      
      console.log(`[CategoryAnalysisView] 📦 Procesando ${sectoresAFiltrar.length} categorías...`);
      
      for (let i = 0; i < sectoresAFiltrar.length; i++) {
        const sector = sectoresAFiltrar[i];
        
        // Actualizar progreso
        const progress = Math.round(((i + 1) / sectoresAFiltrar.length) * 100);
        setLoadingProgress(progress);
        
        console.log(`[CategoryAnalysisView] [${i + 1}/${sectoresAFiltrar.length}] Procesando: ${sector.sector}`);
        
        // Obtener ejemplos (ya usa procesamiento por lotes internamente)
        const ejemplos = await obtenerEjemplosReales(sector.sector);
        console.log(`[CategoryAnalysisView] Sector "${sector.sector}": ${ejemplos.length} ejemplos`);
        
        categorias.push({
          categoria: sector.sector,
          totalLineas: sector.count,
          porcentaje: sector.percentage,
          montoTotal: sector.total_monto,
          ejemplos,
          instituciones: [], // TODO: Agregar distribución por institución si se requiere
          tendenciaMensual: [] // TODO: Agregar si se requiere
        });
        
        // Dar tiempo al navegador entre categorías
        await new Promise(resolve => setTimeout(resolve, 0));
      }

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
      setLoadingProgress(0);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      analyzeCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {loadingProgress > 0 && (
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 12 }}>
              Procesando: {loadingProgress}%
            </div>
          )}
          <div style={{ 
            width: 200, 
            height: 4, 
            background: '#e5e7eb', 
            margin: '0 auto',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: loadingProgress > 0 ? `${loadingProgress}%` : '60%',
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              transition: 'width 0.3s ease',
              animation: loadingProgress === 0 ? 'pulse 2s infinite' : 'none'
            }} />
          </div>
          <div style={{ 
            marginTop: 16, 
            fontSize: 12, 
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Procesando en lotes para evitar bloqueos...
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
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{ejemplo.numeroCartel}:</span>
                        {/* NUEVO: Badge indicando tipo de coincidencia */}
                        <span style={{
                          ...badge,
                          background: ejemplo.tipoCoincidencia === 'cartel' 
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontSize: 9,
                          padding: '3px 8px'
                        }}>
                          {ejemplo.tipoCoincidencia === 'cartel' ? '📋 Cartel' : '📄 Líneas'}
                        </span>
                      </div>
                      <div style={{ paddingLeft: 8, borderLeft: '2px solid #e5e7eb' }}>
                        {ejemplo.descripcionLinea.slice(0, 100)}
                        {ejemplo.descripcionLinea.length > 100 && '...'}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {ejemplo.palabrasCoincidentes.slice(0, 3).map(palabra => (
                          <span key={palabra} style={{
                            ...badge,
                            background: ejemplo.tipoCoincidencia === 'cartel' ? '#fef3c7' : '#dcfce7',
                            color: ejemplo.tipoCoincidencia === 'cartel' ? '#92400e' : '#166534',
                            fontSize: 10
                          }}>
                            {palabra}
                          </span>
                        ))}
                        {ejemplo.palabrasCoincidentes.length > 3 && (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>
                            +{ejemplo.palabrasCoincidentes.length - 3} más
                          </span>
                        )}
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
                      background: ejemplo.tipoCoincidencia === 'cartel' ? '#fef3c7' : '#dcfce7',
                      borderRadius: 8,
                      borderLeft: `4px solid ${ejemplo.tipoCoincidencia === 'cartel' ? '#f59e0b' : '#10b981'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#1f2937' }}>
                            {ejemplo.numeroCartel}
                          </span>
                          {/* Badge de tipo */}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: ejemplo.tipoCoincidencia === 'cartel' ? '#f59e0b' : '#10b981',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}>
                            {ejemplo.tipoCoincidencia === 'cartel' ? '📋' : '📄'}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {ejemplo.codigoInstitucion}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 1.4 }}>
                        {ejemplo.descripcionLinea}
                      </div>
                      {/* Indicador de coincidencias en líneas específicas */}
                      {ejemplo.tipoCoincidencia === 'lineas' && ejemplo.lineasCoincidentes && (
                        <div style={{
                          fontSize: 11,
                          color: '#059669',
                          marginBottom: 8,
                          fontWeight: 600
                        }}>
                          ✓ {ejemplo.lineasCoincidentes.length} línea(s) específica(s) coincidieron
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {ejemplo.palabrasCoincidentes.slice(0, 4).map(palabra => (
                            <span key={palabra} style={{
                              ...badge,
                              background: ejemplo.tipoCoincidencia === 'cartel' ? '#f59e0b' : '#10b981',
                              color: 'white',
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