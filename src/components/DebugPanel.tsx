import React, { useMemo } from 'react';
import { useSicop } from '../context/SicopContext';
import { dataManager } from '../data/DataManager';

export const DebugPanel: React.FC = () => {
  const showDebug = String(process.env.REACT_APP_SHOW_DEBUG ?? '').toLowerCase() === 'true';
  const { 
    estadisticasGenerales, 
    instituciones, 
    keywordsComunes,
    error,
    isLoaded
  } = useSicop();

  const provDebug = useMemo(() => {
    if (!showDebug || !isLoaded) return null as any;
    const dm: any = dataManager as any;
    const get = (t: string) => (dm.obtenerDatos?.(t) || []) as any[];
    const diag = dm.getDiagnostics?.() || {};
    const carteles = get('DetalleCarteles');
    const contratos = get('Contratos');
    const la = get('LineasAdjudicadas');
    const provs = get('Proveedores');
    const nroSet = new Set(carteles.map((c: any) => c.numeroCartel));
    const normId = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
    const toNum = (v: any) => (typeof v === 'number' && isFinite(v)) ? v : (v != null ? (dm.parseNumeroFlexible?.(String(v)) ?? 0) : 0);
    const firstNumber = (obj: any, keys: string[]): number | null => {
      for (const k of keys) {
        if (obj && obj[k] != null) {
          const n = toNum(obj[k]);
          if (n != null && isFinite(n) && n !== 0) return n;
        }
      }
      return null;
    };
    const calcMontoLineaAdj = (o: any): number => {
      if (!o) return 0;
      const directo = firstNumber(o, ['montoLineaAdjudicada','monto_linea_adjudicada']);
      if (directo != null && directo > 0) return directo;
      const precio = firstNumber(o, ['precioUnitarioAdjudicado','precio_unitario_adjudicado','precioAdjudicado','precio_adjudicado','precioUnitario','precio_unitario','precio']) || 0;
      const cant = firstNumber(o, ['cantidadAdjudicada','cantidad_adjudicada','cantidadContratada','cantidad_contratada','cantidad']) || 0;
      let subtotal = (precio || 0) * (cant || 0);
      const descuento = toNum(o?.descuento);
      const iva = toNum(o?.iva);
      const otros = toNum(o?.otros_impuestos);
      const acarreos = toNum(o?.acarreos);
      subtotal = subtotal - descuento + iva + otros + acarreos;
      const moneda = (o?.tipoMoneda || o?.tipo_moneda || '').toString().toUpperCase();
      if (moneda === 'USD') {
        const tc = toNum(o?.tipo_cambio_crc);
        if (tc > 0) subtotal *= tc;
      }
      return (subtotal > 0 && isFinite(subtotal)) ? subtotal : 0;
    };
    const laIn = la.filter((x: any) => nroSet.has(x.numeroCartel));
    const provInLA = new Set(laIn.map((x: any) => normId(x.idProveedorAdjudicado || x.idProveedor)).filter(Boolean));
    const agg = new Map<string, number>();
    laIn.forEach((x: any) => {
      const id = normId(x.idProveedorAdjudicado || x.idProveedor);
      if (!id) return;
      const v = calcMontoLineaAdj(x);
      agg.set(id, (agg.get(id) || 0) + v);
    });
    const posIds = Array.from(agg.entries()).filter(([, v]) => (v || 0) > 0).map(([k]) => k);
    const topFromDM = dm.getComplementaryDashboard?.({})?.top_proveedores || [];

    // --- Resolver Debug for provider names ---
    const onlyDigits = (s: any) => String(s ?? '').replace(/\D+/g, '');
    const stripLeadingZeros = (s: string) => s.replace(/^0+/, '');
    const provsAll: any[] = provs;
    const provByExact = new Map<string, any>(provsAll.map(p => [String(p.idProveedor ?? '').trim(), p]));
    const provByDigits = new Map<string, any>(provsAll.map(p => [onlyDigits(p.idProveedor), p]));
    const provByDigitsNoZeros = new Map<string, any>(provsAll.map(p => [stripLeadingZeros(onlyDigits(p.idProveedor)), p]));
    const nameOf = (p: any) => (p?.nombreProveedor || p?.razonSocial || p?.nombre || '').toString().trim();
    const findNameVariants = (id: string) => {
      const exact = provByExact.get(String(id).trim());
      const digits = provByDigits.get(onlyDigits(id));
      const nozeros = provByDigitsNoZeros.get(stripLeadingZeros(onlyDigits(id)));
      return {
        exact: exact ? { id: exact.idProveedor, nombre: nameOf(exact) } : null,
        digits: digits ? { id: digits.idProveedor, nombre: nameOf(digits) } : null,
        nozeros: nozeros ? { id: nozeros.idProveedor, nombre: nameOf(nozeros) } : null
      };
    };
    const topResolver = (topFromDM || []).slice(0, 10).map((pv: any) => {
      const r = findNameVariants(pv.id);
      return {
        id: pv.id,
        dmNombre: pv.nombre,
        exact: r.exact,
        digits: r.digits,
        nozeros: r.nozeros
      };
    });
    const resolverStats = topResolver.reduce((acc: any, r: any) => {
      if (r.exact && r.exact.nombre) acc.exact += 1;
      if (r.digits && r.digits.nombre) acc.digits += 1;
      if (r.nozeros && r.nozeros.nombre) acc.nozeros += 1;
      return acc;
    }, { exact: 0, digits: 0, nozeros: 0 });

    // sample of first 3 adjudicated lines with key fields
    const laSample = laIn.slice(0, 3).map((x: any) => ({
      nro: x.numeroCartel,
      idProv: normId(x.idProveedorAdjudicado || x.idProveedor),
      montoLineaAdjudicada: x.montoLineaAdjudicada,
      precioUnitarioAdjudicado: x.precioUnitarioAdjudicado,
      cantidadAdjudicada: x.cantidadAdjudicada,
      tipoMoneda: x.tipoMoneda || x.tipo_moneda,
      tipo_cambio_crc: x.tipo_cambio_crc,
      computedCRC: calcMontoLineaAdj(x)
    }));
  const headerStats = diag?.headerStats?.LineasAdjudicadas || {};
  const headerStatsProvs = diag?.headerStats?.Proveedores || {};

    return {
      rowCounts: diag?.rowCounts || {},
      topFromDM,
      provCount: provs.length,
      cartelesCount: carteles.length,
      contratosCount: contratos.length,
      laCount: la.length,
      laWithinCarteles: laIn.length,
      uniqueProvInLA: provInLA.size,
      provWithPositiveMonto: posIds.length,
      sampleLA: laSample,
      headerStatsLA: {
        rawHeaders: (headerStats.rawHeaders || []).slice(0, 12),
        explicitMapped: (headerStats.explicitMapped || []).slice(0, 12),
        autoNormalized: (headerStats.autoNormalized || []).slice(0, 12)
      },
      sampleProvs: provs.slice(0, 3).map((p: any) => ({ id: normId(p.idProveedor), nombre: p.nombreProveedor })),
      headerStatsProveedores: {
        rawHeaders: (headerStatsProvs.rawHeaders || []).slice(0, 12),
        explicitMapped: (headerStatsProvs.explicitMapped || []).slice(0, 12),
        autoNormalized: (headerStatsProvs.autoNormalized || []).slice(0, 12)
      },
      topResolver,
      resolverStats
    };
  }, [isLoaded, showDebug]);

  if (!showDebug) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '300px',
      background: 'white',
      border: '2px solid #ff0000',
      borderRadius: '8px',
      padding: '16px',
      maxHeight: '85vh',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 1000,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h3>DEBUG PANEL</h3>
      <div><strong>isLoaded:</strong> {isLoaded ? 'YES' : 'NO'}</div>
      <div><strong>error:</strong> {error || 'none'}</div>
      <div><strong>instituciones:</strong> {instituciones?.length || 0}</div>
      <div><strong>keywords:</strong> {keywordsComunes?.length || 0}</div>

      {isLoaded && provDebug && (
        <div style={{ marginTop: '10px' }}>
          <strong>Proveedor Debug:</strong>
          <div>Proveedores: {provDebug.provCount.toLocaleString()} • Carteles: {provDebug.cartelesCount.toLocaleString()} • Contratos: {provDebug.contratosCount.toLocaleString()} • L.Adjudicadas: {provDebug.laCount.toLocaleString()}</div>
          <div>LA dentro de carteles: {provDebug.laWithinCarteles.toLocaleString()} • Proveedores en LA: {provDebug.uniqueProvInLA.toLocaleString()} • Con monto&gt;0: {provDebug.provWithPositiveMonto.toLocaleString()}</div>
          <div>Top proveedores (DataManager): {provDebug.topFromDM.length}</div>
          {provDebug.topFromDM.length > 0 && (
            <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
              {JSON.stringify(provDebug.topFromDM.slice(0, 5), null, 2)}
            </pre>
          )}

          <div style={{ marginTop: 6 }}><strong>Resolver Proveedor (Top 10):</strong></div>
          <div>Matches → exact: {provDebug.resolverStats.exact} • digits: {provDebug.resolverStats.digits} • nozeros: {provDebug.resolverStats.nozeros}</div>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(provDebug.topResolver, null, 2)}
          </pre>

          <div style={{ marginTop: 6 }}><strong>Headers LA (muestra):</strong></div>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(provDebug.headerStatsLA, null, 2)}
          </pre>

          <div style={{ marginTop: 6 }}><strong>Headers Proveedores (muestra):</strong></div>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(provDebug.headerStatsProveedores, null, 2)}
          </pre>

          <div style={{ marginTop: 6 }}><strong>L.Adjudicadas (cálculo por línea):</strong></div>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(provDebug.sampleLA, null, 2)}
          </pre>

          <div style={{ marginTop: 6 }}><strong>Proveedores (muestra):</strong></div>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(provDebug.sampleProvs, null, 2)}
          </pre>
        </div>
      )}
      
      {instituciones && instituciones.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Primera institución:</strong>
          <pre style={{ fontSize: '10px', background: '#f0f0f0', padding: '4px' }}>
            {JSON.stringify(instituciones[0], null, 2)}
          </pre>
        </div>
      )}
      
      {keywordsComunes && keywordsComunes.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Primeras keywords:</strong>
          <div>{keywordsComunes.slice(0, 5).join(', ')}</div>
        </div>
      )}
    </div>
  );
};
