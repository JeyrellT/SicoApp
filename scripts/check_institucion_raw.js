const fs = require('fs');
const path = require('path');

function detectDelimiter(line) {
  if (line.includes(';')) return ';';
  if (line.includes(',')) return ',';
  return ',';
}

function parseCSVFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const delim = detectDelimiter(lines[0]);
  const rawHeaders = lines[0].split(delim).map(h => h.replace(/^\s+|\s+$/g, '').replace(/^"|"$/g, ''));
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delim);
    if (parts.length !== headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = parts[j].trim().replace(/^"|"$/g, '');
    }
    rows.push(obj);
  }
  return rows;
}

function toNum(s) {
  if (s === undefined || s === null || s === '') return 0;
  const cleaned = String(s).replace(/[^0-9\-.,]/g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

(async function main() {
  try {
    const root = path.resolve(__dirname, '..', '..');
    const cleaned = path.join(root, 'cleaned');
    const institFile = path.join(cleaned, 'InstitucionesRegistradas.csv');
    const cartelesFile = path.join(cleaned, 'DetalleCarteles.csv');
    const contratosFile = path.join(cleaned, 'Contratos.csv');
    const lineasFile = path.join(cleaned, 'LineasContratadas.csv');

    const instit = parseCSVFile(institFile);
    const carteles = parseCSVFile(cartelesFile);
    const contratos = parseCSVFile(contratosFile);
    const lineas = parseCSVFile(lineasFile);

    const codigo = '4000042147';

    const instRow = instit.find(r => (r.cedula || r.cedula_institucion || r.codigo_institucion) === codigo || (r.cedula || r.cedula_institucion || r.codigo_institucion) === String(Number(codigo)));
    console.log('Institución encontrada (raw):', instRow ? (instRow.nombre_institucion || instRow.nombre || instRow.nombreinstitucion) : null);

    // Normalize keys
    const cartelesNorm = carteles.map(c => ({
      numero: String(c.nro_sicop || c.nro_sicop || c.numero_sicop || c.nro_sicopero || c.nro_sicop || '').trim(),
      cedula: String(c.cedula_institucion || c.cedula || c.codigo_institucion || '').trim()
    }));

    const cartelesDeInst = cartelesNorm.filter(c => c.cedula === codigo).map(c => c.numero).filter(Boolean);
    console.log('Carteles encontrados para institucion:', cartelesDeInst.length);

    // contratos: try fields nro_sicop, cedula_institucion, id_contrato, nro_contrato
    const contratosNorm = contratos.map(c => ({
      id: String(c.id_contrato || c.nro_contrato || c.nro_contrato || c.id || '').trim(),
      cedula: String(c.cedula_institucion || c.codigo_institucion || c.cedula || '').trim(),
      numeroCartel: String(c.nro_sicop || c.nro_sicop || c.numero_sicop || '').trim()
    }));

    const contratosByInst = contratosNorm.filter(c => c.cedula === codigo);
    const contratosByCartel = contratosNorm.filter(c => cartelesDeInst.includes(c.numeroCartel));
    const contratosUnionMap = new Map();
    contratosByInst.concat(contratosByCartel).forEach(c => {
      const key = c.id || `${c.numeroCartel}_${c.id}`;
      contratosUnionMap.set(key, c);
    });
    const contratosFinal = Array.from(contratosUnionMap.values());
    console.log('Contratos vinculados a la institución (union):', contratosFinal.length);

    // lineas: fields nro_sicop, cantidad_contratada, precio_unitario, nro_contrato
    const lineasNorm = lineas.map(l => ({
      numeroCartel: String(l.nro_sicop || l.nro_sicop || '').trim(),
      contratoId: String(l.nro_contrato || l.id_contrato || l.nro_contrato || '').trim(),
      cantidad: toNum(l.cantidad_contratada || l.cantidad || l.cantidadadjudicada || l.cantidad_contratada),
      precioUnitario: toNum(l.precio_unitario || l.precio || l.precio_unitario)
    }));

    const contratosIds = new Set(contratosFinal.map(c => c.id).filter(Boolean));
    const matchedLineas = lineasNorm.filter(l => cartelesDeInst.includes(l.numeroCartel) || contratosIds.has(l.contratoId));
    let montoTotal = 0;
    matchedLineas.forEach(l => { montoTotal += (l.cantidad || 0) * (l.precioUnitario || 0); });

    console.log('Lineas coincidentes:', matchedLineas.length);
    console.log('Monto total (suma cantidad*precio):', montoTotal.toFixed(2));

    // Output a small dashboard-like object
    const output = {
      codigoInstitucion: codigo,
      nombre: instRow ? (instRow.nombre_institucion || instRow.nombre || instRow.nombreinstitucion) : null,
      carteles_count: cartelesDeInst.length,
      contratos_count: contratosFinal.length,
      lineas_count: matchedLineas.length,
      monto_total_contratado: montoTotal
    };

    console.log('\nResultado final:\n', JSON.stringify(output, null, 2));

  } catch (err) {
    console.error('Error en script raw:', err);
  }
})();
