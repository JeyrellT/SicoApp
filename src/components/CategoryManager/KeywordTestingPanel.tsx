import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { useProcedimientos } from '../../hooks/api';
import { normalizarTexto } from './categoryGrouping';
import { badge, btn, formatMoney, highlightKeywords, modernCard } from './categoryStyles';

interface KeywordTestingPanelProps {
  onSaveCategory?: (keywords: string[], name: string) => void;
}

const PAGE_SIZE = 25;

/**
 * Panel de prueba de palabras clave.
 *
 * Antes escaneaba localmente las tablas en memoria DetalleLineaCartel /
 * DetalleCarteles del DataManager legado (que ya no se llenan: la app
 * carga todo desde la API REST y esas tablas se publican vacías varios
 * meses en el origen). Ahora usa el hook `useProcedimientos({ buscar })`
 * para traer una muestra paginada real de procedimientos.
 *
 * Limitación conocida: el backend solo soporta un término de búsqueda por
 * consulta (`GET /v1/procedimientos?buscar=`), así que la búsqueda en el
 * servidor usa únicamente la primera palabra clave de la lista; las demás
 * palabras clave se usan para puntuar/resaltar localmente sobre la
 * descripción de cada procedimiento ya traído (no hay forma de hacer un
 * AND multi-palabra ni de acceder a las líneas individuales del cartel).
 */
export default function KeywordTestingPanel({ onSaveCategory }: KeywordTestingPanelProps) {
  const [testKeywords, setTestKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');
  const [page, setPage] = useState(1);
  const [modo, setModo] = useState<'exacta' | 'flexible'>('exacta');
  const [minConfidence, setMinConfidence] = useState(0.34);
  const [categoryName, setCategoryName] = useState('');

  const procedimientosQuery = useProcedimientos({
    buscar: busquedaActiva || undefined,
    page,
    page_size: busquedaActiva ? PAGE_SIZE : 1
  });

  const testResults = useMemo(() => {
    if (!busquedaActiva) return [];
    const items = procedimientosQuery.data?.items ?? [];
    const palabrasNorm = testKeywords.map(normalizarTexto);

    return items
      .map((item) => {
        const descNorm = normalizarTexto(item.descripcion);
        const coincidencias = testKeywords.filter((_kw, i) => {
          const p = palabrasNorm[i];
          if (!p) return false;
          if (modo === 'exacta') return descNorm.includes(p);
          return descNorm.split(/\s+/).some((palabra) => palabra.includes(p) || p.includes(palabra));
        });
        return {
          item,
          coincidencias,
          score: testKeywords.length ? coincidencias.length / testKeywords.length : 0
        };
      })
      .filter((r) => r.coincidencias.length > 0 && r.score >= minConfidence)
      .sort((a, b) => b.score - a.score);
  }, [procedimientosQuery.data, testKeywords, modo, minConfidence, busquedaActiva]);

  const stats = useMemo(() => {
    if (testResults.length === 0) return null;
    return {
      total: testResults.length,
      totalMonto: _.sumBy(testResults, (r) => r.item.monto_crc || 0),
      avgScore: _.meanBy(testResults, 'score'),
      instituciones: _.uniq(testResults.map((r) => r.item.ced_institucion)).length,
      topKeywords: _.chain(testResults)
        .flatMap((r) => r.coincidencias)
        .countBy()
        .toPairs()
        .orderBy([1], ['desc'])
        .take(10)
        .value()
    };
  }, [testResults]);

  const totalPaginas = procedimientosQuery.data
    ? Math.max(1, Math.ceil(procedimientosQuery.data.total / PAGE_SIZE))
    : 1;

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !testKeywords.includes(keyword)) {
      setTestKeywords([...testKeywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setTestKeywords(testKeywords.filter((k) => k !== keyword));
  };

  const runAnalysis = () => {
    if (testKeywords.length === 0) {
      alert('Agrega al menos una palabra clave para analizar');
      return;
    }
    setPage(1);
    setBusquedaActiva(testKeywords[0]);
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
      setCategoryName('');
      setTestKeywords([]);
      setBusquedaActiva('');
      alert(`Categoría "${categoryName}" guardada con ${testKeywords.length} palabras clave`);
    }
  };

  return (
    <div>
      {/* Panel de configuración */}
      <div style={modernCard}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
          Panel de Prueba de Palabras Clave
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
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
                  style={{ flex: 1, padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                />
                <button onClick={addKeyword} style={btn('primary')}>
                  + Agregar
                </button>
              </div>

              <div style={{ marginTop: 12, minHeight: 60 }}>
                {testKeywords.map((keyword, i) => (
                  <span
                    key={keyword}
                    style={{
                      ...badge,
                      background: i === 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      fontSize: 13,
                      padding: '6px 12px',
                      cursor: 'pointer'
                    }}
                    title={i === 0 ? 'Palabra usada para buscar en el servidor' : 'Palabra usada solo para puntuar localmente'}
                    onClick={() => removeKeyword(keyword)}
                  >
                    {keyword} ×
                  </span>
                ))}
                {testKeywords.length === 0 && (
                  <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                    No hay palabras clave agregadas
                  </div>
                )}
              </div>
              {testKeywords.length > 1 && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  La búsqueda en el servidor usa solo "{testKeywords[0]}" (primera palabra); las demás filtran
                  localmente los resultados.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Modo de coincidencia (local, sobre la muestra traída)
              </label>
              <select
                value={modo}
                onChange={(e) => setModo(e.target.value as 'exacta' | 'flexible')}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
              >
                <option value="exacta">Exacta - Coincidencia literal</option>
                <option value="flexible">Flexible - Permite variaciones de la palabra</option>
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
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
              />
            </div>

            <div style={{ background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Cómo funciona esta muestra:</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#78350f' }}>
                <li>Busca en el servidor procedimientos cuya descripción o número contenga la primera palabra clave.</li>
                <li>Sobre esa muestra (hasta {PAGE_SIZE} por página), filtra localmente por el resto de palabras clave.</li>
                <li>Es una muestra representativa, no un escaneo completo de la base de datos.</li>
              </ul>
            </div>

            <button
              onClick={runAnalysis}
              disabled={procedimientosQuery.isFetching || testKeywords.length === 0}
              style={{
                ...btn('primary'),
                width: '100%',
                padding: '12px',
                fontSize: 16,
                marginRight: 0,
                opacity: procedimientosQuery.isFetching || testKeywords.length === 0 ? 0.5 : 1,
                cursor: procedimientosQuery.isFetching || testKeywords.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {procedimientosQuery.isFetching ? 'Buscando...' : 'Analizar Licitaciones'}
            </button>
          </div>
        </div>
      </div>

      {busquedaActiva && procedimientosQuery.isError && (
        <div style={{ ...modernCard, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>
            No se pudo consultar el servidor para esta búsqueda.
          </div>
          <button onClick={() => procedimientosQuery.refetch()} style={btn('primary')}>
            Reintentar
          </button>
        </div>
      )}

      {busquedaActiva && !procedimientosQuery.isError && (
        <>
          {stats && (
            <div style={modernCard}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                Estadísticas de la Muestra
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', padding: 16, background: '#dbeafe', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{stats.total}</div>
                  <div style={{ color: '#1e3a8a', fontSize: 14 }}>Procedimientos en la muestra</div>
                </div>

                <div style={{ textAlign: 'center', padding: 16, background: '#dcfce7', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{formatMoney(stats.totalMonto)}</div>
                  <div style={{ color: '#14532d', fontSize: 14 }}>Monto adjudicado (muestra)</div>
                </div>

                <div style={{ textAlign: 'center', padding: 16, background: '#fef3c7', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{(stats.avgScore * 100).toFixed(0)}%</div>
                  <div style={{ color: '#78350f', fontSize: 14 }}>Confianza promedio</div>
                </div>

                <div style={{ textAlign: 'center', padding: 16, background: '#e0e7ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3730a3' }}>{stats.instituciones}</div>
                  <div style={{ color: '#312e81', fontSize: 14 }}>Instituciones distintas</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <strong style={{ color: '#374151' }}>Top palabras clave:</strong>{' '}
                  {stats.topKeywords.map(([word, count]) => (
                    <span key={word} style={{ ...badge, background: '#22c55e', color: 'white', fontSize: 12 }}>
                      {word} ({count})
                    </span>
                  ))}
                </div>

                <button onClick={saveAsCategory} style={btn('primary')}>
                  Guardar como Categoría
                </button>
              </div>
            </div>
          )}

          <div style={modernCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                Procedimientos Encontrados ({testResults.length} de {procedimientosQuery.data?.items.length ?? 0} en esta página)
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || procedimientosQuery.isFetching}
                  style={{ ...btn('secondary'), marginRight: 0 }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  Página {page} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas || procedimientosQuery.isFetching}
                  style={{ ...btn('secondary'), marginRight: 0 }}
                >
                  Siguiente
                </button>
              </div>
            </div>

            {testResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                Ningún procedimiento de esta página cumple todas las palabras clave con la confianza mínima elegida.
              </div>
            ) : (
              <div style={{ maxHeight: 700, overflow: 'auto' }}>
                {testResults.map(({ item, coincidencias, score }) => (
                  <div
                    key={item.nro_sicop}
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                          {item.numero_procedimiento}
                        </span>
                        <span style={{ background: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {item.institucion}
                        </span>
                        <span
                          style={{
                            background: score >= 0.8 ? '#22c55e' : score >= 0.5 ? '#fbbf24' : '#f97316',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700
                          }}
                        >
                          {(score * 100).toFixed(0)}% confianza
                        </span>
                      </div>
                      {item.monto_crc > 0 && (
                        <span style={{ color: '#059669', fontWeight: 700, fontSize: 14 }}>{formatMoney(item.monto_crc)}</span>
                      )}
                    </div>

                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, marginBottom: 12 }}>
                      {highlightKeywords(item.descripcion, coincidencias).map((part, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: part.highlighted ? '#22c55e' : 'transparent',
                            color: part.highlighted ? 'white' : '#1f2937',
                            fontWeight: part.highlighted ? 700 : 400,
                            padding: part.highlighted ? '2px 6px' : '0',
                            borderRadius: part.highlighted ? 4 : 0
                          }}
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Palabras clave encontradas:</span>
                      {coincidencias.map((palabra) => (
                        <span key={palabra} style={{ ...badge, background: '#22c55e', color: 'white', fontSize: 11 }}>
                          {palabra}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!busquedaActiva && testKeywords.length > 0 && (
        <div style={{ ...modernCard, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 8 }}>Palabras clave configuradas</div>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>Haz clic en "Analizar Licitaciones" para consultar el servidor</div>
        </div>
      )}
    </div>
  );
}
