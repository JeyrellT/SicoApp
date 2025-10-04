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
          // Modo exacto: búsqueda literal
          results = analyzeExact();
        } else if (analysisMode === 'fuzzy') {
          // Modo fuzzy: permite variaciones
          results = analyzeFuzzy();
        } else {
          // Modo semántico: análisis más inteligente
          results = analyzeSemantic();
        }

        // Filtrar por confianza mínima
        results = results.filter(r => r.score >= minConfidence);

        // Filtrar por instituciones si hay selección
        if (selectedInstitutions.length > 0) {
          results = results.filter(r => selectedInstitutions.includes(r.codigoInstitucion));
        }

        setTestResults(_.orderBy(results, ['score'], ['desc']));
      } finally {
        setIsAnalyzing(false);
      }
    }, 100);
  };

  const analyzeExact = () => {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const results: any[] = [];

    for (const linea of lineas) {
      const descripcion = (linea.descripcionLinea || '').toLowerCase();
      const coincidencias: string[] = [];

      for (const keyword of testKeywords) {
        if (descripcion.includes(keyword)) {
          coincidencias.push(keyword);
        }
      }

      if (coincidencias.length > 0) {
        const score = coincidencias.length / testKeywords.length;
        results.push({
          ...linea,
          coincidencias,
          score,
          mode: 'exact'
        });
      }
    }

    return results;
  };

  const analyzeFuzzy = () => {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const results: any[] = [];

    for (const linea of lineas) {
      const descripcion = (linea.descripcionLinea || '').toLowerCase();
      const palabras = descripcion.split(/\s+/);
      const coincidencias: string[] = [];

      for (const keyword of testKeywords) {
        // Buscar palabras similares (que contengan o estén contenidas en la keyword)
        palabras.some((p: string) => {
          if (p.includes(keyword) || keyword.includes(p)) {
            if (!coincidencias.includes(keyword)) {
              coincidencias.push(keyword);
            }
            return true;
          }
          return false;
        });
      }

      if (coincidencias.length > 0) {
        const score = (coincidencias.length / testKeywords.length) * 0.9; // Penalización por fuzzy
        results.push({
          ...linea,
          coincidencias,
          score,
          mode: 'fuzzy'
        });
      }
    }

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
              📋 Resultados del Análisis ({testResults.length})
            </h3>
            
            <div style={{ maxHeight: 600, overflow: 'auto' }}>
              {testResults.slice(0, 50).map((result, i) => (
                <div key={i} style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{
                        background: '#3b82f6',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700
                      }}>
                        {result.numeroCartel}
                      </span>
                      <span style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {result.codigoInstitucion}
                      </span>
                      <span style={{
                        background: result.score >= 0.8 ? '#22c55e' : result.score >= 0.6 ? '#fbbf24' : '#f97316',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        {(result.score * 100).toFixed(0)}% confianza
                      </span>
                    </div>
                    {result.presupuestoLinea && (
                      <span style={{
                        color: '#059669',
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        {formatMoney(result.presupuestoLinea)}
                      </span>
                    )}
                  </div>

                  <div style={{
                    fontSize: 14,
                    color: '#374151',
                    lineHeight: 1.5,
                    marginBottom: 8
                  }}>
                    {result.descripcionLinea}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                      Coincidencias:
                    </span>
                    {result.coincidencias.map((palabra: string) => (
                      <span key={palabra} style={{
                        ...badge,
                        background: '#22c55e',
                        color: 'white',
                        fontSize: 11
                      }}>
                        ✓ {palabra}
                      </span>
                    ))}
                    <span style={{
                      ...badge,
                      background: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: 11
                    }}>
                      Modo: {result.mode}
                    </span>
                  </div>
                </div>
              ))}
              
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
