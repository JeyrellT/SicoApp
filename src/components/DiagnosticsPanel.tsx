import React from 'react';
import { dataManager } from '../data/DataManager';
import type { FiltroBusqueda } from '../types/entities';

type Props = { filtros?: FiltroBusqueda };

export function DiagnosticsPanel({ filtros }: Props) {
  if (!dataManager.isDataLoaded) {
    return <div>Datos no cargados.</div>;
  }

  const diag = dataManager.getDiagnostics();
  const kpis = dataManager.kpisGenerales(filtros ?? {});
  const integ = dataManager.resumenIntegridad || { totalOrfanas: 0, detalles: [] as Array<{ tabla: string; campo: string; orfanas: number }> };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section>
        <h3>KPIs</h3>
        <ul>
          <li>Tasa de conversión: {kpis.tasaConversion.toFixed(1)}%</li>
          <li>Desierto: {kpis.desierto.toFixed(1)}%</li>
          <li>Mediana Time-to-Award: {kpis.medianaTTA.toFixed(1)} días</li>
          <li>HHI (0-1): {kpis.hhi.toFixed(3)}</li>
        </ul>
      </section>
      <section>
        <h3>Integridad relacional</h3>
  <div>Total huérfanas: {integ?.totalOrfanas ?? 0}</div>
  {integ && integ.detalles && integ.detalles.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Tabla</th>
                <th style={{ textAlign: 'left' }}>Campo</th>
                <th style={{ textAlign: 'right' }}>Huérfanas</th>
              </tr>
            </thead>
            <tbody>
              {integ.detalles.map((d, i) => (
                <tr key={i}>
                  <td>{d.tabla}</td>
                  <td>{d.campo}</td>
                  <td style={{ textAlign: 'right' }}>{d.orfanas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h3>Carga y mapeo</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(diag.rowCounts || {}).map(([tabla, count]) => (
            <div key={tabla}>
              <strong>{tabla}</strong>: {count} filas
              <details>
                <summary>Encabezados</summary>
                <div style={{ fontSize: 12 }}>
                  <div>Raw: {(diag.headerStats?.[tabla]?.rawHeaders || []).join(', ')}</div>
                  <div>Mapeados: {(diag.headerStats?.[tabla]?.explicitMapped || []).join(', ')}</div>
                  <div>Normalizados: {(diag.headerStats?.[tabla]?.autoNormalized || []).join(', ')}</div>
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
