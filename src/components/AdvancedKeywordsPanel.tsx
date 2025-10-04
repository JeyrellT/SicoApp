import React, { useMemo, useState } from 'react';
import { formatNumber } from '../utils/formatting';
import './AdvancedKeywordsPanel.css';

interface Keyword { palabra: string; frecuencia: number; }
interface Props { keywords: Keyword[]; max?: number; }

const AdvancedKeywordsPanel: React.FC<Props> = ({ keywords, max = 200 }) => {
  const [focus, setFocus] = useState<string | null>(null);
  const top = useMemo(() => (keywords || []).slice(0, max), [keywords, max]);
  const maxFreq = top.length ? Math.max(...top.map(k => k.frecuencia || 0)) : 1;
  const avg = top.length ? (top.reduce((s, k) => s + (k.frecuencia || 0), 0) / top.length) : 0;
  const thresholdHigh = avg * 2.2;
  const thresholdLow = avg * 0.6;

  const enriched = top.map(k => {
    const f = k.frecuencia || 0;
    let categoria: 'dominante' | 'clave' | 'emergente' | 'nicho';
    if (f >= thresholdHigh) categoria = 'dominante';
    else if (f >= avg) categoria = 'clave';
    else if (f >= thresholdLow) categoria = 'emergente';
    else categoria = 'nicho';
    return { ...k, categoria };
  });

  const grupos: Record<string, Keyword[]> = { dominante: [], clave: [], emergente: [], nicho: [] } as any;
  enriched.forEach(k => grupos[k.categoria].push(k));
  Object.keys(grupos).forEach(g => grupos[g] = grupos[g].sort((a,b) => b.frecuencia - a.frecuencia));

  const cloud = enriched.slice(0, 80);

  return (
    <div className="akp">
      <div className="akp__legend">
        <span className="akp__badge dom">Dominantes</span>
        <span className="akp__badge cla">Claves</span>
        <span className="akp__badge eme">Emergentes</span>
        <span className="akp__badge nic">Nicho</span>
      </div>
      <div className="akp__cloud" aria-label="Nube de palabras clave with semantic scaling">
        {cloud.map(w => {
          const scale = 0.6 + (w.frecuencia / maxFreq) * 0.9; // 0.6x to 1.5x
          return (
            <button
              key={w.palabra}
              className={`akp__word cat-${w.categoria} ${focus === w.palabra ? 'focused' : ''}`}
              style={{ fontSize: `${Math.min(1.5, scale).toFixed(2)}rem`, opacity: 0.45 + (w.frecuencia / maxFreq) * 0.55 }}
              title={`${w.palabra} • Frecuencia: ${w.frecuencia} (${w.categoria})`}
              onClick={() => setFocus(focus === w.palabra ? null : w.palabra)}
            >
              {w.palabra}
            </button>
          );
        })}
      </div>
      {focus && (
        <div className="akp__detail" role="dialog" aria-label="Detalle palabra clave">
          <h4>{focus}</h4>
          <p>Frecuencia: {formatNumber(enriched.find(e => e.palabra === focus)?.frecuencia || 0)}</p>
          <p>Categoría: {enriched.find(e => e.palabra === focus)?.categoria}</p>
          <button className="akp__close" onClick={() => setFocus(null)}>Cerrar</button>
        </div>
      )}
      <div className="akp__groups">
        {(['dominante','clave','emergente','nicho'] as const).map(cat => (
          <div key={cat} className="akp__group">
            <div className="akp__group-title">{cat.charAt(0).toUpperCase() + cat.slice(1)} ({grupos[cat].length})</div>
            <div className="akp__chips">
              {grupos[cat].slice(0, 12).map(k => (
                <span key={k.palabra} className={`akp__chip cat-${cat}`}>{k.palabra}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvancedKeywordsPanel;
