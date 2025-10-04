import { dataManager } from '../data/DataManager';

// Lightweight CSV creation to avoid adding deps; will try dynamic XLSX if available
function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
    const needsQuote = /[",\n]/.test(s);
    return needsQuote ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const headerLine = headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(',');
  const lines = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

function downloadBlob(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAllFromDataManager(preferXlsx: boolean = true) {
  // Recoger nombres de tablas conocidas desde relaciones
  const tablas = [
    'InstitucionesRegistradas','Proveedores','ProcedimientoAdjudicacion','ProcedimientoADM','Sistemas','SistemaEvaluacionOfertas',
    'DetalleCarteles','DetalleLineaCartel','FechaPorEtapas','Ofertas','LineasOfertadas','LineasRecibidas','InvitacionProcedimiento',
    'LineasAdjudicadas','AdjudicacionesFirme','Contratos','LineasContratadas','OrdenPedido','Recepciones','ReajustePrecios',
    'Garantias','RecursosObjecion','FuncionariosInhibicion','SancionProveedores','Remates'
  ];

  const datasets: Record<string, any[]> = {};
  tablas.forEach(t => {
    try {
      datasets[t] = dataManager.obtenerDatos(t) || [];
    } catch {
      datasets[t] = [];
    }
  });

  // Intentar XLSX dinámicamente si está disponible en window (por si el usuario lo incluye en el futuro)
  if (preferXlsx && (window as any).XLSX) {
    const XLSX = (window as any).XLSX;
    const wb = XLSX.utils.book_new();
    Object.entries(datasets).forEach(([name, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows || []);
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0,31));
    });
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `sicop_datos_${new Date().toISOString().slice(0,10)}.xlsx`);
    return { format: 'xlsx', tables: Object.keys(datasets) };
  }

  // Fallback a ZIP simple de CSVs empaquetados como text/plain concatenados (sin dependencia); o descarga múltiple
  // Para evitar múltiples prompts, generamos un único CSV por tabla con prefijo
  const boundary = `---SICOP-CSV-BOUNDARY-${Date.now()}---`;
  const parts: string[] = [];
  Object.entries(datasets).forEach(([name, rows]) => {
    const csv = toCSV(rows);
    parts.push(`#FILE:${name}.csv`);
    parts.push(csv);
    parts.push(boundary);
  });
  const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `sicop_datos_${new Date().toISOString().slice(0,10)}.csvbundle.txt`);
  return { format: 'csvbundle', tables: Object.keys(datasets) };
}

export async function exportDebugMontos() {
  const debugRows = dataManager.generarDebugMontosPorCartel?.() || [];
  const blob = new Blob([JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: debugRows.length,
    rows: debugRows
  }, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `sicop_debug_montos_${new Date().toISOString().slice(0,10)}.json`);
  return { format: 'json', rows: debugRows.length };
}
