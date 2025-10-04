/*
 Verifica totales de montos a partir de DetalleCarteles.MONTO_EST (mapeado a presupuestoOficial)
 y opcionalmente compara con un archivo JSON de debug generado por la app.

 Usage (PowerShell):
   npm run verify:montos -- --carteles ..\..\cleaned\DetalleCarteles.csv [--debug d:\\Downloads\\sicop_debug_montos_YYYY-MM-DD.json]
*/

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

function parseNumeroFlexible(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.replace(/^\(|\)$/g, ''); }
  s = s.replace(/[\s\u00A0]/g, '')
       .replace(/(?:CRC|CRC\.|colones?|col[oó]n(?:es)?)/gi, '')
       .replace(/[₡$€¢]/g, '')
       .replace(/[^0-9,\.\-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}

function readCSVSync(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const res = Papa.parse(text, { header: true, delimiter: '', skipEmptyLines: true });
  return res.data || [];
}

function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const i = args.indexOf(name);
    if (i >= 0) return args[i + 1];
    return undefined;
  };
  const cartelesPath = getArg('--carteles') || path.resolve(__dirname, '..', '..', 'cleaned', 'DetalleCarteles.csv');
  const debugPath = getArg('--debug');

  if (!fs.existsSync(cartelesPath)) {
    console.error('No existe DetalleCarteles.csv en', cartelesPath);
    process.exit(1);
  }

  const rows = readCSVSync(cartelesPath);
  const headerMap = {
    'nro_sicop': 'numeroCartel',
    'numero_sicop': 'numeroCartel',
    'monto_est': 'presupuestoOficial',
    'presupuesto_oficial': 'presupuestoOficial',
  };

  const normalizeHeader = (h) => (headerMap[h.toLowerCase()] || h)
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();

  const normalized = rows.map(r => {
    const o = {};
    for (const k of Object.keys(r)) {
      const nk = normalizeHeader(k);
      o[nk] = r[k];
    }
    return o;
  });

  let total = 0;
  let count = 0;
  for (const r of normalized) {
    const k = r['numeroCartel'] || r['nro_sicop'] || r['numero_sicop'] || r['nro_sicop'.toLowerCase()];
    const m = parseNumeroFlexible(r['presupuestooficial'] ?? r['presupuesto_oficial'] ?? r['monto_est']);
    if (k && m > 0) {
      total += m;
      count += 1;
    }
  }

  console.log('Carteles con presupuesto (>0):', count);
  console.log('Monto total (sum MONTO_EST):', Math.round(total));

  if (debugPath && fs.existsSync(debugPath)) {
    const dbg = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
    const rows = Array.isArray(dbg.rows) ? dbg.rows : Array.isArray(dbg) ? dbg : [];
    const sumChosen = rows.reduce((s, r) => s + (r.monto_final_crc || 0), 0);
    const sumPres = rows.reduce((s, r) => s + ((r.steps || []).find(x => x.source === 'PresupuestoOficial')?.total_crc || 0), 0);
    console.log('Debug JSON -> suma chosen_source:', Math.round(sumChosen));
    console.log('Debug JSON -> suma PresupuestoOficial:', Math.round(sumPres));
  }
}

main();
