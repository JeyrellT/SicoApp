import React, { useState, useMemo } from 'react';
import { CategoryService } from '../../services/CategoryService';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

const modernCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  padding: 24,
  marginBottom: 20
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  margin: '2px 4px'
};

const btn = (variant: 'primary' | 'secondary' | 'success' = 'secondary'): React.CSSProperties => ({
  background: variant === 'primary' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
             : variant === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
             : '#e5e7eb',
  color: variant !== 'secondary' ? '#fff' : '#111827',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  marginRight: 8,
  fontWeight: 600,
  fontSize: 14
});

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);

interface KeywordTestingPanelProps {
  onSaveCategory?: (keywords: string[], name: string) => void;
}

export default function KeywordTestingPanel({ onSaveCategory }: KeywordTestingPanelProps) {
  const [testKeywords, setTestKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'exact' | 'fuzzy' | 'semantic'>('exact');
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [categoryName, setCategoryName] = useState('');
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [expandedCarteles, setExpandedCarteles] = useState<Set<string>>(new Set());

  // Estadísticas de los resultados
  const stats = useMemo(() => {
    if (testResults.length === 0) return null;
    
    return {
      total: testResults.length,
      totalMonto: _.sumBy(testResults, r => r.presupuestoLinea || 0),
      avgScore: _.meanBy(testResults, 'score'),
      instituciones: _.countBy(testResults, 'codigoInstitucion'),
      topKeywords: _.chain(testResults)
        .flatMap(r => r.coincidencias)
        .countBy()
        .toPairs()
        .orderBy([1], ['desc'])
        .take(10)
        .value()
    };
  }, [testResults]);

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !testKeywords.includes(keyword)) {
      setTestKeywords([...testKeywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setTestKeywords(testKeywords.filter(k => k !== keyword));
  };

  const runAnalysis = () => {
    if (testKeywords.length === 0) {
      alert('Agrega al menos una palabra clave para analizar');
      return;
    }

    setIsAnalyzing(true);
    
    setTimeout(() => {
      try {
        let results: any[] = [];

        if (analysisMode === 'exact') {
          results = analyzeExact();
        } else if (analysisMode === 'fuzzy') {
          results = analyzeFuzzy();
        } else {
          results = analyzeSemantic();
        }

        // Filtrar por confianza mínima
        results = results.filter(r => r.score >= minConfidence);

        // Filtrar por instituciones si hay selección
        if (selectedInstitutions.length > 0) {
          results = results.filter(r => selectedInstitutions.includes(r.codigoInstitucion));
        }

        // AGRUPAR RESULTADOS POR CARTEL
        const resultadosPorCartel = _.groupBy(results, 'numeroCartel');
        const cartelesAgrupados = Object.entries(resultadosPorCartel).map(([numeroCartel, lineas]) => {
          const primeraLinea = lineas[0];
          const todasLasCoincidencias = _.uniq(_.flatMap(lineas, l => l.coincidencias));
          const scorePromedio = _.meanBy(lineas, 'score');
          const montoTotal = _.sumBy(lineas, l => l.presupuestoLinea || 0);
          
          // Detectar si el nombre del cartel tiene coincidencias directas
          const nombreTieneCoincidencias = lineas.some(l => 
            l.fuentesConCoincidencias?.some((f: any) => f.fuente === 'Nombre del cartel')
          );

          return {
            numeroCartel,
            nombreCartel: primeraLinea.nombreCartel,
            codigoInstitucion: primeraLinea.codigoInstitucion,
            coincidencias: todasLasCoincidencias,
            score: scorePromedio,
            presupuestoTotal: montoTotal,
            cantidadLineasConCoincidencias: lineas.length,
            lineasConCoincidencias: lineas,
            nombreTieneCoincidencias,
            mode: primeraLinea.mode
          };
        });

        // Ordenar: primero los que tienen coincidencias en el nombre, luego por score
        const ordenados = _.orderBy(
          cartelesAgrupados,
          [c => c.nombreTieneCoincidencias ? 1 : 0, 'score'],
          ['desc', 'desc']
        );

        setTestResults(ordenados);
      } finally {
        setIsAnalyzing(false);
      }
    }, 100);
  };

  const analyzeExact = () => {
    // Usar TODAS las tablas que usa el sistema real de clasificación
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const carteles: any[] = dataManager.obtenerDatos('DetalleCarteles') || [];
    const results: any[] = [];

    console.log(`[KeywordTestingPanel] 🔍 Iniciando búsqueda exacta...`);
    console.log(`[KeywordTestingPanel] 📊 Total lineas: ${lineas.length}, Total carteles: ${carteles.length}`);
    console.log(`[KeywordTestingPanel] 🔑 Keywords a buscar:`, testKeywords);

    // DEBUG: Verificar estructura de datos
    if (lineas.length > 0) {
      const primeraLinea = lineas[0];
      console.log(`[KeywordTestingPanel] 🔬 Campos de la primera línea:`, Object.keys(primeraLinea));
      console.log(`[KeywordTestingPanel] 🔬 Muestra de primera línea:`, {
        numeroCartel: primeraLinea.numeroCartel,
        numeroLinea: primeraLinea.numeroLinea,
        descripcionLinea: primeraLinea.descripcionLinea,
        DESC_LINEA: primeraLinea.DESC_LINEA,
        desc_linea: primeraLinea.desc_linea
      });
    }
    if (carteles.length > 0) {
      const primerCartel = carteles[0];
      console.log(`[KeywordTestingPanel] 🔬 Campos del primer cartel:`, Object.keys(primerCartel));
      console.log(`[KeywordTestingPanel] 🔬 Muestra de primer cartel:`, {
        numeroCartel: primerCartel.numeroCartel,
        nombreCartel: primerCartel.nombreCartel,
        nombre_cartel: primerCartel.nombre_cartel
      });
    }

    // Crear índices para búsqueda eficiente
    const cartelPorId = new Map(carteles.map(c => [c.numeroCartel, c]));
    const lineasPorCartel = _.groupBy(lineas, 'numeroCartel');

    // Normalizar texto (misma lógica que DataManager)
    const normalizarTexto = (texto: string): string => {
      return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    // Función para buscar keywords en un texto y retornar palabras encontradas
    const buscarKeywords = (texto: string): string[] => {
      if (!texto) return [];
      const textoNorm = normalizarTexto(texto);
      const encontradas: string[] = [];

      for (const keyword of testKeywords) {
        const keywordNorm = normalizarTexto(keyword);
        if (textoNorm.includes(keywordNorm)) {
          encontradas.push(keyword);
        }
      }

      return encontradas;
    };

    // Función helper para obtener el valor de un campo con múltiples posibles nombres
    const obtenerCampo = (obj: any, ...nombres: string[]): string => {
      for (const nombre of nombres) {
        const valor = obj[nombre];
        if (valor !== undefined && valor !== null && valor !== '') {
          console.log(`[obtenerCampo] ✅ Encontrado campo "${nombre}" con valor:`, String(valor).substring(0, 100));
          return String(valor);
        }
      }
      console.log(`[obtenerCampo] ❌ NO encontrado ninguno de:`, nombres, 'en objeto con campos:', Object.keys(obj).slice(0, 20));
      return '';
    };

    let lineasAnalizadas = 0;
    let lineasConCoincidencias = 0;
    
    console.log('[KeywordTestingPanel] 📊 Iniciando análisis de', lineas.length, 'líneas');
    if (lineas.length > 0) {
      console.log('[KeywordTestingPanel] 🔬 Primera línea completa:', lineas[0]);
      console.log('[KeywordTestingPanel] 🔬 Campos disponibles:', Object.keys(lineas[0]));
    }
    
    // ANALIZAR CADA LÍNEA INDIVIDUALMENTE
    lineas.forEach((linea: any, index: number) => {
      lineasAnalizadas++;
      
      // Log detallado de las primeras 3 líneas
      if (index < 3) {
        console.log(`[KeywordTestingPanel] 🔍 Analizando línea ${index + 1}:`, {
          numeroCartel: linea.numeroCartel,
          numeroLinea: linea.numeroLinea,
          camposDisponibles: Object.keys(linea),
          descripcionLinea: linea.descripcionLinea,
          DESC_LINEA: linea.DESC_LINEA,
          desc_linea: linea.desc_linea,
          DESCRIPCION_LINEA: linea.DESCRIPCION_LINEA
        });
      }
      
      const cartel = cartelPorId.get(linea.numeroCartel);
      const coincidencias: string[] = [];
      const fuentesConCoincidencias: Array<{ fuente: string; texto: string; palabras: string[] }> = [];

      // 1. Buscar en la descripción de la línea (probar múltiples nombres de campo)
      const descripcionLinea = obtenerCampo(linea, 'descripcionLinea', 'DESC_LINEA', 'desc_linea', 'DESCRIPCION_LINEA');
      const palabrasEnLinea = buscarKeywords(descripcionLinea);
      if (palabrasEnLinea.length > 0) {
        palabrasEnLinea.forEach(p => {
          if (!coincidencias.includes(p)) coincidencias.push(p);
        });
        fuentesConCoincidencias.push({
          fuente: 'Descripción de línea',
          texto: descripcionLinea.substring(0, 200),
          palabras: palabrasEnLinea
        });
      }

      // 2. Buscar en el nombre del cartel (probar múltiples nombres de campo)
      if (cartel) {
        const nombreCartel = obtenerCampo(cartel, 'nombreCartel', 'NOMBRE_CARTEL', 'nombre_cartel', 'cartel_nm');
        const palabrasEnNombre = buscarKeywords(nombreCartel);
        if (palabrasEnNombre.length > 0) {
          palabrasEnNombre.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Nombre del cartel',
            texto: nombreCartel.substring(0, 200),
            palabras: palabrasEnNombre
          });
        }

        // 3. Buscar en la descripción del cartel
        const descripcionCartel = obtenerCampo(cartel, 'descripcionCartel', 'DESCRIPCION_CARTEL', 'descripcion', 'DESCRIPCION');
        const palabrasEnDescCartel = buscarKeywords(descripcionCartel);
        if (palabrasEnDescCartel.length > 0) {
          palabrasEnDescCartel.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Descripción del cartel',
            texto: descripcionCartel.substring(0, 200),
            palabras: palabrasEnDescCartel
          });
        }

        // 4. Buscar en la clasificación UNSPSC
        const clasificacion = obtenerCampo(cartel, 'clasificacionObjeto', 'CLASIFICACION_OBJETO', 'clasificacion', 'CLAS_OBJ');
        const palabrasEnClasif = buscarKeywords(clasificacion);
        if (palabrasEnClasif.length > 0) {
          palabrasEnClasif.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Clasificación UNSPSC',
            texto: clasificacion.substring(0, 200),
            palabras: palabrasEnClasif
          });
        }
      }

      // Si hay coincidencias, agregar esta línea a los resultados
      if (coincidencias.length > 0) {
        lineasConCoincidencias++;
        const score = coincidencias.length / testKeywords.length;
        
        // Obtener descripción principal
        let descripcionPrincipal = linea.descripcionLinea || cartel?.nombreCartel || cartel?.descripcionCartel || 'Sin descripción';

        // IMPORTANTE: Obtener TODAS las líneas del cartel para mostrarlas expandidas
        const todasLasLineasDelCartel = lineasPorCartel[linea.numeroCartel] || [];

        results.push({
          numeroCartel: linea.numeroCartel,
          numeroLinea: linea.numeroLinea,
          descripcionLinea: descripcionPrincipal,
          presupuestoLinea: linea.presupuestoLinea || 0,
          codigoInstitucion: cartel?.codigoInstitucion || '',
          nombreCartel: cartel?.nombreCartel || '',
          coincidencias,
          fuentesConCoincidencias,
          score,
          mode: 'exact',
          todasLasLineas: todasLasLineasDelCartel // Para mostrar en vista expandida
        });

        // Log detallado de las primeras coincidencias
        if (lineasConCoincidencias <= 5) {
          console.log(`[KeywordTestingPanel] ✅ Línea ${linea.numeroLinea} del Cartel ${linea.numeroCartel}: ${coincidencias.length} keywords encontradas`);
          console.log(`[KeywordTestingPanel]    📍 Fuentes:`, fuentesConCoincidencias.map(f => f.fuente).join(', '));
          console.log(`[KeywordTestingPanel]    🔑 Keywords:`, coincidencias.join(', '));
        }
      }
    });

    console.log(`[KeywordTestingPanel] ✅ Búsqueda completa: ${lineasConCoincidencias} líneas con coincidencias (de ${lineasAnalizadas} analizadas)`);
    console.log(`[KeywordTestingPanel] 📊 Fuentes únicas usadas:`, 
      [...new Set(results.flatMap(r => r.fuentesConCoincidencias?.map((f: any) => f.fuente) || []))].join(', '));
    
    return results;
  };

  const analyzeFuzzy = () => {
    // Usar TODAS las tablas (igual que modo exact)
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const carteles: any[] = dataManager.obtenerDatos('DetalleCarteles') || [];
    const results: any[] = [];

    console.log(`[KeywordTestingPanel] 🔍 Iniciando búsqueda fuzzy...`);
    console.log(`[KeywordTestingPanel] 📊 Total lineas: ${lineas.length}, Total carteles: ${carteles.length}`);

    const cartelPorId = new Map(carteles.map(c => [c.numeroCartel, c]));

    const normalizarTexto = (texto: string): string => {
      return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    // Función para buscar keywords con fuzzy matching
    const buscarKeywordsFuzzy = (texto: string): string[] => {
      if (!texto) return [];
      const textoNorm = normalizarTexto(texto);
      const palabras = textoNorm.split(/\s+/);
      const encontradas: string[] = [];

      for (const keyword of testKeywords) {
        const keywordNorm = normalizarTexto(keyword);
        
        // Buscar coincidencias fuzzy (palabra contiene keyword o viceversa)
        const encontrado = palabras.some((p: string) => {
          return p.includes(keywordNorm) || keywordNorm.includes(p);
        });

        if (encontrado) {
          encontradas.push(keyword);
        }
      }

      return encontradas;
    };

    let lineasAnalizadas = 0;
    let lineasConCoincidencias = 0;
    
    // ANALIZAR CADA LÍNEA INDIVIDUALMENTE
    lineas.forEach((linea: any) => {
      lineasAnalizadas++;
      const cartel = cartelPorId.get(linea.numeroCartel);
      const coincidencias: string[] = [];
      const fuentesConCoincidencias: Array<{ fuente: string; texto: string; palabras: string[] }> = [];

      // 1. Buscar en la descripción de la línea
      const palabrasEnLinea = buscarKeywordsFuzzy(linea.descripcionLinea);
      if (palabrasEnLinea.length > 0) {
        palabrasEnLinea.forEach(p => {
          if (!coincidencias.includes(p)) coincidencias.push(p);
        });
        fuentesConCoincidencias.push({
          fuente: 'Descripción de línea',
          texto: (linea.descripcionLinea || '').substring(0, 200),
          palabras: palabrasEnLinea
        });
      }

      // 2. Buscar en el nombre del cartel
      if (cartel?.nombreCartel) {
        const palabrasEnNombre = buscarKeywordsFuzzy(cartel.nombreCartel);
        if (palabrasEnNombre.length > 0) {
          palabrasEnNombre.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Nombre del cartel',
            texto: cartel.nombreCartel.substring(0, 200),
            palabras: palabrasEnNombre
          });
        }
      }

      // 3. Buscar en la descripción del cartel
      if (cartel?.descripcionCartel) {
        const palabrasEnDescCartel = buscarKeywordsFuzzy(cartel.descripcionCartel);
        if (palabrasEnDescCartel.length > 0) {
          palabrasEnDescCartel.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Descripción del cartel',
            texto: cartel.descripcionCartel.substring(0, 200),
            palabras: palabrasEnDescCartel
          });
        }
      }

      // 4. Buscar en la clasificación UNSPSC
      if (cartel?.clasificacionObjeto) {
        const palabrasEnClasif = buscarKeywordsFuzzy(cartel.clasificacionObjeto);
        if (palabrasEnClasif.length > 0) {
          palabrasEnClasif.forEach(p => {
            if (!coincidencias.includes(p)) coincidencias.push(p);
          });
          fuentesConCoincidencias.push({
            fuente: 'Clasificación UNSPSC',
            texto: cartel.clasificacionObjeto.substring(0, 200),
            palabras: palabrasEnClasif
          });
        }
      }

      // Si hay coincidencias, agregar esta línea a los resultados
      if (coincidencias.length > 0) {
        lineasConCoincidencias++;
        const score = (coincidencias.length / testKeywords.length) * 0.9; // Penalización por fuzzy
        
        let descripcionPrincipal = linea.descripcionLinea || cartel?.nombreCartel || cartel?.descripcionCartel || 'Sin descripción';

        results.push({
          numeroCartel: linea.numeroCartel,
          numeroLinea: linea.numeroLinea,
          descripcionLinea: descripcionPrincipal,
          presupuestoLinea: linea.presupuestoLinea || 0,
          codigoInstitucion: cartel?.codigoInstitucion || '',
          nombreCartel: cartel?.nombreCartel || '',
          coincidencias,
          fuentesConCoincidencias,
          score,
          mode: 'fuzzy'
        });

        if (lineasConCoincidencias <= 5) {
          console.log(`[KeywordTestingPanel] ✅ Línea ${linea.numeroLinea} del Cartel ${linea.numeroCartel} (fuzzy): ${coincidencias.length} keywords`);
          console.log(`[KeywordTestingPanel]    📍 Fuentes:`, fuentesConCoincidencias.map(f => f.fuente).join(', '));
        }
      }
    });

    console.log(`[KeywordTestingPanel] ✅ Búsqueda fuzzy completa: ${lineasConCoincidencias} líneas encontradas (de ${lineasAnalizadas} analizadas)`);
    console.log(`[KeywordTestingPanel] 📊 Fuentes únicas usadas:`, 
      [...new Set(results.flatMap(r => r.fuentesConCoincidencias?.map((f: any) => f.fuente) || []))].join(', '));
    
    return results;
  };

  const analyzeSemantic = () => {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const results: any[] = [];

    // Sinónimos y palabras relacionadas (simulación de análisis semántico)
    const semanticMap: Record<string, string[]> = {
      'computadora': ['computador', 'pc', 'ordenador', 'equipo de cómputo'],
      'software': ['programa', 'aplicación', 'sistema informático'],
      'vehículo': ['automóvil', 'carro', 'transporte'],
      'mobiliario': ['mueble', 'escritorio', 'silla'],
      'construcción': ['obra', 'edificación', 'infraestructura'],
      'mantenimiento': ['reparación', 'servicio'],
      'médico': ['sanitario', 'clínico', 'salud'],
      'educación': ['escolar', 'académico', 'docente']
    };

    // Expandir keywords con sinónimos
    const expandedKeywords = new Set<string>(testKeywords);
    for (const keyword of testKeywords) {
      if (semanticMap[keyword]) {
        semanticMap[keyword].forEach(syn => expandedKeywords.add(syn));
      }
    }

    for (const linea of lineas) {
      const descripcion = (linea.descripcionLinea || '').toLowerCase();
      const coincidencias: string[] = [];
      let semanticMatches = 0;

      for (const keyword of Array.from(expandedKeywords)) {
        if (descripcion.includes(keyword)) {
          const originalKeyword = testKeywords.find(k => k === keyword || semanticMap[k]?.includes(keyword));
          if (originalKeyword && !coincidencias.includes(originalKeyword)) {
            coincidencias.push(originalKeyword);
          }
          semanticMatches++;
        }
      }

      if (coincidencias.length > 0) {
        const score = (coincidencias.length / testKeywords.length) * (1 + (semanticMatches * 0.1));
        results.push({
          ...linea,
          coincidencias,
          score: Math.min(score, 1),
          mode: 'semantic',
          semanticMatches
        });
      }
    }

    return results;
  };

  const saveAsCategory = () => {
    if (!categoryName.trim()) {
      alert('Ingresa un nombre para la categoría');
      return;
    }

    if (testKeywords.length === 0) {
      alert('Agrega al menos una palabra clave');
      return;
    }

    if (onSaveCategory) {
      onSaveCategory(testKeywords, categoryName.trim());
      
      // Limpiar formulario
      setCategoryName('');
      setTestKeywords([]);
      setTestResults([]);
      
      alert(`✅ Categoría "${categoryName}" guardada con ${testKeywords.length} palabras clave`);
    }
  };

  return (
    <div>
      {/* Panel de configuración */}
      <div style={modernCard}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
          🧪 Panel de Prueba de Palabras Clave
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Izquierda: Configuración */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Agregar palabras clave
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Ej: computadora, software, médico..."
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
                <button onClick={addKeyword} style={btn('primary')}>
                  + Agregar
                </button>
              </div>
              
              <div style={{ marginTop: 12, minHeight: 60 }}>
                {testKeywords.map(keyword => (
                  <span key={keyword} style={{
                    ...badge,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    fontSize: 13,
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }} onClick={() => removeKeyword(keyword)}>
                    {keyword} ×
                  </span>
                ))}
                {testKeywords.length === 0 && (
                  <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                    No hay palabras clave agregadas
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Modo de análisis
              </label>
              <select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <option value="exact">Exacto - Coincidencia literal</option>
                <option value="fuzzy">Fuzzy - Permite variaciones</option>
                <option value="semantic">Semántico - Incluye sinónimos</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Confianza mínima: {(minConfidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Derecha: Opciones adicionales */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Nombre de la categoría (para guardar)
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej: Equipo de Cómputo"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
            </div>

            <div style={{
              background: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
                ℹ️ Modos de análisis:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#78350f' }}>
                <li><strong>Exacto:</strong> Busca coincidencias literales</li>
                <li><strong>Fuzzy:</strong> Encuentra palabras similares</li>
                <li><strong>Semántico:</strong> Incluye sinónimos y términos relacionados</li>
              </ul>
            </div>

            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || testKeywords.length === 0}
              style={{
                ...btn('success'),
                width: '100%',
                padding: '12px',
                fontSize: 16,
                marginRight: 0,
                opacity: (isAnalyzing || testKeywords.length === 0) ? 0.5 : 1,
                cursor: (isAnalyzing || testKeywords.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isAnalyzing ? '🔄 Analizando...' : '🔍 Analizar Licitaciones'}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {testResults.length > 0 && (
        <>
          {/* Estadísticas */}
          {stats && (
            <div style={modernCard}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                📊 Estadísticas del Análisis
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', padding: 16, background: '#dbeafe', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{stats.total}</div>
                  <div style={{ color: '#1e3a8a', fontSize: 14 }}>Licitaciones encontradas</div>
                </div>
                
                <div style={{ textAlign: 'center', padding: 16, background: '#dcfce7', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>
                    {formatMoney(stats.totalMonto)}
                  </div>
                  <div style={{ color: '#14532d', fontSize: 14 }}>Monto total</div>
                </div>
                
                <div style={{ textAlign: 'center', padding: 16, background: '#fef3c7', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>
                    {(stats.avgScore * 100).toFixed(0)}%
                  </div>
                  <div style={{ color: '#78350f', fontSize: 14 }}>Confianza promedio</div>
                </div>
                
                <div style={{ textAlign: 'center', padding: 16, background: '#e0e7ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3730a3' }}>
                    {Object.keys(stats.instituciones).length}
                  </div>
                  <div style={{ color: '#312e81', fontSize: 14 }}>Instituciones</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#374151' }}>Top palabras clave:</strong>{' '}
                  {stats.topKeywords.slice(0, 5).map(([word, count]) => (
                    <span key={word} style={{
                      ...badge,
                      background: '#22c55e',
                      color: 'white',
                      fontSize: 12
                    }}>
                      {word} ({count})
                    </span>
                  ))}
                </div>
                
                <button onClick={saveAsCategory} style={btn('primary')}>
                  💾 Guardar como Categoría
                </button>
              </div>
            </div>
          )}

          {/* Lista de resultados */}
          <div style={modernCard}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              📋 Licitaciones Encontradas ({testResults.length})
            </h3>
            
            <div style={{ maxHeight: 700, overflow: 'auto' }}>
              {testResults.slice(0, 50).map((cartel, i) => {
                const isExpanded = expandedCarteles.has(cartel.numeroCartel);
                const toggleExpand = () => {
                  const newExpanded = new Set(expandedCarteles);
                  if (isExpanded) {
                    newExpanded.delete(cartel.numeroCartel);
                  } else {
                    newExpanded.add(cartel.numeroCartel);
                  }
                  setExpandedCarteles(newExpanded);
                };

                return (
                  <div key={i} style={{
                    background: cartel.nombreTieneCoincidencias ? '#ecfdf5' : '#f9fafb',
                    border: cartel.nombreTieneCoincidencias ? '2px solid #10b981' : '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12
                  }}>
                    {/* Cabecera del cartel */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                        {cartel.nombreTieneCoincidencias && (
                          <span style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            ⭐ Nombre Coincide
                          </span>
                        )}
                        <span style={{
                          background: '#3b82f6',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700
                        }}>
                          {cartel.numeroCartel}
                        </span>
                        <span style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {cartel.codigoInstitucion}
                        </span>
                        <span style={{
                          background: cartel.score >= 0.8 ? '#22c55e' : cartel.score >= 0.6 ? '#fbbf24' : '#f97316',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700
                        }}>
                          {(cartel.score * 100).toFixed(0)}% confianza
                        </span>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {cartel.cantidadLineasConCoincidencias} líneas con coincidencias
                        </span>
                      </div>
                      {cartel.presupuestoTotal > 0 && (
                        <span style={{
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {formatMoney(cartel.presupuestoTotal)}
                        </span>
                      )}
                    </div>

                    {/* Nombre del cartel */}
                    <div style={{
                      fontSize: 15,
                      color: '#111827',
                      lineHeight: 1.5,
                      marginBottom: 12,
                      fontWeight: 600,
                      background: cartel.nombreTieneCoincidencias ? '#d1fae5' : 'transparent',
                      padding: cartel.nombreTieneCoincidencias ? '8px 12px' : '0',
                      borderRadius: cartel.nombreTieneCoincidencias ? 6 : 0,
                      border: cartel.nombreTieneCoincidencias ? '1px solid #6ee7b7' : 'none'
                    }}>
                      {cartel.nombreCartel || 'Sin nombre'}
                    </div>

                    {/* Palabras clave encontradas */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                        🔑 Palabras clave encontradas:
                      </span>
                      {cartel.coincidencias.map((palabra: string) => (
                        <span key={palabra} style={{
                          ...badge,
                          background: '#22c55e',
                          color: 'white',
                          fontSize: 11
                        }}>
                          ✓ {palabra}
                        </span>
                      ))}
                    </div>

                    {/* Botón para expandir/contraer */}
                    <button
                      onClick={toggleExpand}
                      style={{
                        ...btn('secondary'),
                        width: '100%',
                        marginTop: 8,
                        marginRight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      {isExpanded ? '▼' : '▶'} {isExpanded ? 'Ocultar' : 'Ver'} todas las líneas del cartel ({cartel.lineasConCoincidencias[0]?.todasLasLineas?.length || 0} líneas totales)
                    </button>

                    {/* Vista expandida con todas las líneas */}
                    {isExpanded && cartel.lineasConCoincidencias[0]?.todasLasLineas && (
                      <div style={{
                        marginTop: 16,
                        background: 'white',
                        border: '2px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 16
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📋 Todas las líneas del cartel
                        </h4>
                        
                        {cartel.lineasConCoincidencias[0].todasLasLineas.map((linea: any, lineaIdx: number) => {
                          // Verificar si esta línea tiene coincidencias
                          const lineaTieneCoincidencias = cartel.lineasConCoincidencias.some(
                            (lc: any) => lc.numeroLinea === linea.numeroLinea
                          );
                          const datosCoincidencia = cartel.lineasConCoincidencias.find(
                            (lc: any) => lc.numeroLinea === linea.numeroLinea
                          );

                          return (
                            <div key={lineaIdx} style={{
                              background: lineaTieneCoincidencias ? '#fef3c7' : '#f9fafb',
                              border: lineaTieneCoincidencias ? '2px solid #fbbf24' : '1px solid #e5e7eb',
                              borderRadius: 6,
                              padding: 12,
                              marginBottom: 8
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{
                                    background: lineaTieneCoincidencias ? '#fbbf24' : '#9ca3af',
                                    color: lineaTieneCoincidencias ? '#78350f' : 'white',
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700
                                  }}>
                                    Línea {linea.numeroLinea}
                                  </span>
                                  {lineaTieneCoincidencias && (
                                    <span style={{
                                      background: '#10b981',
                                      color: 'white',
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      textTransform: 'uppercase'
                                    }}>
                                      ✓ Coincide
                                    </span>
                                  )}
                                </div>
                                {linea.presupuestoLinea > 0 && (
                                  <span style={{
                                    color: '#059669',
                                    fontWeight: 600,
                                    fontSize: 12
                                  }}>
                                    {formatMoney(linea.presupuestoLinea)}
                                  </span>
                                )}
                              </div>

                              <div style={{
                                fontSize: 13,
                                color: linea.descripcionLinea ? '#374151' : '#9ca3af',
                                lineHeight: 1.5,
                                marginBottom: lineaTieneCoincidencias ? 8 : 0,
                                fontStyle: linea.descripcionLinea ? 'normal' : 'italic'
                              }}>
                                {linea.descripcionLinea || '(Sin descripción en la línea - ver fuentes de coincidencia abajo)'}
                              </div>

                              {/* Si la línea tiene coincidencias, mostrar detalles */}
                              {lineaTieneCoincidencias && datosCoincidencia && (
                                <>
                                  {/* Palabras clave encontradas en esta línea */}
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                                      Palabras encontradas:
                                    </span>
                                    {datosCoincidencia.coincidencias.map((palabra: string) => (
                                      <span key={palabra} style={{
                                        background: '#22c55e',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: 3,
                                        fontSize: 10,
                                        fontWeight: 600
                                      }}>
                                        ✓ {palabra}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Fuentes con coincidencias */}
                                  {datosCoincidencia.fuentesConCoincidencias && datosCoincidencia.fuentesConCoincidencias.length > 0 && (
                                    <div style={{
                                      background: 'white',
                                      border: '2px solid #86efac',
                                      borderRadius: 4,
                                      padding: 10
                                    }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        🎯 Dónde se encontraron las palabras clave:
                                      </div>
                                      {datosCoincidencia.fuentesConCoincidencias.map((fuente: any, fIdx: number) => (
                                        <div key={fIdx} style={{
                                          background: '#f0fdf4',
                                          border: '1px solid #86efac',
                                          borderRadius: 4,
                                          padding: 8,
                                          marginBottom: 6,
                                          fontSize: 12
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <span style={{
                                              background: '#22c55e',
                                              color: 'white',
                                              padding: '3px 8px',
                                              borderRadius: 4,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              textTransform: 'uppercase'
                                            }}>
                                              📍 {fuente.fuente}
                                            </span>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                              {fuente.palabras.map((palabra: string, pIdx: number) => (
                                                <span key={pIdx} style={{
                                                  background: '#dcfce7',
                                                  color: '#166534',
                                                  padding: '2px 8px',
                                                  borderRadius: 3,
                                                  fontSize: 10,
                                                  fontWeight: 700
                                                }}>
                                                  ✓ {palabra}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                          <div style={{ 
                                            color: '#374151', 
                                            fontSize: 11, 
                                            lineHeight: 1.5,
                                            background: 'white',
                                            padding: '6px 8px',
                                            borderRadius: 3,
                                            border: '1px solid #e5e7eb'
                                          }}>
                                            <strong style={{ color: '#059669' }}>Texto:</strong> {fuente.texto}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {testResults.length > 50 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                  Mostrando 50 de {testResults.length} resultados
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Estado vacío */}
      {testResults.length === 0 && !isAnalyzing && testKeywords.length > 0 && (
        <div style={{
          ...modernCard,
          textAlign: 'center',
          padding: 40
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 8 }}>
            Palabras clave configuradas
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>
            Haz clic en "Analizar Licitaciones" para ver los resultados
          </div>
        </div>
      )}
    </div>
  );
}
