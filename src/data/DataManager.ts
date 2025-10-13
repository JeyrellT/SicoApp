// ================================
// DATA MANAGER CENTRAL SICOP
// ================================
// Gestor principal para cargar, indexar y consultar datos de licitaciones
// Implementa el modelo relacional normalizado con joins eficientes
import Papa from 'papaparse';
import _ from 'lodash';
import {
  FiltroBusqueda,
  ResultadoBusqueda,
  AnalisisCompetencia,
  HistorialPrecio,
  DetalleCartel,
  DetalleLineaCartel,
  Proveedor,
  Contrato,
  EstadisticaBusqueda
} from '../types/entities';
import {
  ReporteEjecutivo,
  ResumenGeneral,
  TendenciasMercado,
  AnalisisCompetenciaDetallado,
  RankingProveedor,
  Oportunidad,
  ReporteEjecutivoParametros
} from '../types/reports';
import { INDICES_TABLAS, MAPEO_ARCHIVOS, MAPEO_HEADERS_POR_TABLA } from './relations';

export class SicopDataManager {
  // ================================
  // ALMACENAMIENTO DE DATOS
  // ================================
  private datos: Map<string, any[]> = new Map();
  private indices: Map<string, Map<string, any[]>> = new Map();
  private isLoaded = false;
  private loadingProgress = 0;
  private loadingStage = '';
  private invertedCartel: Map<string, Set<string>> = new Map();
  private ttaCache: { distribution: any[]; stats: { n: number; mediana: number; p90: number }; meta: any } | null = null;
  private diagnostics: { rowCounts: Record<string, number>; headerStats: Record<string, any> } = { rowCounts: {}, headerStats: {} };
  private loggingMode: 'concise' | 'verbose' = 'concise';
  private integridadResumen: { totalOrfanas: number; detalles: Array<{ tabla: string; campo: string; orfanas: number }> } | null = null;
  
  // Cache para reglas de sectores combinadas (sistema + manuales)
  private combinedSectorRulesCache: Record<string, RegExp[]> | null = null;
  private combinedSectorRulesCacheKey: string = ''; // Hash de la configuración usada para el cache
  private readonly cacheMetadataFields = new Set<string>(['_YEAR', '_MONTH', '_FILE_SOURCE', '_UPLOAD_DATE']);

  // Cache de montos calculados para optimizar reportes
  private montoCache: Map<string, { monto: number; fuente: string; confianza: number }> = new Map();
  private montoPorContratoCache: Map<string, number> | null = null;

  // ================================
  // SISTEMA DE CACHÉ OPTIMIZADO
  // ================================
  // Caché persistente para clasificación de sectores
  private sectorPorCartelCache: Map<string, string> | null = null;
  private sectorCacheTimestamp: number = 0;
  
  // Caché de subcategorías por sector
  private subcategoryRulesCache: Map<string, Record<string, RegExp[]>> = new Map();
  
  // Caché de cálculos de montos
  private montosPorCartelCache: Map<string, number> | null = null;
  private montosCacheTimestamp: number = 0;
  
  // Caché de dashboards por hash de filtros
  private dashboardCache: Map<string, {
    data: any;
    timestamp: number;
    filters: string;
  }> = new Map();
  
  // Caché de instituciones dashboard
  private institucionDashboardCache: Map<string, {
    data: any;
    timestamp: number;
    params: string;
  }> = new Map();
  
  // ================================
  // LÍMITES PARA ARCHIVOS GRANDES
  // ================================
  private readonly MAX_FILE_SIZE_MB = 100; // NUEVO: Tamaño máximo absoluto (MB) - NO cargar si excede
  private readonly MAX_ROWS_PER_FILE = 10000; // Solo cargar 10K filas para archivos muy grandes
  private readonly LARGE_FILE_THRESHOLD_MB = 50; // Archivos > 50MB se consideran grandes
  private readonly CHUNK_SIZE_LARGE_FILES = 10000; // Procesar en chunks de 10K para archivos grandes
  
  // ================================
  // ARCHIVOS OPCIONALES (no críticos)
  // ================================
  // ⚠️ SINCRONIZADO CON FileUploader.tsx - ARCHIVOS_OPCIONALES
  private readonly ARCHIVOS_OPCIONALES = new Set([
    'InvitacionProcedimiento', // Solo enriquece nombres (0.95% de valor agregado)
    'Garantias',               // Datos complementarios
    'RecursosObjecion',        // Datos complementarios
    'SancionProveedores',      // Datos complementarios
    'Remates'                  // Datos complementarios
  ]);
  
  // Configuración de TTL (time-to-live) en milisegundos
  private readonly CACHE_TTL = {
    sectores: 30 * 60 * 1000,      // 30 minutos (casi estático)
    montos: 15 * 60 * 1000,        // 15 minutos (semi-estático)
    dashboard: 5 * 60 * 1000,      // 5 minutos (dinámico)
    institucion: 5 * 60 * 1000     // 5 minutos (dinámico)
  };
  
  // Estadísticas de caché para debugging
  private cacheStats = {
    sectores: { hits: 0, misses: 0 },
    montos: { hits: 0, misses: 0 },
    dashboard: { hits: 0, misses: 0 },
    institucion: { hits: 0, misses: 0 }
  };

  public setLoggingMode(mode: 'concise' | 'verbose') { this.loggingMode = mode; }
  
  // ================================
  // MÉTODOS DE GESTIÓN DE CACHÉ
  // ================================
  
  /**
   * Genera un hash simple para un objeto de filtros
   */
  private getCacheKey(prefix: string, filtros?: any): string {
    if (!filtros) return `${prefix}:no-filters`;
    
    const normalized = {
      inst: Array.isArray(filtros.institucion) ? [...filtros.institucion].sort() : filtros.institucion,
      sect: Array.isArray(filtros.sector) ? [...filtros.sector].sort() : filtros.sector,
      keys: Array.isArray(filtros.keywords) ? [...filtros.keywords].sort() : filtros.keywords,
      proc: Array.isArray(filtros.procedimientos) ? [...filtros.procedimientos].sort() : filtros.procedimientos,
      cat: Array.isArray(filtros.categorias) ? [...filtros.categorias].sort() : filtros.categorias,
      est: Array.isArray(filtros.estados) ? [...filtros.estados].sort() : filtros.estados,
      desde: filtros.fechaDesde?.toISOString?.() || filtros.fechaDesde,
      hasta: filtros.fechaHasta?.toISOString?.() || filtros.fechaHasta
    };
    
    return `${prefix}:${JSON.stringify(normalized)}`;
  }
  
  /**
   * Verifica si un caché es válido según su TTL
   */
  private isCacheValid(cacheType: 'sectores' | 'montos' | 'dashboard' | 'institucion', timestamp: number): boolean {
    const ttl = this.CACHE_TTL[cacheType];
    return (Date.now() - timestamp) < ttl;
  }
  
  /**
   * Invalida todos los cachés (útil cuando se cargan nuevos datos)
   */
  public invalidarTodosLosCaches(): void {
    console.log('🧹 Invalidando todos los cachés...');
    
    this.sectorPorCartelCache = null;
    this.sectorCacheTimestamp = 0;
    this.subcategoryRulesCache.clear();
    
    this.montosPorCartelCache = null;
    this.montosCacheTimestamp = 0;
    
    this.dashboardCache.clear();
    this.institucionDashboardCache.clear();
    
    this.ttaCache = null;
    this.combinedSectorRulesCache = null;
    
    console.log('✅ Cachés invalidados');
  }
  
  /**
   * Invalida solo el caché de sectores (cuando cambian categorías manuales)
   */
  public invalidarCacheSectores(): void {
    console.log('🧹 Invalidando caché de sectores...');
    this.sectorPorCartelCache = null;
    this.sectorCacheTimestamp = 0;
    this.subcategoryRulesCache.clear();
    this.combinedSectorRulesCache = null;
    this.combinedSectorRulesCacheKey = '';
    // También invalidar dashboards que dependen de sectores
    this.dashboardCache.clear();
    this.institucionDashboardCache.clear();
    console.log('✅ Caché de sectores invalidado');
  }
  
  /**
   * Muestra estadísticas de uso de caché
   */
  public mostrarEstadisticasCache(): void {
    console.group('📊 Estadísticas de Caché');
    
    Object.entries(this.cacheStats).forEach(([tipo, stats]) => {
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0';
      console.log(`${tipo}: ${stats.hits} hits, ${stats.misses} misses (${hitRate}% hit rate)`);
    });
    
    console.log('\nTamaño de cachés:');
    console.log(`- Sectores: ${this.sectorPorCartelCache?.size || 0} carteles`);
    console.log(`- Montos: ${this.montosPorCartelCache?.size || 0} carteles`);
    console.log(`- Dashboards: ${this.dashboardCache.size} configuraciones`);
    console.log(`- Instituciones: ${this.institucionDashboardCache.size} configuraciones`);
    
    console.groupEnd();
  }

  // ================================
  // CÁLCULO TTA GLOBAL / FILTRADO
  // ================================
  private computeTTA(hasFilters: boolean, nroSet: Set<string> | null) {
    // Cache sólo para caso sin filtros
    if (!hasFilters && this.ttaCache) return this.ttaCache;
    const DEBUG_TTA = true; // forzamos debug temporalmente
    const log = (...args: any[]) => { if (DEBUG_TTA) console.log('[TTA]', ...args); };
    log('--- INICIO computeTTA ---');
    const normNro = (v: any) => String(v ?? '').trim().replace(/\s+/g, '').replace(/[^0-9A-Za-z-]/g, '');
    const generarVariantes = (raw: string): string[] => {
      const s = normNro(raw);
      if (!s) return [];
      const vars = new Set<string>();
      vars.add(s);
      vars.add(s.replace(/-/g, ''));
      vars.add(s.replace(/\b0+(\d+)/g, '$1'));
      const digits = s.replace(/\D+/g, '');
      if (digits.length >= 4) vars.add(digits);
      return Array.from(vars).filter(Boolean);
    };
    // Normalizar fuentes
    const allFechas: any[] = (this.datos.get('FechaPorEtapas') || []).map((r: any) => {
      if (!r.numeroCartel && (r.nro_sicop || r.NRO_SICOP)) r.numeroCartel = r.nro_sicop || r.NRO_SICOP;
      if (!r.fechaAperturaOfertas && (r.fecha_apertura || r.FECHA_APERTURA)) r.fechaAperturaOfertas = r.fecha_apertura || r.FECHA_APERTURA;
      if (!r.fechaPublicacion && (r.publicacion || r.PUBLICACION)) r.fechaPublicacion = r.publicacion || r.PUBLICACION;
      return r;
    });
    const allAdj: any[] = (this.datos.get('AdjudicacionesFirme') || []).map((r: any) => {
      if (!r.numeroCartel && (r.nro_sicop || r.NRO_SICOP)) r.numeroCartel = r.nro_sicop || r.NRO_SICOP;
      if (!r.fechaAdjudicacionFirme && (r.fecha_adj_firme || r.FECHA_ADJ_FIRME || r.adjudicacion_firme || r.ADJUDICACION_FIRME)) {
        r.fechaAdjudicacionFirme = r.fecha_adj_firme || r.FECHA_ADJ_FIRME || r.adjudicacion_firme || r.ADJUDICACION_FIRME;
      }
      return r;
    });
    log('Registros totales -> FechaPorEtapas:', allFechas.length, 'AdjudicacionesFirme:', allAdj.length);
    const fechas: any[] = hasFilters && nroSet ? allFechas.filter(f => f.numeroCartel && nroSet.has(normNro(f.numeroCartel))) : allFechas;
    const adj: any[] = hasFilters && nroSet ? allAdj.filter(a => a.numeroCartel && nroSet.has(normNro(a.numeroCartel))) : allAdj;
    log('Aplicando filtros?', hasFilters, 'Fechas usadas:', fechas.length, 'Adj usadas:', adj.length);
    // Construir índice multi-variantes
    const mapFecha = new Map<string, any>();
    const prefixMap = new Map<string, any>(); // fallback a prefijo de 11 dígitos
    fechas.forEach(f => {
      if (!f.numeroCartel) return;
      for (const v of generarVariantes(f.numeroCartel)) {
        if (!mapFecha.has(v)) mapFecha.set(v, f);
        const digits = v.replace(/\D+/g,'');
        if (digits.length >= 11) {
          const pref11 = digits.slice(0,11);
            if (!prefixMap.has(pref11)) prefixMap.set(pref11, f);
        }
      }
    });
    log('MapFecha size:', mapFecha.size, 'PrefixMap size:', prefixMap.size);
    // Parser robusto
    const parseFecha = (raw: any): Date | null => {
      if (!raw) return null; const s = String(raw).trim(); if (!s) return null;
  const mDMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
      if (mDMY) { const d = +mDMY[1], m = +mDMY[2], y = +mDMY[3]; if (d>=1&&d<=31&&m>=1&&m<=12) return new Date(y,m-1,d); }
  const mYMD = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s);
      if (mYMD) { const y = +mYMD[1], m = +mYMD[2], d = +mYMD[3]; if (d>=1&&d<=31&&m>=1&&m<=12) return new Date(y,m-1,d); }
      const dt = new Date(s); return isNaN(dt.getTime()) ? null : dt;
    };
  const dias: number[] = [];
  let sinMatch=0, sinFechas=0, invalidas=0, fallbackPrefixHits=0, fallbackEtapasHits=0;
  const muestrasValidas:any[]=[], muestrasSinMatch:any[]=[], muestrasSinFechas:any[]=[], muestrasInvalidas:any[]=[], muestrasFallback:any[]=[], muestrasFallbackEtapas:any[]=[];
    // Consolidar adjudicaciones por cartel (usar la primera fecha firme encontrada más temprana)
    const adjudPorCartel = new Map<string, string>();
    adj.forEach(a => {
      if (!a.numeroCartel) return;
      const vars = generarVariantes(a.numeroCartel);
      let keyMatch:string|undefined;
      let f:any=null;
      for (const v of vars){ if(mapFecha.has(v)){ f = mapFecha.get(v); keyMatch=v; break; } }
      if (!f) {
        // Fallback prefijo 11 dígitos
        for (const v of vars) {
          const digits = v.replace(/\D+/g,'');
          if (digits.length >= 11) {
            const pref11 = digits.slice(0,11);
            if (prefixMap.has(pref11)) { f = prefixMap.get(pref11); keyMatch = pref11; fallbackPrefixHits++; if(muestrasFallback.length<5) muestrasFallback.push({original:a.numeroCartel,pref11}); break; }
          }
        }
      }
      if (!f){ if(muestrasSinMatch.length<5)muestrasSinMatch.push(a.numeroCartel); sinMatch++; return; }
      const finRaw = a.fechaAdjudicacionFirme;
      if (!finRaw){ if(muestrasSinFechas.length<5)muestrasSinFechas.push({cartel:a.numeroCartel, finRaw}); sinFechas++; return; }
      // Guardar adjudicación más temprana por keyMatch
      if (keyMatch) {
        const prev = adjudPorCartel.get(keyMatch);
        if (!prev || (finRaw < prev)) adjudPorCartel.set(keyMatch, finRaw);
      }
    });
    // Fallback: si no encontramos adjudicación en archivo AdjudicacionesFirme, usar fechaAdjudicacion (adjudicacion_firme) directamente de FechaPorEtapas
    // Esto permite al menos calcular TTA cuando el archivo de adjudicaciones no tenga cobertura completa.
    for (const [k, f] of mapFecha.entries()) {
      if (!adjudPorCartel.has(k) && f && f.fechaAdjudicacion) {
        adjudPorCartel.set(k, f.fechaAdjudicacion);
        fallbackEtapasHits++;
        if (muestrasFallbackEtapas.length < 5) muestrasFallbackEtapas.push({ cartel: f.numeroCartel || k, finRaw: f.fechaAdjudicacion });
      }
    }

    // Calcular días por cartel consolidado (ya con posibles fallbacks)
    for (const [k, finRaw] of adjudPorCartel.entries()) {
      const f = mapFecha.get(k) || prefixMap.get(k);
      if (!f) continue; // seguridad
      const inicioRaw = f.fechaAperturaOfertas || f.fechaPublicacion;
      if (!inicioRaw) { sinFechas++; continue; }
      const inicio = parseFecha(inicioRaw); const fin = parseFecha(finRaw);
      if(!inicio||!fin){ invalidas++; if(muestrasInvalidas.length<5)muestrasInvalidas.push({cartel:k,inicioRaw,finRaw}); continue; }
      const d = Math.round((fin.getTime()-inicio.getTime())/86400000);
      if(isFinite(d) && d>=0 && d<=540){
        dias.push(d);
        if(muestrasValidas.length<5)muestrasValidas.push({cartel:k,d,inicioRaw,finRaw});
      } else {
        invalidas++;
        if(muestrasInvalidas.length<5)muestrasInvalidas.push({cartel:k,d,inicioRaw,finRaw});
      }
    }
  log('Resumen coincidencias -> diasValidos:', dias.length, 'sinMatch:', sinMatch, 'sinFechas:', sinFechas, 'invalidas:', invalidas, 'fallbackPrefixHits:', fallbackPrefixHits, 'fallbackEtapasHits:', fallbackEtapasHits, 'cartelesConAdjudicacion:', adjudPorCartel.size);
  if (!dias.length){
    log('MuestrasSinMatch:', muestrasSinMatch);
    log('MuestrasSinFechas:', muestrasSinFechas);
    log('MuestrasInvalidas:', muestrasInvalidas);
    log('MuestrasFallback:', muestrasFallback);
    log('MuestrasFallbackEtapas:', muestrasFallbackEtapas);
  } else {
    log('MuestrasValidas:', muestrasValidas);
    log('MuestrasFallback:', muestrasFallback);
    log('MuestrasFallbackEtapas:', muestrasFallbackEtapas);
  }
    const sorted = _.sortBy(dias);
    const pct = (p:number)=>{ if(!sorted.length) return 0; const idx=Math.min(sorted.length-1, Math.floor(p*(sorted.length-1))); return sorted[idx]; };
    const distMap = new Map<string,number>();
    sorted.forEach(d=>{ let k='>90'; if(d<=15)k='0-15'; else if(d<=30)k='16-30'; else if(d<=60)k='31-60'; else if(d<=90)k='61-90'; distMap.set(k,(distMap.get(k)||0)+1); });
    const order=['0-15','16-30','31-60','61-90','>90'];
    const distribution = order.map(k=>({rango:k, carteles:distMap.get(k)||0}));
    log('Distribución final:', distribution);
    const stats = { n: sorted.length, mediana: pct(0.5), p90: pct(0.9) };
    log('Stats:', stats);
  const meta = { sinMatch, sinFechas, invalidas, fallbackPrefixHits, fallbackEtapasHits, muestrasSinMatch, muestrasSinFechas, muestrasInvalidas, muestrasValidas, muestrasFallback, muestrasFallbackEtapas, cartelesConAdjudicacion: adjudPorCartel.size };
    if(!hasFilters) this.ttaCache = { distribution, stats, meta };
    return { distribution, stats, meta };
  }

  // Reglas para clasificar sectores a partir de descripciones de líneas
  // Actualizado con 12 categorías y patrones provistos por análisis de patrones
  private readonly SECTOR_RULES: Record<string, RegExp[]> = {
    // 1. Mantenimiento, reparación y limpieza
    'Mantenimiento, reparación y limpieza': [
      /manten(i|í)miento|preventivo|correctivo/iu,
      /limpieza|aseo|lavado|barrido|poda|desyerbe/iu,
      /reparaci(o|ó)n|ajuste|servicio\s+t(e|é)cnico/iu,
      /calibraci(o|ó)n|ajuste\s+de\s+equipo/iu,
      /fumigaci(o|ó)n|control\s+de\s+plagas/iu,
      /instalaci(o|ó)n\s+el(e|é)ctrica|aire\s+acondicionado/iu,
      /recolecci(o|ó)n|disposici(o|ó)n\s+de\s+residuos|basura/iu,
      /mantenimiento\s+de\s+alarmas|ascensores|planta\s+el(e|é)ctrica/iu,
      /pintura|barniz/iu,
      /jardiner(i|í)a|paisajismo|zonas\s+verdes/iu,
      // Subcategorías sugeridas
      /mantenimiento\s+preventivo/iu,
      /mantenimiento\s+correctivo/iu,
      /limpieza\s+de\s+(edificios|oficinas)/iu,
      /calibraci(o|ó)n/iu,
      /instalaci(o|ó)n\s+(el(e|é)ctrica|de\s+aire)/iu,
      /recolecci(o|ó)n|disposici(o|ó)n\s+de\s+(residuos|basura)/iu,
      /mantenimiento\s+(de\s+alarmas|de\s+ascensores|de\s+planta\s+el(e|é)ctrica)/iu,
      /lavado|pintura|barnizado/iu
    ],

    // 2. Suministros de oficina y papelería
    'Suministros de oficina y papelería': [
      /papeler(i|í)a|resmas|hojas|cartulina/iu,
      /cuaderno|libreta|folder|carpeta|archivador/iu,
      /l(a|á)piz|lapicero|esfero|bol(i|í)grafo|plum(o|ó)n/iu,
      /cartucho|t(o|ó)ner|tinta/iu,
      /impresora|scanner|fotocopiadora|multifuncional/iu,
      /agendas?|planificador|calendario/iu,
      /marcador|resaltador|corrector|grapas|perforadora|sello/iu,
      /papelera|bandeja\s+de\s+documentos/iu,
      /servicio\s+de\s+impresi(o|ó)n|fotocopiado|encuadernaci(o|ó)n/iu,
      /material\s+bibliogr(a|á)fico|libros|revistas/iu,
      /tiquete|formulario|etiqueta|sticker/iu,
      /mobiliario\s+de\s+oficina|escritorios?|sillas?/iu,
      // Subcategorías sugeridas
      /resmas?|papel\s+bond|cuadernos?/iu,
      /cartucho|t(o|ó)ner/iu,
      /archivador|escritorio|silla|mueble/iu,
      /impresora|fotocopiadora|scanner|multifuncional/iu,
      /folder|carpeta|archivador|portafolio/iu,
      /libros?|material\s+bibliogr(a|á)fico|revistas?|manual/iu,
      /agenda|diario|calendario/iu,
      /sello|timbre/iu,
      /anillado|espiral|encuadernaci(o|ó)n|plastificado/iu,
      /gran\s+formato|ploteo|banner|afiche/iu,
      /etiquetas?|sticker|adhesivo/iu,
      /bol(i|í)grafo\s+promocional|llavero|souvenir/iu
    ],

    // 3. Tecnología y sistemas
    'Tecnología y sistemas': [
      /software|licencia|sistema|aplicaci(o|ó)n/iu,
      /inform(a|á)tica|tecnolog(i|í)a|tic/iu,
      /computador|computadora|laptop|port(a|á)til|pc/iu,
      /servidor|storage|almacenamiento/iu,
      /red|router|switch|access\s+point|cableado|fibra\s+o(pti|í)ca/iu,
      /soporte|mantenimiento\s+inform(a|á)tico/iu,
      /hosting|dominio|cloud|nube/iu,
      /base\s+de\s+datos|sql|postgres|oracle/iu,
      /antivirus|firewall|seguridad\s+inform(a|á)tica/iu,
      /perif(e|é)ricos?|teclado|mouse|monitor|impresora\s+3d/iu,
      /sonido|audio|microfon(o|ó)|altavoz|parlante/iu,
      /videoconferencia|proyector|pantalla\s+interactiva|smartboard/iu,
      /gis|arcgis|arcfm|sistema\s+geoespacial/iu,
      // Subcategorías sugeridas
      /licencia|suscripci(o|ó)n|licenciamiento/iu,
      /desarrollo\s+de\s+sistemas?|actualizaci(o|ó)n\s+de\s+software/iu,
      /soporte\s+t(e|é)cnico|mantenimiento\s+inform(a|á)tico/iu,
      /computador|laptop|port(a|á)til|pc/iu,
      /servidor|storage|nas|san/iu,
      /router|switch|access\s+point|fibra|cableado|modem/iu,
      /cloud|nube|hosting|dominio/iu,
      /base\s+de\s+datos|sql|postgres|oracle/iu,
      /antivirus|firewall|encriptaci(o|ó)n|backup/iu,
      /teclado|mouse|monitor|impresora\s+3d|scanner/iu,
      /sonido|audio|microfon(o|ó)|parlante|videoconferencia|proyector/iu,
      /gis|arcgis|arcfm|sistema\s+geoespacial/iu
    ],

    // 4. Vehículos, transporte y repuestos
    'Vehículos, transporte y repuestos': [
      /veh(i|í)culo|autom(o|ó)vil|carro|cam(i|í)oneta|cam(i|í)on|bus|microbus|moto|motocicleta/iu,
      /tractor|excavadora|volquete|maquinaria\s+peso?a|grua/iu,
      /llanta|neum(a|á)tico|neumaticos?/iu,
      /repuesto|repuestos|accesorio\s+automotr(i|í)s?/iu,
      /combustible|diesel|gasolina|lubricante|aceite|filtro/iu,
      /bateria|alternador|radiador|freno|pastilla/iu,
      /flotilla|taller|mec(a|á)nica|garaje/iu,
      /alquiler\s+de\s+veh(i|í)culos?|leasing/iu,
      /seguro\s+vehicular|poliza\s+de\s+veh(i|í)culo/iu,
      /rastreo\s+gps|localizador|monitor\s+de\s+flotas/iu,
      /parabrisas|vidrio|lampara\s+vehicular|retrovisor/iu,
      // Subcategorías sugeridas
      /veh(i|í)culo\s+nuevo|autom(o|ó)vil|cam(i|í)on|bus|microbus/iu,
      /repuesto|accesorio|pieza\s+automotr(i|í)z/iu,
      /llanta|neum(a|á)tico|rin/iu,
      /gasolina|diesel|combustible|aceite|lubricante/iu,
      /mantenimiento\s+de\s+flota|servicio\s+mec(a|á)nico/iu,
      /bateria|filtro\s+de\s+aceite|filtro\s+de\s+aire/iu,
      /alquiler\s+de\s+veh(i|í)culos?|renta\s+de\s+veh(i|í)culos/iu,
      /tractor|excavadora|volquete|retroexcavadora|grua/iu,
      /seguro\s+vehicular|poliza\s+de\s+veh(i|í)culo/iu,
      /gps|rastreo|telemetri(a|á)|monitor\s+de\s+flotas/iu,
      /parabrisas|vidrio|retrovisor|lampara\s+vehicular/iu
    ],

    // 5. Salud, medicina y laboratorio
    'Salud, medicina y laboratorio': [
      /medicina|medicamento|f(a|á)rmaco|farmac(e|é)utico/iu,
      /equipo\s+m(e|é)dico|instrumental\s+medico|insumos?\s+m(e|é)dicos?/iu,
      /hospital|cl(i|í)nica|consultorio|farmacia/iu,
      /quir(u|ú)rgico|cirug(i|í)a|instrumental\s+quir(u|ú)rgico/iu,
      /laboratorio|reactivo|kit\s+de\s+prueba|insumo\s+de\s+laboratorio/iu,
      /odontol(o|ó)gico|dental|insumo\s+odontol(o|ó)gico/iu,
      /veterinari(a|á)|insumo\s+veterinario/iu,
      /vacuna|vacunaci(o|ó)n|inmunizaci(o|ó)n/iu,
      /ambulancia|transporte\s+m(e|é)dico/iu,
      /esterilizaci(o|ó)n|esteril/iu,
      /sueros?|soluciones?|antigeno|ensayo|diagn(o|ó)stico/iu,
      /formula\s+nutricional|suplemento\s+nutricional/iu,
      /gases?\s+medicinal(es)?|nitrogeno\s+liquido/iu,
      // Subcategorías sugeridas
      /medicamento|f(a|á)rmaco|tratamiento|tabletas|capsulas/iu,
      /equipo\s+m(e|é)dico|monitor\s+de\s+signos|desfibrilador/iu,
      /guantes|gasas|jeringas|suturas/iu,
      /reactivo|kit\s+de\s+prueba|reactivos/iu,
      /odontol(o|ó)gico|dental|instrumental\s+dental/iu,
      /veterinari(a|á)|vacuna\s+para\s+animales/iu,
      /vacuna|biol(o|ó)gico|suero\s+antiofidico/iu,
      /ambulancia|soporte\s+vital/iu,
      /bistur(i|í)|pinza|forceps|quir(u|ú)rgico/iu,
      /esteril|autoclave|esterilizaci(o|ó)n/iu,
      /formula\s+nutricional|suplemento\s+alimenticio/iu,
      /ecografo|rayos\s+x|analizador|microscopio/iu
    ],

    // 6. Seguridad y vigilancia
    'Seguridad y vigilancia': [
      /seguridad|vigilancia|protecci(o|ó)n/iu,
      /cctv|cam(a|á)ra|videovigilancia|monitor/iu,
      /alarma|sensor|detector/iu,
      /guardia|vigilante|oficial\s+de\s+seguridad/iu,
      /control\s+de\s+acceso|tarjetas?\s+de\s+proximidad|torniquete/iu,
      /extintor|equipo\s+contra\s+incendios|manguera\s+de\s+incendio/iu,
      /uniforme|chaleco|casco|botas?|zapatos?\s+de\s+seguridad/iu,
      /malla\s+de\s+seguridad|cerca\s+perimetral/iu,
      /detector\s+de\s+metales|scanner\s+de\s+seguridad/iu,
      /antirrobo|sistema\s+de\s+intrusi(o|ó)n|barrera\s+vehicular/iu,
      /poliza|seguro\s+de\s+riesgo|seguro\s+multiriesgo/iu,
      // Subcategorías sugeridas
      /cctv|cam(a|á)ra|videovigilancia/iu,
      /alarma|sensor|detector|antirrobo/iu,
      /guardia|vigilante|polic(i|í)a\s+privada/iu,
      /control\s+de\s+acceso|torniquete|tarjeta\s+de\s+proximidad/iu,
      /extintor|manguera\s+contra\s+incendios|gabinete\s+contra\s+incendio/iu,
      /uniforme|chaleco|casco|botas?|zapatos?\s+de\s+seguridad|guantes?\s+de\s+protecci(o|ó)n/iu,
      /malla\s+de\s+seguridad|cerca\s+perimetral|cerca\s+electrica/iu,
      /poliza|seguro\s+de\s+riesgo|seguro\s+multiriesgo/iu,
      /detector\s+de\s+metales|arco\s+detector/iu,
      /sistema\s+antirrobo|barrera\s+vehicular|barrera\s+antimotines/iu,
      /monitoreo\s+24|central\s+de\s+monitoreo/iu,
      /radios?\s+de\s+comunicaci(o|ó)n|linterna\s+tactica/iu
    ],

    // 7. Construcción y materiales de obra
    'Construcción y materiales de obra': [
      /construcci(o|ó)n|obra|edificaci(o|ó)n|remodelaci(o|ó)n/iu,
      /infraestructura|carretera|puente|viaducto/iu,
      /cemento|concreto|mezcla\s+asf(a|á)ltica|hormig(o|ó)n/iu,
      /acero|hierro|varilla|pernos?|tuercas?|arandelas?/iu,
      /bloque|ladrillo|mamposter(i|í)a/iu,
      /asfalto|sellado|pavimento|lastre/iu,
      /ferreter(i|í)a|torniller(i|í)a|herramienta\s+el(e|é)ctrica/iu,
      /taladro|sierra|pulidora|cortadora/iu,
      /maquinaria\s+peso?a|excavadora|retroexcavadora|andamio/iu,
      /madera|melamina|contrachapado|tapacantos|aserr(i|í)n/iu,
      /senalizaci(o|ó)n|demarcaci(o|ó)n|vial/iu,
      /topograf(i|í)a|geotecnia|levantamiento/iu,
      /estructura\s+met(al|á)lica|prefabricado/iu,
      // Subcategorías sugeridas
      /cemento|concreto|bloque|ladrillo|arena|grava/iu,
      /carretera|puente|pavimento|mezcla\s+asf(a|á)ltica|lastre/iu,
      /perno|tornillo|tuerca|arandela|chapa/iu,
      /taladro|sierra|pulidora|cortadora/iu,
      /excavadora|retroexcavadora|grua|volquete|andamio/iu,
      /madera|melamina|contrachapado|tablero|tapacantos|aserr(i|í)n/iu,
      /se(n|ñ)alizaci(o|ó)n|demarcaci(o|ó)n|trafico|poste\s+vial/iu,
      /topograf(i|í)a|geotecnia|levantamiento|estudio\s+geol(o|ó)gico/iu,
      /estructura\s+met(al|á)lica|prefabricado/iu,
      /remodelaci(o|ó)n|ampliaci(o|ó)n|refacci(o|ó)n/iu,
      /mezcla\s+asf(a|á)ltica|asfalto/iu,
      /demolic(i|ó)n|derribo|retiro\s+de\s+escombros/iu
    ],

    // 8. Alimentos y servicios de catering
    'Alimentos y servicios de catering': [
      /alimento(s)?|comida|comestible/iu,
      /catering|buffet|banquete/iu,
      /cafe|refresco|jugo|bebidas?|agua\s+embotellada/iu,
      /refrigerio|merienda|snack|confites?|galletas?|dulces/iu,
      /pan|pastel|panader(i|í)a|reposter(i|í)a/iu,
      /carne|pollo|cerdo|res|pescado|mariscos/iu,
      /fruta|vegetal|verdura|ensalada/iu,
      /granos?|arroz|frijol|cereal|lacteo/iu,
      /suplemento\s+alimenticio|formula\s+nutricional|modulo\s+nutricional/iu,
      /utensilio\s+de\s+cocina|sarten|olla|bateria\s+de\s+cocina/iu,
      /servicio\s+de\s+comedor|cafeter(i|í)a|alimentaci(o|ó)n\s+institucional/iu,
      // Subcategorías sugeridas
      /carne|pollo|pescado|fruta|verdura|lacteo/iu,
      /arroz|frijol|cereal|enlatado/iu,
      /catering|banquete|buffet|servicio\s+de\s+alimentaci(o|ó)n\s+para\s+eventos/iu,
      /cafeter(i|í)a|comedor\s+institucional/iu,
      /pan|pastel|panader(i|í)a|reposter(i|í)a|galleta/iu,
      /cafe|jugo|refresco|agua\s+embotellada|bebida/iu,
      /refrigerio|merienda|snack|confites|dulces/iu,
      /suplemento\s+alimenticio|formula\s+nutricional|modulo\s+nutricional/iu,
      /sarten|olla|cuchillo|bateria\s+de\s+cocina|utensilio\s+de\s+cocina/iu,
      /agua\s+embotellada/iu,
      /servicio\s+de\s+almuerzo|servicio\s+de\s+cena/iu,
      /diet(a|á)tico|hipoalerg(e|é)nico|gluten/iu
    ],

    // 9. Servicios profesionales y consultoría
    'Servicios profesionales y consultoría': [
      /consultor(i|í)a|asesor(i|í)a|asesor/iu,
      /auditor(i|í)a|auditores?/iu,
      /servicio\s+profesional|servicios\s+profesionales/iu,
      /ingenier(i|í)a|arquitectura|topograf(i|í)a\s+profesional/iu,
      /legal|abogado|notarial|jur(i|í)dico/iu,
      /financiero|contable|fiscal|econ(o|ó)mico/iu,
      /representaci(o|ó)n\s+art(i|í)stica|producci(o|ó)n\s+de\s+eventos/iu,
      /marketing|publicidad|comunicaci(o|ó)n\s+estrat(e|é)gica/iu,
      /capacitaci(o|ó)n|formaci(o|ó)n|taller|curso/iu,
      /traducci(o|ó)n|interpretaci(o|ó)n/iu,
      /estudio\s+socioecon(o|ó)mico|diagn(o|ó)stico\s+sectorial/iu,
      /turismo|recreaci(o|ó)n\s+organizacional/iu,
      /dise(n|ñ)o\s+gr(a|á)fico|paisajismo/iu,
      // Subcategorías sugeridas
      /ingenier(i|í)a|arquitectura/iu,
      /legal|abogado|notarial/iu,
      /financiero|contable|fiscal/iu,
      /auditor(i|í)a|auditoria/iu,
      /marketing|publicidad|comunicaci(o|ó)n\s+estrat(e|é)gica/iu,
      /representaci(o|ó)n\s+art(i|í)stica|producci(o|ó)n\s+de\s+eventos/iu,
      /capacitaci(o|ó)n|formaci(o|ó)n|taller|curso/iu,
      /traducci(o|ó)n|interpretaci(o|ó)n/iu,
      /asesor(i|í)a|peritaje/iu,
      /turismo|recreaci(o|ó)n\s+organizacional/iu,
      /dise(n|ñ)o\s+gr(a|á)fico|paisajismo/iu,
      /plan\s+estrat(e|é)gico|estudio\s+socioecon(o|ó)mico|diagn(o|ó)stico\s+sectorial/iu
    ],

    // 10. Educación, cultura y recreación
    'Educación, cultura y recreación': [
      /libro(s)?|material\s+bibliogr(a|á)fico|revistas?|publicaci(o|ó)n/iu,
      /suscripci(o|ó)n|licencia\s+editorial|biblioteca/iu,
      /instrumento\s+musical|guitarra|piano|violin|timbal|lira|marimba/iu,
      /evento\s+cultural|festival|concierto|teatro|espect(a|á)culo/iu,
      /arte|art(i|í)stico|cultura|museo/iu,
      /curso|capacitaci(o|ó)n|formaci(o|ó)n\s+acad(e|é)mica/iu,
      /material\s+did(a|á)ctico|kit\s+educativo|juego\s+did(a|á)ctico/iu,
      /implemento\s+deportivo|pelota|balon|disco|cono|tolda|tablero\s+retractil/iu,
      /inflable(s)?|juegos?\s+infantiles|cama\s+el(a|á)stica/iu,
      /reconocimiento|medallas?|trofeo|estola\s+de\s+graduaci(o|ó)n/iu,
      /camp(a|á)na\s+educativa|programa\s+de\s+deporte\s+escolar/iu,
      /dotaci(o|ó)n\s+de\s+bibliotecas?|colecci(o|ó)n\s+patrimonial/iu,
      // Subcategorías sugeridas
      /libro|material\s+bibliogr(a|á)fico|manual|revista/iu,
      /suscripci(o|ó)n|licencia\s+editorial/iu,
      /instrumento\s+musical|guitarra|piano|violin|timbal|lira|marimba/iu,
      /material\s+did(a|á)ctico|juego\s+did(a|á)ctico|kit\s+educativo/iu,
      /curso|capacitaci(o|ó)n|formaci(o|ó)n\s+acad(e|é)mica/iu,
      /evento\s+cultural|concierto|teatro|espect(a|á)culo|festival/iu,
      /pelota|bal(o|ó)n|disco|cono|tabla\s+de\s+gimnasio|tablero\s+retractil/iu,
      /inflable|juego\s+infantil|cama\s+el(a|á)stica/iu,
      /medalla|trofeo|reconocimiento|estola\s+de\s+graduaci(o|ó)n/iu,
      /camp(a|á)na\s+educativa|programa\s+de\s+educaci(o|ó)n|camp(a|á)na\s+de\s+lectura/iu,
      /programa\s+de\s+deporte\s+escolar/iu,
      /dotaci(o|ó)n\s+de\s+biblioteca|colecci(o|ó)n\s+patrimonial|museo/iu
    ],

    // 11. Logística y servicios generales
    'Logística y servicios generales': [
      /courier|mensajer(i|í)a|paqueter(i|í)a|env(i|í)o/iu,
      /flete|transporte\s+de\s+carga|camion\s+de\s+reparto/iu,
      /recolecci(o|ó)n|traslado|transferencia\s+de\s+residuos|relleno\s+sanitario|disposici(o|ó)n\s+final/iu,
      /alquiler|arrendamiento|renta\s+de\s+(mobiliario|veh(i|í)culos?|equipos?|inmuebles)/iu,
      /remate|subasta|aduan(a|e)ra|aduanero/iu,
      /almacenamiento|bodega|log(i|í)stica|distribuci(o|ó)n/iu,
      /mudanza|embalaje|paquet(e|é)ria/iu,
      /reserva\s+de\s+viaje|boleto\s+a(e|é)reo|pasaje|hospedaje/iu,
      /matr(i|í)cula|tr(a|á)mite|gesti(o|ó)n\s+administrativa/iu,
      /servicio\s+de\s+correos?|correo\s+postal/iu,
      /distribuci(o|ó)n\s+de\s+material\s+electoral|transporte\s+de\s+documentos/iu,
      /servicio\s+de\s+mudanza|carga\s+de\s+veh(i|í)culos/iu,
      // Subcategorías sugeridas
      /courier|mensajer(i|í)a|paqueter(i|í)a|env(i|í)o/iu,
      /flete|transporte\s+de\s+carga|camion\s+de\s+reparto/iu,
      /recolecci(o|ó)n|traslado|relleno\s+sanitario|disposici(o|ó)n\s+final/iu,
      /alquiler|arrendamiento|renta\s+de\s+(mobiliario|equipos?|inmuebles)/iu,
      /remate|subasta|aduan(a|e)ra/iu,
      /almacenamiento|bodega|log(i|í)stica/iu,
      /mudanza|embalaje|traslado\s+de\s+oficina/iu,
      /reserva\s+de\s+viaje|hospedaje|pasaje|boleto\s+a(e|é)reo/iu,
      /material\s+electoral|transporte\s+de\s+urnas|documentos\s+electorales/iu,
      /matr(i|í)cula|tr(a|á)mite|legalizaci(o|ó)n/iu,
      /correo\s+postal|servicio\s+de\s+correos/iu,
      /carga\s+de\s+veh(i|í)culos|transporte\s+de\s+maquinaria/iu
    ],

    // 12. Herramientas industriales y electrodomésticos
    'Herramientas industriales y electrodomésticos': [
      /herramientas?|martillo|destornillador|alicate|llave\s+inglesa/iu,
      /cuchilla|serrucho|sierra\s+manual|form(o|ó)n/iu,
      /taladro|amoladora|cortadora|pulidora|rotomartillo/iu,
      /compresor|soldadora|torno|fresadora|caladora/iu,
      /bomba|motobomba|hidrolavadora|generador|transformador/iu,
      /perno|tornillo|tuerca|arandela|clavija/iu,
      /cable|cableado|conector|enchufe|tomacorriente|breaker|disyuntor/iu,
      /motor|generador|electrogeno/iu,
      /maquinaria\s+industrial|maquina\s+pesada/iu,
      /electrodom(e|é)stico|lavadora|secadora|horno|microondas|ventilador|licuadora|refrigerador|congelador/iu,
      /escalera|andamio|toldo|carpa/iu,
      /aspiradora|pulidora|cepillo\s+pulidor/iu,
      /pesas?|discos?\s+de\s+gym|equipo\s+de\s+gimnasio/iu,
      // Subcategorías sugeridas
      /martillo|destornillador|alicate|llave\s+inglesa|serrucho/iu,
      /taladro|amoladora|pulidora|rotomartillo|caladora/iu,
      /torno|fresadora|maquinaria\s+industrial|maquina\s+pesada/iu,
      /soldadora|compresor|motobomba|hidrolavadora/iu,
      /perno|tornillo|tuerca|arandela|clavija/iu,
      /cable|enchufe|tomacorriente|conector|breaker|disyuntor|transformador/iu,
      /generador|motor|planta\s+electrica|electrogeno/iu,
      /lavadora|secadora|horno|microondas|ventilador|licuadora|refrigerador|congelador/iu,
      /escalera|andamio/iu,
      /toldo|carpa|pabellon/iu,
      /aspiradora|pulidora|cepillo\s+pulidor/iu,
      /pesas?|discos?|equipo\s+de\s+gimnasio/iu
    ]
  };

  // Reglas de subcategorías específicas por categoría principal.
  // Importante: Sólo usar patrones detonantes específicos; las coincidencias generales quedan en "Otros".
  private readonly SUBCATEGORY_RULES: Record<string, Record<string, RegExp[]>> = {
    'Mantenimiento, reparación y limpieza': {
      'Mantenimiento preventivo': [/mantenimiento\s+preventivo/iu],
      'Mantenimiento correctivo': [/mantenimiento\s+correctivo/iu],
      'Limpieza de edificios': [/limpieza\s+de\s+(edificios|oficinas)/iu],
      'Jardinería y paisajismo': [/jardiner(i|í)a|paisajismo/iu],
      'Calibración de instrumentos': [/calibraci(o|ó)n/iu],
      'Instalación eléctrica y de aires acondicionados': [/instalaci(o|ó)n\s+(el(e|é)ctrica|de\s+aire)/iu],
      'Fumigación y control de plagas': [/fumigaci(o|ó)n|control\s+de\s+plagas/iu],
      'Recolección y disposición de residuos': [/recolecci(o|ó)n|disposici(o|ó)n\s+de\s+(residuos|basura)/iu],
      'Mantenimiento de alarmas y ascensores': [/mantenimiento\s+(de\s+alarmas|de\s+ascensores|de\s+planta\s+el(e|é)ctrica)/iu],
      'Lavado y pintura': [/lavado|pintura|barnizado/iu]
    },
    'Suministros de oficina y papelería': {
      'Papelería general': [/resmas?|papel\s+bond|cuadernos?/iu],
      'Cartuchos y tóners': [/cartucho|t(o|ó)ner/iu],
      'Mobiliario de oficina': [/archivador|escritorio|silla|mueble/iu],
      'Equipos de impresión y copiado': [/impresora|fotocopiadora|scanner|multifuncional/iu],
      'Material de archivo': [/folder|carpeta|archivador|portafolio/iu],
      'Material bibliográfico y libros': [/libros?|material\s+bibliogr(a|á)fico|revistas?|manual/iu],
      'Agendas y planificadores': [/agenda|diario|calendario/iu],
      'Sellos y timbres': [/sello|timbre/iu],
      'Material de encuadernación': [/anillado|espiral|encuadernaci(o|ó)n|plastificado/iu],
      'Impresión de gran formato': [/gran\s+formato|ploteo|banner|afiche/iu],
      'Etiquetas y adhesivos': [/etiquetas?|sticker|adhesivo/iu],
      'Artículos promocionales': [/bol(i|í)grafo\s+promocional|llavero|souvenir/iu]
    },
    'Tecnología y sistemas': {
      'Licencias de software': [/licencia|suscripci(o|ó)n|licenciamiento/iu],
      'Desarrollo y actualización de sistemas': [/desarrollo\s+de\s+sistemas?|actualizaci(o|ó)n\s+de\s+software/iu],
      'Soporte y hardware informático': [/soporte\s+t(e|é)cnico|mantenimiento\s+inform(a|á)tico/iu],
      'Equipos de cómputo': [/computador|laptop|port(a|á)til|pc/iu],
      'Servidores y almacenamiento': [/servidor|storage|nas|san/iu],
      'Redes y telecomunicaciones': [/router|switch|access\s+point|fibra|cableado|modem/iu],
      'Servicios en la nube': [/cloud|nube|hosting|dominio/iu],
      'Bases de datos': [/base\s+de\s+datos|sql|postgres|oracle/iu],
      'Seguridad informática': [/antivirus|firewall|encriptaci(o|ó)n|backup/iu],
      'Periféricos': [/teclado|mouse|monitor|impresora\s+3d|scanner/iu],
      'Audio y video profesional': [/sonido|audio|microfon(o|ó)|parlante|videoconferencia|proyector/iu],
      'Sistemas GIS': [/gis|arcgis|arcfm|sistema\s+geoespacial/iu]
    },
    'Vehículos, transporte y repuestos': {
      'Adquisición de vehículos': [/veh(i|í)culo\s+nuevo|autom(o|ó)vil|cam(i|í)on|bus|microbus/iu],
      'Repuestos automotrices': [/repuesto|accesorio|pieza\s+automotr(i|í)z/iu],
      'Neumáticos y llantas': [/llanta|neum(a|á)tico|rin/iu],
      'Combustibles y lubricantes': [/gasolina|diesel|combustible|aceite|lubricante/iu],
      'Mantenimiento de flotas': [/mantenimiento\s+de\s+flota|servicio\s+mec(a|á)nico/iu],
      'Baterías y filtros': [/bateria|filtro\s+de\s+aceite|filtro\s+de\s+aire/iu],
      'Alquiler de vehículos': [/alquiler\s+de\s+veh(i|í)culos?|renta\s+de\s+veh(i|í)culos/iu],
      'Maquinaria pesada': [/tractor|excavadora|volquete|retroexcavadora|grua/iu],
      'Seguros de vehículos': [/seguro\s+vehicular|poliza\s+de\s+veh(i|í)culo/iu],
      'Sistemas de rastreo': [/gps|rastreo|telemetri(a|á)|monitor\s+de\s+flotas/iu],
      'Vidrios y parabrisas': [/parabrisas|vidrio|retrovisor|lampara\s+vehicular/iu]
    },
    'Salud, medicina y laboratorio': {
      'Medicamentos y fármacos': [/medicamento|f(a|á)rmaco|tratamiento|tabletas|capsulas/iu],
      'Equipos médicos': [/equipo\s+m(e|é)dico|monitor\s+de\s+signos|desfibrilador/iu],
      'Insumos hospitalarios': [/guantes|gasas|jeringas|suturas/iu],
      'Reactivos y kits de laboratorio': [/reactivo|kit\s+de\s+prueba|reactivos/iu],
      'Odontología': [/odontol(o|ó)gico|dental|instrumental\s+dental/iu],
      'Veterinaria': [/veterinari(a|á)|vacuna\s+para\s+animales/iu],
      'Vacunas y biológicos': [/vacuna|biol(o|ó)gico|suero\s+antiofidico/iu],
      'Servicios de ambulancia': [/ambulancia|soporte\s+vital/iu],
      'Instrumental quirúrgico': [/bistur(i|í)|pinza|forceps|quir(u|ú)rgico/iu],
      'Material de esterilización': [/esteril|autoclave|esterilizaci(o|ó)n/iu],
      'Fórmulas y suplementos nutricionales': [/formula\s+nutricional|suplemento\s+alimenticio/iu],
      'Equipos de diagnóstico': [/ecografo|rayos\s+x|analizador|microscopio/iu]
    },
    'Seguridad y vigilancia': {
      'Sistemas CCTV': [/cctv|cam(a|á)ra|videovigilancia/iu],
      'Alarmas y sensores': [/alarma|sensor|detector|antirrobo/iu],
      'Guardias y vigilancia física': [/guardia|vigilante|polic(i|í)a\s+privada/iu],
      'Control de accesos': [/control\s+de\s+acceso|torniquete|tarjeta\s+de\s+proximidad/iu],
      'Equipos contra incendios': [/extintor|manguera\s+contra\s+incendios|gabinete\s+contra\s+incendio/iu],
      'Uniformes y EPP': [/uniforme|chaleco|casco|botas?|zapatos?\s+de\s+seguridad|guantes?\s+de\s+protecci(o|ó)n/iu],
      'Cercas y mallas': [/malla\s+de\s+seguridad|cerca\s+perimetral|cerca\s+electrica/iu],
      'Seguros y pólizas': [/poliza|seguro\s+de\s+riesgo|seguro\s+multiriesgo/iu],
      'Detectores de metales': [/detector\s+de\s+metales|arco\s+detector/iu],
      'Sistemas antirrobo': [/sistema\s+antirrobo|barrera\s+vehicular|barrera\s+antimotines/iu],
      'Servicios de monitoreo': [/monitoreo\s+24|central\s+de\s+monitoreo/iu],
      'Otros equipos de seguridad': [/radios?\s+de\s+comunicaci(o|ó)n|linterna\s+tactica/iu]
    },
    'Construcción y materiales de obra': {
      'Materiales de construcción': [/cemento|concreto|bloque|ladrillo|arena|grava/iu],
      'Obras civiles y viales': [/carretera|puente|pavimento|mezcla\s+asf(a|á)ltica|lastre/iu],
      'Ferretería y tornillería': [/perno|tornillo|tuerca|arandela|chapa/iu],
      'Herramientas eléctricas': [/taladro|sierra|pulidora|cortadora/iu],
      'Maquinaria pesada': [/excavadora|retroexcavadora|grua|volquete|andamio/iu],
      'Productos de madera y derivados': [/madera|melamina|contrachapado|tablero|tapacantos|aserr(i|í)n/iu],
      'Señalización y demarcación': [/se(n|ñ)alizaci(o|ó)n|demarcaci(o|ó)n|trafico|poste\s+vial/iu],
      'Servicios de topografía y geotecnia': [/topograf(i|í)a|geotecnia|levantamiento|estudio\s+geol(o|ó)gico/iu],
      'Estructuras metálicas y prefabricadas': [/estructura\s+met(al|á)lica|prefabricado/iu],
      'Remodelación y ampliación': [/remodelaci(o|ó)n|ampliaci(o|ó)n|refacci(o|ó)n/iu],
      'Mezcla asfáltica': [/mezcla\s+asf(a|á)ltica|asfalto/iu],
      'Servicios de demolición y limpieza de obra': [/demolic(i|ó)n|derribo|retiro\s+de\s+escombros/iu]
    },
    'Alimentos y servicios de catering': {
      'Alimentos perecederos': [/carne|pollo|pescado|fruta|verdura|lacteo/iu],
      'Alimentos no perecederos': [/arroz|frijol|cereal|enlatado/iu],
      'Servicios de catering para eventos': [/catering|banquete|buffet|servicio\s+de\s+alimentaci(o|ó)n\s+para\s+eventos/iu],
      'Cafeterías institucionales': [/cafeter(i|í)a|comedor\s+institucional/iu],
      'Productos de panadería y repostería': [/pan|pastel|panader(i|í)a|reposter(i|í)a|galleta/iu],
      'Bebidas': [/cafe|jugo|refresco|agua\s+embotellada|bebida/iu],
      'Meriendas y refrigerios': [/refrigerio|merienda|snack|confites|dulces/iu],
      'Fórmulas y suplementos nutricionales': [/suplemento\s+alimenticio|formula\s+nutricional|modulo\s+nutricional/iu],
      'Utensilios y equipos de cocina': [/sarten|olla|cuchillo|bateria\s+de\s+cocina|utensilio\s+de\s+cocina/iu],
      'Agua embotellada': [/agua\s+embotellada/iu],
      'Servicios de almuerzo y cena': [/servicio\s+de\s+almuerzo|servicio\s+de\s+cena/iu],
      'Suplementos para dietas especiales': [/diet(a|á)tico|hipoalerg(e|é)nico|gluten/iu]
    },
    'Servicios profesionales y consultoría': {
      'Consultorías en ingeniería y arquitectura': [/ingenier(i|í)a|arquitectura/iu],
      'Consultorías legales y notariales': [/legal|abogado|notarial/iu],
      'Consultorías financieras y contables': [/financiero|contable|fiscal/iu],
      'Auditorías': [/auditor(i|í)a|auditoria/iu],
      'Marketing y publicidad': [/marketing|publicidad|comunicaci(o|ó)n\s+estrat(e|é)gica/iu],
      'Representación artística y organización de eventos': [/representaci(o|ó)n\s+art(i|í)stica|producci(o|ó)n\s+de\s+eventos/iu],
      'Capacitaciones y formación': [/capacitaci(o|ó)n|formaci(o|ó)n|taller|curso/iu],
      'Servicios de traducción e interpretación': [/traducci(o|ó)n|interpretaci(o|ó)n/iu],
      'Asesorías contables y periciales': [/asesor(i|í)a|peritaje/iu],
      'Consultorías de turismo y recreación': [/turismo|recreaci(o|ó)n\s+organizacional/iu],
      'Diseño gráfico y paisajístico': [/dise(n|ñ)o\s+gr(a|á)fico|paisajismo/iu],
      'Planes estratégicos y estudios socioeconómicos': [/plan\s+estrat(e|é)gico|estudio\s+socioecon(o|ó)mico|diagn(o|ó)stico\s+sectorial/iu]
    },
    'Educación, cultura y recreación': {
      'Libros y material bibliográfico': [/libro|material\s+bibliogr(a|á)fico|manual|revista/iu],
      'Suscripciones y licencias editoriales': [/suscripci(o|ó)n|licencia\s+editorial/iu],
      'Instrumentos musicales': [/instrumento\s+musical|guitarra|piano|violin|timbal|lira|marimba/iu],
      'Material didáctico y educativo': [/material\s+did(a|á)ctico|juego\s+did(a|á)ctico|kit\s+educativo/iu],
      'Cursos y capacitaciones': [/curso|capacitaci(o|ó)n|formaci(o|ó)n\s+acad(e|é)mica/iu],
      'Eventos culturales y artísticos': [/evento\s+cultural|concierto|teatro|espect(a|á)culo|festival/iu],
      'Implementos deportivos y de gimnasio': [/pelota|bal(o|ó)n|disco|cono|tabla\s+de\s+gimnasio|tablero\s+retractil/iu],
      'Juegos infantiles e inflables': [/inflable|juego\s+infantil|cama\s+el(a|á)stica/iu],
      'Reconocimientos y medallas': [/medalla|trofeo|reconocimiento|estola\s+de\s+graduaci(o|ó)n/iu],
      'Campañas educativas': [/camp(a|á)na\s+educativa|programa\s+de\s+educaci(o|ó)n|camp(a|á)na\s+de\s+lectura/iu],
      'Programas de deporte escolar': [/programa\s+de\s+deporte\s+escolar/iu],
      'Dotación de bibliotecas y museos': [/dotaci(o|ó)n\s+de\s+biblioteca|colecci(o|ó)n\s+patrimonial|museo/iu]
    },
    'Logística y servicios generales': {
      'Mensajería y courier': [/courier|mensajer(i|í)a|paqueter(i|í)a|env(i|í)o/iu],
      'Fletes y transporte de carga': [/flete|transporte\s+de\s+carga|camion\s+de\s+reparto/iu],
      'Gestión de residuos y relleno sanitario': [/recolecci(o|ó)n|traslado|relleno\s+sanitario|disposici(o|ó)n\s+final/iu],
      'Alquiler y arrendamiento': [/alquiler|arrendamiento|renta\s+de\s+(mobiliario|equipos?|inmuebles)/iu],
      'Remates y subastas aduaneras': [/remate|subasta|aduan(a|e)ra/iu],
      'Almacenamiento y bodegas': [/almacenamiento|bodega|log(i|í)stica/iu],
      'Mudanzas y embalaje': [/mudanza|embalaje|traslado\s+de\s+oficina/iu],
      'Reservas de viaje y hospedaje': [/reserva\s+de\s+viaje|hospedaje|pasaje|boleto\s+a(e|é)reo/iu],
      'Distribución de material electoral': [/material\s+electoral|transporte\s+de\s+urnas|documentos\s+electorales/iu],
      'Trámites y matriculación': [/matr(i|í)cula|tr(a|á)mite|legalizaci(o|ó)n/iu],
      'Servicios de correo postal': [/correo\s+postal|servicio\s+de\s+correos/iu],
      'Servicios de mudanza de vehículos o maquinaria': [/carga\s+de\s+veh(i|í)culos|transporte\s+de\s+maquinaria/iu]
    },
    'Herramientas industriales y electrodomésticos': {
      'Herramientas manuales': [/martillo|destornillador|alicate|llave\s+inglesa|serrucho/iu],
      'Herramientas eléctricas': [/taladro|amoladora|pulidora|rotomartillo|caladora/iu],
      'Maquinaria industrial': [/torno|fresadora|maquinaria\s+industrial|maquina\s+pesada/iu],
      'Equipos de soldadura y compresión': [/soldadora|compresor|motobomba|hidrolavadora/iu],
      'Tornillería y ferretería': [/perno|tornillo|tuerca|arandela|clavija/iu],
      'Material eléctrico': [/cable|enchufe|tomacorriente|conector|breaker|disyuntor|transformador/iu],
      'Generadores y motores': [/generador|motor|planta\s+electrica|electrogeno/iu],
      'Electrodomésticos': [/lavadora|secadora|horno|microondas|ventilador|licuadora|refrigerador|congelador/iu],
      'Escaleras y andamios': [/escalera|andamio/iu],
      'Toldos y carpas': [/toldo|carpa|pabellon/iu],
      'Equipos de limpieza industrial': [/aspiradora|pulidora|cepillo\s+pulidor/iu],
      'Equipos de gimnasio': [/pesas?|discos?|equipo\s+de\s+gimnasio/iu]
    }
  };

  // ================================
  // CONFIGURACIÓN
  // ================================
  private readonly CSV_CONFIG = {
    // Auto-detect delimiter across mixed ';' and ',' files
    delimiter: '' as any,
    header: true,
    skipEmptyLines: true,
    quoteChar: '"',
    escapeChar: '"',
    // NUEVO: Permitir headers sin comillas y datos con comillas
    // Esto maneja CSVs donde: HEADER1;HEADER2 pero "dato1";"dato2"
    newline: '',  // Auto-detect line endings
    encoding: 'utf-8',
    // IMPORTANTE: Estos se mantienen pero se sobrescriben en cargarArchivoCSV
    transformHeader: (header: string) => this.normalizarNombreColumna(header),
    transform: (value: string, field: string) => this.transformarValor(value, field)
  };

  constructor() {
    this.inicializarIndices();
    
    // Escuchar cambios en categorías manuales para limpiar cache
    if (typeof window !== 'undefined') {
      window.addEventListener('manualCategoriesUpdated', () => {
        console.log('🔄 Categorías manuales actualizadas, limpiando cache de reglas');
        this.combinedSectorRulesCache = null;
        this.combinedSectorRulesCacheKey = '';
      });
      
      // Escuchar cambios en configuración de categorías
      window.addEventListener('categoryConfigurationUpdated', () => {
        console.log('🔄 Configuración de categorías actualizada, limpiando cache de reglas');
        this.combinedSectorRulesCache = null;
        this.combinedSectorRulesCacheKey = '';
      });
      
      // Escuchar cambios en subcategorías
      window.addEventListener('subcategoryConfigurationUpdated', () => {
        console.log('🔄 Subcategorías actualizadas, limpiando cache de reglas');
        this.combinedSectorRulesCache = null;
        this.combinedSectorRulesCacheKey = '';
      });
    }
  }

  // ================================
  // CARGA DE DATOS
  // ================================

  /**
   * Carga todos los archivos CSV de la carpeta especificada
   */
  async cargarDatos(rutaCarpeta: string = 'cleaned'): Promise<void> {
    try {
      this.loadingProgress = 0;
      this.loadingStage = 'Preparando carga';
      console.log('🚀 Iniciando carga de datos SICOP...');

      const archivosCSV = Object.keys(MAPEO_ARCHIVOS);
      const totalArchivos = archivosCSV.length;

      this.loadingStage = 'Abriendo y leyendo archivos CSV';
      for (let i = 0; i < archivosCSV.length; i++) {
        const archivo = archivosCSV[i];
        const nombreTabla = MAPEO_ARCHIVOS[archivo];
        
        console.log(`📁 Cargando ${archivo} -> ${nombreTabla}...`);
        
        try {
          // Durante la lectura de cada archivo, estamos normalizando y categorizando campos
          this.loadingStage = 'Leyendo, normalizando y categorizando campos';
          const datos = await this.cargarArchivoCSV(`${rutaCarpeta}/${archivo}`, nombreTabla);
          
          // NUEVO: Validar que los datos se cargaron correctamente antes de guardar
          if (!datos || !Array.isArray(datos)) {
            console.warn(`⚠️ Datos inválidos para ${nombreTabla}, usando array vacío`);
            this.datos.set(nombreTabla, []);
          } else {
            // Intentar guardar los datos con manejo de errores
            try {
              this.datos.set(nombreTabla, datos);
              console.log(`✅ ${nombreTabla}: ${datos.length.toLocaleString()} registros guardados en memoria`);
              
              // Advertencia si es un dataset muy grande
              if (datos.length > 500000) {
                console.warn(`⚠️ Dataset muy grande: ${nombreTabla} con ${datos.length.toLocaleString()} registros`);
                console.warn(`   Algunas operaciones pueden ser lentas. Considera filtrar los datos.`);
              }
            } catch (saveError: any) {
              // Error al guardar en Map (probablemente "Invalid string length")
              console.error(`❌ Error guardando ${nombreTabla} en memoria:`, saveError?.message || saveError);
              console.warn(`   Intentando guardar muestra reducida...`);
              
              // Guardar solo una muestra (primeras 500K filas)
              const muestra = datos.slice(0, 500000);
              this.datos.set(nombreTabla, muestra);
              console.warn(`⚠️ ${nombreTabla}: Guardadas ${muestra.length.toLocaleString()} de ${datos.length.toLocaleString()} filas (muestra)`);
            }
          }
          
          // Actualizar progreso
          this.loadingProgress = Math.round(((i + 1) / totalArchivos) * 70); // 70% para carga
          
          // Muestra de headers solo en modo detallado
          const datosGuardados = this.datos.get(nombreTabla) || [];
          if (this.loggingMode === 'verbose' && datosGuardados.length > 0) {
            console.log(`   📄 Headers ${nombreTabla}:`, Object.keys(datosGuardados[0]));
          }
          
        } catch (error: any) {
          const esOpcional = this.ARCHIVOS_OPCIONALES.has(nombreTabla);
          
          if (esOpcional) {
            // Archivo opcional - no es crítico
            console.warn(`⚠️ Archivo opcional ${archivo} no cargado:`, error?.message || error);
            console.info(`✅ La aplicación funciona correctamente sin este archivo`);
          } else {
            // Archivo crítico - mostrar error
            console.error(`❌ Error cargando ${archivo}:`, error?.message || error);
          }
          
          // Continuar con otros archivos aunque uno falle
          this.datos.set(nombreTabla, []);
        }
      }

      // Fallback: si no se cargaron proveedores desde ninguno de los archivos previstos
      const provsCargados = this.datos.get('Proveedores') || [];
      if (!provsCargados.length) {
        console.warn('⚠️ No se cargaron registros de Proveedores desde CSV. Construyendo fallback sintético a partir de otras tablas...');
        try {
          const fuentes: string[] = ['Ofertas','LineasAdjudicadas','Contratos'];
            const ids = new Set<string>();
            fuentes.forEach(f => {
              const arr: any[] = this.datos.get(f) || [];
              arr.forEach(r => {
                const id = String(r.idProveedorAdjudicado || r.idProveedor || '').replace(/\D+/g,'').trim();
                if (id) ids.add(id);
              });
            });
            const sinteticos = Array.from(ids).map(id => ({ idProveedor: id, nombreProveedor: id }));
            this.datos.set('Proveedores', sinteticos);
            this.diagnostics.rowCounts['Proveedores'] = sinteticos.length;
            console.warn(`🧩 Fallback Proveedores generado: ${sinteticos.length} registros sintéticos.`);
        } catch (e) {
          console.error('💥 Error construyendo fallback de Proveedores:', e);
        }
      }

    // Crear índices para optimizar consultas
    this.loadingStage = 'Construyendo índices de búsqueda';
    console.log('🔍 Creando índices...');
    this.crearIndices();
    this.construirIndiceTexto();
      this.loadingProgress = 85;

      // Validar integridad relacional
    this.loadingStage = 'Identificando relaciones y validando integridad';
    console.log('🔗 Validando relaciones...');
      this.validarIntegridad();
      this.loadingProgress = 95;

      // Generar estadísticas iniciales
    this.loadingStage = 'Generando estadísticas iniciales';
    console.log('📊 Generando estadísticas...');
      this.generarEstadisticasIniciales();
    // Resumen conciso de validación y cobertura de headers
    this.logValidationSummary({ showSamples: false });
      
      // DIAGNÓSTICO DE CAMPOS DE MONTO
      console.group('🔍 Diagnóstico de Campos de Monto');
      this.diagnosticarCamposMontos('Contratos', true);
      this.diagnosticarCamposMontos('LineasContratadas', false);
      this.diagnosticarCamposMontos('AdjudicacionesFirme', false);
      console.groupEnd();
      
      // VALIDACIÓN DE INTEGRIDAD DE MONTOS
      const validacion = this.validarIntegridadMontos();
      if (validacion.advertencias.length > 0) {
        console.group('⚠️ Advertencias de Integridad de Datos');
        validacion.advertencias.forEach(adv => console.warn(adv));
        console.log('📊 Estadísticas detalladas:', validacion.estadisticas);
        console.groupEnd();
      }
      
      // PRE-CALCULAR MONTOS PARA OPTIMIZAR REPORTES
      this.precalcularMontos();
      
      // PRE-CALCULAR MÉTRICAS PESADAS (sectores, montos estimados, subcategorías)
      this.precalcularMetricas();
      
      this.isLoaded = true;
      this.loadingProgress = 100;
    this.loadingStage = 'Completando';
      console.log('🎉 Carga completa! Datos listos para consultas.');
      
    } catch (error) {
      console.error('💥 Error en carga de datos:', error);
      throw new Error(`Error cargando datos: ${error}`);
    }
  }

  /**
   * Carga un archivo CSV individual
   * Maneja casos especiales:
   * - Headers sin comillas pero datos con comillas (ej: HEADER1;HEADER2 vs "dato1";"dato2")
   * - Auto-detección de delimitadores (;, ,)
   * - Normalización de nombres de columnas
   * - Archivos grandes (>50MB) con procesamiento optimizado
   * - Límite absoluto: 100MB - archivos mayores NO se cargan
   * - Límite de filas: 10,000 para archivos muy grandes
   */
  private async cargarArchivoCSV(rutaArchivo: string, nombreTabla?: string): Promise<any[]> {
    // Intento 1: usar fetch con no-store para evitar 304/decoding issues en dev
    const intentarFetch = async (): Promise<{ content: string | null; size: number }> => {
      try {
        const url = this.resolverURL(rutaArchivo, true);
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        // Verificar tamaño del archivo
        const contentLength = res.headers.get('content-length');
        const fileSizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
        
        // NUEVO: Rechazar archivos que exceden el límite absoluto
        if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
          const esOpcional = this.ARCHIVOS_OPCIONALES.has(nombreTabla || '');
          
          if (esOpcional) {
            // Archivo opcional - mensaje de información, no error
            console.group(`ℹ️ ARCHIVO OPCIONAL NO CARGADO: ${nombreTabla || rutaArchivo}`);
            console.warn(`� Tamaño del archivo: ${fileSizeMB.toFixed(2)} MB`);
            console.warn(`⛔ Límite máximo: ${this.MAX_FILE_SIZE_MB} MB`);
            console.info(`✅ La aplicación funciona correctamente sin este archivo`);
            console.info(`💡 Este archivo solo proporciona datos complementarios`);
            console.groupEnd();
          } else {
            // Archivo crítico - mensaje de error
            console.group(`�🚫 ARCHIVO DEMASIADO GRANDE: ${nombreTabla || rutaArchivo}`);
            console.error(`📦 Tamaño del archivo: ${fileSizeMB.toFixed(2)} MB`);
            console.error(`⛔ Límite máximo: ${this.MAX_FILE_SIZE_MB} MB`);
            console.error(`❌ El archivo NO se cargará para evitar problemas de memoria`);
            console.warn(`💡 Solución: Crear una muestra más pequeña del archivo (< ${this.MAX_FILE_SIZE_MB} MB)`);
            console.groupEnd();
          }
          
          // NO cargar el contenido, retornar null
          return { content: null, size: fileSizeMB };
        } else if (fileSizeMB > this.LARGE_FILE_THRESHOLD_MB) {
          console.log(`📦 Archivo grande detectado: ${nombreTabla || rutaArchivo} (${fileSizeMB.toFixed(2)}MB)`);
          console.log(`   Activando modo de procesamiento optimizado por chunks`);
        }
        
        const content = await res.text();
        return { content, size: fileSizeMB };
      } catch (e) {
        return { content: null, size: 0 };
      }
    };

    return new Promise(async (resolve, reject) => {
      const headerMap = (nombreTabla && MAPEO_HEADERS_POR_TABLA[nombreTabla]) ? MAPEO_HEADERS_POR_TABLA[nombreTabla] : {};
      const buffer: any[] = [];
      const rawHeaders: string[] = [];
      const explicitMapped: string[] = [];
      const autoNormalized: string[] = [];
      let rowCount = 0;
      let isLargeFile = false;
      let exceededLimit = false;
      
      const fetchResult = await intentarFetch();
      const fetched = fetchResult.content;
      const fileSizeMB = fetchResult.size;
      
      // NUEVO: Si el archivo fue rechazado por tamaño, retornar array vacío inmediatamente
      if (fetched === null && fileSizeMB > this.MAX_FILE_SIZE_MB) {
        console.warn(`⚠️ ${nombreTabla || rutaArchivo} NO cargado (excede ${this.MAX_FILE_SIZE_MB} MB)`);
        if (nombreTabla) {
          this.diagnostics.headerStats[nombreTabla] = { rawHeaders: [], explicitMapped: [], autoNormalized: [] };
          this.diagnostics.rowCounts[nombreTabla] = 0;
        }
        resolve([]); // Retornar array vacío
        return;
      }
      
      // Determinar si es archivo grande
      isLargeFile = fileSizeMB > this.LARGE_FILE_THRESHOLD_MB;
      
      if (fetched != null) {
        try {
          // NUEVO: Detectar y limpiar headers sin comillas
          const lines = fetched.split('\n');
          let csvContent = fetched;
          
          if (lines.length > 0) {
            const firstLine = lines[0];
            // Detectar si el header tiene comillas o no
            const hasQuotedHeaders = /^"[^"]+"|;"[^"]+"/.test(firstLine);
            const hasUnquotedHeaders = !hasQuotedHeaders && /^[^";,]+[;,]/.test(firstLine);
            
            // Si los headers NO tienen comillas, normalizarlos
            if (hasUnquotedHeaders && lines.length > 1) {
              const secondLine = lines[1];
              const hasQuotedData = /"[^"]*"/.test(secondLine);
              
              if (hasQuotedData) {
                console.log(`📋 Detectado CSV con headers sin comillas en ${nombreTabla || rutaArchivo}`);
                // Limpiar espacios en blanco del header
                const cleanedHeader = firstLine.trim();
                csvContent = cleanedHeader + '\n' + lines.slice(1).join('\n');
              }
            }
          }
          
          let parserInstance: any = null;
          
          const results: any = (Papa as any).parse(csvContent, {
            ...this.CSV_CONFIG,
            worker: isLargeFile, // NUEVO: Usar worker para archivos grandes
            download: false,
            fastMode: false,  // Modo robusto para CSVs problemáticos
            step: isLargeFile ? (row: any, parser: any) => {
              // Guardar referencia al parser
              if (!parserInstance) parserInstance = parser;
              
              // NUEVO: Callback para procesar fila por fila en archivos grandes
              rowCount++;
              
              // Límite de seguridad
              if (rowCount > this.MAX_ROWS_PER_FILE) {
                if (!exceededLimit) {
                  console.group(`🛑 Límite de filas alcanzado: ${nombreTabla}`);
                  console.warn(`📊 Límite: ${this.MAX_ROWS_PER_FILE.toLocaleString()} filas`);
                  console.warn(`✅ Cargadas: ${this.MAX_ROWS_PER_FILE.toLocaleString()} filas (muestra)`);
                  console.warn(`ℹ️  Resto del archivo: NO cargado para evitar problemas de memoria`);
                  console.warn(`💡 La aplicación funciona normalmente con esta muestra`);
                  console.groupEnd();
                  exceededLimit = true;
                  parser.abort(); // NUEVO: Abortar el parser
                }
                return; // No agregar más filas
              }
              
              if (row.data && Object.keys(row.data).length > 0) {
                buffer.push(row.data);
              }
              
              // Progreso cada 50K filas
              if (rowCount % 50000 === 0) {
                console.log(`  ⏳ Procesadas ${rowCount.toLocaleString()} filas de ${nombreTabla}...`);
              }
            } : undefined,
            transformHeader: (h: string) => {
              // Limpiar comillas del header si las tiene
              const cleaned = h.replace(/^["']|["']$/g, '').trim();
              const key = cleaned.toLowerCase();
              if (!rawHeaders.includes(key)) rawHeaders.push(key);
              const mapped = headerMap[key];
              if (mapped) {
                explicitMapped.push(mapped);
                return mapped;
              }
              const norm = this.normalizarNombreColumna(cleaned);
              autoNormalized.push(norm);
              return norm;
            },
            complete: isLargeFile ? (results: any) => {
              // NUEVO: Callback para cuando termina el procesamiento de archivos grandes
              const errs = results && Array.isArray(results.errors) ? results.errors : [];
              const erroresCriticos = errs.filter((error: any) => error.type === 'Quotes' || error.type === 'Delimiter');
              if (erroresCriticos.length > 0 && erroresCriticos.length <= 10) {
                console.warn(`⚠️ Errores de parsing en ${rutaArchivo}:`, erroresCriticos);
              } else if (erroresCriticos.length > 10) {
                console.warn(`⚠️ ${erroresCriticos.length} errores de parsing en ${rutaArchivo} (mostrando primeros 5):`, erroresCriticos.slice(0, 5));
              }
              
              // Usar el buffer acumulado en el callback step
              const dataFinal = buffer;
              
              if (nombreTabla) {
                this.diagnostics.headerStats[nombreTabla] = { rawHeaders: [...rawHeaders], explicitMapped: [...explicitMapped], autoNormalized: [...autoNormalized] };
                this.diagnostics.rowCounts[nombreTabla] = dataFinal.length;
              }
              
              // Mensaje diferenciado si se limitó el archivo
              if (exceededLimit || dataFinal.length >= this.MAX_ROWS_PER_FILE) {
                console.log(`✅ ${nombreTabla || rutaArchivo}: ${dataFinal.length.toLocaleString()} filas cargadas (MUESTRA de archivo ${fileSizeMB.toFixed(2)}MB)`);
              } else {
                console.log(`✅ CSV grande parseado: ${nombreTabla || rutaArchivo} - ${dataFinal.length.toLocaleString()} registros (${fileSizeMB.toFixed(2)}MB)`);
              }
              resolve(dataFinal);
            } : undefined
          } as any);
          
          // Solo para archivos pequeños (sin worker)
          if (!isLargeFile) {
            const errs = results && Array.isArray(results.errors) ? results.errors : [];
            const erroresCriticos = errs.filter((error: any) => error.type === 'Quotes' || error.type === 'Delimiter');
            if (erroresCriticos.length > 0) {
              console.warn(`⚠️ Errores de parsing en ${rutaArchivo}:`, erroresCriticos.slice(0, 5));
              console.log(`📊 Total errores: ${erroresCriticos.length}, mostrando primeros 5`);
            }
            
            let dataFinal: any[];
            
            if (buffer.length > 0) {
              // Para archivos procesados con step callback
              dataFinal = buffer;
            } else {
              // Para archivos normales
              dataFinal = (results && Array.isArray(results.data) ? (results.data as any[]) : []);
            }
            
            // Aplicar límite de filas si es necesario
            const originalLength = dataFinal.length;
            if (dataFinal.length > this.MAX_ROWS_PER_FILE) {
              console.group(`🛑 Archivo con demasiadas filas: ${nombreTabla}`);
              console.warn(`📊 Total filas: ${originalLength.toLocaleString()}`);
              console.warn(`✂️  Limitando a: ${this.MAX_ROWS_PER_FILE.toLocaleString()} filas`);
              console.warn(`💡 La aplicación funciona normalmente con esta muestra`);
              console.groupEnd();
              dataFinal = dataFinal.slice(0, this.MAX_ROWS_PER_FILE);
            }
            
            if (nombreTabla) {
              this.diagnostics.headerStats[nombreTabla] = { rawHeaders: [...rawHeaders], explicitMapped: [...explicitMapped], autoNormalized: [...autoNormalized] };
              this.diagnostics.rowCounts[nombreTabla] = dataFinal.length;
            }
            
            // Mensaje diferenciado si se limitó
            if (originalLength > this.MAX_ROWS_PER_FILE) {
              console.log(`✅ ${nombreTabla || rutaArchivo}: ${dataFinal.length.toLocaleString()} filas cargadas (MUESTRA de ${originalLength.toLocaleString()} total)`);
            } else {
              console.log(`✅ CSV parseado: ${nombreTabla || rutaArchivo} - ${dataFinal.length.toLocaleString()} registros`);
            }
            resolve(dataFinal);
          }
          return;
        } catch (e) {
          console.warn(`Fallo parseando texto de ${rutaArchivo}, reintentando con XHR:`, e);
        }
      }

      const url = this.resolverURL(rutaArchivo, true);
      
      // Contador para fallback también
      let fallbackRowCount = 0;
      let fallbackExceededLimit = false;
      
      (Papa as any).parse(url, {
        ...this.CSV_CONFIG,
        worker: isLargeFile, // Usar worker para archivos grandes
        download: true,
        chunkSize: isLargeFile ? this.CHUNK_SIZE_LARGE_FILES : 1024 * 512,
        fastMode: false,  // Modo robusto
        downloadRequestHeaders: { 'Cache-Control': 'no-cache' },
        transformHeader: (h: string) => {
          // Limpiar comillas del header si las tiene
          const cleaned = h.replace(/^["']|["']$/g, '').trim();
          const key = cleaned.toLowerCase();
          if (!rawHeaders.includes(key)) rawHeaders.push(key);
          const mapped = headerMap[key];
          if (mapped) {
            explicitMapped.push(mapped);
            return mapped;
          }
          const norm = this.normalizarNombreColumna(cleaned);
          autoNormalized.push(norm);
          return norm;
        },
        chunk: (results: any, parser: any) => {
          if (results && Array.isArray(results.data)) {
            for (const row of results.data) {
              fallbackRowCount++;
              
              // NUEVO: Límite de seguridad
              if (fallbackRowCount > this.MAX_ROWS_PER_FILE) {
                if (!fallbackExceededLimit) {
                  console.warn(`⚠️ Límite de ${this.MAX_ROWS_PER_FILE.toLocaleString()} filas alcanzado en ${nombreTabla}`);
                  console.warn(`   Deteniendo procesamiento del archivo`);
                  fallbackExceededLimit = true;
                  parser.abort(); // Detener el parser
                }
                break;
              }
              
              buffer.push(row);
            }
            
            // Progreso para archivos grandes
            if (isLargeFile && fallbackRowCount % 50000 === 0) {
              console.log(`  ⏳ Procesadas ${fallbackRowCount.toLocaleString()} filas de ${nombreTabla}...`);
            }
          }
        },
        complete: (results: any) => {
          const errs = results && Array.isArray(results.errors) ? results.errors : [];
          const erroresCriticos = errs.filter((error: any) => error.type === 'Quotes' || error.type === 'Delimiter');
          if (erroresCriticos.length > 0) {
            console.warn(`⚠️ Errores de parsing en ${rutaArchivo}:`, erroresCriticos.slice(0, 5));
            console.log(`📊 Total errores: ${erroresCriticos.length}, mostrando primeros 5`);
          }
          const dataFinal: any[] = buffer.length ? buffer : (results && Array.isArray(results.data) ? (results.data as any[]) : []);
          
          if (nombreTabla) {
            this.diagnostics.headerStats[nombreTabla] = { rawHeaders: [...rawHeaders], explicitMapped: [...explicitMapped], autoNormalized: [...autoNormalized] };
            this.diagnostics.rowCounts[nombreTabla] = dataFinal.length;
          }
          
          if (isLargeFile || dataFinal.length > 100000) {
            console.log(`✅ CSV parseado (fallback): ${nombreTabla || rutaArchivo} - ${dataFinal.length.toLocaleString()} registros`);
          } else {
            console.log(`✅ CSV parseado (fallback): ${nombreTabla || rutaArchivo} - ${dataFinal.length} registros`);
          }
          
          resolve(dataFinal);
        },
        error: (error: any) => {
          console.warn(`❌ Error de descarga/parsing en ${url}:`, error);
          if (nombreTabla) {
            this.diagnostics.headerStats[nombreTabla] = { rawHeaders: [...rawHeaders], explicitMapped: [...explicitMapped], autoNormalized: [...autoNormalized] };
            this.diagnostics.rowCounts[nombreTabla] = 0;
          }
          resolve([]);
        }
      } as any);
    });
  }

  private resolverURL(path: string, bustCache: boolean = false): string {
    if (/^https?:\/\//i.test(path)) return path;
    const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const base = path.startsWith('/') ? `${publicUrl}${path}` : `${publicUrl}/${path}`;
    const url = base.replace(/\/+/g, '/');
    if (bustCache && (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${Date.now()}`;
    }
    return url;
  }

  /**
   * Corrige problemas de encoding UTF-8 mal interpretado
   * Convierte caracteres mal codificados a su forma correcta
   * Ejemplo: "CÃ©dula" -> "Cédula", "TamaÃ±o" -> "Tamaño"
   */
  private corregirEncoding(texto: string): string {
    let corregido = texto;
    
    // IMPORTANTE: Hacer reemplazos de secuencias más largas PRIMERO
    // para evitar reemplazos parciales incorrectos
    
    // Ñ mayúscula (debe ir antes de Ã solo)
    corregido = corregido.replace(/Ã'/g, '\u00D1'); // Ñ
    
    // Vocales mayúsculas con acento (deben ir antes de Ã solo)
    corregido = corregido.replace(/Ã‰/g, '\u00C9'); // É
    corregido = corregido.replace(/Ã"/g, '\u00D3'); // Ó
    corregido = corregido.replace(/Ãš/g, '\u00DA'); // Ú
    
    // Diéresis (deben ir antes de Ã solo)
    corregido = corregido.replace(/Ã¼/g, '\u00FC'); // ü
    corregido = corregido.replace(/Ãœ/g, '\u00DC'); // Ü
    
    // Vocales minúsculas con acento
    corregido = corregido.replace(/Ã¡/g, '\u00E1'); // á
    corregido = corregido.replace(/Ã©/g, '\u00E9'); // é
    corregido = corregido.replace(/Ã­/g, '\u00ED'); // í
    corregido = corregido.replace(/Ã³/g, '\u00F3'); // ó
    corregido = corregido.replace(/Ãº/g, '\u00FA'); // ú
    
    // Ñ minúscula
    corregido = corregido.replace(/Ã±/g, '\u00F1'); // ñ
    
    // Á mayúscula (debe ir AL FINAL porque Ã aparece en otras secuencias)
    corregido = corregido.replace(/Ã(?![©­³º±'‰"šœ¼¡])/g, '\u00C1');  // Á (solo si no está seguido de otros caracteres de secuencia)
    
    // Í mayúscula
    corregido = corregido.replace(/Ã(?![©­³º±'‰"šœ¼¡])/g, '\u00CD');  // Í

    return corregido;
  }

  /**
   * Normaliza nombres de columnas para consistencia
   */
  private normalizarNombreColumna(header: string): string {
    // PRIMERO: Corregir encoding antes de cualquier procesamiento
    let procesado = this.corregirEncoding(header);
    
    // SEGUNDO: Normalizar caracteres acentuados a sus equivalentes sin acento
    // Esto DEBE hacerse ANTES de reemplazar caracteres especiales
    const normalizarAcentos = (str: string): string => {
      return str
        .replace(/[áàäâ]/gi, 'a')
        .replace(/[éèëê]/gi, 'e')
        .replace(/[íìïî]/gi, 'i')
        .replace(/[óòöô]/gi, 'o')
        .replace(/[úùüû]/gi, 'u')
        .replace(/[ñ]/gi, 'n')
        .replace(/[ç]/gi, 'c');
    };
    
    procesado = normalizarAcentos(procesado);
    
    // TERCERO: Limpiar caracteres especiales y normalizar
    let normalizado = procesado
      .trim()
      .replace(/["']/g, '') // Remover comillas
      .replace(/[^\w\s]/g, '_') // Reemplazar caracteres especiales con _
      .replace(/\s+/g, '_') // Reemplazar espacios con _
      .replace(/_+/g, '_') // Consolidar múltiples _ en uno solo
      .toLowerCase();

    // Mapeos específicos para campos conocidos (reforzado para nombres de proveedor)
    const mapeos: Record<string, string> = {
      // Variantes de nombre de proveedor
      'nombre': 'nombreProveedor',
      'nombre_proveedor': 'nombreProveedor',
      'nombreproveedor': 'nombreProveedor',
      'razon_social': 'nombreProveedor',
      'razonsocial': 'nombreProveedor',
      'nombre_prov': 'nombreProveedor',
      'nom_proveedor': 'nombreProveedor',
      'proveedor_nombre': 'nombreProveedor',
      'proveedor': 'nombreProveedor',
      // Con guiones bajos
      'descripcion_objeto': 'descripcionCartel',
      'descripcion_linea': 'descripcionLinea',
      'fecha_publicacion': 'fechaPublicacion',
      'fecha_firma': 'fechaFirma',
      'fecha_inicio': 'fechaInicio',
      'fecha_fin': 'fechaFin',
      'monto_contrato': 'montoContrato',
      'presupuesto_oficial': 'presupuestoOficial',
      'nro_sicop': 'numeroCartel',
      'numero_sicop': 'numeroCartel',
      'nro_contrato': 'idContrato',
      'numero_contrato': 'idContrato',
      'nro_linea': 'numeroLinea',
      'cedula_institucion': 'codigoInstitucion',
      'cedula_proveedor': 'idProveedor',
      'nro_oferta': 'idOferta',
      'fecha_presenta_oferta': 'fechaOferta',
      // Sin guiones bajos (como aparecen en logs)
      'numerocartel': 'numeroCartel',
      'codigoinstitucion': 'codigoInstitucion',
      'fechapublicacion': 'fechaPublicacion',
  // Campos adicionales detectados en CSV reales
  'publicacion': 'fechaPublicacion',
  'fecha_apertura': 'fechaAperturaOfertas',
  'fecha_adj_firme': 'fechaAdjudicacionFirme',
  'adjudicacion_firme': 'fechaAdjudicacionFirme',
      'codigoprocedimiento': 'codigoProcedimiento',
      'nombrecartel': 'nombreCartel',
      'presupuestooficial': 'presupuestoOficial',
      'clasificacionobjeto': 'clasificacionObjeto',
      'numerolinea': 'numeroLinea',
      'idcontrato': 'idContrato',
      'idproveedor': 'idProveedor',
      'fechaoferta': 'fechaOferta',
      'fechafirma': 'fechaFirma',
      'fechah_apertura': 'fechaAperturaOfertas',
      'fechaadjudicacion': 'fechaAdjudicacion',
      'fechafirmacontrato': 'fechaFirmaContrato',
      'fecharecepcion': 'fechaRecepcion'
    };

    if (mapeos[normalizado]) {
      return mapeos[normalizado];
    }

    if (normalizado.includes('_')) {
      const camel = normalizado.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
      return camel;
    }

    return normalizado;
  }

  /**
   * Transforma valores según el tipo de campo
   */
  private transformarValor(value: string, field: string): any {
    if (!value || value.trim() === '' || value === 'NULL') {
      return null;
    }

    // Limpiar comillas y espacios
    value = value.trim().replace(/^["']|["']$/g, '');

    // Corregir encoding de caracteres especiales (UTF-8 mal decodificado)
    value = value
        .replace(/Ã€/g, 'À').replace(/Ã�/g, 'Á').replace(/Ã‚/g, 'Â').replace(/Ãƒ/g, 'Ã')
      .replace(/Ã„/g, 'Ä').replace(/Ã…/g, 'Å').replace(/Ã†/g, 'Æ').replace(/Ã‡/g, 'Ç')
      .replace(/Ãˆ/g, 'È').replace(/Ã‰/g, 'É').replace(/ÃŠ/g, 'Ê').replace(/Ã‹/g, 'Ë')
      .replace(/ÃŒ/g, 'Ì').replace(/Ã�/g, 'Í').replace(/ÃŽ/g, 'Î').replace(/Ã�/g, 'Ï')
      .replace(/Ã�/g, 'Ð').replace(/Ã‘/g, 'Ñ').replace(/Ã’/g, 'Ò').replace(/Ã“/g, 'Ó')
      .replace(/Ã”/g, 'Ô').replace(/Ã•/g, 'Õ').replace(/Ã–/g, 'Ö').replace(/Ã—/g, '×')
      .replace(/Ã˜/g, 'Ø').replace(/Ã™/g, 'Ù').replace(/Ãš/g, 'Ú').replace(/Ã›/g, 'Û')
      .replace(/Ãœ/g, 'Ü').replace(/ÃŸ/g, 'ß')
      .replace(/Ã /g, 'à').replace(/Ã¡/g, 'á').replace(/Ã¢/g, 'â').replace(/Ã£/g, 'ã')
      .replace(/Ã¤/g, 'ä').replace(/Ã¥/g, 'å').replace(/Ã¦/g, 'æ').replace(/Ã§/g, 'ç')
      .replace(/Ã¨/g, 'è').replace(/Ã©/g, 'é').replace(/Ãª/g, 'ê').replace(/Ã«/g, 'ë')
      .replace(/Ã¬/g, 'ì').replace(/Ã­/g, 'í').replace(/Ã®/g, 'î').replace(/Ã¯/g, 'ï')
      .replace(/Ã°/g, 'ð').replace(/Ã±/g, 'ñ').replace(/Ã²/g, 'ò').replace(/Ã³/g, 'ó')
      .replace(/Ã´/g, 'ô').replace(/Ãµ/g, 'õ').replace(/Ã¶/g, 'ö').replace(/Ã·/g, '÷')
      .replace(/Ã¸/g, 'ø').replace(/Ã¹/g, 'ù').replace(/Ãº/g, 'ú').replace(/Ã»/g, 'û')
      .replace(/Ã¼/g, 'ü').replace(/â/g, "'").replace(/â/g, '“').replace(/â/g, '”')
        .replace(/â/g, '–').replace(/â/g, '—')
        // Evitar caracteres de control en regex: usar secuencias unicode explícitas
        .replace(/\u0083\u00A9/g, 'é').replace(/\u0083\u00B3/g, 'ó');

    // Fechas - usar parser robusto
    if (field.includes('fecha') && value !== '0' && value !== '0000-00-00') {
      return this.parseFecha(value);
    }

    // Números - usar parser flexible
    if (/(monto|precio|cantidad|presupuesto|porcentaje)/.test(field)) {
      return this.parseNumeroFlexible(value);
    }

    // Booleanos
    if (value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'sí') {
      return true;
    }
    if (value.toLowerCase() === 'false' || value === '0' || value.toLowerCase() === 'no') {
      return false;
    }

    return value;
  }

  private parseFecha(v: string): Date | null {
    if (!v) return null;
    const m = v.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const d = new Date(m[1] + 'T00:00:00Z');
      return isNaN(+d) ? null : d;
    }
    const m2 = v.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (m2) {
      const d = new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00Z`);
      return isNaN(+d) ? null : d;
    }
    return null;
  }

  private parseNumeroFlexible(v: string): number | null {
    if (v == null) return null;
    let s = String(v).trim();
    // Negativos entre paréntesis
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.replace(/^\(|\)$/g, '');
    }
    // Quitar símbolos de moneda y palabras comunes
    s = s
      .replace(/[\s\u00A0]/g, '')
      .replace(/(?:CRC|CRC\.|colones?|col[oó]n(?:es)?)/gi, '')
      .replace(/[₡$€¢]/g, '')
  .replace(/[^0-9,.-]/g, '');
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    const val = negative ? -n : n;
    return isNaN(val) ? null : val;
  }

  // ================================
  // CREACIÓN DE ÍNDICES
  // ================================

  private inicializarIndices(): void {
    INDICES_TABLAS.forEach(indice => {
      const nombreIndice = `${indice.tabla}_${indice.nombre}`;
      this.indices.set(nombreIndice, new Map());
    });
  }

  /**
   * OPTIMIZADO: Crea índices procesando en chunks para evitar bloquear el navegador
   */
  private async crearIndices(): Promise<void> {
    for (const indice of INDICES_TABLAS) {
      const tabla = this.datos.get(indice.tabla);
      if (!tabla) continue;

      const nombreIndice = `${indice.tabla}_${indice.nombre}`;
      const mapaIndice = new Map<string, any[]>();

      // Normalizador de llaves para índices de instituciones/proveedores
      const normKey = (val: any) => typeof val === 'string' ? val.trim().replace(/\D+/g, '') : (val != null ? String(val).trim().replace(/\D+/g, '') : '');

      // OPTIMIZACIÓN: Procesar tabla en chunks
      const chunkSize = 1000;
      for (let i = 0; i < tabla.length; i += chunkSize) {
        const chunk = tabla.slice(i, Math.min(i + chunkSize, tabla.length));
        
        chunk.forEach(registro => {
          const claveIndice = indice.campos
            .map(campo => {
              const v = registro[campo] || '';
              // Forzar normalización solo para campos de IDs conocidos
              if (/^(codigoInstitucion|idProveedor)$/i.test(campo)) return normKey(v);
              return v;
            })
            .join('|');
          
          if (!mapaIndice.has(claveIndice)) {
            mapaIndice.set(claveIndice, []);
          }
          mapaIndice.get(claveIndice)!.push(registro);
        });
        
        // Ceder control al navegador cada chunk
        if (tabla.length > 5000 && i + chunkSize < tabla.length) {
          await this.yieldToMainThread();
        }
      }

      this.indices.set(nombreIndice, mapaIndice);
    }
  }

  private tokenizar(s: string): string[] {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .filter(t => t.length > 2);
  }

  /**
   * OPTIMIZADO: Construye índice de texto procesando en chunks
   */
  private async construirIndiceTexto(): Promise<void> {
    const carteles: any[] = this.obtenerTodosLosCarteles() as any[];
    const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
    const lineasPorCartel = _.groupBy(lineas, 'numeroCartel');
    
    const chunkSize = 500; // Chunks más pequeños para tokenización que es más pesada
    
    for (let i = 0; i < carteles.length; i += chunkSize) {
      const chunk = carteles.slice(i, Math.min(i + chunkSize, carteles.length));
      
      chunk.forEach((c: any) => {
        const texto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''} ${(lineasPorCartel[c.numeroCartel] || [])
          .map((l: any) => l.descripcionLinea || '')
          .join(' ')}`;
        for (const t of this.tokenizar(texto)) {
          if (!this.invertedCartel.has(t)) this.invertedCartel.set(t, new Set());
          this.invertedCartel.get(t)!.add(c.numeroCartel);
        }
      });
      
      // Ceder control al navegador cada chunk
      if (carteles.length > 1000 && i + chunkSize < carteles.length) {
        await this.yieldToMainThread();
      }
    }
  }

  // ================================
  // DASHBOARD PRINCIPAL - CÁLCULOS
  // ================================
  private filterByInstitucionSector(
    filtros?: { institucion?: string[]; sector?: string[]; keywords?: string[] }
  ) {
    const allCarteles: any[] = this.datos.get('DetalleCarteles') || [];
    const allContratos: any[] = this.datos.get('Contratos') || [];
    const sectores = this.asignarSectorPorCartel();
    const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');

    let carteles = allCarteles;
    let contratos = allContratos;

    // FILTRO POR KEYWORDS (texto de búsqueda)
    if (filtros?.keywords?.length) {
      carteles = this.filtrarPorKeywords(carteles, filtros.keywords);
      console.log(`🔍 Filtro por keywords "${filtros.keywords.join(', ')}": ${carteles.length} carteles encontrados`);
    }

    if (filtros?.institucion?.length) {
      const wanted = new Set(filtros.institucion.map(normInst));
      carteles = carteles.filter(c => wanted.has(normInst(c.codigoInstitucion)));
      contratos = contratos.filter(c => wanted.has(normInst(c.codigoInstitucion)));
    }

    if (filtros?.sector?.length) {
      const wantedS = new Set((filtros.sector || []).map(s => s.toLowerCase()));
      carteles = carteles.filter(c => wantedS.has((sectores.get(c.numeroCartel) || 'Otros').toLowerCase()));
      const setNro = new Set(carteles.map(c => c.numeroCartel));
      contratos = contratos.filter(c => c.numeroCartel && setNro.has(c.numeroCartel));
    }

    // SIEMPRE filtrar contratos para que solo incluya los de carteles filtrados
    const cartelesSet = new Set(carteles.map(c => c.numeroCartel));
    contratos = contratos.filter(c => c.numeroCartel && cartelesSet.has(c.numeroCartel));

    return { carteles, contratos, sectores };
  }

  /**
   * Sistema de scoring avanzado para clasificar por sector/categoría.
   * Calcula un score basado en:
   * - Número de palabras clave que coinciden
   * - Bonus por palabras clave más específicas (más largas)
   * - Criterio de desempate por total de keywords
   */
  private clasificarSectorPorDescripcion(descripcion: string): string {
    const texto = (descripcion || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
    
    // Usar getSectorRules() para incluir categorías manuales
    const allRules = this.getSectorRules();
    
    let bestMatch = {
      sector: 'Otros',
      score: 0,
      totalKeywords: 0
    };
    
    for (const [sector, reglas] of Object.entries(allRules)) {
      // Calcular score: número de RegExp que coinciden
      let score = 0;
      let specificityBonus = 0;
      
      for (const regex of reglas) {
        if (regex.test(texto)) {
          score++;
          
          // Bonus por especificidad: palabras clave más largas son más específicas
          const regexSource = regex.source;
          if (regexSource.length > 10) {
            specificityBonus += 0.5;
          } else if (regexSource.length > 6) {
            specificityBonus += 0.2;
          }
        }
      }
      
      const totalScore = score + specificityBonus;
      
      // Actualizar mejor match si:
      // 1. Score es mayor
      // 2. Score es igual pero tiene más keywords (más específica)
      if (totalScore > bestMatch.score || 
          (totalScore === bestMatch.score && reglas.length > bestMatch.totalKeywords)) {
        bestMatch = {
          sector,
          score: totalScore,
          totalKeywords: reglas.length
        };
      }
    }
    
    // Solo retornar categoría si tiene al menos 1 match
    return bestMatch.score > 0 ? bestMatch.sector : 'Otros';
  }

  /**
   * Sistema de scoring avanzado para clasificar subcategorías.
   * Usa la misma lógica que clasificarSectorPorDescripcion pero para subcategorías.
   */
  private clasificarSubcategoria(sector: string, descripcion: string): string {
    const texto = (descripcion || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
    
    // Combinar reglas del sistema con subcategorías manuales/overrides
    const combinedRules = this.getSubcategoryRules(sector);
    
    let bestMatch = {
      subcategoria: 'General',
      score: 0,
      totalKeywords: 0
    };
    
    for (const [sub, regexArray] of Object.entries(combinedRules)) {
      // Calcular score: número de RegExp que coinciden
      let score = 0;
      let specificityBonus = 0;
      
      for (const regex of regexArray) {
        if (regex.test(texto)) {
          score++;
          
          // Bonus por especificidad: palabras clave más largas son más específicas
          const regexSource = regex.source;
          if (regexSource.length > 10) {
            specificityBonus += 0.5;
          } else if (regexSource.length > 6) {
            specificityBonus += 0.2;
          }
        }
      }
      
      const totalScore = score + specificityBonus;
      
      // Actualizar mejor match si:
      // 1. Score es mayor
      // 2. Score es igual pero tiene más keywords (más específica)
      if (totalScore > bestMatch.score || 
          (totalScore === bestMatch.score && regexArray.length > bestMatch.totalKeywords)) {
        bestMatch = {
          subcategoria: sub,
          score: totalScore,
          totalKeywords: regexArray.length
        };
      }
    }
    
    // Solo retornar subcategoría si tiene al menos 1 match
    return bestMatch.score > 0 ? bestMatch.subcategoria : 'General';
  }

  /**
   * Obtiene las reglas de subcategorías para un sector específico
   * Incluye reglas del sistema + subcategorías manuales + overrides
   * ✅ OPTIMIZADO con caché
   */
  private getSubcategoryRules(sector: string): Record<string, RegExp[]> {
    // ✅ Usar caché si existe para este sector
    if (this.subcategoryRulesCache.has(sector)) {
      return this.subcategoryRulesCache.get(sector)!;
    }
    
    const combined: Record<string, RegExp[]> = {};
    
    // 1. Reglas del sistema
    const systemRules = this.SUBCATEGORY_RULES[sector];
    if (systemRules) {
      for (const [sub, regexes] of Object.entries(systemRules)) {
        combined[sub] = [...regexes];
      }
    }
    
    // 2. Subcategorías de overrides/configuración
    try {
      const configJson = localStorage.getItem('sicop.subcategoryConfiguration.v1');
      if (configJson) {
        const config = JSON.parse(configJson);
        const overrides = config.overrides?.[sector] || [];
        
        for (const subcatRule of overrides) {
          if (!subcatRule.activa || !Array.isArray(subcatRule.palabrasClave)) continue;
          
          const regexes: RegExp[] = [];
          for (const keyword of subcatRule.palabrasClave) {
            try {
              const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              regexes.push(new RegExp(`\\b${pattern}\\b`, 'iu'));
            } catch (e) {
              console.warn(`[DataManager] Error creando regex para subcategoría "${keyword}":`, e);
            }
          }
          
          if (regexes.length > 0) {
            if (combined[subcatRule.nombre]) {
              combined[subcatRule.nombre] = [...combined[subcatRule.nombre], ...regexes];
            } else {
              combined[subcatRule.nombre] = regexes;
            }
          }
        }
      }
    } catch (error) {
      console.warn('[DataManager] Error cargando subcategorías manuales:', error);
    }
    
    // 3. Subcategorías de categorías manuales
    try {
      const rulesJson = localStorage.getItem('sicop.manualCategories.v1');
      if (rulesJson) {
        const rules = JSON.parse(rulesJson);
        if (Array.isArray(rules)) {
          for (const rule of rules) {
            if (rule.nombre === sector && Array.isArray(rule.subcategorias)) {
              for (const subcat of rule.subcategorias) {
                if (!subcat.activa || !Array.isArray(subcat.palabrasClave)) continue;
                
                const regexes: RegExp[] = [];
                for (const keyword of subcat.palabrasClave) {
                  try {
                    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexes.push(new RegExp(`\\b${pattern}\\b`, 'iu'));
                  } catch (e) {
                    console.warn(`[DataManager] Error creando regex para subcategoría manual "${keyword}":`, e);
                  }
                }
                
                if (regexes.length > 0) {
                  if (combined[subcat.nombre]) {
                    combined[subcat.nombre] = [...combined[subcat.nombre], ...regexes];
                  } else {
                    combined[subcat.nombre] = regexes;
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('[DataManager] Error cargando subcategorías de categorías manuales:', error);
    }
    
    // ✅ Cachear resultado para este sector
    this.subcategoryRulesCache.set(sector, combined);
    
    return combined;
  }

  private asignarSectorPorCartel(): Map<string, string> {
    // ✅ OPTIMIZACIÓN: Usar caché si es válido
    if (this.sectorPorCartelCache && this.isCacheValid('sectores', this.sectorCacheTimestamp)) {
      this.cacheStats.sectores.hits++;
      if (this.loggingMode === 'verbose') {
        console.log('✅ Cache HIT: asignarSectorPorCartel (ahorro ~1-2s)');
      }
      return this.sectorPorCartelCache;
    }
    
    this.cacheStats.sectores.misses++;
    if (this.loggingMode === 'verbose') {
      console.log('❌ Cache MISS: asignarSectorPorCartel - calculando...');
    }
    
    const startTime = Date.now();
    
    const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
    const carteles: any[] = this.datos.get('DetalleCarteles') || [];
    const porCartel = _.groupBy(lineas, 'numeroCartel');
    const cartelPorId = new Map<string, any>(carteles.map(c => [c.numeroCartel, c]));
    const sectorPorCartel = new Map<string, string>();

    const votar = (score: Record<string, number>, texto?: string) => {
      if (!texto) return;
      const sec = this.clasificarSectorPorDescripcion(texto);
      score[sec] = (score[sec] || 0) + 1;
    };

    // Para todos los carteles conocidos (con o sin líneas), asignar sector
    const ids = new Set<string>([...Object.keys(porCartel), ...carteles.map(c => c.numeroCartel).filter(Boolean)]);
    ids.forEach(nro => {
      const score: Record<string, number> = {};
      const arr = porCartel[nro] || [];
      // Votos por descripciones de líneas
      arr.forEach((l: any) => votar(score, l.descripcionLinea));
      // También votar por nombre/descr del cartel para robustez
      const c = cartelPorId.get(nro);
      if (c) {
        votar(score, c.nombreCartel);
        votar(score, c.descripcionCartel);
        votar(score, c.clasificacionObjeto); // CLAS_OBJ mapeado
      }
      
      // ✅ MEJORA: Si hay al menos una categoría específica (no "Otros"), 
      // dar prioridad a esa categoría sobre "Otros"
      let ganador: string;
      if (Object.keys(score).length === 0) {
        ganador = 'Otros';
      } else {
        // Filtrar categorías específicas (excluir "Otros")
        const categoriasEspecificas = Object.entries(score).filter(([cat, _]) => cat !== 'Otros');
        
        if (categoriasEspecificas.length > 0) {
          // Si hay categorías específicas, elegir la que tiene más votos entre ellas
          ganador = categoriasEspecificas.sort((a, b) => b[1] - a[1])[0][0];
        } else {
          // Si solo hay "Otros", usar "Otros"
          ganador = 'Otros';
        }
      }
      
      sectorPorCartel.set(nro, ganador);
    });
    
    // ✅ Cachear resultado
    this.sectorPorCartelCache = sectorPorCartel;
    this.sectorCacheTimestamp = Date.now();
    
    const elapsed = Date.now() - startTime;
    console.log(`🔍 Clasificación de sectores completada en ${elapsed}ms (${sectorPorCartel.size} carteles)`);
    
    return sectorPorCartel;
  }

  private calcularMontosPorCartelDesdeLineas(): Map<string, number> {
    const lc: any[] = this.datos.get('LineasContratadas') || [];
    const montos = new Map<string, number>();
    const toNum = (v: any): number => {
      const n = typeof v === 'number' ? v : this.parseNumeroFlexible(String(v));
      return n != null && !isNaN(n) ? n : 0;
    };
    const parseMaybe = (val: any): number | null => {
      if (val == null) return null;
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') return this.parseNumeroFlexible(val);
      return null;
    };
    const firstNumber = (obj: any, keys: string[]): number | null => {
      for (const k of keys) {
        if (obj[k] != null) {
          const n = parseMaybe(obj[k]);
          if (n != null) return n;
        }
      }
      return null;
    };
    const scanByPattern = (obj: any, pattern: RegExp): number | null => {
      let best: number | null = null;
      for (const key of Object.keys(obj || {})) {
        if (pattern.test(key)) {
          const n = parseMaybe(obj[key]);
          if (n != null && n > 0 && (best == null || n > best)) best = n;
        }
      }
      return best;
    };
    const calcularMontoLineaCRC = (o: any): number => {
      if (!o) return 0;
      const precio = firstNumber(o, [
        'precioAdjudicado', 'precio_adjudicado',
        'precioUnitario', 'precio_unitario',
        'precioUnitarioAdjudicado', 'precio_unitario_adjudicado',
        'precioUnitarioEstimado', 'precio_unitario_estimado',
        'precio'
      ]) ?? scanByPattern(o, /precio/i) ?? 0;
      const cantidad = firstNumber(o, [
        'cantidadAdjudicada', 'cantidad_adjudicada',
        'cantidadContratada', 'cantidad_contratada',
        'cantidadSolicitada', 'cantidad_solicitada',
        'cantidadRequerida', 'cantidad_requerida',
        'cantidad'
      ]) ?? scanByPattern(o, /canti/i) ?? 0;
      let subtotal = (precio || 0) * (cantidad || 0);
      const descuento = toNum(o.descuento);
      const iva = toNum(o.iva);
      const otros = toNum(o.otros_impuestos);
      const acarreos = toNum(o.acarreos);
      subtotal = subtotal - descuento + iva + otros + acarreos;
      // Conversión a CRC si es necesario
      const moneda = (o.tipoMoneda || o.tipo_moneda || '').toString().toUpperCase();
      if (moneda === 'USD') {
        const tcCRC = toNum(o.tipo_cambio_crc);
        if (tcCRC > 0) subtotal *= tcCRC;
      }
      return subtotal > 0 && isFinite(subtotal) ? subtotal : 0;
    };
    const extraerMonto = (o: any): number | null => {
      if (!o) return null;
      const directo = firstNumber(o, [
        'montoLineaContratada', 'monto_linea_contratada',
        'montoLineaAdjudicada', 'monto_linea_adjudicada',
        'montoLinea', 'monto_linea',
        'monto', 'montoTotal', 'monto_total',
        'monto_total_adjudicado', 'monto_total_linea',
        'montoEstimado', 'monto_estimado',
        'montoOferta', 'monto_oferta',
      ]);
      if (directo != null) return directo;
      const montoScan = scanByPattern(o, /monto/i);
      if (montoScan != null) return montoScan;
      const montoLinea = calcularMontoLineaCRC(o);
      if (montoLinea) return montoLinea;
      return null;
    };
    lc.forEach(l => {
      const k = l.numeroCartel;
      if (!k) return;
      const v = extraerMonto(l) ?? 0;
      montos.set(k, (montos.get(k) || 0) + v);
    });
    let totalActual = Array.from(montos.values()).reduce((a, b) => a + (b || 0), 0);
    if (montos.size === 0 || totalActual === 0) {
      // Fallback intermedio: usar LineasAdjudicadas si existen
      const la: any[] = this.datos.get('LineasAdjudicadas') || [];
      la.forEach(a => {
        const k = a.numeroCartel;
        if (!k) return;
        // Intentar cálculo con CRC y luego genérico
        const v = calcularMontoLineaCRC(a) || (extraerMonto(a) ?? 0);
        montos.set(k, (montos.get(k) || 0) + v);
      });
      totalActual = Array.from(montos.values()).reduce((a, b) => a + (b || 0), 0);
    }
    if (montos.size === 0 || totalActual === 0) {
      // Fallback 1: usar AdjudicacionesFirme si existen
      const adj: any[] = this.datos.get('AdjudicacionesFirme') || [];
      adj.forEach(a => {
        if (!a.numeroCartel) return;
        const v = extraerMonto(a) ?? 0;
        montos.set(a.numeroCartel, (montos.get(a.numeroCartel) || 0) + v);
      });
    }
    totalActual = Array.from(montos.values()).reduce((a, b) => a + (b || 0), 0);
    if (montos.size === 0 || totalActual === 0) {
      // Fallback 2: agregar montos desde Contratos agrupado por número de cartel
      const contratos: any[] = this.datos.get('Contratos') || [];
      contratos.forEach(c => {
        if (!c.numeroCartel) return;
        const v = extraerMonto(c) ?? 0;
        montos.set(c.numeroCartel, (montos.get(c.numeroCartel) || 0) + v);
      });
      totalActual = Array.from(montos.values()).reduce((a, b) => a + (b || 0), 0);
    }
    // Fallback adicional: si todavía no hay montos, usar DetalleLineaCartel (estimaciones por línea)
    if (montos.size === 0 || totalActual === 0) {
      const detallesLineas: any[] = this.datos.get('DetalleLineaCartel') || [];
      if (detallesLineas.length) {
        const porCartelDL = _.groupBy(detallesLineas, 'numeroCartel');
        for (const [k, arr] of Object.entries(porCartelDL)) {
          if (!k) continue;
          const subtotal = (arr as any[]).reduce((s, o) => {
            const precioRaw = o.presupuestoLinea ?? o.precioUnitarioEstimado ?? o.precio_unitario_estimado ?? o.precioUnitario ?? o.precio;
            const cantidadRaw = o.cantidadRequerida ?? o.cantidadSolicitada ?? o.cantidad_solicitada ?? o.cantidad ?? 0;
            const precio = typeof precioRaw === 'number' ? precioRaw : this.parseNumeroFlexible(String(precioRaw || '')) || 0;
            const cantidad = typeof cantidadRaw === 'number' ? cantidadRaw : this.parseNumeroFlexible(String(cantidadRaw || '')) || 0;
            const v = (precio || 0) * (cantidad || 0);
            return s + (isFinite(v) ? v : 0);
          }, 0);
          if (subtotal > 0) montos.set(k, (montos.get(k) || 0) + subtotal);
        }
        totalActual = Array.from(montos.values()).reduce((a, b) => a + (b || 0), 0);
        console.log(`🔁 Fallback DetalleLineaCartel aplicado: agregados montos para ${montos.size} carteles, total=${totalActual}`);
      }
    }
    if (montos.size === 0 || totalActual === 0) {
      // Fallback 3: usar presupuesto oficial por cartel si existe
      const carteles: any[] = this.datos.get('DetalleCarteles') || [];
      carteles.forEach(c => {
        if (!c.numeroCartel) return;
        const v = toNum(c.presupuestoOficial);
        if (v > 0) montos.set(c.numeroCartel, (montos.get(c.numeroCartel) || 0) + v);
      });
    }
    return montos;
  }

  // Calcula montos por cartel usando el monto estimado del cartel (presupuestoOficial)
  // Este método se alinea con el enfoque del analizador especializado en Python (MONTO_EST)
  // ✅ OPTIMIZADO con caché
  private calcularMontosEstimadosPorCartel(): Map<string, number> {
    // ✅ Usar caché si es válido
    if (this.montosPorCartelCache && this.isCacheValid('montos', this.montosCacheTimestamp)) {
      this.cacheStats.montos.hits++;
      if (this.loggingMode === 'verbose') {
        console.log('✅ Cache HIT: calcularMontosEstimadosPorCartel');
      }
      return this.montosPorCartelCache;
    }
    
    this.cacheStats.montos.misses++;
    if (this.loggingMode === 'verbose') {
      console.log('❌ Cache MISS: calcularMontosEstimadosPorCartel - calculando...');
    }
    
    const startTime = Date.now();
    
    const carteles: any[] = this.datos.get('DetalleCarteles') || [];
    const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
    const montos = new Map<string, number>();
    const toNum = (v: any): number => {
      if (typeof v === 'number') return isFinite(v) ? v : 0;
      if (v == null) return 0;
      const n = this.parseNumeroFlexible(String(v));
      return n != null && isFinite(n) ? n : 0;
    };

    carteles.forEach(c => {
      const k = c.numeroCartel;
      if (!k) return;
      const val = toNum(c.presupuestoOficial);
      if (val > 0) montos.set(k, val);
    });

    // Backfill por cartel con estimaciones de líneas cuando no hay presupuestoOficial (>0)
    if (lineas.length) {
      const porCartel = _.groupBy(lineas, 'numeroCartel');
      for (const [k, arr] of Object.entries(porCartel)) {
        if (!k) continue;
        const ya = montos.get(k);
        if (ya && ya > 0) continue;
        const subtotal = (arr as any[]).reduce((s, o) => {
          const precio = (o.presupuestoLinea ?? o.precioUnitarioEstimado ?? o.precio_unitario_estimado);
          const cantidad = (o.cantidadRequerida ?? o.cantidadSolicitada ?? 1);
          const p = toNum(precio);
          const c = toNum(cantidad) || 1;
          const v = p * c;
          return s + (isFinite(v) ? v : 0);
        }, 0);
        if (subtotal > 0) montos.set(k, subtotal);
      }
    }

    // ✅ Cachear resultado
    this.montosPorCartelCache = montos;
    this.montosCacheTimestamp = Date.now();
    
    const elapsed = Date.now() - startTime;
    console.log(`💰 Cálculo de montos completado en ${elapsed}ms (${montos.size} carteles)`);

    return montos;
  }

  // Genera una traza detallada de cómo se calculó el monto por cartel
  public generarDebugMontosPorCartel(): any[] {
    const lineasContr: any[] = this.datos.get('LineasContratadas') || [];
    const lineasAdj: any[] = this.datos.get('LineasAdjudicadas') || [];
    const adjFirmes: any[] = this.datos.get('AdjudicacionesFirme') || [];
    const contratos: any[] = this.datos.get('Contratos') || [];
    const carteles: any[] = this.datos.get('DetalleCarteles') || [];

    const porCartelLC = _.groupBy(lineasContr, 'numeroCartel');
    const porCartelLA = _.groupBy(lineasAdj, 'numeroCartel');
    const porCartelAdj = _.groupBy(adjFirmes, 'numeroCartel');
    const porCartelCont = _.groupBy(contratos, 'numeroCartel');
    const cartelIndex = new Map(carteles.map((c: any) => [c.numeroCartel, c]));

    const ids = new Set<string>([
      ...Object.keys(porCartelLC),
      ...Object.keys(porCartelLA),
      ...Object.keys(porCartelAdj),
      ...Object.keys(porCartelCont),
      ...carteles.map((c: any) => c.numeroCartel).filter(Boolean)
    ] as string[]);

    const toNum = (v: any): number => {
      const n = typeof v === 'number' ? v : this.parseNumeroFlexible(String(v));
      return n != null && !isNaN(n) ? n : 0;
    };

    const calcularMontoLineaCRC = (o: any): number => {
      // Copia del método interno usado en cálculos agregados para consistencia
      const precio = (() => {
        const keys = [
          'precioAdjudicado','precio_adjudicado','precioUnitario','precio_unitario',
          'precioUnitarioAdjudicado','precio_unitario_adjudicado','precioUnitarioEstimado','precio_unitario_estimado','precio'
        ];
        for (const k of keys) { if (o[k] != null) { const n = toNum(o[k]); if (n) return n; } }
        for (const k of Object.keys(o)) { if (/precio/i.test(k)) { const n = toNum(o[k]); if (n) return n; } }
        return 0;
      })();
      const cantidad = (() => {
        const keys = [
          'cantidadAdjudicada','cantidad_adjudicada','cantidadContratada','cantidad_contratada',
          'cantidadSolicitada','cantidad_solicitada','cantidadRequerida','cantidad_requerida','cantidad'
        ];
        for (const k of keys) { if (o[k] != null) { const n = toNum(o[k]); if (n) return n; } }
        for (const k of Object.keys(o)) { if (/canti/i.test(k)) { const n = toNum(o[k]); if (n) return n; } }
        return 0;
      })();
      let subtotal = (precio || 0) * (cantidad || 0);
      const descuento = toNum(o.descuento);
      const iva = toNum(o.iva);
      const otros = toNum(o.otros_impuestos);
      const acarreos = toNum(o.acarreos);
      subtotal = subtotal - descuento + iva + otros + acarreos;
      const moneda = (o.tipoMoneda || o.tipo_moneda || '').toString().toUpperCase();
      if (moneda === 'USD') {
        const tcCRC = toNum(o.tipo_cambio_crc);
        if (tcCRC > 0) subtotal *= tcCRC;
      }
      return subtotal > 0 && isFinite(subtotal) ? subtotal : 0;
    };

    const extraerMonto = (o: any): number | null => {
      const preferred = [
        'montoLineaContratada','monto_linea_contratada','montoLineaAdjudicada','monto_linea_adjudicada',
        'montoLinea','monto_linea','monto','montoTotal','monto_total','monto_total_adjudicado','montoEstimado','monto_estimado','montoOferta','monto_oferta',
        'montoContrato','monto_contrato'
      ];
      for (const k of preferred) { if (o[k] != null) { const n = toNum(o[k]); if (n) return n; } }
      for (const k of Object.keys(o)) { if (/monto/i.test(k)) { const n = toNum(o[k]); if (n) return n; } }
      const calc = calcularMontoLineaCRC(o);
      return calc || null;
    };

    const debug: any[] = [];
    ids.forEach((id) => {
      const lc = porCartelLC[id] || [];
      const la = porCartelLA[id] || [];
      const ad = porCartelAdj[id] || [];
      const ct = porCartelCont[id] || [];
      const cartel = cartelIndex.get(id) || {};

      const stepLC = (() => {
        const items = lc.map((x: any) => {
          const monto = extraerMonto(x) ?? 0;
          const moneda = (x.tipoMoneda || x.tipo_moneda || '').toString().toUpperCase() || null;
          const tc = x.tipo_cambio_crc != null ? toNum(x.tipo_cambio_crc) : null;
          return {
            numeroLinea: x.numeroLinea ?? null,
            precio: x.precioAdjudicado ?? x.precioUnitario ?? null,
            cantidad: x.cantidadAdjudicada ?? x.cantidadContratada ?? x.cantidad ?? null,
            moneda, tipo_cambio_crc: tc, monto_crc: monto || 0
          };
        });
        const total = _.sumBy(items, 'monto_crc');
        const zeros = items.filter((i: any) => !i.monto_crc).length;
        return { source: 'LineasContratadas', attempted: items.length > 0, items_count: items.length, zeros, total_crc: total, examples: items.slice(0, 5) };
      })();

      const stepLA = (() => {
        const items = la.map((x: any) => {
          const monto = extraerMonto(x) ?? 0;
          const moneda = (x.tipoMoneda || x.tipo_moneda || '').toString().toUpperCase() || null;
          const tc = x.tipo_cambio_crc != null ? toNum(x.tipo_cambio_crc) : null;
          return {
            numeroLinea: x.numeroLinea ?? null,
            precio: x.precioAdjudicado ?? x.precioUnitario ?? null,
            cantidad: x.cantidadAdjudicada ?? x.cantidad ?? null,
            moneda, tipo_cambio_crc: tc, monto_crc: monto || 0
          };
        });
        const total = _.sumBy(items, 'monto_crc');
        const zeros = items.filter((i: any) => !i.monto_crc).length;
        return { source: 'LineasAdjudicadas', attempted: items.length > 0, items_count: items.length, zeros, total_crc: total, examples: items.slice(0, 5) };
      })();

      const stepAdj = (() => {
        const items = ad.map((x: any) => ({ monto_crc: extraerMonto(x) ?? 0 }));
        const total = _.sumBy(items, 'monto_crc');
        const zeros = items.filter((i: any) => !i.monto_crc).length;
        return { source: 'AdjudicacionesFirme', attempted: items.length > 0, items_count: items.length, zeros, total_crc: total };
      })();

      const stepCont = (() => {
        const items = ct.map((x: any) => ({ monto_crc: extraerMonto(x) ?? 0 }));
        const total = _.sumBy(items, 'monto_crc');
        const zeros = items.filter((i: any) => !i.monto_crc).length;
        return { source: 'Contratos', attempted: items.length > 0, items_count: items.length, zeros, total_crc: total };
      })();

      const stepPres = (() => {
        const val = toNum(cartel?.presupuestoOficial);
        return { source: 'PresupuestoOficial', attempted: !!cartel && val > 0, items_count: val > 0 ? 1 : 0, zeros: val === 0 ? 1 : 0, total_crc: val };
      })();

  // Preferir el presupuesto oficial cuando exista (> 0), luego líneas/otras fuentes
  const steps = [stepPres, stepLC, stepLA, stepAdj, stepCont];
  const chosen = steps.find(s => s.total_crc && s.total_crc > 0) || { source: 'N/A', total_crc: 0 };

      debug.push({
        numeroCartel: id,
        codigoInstitucion: cartel?.codigoInstitucion ?? null,
        nombreCartel: cartel?.nombreCartel ?? null,
        presupuestoOficial: toNum(cartel?.presupuestoOficial) || null,
        chosen_source: chosen.source,
        monto_final_crc: chosen.total_crc || 0,
        steps
      });
    });

    return debug;
  }

  private extraerMontoGenerico(obj: any): number | null {
    if (!obj) return null;
    const parseMaybe = (val: any): number | null => {
      if (val == null) return null;
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') return this.parseNumeroFlexible(val);
      return null;
    };
    const preferred = [
      'montoContrato', 'monto_contrato', 'monto_total_contrato',
      'monto', 'montoTotal', 'monto_total', 'monto_total_adjudicado',
      'monto_adjudicado', 'monto_estimado', 'monto_oferta'
    ];
    for (const k of preferred) {
      if (obj[k] != null) {
        const n = parseMaybe(obj[k]);
        if (n != null) return n;
      }
    }
    let best: number | null = null;
    for (const key of Object.keys(obj)) {
      if (/monto/i.test(key)) {
        const n = parseMaybe(obj[key]);
        if (n != null && n > 0 && (best == null || n > best)) best = n;
      }
    }
    if (best != null) return best;
    const precio = Object.keys(obj).reduce<number | null>((acc, k) => acc ?? (/precio/i.test(k) ? parseMaybe(obj[k]) : null), null);
    const cant = Object.keys(obj).reduce<number | null>((acc, k) => acc ?? (/canti/i.test(k) ? parseMaybe(obj[k]) : null), null);
    if (precio != null && cant != null) return precio * cant;
    return null;
  }

  private generarTendenciasMensuales(
    carteles?: any[], contratos?: any[], ofertas?: any[]
  ): { mes: string; cantidad: number; monto: number; ofertas: number }[] {
    carteles = carteles ?? (this.datos.get('DetalleCarteles') || []);
    contratos = contratos ?? (this.datos.get('Contratos') || []);
    ofertas = ofertas ?? (this.datos.get('Ofertas') || []);

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ mes: meses[i], cantidad: 0, monto: 0, ofertas: 0 }));

    carteles.forEach(c => {
      const d: Date | null = c.fechaPublicacion || null;
      if (!d || isNaN(+new Date(d))) return;
      const m = new Date(d).getUTCMonth();
      if (m >= 0) byMonth[m].cantidad += 1;
    });

    contratos.forEach(ct => {
      const d: Date | null = ct.fechaFirma || null;
      if (!d || isNaN(+new Date(d))) return;
      const m = new Date(d).getUTCMonth();
      if (m >= 0) {
        const val = this.extraerMontoGenerico(ct) ?? 0;
        byMonth[m].monto += val;
      }
    });

    ofertas.forEach(o => {
      const d: Date | null = o.fechaOferta || null;
      if (!d || isNaN(+new Date(d))) return;
      const m = new Date(d).getUTCMonth();
      if (m >= 0) byMonth[m].ofertas += 1;
    });

    return byMonth;
  }

  private generarTendenciasDiarias(
    diasAtras: number = 30,
    carteles?: any[], contratos?: any[], ofertas?: any[]
  ): { dia: string; cantidad: number; monto: number; ofertas: number }[] {
    carteles = carteles ?? (this.datos.get('DetalleCarteles') || []);
    contratos = contratos ?? (this.datos.get('Contratos') || []);
    ofertas = ofertas ?? (this.datos.get('Ofertas') || []);

    const parseDate = (d: any): Date | null => {
      if (!d) return null;
      const dd = new Date(d);
      return isNaN(+dd) ? null : dd;
    };

    const allDates: Date[] = [];
    carteles.forEach(c => { const d = parseDate(c.fechaPublicacion); if (d) allDates.push(d); });
    contratos.forEach(c => { const d = parseDate(c.fechaFirma); if (d) allDates.push(d); });
    ofertas.forEach(o => { const d = parseDate(o.fechaOferta); if (d) allDates.push(d); });

    const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
    // Normalizar a medianoche UTC para evitar offsets
    const end = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (diasAtras - 1));

    const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;

    const byDayMap = new Map<string, { dia: string; cantidad: number; monto: number; ofertas: number }>();
    for (let i = 0; i < diasAtras; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = fmt(d);
      byDayMap.set(key, { dia: key, cantidad: 0, monto: 0, ofertas: 0 });
    }

    const within = (dd: Date | null) => dd && dd >= start && dd <= end;

    carteles.forEach(c => {
      const d = parseDate(c.fechaPublicacion);
      if (!d || !within(d)) return;
      const key = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
      const row = byDayMap.get(key);
      if (row) row.cantidad += 1;
    });

    contratos.forEach(ct => {
      const d = parseDate(ct.fechaFirma);
      if (!d || !within(d)) return;
      const key = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
      const row = byDayMap.get(key);
      if (row) row.monto += this.extraerMontoGenerico(ct) ?? 0;
    });

    ofertas.forEach(o => {
      const d = parseDate(o.fechaOferta);
      if (!d || !within(d)) return;
      const key = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
      const row = byDayMap.get(key);
      if (row) row.ofertas += 1;
    });

    return Array.from(byDayMap.values());
  }

  public getDashboardMetrics(filtros?: { institucion?: string[]; sector?: string[]; keywords?: string[] }) {
    // 🚀 CACHE: Verificar si tenemos métricas cacheadas para estos filtros
    const cacheKey = this.getCacheKey('dashboard', filtros);
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && this.isCacheValid('dashboard', cached.timestamp)) {
      this.cacheStats.dashboard.hits++;
      console.log('✅ Cache hit: getDashboardMetrics');
      return cached.data;
    }
    this.cacheStats.dashboard.misses++;
    
    const startTime = performance.now();
    const { carteles, contratos, sectores } = this.filterByInstitucionSector(filtros);
    
    // Filtrar ofertas y proveedores según los carteles seleccionados
    const cartelesSet = new Set(carteles.map(c => c.numeroCartel));
    const allOfertas: any[] = this.datos.get('Ofertas') || [];
    const ofertas = allOfertas.filter(o => cartelesSet.has(o.numeroCartel));
    
    // Proveedores únicos que participaron en estos carteles (ofertas)
    const proveedoresUnicos = new Set(ofertas.map(o => o.idProveedor).filter(Boolean));
    const total_proveedores = proveedoresUnicos.size;

    // Filtrar líneas según los carteles seleccionados
    const allLineas: any[] = this.datos.get('DetalleLineaCartel') || [];
    const lineas = allLineas.filter(l => cartelesSet.has(l.numeroCartel));
    const total_lineas = lineas.length;

    const total_carteles = carteles.length;
    const total_contratos = contratos.length;
    const total_ofertas = ofertas.length;
    const promedio_lineas_por_cartel = total_carteles ? (total_lineas / total_carteles) : 0;

    // Debug logging para ver qué datos tenemos
    if (carteles.length > 0) {
      console.log('🔍 Filtrado:', {
        carteles: carteles.length,
        contratos: contratos.length,
        ofertas: ofertas.length,
        proveedoresUnicos: total_proveedores,
        lineas: lineas.length,
        promedioLineasPorCartel: promedio_lineas_por_cartel.toFixed(1)
      });
    }

    const tasa_exito = total_carteles ? (total_contratos / total_carteles) * 100 : 0;
  // Métricas derivadas se computan en el cliente cuando se requieren

  // Base financiera: para clasificación por licitación, usar presupuesto del cartel (MONTO_EST)
  // Calcular montos SOLO de los carteles filtrados
  const allMontosPorCartel = this.calcularMontosEstimadosPorCartel();
  const montosPorCartel = new Map<string, number>();
  carteles.forEach(c => {
    if (c.numeroCartel && allMontosPorCartel.has(c.numeroCartel)) {
      montosPorCartel.set(c.numeroCartel, allMontosPorCartel.get(c.numeroCartel)!);
    }
  });
  let monto_total_contratos = Array.from(montosPorCartel.values()).reduce((a, b) => a + (b || 0), 0);

    // Crecimiento contratos (interanual si hay datos)
    const porAnio = _.groupBy(contratos.filter((c: any) => c.fechaFirma), (c: any) => new Date(c.fechaFirma).getUTCFullYear());
    const anios = Object.keys(porAnio).map(n => parseInt(n, 10)).sort((a,b) => a-b);
    let crecimiento_contratos = 0;
    if (anios.length >= 2) {
      const a2 = anios[anios.length-1];
      const a1 = anios[anios.length-2];
      const v2 = porAnio[a2]?.length || 0;
      const v1 = porAnio[a1]?.length || 0;
      crecimiento_contratos = v1 ? ((v2 - v1) / v1) * 100 : 0;
    }

    // Asignación de sector por cartel y agregados
  const sectorPorCartel = sectores; // ya calculado
    console.log('🔍 Sector assignment sample:', Array.from(sectorPorCartel.entries()).slice(0, 10));

  const instPorCartel = new Map<string, string>();
  const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
  carteles.forEach((c: any) => { if (c.numeroCartel) instPorCartel.set(c.numeroCartel, normInst(c.codigoInstitucion)); });

    const cuentaPorSector: Record<string, number> = {};
    const montoPorSector: Record<string, number> = {};
    const instPorSector: Record<string, Set<string>> = {};

    carteles.forEach((c: any) => {
      const sec = sectorPorCartel.get(c.numeroCartel) || 'Otros';
      cuentaPorSector[sec] = (cuentaPorSector[sec] || 0) + 1;
      montoPorSector[sec] = (montoPorSector[sec] || 0) + (montosPorCartel.get(c.numeroCartel) || 0);
      if (!instPorSector[sec]) instPorSector[sec] = new Set();
  if (c.codigoInstitucion) instPorSector[sec].add(normInst(c.codigoInstitucion));
    });

    // Obtener categorías activas (incluye manuales y respeta configuración)
    const activeRules = this.getSectorRules();
    const sector_entries = Object.keys({ ...activeRules, Otros: [] }).map(sector => {
      const count = cuentaPorSector[sector] || 0;
      const total_monto = montoPorSector[sector] || 0;
      const porcentaje = total_carteles ? (count / total_carteles) * 100 : 0;
      return {
        sector,
        count,
        percentage: Math.round(porcentaje * 10) / 10,
        total_monto,
        promedio_monto: count ? total_monto / count : 0,
        instituciones_unicas: (instPorSector[sector]?.size || 0)
      };
    }).sort((a, b) => b.count - a.count);

    // Subcategorías por sector: asignar una subcategoría por cartel según sus líneas
    const subcatPorSector: Record<string, Record<string, number>> = {};
    const subcatMontoPorSector: Record<string, Record<string, number>> = {};
    const lineasPorCartel = _.groupBy(this.datos.get('DetalleLineaCartel') || [], 'numeroCartel');
    const cartelPorId = new Map(carteles.map((c: any) => [c.numeroCartel, c]));
    Array.from(sectorPorCartel.entries()).forEach(([nro, sec]) => {
      if (sec === 'Otros') return; // no desglosar subcategorías para sector indefinido
      const arr = lineasPorCartel[nro] || [];
      const score: Record<string, number> = {};
      const votar = (texto?: string) => {
        if (!texto) return;
        const sub = this.clasificarSubcategoria(sec, texto || '');
        score[sub] = (score[sub] || 0) + 1;
      };
      // Votos por líneas
      arr.forEach((l: any) => votar(l.descripcionLinea));
      // Votos por título/descr/clasificación del cartel
      const c = cartelPorId.get(nro);
      if (c) {
        votar(c.nombreCartel);
        votar(c.descripcionCartel);
        votar(c.clasificacionObjeto);
      }
      let ganador = 'Otros';
      if (Object.keys(score).length) {
        const candidatos = Object.entries(score).filter(([sub]) => sub !== 'Otros');
        if (candidatos.length) {
          ganador = candidatos.sort((a, b) => b[1] - a[1])[0][0];
        } else {
          ganador = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
        }
      }
      subcatPorSector[sec] = subcatPorSector[sec] || {};
      subcatPorSector[sec][ganador] = (subcatPorSector[sec][ganador] || 0) + 1;
      const m = montosPorCartel.get(nro) || 0;
      subcatMontoPorSector[sec] = subcatMontoPorSector[sec] || {};
      subcatMontoPorSector[sec][ganador] = (subcatMontoPorSector[sec][ganador] || 0) + m;
    });

    const subcategory_analysis: Record<string, Array<{ subcategory: string; count: number; percentage: number; total_monto: number; promedio_monto: number }>> = {};
    Object.keys({ ...activeRules, Otros: [] }).forEach(sec => {
      const mapa = subcatPorSector[sec] || {};
      const total = Object.values(mapa).reduce((a, b) => a + b, 0) || 0;
      const montos = subcatMontoPorSector[sec] || {};
      const arr = Object.keys(mapa).length
        ? Object.entries(mapa).map(([sub, cnt]) => ({
            subcategory: sub,
            count: cnt,
            percentage: total ? Math.round((cnt / total) * 1000) / 10 : 0,
            total_monto: montos[sub] || 0,
            promedio_monto: cnt ? (montos[sub] || 0) / cnt : 0
          }))
        : [];
      // Ordenar por count desc
      subcategory_analysis[sec] = arr.sort((a, b) => b.count - a.count);
    });

  const tendencias = this.generarTendenciasMensuales(carteles, contratos, ofertas);
  const tendenciasDiarias = this.generarTendenciasDiarias(30, carteles, contratos, ofertas);

    // Verificación de consistencia: suma por sector vs total
    const sumaSectores = sector_entries.reduce((s, e) => s + (e.total_monto || 0), 0);
    const diff = Math.abs((monto_total_contratos || 0) - sumaSectores);
    if (diff > 1e-6) {
      console.warn('⚠️ Inconsistencia entre total y suma por sector', { monto_total_contratos, sumaSectores, diff });
    } else {
      console.log('✅ Consistencia de montos: total coincide con suma por sector');
    }

    const result = {
      kpi_metrics: {
        total_contratos,
        total_carteles,
        total_proveedores,
        total_ofertas,
        total_lineas,
        promedio_lineas_por_cartel: Math.round(promedio_lineas_por_cartel * 10) / 10,
        tasa_exito: Math.round(tasa_exito * 10) / 10,
        crecimiento_contratos: Math.round(crecimiento_contratos * 10) / 10,
        contratos_recientes: total_contratos, // TODO: últimos 12 meses si se requiere
        carteles_recientes: total_carteles
      },
      sector_analysis: sector_entries,
      subcategory_analysis,
      monto_total_contratos,
      tendencias_mensuales: tendencias,
      tendencias_diarias: tendenciasDiarias
    };
    
    // 🚀 CACHE: Guardar resultado en caché
    this.dashboardCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      filters: cacheKey
    });
    
    const elapsed = performance.now() - startTime;
    console.log(`⏱️ getDashboardMetrics completado en ${Math.round(elapsed)}ms (cache miss)`);
    
    return result;
  }

  // ================================
  // CONSULTAS PRINCIPALES
  // ================================

  /**
   * Búsqueda principal con filtros múltiples
   */
  buscarOportunidades(filtros: FiltroBusqueda): ResultadoBusqueda {
    if (!this.isLoaded) {
      throw new Error('Datos no cargados. Llame a cargarDatos() primero.');
    }

    let carteles = this.obtenerTodosLosCarteles();
    let contratos = this.obtenerTodosLosContratos();

    // Aplicar filtros de institución (usando índices si están)
    if (filtros.institucion && filtros.institucion.length > 0) {
      const idxCart = this.getIndex('DetalleCarteles', 'fk_carteles_institucion');
      const idxCont = this.getIndex('Contratos', 'fk_contratos_institucion');
      if (idxCart && idxCont) {
        carteles = _.flatten(filtros.institucion.map(ci => idxCart.get(ci) || []));
        contratos = _.flatten(filtros.institucion.map(ci => idxCont.get(ci) || []));
      } else {
        carteles = carteles.filter(cartel => filtros.institucion!.includes(cartel.codigoInstitucion));
        contratos = contratos.filter(contrato => filtros.institucion!.includes(contrato.codigoInstitucion));
      }
    }

    // Aplicar filtros de proveedor
    if (filtros.proveedor && filtros.proveedor.length > 0) {
      const cartelesConOfertas = this.obtenerCartelesConProveedor(filtros.proveedor);
      const setCarteles = new Set(cartelesConOfertas);
      carteles = carteles.filter(cartel => setCarteles.has(cartel.numeroCartel));
      contratos = contratos.filter(contrato => filtros.proveedor!.includes(contrato.idProveedor));
    }

    // Aplicar filtros de keywords
    if (filtros.keywords && filtros.keywords.length > 0) {
      carteles = this.filtrarPorKeywords(carteles, filtros.keywords);
    }

    // Aplicar filtros de fecha
    if (filtros.fechaDesde || filtros.fechaHasta) {
      carteles = this.filtrarPorFechas(carteles, filtros.fechaDesde, filtros.fechaHasta);
      contratos = this.filtrarContratosPorFechas(contratos, filtros.fechaDesde, filtros.fechaHasta);
    }

    // Aplicar filtros de monto
    if (filtros.montoMinimo || filtros.montoMaximo || filtros.incluirSinPresupuesto !== undefined) {
      carteles = this.filtrarPorMontos(carteles, filtros.montoMinimo, filtros.montoMaximo, filtros.incluirSinPresupuesto);
      contratos = this.filtrarContratosPorMontos(contratos, filtros.montoMinimo, filtros.montoMaximo);
    }

    // Aplicar filtro de solo adjudicados
    if (filtros.soloAdjudicados) {
      const cartelesAdjudicados = this.obtenerCartelesAdjudicados();
      carteles = carteles.filter(cartel => 
        cartelesAdjudicados.includes(cartel.numeroCartel)
      );
    }

    const estadisticas = this.generarEstadisticas(carteles, contratos);

    return {
      carteles,
      contratos,
      total: carteles.length + contratos.length,
      estadisticas
    };
  }

  /**
   * Análisis de competencia para un proveedor
   */
  analizarCompetencia(idProveedor: string, sectores?: string[]): AnalisisCompetencia {
    const proveedor = this.obtenerProveedor(idProveedor);
    if (!proveedor) {
      throw new Error(`Proveedor ${idProveedor} no encontrado`);
    }

    // Obtener carteles donde participó este proveedor
    const cartelesParticipacion = this.obtenerCartelesConProveedor([idProveedor]);
    
    // Obtener todos los competidores en esos carteles
    const competidores = this.obtenerCompetidores(cartelesParticipacion, idProveedor);

    // Analizar sectores de actividad
    const sectoresActividad = this.analizarSectoresProveedor(idProveedor, sectores);

    return {
      proveedor: proveedor.nombreProveedor,
      competidores,
      sectoresActividad
    };
  }

  /**
   * Obtiene histórico de precios para un producto
   */
  obtenerHistorialPrecios(keywords: string[], instituciones?: string[]): HistorialPrecio[] {
    const lineasConKeywords = this.buscarLineasPorKeywords(keywords);
    
    if (instituciones && instituciones.length > 0) {
      // Filtrar por instituciones específicas
    }

    const historialPorProducto = new Map<string, any[]>();

    lineasConKeywords.forEach(linea => {
      const key = this.normalizarProducto(linea.descripcionLinea);
      if (!historialPorProducto.has(key)) {
        historialPorProducto.set(key, []);
      }

      // Buscar precios adjudicados para esta línea
      const preciosAdjudicados = this.obtenerPreciosAdjudicados(
        linea.numeroCartel, 
        linea.numeroLinea
      );

      historialPorProducto.get(key)!.push(...preciosAdjudicados);
    });

    return Array.from(historialPorProducto.entries()).map(([producto, precios]) => 
      this.procesarHistorialPrecio(producto, precios)
    );
  }

  // ================================
  // MÉTODOS DE UTILIDAD
  // ================================

  private obtenerTodosLosCarteles(): DetalleCartel[] {
    return this.datos.get('DetalleCarteles') || [];
  }

  private obtenerTodosLosContratos(): Contrato[] {
    return this.datos.get('Contratos') || [];
  }

  private obtenerProveedor(id: string): Proveedor | undefined {
    const proveedores = this.datos.get('Proveedores') || [];
    return proveedores.find(p => p.idProveedor === id);
  }

  private obtenerCartelesConProveedor(proveedores: string[]): string[] {
    const ofertas = this.datos.get('Ofertas') || [];
    return ofertas
      .filter(oferta => proveedores.includes(oferta.idProveedor))
      .map(oferta => oferta.numeroCartel);
  }

  private filtrarPorKeywords(carteles: DetalleCartel[], keywords: string[]): DetalleCartel[] {
    const sets = keywords
      .map(k => this.tokenizar(k)[0])
      .filter(Boolean)
      .map(t => this.invertedCartel.get(t) ?? new Set<string>());
    if (!sets.length) return carteles;
    const inter = sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));
    const setIds = new Set(inter);
    return carteles.filter(c => setIds.has(c.numeroCartel));
  }

  private obtenerLineasCartel(numeroCartel: string): DetalleLineaCartel[] {
    const lineas = this.datos.get('DetalleLineaCartel') || [];
    return lineas.filter(linea => linea.numeroCartel === numeroCartel);
  }

  private filtrarPorFechas(carteles: DetalleCartel[], desde?: Date, hasta?: Date): DetalleCartel[] {
    return carteles.filter(cartel => {
      const fecha = cartel.fechaPublicacion;
      if (!fecha) return false;
      
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      
      return true;
    });
  }

  private filtrarContratosPorFechas(contratos: Contrato[], desde?: Date, hasta?: Date): Contrato[] {
    return contratos.filter(contrato => {
      const fecha = contrato.fechaFirma;
      if (!fecha) return false;
      
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      
      return true;
    });
  }

  private filtrarPorMontos(carteles: DetalleCartel[], minimo?: number, maximo?: number, incluirSinPresupuesto: boolean = true): DetalleCartel[] {
    return carteles.filter(cartel => {
      const monto = cartel.presupuestoOficial;
      if (monto == null) return incluirSinPresupuesto;
      if (minimo != null && monto < minimo) return false;
      if (maximo != null && monto > maximo) return false;
      return true;
    });
  }

  private filtrarContratosPorMontos(contratos: Contrato[], minimo?: number, maximo?: number): Contrato[] {
    return contratos.filter(contrato => {
      const monto = contrato.montoContrato;
      if (!monto) return false;
      
      if (minimo && monto < minimo) return false;
      if (maximo && monto > maximo) return false;
      
      return true;
    });
  }

  private obtenerCartelesAdjudicados(): string[] {
    const adjudicaciones = this.datos.get('AdjudicacionesFirme') || [];
    return adjudicaciones.map(adj => adj.numeroCartel);
  }

  private generarEstadisticas(carteles: DetalleCartel[], contratos: Contrato[]): EstadisticaBusqueda {
    const setCarteles = new Set(carteles.map(c => c.numeroCartel));
    const ofertas = (this.datos.get('Ofertas') || []).filter((o: any) => setCarteles.has(o.numeroCartel));
    const ofertasPorCartel = _.values(_.groupBy(ofertas, 'numeroCartel')).map(arr => _.uniq(arr.map((o: any) => o.idProveedor)).length);
    const promedioOfertas = ofertasPorCartel.length ? _.mean(ofertasPorCartel) : 0;

    const institucionesMasActivas = _(contratos)
      .groupBy('codigoInstitucion')
      .map((arr: any[], inst: string) => ({ institucion: inst, cantidad: arr.length, monto: _.sumBy(arr, 'montoContrato') }))
      .orderBy(['monto'], ['desc'])
      .slice(0, 10)
      .value();

    const proveedoresMasActivos = _(contratos)
      .groupBy('idProveedor')
      .map((arr: any[], prov: string) => ({ proveedor: prov, cantidad: arr.length, monto: _.sumBy(arr, 'montoContrato') }))
      .orderBy(['monto'], ['desc'])
      .slice(0, 10)
      .value();

    const montoTotal = _.sumBy(contratos, 'montoContrato') || 0;

    return {
      totalCarteles: carteles.length,
      totalContratos: contratos.length,
      montoTotal,
      promedioOfertas,
      institucionesMasActivas,
      proveedoresMasActivos
    };
  }

  private obtenerCompetidores(carteles: string[], proveedorExcluir: string): any[] {
    const ofertas = (this.datos.get('Ofertas') || []).filter((o: any) => carteles.includes(o.numeroCartel));
    const porCartel = _.groupBy(ofertas, 'numeroCartel');
    const coincidentes: Record<string, number> = {};
    Object.values(porCartel).forEach((arr: any[]) => {
      const set = new Set(arr.map((o: any) => o.idProveedor));
      set.delete(proveedorExcluir);
      for (const p of set) coincidentes[p] = (coincidentes[p] || 0) + 1;
    });

    const setCarteles = new Set(carteles);
    const lineasAdj = (this.datos.get('LineasAdjudicadas') || []).filter((l: any) => setCarteles.has(l.numeroCartel));
    // Wins por proveedor (carteles con al menos una línea adjudicada)
    const winsPorProv = _(lineasAdj)
      .groupBy('idProveedorAdjudicado')
      .mapValues((arr: any[]) => new Set(arr.map(a => a.numeroCartel)).size)
      .value();
    // Monto adjudicado por proveedor
    const montoPorProv = _(lineasAdj)
      .groupBy('idProveedorAdjudicado')
      .mapValues((arr: any[]) => _.sumBy(arr, (x: any) => (x.montoLineaAdjudicada ?? (x.precioAdjudicado || 0) * (x.cantidadAdjudicada || 1))))
      .value();
    const totalMonto = _.sum(Object.values(montoPorProv));

    const proveedores = this.datos.get('Proveedores') || [];
    return _(coincidentes)
      .toPairs()
      .map(([id, apariciones]) => {
        const monto = montoPorProv[id] || 0;
        const share = totalMonto ? monto / totalMonto : 0;
        return {
          id,
          nombre: proveedores.find((p: any) => p.idProveedor === id)?.nombreProveedor ?? String(id),
          contractosGanados: winsPorProv[id] || 0,
          montoTotal: monto,
          marketShare: share
        };
      })
      .orderBy(['montoTotal', 'contractosGanados', 'marketShare'], ['desc', 'desc', 'desc'])
      .slice(0, 15)
      .value();
  }

  private analizarSectoresProveedor(idProveedor: string, sectores?: string[]): any[] {
    const lo = (this.datos.get('LineasOfertadas') || []).filter((l: any) => l.idProveedor === idProveedor);
    const la = (this.datos.get('LineasAdjudicadas') || []).filter((l: any) => l.idProveedorAdjudicado === idProveedor);
    const lineas = [...lo, ...la];
    const desc = new Map((this.datos.get('DetalleLineaCartel') || []).map((l: any) => [`${l.numeroCartel}|${l.numeroLinea}`, l.descripcionLinea || '']))
    const tokens = (s: string) => this.tokenizar(s).filter(t => t.length > 3);
    const bag: Record<string, { freq: number; adj: number }> = {};
    lineas.forEach((l: any) => {
      const d = desc.get(`${l.numeroCartel}|${l.numeroLinea}`) || '';
      const toks = new Set(tokens(d));
      toks.forEach(t => {
        bag[t] = bag[t] || { freq: 0, adj: 0 };
        bag[t].freq += 1;
      });
      if ((l as any).idProveedorAdjudicado === idProveedor || (l as any).precioAdjudicado != null) {
        toks.forEach(t => {
          bag[t] = bag[t] || { freq: 0, adj: 0 };
          bag[t].adj += 1;
        });
      }
    });
    return _(bag)
      .toPairs()
      .map(([keyword, v]) => ({ sector: keyword, participacion: v.freq, exito: v.freq ? v.adj / v.freq : 0 }))
      .orderBy(['participacion', 'exito'], ['desc', 'desc'])
      .slice(0, 30)
      .value();
  }

  public kpisGenerales(filtros: FiltroBusqueda) {
    const { carteles, contratos } = this.buscarOportunidades(filtros);
    const totalCarteles = carteles.length;
    const totalContratos = contratos.length;
    const tasaConversion = totalCarteles ? (totalContratos / totalCarteles) * 100 : 0;

    const adjFirmesSet = new Set(
      (this.datos.get('AdjudicacionesFirme') || [])
        .filter((a: any) => carteles.some(c => c.numeroCartel === a.numeroCartel))
        .map((a: any) => a.numeroCartel)
    );
    const desierto = totalCarteles ? (100 * (1 - adjFirmesSet.size / totalCarteles)) : 0;

    const fechas = new Map((this.datos.get('FechaPorEtapas') || []).map((f: any) => [f.numeroCartel, f.fechaAperturaOfertas || f.fechaPublicacion]));
    const tta: number[] = [];
    (this.datos.get('AdjudicacionesFirme') || []).forEach((a: any) => {
      if (!adjFirmesSet.has(a.numeroCartel)) return;
      const inicio = fechas.get(a.numeroCartel);
      if (inicio && a.fechaAdjudicacionFirme) tta.push((+a.fechaAdjudicacionFirme - +inicio) / (1000 * 60 * 60 * 24));
    });
    const medianaTTA = tta.length ? _.sortBy(tta)[Math.floor(tta.length / 2)] : 0;

    const total = _.sumBy(contratos, 'montoContrato');
    const hhi = _(contratos)
      .groupBy('idProveedor')
      .map(arr => _.sumBy(arr, 'montoContrato'))
      .map(m => total ? Math.pow(m / total, 2) : 0)
      .sum();

    return { tasaConversion, desierto, medianaTTA, hhi };
  }

  private buscarLineasPorKeywords(keywords: string[]): DetalleLineaCartel[] {
    const lineas = this.datos.get('DetalleLineaCartel') || [];
    const keywordsLower = keywords.map(k => k.toLowerCase());
    
    return lineas.filter(linea => {
      const descripcion = linea.descripcionLinea.toLowerCase();
      return keywordsLower.some(keyword => descripcion.includes(keyword));
    });
  }

  private obtenerPreciosAdjudicados(numeroCartel: string, numeroLinea: number): any[] {
    const adjud = (this.datos.get('LineasAdjudicadas') || [])
      .filter((a: any) => a.numeroCartel === numeroCartel && a.numeroLinea === numeroLinea);
    const fechaIndex = new Map(
      (this.datos.get('AdjudicacionesFirme') || []).map((x: any) => [x.numeroCartel, x.fechaAdjudicacionFirme])
    );
    const cartelToInstitucion = new Map((this.datos.get('DetalleCarteles') || []).map((c: any) => [c.numeroCartel, c.codigoInstitucion]));
    return adjud
      .map((a: any) => ({
        precio: a.precioAdjudicado ?? a.montoLinea ?? null,
        fecha: fechaIndex.get(a.numeroCartel) ?? null,
        proveedor: a.idProveedorAdjudicado,
        numeroCartel: a.numeroCartel,
        institucion: cartelToInstitucion.get(a.numeroCartel) ?? null
      }))
      .filter(x => x.precio != null && x.fecha != null);
  }

  private normalizarProducto(descripcion: string): string {
    return descripcion.toLowerCase().trim();
  }

  private procesarHistorialPrecio(producto: string, precios: any[]): HistorialPrecio {
    const preciosOrdenados = _.orderBy(precios, 'fecha', 'asc');
    const preciosNumericos = precios
      .map(p => p.precio)
      .filter(p => p && !isNaN(p));

    return {
      producto,
      precios: preciosOrdenados,
      tendencia: this.calcularTendencia(preciosOrdenados),
      precioPromedio: _.mean(preciosNumericos) || 0,
      precioMinimo: _.min(preciosNumericos) || 0,
      precioMaximo: _.max(preciosNumericos) || 0
    };
  }

  private calcularTendencia(precios: any[]): 'Subida' | 'Bajada' | 'Estable' {
    if (precios.length < 2) return 'Estable';
    
    const primero = precios[0].precio;
    const ultimo = precios[precios.length - 1].precio;
    
    if (ultimo > primero * 1.1) return 'Subida';
    if (ultimo < primero * 0.9) return 'Bajada';
    return 'Estable';
  }

  // ================================
  // DOSSIER POR NÚMERO SICOP
  // ================================
  /**
   * Obtiene un dossier completo para un número SICOP (numeroCartel)
   * Incluye cartel, líneas, ofertas, adjudicaciones, contratos, órdenes, recepciones, garantías, recursos, etc.
   */
  public obtenerDossierCartel(numeroCartel: string) {
    const inputRaw = String(numeroCartel || '').trim();
    if (!inputRaw) return null;

    const carteles: any[] = this.datos.get('DetalleCarteles') || [];
    const lineas: any[] = this.datos.get('DetalleLineaCartel') || [];
    const fechas: any[] = this.datos.get('FechaPorEtapas') || [];
    const recibidas: any[] = this.datos.get('LineasRecibidas') || [];
    const ofertas: any[] = this.datos.get('Ofertas') || [];
    const lineasOfertadas: any[] = this.datos.get('LineasOfertadas') || [];
    const adjudFirmes: any[] = this.datos.get('AdjudicacionesFirme') || [];
    const lineasAdj: any[] = this.datos.get('LineasAdjudicadas') || [];
    const contratos: any[] = this.datos.get('Contratos') || [];
    const lineasContratadas: any[] = this.datos.get('LineasContratadas') || [];
    const ordenes: any[] = this.datos.get('OrdenPedido') || [];
    const recepciones: any[] = this.datos.get('Recepciones') || [];
    const reajustes: any[] = this.datos.get('ReajustePrecios') || [];
    const garantias: any[] = this.datos.get('Garantias') || [];
    const recursos: any[] = this.datos.get('RecursosObjecion') || [];
    const inhibiciones: any[] = this.datos.get('FuncionariosInhibicion') || [];

    // Normalización y variantes similares a computeTTA
    const normNro = (v: any) => String(v ?? '').trim().replace(/\s+/g, '').replace(/[^0-9A-Za-z-]/g, '');
    const generarVariantes = (raw: string): string[] => {
      const s = normNro(raw);
      if (!s) return [];
      const vars = new Set<string>();
      vars.add(s);
      vars.add(s.replace(/-/g, ''));
      vars.add(s.replace(/\b0+(\d+)/g, '$1'));
      const digits = s.replace(/\D+/g, '');
      if (digits.length >= 4) vars.add(digits);
      return Array.from(vars).filter(Boolean);
    };
    const queryVars = new Set(generarVariantes(inputRaw));
    const queryDigits = inputRaw.replace(/\D+/g, '');
    const queryPref11 = queryDigits.length >= 11 ? queryDigits.slice(0, 11) : '';
    const matchNumero = (val: any) => {
      const vs = generarVariantes(String(val || ''));
      if (vs.some(v => queryVars.has(v))) return true;
      if (queryPref11) {
        const digits = String(val || '').replace(/\D+/g, '');
        if (digits.startsWith(queryPref11)) return true;
      }
      return false;
    };

    // Buscar cartel principal en DetalleCarteles con matching flexible
    const candidatosCartel = carteles.filter(c => matchNumero(c.numeroCartel));
    // Si no hay, buscar en tablas de etapas/adjudicación y proyectar su numeroCartel
    const candidatosDeEtapas = fechas.filter(f => matchNumero(f.numeroCartel)).map(f => f.numeroCartel);
    const candidatosDeAdj = adjudFirmes.filter(a => matchNumero(a.numeroCartel)).map(a => a.numeroCartel);
    const candidatosExtra = Array.from(new Set([...candidatosDeEtapas, ...candidatosDeAdj]))
      .map(n => carteles.find(c => c.numeroCartel === n))
      .filter(Boolean) as any[];

    let todosCandidatos = [...candidatosCartel, ...candidatosExtra];

    // Fallback profundo: escanear todas las tablas por candidatos si aún no hay resultados
    if (!todosCandidatos.length) {
      const inputDigits = inputRaw.replace(/\D+/g, '');
      const boost = (val: string | undefined | null): number => {
        if (!val) return 0;
        const digits = String(val).replace(/\D+/g, '');
        let s = 0;
        if (digits === inputDigits) s += 50;
        if (digits.startsWith(inputDigits)) s += Math.min(inputDigits.length, 11) * 2;
        if (inputDigits.startsWith(digits)) s += Math.min(digits.length, 11);
        if (digits.includes(inputDigits)) s += Math.min(inputDigits.length, 8);
        return s;
      };
      const addCandidate = (map: Map<string, number>, raw: any) => {
        const vals = [raw?.numeroCartel, raw?.nro_sicop, raw?.NRO_SICOP].filter(Boolean) as string[];
        for (const v of vals) {
          const k = String(v);
          const score = boost(k);
          if (score > 0) map.set(k, (map.get(k) || 0) + score);
        }
      };
      const pool = new Map<string, number>();
      const tables: any[][] = [fechas, adjudFirmes, lineas, recibidas, ofertas, lineasOfertadas, lineasAdj, contratos, lineasContratadas, ordenes, recepciones, reajustes, garantias, recursos, inhibiciones];
      for (const t of tables) {
        for (const row of t) addCandidate(pool, row);
      }
      const ranked = Array.from(pool.entries()).sort((a, b) => b[1] - a[1]);
      if (ranked.length) {
        const bestNum = ranked[0][0];
        const same = (a: any, b: any) => {
          const va = generarVariantes(String(a || ''));
          const vb = new Set(generarVariantes(String(b || '')));
          if (va.some(v => vb.has(v))) return true;
          const da = String(a || '').replace(/\D+/g, '');
          const db = String(b || '').replace(/\D+/g, '');
          if (da && db && (da === db || da.startsWith(db) || db.startsWith(da))) return true;
          return false;
        };
        const best = carteles.find(c => same(c.numeroCartel, bestNum));
        if (best) todosCandidatos = [best];
        else {
          // Construir candidato sintético si no está en DetalleCarteles
          const contratoRel = contratos.find(c => same(c.numeroCartel, bestNum));
          todosCandidatos = [{ numeroCartel: bestNum, codigoInstitucion: contratoRel?.codigoInstitucion, nombreCartel: contratoRel?.objetoContrato || '' }];
        }
      }
    }

    if (!todosCandidatos.length) return null;

    // Elegir el más representativo (por longitud del numeroCartel y/o con más datos)
    const cartel = todosCandidatos.sort((a, b) => String(b.numeroCartel || '').length - String(a.numeroCartel || '').length)[0];
    const norm = String(cartel.numeroCartel || '').trim();
    const targetVars = new Set(generarVariantes(norm));
    const normDigits = norm.replace(/\D+/g, '');
    const normPref11 = normDigits.length >= 11 ? normDigits.slice(0, 11) : '';
    const accept = (val: any) => {
      const s = String(val || '');
      if (!s) return false;
      const vs = generarVariantes(s);
      // Coincidencia por variantes exactas con query o target
      if (vs.some(v => queryVars.has(v) || targetVars.has(v))) return true;
      const digits = s.replace(/\D+/g, '');
      // Prefijo de 11 dígitos por query o por target
      if (queryPref11 && digits.startsWith(queryPref11)) return true;
      if (normPref11 && digits.startsWith(normPref11)) return true;
      // Fallback prudente: inclusión de dígitos cuando longitud del patrón >= 8
      if (queryDigits.length >= 8 && digits.includes(queryDigits)) return true;
      if (normDigits.length >= 8 && digits.includes(normDigits)) return true;
      return false;
    };

    const fechasCartel = (fechas.find(f => accept(f.numeroCartel)) || null);
    const lineasCartel = lineas.filter(l => accept(l.numeroCartel));
    const lineasRecibidas = recibidas.filter(r => accept(r.numeroCartel));
    const ofertasCartel = ofertas.filter(o => accept(o.numeroCartel));
    const lineasOfertadasCartel = lineasOfertadas.filter(o => accept(o.numeroCartel));
    const adjudFirme = (adjudFirmes.find(a => accept(a.numeroCartel)) || null);
    const lineasAdjudicadas = lineasAdj.filter(a => accept(a.numeroCartel));

    // Contratos relacionados por numeroCartel (matching flexible)
    const contratosCartel = contratos.filter(c => accept(c.numeroCartel));
    const contratoIds = new Set(contratosCartel.map((c: any) => c.idContrato));
    const lineasContratadasCartel = lineasContratadas.filter(lc => accept(lc.numeroCartel) || contratoIds.has(lc.idContrato));
    const ordenesCartel = ordenes.filter(o => contratoIds.has(o.idContrato));
    const recepcionesCartel = recepciones.filter(r => (r.idContrato && contratoIds.has(r.idContrato)) || (r.numeroCartel && accept(r.numeroCartel)));
    const reajustesCartel = reajustes.filter(rj => contratoIds.has(rj.idContrato));
    const garantiasCartel = garantias.filter(g => (g.numeroCartel && accept(g.numeroCartel)) || (g.idContrato && contratoIds.has(g.idContrato)));
    const recursosCartel = recursos.filter(r => accept(r.numeroCartel));
    const inhibicionesCartel = inhibiciones.filter(i => accept(i.numeroCartel));

    // KPIs rápidos
    const montoEstimado = cartel.presupuestoOficial || 0;
    const ofertasRecibidas = _.uniq(ofertasCartel.map((o: any) => o.idProveedor)).length;
    const montoAdj = _.sumBy(lineasAdjudicadas, (x: any) => (x.montoLineaAdjudicada ?? (x.precioAdjudicado || 0) * (x.cantidadAdjudicada || 0)));
    const proveedoresParticipantes = _.uniq(lineasOfertadasCartel.map((l: any) => l.idProveedor)).length;
    const proveedoresGanadores = _.uniq(lineasAdjudicadas.map((l: any) => l.idProveedorAdjudicado)).length;

    // Tiempos clave (TTA)
    const inicio = fechasCartel?.fechaAperturaOfertas || fechasCartel?.fechaPublicacion || null;
    const fin = adjudFirme?.fechaAdjudicacionFirme || fechasCartel?.fechaAdjudicacion || null;
    let ttaDias: number | null = null;
    if (inicio && fin) {
      const a = new Date(inicio as any);
      const b = new Date(fin as any);
      if (!isNaN(a.getTime()) && !isNaN(b.getTime())) {
        ttaDias = Math.round((b.getTime() - a.getTime()) / 86400000);
      }
    }

    // Timeline simple basado en fechas disponibles
    const timeline: Array<{ date: string; value: number; label: string }> = [];
    if (fechasCartel?.fechaPublicacion) timeline.push({ date: String(fechasCartel.fechaPublicacion), value: 1, label: 'Publicación' });
    if (fechasCartel?.fechaAperturaOfertas) timeline.push({ date: String(fechasCartel.fechaAperturaOfertas), value: 2, label: 'Apertura' });
    if (adjudFirme?.fechaAdjudicacionFirme || fechasCartel?.fechaAdjudicacion) timeline.push({ date: String(adjudFirme?.fechaAdjudicacionFirme || fechasCartel?.fechaAdjudicacion), value: 3, label: 'Adjudicación' });

    return {
      numeroCartel: norm,
      cartel,
      etapas: fechasCartel,
      lineas: lineasCartel,
      lineasRecibidas,
      ofertas: ofertasCartel,
      lineasOfertadas: lineasOfertadasCartel,
      adjudicacionFirme: adjudFirme,
      lineasAdjudicadas,
      contratos: contratosCartel,
      lineasContratadas: lineasContratadasCartel,
      ordenes: ordenesCartel,
      recepciones: recepcionesCartel,
      reajustes: reajustesCartel,
      garantias: garantiasCartel,
      recursos: recursosCartel,
      inhibiciones: inhibicionesCartel,
      kpis: {
        montoEstimado,
        ofertasRecibidas,
        proveedoresParticipantes,
        proveedoresGanadores,
        montoAdjudicado: montoAdj,
        ttaDias
      },
      timeline
    };
  }

  private validarIntegridad(): void {
    try {
      const errores: any[] = [];
      // Validar claves foráneas básicas con índices primarios
      const pkCarteles = this.getIndex('DetalleCarteles', 'pk_carteles');
      const pkProveedores = this.getIndex('Proveedores', 'pk_proveedores');
      const pkContratos = this.getIndex('Contratos', 'pk_contratos');

      const checkFK = (tablaNombre: string, filas: any[], campo: string, pk: Map<string, any[]> | undefined) => {
        if (!pk) return 0;
        let orfanas = 0;
        for (const row of filas) {
          const k = row[campo];
          if (k == null) continue; // permitir nulos
          if (!pk.get(String(k))) orfanas++;
        }
        if (orfanas) errores.push({ tabla: tablaNombre, campo, orfanas });
        return orfanas;
      };

      checkFK('DetalleLineaCartel', this.datos.get('DetalleLineaCartel') || [], 'numeroCartel', pkCarteles);
      checkFK('Ofertas', this.datos.get('Ofertas') || [], 'numeroCartel', pkCarteles);
      checkFK('Ofertas', this.datos.get('Ofertas') || [], 'idProveedor', pkProveedores);
      checkFK('LineasOfertadas', this.datos.get('LineasOfertadas') || [], 'numeroCartel', pkCarteles);
      checkFK('LineasOfertadas', this.datos.get('LineasOfertadas') || [], 'idProveedor', pkProveedores);
      checkFK('LineasAdjudicadas', this.datos.get('LineasAdjudicadas') || [], 'numeroCartel', pkCarteles);
      checkFK('LineasAdjudicadas', this.datos.get('LineasAdjudicadas') || [], 'idProveedorAdjudicado', pkProveedores);
      checkFK('AdjudicacionesFirme', this.datos.get('AdjudicacionesFirme') || [], 'numeroCartel', pkCarteles);
      checkFK('Contratos', this.datos.get('Contratos') || [], 'idProveedor', pkProveedores);
      checkFK('Contratos', this.datos.get('Contratos') || [], 'codigoInstitucion', this.getIndex('InstitucionesRegistradas', 'pk_instituciones'));
      checkFK('LineasContratadas', this.datos.get('LineasContratadas') || [], 'idContrato', pkContratos);

      const totalOrfanas = errores.reduce((s, e) => s + (e.orfanas || 0), 0);
      this.integridadResumen = { totalOrfanas, detalles: errores };
      if (errores.length) console.warn('🔗 FKs huérfanas detectadas:', errores);
      else console.log('🔗 Validación de integridad: OK');
    } catch (e) {
      console.warn('Validación de integridad falló:', e);
    }
  }

  private generarEstadisticasIniciales(): void {
    const stats = {
      totalCarteles: (this.datos.get('DetalleCarteles') || []).length,
      totalContratos: (this.datos.get('Contratos') || []).length,
      totalProveedores: (this.datos.get('Proveedores') || []).length,
      totalInstituciones: (this.datos.get('InstitucionesRegistradas') || []).length
    };
    
    if (this.loggingMode === 'verbose') {
      console.log('📊 Estadísticas iniciales:', stats);
    } else {
      console.log(`📊 Stats: carteles=${stats.totalCarteles}, contratos=${stats.totalContratos}, proveedores=${stats.totalProveedores}, instituciones=${stats.totalInstituciones}`);
    }
  }

  // ================================
  // VALIDACIÓN CONCISA + RESUMEN
  // ================================
  public logValidationSummary(opts?: { showSamples?: boolean }) {
    const showSamples = Boolean(opts?.showSamples);
    const getHS = (t: string) => this.diagnostics.headerStats[t] || { rawHeaders: [], explicitMapped: [], autoNormalized: [] };
    const rc = this.diagnostics.rowCounts;
    const tab = (name: string) => ({ name, rows: rc[name] || 0, hs: getHS(name) });

    const importantes = [
      tab('DetalleCarteles'), tab('DetalleLineaCartel'), tab('Contratos'), tab('LineasContratadas'),
      tab('LineasAdjudicadas'), tab('Ofertas'), tab('InstitucionesRegistradas'), tab('Proveedores')
    ];

    console.log('🧪 Validación: resumen de tablas clave');
    importantes.forEach(t => {
      const raw = t.hs.rawHeaders.length;
      const mapped = t.hs.explicitMapped.length;
      const auto = t.hs.autoNormalized.length;
      console.log(` • ${t.name}: filas=${t.rows}, headers(raw=${raw}, mapped=${mapped}, auto=${auto})`);
      if (showSamples && t.hs.rawHeaders.length) {
        console.log(`    ↳ headers muestra:`, t.hs.rawHeaders.slice(0, 8));
      }
    });

    // Chequeos específicos de Proveedores_unido → Proveedores
    const proveedoresHeaders = new Set<string>([...getHS('Proveedores').explicitMapped, ...getHS('Proveedores').autoNormalized]);
    const provRequired = ['idProveedor', 'nombreProveedor'];
    const provOptional = ['tipoProveedor', 'tamanoProveedor', 'codigoPostal', 'provincia', 'canton', 'distrito'];
    const provMissing = provRequired.filter(h => !proveedoresHeaders.has(h));
    const provCoveredOpt = provOptional.filter(h => proveedoresHeaders.has(h));
    console.log(` 🧩 Proveedores: required=${provMissing.length ? 'FALTAN ' + provMissing.join(',') : 'OK'}, optional=${provCoveredOpt.length}/${provOptional.length}`);

    // Orfandad de claves foráneas
    const integ = this.integridadResumen;
    if (integ && integ.totalOrfanas > 0) {
      const top = [...integ.detalles].sort((a, b) => (b.orfanas || 0) - (a.orfanas || 0)).slice(0, 5);
      console.warn(` 🔗 FKs huérfanas: total=${integ.totalOrfanas}`, top);
    } else {
      console.log(' 🔗 FKs huérfanas: OK');
    }

    // Preparación para joins críticos del dashboard
    const carteles: any[] = this.datos.get('DetalleCarteles') || [];
    const contratos: any[] = this.datos.get('Contratos') || [];
    const lineas: any[] = this.datos.get('LineasContratadas') || [];
    const setCartel = new Set(carteles.map((c: any) => String(c.numeroCartel || '').trim()).filter(Boolean));
    const setContrato = new Set(contratos.map((c: any) => String(c.idContrato || '').trim()).filter(Boolean));
    const joinByCartel = lineas.filter((l: any) => setCartel.has(String(l.numeroCartel || '').trim())).length;
    const joinByContrato = lineas.filter((l: any) => setContrato.has(String(l.idContrato || l.nro_contrato || '').trim())).length;
    console.log(` 🔄 Joins: lineas↔cartel=${joinByCartel}/${lineas.length}, lineas↔contrato=${joinByContrato}/${lineas.length}`);
  }

  public validateData() {
    const rc = this.diagnostics.rowCounts;
    const hs = this.diagnostics.headerStats;
    return {
      rows: { ...rc },
      headers: Object.fromEntries(Object.entries(hs).map(([k, v]) => [k, { raw: v.rawHeaders, mapped: v.explicitMapped, auto: v.autoNormalized }])),
      integridad: this.integridadResumen
    };
  }

  // ================================
  // GETTERS PÚBLICOS
  // ================================

  get isDataLoaded(): boolean {
    return this.isLoaded;
  }

  get progress(): number {
    return this.loadingProgress;
  }

  get stage(): string {
    return this.loadingStage;
  }

  obtenerDatos(tabla: string): any[] {
    return this.datos.get(tabla) || [];
  }

  obtenerEstadisticasGenerales() {
    const stats = {
      carteles: (this.datos.get('DetalleCarteles') || []).length,
      contratos: (this.datos.get('Contratos') || []).length,
      proveedores: (this.datos.get('Proveedores') || []).length,
      instituciones: (this.datos.get('InstitucionesRegistradas') || []).length,
      ofertas: (this.datos.get('Ofertas') || []).length
    };
    
    console.log('📊 Estadísticas generales:', stats);
    return stats;
  }

  get resumenIntegridad() {
    return this.integridadResumen;
  }

  getDiagnostics() {
    return { ...this.diagnostics, integridad: this.integridadResumen };
  }

  private getIndex(tabla: string, nombre: string): Map<string, any[]> | undefined {
    return this.indices.get(`${tabla}_${nombre}`);
  }

  private getByIndex(tabla: string, nombre: string, ...claves: string[]) {
    const idx = this.getIndex(tabla, nombre);
    if (!idx) return [];
    const k = claves.join('|');
    return idx.get(k) ?? [];
  }

  // ================================
  // REPORTES EJECUTIVOS CENTRALIZADOS
  // ================================

  public generarReporteEjecutivo(parametros: ReporteEjecutivoParametros = {}): ReporteEjecutivo {
    const periodo = parametros.periodo ?? this.obtenerPeriodoDefault();
    const resumenGeneral = this.generarResumenGeneral(periodo, parametros.sectores);
    const tendenciasMercado = this.analizarTendenciasMercado(periodo, parametros.sectores);
    const analisisCompetencia = this.analizarCompetenciaDetallado(parametros.competidores, periodo);
    const oportunidades = parametros.incluirOportunidades
      ? this.identificarOportunidades(parametros.idProveedor, parametros.sectores)
      : [];
    const recomendaciones = this.generarRecomendaciones({
      ...parametros,
      periodo,
      analisisCompetencia,
      resumenGeneral
    });

    return {
      resumenGeneral,
      tendenciasMercado,
      analisisCompetencia,
      oportunidades,
      recomendaciones
    };
  }

  public analizarPosicionCompetitiva(idProveedor: string, periodo?: { inicio: Date; fin: Date }): any {
    const proveedor = this.obtenerDatos('Proveedores')
      .find((p: any) => p.idProveedor === idProveedor);

    if (!proveedor) {
      throw new Error(`Proveedor ${idProveedor} no encontrado`);
    }

    let contratos = this.obtenerDatos('Contratos')
      .filter((c: any) => c.idProveedor === idProveedor);

    if (periodo) {
      contratos = contratos.filter((c: any) => this.estaEnPeriodo(c.fechaFirma, periodo));
    }

    const ofertas = this.obtenerDatos('Ofertas')
      .filter((o: any) => o.idProveedor === idProveedor);

    const lineasAdjudicadas = this.obtenerDatos('LineasAdjudicadas')
      .filter((l: any) => l.idProveedorAdjudicado === idProveedor);

    const tasaExito = ofertas.length > 0 ? (contratos.length / ofertas.length) * 100 : 0;
    // Usar método robusto y optimizado para calcular monto total
    const montoTotal = _.sumBy(contratos, (c: any) => this.obtenerMontoContratoPreciso(c));

    const competidoresDirectos = this.obtenerCompetidoresDirectos(idProveedor);
    const sectoresActividad = this.analizarSectoresActividad(idProveedor);

    return {
      proveedor: proveedor.nombreProveedor,
      estadisticas: {
        totalContratos: contratos.length,
        montoTotal,
        montoPromedio: contratos.length ? montoTotal / contratos.length : 0,
        tasaExito,
        totalOfertas: ofertas.length,
        lineasGanadas: lineasAdjudicadas.length
      },
      competidoresDirectos,
      sectoresActividad,
      fortalezas: this.identificarFortalezasProveedor(idProveedor),
      debilidadesAmenazas: this.identificarDebilidadesProveedor(idProveedor),
      recomendacionesEstrategicas: this.generarRecomendacionesEstrategicas(idProveedor)
    };
  }

  public analizarTendenciasPrecios(sectores: string[], periodo?: { inicio: Date; fin: Date }): any {
    const lineasCartel = this.obtenerDatos('DetalleLineaCartel');
    const lineasAdjudicadas = this.obtenerDatos('LineasAdjudicadas');
    const carteles = this.obtenerDatos('DetalleCarteles');

    const lineasSector = lineasCartel.filter((linea: any) => {
      const cartel = carteles.find((c: any) => c.numeroCartel === linea.numeroCartel);
      if (!cartel) return false;

      if (periodo && !this.estaEnPeriodo(cartel.fechaPublicacion, periodo)) {
        return false;
      }

      const textoCartel = `${cartel.nombreCartel || ''} ${cartel.descripcionCartel || ''} ${linea.descripcionLinea || ''}`.toLowerCase();
      return sectores.some(sector => textoCartel.includes(sector.toLowerCase()));
    });

    const preciosHistoricos: any[] = [];

    lineasSector.forEach((linea: any) => {
      const adjudicacion = lineasAdjudicadas.find((adj: any) =>
        adj.numeroCartel === linea.numeroCartel && adj.numeroLinea === linea.numeroLinea
      );

      if (adjudicacion) {
        const cartel = carteles.find((c: any) => c.numeroCartel === linea.numeroCartel);
        preciosHistoricos.push({
          fecha: cartel?.fechaPublicacion,
          producto: linea.descripcionLinea,
          precio: this.normalizarNumero(adjudicacion.precioAdjudicado),
          cantidad: this.normalizarNumero(adjudicacion.cantidadAdjudicada),
          proveedor: adjudicacion.idProveedorAdjudicado,
          cartel: linea.numeroCartel
        });
      }
    });

    const productosSimilares = this.agruparProductosSimilares(preciosHistoricos);

    return {
      totalProductos: Object.keys(productosSimilares).length,
      tendenciasPorProducto: this.calcularTendenciasPorProducto(productosSimilares),
      variabilidadPrecios: this.calcularVariabilidadPrecios(preciosHistoricos),
      proveedoresDominantes: this.identificarProveedoresDominantes(preciosHistoricos)
    };
  }

  private obtenerPeriodoDefault(): { inicio: Date; fin: Date } {
    const fin = new Date();
    const inicio = new Date();
    inicio.setFullYear(fin.getFullYear() - 1);
    return { inicio, fin };
  }

  private estaEnPeriodo(fecha: any, periodo: { inicio: Date; fin: Date }): boolean {
    const dt = this.toDate(fecha);
    if (!dt) return false;
    return dt >= periodo.inicio && dt <= periodo.fin;
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizarNumero(valor: any, fallback = 0): number {
    if (typeof valor === 'number') {
      return isNaN(valor) ? fallback : valor;
    }
    if (valor == null || valor === '') return fallback;
    const parsed = this.parseNumeroFlexible(String(valor));
    return parsed != null && !isNaN(parsed) ? parsed : fallback;
  }

  /**
   * Obtiene el monto de un contrato intentando múltiples campos posibles
   * Solución robusta para diferentes formatos de CSV
   */
  private obtenerMontoContrato(contrato: any): number {
    // Lista priorizada de campos posibles para monto
    const camposPosibles = [
      'montoContrato',       // Campo estándar normalizado
      'montoTotal',          // Variante común
      'monto',               // Genérico
      'valorContrato',       // Alternativa
      'montoAdjudicado',     // Desde adjudicación
      'montoTotalContrato',  // Variante extendida
      'precioTotal',         // Precio en vez de monto
      'importe',             // Término contable
      'total',               // Genérico corto
      'valor',               // Genérico
      'montoTotalAdjudicado' // De adjudicación firme
    ];
    
    // Intentar cada campo en orden de prioridad
    for (const campo of camposPosibles) {
      const valor = contrato[campo];
      if (valor != null && valor !== '' && valor !== 0) {
        const montoNormalizado = this.normalizarNumero(valor);
        if (montoNormalizado > 0) {
          return montoNormalizado;
        }
      }
    }
    
    // Si no se encontró ningún campo válido, retornar 0
    return 0;
  }

  /**
   * ESTRATEGIA ÓPTIMA: Calcula monto de contrato con cascada de fuentes
   * 
   * Nivel 1 (95% confianza): Calcula desde LineasContratadas (suma de líneas)
   * Nivel 2 (70% confianza): Campo directo en Contratos.montoContrato
   * Nivel 3 (50% confianza): Desde AdjudicacionesFirme (aproximado)
   * 
   * Usa caché para evitar recálculos
   */
  public obtenerMontoContratoPreciso(contrato: any): number {
    const idContrato = String(contrato.idContrato || '').trim();
    if (!idContrato) return 0;
    
    // Verificar caché
    if (this.montoCache.has(idContrato)) {
      return this.montoCache.get(idContrato)!.monto;
    }
    
    // Nivel 1: Calcular desde LineasContratadas (MÁS PRECISO)
    const montoLineas = this.calcularMontoDesdeLineas(idContrato);
    if (montoLineas > 0) {
      this.montoCache.set(idContrato, { monto: montoLineas, fuente: 'lineas', confianza: 95 });
      return montoLineas;
    }
    
    // Nivel 2: Campo directo en Contratos (fallback)
    const montoDirecto = this.obtenerMontoContrato(contrato);
    if (montoDirecto > 0) {
      this.montoCache.set(idContrato, { monto: montoDirecto, fuente: 'directo', confianza: 70 });
      return montoDirecto;
    }
    
    // Nivel 3: Desde AdjudicacionesFirme (último recurso)
    if (contrato.numeroCartel) {
      const montoAdjudicacion = this.calcularMontoDesdeAdjudicacion(contrato.numeroCartel);
      if (montoAdjudicacion > 0) {
        this.montoCache.set(idContrato, { monto: montoAdjudicacion, fuente: 'adjudicacion', confianza: 50 });
        return montoAdjudicacion;
      }
    }
    
    // Sin datos disponibles
    this.montoCache.set(idContrato, { monto: 0, fuente: 'vacio', confianza: 0 });
    return 0;
  }

  /**
   * Calcula monto de un contrato sumando sus LineasContratadas
   * Intenta primero monto directo, luego calcula desde precio × cantidad
   */
  private calcularMontoDesdeLineas(idContrato: string): number {
    const lineas = this.obtenerDatos('LineasContratadas')
      .filter((l: any) => String(l.idContrato || '').trim() === idContrato);
    
    if (lineas.length === 0) return 0;
    
    const montoTotal = _.sumBy(lineas, (linea: any) => {
      // Intentar campos de monto directo
      const camposMonto = [
        'montoLineaContratada', 'montoTotal', 'monto', 
        'montoLineaAdjudicada', 'valorLinea'
      ];
      
      for (const campo of camposMonto) {
        const valor = linea[campo];
        if (valor != null && valor !== '' && valor !== 0) {
          const monto = this.normalizarNumero(valor);
          if (monto > 0) return monto;
        }
      }
      
      // Si no hay monto directo, calcular desde precio × cantidad
      const camposPrecio = [
        'precioUnitario', 'precioAdjudicado', 'precioUnitarioAdjudicado',
        'precio', 'precioUnitarioContratado'
      ];
      
      const camposCantidad = [
        'cantidad', 'cantidadContratada', 'cantidadAdjudicada'
      ];
      
      let precio = 0;
      for (const campo of camposPrecio) {
        const valor = linea[campo];
        if (valor != null && valor !== '' && valor !== 0) {
          precio = this.normalizarNumero(valor);
          if (precio > 0) break;
        }
      }
      
      let cantidad = 0;
      for (const campo of camposCantidad) {
        const valor = linea[campo];
        if (valor != null && valor !== '' && valor !== 0) {
          cantidad = this.normalizarNumero(valor);
          if (cantidad > 0) break;
        }
      }
      
      if (precio > 0 && cantidad > 0) {
        return precio * cantidad;
      }
      
      return 0;
    });
    
    return montoTotal;
  }

  /**
   * Calcula monto aproximado desde AdjudicacionesFirme
   * Divide el monto total adjudicado entre el número de contratos del cartel
   */
  private calcularMontoDesdeAdjudicacion(numeroCartel: string): number {
    const adjudicaciones = this.obtenerDatos('AdjudicacionesFirme');
    const adjudicacion = adjudicaciones.find((a: any) => a.numeroCartel === numeroCartel);
    
    if (!adjudicacion || !adjudicacion.montoTotalAdjudicado) return 0;
    
    // Contar contratos del mismo cartel para dividir proporcionalmente
    const contratosCartel = this.obtenerDatos('Contratos')
      .filter((c: any) => c.numeroCartel === numeroCartel);
    
    if (contratosCartel.length === 0) return 0;
    
    const montoTotal = this.normalizarNumero(adjudicacion.montoTotalAdjudicado);
    return montoTotal / contratosCartel.length;
  }

  /**
   * Pre-calcula todos los montos de contratos para optimizar reportes
   * Ejecutar después de cargar datos
   */
  private precalcularMontos(): void {
    console.time('⚡ Precálculo de montos');
    
    const contratos = this.obtenerDatos('Contratos');
    if (!contratos || contratos.length === 0) {
      console.timeEnd('⚡ Precálculo de montos');
      return;
    }
    
    // Limpiar caché anterior
    this.montoCache.clear();
    
    // Calcular monto para cada contrato
    contratos.forEach((contrato: any) => {
      this.obtenerMontoContratoPreciso(contrato);
    });
    
    // Generar estadísticas de distribución de fuentes
    const distribucion: Record<string, number> = {};
    for (const { fuente } of this.montoCache.values()) {
      distribucion[fuente] = (distribucion[fuente] || 0) + 1;
    }
    
    const totalCalculados = this.montoCache.size;
    const conMontoValido = Array.from(this.montoCache.values())
      .filter(info => info.monto > 0).length;
    
    console.timeEnd('⚡ Precálculo de montos');
    console.log(`📊 Montos calculados: ${conMontoValido}/${totalCalculados} (${((conMontoValido/totalCalculados)*100).toFixed(1)}%)`);
    console.log(`📈 Distribución de fuentes:`, distribucion);
    
    // Advertencia si más del 20% está vacío
    const porcentajeVacio = ((distribucion.vacio || 0) / totalCalculados) * 100;
    if (porcentajeVacio > 20) {
      console.warn(`⚠️ ${porcentajeVacio.toFixed(1)}% de contratos sin monto válido`);
    }
  }

  /**
   * 🚀 PRE-CÁLCULO DE MÉTRICAS PESADAS
   * Ejecuta clasificaciones y cálculos costosos durante la carga inicial
   * para que estén en caché cuando el usuario navegue por primera vez
   */
  private precalcularMetricas(): void {
    console.group('⚡ Pre-cálculo de métricas pesadas');
    const startTime = performance.now();
    
    try {
      // 1. Pre-calcular clasificación de sectores (1.8M operaciones de regex)
      console.log('📊 Clasificando sectores por cartel...');
      const sectoresStart = performance.now();
      this.asignarSectorPorCartel();
      console.log(`   ✅ Sectores clasificados en ${Math.round(performance.now() - sectoresStart)}ms`);
      
      // 2. Pre-calcular montos estimados por cartel
      console.log('💰 Calculando montos estimados...');
      const montosStart = performance.now();
      this.calcularMontosEstimadosPorCartel();
      console.log(`   ✅ Montos calculados en ${Math.round(performance.now() - montosStart)}ms`);
      
      // 3. Pre-cargar reglas de subcategorías más comunes
      console.log('📋 Pre-cargando reglas de subcategorías...');
      const subcatStart = performance.now();
      const sectoresComunes = ['Tecnología', 'Construcción', 'Salud', 'Educación', 'Transporte'];
      sectoresComunes.forEach(sector => {
        this.getSubcategoryRules(sector);
      });
      console.log(`   ✅ Reglas cargadas en ${Math.round(performance.now() - subcatStart)}ms`);
      
      const totalTime = Math.round(performance.now() - startTime);
      console.log(`🎉 Pre-cálculo completado en ${totalTime}ms`);
      console.log(`📈 Cache stats:`, {
        sectores: `${this.cacheStats.sectores.hits}H/${this.cacheStats.sectores.misses}M`,
        montos: `${this.cacheStats.montos.hits}H/${this.cacheStats.montos.misses}M`
      });
    } catch (error) {
      console.error('⚠️ Error en pre-cálculo de métricas:', error);
      // No lanzar error, permitir que la app continúe sin pre-cálculo
    }
    
    console.groupEnd();
  }

  /**
   * Diagnostica qué campos relacionados con montos existen en una tabla
   * Útil para debugging cuando los montos salen en 0
   */
  private diagnosticarCamposMontos(tabla: string, mostrarMuestra: boolean = false): void {
    const datos = this.obtenerDatos(tabla);
    if (!datos || !datos.length) {
      console.warn(`[${tabla}] ⚠️ Tabla vacía o no existe`);
      return;
    }
    
    const muestra = datos[0];
    const camposDisponibles = Object.keys(muestra);
    
    // Buscar campos que podrían contener montos
    const camposRelacionadosConMonto = camposDisponibles.filter(c => 
      /monto|precio|total|valor|importe|amount|cost|price/i.test(c)
    );
    
    console.group(`[${tabla}] 🔍 Diagnóstico de Campos de Monto`);
    console.log(`📊 Total de registros: ${datos.length}`);
    console.log(`📋 Campos disponibles: ${camposDisponibles.length}`);
    console.log(`💰 Campos relacionados con monto: ${camposRelacionadosConMonto.length}`);
    
    if (camposRelacionadosConMonto.length > 0) {
      console.log(`✅ Campos encontrados:`, camposRelacionadosConMonto);
      
      if (mostrarMuestra) {
        const valoresMuestra: any = {};
        camposRelacionadosConMonto.forEach(campo => {
          valoresMuestra[campo] = muestra[campo];
        });
        console.log(`📝 Muestra de valores:`, valoresMuestra);
        
        // Estadísticas de llenado
        camposRelacionadosConMonto.forEach(campo => {
          const conValor = datos.filter((d: any) => d[campo] != null && d[campo] !== '' && d[campo] !== 0).length;
          const porcentaje = ((conValor / datos.length) * 100).toFixed(1);
          console.log(`  ${campo}: ${conValor}/${datos.length} (${porcentaje}%)`);
        });
      }
    } else {
      console.warn(`❌ No se encontraron campos de monto en esta tabla`);
      console.log(`📋 Todos los campos:`, camposDisponibles);
    }
    console.groupEnd();
  }

  /**
   * Valida la integridad de los datos de montos
   * Retorna advertencias si hay problemas significativos
   */
  private validarIntegridadMontos(): {
    tablasConProblemas: string[];
    advertencias: string[];
    estadisticas: Record<string, any>;
  } {
    const problemas: string[] = [];
    const advertencias: string[] = [];
    const estadisticas: Record<string, any> = {};
    
    // Validar tabla Contratos
    const contratos = this.obtenerDatos('Contratos');
    if (contratos && contratos.length > 0) {
      const contratosSinMonto = contratos.filter(c => {
        const monto = this.obtenerMontoContrato(c);
        return monto === 0;
      });
      
      const porcentajeSinMonto = (contratosSinMonto.length / contratos.length) * 100;
      estadisticas['Contratos'] = {
        total: contratos.length,
        sinMonto: contratosSinMonto.length,
        porcentajeSinMonto: porcentajeSinMonto.toFixed(1) + '%'
      };
      
      if (porcentajeSinMonto > 50) {
        problemas.push('Contratos');
        advertencias.push(
          `⚠️ CRÍTICO: ${contratosSinMonto.length}/${contratos.length} contratos (${porcentajeSinMonto.toFixed(1)}%) sin monto válido`
        );
      } else if (porcentajeSinMonto > 20) {
        advertencias.push(
          `⚠️ ADVERTENCIA: ${contratosSinMonto.length}/${contratos.length} contratos (${porcentajeSinMonto.toFixed(1)}%) sin monto válido`
        );
      }
    }
    
    // Validar tabla LineasContratadas
    const lineasContratadas = this.obtenerDatos('LineasContratadas');
    if (lineasContratadas && lineasContratadas.length > 0) {
      const lineasSinMonto = lineasContratadas.filter((l: any) => 
        (!l.montoTotal || l.montoTotal === 0) &&
        (!l.montoLineaContratada || l.montoLineaContratada === 0) &&
        (!l.precioUnitario || l.precioUnitario === 0)
      );
      
      const porcentajeSinMonto = (lineasSinMonto.length / lineasContratadas.length) * 100;
      estadisticas['LineasContratadas'] = {
        total: lineasContratadas.length,
        sinMonto: lineasSinMonto.length,
        porcentajeSinMonto: porcentajeSinMonto.toFixed(1) + '%'
      };
      
      if (porcentajeSinMonto > 50) {
        problemas.push('LineasContratadas');
        advertencias.push(
          `⚠️ ${lineasSinMonto.length}/${lineasContratadas.length} líneas contratadas (${porcentajeSinMonto.toFixed(1)}%) sin monto válido`
        );
      }
    }
    
    return { tablasConProblemas: problemas, advertencias, estadisticas };
  }

  private generarResumenGeneral(periodo: { inicio: Date; fin: Date }, sectores?: string[]): ResumenGeneral {
    let carteles = this.obtenerDatos('DetalleCarteles')
      .filter((c: any) => this.estaEnPeriodo(c.fechaPublicacion, periodo));

    let contratos = this.obtenerDatos('Contratos')
      .filter((c: any) => this.estaEnPeriodo(c.fechaFirma, periodo));

    if (sectores && sectores.length > 0) {
      carteles = this.filtrarPorSectores(carteles, sectores);
      contratos = this.filtrarContratosPorSectores(contratos, sectores);
    }

    // Calcular monto total usando método robusto y optimizado
    const montoTotal = _.sumBy(contratos, (c: any) => this.obtenerMontoContratoPreciso(c));
    const crecimiento = this.calcularCrecimientoAnual(contratos, periodo);

    return {
      periodo,
      totalLicitaciones: carteles.length,
      totalContratos: contratos.length,
      montoTotalAdjudicado: montoTotal,
      crecimientoAnual: crecimiento,
      institucionesMasActivas: this.obtenerInstitucionesMasActivas(carteles, contratos),
      sectoresPrincipales: this.obtenerSectoresPrincipales(carteles)
    };
  }

  private analizarTendenciasMercado(periodo: { inicio: Date; fin: Date }, sectores?: string[]): TendenciasMercado {
    let carteles = this.obtenerDatos('DetalleCarteles')
      .filter((c: any) => this.estaEnPeriodo(c.fechaPublicacion, periodo));

    let contratos = this.obtenerDatos('Contratos')
      .filter((c: any) => this.estaEnPeriodo(c.fechaFirma, periodo));

    if (sectores && sectores.length > 0) {
      carteles = this.filtrarPorSectores(carteles, sectores);
      contratos = this.filtrarContratosPorSectores(contratos, sectores);
    }

    return {
      evolucionMontos: this.calcularEvolucionMontos(contratos),
      evolucionCantidad: this.calcularEvolucionCantidad(carteles),
      estacionalidad: this.calcularEstacionalidad(carteles),
      competenciaPromedio: this.calcularCompetenciaPromedio(carteles),
      tiempoPromedioProceso: this.calcularTiempoPromedioProceso(carteles)
    };
  }

  private analizarCompetenciaDetallado(competidores?: string[], periodo?: { inicio: Date; fin: Date }): AnalisisCompetenciaDetallado {
    let contratos = this.obtenerDatos('Contratos');

    if (periodo) {
      contratos = contratos.filter((c: any) => this.estaEnPeriodo(c.fechaFirma, periodo));
    }

    if (competidores && competidores.length > 0) {
      contratos = contratos.filter((c: any) => competidores.includes(c.idProveedor));
    }

    const ranking = this.generarRankingProveedores(contratos);

    return {
      ranking,
      concentracionMercado: this.calcularConcentracionMercado(ranking),
      nuevosEntrantes: this.identificarNuevosEntrantes(periodo),
      proveedoresEnDecadencia: this.identificarProveedoresEnDecadencia(periodo),
      colaboracionesFrecuentes: this.analizarColaboraciones(contratos)
    };
  }

  private identificarOportunidades(idProveedor?: string, sectores?: string[]): Oportunidad[] {
    const oportunidades: Oportunidad[] = [];

    oportunidades.push(...this.identificarNichosPocaCompetencia(sectores));
    oportunidades.push(...this.identificarMercadosCrecientes(sectores));

    if (idProveedor) {
      oportunidades.push(...this.identificarClientesPotenciales(idProveedor));
    }

    return _.orderBy(oportunidades, 'montoEstimado', 'desc').slice(0, 10);
  }

  private filtrarPorSectores(carteles: any[], sectores: string[]): any[] {
    return carteles.filter(cartel => {
      const texto = `${cartel.nombreCartel || ''} ${cartel.descripcionCartel || ''}`.toLowerCase();
      return sectores.some(sector => texto.includes(sector.toLowerCase()));
    });
  }

  private filtrarContratosPorSectores(contratos: any[], sectores: string[]): any[] {
    const lineasContratadas = this.obtenerDatos('LineasContratadas');
    const lineasCartel = this.obtenerDatos('DetalleLineaCartel');

    const contratosConSector = new Set<string>();

    lineasContratadas.forEach((lineaContratada: any) => {
      const lineaCartel = lineasCartel.find((lc: any) =>
        lc.numeroCartel === lineaContratada.numeroCartel &&
        lc.numeroLinea === lineaContratada.numeroLinea
      );

      if (lineaCartel) {
        const descripcion = String(lineaCartel.descripcionLinea || '').toLowerCase();
        const tieneSector = sectores.some(sector => descripcion.includes(sector.toLowerCase()));

        if (tieneSector) {
          contratosConSector.add(String(lineaContratada.idContrato));
        }
      }
    });

    return contratos.filter(contrato => contratosConSector.has(String(contrato.idContrato)));
  }

  private calcularCrecimientoAnual(contratos: any[], periodo: { inicio: Date; fin: Date }): number {
    const añoInicio = periodo.inicio.getFullYear();
    const añoFin = periodo.fin.getFullYear();

    if (añoInicio === añoFin) return 0;

    const contratosInicio = contratos.filter(c => this.toDate(c.fechaFirma)?.getFullYear() === añoInicio);
    const contratosFin = contratos.filter(c => this.toDate(c.fechaFirma)?.getFullYear() === añoFin);

    // Usar método robusto y optimizado para obtener montos
    const montoInicio = _.sumBy(contratosInicio, (c: any) => this.obtenerMontoContratoPreciso(c)) || 1;
    const montoFin = _.sumBy(contratosFin, (c: any) => this.obtenerMontoContratoPreciso(c)) || 0;

    return ((montoFin - montoInicio) / montoInicio) * 100;
  }

  private obtenerInstitucionesMasActivas(carteles: any[], contratos: any[]): any[] {
    const instituciones = this.obtenerDatos('InstitucionesRegistradas');

    const actividad = _.groupBy(carteles, 'codigoInstitucion');
    const montos = _.groupBy(contratos, 'codigoInstitucion');

    return _.map(actividad, (cartelesInst, codigo) => {
      const institucion = instituciones.find((i: any) => i.codigoInstitucion === codigo);
      const contratosInst = montos[codigo] || [];

      return {
        nombre: institucion?.nombreInstitucion || 'Desconocida',
        cantidad: cartelesInst.length,
        // Usar método robusto y optimizado para sumar montos
        monto: _.sumBy(contratosInst, (c: any) => this.obtenerMontoContratoPreciso(c))
      };
    })
    .filter((inst: any) => inst.cantidad > 0)
    .sort((a: any, b: any) => b.monto - a.monto)
    .slice(0, 10);
  }

  private obtenerSectoresPrincipales(carteles: any[]): any[] {
    const palabrasClave = [
      'medicamento', 'salud', 'educación', 'tecnología', 'construcción',
      'transporte', 'seguridad', 'alimentos', 'servicios', 'consultoría'
    ];

    const sectores = palabrasClave.map(sector => {
      const cartelesDelSector = carteles.filter(cartel => {
        const texto = `${cartel.nombreCartel || ''} ${cartel.descripcionCartel || ''}`.toLowerCase();
        return texto.includes(sector);
      });

      return {
        sector,
        participacion: carteles.length ? (cartelesDelSector.length / carteles.length) * 100 : 0
      };
    })
    .filter(sector => sector.participacion > 0)
    .sort((a, b) => b.participacion - a.participacion);

    return sectores.slice(0, 5);
  }

  private calcularEvolucionMontos(contratos: any[]): any[] {
    const porMes = _.groupBy(contratos, contrato => {
      const fecha = this.toDate(contrato.fechaFirma);
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    return _.map(porMes, (contratosDelMes, periodo) => ({
      periodo,
      // Usar método robusto y optimizado para sumar montos
      monto: _.sumBy(contratosDelMes, (c: any) => this.obtenerMontoContratoPreciso(c))
    }))
    .filter(item => item.periodo !== 'Sin fecha')
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  private calcularEvolucionCantidad(carteles: any[]): any[] {
    const porMes = _.groupBy(carteles, cartel => {
      const fecha = this.toDate(cartel.fechaPublicacion);
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    return _.map(porMes, (cartelesDelMes, periodo) => ({
      periodo,
      cantidad: cartelesDelMes.length
    }))
    .filter(item => item.periodo !== 'Sin fecha')
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  private calcularEstacionalidad(carteles: any[]): any[] {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const porMes = _.groupBy(carteles, cartel => {
      const fecha = this.toDate(cartel.fechaPublicacion);
      return fecha ? fecha.getMonth() : -1;
    });

    return meses.map((mes, index) => ({
      mes,
      actividad: (porMes[index] || []).length
    }));
  }

  private calcularCompetenciaPromedio(_: any[]): number {
    const lineasRecibidas = this.obtenerDatos('LineasRecibidas');
    const totalOfertas = lineasRecibidas.reduce((acc: number, linea: any) => acc + this.normalizarNumero(linea.cantidadOfertasRecibidas), 0);
    return lineasRecibidas.length ? totalOfertas / lineasRecibidas.length : 0;
  }

  private calcularTiempoPromedioProceso(carteles: any[]): number {
    const fechasPorEtapas = this.obtenerDatos('FechaPorEtapas');

    const tiempos = carteles.map(cartel => {
      const fechas = fechasPorEtapas.find((f: any) => f.numeroCartel === cartel.numeroCartel);
      if (!fechas) return 0;

      const inicio = this.toDate(fechas.fechaPublicacion);
      const fin = this.toDate(fechas.fechaAdjudicacion);
      if (!inicio || !fin) return 0;

      return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    }).filter(tiempo => tiempo > 0);

    return _.mean(tiempos) || 0;
  }

  private generarRankingProveedores(contratos: any[]): RankingProveedor[] {
    const proveedores = this.obtenerDatos('Proveedores');
    const ofertas = this.obtenerDatos('Ofertas');

    const porProveedor = _.groupBy(contratos, 'idProveedor');

    return _.map(porProveedor, (contratosProveedor, idProveedor) => {
      const proveedor = proveedores.find((p: any) => p.idProveedor === idProveedor);
      const ofertasProveedor = ofertas.filter((o: any) => o.idProveedor === idProveedor);
      // Usar método robusto y optimizado para calcular monto total
      const montoTotal = _.sumBy(contratosProveedor, (c: any) => this.obtenerMontoContratoPreciso(c));

      return {
        id: idProveedor,
        nombre: proveedor?.nombreProveedor || 'Desconocido',
        posicion: 0,
        cantidadContratos: contratosProveedor.length,
        montoTotal,
        marketShare: 0,
        tasaExito: ofertasProveedor.length > 0 ?
          (contratosProveedor.length / ofertasProveedor.length) * 100 : 0,
        sectoresPrincipales: [],
        crecimiento: 0
      } as RankingProveedor;
    })
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .map((proveedor, index) => ({ ...proveedor, posicion: index + 1 }));
  }

  private calcularConcentracionMercado(ranking: RankingProveedor[]): number {
    const montoTotal = _.sumBy(ranking, 'montoTotal');
    const top5 = _.take(ranking, 5);
    const montoTop5 = _.sumBy(top5, 'montoTotal');

    return montoTotal > 0 ? (montoTop5 / montoTotal) * 100 : 0;
  }

  private identificarNuevosEntrantes(_: { inicio: Date; fin: Date } | undefined): Proveedor[] {
    // TODO: Implementar lógica para identificar nuevos entrantes
    return [];
  }

  private identificarProveedoresEnDecadencia(_: { inicio: Date; fin: Date } | undefined): Proveedor[] {
    // TODO: Implementar lógica para identificar proveedores en decadencia
    return [];
  }

  private analizarColaboraciones(_: any[]): any[] {
    // TODO: Implementar análisis de colaboraciones frecuentes
    return [];
  }

  private identificarNichosPocaCompetencia(_: string[] | undefined): Oportunidad[] {
    // TODO: Implementar identificación de nichos con baja competencia
    return [];
  }

  private identificarMercadosCrecientes(_: string[] | undefined): Oportunidad[] {
    // TODO: Implementar identificación de mercados en crecimiento
    return [];
  }

  private identificarClientesPotenciales(_: string): Oportunidad[] {
    // TODO: Implementar identificación de clientes potenciales
    return [];
  }

  private obtenerCompetidoresDirectos(_: string): any[] {
    // TODO: Implementar obtención de competidores directos
    return [];
  }

  private analizarSectoresActividad(_: string): any[] {
    // TODO: Implementar análisis de sectores de actividad
    return [];
  }

  private identificarFortalezasProveedor(_: string): string[] {
    // TODO: Implementar identificación de fortalezas del proveedor
    return [];
  }

  private identificarDebilidadesProveedor(_: string): string[] {
    // TODO: Implementar identificación de debilidades del proveedor
    return [];
  }

  private generarRecomendacionesEstrategicas(_: string): string[] {
    // TODO: Implementar recomendaciones estratégicas específicas
    return [];
  }

  private agruparProductosSimilares(precios: any[]): Record<string, any[]> {
    // TODO: Implementar agrupación de productos similares
    return {};
  }

  private calcularTendenciasPorProducto(productos: Record<string, any[]>): any[] {
    // TODO: Implementar cálculo de tendencias por producto
    return [];
  }

  private calcularVariabilidadPrecios(_: any[]): any {
    // TODO: Implementar cálculo de variabilidad de precios
    return {};
  }

  private identificarProveedoresDominantes(_: any[]): any[] {
    // TODO: Implementar identificación de proveedores dominantes
    return [];
  }

  private generarRecomendaciones(_: any): string[] {
    const recomendaciones: string[] = [];

    recomendaciones.push('Considere diversificar su portafolio de clientes');
    recomendaciones.push('Analice las tendencias estacionales para optimizar sus ofertas');
    recomendaciones.push('Evalúe oportunidades en nichos con poca competencia');

    return recomendaciones;
  }

  // ================================
  // PROVEEDORES - RESOLUCIÓN UNIFICADA DE NOMBRES
  // ================================
  private buildProveedorNombreMap(): Map<string, string> {
    const map = new Map<string, string>();
    const proveedores: any[] = this.datos.get('Proveedores') || [];
    const ofertas: any[] = this.datos.get('Ofertas') || [];
    const invit: any[] = this.datos.get('InvitacionProcedimiento') || [];
    const garant: any[] = this.datos.get('Garantias') || [];
    const recursos: any[] = this.datos.get('RecursosObjecion') || [];
    const sanc: any[] = this.datos.get('SancionProveedores') || [];
    const la: any[] = this.datos.get('LineasAdjudicadas') || [];
    const contratos: any[] = this.datos.get('Contratos') || [];

    const onlyDigits = (s: any) => String(s ?? '').replace(/\D+/g, '');
    const variants = (rawId: string): string[] => {
      const d = onlyDigits(rawId);
      const dz = d.replace(/^0+/, '');
      const out = new Set<string>([rawId, d, dz].filter(x => x));
      return Array.from(out);
    };
    
    // Helper para buscar valor en un objeto probando múltiples variantes de nombres
    const buscarCampo = (obj: any, variantes: string[]): any => {
      if (!obj || typeof obj !== 'object') return undefined;
      
      for (const nombreCampo of variantes) {
        // Buscar exacto
        if (obj[nombreCampo] !== undefined) return obj[nombreCampo];
        
        // Buscar case-insensitive
        const nombreLower = nombreCampo.toLowerCase();
        for (const key of Object.keys(obj)) {
          if (key.toLowerCase() === nombreLower) {
            return obj[key];
          }
        }
      }
      return undefined;
    };
    
    const extractNombre = (o: any): string => {
      // Buscar nombre en múltiples variantes de columnas
      const nombre = buscarCampo(o, [
        'nombreProveedor',
        'Nombre Proveedor',
        'nombre_proveedor',
        'nombre proveedor',
        'razonSocial',
        'razon_social',
        'nombre',
        'nom_proveedor',
        'NOMBRE_PROVEEDOR'
      ]);
      
      return String(nombre || '').trim();
    };
    
    const extractId = (o: any): string => {
      // Buscar ID en múltiples variantes de columnas
      const id = buscarCampo(o, [
        'idProveedor',
        'Cédula Proveedor',
        'cedula_proveedor',
        'cedula proveedor',
        'cédula proveedor',
        'CEDULA_PROVEEDOR',
        'cedula',
        'Cedula',
        'cedula_juridica',
        'id_proveedor'
      ]);
      
      return String(id || '').trim();
    };
    
    const register = (rawId: any, nombre: string) => {
      const r = String(rawId ?? '').trim();
      if (!r) return;
      const val = nombre && nombre.length ? nombre : r;
      variants(r).forEach(v => { if (v && !map.has(v)) map.set(v, val); });
    };

    // Registrar proveedores principales
    proveedores.forEach(p => {
      const id = extractId(p);
      const nombre = extractNombre(p);
      if (id) {
        register(id, nombre);
      }
    });
    
    console.log(`🔍 Proveedores mapeados desde tabla Proveedores: ${map.size}`);
    if (proveedores.length > 0 && map.size === 0) {
      console.warn('⚠️ No se pudieron mapear proveedores. Estructura de ejemplo:', proveedores[0]);
    }
    if (proveedores.length > 0) {
      console.log('📋 Campos disponibles en Proveedores[0]:', Object.keys(proveedores[0]));
      console.log('🔎 Primer proveedor mapeado:', proveedores[0]);
    }
    
    // Enriquecer con otras tablas sólo si aún no existe la variante
    const enrich = (arr: any[], idField: string, nameFields: string[]) => {
      arr.forEach(o => {
        const rawId = String(o?.[idField] ?? '').trim();
        if (!rawId) return;
        const nombre = nameFields.map(f => (o?.[f] || '')).find(v => v && String(v).trim().length) || '';
        if (!nombre) return;
        // Sólo registrar si no teníamos algún nombre distinto del id
        const had = variants(rawId).some(v => map.has(v) && map.get(v) !== v);
        if (!had) register(rawId, String(nombre).trim());
      });
    };
    
    enrich(ofertas, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(invit, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(garant, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(recursos, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(sanc, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(la, 'idProveedorAdjudicado', ['nombreProveedor','nom_proveedor','nombre']);
    enrich(contratos, 'idProveedor', ['nombreProveedor','nom_proveedor','nombre']);

    return map;
  }

  private resolveProveedorNombre(id: string, nombreProv: Map<string,string>): string {
    if (!id) return '';
    const onlyDigits = (s: any) => String(s ?? '').replace(/\D+/g, '');
    const stripLeadingZeros = (s: string) => s.replace(/^0+/, '');
    const raw = String(id).trim();
    const d = onlyDigits(raw);
    const dz = stripLeadingZeros(d);
    const direct = nombreProv.get(raw) || nombreProv.get(d) || nombreProv.get(dz);
    if (direct && direct !== raw) return direct;

    // Intentar índice
    try {
      const byIdx = this.getByIndex('Proveedores', 'pk_proveedores', raw) || this.getByIndex('Proveedores','pk_proveedores', d) || this.getByIndex('Proveedores','pk_proveedores', dz);
      if (byIdx && byIdx.length) {
        const r: any = byIdx[0];
        const nombre = (r.nombreProveedor || r.razonSocial || r.nombre || '').toString().trim();
        if (nombre && nombre !== raw) return nombre;
      }
    } catch {/* ignore */}

    // Escaneo lineal final sólo si no encontramos
    const provs: any[] = this.datos.get('Proveedores') || [];
    for (const p of provs) {
      const pid = stripLeadingZeros(onlyDigits(p.idProveedor));
      if (pid && pid === dz) {
        const nombre = (p.nombreProveedor || p.razonSocial || p.nombre || '').toString().trim();
        if (nombre) return nombre;
      }
    }
    return raw; // fallback id
  }

  // ================================
  // INSTITUCIONES - LISTAS Y DASHBOARD
  // ================================
  public getInstitucionesList(): Array<{ codigoInstitucion: string; nombre: string; siglas?: string }> {
    const inst: any[] = this.datos.get('InstitucionesRegistradas') || [];
    return inst.map((i: any) => ({
      codigoInstitucion: String(i.codigoInstitucion ?? '').trim(),
      nombre: (i.nombreInstitucion || i.siglas || i.codigoInstitucion || '').toString().trim(),
      siglas: (i.siglas || '').toString().trim() || undefined
    })).filter(x => x.codigoInstitucion);
  }

  public getInstitucionFilters(): {
    anios: number[];
    procedimientos: string[];
    categorias: string[];
    estados: string[];
  } {
    const carteles: any[] = this.datos.get('DetalleCarteles') || [];
    const contratos: any[] = this.datos.get('Contratos') || [];
    const aniosSet = new Set<number>();
    carteles.forEach(c => { const d = c.fechaPublicacion; if (d) aniosSet.add(new Date(d).getUTCFullYear()); });
    contratos.forEach(c => { const d = c.fechaFirma; if (d) aniosSet.add(new Date(d).getUTCFullYear()); });
    const procedimientos = Array.from(new Set<string>([
      ...carteles.map(c => c.codigoProcedimiento).filter(Boolean)
    ].map((x: any) => String(x))));
    
    // Combinar categorías del sistema con categorías manuales
    const systemCategories = Object.keys(this.SECTOR_RULES);
    const manualCategories = this.getManualCategoryNames();
    const categorias = Array.from(new Set<string>([...systemCategories, ...manualCategories, 'Otros']));
    
    const estados = Array.from(new Set<string>([
      ...carteles.map(c => c.estadoCartel).filter(Boolean),
      ...contratos.map(c => c.estadoContrato).filter(Boolean)
    ].map((x: any) => String(x))));
    return {
      anios: Array.from(aniosSet).sort((a, b) => a - b),
      procedimientos: procedimientos.sort(),
      categorias: categorias,
      estados: estados.sort()
    };
  }

  // ================================
  // CATEGORÍAS (SECTORES) - UTILIDADES PÚBLICAS
  // ================================
  public getSectorCategories(): string[] {
    // Combinar categorías del sistema con categorías manuales
    const systemCategories = Object.keys(this.SECTOR_RULES);
    const manualCategories = this.getManualCategoryNames();
    return Array.from(new Set<string>([...systemCategories, ...manualCategories, 'Otros']));
  }

  // Obtener nombres de categorías del sistema
  public getSystemCategoryNames(): string[] {
    return Object.keys(this.SECTOR_RULES);
  }

  // Obtener configuración de categorías desde localStorage
  private getCategoryConfiguration(): { categorias: Record<string, boolean> } {
    try {
      const configJson = localStorage.getItem('sicop.categoryConfiguration.v1');
      if (!configJson) {
        // Si no hay configuración, todas las categorías del sistema están activas por defecto
        const defaultConfig: Record<string, boolean> = {};
        Object.keys(this.SECTOR_RULES).forEach(cat => {
          defaultConfig[cat] = true;
        });
        return { categorias: defaultConfig };
      }
      
      const config = JSON.parse(configJson);
      return config || { categorias: {} };
    } catch (error) {
      console.warn('[DataManager] Error al cargar configuración de categorías:', error);
      return { categorias: {} };
    }
  }

  public getSectorRules(): Record<string, RegExp[]> {
    // Obtener configuración actual
    const config = this.getCategoryConfiguration();
    const manualCategoriesJson = localStorage.getItem('sicop.manualCategories.v1') || '[]';
    
    // Crear un hash único de la configuración actual
    const currentConfigKey = JSON.stringify(config) + '|' + manualCategoriesJson;
    
    // Verificar si el cache está vigente
    if (this.combinedSectorRulesCache && this.combinedSectorRulesCacheKey === currentConfigKey) {
      console.log('[DataManager.getSectorRules] ✅ CACHE VIGENTE - categorías:', Object.keys(this.combinedSectorRulesCache));
      return this.combinedSectorRulesCache;
    }
    
    // Cache inválido o no existe, regenerar
    if (this.combinedSectorRulesCache) {
      console.log('[DataManager.getSectorRules] 🔄 REGENERANDO - configuración cambió');
    } else {
      console.log('[DataManager.getSectorRules] ✅ GENERANDO NUEVO - no hay cache');
    }
    
    console.log('[DataManager.getSectorRules] Configuración cargada:', config);
    
    // Combinar reglas del sistema con reglas de categorías manuales
    const combined: Record<string, RegExp[]> = {};
    
    // Agregar solo categorías del sistema que estén activas
    for (const [categoria, reglas] of Object.entries(this.SECTOR_RULES)) {
      if (config.categorias[categoria] !== false) {
        combined[categoria] = reglas;
      }
    }
    console.log('[DataManager.getSectorRules] Categorías del sistema activas:', Object.keys(combined));
    
    // Agregar reglas de categorías manuales (solo las activas)
    const manualRules = this.getManualCategoryRules();
    console.log('[DataManager.getSectorRules] Categorías manuales:', Object.keys(manualRules));
    for (const [category, regexes] of Object.entries(manualRules)) {
      if (combined[category]) {
        // Si ya existe la categoría, combinar reglas
        combined[category] = [...combined[category], ...regexes];
      } else {
        // Si es nueva, agregarla
        combined[category] = regexes;
      }
    }
    
    console.log('[DataManager.getSectorRules] ✅ Total combinado:', Object.keys(combined));
    
    // Guardar en cache con su clave de configuración
    this.combinedSectorRulesCache = combined;
    this.combinedSectorRulesCacheKey = currentConfigKey;
    
    return combined;
  }

  /**
   * Invalida el cache de reglas de categorías (útil para debugging)
   */
  public invalidateSectorRulesCache(): void {
    console.log('[DataManager] 🗑️ Invalidando cache de reglas manualmente');
    this.combinedSectorRulesCache = null;
    this.combinedSectorRulesCacheKey = '';
  }

  // Obtener nombres de categorías manuales
  public getManualCategoryNames(): string[] {
    try {
      const rulesJson = localStorage.getItem('sicop.manualCategories.v1');
      if (!rulesJson) return [];
      
      const rules = JSON.parse(rulesJson);
      if (!Array.isArray(rules)) return [];
      
      return rules
        .filter((r: any) => r.activo !== false)
        .map((r: any) => r.nombre)
        .filter(Boolean);
    } catch (error) {
      console.warn('[DataManager] Error al cargar categorías manuales:', error);
      return [];
    }
  }

  // Convertir categorías manuales a reglas regex
  private getManualCategoryRules(): Record<string, RegExp[]> {
    try {
      const rulesJson = localStorage.getItem('sicop.manualCategories.v1');
      if (!rulesJson) return {};
      
      const rules = JSON.parse(rulesJson);
      if (!Array.isArray(rules)) return {};
      
      // Obtener configuración para verificar si están activas
      const config = this.getCategoryConfiguration();
      
      const result: Record<string, RegExp[]> = {};
      
      for (const rule of rules) {
        // Verificar: 1) activo en la regla misma, 2) activo en configuración
        const isActive = rule.activo !== false && config.categorias[rule.id] !== false;
        
        if (!isActive || !rule.nombre || !Array.isArray(rule.palabrasClave)) continue;
        
        const regexes: RegExp[] = [];
        for (const keyword of rule.palabrasClave) {
          try {
            // Crear regex que busque la palabra clave (case insensitive, word boundary)
            const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
            regexes.push(new RegExp(`\\b${pattern}\\b`, 'iu'));
          } catch (e) {
            console.warn(`[DataManager] Error creando regex para keyword "${keyword}":`, e);
          }
        }
        
        if (regexes.length > 0) {
          result[rule.nombre] = regexes;
        }
      }
      
      return result;
    } catch (error) {
      console.warn('[DataManager] Error al cargar reglas de categorías manuales:', error);
      return {};
    }
  }

  public getInstitucionDashboard(params: {
    institucion: string; // requerido (código)
    fechaDesde?: Date;
    fechaHasta?: Date;
    procedimientos?: string[];
    categorias?: string[]; // sectores
    estados?: string[]; // estado cartel/contrato
  }) {
    // 🚀 CACHE: Verificar si tenemos métricas cacheadas para estos parámetros
    const cacheKey = this.getCacheKey('institucion', params);
    const cached = this.institucionDashboardCache.get(cacheKey);
    if (cached && this.isCacheValid('dashboard', cached.timestamp)) {
      this.cacheStats.institucion.hits++;
      console.log('✅ Cache hit: getInstitucionDashboard');
      return cached.data;
    }
    this.cacheStats.institucion.misses++;
    
    const startTime = performance.now();
    const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
    const inst = normInst(params.institucion);
    if (!inst) throw new Error('institucion requerida');

    if (this.loggingMode === 'verbose') {
      console.log('🔍 getInstitucionDashboard params:', params, 'inst:', inst);
    } else {
      console.log(`🔍 Dashboard(inst=${inst}) filtros: fechas=${params.fechaDesde ? params.fechaDesde.getUTCFullYear() : '∞'}-${params.fechaHasta ? params.fechaHasta.getUTCFullYear() : '∞'}, proc=${params.procedimientos?.length ?? 0}, cat=${params.categorias?.length ?? 0}, est=${params.estados?.length ?? 0}`);
    }

    const inDateRange = (d: any) => {
      if (!d) return false;
      const dd = new Date(d);
      if (isNaN(+dd)) return false;
      if (params.fechaDesde && dd < params.fechaDesde) return false;
      if (params.fechaHasta && dd > params.fechaHasta) return false;
      return true;
    };

    const cartelesAll: any[] = this.datos.get('DetalleCarteles') || [];
    const contratosAll: any[] = this.datos.get('Contratos') || [];
    const ofertasAll: any[] = this.datos.get('Ofertas') || [];
    const fechasEtapas: any[] = this.datos.get('FechaPorEtapas') || [];
    const adjFirmes: any[] = this.datos.get('AdjudicacionesFirme') || [];
    const laAll: any[] = this.datos.get('LineasAdjudicadas') || [];
    const dlAll: any[] = this.datos.get('DetalleLineaCartel') || [];
    const loAll: any[] = this.datos.get('LineasOfertadas') || [];
    const recursos: any[] = this.datos.get('RecursosObjecion') || [];
    const remates: any[] = this.datos.get('Remates') || [];
    const sanciones: any[] = this.datos.get('SancionProveedores') || [];
    const reajustes: any[] = this.datos.get('ReajustePrecios') || [];
    const procADMAll: any[] = this.datos.get('ProcedimientoADM') || [];
    const procAdjAll: any[] = this.datos.get('ProcedimientoAdjudicacion') || [];

    if (this.loggingMode === 'verbose') {
      console.log('📊 Raw data counts:', {
        carteles: cartelesAll.length,
        contratos: contratosAll.length,
        ofertas: ofertasAll.length,
        fechasEtapas: fechasEtapas.length,
        adjFirmes: adjFirmes.length,
        lineasAdjudicadas: laAll.length
      });
    }

    // Sample institution codes for debugging (solo en modo detallado)
    if (this.loggingMode === 'verbose') {
      const instSample = cartelesAll.slice(0, 5).map(c => ({ 
        raw: c.codigoInstitucion, 
        normalized: normInst(c.codigoInstitucion),
        matches: normInst(c.codigoInstitucion) === inst
      }));
      console.log('🏢 Institution code samples:', instSample);
    }

    const sectorPorCartel = this.asignarSectorPorCartel();

    // Normalizar valores clave para evitar problemas de tipo/espacios
    let carteles = cartelesAll
      .map((c: any) => ({ ...c, numeroCartel: String(c.numeroCartel ?? '').trim(), codigoInstitucion: String(c.codigoInstitucion ?? '').trim() }))
      .filter(c => normInst(c.codigoInstitucion) === inst);

    let contratos = contratosAll
      .map((c: any) => ({ ...c, idContrato: String(c.idContrato ?? '').trim(), numeroCartel: String(c.numeroCartel ?? '').trim(), idProveedor: String(c.idProveedor ?? '').trim(), codigoInstitucion: String(c.codigoInstitucion ?? '').trim() }));

    // Algunos contratos no rellenan codigoInstitucion pero sí tienen numeroCartel
    const contratosPorInst = contratos.filter(c => normInst(c.codigoInstitucion) === inst);
    const contratosConCartel = contratos.filter(c => c.numeroCartel && carteles.some((ct: any) => String(ct.numeroCartel) === String(c.numeroCartel)));
  // Unir ambos conjuntos sin duplicados
  const contratosMap = new Map<string, any>();
  contratosPorInst.concat(contratosConCartel).forEach((c: any) => { contratosMap.set(String(c.idContrato || `${c.numeroCartel}_${c.idProveedor}`), c); });
  contratos = Array.from(contratosMap.values());

    if (this.loggingMode === 'verbose') {
      console.log('🎯 After institution filter:', {
        carteles: carteles.length,
        contratos: contratos.length,
        cartelSample: carteles.slice(0, 3).map(c => ({ nro: c.numeroCartel, inst: c.codigoInstitucion })),
        contratoSample: contratos.slice(0, 3).map(c => ({ id: c.idContrato, inst: c.codigoInstitucion, prov: c.idProveedor }))
      });
    }

    if (params.fechaDesde || params.fechaHasta) {
      carteles = carteles.filter(c => inDateRange(c.fechaPublicacion));
      contratos = contratos.filter(c => inDateRange(c.fechaFirma));
    }
    if (params.procedimientos && params.procedimientos.length) {
      const set = new Set(params.procedimientos.map(String));
      carteles = carteles.filter(c => set.has(String(c.codigoProcedimiento)));
      contratos = contratos.filter(c => set.has(String(c.codigoProcedimiento)));
    }
    if (params.categorias && params.categorias.length) {
      const set = new Set(params.categorias.map(String));
      const setNro = new Set(carteles.filter(c => set.has(String(sectorPorCartel.get(c.numeroCartel) || 'Otros'))).map((c: any) => c.numeroCartel));
      carteles = carteles.filter(c => setNro.has(c.numeroCartel));
      contratos = contratos.filter(c => c.numeroCartel && setNro.has(c.numeroCartel));
    }
    if (params.estados && params.estados.length) {
      const set = new Set(params.estados.map(String));
      carteles = carteles.filter(c => c.estadoCartel && set.has(String(c.estadoCartel)));
      contratos = contratos.filter(c => c.estadoContrato && set.has(String(c.estadoContrato)));
    }

    // KPI: monto total contratado (LineasContratadas)
    // Los contratos solo tienen info básica, los montos están en LineasContratadas
    // Join por numeroCartel o por idContrato/nro_contrato
    const cartelesIds = new Set(carteles.map((c: any) => String(c.numeroCartel)));
    const contratosIdsSet = new Set(contratos.map((c: any) => String(c.idContrato || c.nro_contrato || '').trim()).filter(Boolean));

    const rawLineas = (this.datos.get('LineasContratadas') || []);
    const lineasContratadas = rawLineas.filter((l: any) => {
      const nro = String(l.numeroCartel ?? l.nro_sicop ?? '').trim();
      const cid = String(l.idContrato ?? l.nro_contrato ?? l.nroContrato ?? '').trim();
      return (nro && cartelesIds.has(nro)) || (cid && contratosIdsSet.has(cid));
    });

    const toNumberFlexible = (v: any) => {
      if (v === undefined || v === null || v === '') return 0;
      const s = String(v).replace(/[^0-9\-.,]/g, '').replace(/,/g, '.');
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const calcMontoLinea = (l: any) => {
      const cantidad = toNumberFlexible(l.cantidad_contratada ?? l.cantidadContratada ?? l.cantidad ?? l.cantidadAdjudicada);
      const precio = toNumberFlexible(l.precio_unitario ?? l.precioUnitario ?? l.precio ?? l.precioAdjudicado);
      const iva = toNumberFlexible(l.iva ?? l.IVA ?? 0);
      const descuento = toNumberFlexible(l.descuento ?? l.descuento_total ?? 0);
      // Nota: Si en el futuro aparecen líneas en USD, considerar convertir usando tipo_cambio_crc
      return (cantidad * precio) + iva - descuento;
    };

    const montoTotal = _.sumBy(lineasContratadas, calcMontoLinea);

    // Monto por contrato derivado de las líneas
    const montoPorContrato = (() => {
      const m = new Map<string, number>();
      for (const l of lineasContratadas) {
        const cid = String(l.idContrato ?? l.nro_contrato ?? l.nroContrato ?? '').trim();
        if (!cid) continue;
        const v = calcMontoLinea(l) || 0;
        m.set(cid, (m.get(cid) || 0) + v);
      }
      return m;
    })();
    
    if (this.loggingMode === 'verbose') {
      console.log('💰 Monto calculation debug:', {
        carteles: carteles.length,
        cartelesIds: cartelesIds.size,
        lineasContratadas: lineasContratadas.length,
        lineasSample: lineasContratadas.slice(0, 3).map((l: any) => ({
          cartel: l.numeroCartel,
          contrato: l.idContrato,
          cantidad: l.cantidad_contratada,
          precio: l.precio_unitario,
          iva: l.iva,
          descuento: l.descuento,
          monto: ((parseFloat(l.cantidad_contratada || 0) * parseFloat(l.precio_unitario || 0)) + parseFloat(l.iva || 0) - parseFloat(l.descuento || 0)),
          allFields: Object.keys(l)
        })),
        montoTotal,
        cartelSample: carteles.slice(0, 3).map(c => c.numeroCartel),
        lineaSample: lineasContratadas.slice(0, 3).map(l => l.numeroCartel),
        joinMatches: carteles.slice(0, 5).map(c => ({
          cartel: c.numeroCartel,
          hasLineas: lineasContratadas.some(l => l.numeroCartel === c.numeroCartel)
        }))
      });
    }
    
    // KPI: cantidad de procesos (carteles)
    const procesosCount = carteles.length;
    // KPI: tiempo promedio adjudicación (FechaPorEtapas -> AdjudicacionesFirme)
    const fMap = new Map(fechasEtapas.map((f: any) => [f.numeroCartel, f]));
    const aCarteles = new Set(carteles.map((c: any) => c.numeroCartel));
    const adjInst = adjFirmes.filter((a: any) => aCarteles.has(a.numeroCartel));
    
    if (this.loggingMode === 'verbose') {
      console.log('⏰ Time calculation debug:', {
        cartelesSet: aCarteles.size,
        fechasEtapas: fechasEtapas.length,
        adjFirmes: adjFirmes.length,
        adjFiltered: adjInst.length,
        fechasSample: Array.from(fMap.entries()).slice(0, 3)
      });
    }
    
    const ttaDias: number[] = [];
    adjInst.forEach((a: any) => {
      const f = fMap.get(a.numeroCartel);
      const inicio = f?.fechaAperturaOfertas || f?.fechaPublicacion;
      const fin = a.fechaAdjudicacionFirme;
      if (inicio && fin) {
        const d = Math.round((+new Date(fin) - +new Date(inicio)) / (1000*60*60*24));
        if (isFinite(d) && d >= 0) ttaDias.push(d);
      }
    });
    const promTTA = ttaDias.length ? (_.sum(ttaDias) / ttaDias.length) : 0;
    
    if (this.loggingMode === 'verbose') {
      console.log('⏰ TTA calculated:', { ttaDias: ttaDias.length, promTTA });
    }
    
    // KPI: proveedores únicos adjudicados
  const provUnicos = new Set(contratos.map((c: any) => String(((c.idProveedor ?? c.idProveedorAdjudicado) || '')).trim()).filter(Boolean));
    
    if (this.loggingMode === 'verbose') {
      console.log('👷 Proveedores únicos debug:', {
        contratos: contratos.length,
        provUnicosSample: Array.from(provUnicos).slice(0, 5),
        provUnicosCount: provUnicos.size
      });
    }
    
    // KPI: licitaciones adjudicadas por carteles únicos
    const licitacionesAdjudicadas = Array.from(new Set(adjInst.map((a: any) => a.numeroCartel))).length;

  // Info de la institución
  const insts: any[] = this.datos.get('InstitucionesRegistradas') || [];
  const registroInst = insts.find((x: any) => normInst(x.codigoInstitucion) === inst) || {};
  const nombreInst = (registroInst.nombreInstitucion || registroInst.siglas || inst) as string;
  const tipoInst = (registroInst.tipoInstitucion || registroInst.tipo || registroInst.tipo_institucion || registroInst.clase || registroInst.clasificacion || '') as string;

  // KPIs basados en Contratos (monto derivado desde LineasContratadas o campo montoContrato)
  const montoContratos = _.sumBy(contratos, (c: any) => {
    const id = String(c.idContrato || '').trim();
    const montoLineas = montoPorContrato.get(id) || 0;
    // Si existe monto de líneas, usarlo; si no, intentar obtener de montoContrato
    if (montoLineas > 0) {
      return montoLineas;
    }
    return this.obtenerMontoContrato(c);
  });
  const totalContratos = contratos.length;
  const montoPromContrato = totalContratos ? (montoContratos / totalContratos) : 0;

  // Licitaciones publicadas (preferir ProcedimientoADM si tiene codigoInstitucion mapeado)
  const procADMInst = procADMAll.filter((p: any) => normInst(p.codigoInstitucion) === inst);
  const licPublicadas = procADMInst.length ? procADMInst.length : procesosCount;

    // Debug específico para CCSS (4000042147)
    if (this.loggingMode === 'verbose' && inst === '4000042147') {
      console.log('🏥 CCSS DEBUG - Análisis específico:', {
        licitacionesPublicadas: carteles.length,
        licitacionesAdjudicadas: licitacionesAdjudicadas,
        adjudicacionesDetalle: adjInst.map(a => ({ cartel: a.numeroCartel, fecha: a.fechaAdjudicacionFirme })),
        contratos: contratos.length,
        montoTotal: montoTotal,
        proveedoresUnicos: provUnicos.size,
        lineasContratadasCount: lineasContratadas.length,
        lineasContratadasSample: lineasContratadas.slice(0,5)
      });
    }
    // KPI: procesos con objeciones
    const recursosSet = new Set(recursos.filter((r: any) => aCarteles.has(r.numeroCartel)).map((r: any) => r.numeroCartel));
    const procesosConRecursos = recursosSet.size;
    
  // (licitacionesAdjudicadas already computed as unique carteles earlier)
    // KPI: índice de concentración (share top 3)
  const byProv = _.groupBy(lineasContratadas, (l: any) => String(((l.idProveedor ?? l.idProveedorAdjudicado) || '')).trim());
    
    // Debug: Verificar qué IDs de proveedores estamos obteniendo
    if (Object.keys(byProv).length > 0) {
      const sampleProvIds = Object.keys(byProv).slice(0, 5);
      console.log('🔍 InstitucionDashboard - Provider IDs encontrados en LineasContratadas:', sampleProvIds);
      console.log('🔍 InstitucionDashboard - Campos disponibles en primera línea:', lineasContratadas[0] ? Object.keys(lineasContratadas[0]) : 'No hay líneas');
    }
    
    const montosProv = Object.entries(byProv).map(([id, arr]: any) => ({ 
      id, 
      monto: _.sumBy(arr, (l: any) => {
        const cantidad = Number(l.cantidad_contratada ?? l.cantidadAdjudicada ?? 0) || 0;
        const precio = Number(l.precio_unitario ?? l.precioUnitario ?? l.precioAdjudicado ?? 0) || 0;
        const iva = Number(l.iva ?? 0) || 0;
        const descuento = Number(l.descuento ?? 0) || 0;
        return (cantidad * precio) + iva - descuento;
      })
    }))
      .filter(x => x.monto > 0)
      .sort((a, b) => b.monto - a.monto);
    const top3 = montosProv.slice(0, 3).reduce((s, x) => s + x.monto, 0);
    const concTop3 = montoTotal ? (top3 / montoTotal) * 100 : 0;

    // Proveedores: top por monto y por # contratos usando resolución unificada
    const provNombreMap = this.buildProveedorNombreMap();
    const resolveNombre = (id: string) => this.resolveProveedorNombre(id, provNombreMap);
    const topMonto = montosProv.slice(0, 10).map(x => ({ id: x.id, nombre: resolveNombre(x.id), monto: x.monto }));
    
    // Debug: Ver qué nombres se están resolviendo
    console.log('🔍 InstitucionDashboard - Top 3 proveedores por monto:');
    topMonto.slice(0, 3).forEach((p, idx) => {
      console.log(`  ${idx + 1}. ID: ${p.id} => Nombre: "${p.nombre}" (${p.nombre === p.id ? '❌ SIN NOMBRE' : '✅'})`);
    });
    
    const topCount = Object.entries(byProv).map(([id, arr]: any) => ({ id, contratos: arr.length }))
      .sort((a, b) => b.contratos - a.contratos)
      .slice(0, 10)
      .map(x => ({ id: x.id, nombre: resolveNombre(x.id), contratos: x.contratos }));
    // Distribución por sector (clasificación por cartel)
    const montosPorCartel = this.calcularMontosEstimadosPorCartel();
    const distSectorMap = new Map<string, { monto: number; count: number }>();
    carteles.forEach((c: any) => {
      const sec = String(sectorPorCartel.get(c.numeroCartel) || 'Otros');
      const m = montosPorCartel.get(c.numeroCartel) || 0;
      const row = distSectorMap.get(sec) || { monto: 0, count: 0 };
      row.monto += m; row.count += 1; distSectorMap.set(sec, row);
    });
    const distSector = Array.from(distSectorMap.entries()).map(([sector, v]) => ({ sector, monto: v.monto, count: v.count }));

    // ================================
    // Análisis por sectores y subcategorías (para dashboard de institución)
    // ================================
    // Construir análisis de subcategorías básico reutilizando la clasificación del cartel cuando exista.
    const subcatPorSector: Record<string, Record<string, number>> = {};
    carteles.forEach((c: any) => {
      const sec = String(sectorPorCartel.get(c.numeroCartel) || 'Otros');
      const rawSub = (c.clasificacionObjeto || c.tipoObjeto || c.objetoContrato || c.modalidadContratacion || 'Otros');
      const sub = String(rawSub || '').trim() || 'Otros';
      if (!subcatPorSector[sec]) subcatPorSector[sec] = {};
      subcatPorSector[sec][sub] = (subcatPorSector[sec][sub] || 0) + 1;
    });
    const subcategory_analysis: Record<string, Array<{ subcategory: string; count: number; percentage: number; total_monto: number; promedio_monto: number }>> = {};
    // Para montos por cartel (estimados) reutilizamos cálculo existente montosPorCartel
    const totalPorSector = new Map<string, number>();
    carteles.forEach((c: any) => {
      const sec = String(sectorPorCartel.get(c.numeroCartel) || 'Otros');
      const m = montosPorCartel.get(c.numeroCartel) || 0;
      totalPorSector.set(sec, (totalPorSector.get(sec) || 0) + m);
    });
    Object.keys(subcatPorSector).forEach(sec => {
      const mapa = subcatPorSector[sec];
      const totalCount = Object.values(mapa).reduce((a, b) => a + b, 0) || 0;
      const totalMontoSec = totalPorSector.get(sec) || 0;
      subcategory_analysis[sec] = Object.entries(mapa)
        .map(([subcategory, cnt]) => ({
          subcategory,
          count: cnt,
          percentage: totalCount ? Math.round((cnt / totalCount) * 1000) / 10 : 0,
          total_monto: totalMontoSec, // monto total del sector (no granular por subcat sin datos detallados)
          promedio_monto: cnt ? totalMontoSec / cnt : 0
        }))
        .sort((a, b) => b.count - a.count);
    });
    const sectorTotalCount = distSector.reduce((s, e) => s + (e.count || 0), 0) || 0;
    const sector_analysis = distSector.map(s => ({
      sector: s.sector,
      count: s.count,
      total_monto: s.monto,
      percentage: sectorTotalCount ? Math.round((s.count / sectorTotalCount) * 1000) / 10 : 0,
      promedio_monto: s.count ? s.monto / s.count : 0
    }));

    // Sanciones proveedores (que han contratado con esta institución)
    const provSet = new Set(Object.keys(byProv));
    const sancionesProv = sanciones.filter((s: any) => s.idProveedor && provSet.has(String(s.idProveedor).trim()));

    // Reajustes de precio (por contratos de la institución)
    const contratosSet = new Set(contratos.map((c: any) => String(c.idContrato).trim()).filter(Boolean));
    const reajInst = reajustes.filter((r: any) => r.idContrato && contratosSet.has(String(r.idContrato).trim()));
    const avgReajuste = (() => {
      const vals: number[] = [];
      reajInst.forEach((r: any) => {
        if (r.porcentajeReajuste != null && !isNaN(r.porcentajeReajuste)) vals.push(Number(r.porcentajeReajuste));
      });
      return vals.length ? (_.sum(vals) / vals.length) : 0;
    })();

    // Procesos por tipo de procedimiento y montos
    const procesosPorProc = _.chain(carteles)
      .groupBy((c: any) => String(c.codigoProcedimiento))
      .map((arr: any[], proc: string) => ({ procedimiento: proc, procesos: arr.length }))
      .orderBy(['procesos'], ['desc'])
      .value();

    // Distribución por tipo de procedimiento (ProcedimientoADM)
    const distProcADM = (() => {
      if (!procADMInst.length) return [] as Array<{ procedimiento: string; count: number }>;
      const key = (p: any) => String(p.descripcionProcedimientoADM || p.codigoProcedimientoADM || 'N/A');
      const grouped = _.groupBy(procADMInst, key);
      return Object.entries(grouped).map(([k, arr]) => ({ procedimiento: k, count: arr.length }))
        .sort((a, b) => b.count - a.count);
    })();
    const montosPorProc = _.chain(lineasContratadas)
      .groupBy((l: any) => {
        // Obtener el procedimiento del cartel correspondiente usando numeroCartel
        const cartel = carteles.find((c: any) => c.numeroCartel === l.numeroCartel);
        return String(cartel?.codigoProcedimiento || 'Sin_Procedimiento');
      })
      .map((arr: any[], proc: string) => ({ 
        procedimiento: proc, 
        monto: _.sumBy(arr, (l: any) => {
          const cantidad = parseFloat(l.cantidad_contratada || 0);
          const precio = parseFloat(l.precio_unitario || 0);
          const iva = parseFloat(l.iva || 0);
          const descuento = parseFloat(l.descuento || 0);
          return (cantidad * precio) + iva - descuento;
        })
      }))
      .orderBy(['monto'], ['desc'])
      .value();

    // Eliminado: Duración promedio desde invitación hasta adjudicación (datos insuficientes)

    // Porcentaje de procesos con objeciones/remates
    const remSet = new Set(remates.filter((r: any) => r.numeroCartel && aCarteles.has(r.numeroCartel)).map((r: any) => r.numeroCartel));
    const pctObjRem = procesosCount ? ((new Set([...recursosSet, ...remSet]).size) / procesosCount) * 100 : 0;

  // Mapa relaciones: institución -> proveedor (peso por monto)
  // Incluir etiqueta del proveedor para evitar lookups desde el UI
  // Reutiliza mapa de nombres ya construido anteriormente (provNombreMap) y su resolvedor (resolveNombre)
  const edges = montosProv.map(mp => ({ from: inst, to: mp.id, weight: mp.monto, toLabel: resolveNombre(mp.id) }));
    const nodes = [
      { id: inst, type: 'institucion' },
      ...montosProv.map(mp => ({ id: mp.id, type: 'proveedor', monto: mp.monto }))
    ];

    // Palabras clave frecuentes (robustas): combinar múltiples fuentes con pesos y stopwords
    const nroSet = new Set(carteles.map((c: any) => String(c.numeroCartel || '').trim()));
    const la = laAll.filter((l: any) => nroSet.has(String(l.numeroCartel || '').trim()));
    const dlMap = new Map<string, string>(dlAll.map((l: any) => [
      `${String(l.numeroCartel || '').trim()}|${String(l.numeroLinea || '').trim()}`,
      String(l.descripcionLinea || '')
    ]));

    const stopwords = new Set<string>([
      'de','del','la','las','el','los','y','o','u','para','por','con','sin','en','al','a','e','se','su','sus','un','una','unos','unas','que','como','desde','sobre','entre','hasta','más','mas','menos','no','si','sí','lo','le','les','ya','muy','tambien','también','cada','segun','según','durante','mediante','segun','hasta','contra','ante','tras','donde','cual','cuales','cuales','cualesquiera','cualquier','cualesquiera','cuando','cuanto','cuanta','cuantos','cuantas','esto','esta','estas','estos','ese','esa','esos','esas','aquel','aquella','aquellos','aquellas','ser','estar','haber','tener','realizacion','realización','adquisicion','adquisición','contratacion','contratación','servicio','servicios','suministro','suministros','compra','compras','bien','bienes','obra','obras','proyecto','proyectos','institucion','institución','licitacion','licitación','cartel','carteles','linea','línea','lineas','líneas','numero','número','nro','codigo','código','procedimiento','descripcion','descripción','mantenimiento','preventivo','correctivo','general','varios','diversos','detalle','detalle','tecnico','técnico','tecnicos','técnicos','solicitud','solicitudes','requerimiento','requerimientos','publico','público','oficial','presupuesto','anual'
    ]);

    const normalizeToken = (t: string): string => {
      let x = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // descartar tokens muy cortos o numericos
      if (x.length < 3 || /^\d{1,}$/.test(x)) return '';
      // normalización plural simple
      if (x.length > 4) {
        if (x.endsWith('es')) x = x.slice(0, -2);
        else if (x.endsWith('s')) x = x.slice(0, -1);
      }
      if (stopwords.has(x)) return '';
      return x;
    };

    const addText = (texto: string, peso: number, bag: Record<string, number>) => {
      for (const raw of this.tokenizar(texto)) {
        const tk = normalizeToken(raw);
        if (!tk) continue;
        bag[tk] = (bag[tk] || 0) + peso;
      }
    };

    const bag: Record<string, number> = {};
    // 1) Descripciones de líneas adjudicadas (peso alto)
    la.forEach((l: any) => {
      const key = `${String(l.numeroCartel || '').trim()}|${String(l.numeroLinea || '').trim()}`;
      const desc = dlMap.get(key) || '';
      if (desc) addText(desc, 3, bag);
    });
    // 2) Todas las descripciones de líneas de los carteles de la institución (peso medio)
    dlAll.forEach((l: any) => {
      const nro = String(l.numeroCartel || '').trim();
      if (!nroSet.has(nro)) return;
      const desc = String(l.descripcionLinea || '');
      if (desc) addText(desc, 2, bag);
    });
    // 3) Títulos y descripciones de carteles (peso bajo)
    carteles.forEach((c: any) => {
      const titulo = String(c.nombreCartel || '') || '';
      const desc = String(c.descripcionCartel || '') || '';
      if (titulo) addText(titulo, 1, bag);
      if (desc) addText(desc, 1, bag);
    });

    let topWords = _(bag)
      .toPairs()
      .map(([k, v]) => ({ palabra: k, freq: Number(v) || 0 }))
      .orderBy(['freq'], ['desc'])
      .slice(0, 50)
      .value();

    // Fallback: si no hay resultados, intentar solo con títulos/lineas sin stopwords estrictas
    if (!topWords.length) {
      const fallbackBag: Record<string, number> = {};
      carteles.forEach((c: any) => {
        addText(String(c.nombreCartel || ''), 1, fallbackBag);
        addText(String(c.descripcionCartel || ''), 1, fallbackBag);
      });
      dlAll.forEach((l: any) => {
        const nro = String(l.numeroCartel || '').trim();
        if (!nroSet.has(nro)) return;
        addText(String(l.descripcionLinea || ''), 1, fallbackBag);
      });
      topWords = _(fallbackBag)
        .toPairs()
        .map(([k, v]) => ({ palabra: k, freq: Number(v) || 0 }))
        .orderBy(['freq'], ['desc'])
        .slice(0, 50)
        .value();
    }

    // Evolución temporal de gasto por categorías
    const mensualPorCatMap = new Map<string, Map<string, number>>(); // key: YYYY-MM -> sector -> monto
    carteles.forEach((c: any) => {
      const sec = String(sectorPorCartel.get(c.numeroCartel) || 'Otros');
      const ym = (() => {
        const d = c.fechaPublicacion || contratos.find((x: any) => x.numeroCartel === c.numeroCartel)?.fechaFirma;
        const dt = d ? new Date(d) : null;
        if (!dt || isNaN(+dt)) return 'N/A';
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
      })();
      const m = montosPorCartel.get(c.numeroCartel) || 0;
      if (!mensualPorCatMap.has(ym)) mensualPorCatMap.set(ym, new Map());
      const inner = mensualPorCatMap.get(ym)!;
      inner.set(sec, (inner.get(sec) || 0) + m);
    });
    const evolucionCategorias = Array.from(mensualPorCatMap.entries()).sort(([a],[b]) => a.localeCompare(b))
      .map(([mes, mapa]) => ({ mes, categorias: Array.from(mapa.entries()).map(([sector, monto]) => ({ sector, monto })) }));

    // Heatmap: tiempo promedio adjudicación por tipo de procedimiento
    const ttaPorProc = new Map<string, number[]>();
    adjInst.forEach((a: any) => {
      const proc = String(carteles.find((c: any) => c.numeroCartel === a.numeroCartel)?.codigoProcedimiento || 'N/A');
      const f = fMap.get(a.numeroCartel);
      const inicio = f?.fechaAperturaOfertas || f?.fechaPublicacion;
      const fin = a.fechaAdjudicacionFirme;
      if (inicio && fin) {
        const d = Math.round((+new Date(fin) - +new Date(inicio)) / (1000*60*60*24));
        if (!ttaPorProc.has(proc)) ttaPorProc.set(proc, []);
        if (isFinite(d) && d >= 0) ttaPorProc.get(proc)!.push(d);
      }
    });
    const heatmap = Array.from(ttaPorProc.entries()).map(([proc, arr]) => ({ procedimiento: proc, tta: arr.length ? (_.sum(arr)/arr.length) : 0 }));

    // Serie temporal gasto total mensual
    const serieMensual = (() => {
      const byMonth = new Map<string, number>();
      lineasContratadas.forEach((l: any) => {
        // Obtener fecha del cartel correspondiente usando numeroCartel
        const cartel = carteles.find((c: any) => c.numeroCartel === l.numeroCartel);
        const d = cartel?.fechaPublicacion; if (!d) return;
        const dd = new Date(d); if (isNaN(+dd)) return;
        const key = `${dd.getUTCFullYear()}-${String(dd.getUTCMonth()+1).padStart(2,'0')}`;
        const cantidad = parseFloat(l.cantidad_contratada || 0);
        const precio = parseFloat(l.precio_unitario || 0);
        const iva = parseFloat(l.iva || 0);
        const descuento = parseFloat(l.descuento || 0);
        const v = (cantidad * precio) + iva - descuento;
        byMonth.set(key, (byMonth.get(key) || 0) + v);
      });
      return Array.from(byMonth.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([mes, monto]) => ({ mes, monto }));
    })();

    // Serie mensual por contratos (monto y conteo)
    const serieMensualContratos = (() => {
      const byMonthMonto = new Map<string, number>();
      const byMonthCount = new Map<string, number>();
      contratos.forEach((ct: any) => {
        const d = ct.fechaFirma; if (!d) return;
        const dd = new Date(d); if (isNaN(+dd)) return;
        const key = `${dd.getUTCFullYear()}-${String(dd.getUTCMonth()+1).padStart(2,'0')}`;
        const id = String(ct.idContrato || '').trim();
        const v = montoPorContrato.get(id) || 0;
        byMonthMonto.set(key, (byMonthMonto.get(key) || 0) + v);
        byMonthCount.set(key, (byMonthCount.get(key) || 0) + 1);
      });
      return Array.from(new Set([...byMonthMonto.keys(), ...byMonthCount.keys()]))
        .sort()
        .map(k => ({ mes: k, monto: byMonthMonto.get(k) || 0, contratos: byMonthCount.get(k) || 0 }));
    })();

    // Top proveedores por monto de Contratos.csv
    const topMontoContratos = (() => {
      const agg = _.groupBy(contratos, (c: any) => String(c.idProveedor || '').trim());
      const list = Object.entries(agg).map(([id, arr]: any) => ({
        id,
        monto: _.sumBy(arr, (c: any) => montoPorContrato.get(String(c.idContrato || '').trim()) || 0)
      })).filter(x => x.monto > 0).sort((a, b) => b.monto - a.monto).slice(0, 10);
  return list.map(x => ({ id: x.id, nombre: resolveNombre(x.id), monto: x.monto }));
    })();

    // Resumen de contratos (para tabla)
    const contratosResumen = contratos
      .filter((c: any) => c.idContrato)
      .slice(0, 1000) // limitar memoria
      .map((c: any) => {
        const id = String(c.idContrato).trim();
        const prov = String(c.idProveedor || '').trim();
        const monto = montoPorContrato.get(id) || 0;
        return {
          idContrato: id,
          numeroCartel: String(c.numeroCartel || ''),
          proveedor: resolveNombre(prov) || prov || '—',
          fechaFirma: c.fechaFirma || null,
            monto,
          estado: c.estadoContrato || c.estado || ''
        };
      });

    // Licitaciones recientes (tabla)
    const mapProcAdj = new Map(procAdjAll.map((p: any) => [String(p.codigoProcedimiento), String(p.descripcionProcedimiento || p.codigoProcedimiento || 'N/A')]));
    const ofertasByCartel = _.groupBy(ofertasAll, (o: any) => String(o.numeroCartel || '').trim());
    const dlByCartel = _.groupBy(dlAll, (l: any) => String(l.numeroCartel || '').trim());
    const licitacionesRecientes = _.chain(carteles)
      .orderBy((c: any) => +new Date(c.fechaPublicacion || 0), 'desc')
      .take(100)
      .map((c: any) => {
        const nro = String(c.numeroCartel || '').trim();
        const montoLineaEst = _.sumBy(dlByCartel[nro] || [], (l: any) => this.parseNumeroFlexible(l.presupuestoLinea) || 0);
        const proc = mapProcAdj.get(String(c.codigoProcedimiento)) || String(c.codigoProcedimiento || '');
        return {
          numeroCartel: nro,
          nombreCartel: c.nombreCartel || '',
          procedimiento: proc,
          fechaPublicacion: c.fechaPublicacion || null,
          montoEstimado: (this.parseNumeroFlexible(c.presupuestoOficial) || montoLineaEst || 0),
          ofertasRecibidas: (ofertasByCartel[nro] ? new Set((ofertasByCartel[nro] as any[]).map(o => o.idProveedor)).size : 0),
          estado: c.estadoCartel || ''
        };
      })
      .value();

    // Resumen de ofertas (por cartel) para la institución: número SICOP y descripción
    const ofertasResumen = (() => {
      const ofertasInst = ofertasAll.filter((o: any) => cartelesIds.has(String(o.numeroCartel || '').trim()));
      const grouped = _.groupBy(ofertasInst, (o: any) => String(o.numeroCartel || '').trim());
      return Object.entries(grouped).map(([nro, arr]: any) => {
        const cartel = carteles.find((c: any) => String(c.numeroCartel || '').trim() === nro);
        const nombre = cartel?.nombreCartel || cartel?.descripcionCartel || '';
        const maxFecha = _.maxBy(arr, (o: any) => +new Date(o.fechaOferta || 0))?.fechaOferta || null;
        return { numeroCartel: nro, descripcion: nombre, fechaOferta: maxFecha };
      }).sort((a, b) => +new Date(b.fechaOferta || 0) - +new Date(a.fechaOferta || 0));
    })();

    // ================================
    // Analítica de ofertas (competencia en licitaciones)
    // ================================
    const ofertasCounts = licitacionesRecientes.map(l => l.ofertasRecibidas || 0);
    const totalLicsConOfertas = ofertasCounts.length;
    const totalOfertas = _.sum(ofertasCounts);
    const promedioOfertas = totalLicsConOfertas ? (totalOfertas / totalLicsConOfertas) : 0;
    const licitacionesUnaOferta = ofertasCounts.filter(c => c === 1).length;
    const pctUnaOferta = totalLicsConOfertas ? (licitacionesUnaOferta / totalLicsConOfertas) * 100 : 0;
    const distribucionOfertas = (() => {
      const buckets: Record<string, number> = {};
      ofertasCounts.forEach(c => {
        const key = c >= 10 ? '10+' : String(c);
        buckets[key] = (buckets[key] || 0) + 1;
      });
      return Object.entries(buckets).map(([ofertas, count]) => ({ ofertas, count, percentage: totalLicsConOfertas ? (count / totalLicsConOfertas) * 100 : 0 }));
    })();

    // ================================
    // Tabla de clasificación sectorial por cartel (para auditoría)
    // ================================
    const sectorClasificacion = carteles.slice(0, 3000).map((c: any) => {
      const nro = String(c.numeroCartel || '').trim();
      const sector = String(sectorPorCartel.get(nro) || 'Otros');
      const subcategoria = String((c.clasificacionObjeto || c.tipoObjeto || c.objetoContrato || c.modalidadContratacion || 'Otros') || 'Otros').trim();
      const descripcion = (c.nombreCartel || c.descripcion || c.objetoContrato || '').toString();
      return {
        numeroCartel: nro,
        sector,
        subcategoria,
        descripcion
      };
    });

    // Scatter oferta vs adjudicado
    const adjKey = (o: any) => `${String(o.numeroCartel || '').trim()}|${String(o.numeroLinea || '').trim()}`;
    const adjByKey = new Map(laAll.map((a: any) => [adjKey(a), a]));
    const scatter = loAll
      .filter((o: any) => cartelesIds.has(String(o.numeroCartel || '').trim()))
      .map((o: any) => {
        const key = adjKey(o);
        const a = adjByKey.get(key);
        const precioOf = (() => {
          // buscar campo de precio ofertado por patrón
          const candidates = ['precio_unitario', 'precioUnitario', 'precio', 'precio_ofertado', 'precio_unitario_ofertado'];
          for (const k of candidates) {
            if (o[k] != null) {
              const n = this.parseNumeroFlexible(o[k]);
              if (n && n > 0) return n;
            }
          }
          // fallback escaneo por patrón 'precio'
          const anyKey = Object.keys(o).find(k => /precio/i.test(k));
          return anyKey ? (this.parseNumeroFlexible(o[anyKey]) || 0) : 0;
        })();
        const precioAdj = (() => {
          if (!a) return 0;
          const candidates = ['precioUnitarioAdjudicado','precio_unitario_adjudicado','precioAdjudicado','precio_adjudicado'];
          for (const k of candidates) {
            if (a[k] != null) {
              const n = this.parseNumeroFlexible(a[k]);
              if (n && n > 0) return n;
            }
          }
          return 0;
        })();
        const prov = String(o.idProveedor || '').trim();
  return { ofertado: precioOf || 0, adjudicado: precioAdj || 0, proveedor: prov, proveedorNombre: resolveNombre(prov), numeroCartel: String(o.numeroCartel || ''), numeroLinea: o.numeroLinea };
      })
      .filter((p: any) => p.ofertado > 0 && p.adjudicado > 0);

    const result = {
      institucion: { codigo: inst, nombre: nombreInst, tipo: tipoInst },
      filtros: this.getInstitucionFilters(),
      kpis: {
        monto_total_contratado: montoTotal,
        monto_total_contratado_contratos: montoContratos,
        total_contratos: totalContratos,
        monto_promedio_contrato: montoPromContrato,
        licitaciones_publicadas: licPublicadas,
        procesos_contratacion: procesosCount,
        licitaciones_adjudicadas: licitacionesAdjudicadas,
        tiempo_promedio_adjudicacion: promTTA,
        proveedores_unicos_adjudicados: provUnicos.size,
        procesos_con_objeciones: procesosConRecursos,
        indice_concentracion_top3: concTop3
      },
      proveedores: {
        top_por_monto: topMonto,
        top_por_monto_contratos: topMontoContratos,
        top_por_contratos: topCount,
        sanciones: sancionesProv,
        promedio_reajustes: avgReajuste,
        distribucion_sector: distSector
      },
      procesos: {
        por_tipo: procesosPorProc,
        montos_por_tipo: montosPorProc,
        distribucion_procedimiento_adm: distProcADM,
  // duracion_promedio_invitacion_adjudicacion: undefined,
        porcentaje_con_objeciones_remates: pctObjRem,
        heatmap_tta_por_procedimiento: heatmap
      },
      oportunidades: {
        licitaciones_recientes: licitacionesRecientes,
        ofertas_analytics: {
          total_licitaciones: licitacionesRecientes.length,
          promedio_ofertas: promedioOfertas,
            porcentaje_una_oferta: pctUnaOferta,
          distribucion: distribucionOfertas,
          total_ofertas: totalOfertas
        },
        ofertas_resumen: ofertasResumen
      },
      contratos_resumen: contratosResumen,
      bienes_servicios: {
        palabras_clave: topWords,
        categorias: distSector,
        evolucion_categorias: evolucionCategorias
      },
      visuales: {
        red_relaciones: { nodes, edges },
        serie_mensual: serieMensual,
        serie_mensual_contratos: serieMensualContratos
      },
      competencia: {
        scatter_oferta_vs_adj: scatter
      }
      ,
      sectores: {
        sector_analysis,
        subcategory_analysis,
        sector_clasificacion: sectorClasificacion
      }
    };
    
    // 🚀 CACHE: Guardar resultado en caché
    this.institucionDashboardCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      params: cacheKey
    });
    
    const elapsed = performance.now() - startTime;
    console.log(`⏱️ getInstitucionDashboard completado en ${Math.round(elapsed)}ms (cache miss)`);
    
    return result;
  }

  // ================================
  // BÚSQUEDA DE LÍNEAS POR DESCRIPCIÓN EN UNA INSTITUCIÓN
  // ================================
  public buscarLineasInstitucion(opts: { institucion: string; keyword: string; fechaDesde?: Date; fechaHasta?: Date; limit?: number; }): Array<{ numeroCartel: string; numeroLinea: any; descripcion: string; institucion: string; cantidad: number | null; precioEstimado: number | null; precioAdjudicado: number | null; proveedorGanador: string | null; }>{
    const normInst = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
    const inst = normInst(opts.institucion);
    const normalize = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    const kw = normalize(opts.keyword || '');
    if (!inst || !kw) return [];
    // Resolver nombre de institución localmente
    const insts: any[] = this.datos.get('InstitucionesRegistradas') || [];
    const reg = insts.find((x: any) => normInst(x.codigoInstitucion) === inst) || {};
    const nombreInstLocal = (reg.nombreInstitucion || reg.siglas || inst) as string;
    const inDateRange = (d: any) => {
      if (!d) return true;
      const dd = new Date(d); if (isNaN(+dd)) return false;
      if (opts.fechaDesde && dd < opts.fechaDesde) return false;
      if (opts.fechaHasta && dd > opts.fechaHasta) return false;
      return true;
    };
    const carteles: any[] = (this.datos.get('DetalleCarteles') || [])
      .filter((c: any) => normInst(c.codigoInstitucion) === inst && inDateRange(c.fechaPublicacion));
    const nroSet = new Set(carteles.map((c: any) => String(c.numeroCartel || '').trim()));
    const lineas: any[] = (this.datos.get('DetalleLineaCartel') || [])
      .filter((l: any) => {
        if (!nroSet.has(String(l.numeroCartel || '').trim())) return false;
        const descN = normalize(String(l.descripcionLinea || ''));
        return descN.includes(kw);
      });
    const adjAll: any[] = this.datos.get('LineasAdjudicadas') || [];
    const adjByKey = new Map(adjAll.map((a: any) => [`${String(a.numeroCartel||'').trim()}|${String(a.numeroLinea||'').trim()}`, a]));
    const nombreProv = new Map<string, string>();
    const provs: any[] = this.datos.get('Proveedores') || [];
    provs.forEach((p: any) => {
      const id = String(p.idProveedor || '').trim();
      if (!id) return; nombreProv.set(id.replace(/\D+/g,''), (p.nombreProveedor || p.nombre || '').toString().trim());
    });
    const out = lineas.map((l: any) => {
      const key = `${String(l.numeroCartel||'').trim()}|${String(l.numeroLinea||'').trim()}`;
      const a = adjByKey.get(key);
      const precioAdj = a ? (this.parseNumeroFlexible(a.precioUnitarioAdjudicado || a.precio_adjudicado || a.precioAdjudicado) || null) : null;
      const provId = a ? String(a.idProveedorAdjudicado || a.idProveedor || '').replace(/\D+/g,'') : '';
      return {
        numeroCartel: String(l.numeroCartel || '').trim(),
        numeroLinea: l.numeroLinea,
        descripcion: l.descripcionLinea || '',
        institucion: nombreInstLocal,
        cantidad: this.parseNumeroFlexible(l.cantidadRequerida || l.cantidad || null),
        precioEstimado: this.parseNumeroFlexible(l.presupuestoLinea || l.precio_unitario_estimado || null),
        precioAdjudicado: precioAdj,
        proveedorGanador: (provId && nombreProv.get(provId)) ? nombreProv.get(provId)! : (provId || null)
      };
    });
    return (opts.limit && opts.limit > 0) ? out.slice(0, opts.limit) : out;
  }

  // ================================
  // DASHBOARD COMPLEMENTARIO
  // ================================
  public getComplementaryDashboard(filtros?: { institucion?: string[]; sector?: string[]; keywords?: string[] }) {
    // 🚀 CACHE: Verificar si tenemos métricas cacheadas para estos filtros
    const cacheKey = this.getCacheKey('complementary', filtros);
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && this.isCacheValid('dashboard', cached.timestamp)) {
      this.cacheStats.dashboard.hits++;
      console.log('✅ Cache hit: getComplementaryDashboard');
      return cached.data;
    }
    this.cacheStats.dashboard.misses++;
    
    const startTime = performance.now();
    const filtered = this.filterByInstitucionSector(filtros);
    const selectedCarteles: any[] = filtered.carteles;
    const selectedContratos: any[] = filtered.contratos;
    const hasFilters = Boolean(filtros && ((filtros.institucion && filtros.institucion.length) || (filtros.sector && filtros.sector.length)));
    const normNro = (v: any) => String(v ?? '').trim().replace(/\s+/g, '').replace(/[^0-9A-Za-z-]/g, '');
    const nroSet = new Set(selectedCarteles.map(c => normNro(c.numeroCartel)));
    console.log('[ComplementaryDashboard] carteles:', selectedCarteles.length, 'contratos:', selectedContratos.length, 'hasFilters:', hasFilters);
    const topInstituciones = (() => {
      const carteles: any[] = selectedCarteles;
      const insts: any[] = this.datos.get('InstitucionesRegistradas') || [];
      // Normalización robusta: quitar espacios y dejar solo dígitos para llaves
      const normKey = (v: any) => String(v ?? '').trim().replace(/\D+/g, '');
      const normVal = (v: any) => String(v ?? '').trim();
      const nombreInst = new Map(insts.map((i: any) => [
        normKey(i.codigoInstitucion),
        normVal(i.nombreInstitucion) || normVal(i.siglas) || normKey(i.codigoInstitucion)
      ]));
      const montos = this.calcularMontosEstimadosPorCartel();
      const agg = new Map<string, { codigo: string; nombre: string; carteles: number; monto: number }>();
      carteles.forEach((c: any) => {
        const cod = normKey(c.codigoInstitucion);
        if (!cod) return;
        const m = montos.get(c.numeroCartel) || 0;
        if (!agg.has(cod)) agg.set(cod, { codigo: cod, nombre: nombreInst.get(cod) || String(cod), carteles: 0, monto: 0 });
        const row = agg.get(cod)!;
        row.carteles += 1;
        row.monto += m;
      });
      // Diagnóstico: verificar cobertura del lookup y ejemplos de mapeo
      const codigosSinNombre = Array.from(agg.values()).filter(r => !r.nombre || r.nombre === r.codigo).map(r => r.codigo);
      if (codigosSinNombre.length) {
        const ejemplos = codigosSinNombre.slice(0, 10).map(c => ({ codigo: c, match: nombreInst.get(c) }));
        console.warn('Instituciones sin nombre en lookup (normalizadas a dígitos):', {
          count: codigosSinNombre.length,
          ejemplos
        });
      }
      return Array.from(agg.values())
        .map(r => ({ ...r, nombre: r.nombre && String(r.nombre).trim().length ? r.nombre : (nombreInst.get(r.codigo) || r.codigo) }))
        .sort((a, b) => (b.monto || 0) - (a.monto || 0))
        .slice(0, 10);
    })();

    // Nueva implementación del Top Proveedores desde cero
    const topProveedores = (() => {
      console.log('🔧 Calculando Top Proveedores desde cero...');
      
      // 1. Obtener datos de líneas adjudicadas filtradas
      const allLineasAdjudicadas: any[] = this.datos.get('LineasAdjudicadas') || [];
      const lineasFiltradas: any[] = hasFilters 
        ? allLineasAdjudicadas.filter((linea: any) => nroSet.has(normNro(linea.numeroCartel || linea.NRO_SICOP)))
        : allLineasAdjudicadas;
      
      console.log(`📊 Procesando ${lineasFiltradas.length} líneas adjudicadas de ${allLineasAdjudicadas.length} totales`);

      // Helper para extraer campo probando múltiples variantes normalizadas y originales
      const getCampo = (row: any, variantes: string[], fallback: any = undefined) => {
        for (const v of variantes) {
          if (row == null) continue;
          if (v in row && row[v] != null && row[v] !== '') return row[v];
          // probar versión lower y sin comillas
          const vl = v.toLowerCase();
          for (const k of Object.keys(row)) {
            const nk = k.toLowerCase();
            if (nk === vl) {
              const val = row[k];
              if (val != null && val !== '') return val;
            }
          }
        }
        return fallback;
      };
      // Loggear estructura cruda de primera fila si existe
      if (lineasFiltradas.length) {
        const sample = lineasFiltradas[0];
        console.log('🧪 Sample LineaAdjudicada keys:', Object.keys(sample));
        console.log('🧪 Sample valores relevantes antes mapping:', {
          idProveedorAdjudicado: getCampo(sample, ['idProveedorAdjudicado','cedula_proveedor','cedulaProveedor','cedula_proveedor_adjudicado','CEDULA_PROVEEDOR']),
          cantidadAdjudicada: getCampo(sample, ['cantidadAdjudicada','cantidad_adjudicada','CANTIDAD_ADJUDICADA']),
          precioUnitarioAdjudicado: getCampo(sample, ['precioUnitarioAdjudicado','precio_unitario_adjudicado','PRECIO_UNITARIO_ADJUDICADO']),
          tipoMoneda: getCampo(sample, ['tipoMoneda','tipo_moneda','TIPO_MONEDA']),
          tipoCambio: getCampo(sample, ['tipo_cambio_crc','tipoCambioCRC','tipoCambio','tipo_cambio','TIPO_CAMBIO_CRC'])
        });
      }
      
      // 2. Función para convertir valores a número de forma robusta
      const convertirANumero = (valor: any): number => {
        if (typeof valor === 'number' && !isNaN(valor)) return valor;
        if (valor == null || valor === '') return 0;
        
        // Limpiar comillas y espacios extra
        const str = String(valor).replace(/"/g, '').replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };
      
      // 3. Función para calcular monto de línea individual
      const calcularMontoLinea = (linea: any): number => {
        const cantidadRaw = getCampo(linea, ['cantidadAdjudicada','cantidad_adjudicada','CANTIDAD_ADJUDICADA']);
        const precioRaw = getCampo(linea, ['precioUnitarioAdjudicado','precio_unitario_adjudicado','PRECIO_UNITARIO_ADJUDICADO']);
        const descuentoRaw = getCampo(linea, ['descuento','DESCUENTO']);
        const ivaRaw = getCampo(linea, ['iva','IVA']);
        const otrosImpRaw = getCampo(linea, ['otros_impuestos','OTROS_IMPUESTOS']);
        const acarreosRaw = getCampo(linea, ['acarreos','ACARREOS']);
        const tipoMonedaRaw = getCampo(linea, ['tipoMoneda','tipo_moneda','TIPO_MONEDA']);
        const tipoCambioRaw = getCampo(linea, ['tipo_cambio_crc','tipoCambioCRC','tipoCambio','tipo_cambio','TIPO_CAMBIO_CRC']);
        const cantidad = convertirANumero(cantidadRaw);
        const precioUnitario = convertirANumero(precioRaw);
        const descuento = convertirANumero(descuentoRaw);
        const iva = convertirANumero(ivaRaw);
        const otrosImpuestos = convertirANumero(otrosImpRaw);
        const acarreos = convertirANumero(acarreosRaw);
        let montoFinal = (cantidad * precioUnitario) - descuento + iva + otrosImpuestos + acarreos;
        const tipoMoneda = String(tipoMonedaRaw || '').replace(/"/g,'').toUpperCase();
        if (tipoMoneda === 'USD') {
          const tc = convertirANumero(tipoCambioRaw) || 510;
            montoFinal *= tc;
        } else if (tipoMoneda === 'EUR') {
          const tc = convertirANumero(tipoCambioRaw) || 550;
            montoFinal *= tc;
        }
        if (montoFinal > 0 && montoFinal < 1) {
          // Posibles errores de escala (ej. decimales mal interpretados). No escalar aún, solo log si debug.
          if (linea.numeroCartel && cantidad && precioUnitario) {
            console.log('⚠️ Monto extremadamente bajo detectado', {cantidadRaw, precioRaw, montoFinal});
          }
        }
        return montoFinal > 0 ? montoFinal : 0;
      };
      
      // 4. Agrupar por proveedor y sumar montos
      const montoPorProveedor = new Map<string, number>();
      const lineasPorProveedor = new Map<string, number>();
      let lineasProcesadas = 0;
      let lineasConMonto = 0;
      let primerasLineas: any[] = [];
      
      lineasFiltradas.forEach((linea: any, index: number) => {
        lineasProcesadas++;
        
        // Capturar primeras 3 líneas para debug
        if (index < 3) {
          primerasLineas.push({
            index: index,
            cedula: getCampo(linea, ['idProveedorAdjudicado','cedula_proveedor','CEDULA_PROVEEDOR']),
            cantidad: getCampo(linea, ['cantidadAdjudicada','cantidad_adjudicada','CANTIDAD_ADJUDICADA']),
            precio: getCampo(linea, ['precioUnitarioAdjudicado','precio_unitario_adjudicado','PRECIO_UNITARIO_ADJUDICADO']),
            keys: Object.keys(linea).slice(0, 10)
          });
        }
        
        const cedula = String(getCampo(linea, ['idProveedorAdjudicado','cedula_proveedor','cedula_proveedor_adjudicado','CEDULA_PROVEEDOR']) || '')
          .replace(/"/g, '')
          .trim();
        if (!cedula) return;
        
        const monto = calcularMontoLinea(linea);
        
        if (monto > 0) {
          lineasConMonto++;
        }
        
        // Debug para primeras 3 líneas
        if (lineasProcesadas <= 3) {
          console.log(`🔍 Línea ${lineasProcesadas}: Cédula="${cedula}", Monto=${monto.toLocaleString()}`);
        }
        
        // Actualizar mapas
        montoPorProveedor.set(cedula, (montoPorProveedor.get(cedula) || 0) + monto);
        lineasPorProveedor.set(cedula, (lineasPorProveedor.get(cedula) || 0) + 1);
      });
      
      console.log(`💰 Procesadas ${lineasProcesadas} líneas, ${lineasConMonto} con monto > 0`);
      console.log(`💰 Encontrados ${montoPorProveedor.size} proveedores únicos con montos`);
      console.log('🔍 Primeras 3 líneas procesadas:', primerasLineas);
      
      // Debug: mostrar top 3 proveedores si los hay
      if (montoPorProveedor.size > 0) {
        const topProv = Array.from(montoPorProveedor.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        console.log('🎯 Top 3 proveedores encontrados:', topProv.map(([id, monto]) => `${id}:${(monto/1000000).toFixed(1)}M`));
      }
      
      // 5. Obtener mapeo de nombres usando método existente del DataManager
      const nombrePorCedula = this.buildProveedorNombreMap();
      
      console.log(`📋 Mapeo de proveedores construido: ${nombrePorCedula.size} nombres mapeados`);
      
      // Debug: mostrar algunos nombres de ejemplo
      const ejemplos = Array.from(nombrePorCedula.entries()).slice(0, 5);
      console.log('🔍 Ejemplos de mapeo:', ejemplos);
      
      // 6. Crear lista de top proveedores usando el resolver existente
      const topProveedoresList = Array.from(montoPorProveedor.entries())
        .map(([cedula, monto]) => ({
          id: cedula,
          cedula: cedula,
          nombre: this.resolveProveedorNombre(cedula, nombrePorCedula),
          monto: monto,
          lineas: lineasPorProveedor.get(cedula) || 0
        }))
        .filter(prov => prov.monto > 0) // Solo proveedores con monto > 0
        .sort((a, b) => b.monto - a.monto) // Ordenar por monto descendente
        .slice(0, 10); // Top 10
      
      console.log(`🏆 Top 10 proveedores calculado: ${topProveedoresList.map(p => `${p.nombre || p.cedula}(${(p.monto/1_000_000).toFixed(1)}M)`).join(', ')}`);
      
      return topProveedoresList;
    })();

    const offersHistogram = (() => {
      const allOfertas: any[] = this.datos.get('Ofertas') || [];
      const ofrs: any[] = hasFilters ? allOfertas.filter((o: any) => nroSet.has(normNro(o.numeroCartel))) : allOfertas;
      const porCartel = _.groupBy(ofrs, (o: any) => normNro(o.numeroCartel));
      const counts = Object.values(porCartel).map((arr: any[]) => new Set(arr.map(o => o.idProveedor)).size);
      const bucket = (n: number) => n >= 6 ? '6+' : String(n);
      const agg = new Map<string, number>();
      counts.forEach(n => { const k = bucket(n); agg.set(k, (agg.get(k) || 0) + 1); });
      const labels = ['0','1','2','3','4','5','6+'];
      return labels.map(l => ({ ofertas: l, carteles: agg.get(l) || 0 }));
    })();

    const tta = this.computeTTA(hasFilters, hasFilters ? nroSet : null);
    if (tta.stats.n === 0) {
      console.warn('[TTA][WARN] Resultado n=0. Meta:', tta.meta);
      console.warn('[TTA][WARN] Ejemplo adj sin match:', tta.meta?.muestrasSinMatch);
      console.warn('[TTA][WARN] Ejemplo sinFechas:', tta.meta?.muestrasSinFechas);
      console.warn('[TTA][WARN] Ejemplo invalidas:', tta.meta?.muestrasInvalidas);
    }

    const hhiMarket = (() => {
      const contratos: any[] = selectedContratos;
      // Usar método robusto y optimizado para calcular montos
      const total = _.sumBy(contratos, (c: any) => this.obtenerMontoContratoPreciso(c));
      const porProv = _.groupBy(contratos, 'idProveedor');
      const shares = Object.values(porProv).map(arr => {
        const m = _.sumBy(arr, (c: any) => this.obtenerMontoContratoPreciso(c));
        return total ? m / total : 0;
      });
      const hhi = shares.reduce((s, x) => s + x * x, 0);
      const top5Share = _(porProv)
        .toPairs()
        .map(([id, arr]: any) => ({ id, monto: _.sumBy(arr, (c: any) => this.obtenerMontoContratoPreciso(c)) }))
        .orderBy(['monto'], ['desc'])
        .slice(0, 5)
        .thru(list => (total ? _.sumBy(list, 'monto') / total : 0))
        .value();
      return { hhi, top5Share };
    })();

    const result = {
      top_instituciones: topInstituciones,
      top_proveedores: topProveedores,
      offers_histogram: offersHistogram,
      tta_distribution: tta.distribution,
      tta_stats: tta.stats,
      tta_meta: tta.meta,
      hhi_market: hhiMarket
    };
    
    // 🚀 CACHE: Guardar resultado en caché
    this.dashboardCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      filters: cacheKey
    });
    
    const elapsed = performance.now() - startTime;
    console.log(`⏱️ getComplementaryDashboard completado en ${Math.round(elapsed)}ms (cache miss)`);
    
    return result;
  }

  // ================================
  // MÉTODOS PARA FILTROS AVANZADOS
  // ================================

  /**
   * Obtiene la lista de todas las instituciones disponibles con conteos
   */
  public getAvailableInstitutions() {
    const instituciones = this.datos.get('InstitucionesRegistradas') || [];
    const carteles = this.datos.get('DetalleCarteles') || [];
    
    // Contar carteles por institución
    const conteosPorInstitucion = new Map<string, number>();
    carteles.forEach((cartel: any) => {
      const codigo = String(cartel.codigoInstitucion || '').trim();
      if (codigo) {
        conteosPorInstitucion.set(codigo, (conteosPorInstitucion.get(codigo) || 0) + 1);
      }
    });

    return instituciones
      .filter((inst: any) => {
        const codigo = String(inst.codigoInstitucion || '').trim();
        return codigo && conteosPorInstitucion.has(codigo);
      })
      .map((inst: any) => {
        const codigo = String(inst.codigoInstitucion || '').trim();
        const nombre = inst.nombreInstitucion || inst.siglas || codigo;
        return {
          id: codigo,
          label: `${nombre} (${codigo})`,
          value: codigo,
          count: conteosPorInstitucion.get(codigo) || 0,
          type: 'institution' as const
        };
      })
      .sort((a, b) => {
        // Ordenar por conteo descendente, luego por nombre
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });
  }

  /**
   * Obtiene la lista de todas las categorías/sectores disponibles con conteos
   */
  public getAvailableCategories() {
    // Obtener sectores únicos y sus conteos
    const sectores = this.asignarSectorPorCartel();
    const conteosPorSector = new Map<string, number>();
    
    for (const sector of sectores.values()) {
      conteosPorSector.set(sector, (conteosPorSector.get(sector) || 0) + 1);
    }

    // Convertir a formato de opciones de filtro
    const categorias = Array.from(conteosPorSector.entries())
      .map(([sector, count]) => ({
        id: sector,
        label: this.formatSectorName(sector),
        value: sector,
        count,
        type: 'category' as const
      }))
      .sort((a, b) => {
        // Ordenar por conteo descendente, luego por nombre
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });

    return categorias;
  }

  /**
   * Formatea el nombre de un sector para mostrar de manera amigable
   */
  private formatSectorName(sector: string): string {
    // Convertir guiones bajos a espacios y capitalizar
    return sector
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Obtiene estadísticas de filtros aplicados
   */
  public getFilterStats(filtros?: { institucion?: string[]; sector?: string[] }) {
    const allCarteles = this.datos.get('DetalleCarteles') || [];
    const { carteles: filteredCarteles } = this.filterByInstitucionSector(filtros);
    
    return {
      total: allCarteles.length,
      filtered: filteredCarteles.length,
      percentage: allCarteles.length > 0 ? (filteredCarteles.length / allCarteles.length) * 100 : 0,
      institutionsActive: filtros?.institucion?.length || 0,
      categoriesActive: filtros?.sector?.length || 0
    };
  }

  /**
   * Busca instituciones por término de búsqueda
   */
  public searchInstitutions(searchTerm: string, limit: number = 50) {
    if (!searchTerm.trim()) return this.getAvailableInstitutions().slice(0, limit);
    
    const term = searchTerm.toLowerCase();
    return this.getAvailableInstitutions()
      .filter(inst => 
        inst.label.toLowerCase().includes(term) ||
        inst.value.toLowerCase().includes(term)
      )
      .slice(0, limit);
  }

  /**
   * Busca categorías por término de búsqueda
   */
  public searchCategories(searchTerm: string, limit: number = 50) {
    if (!searchTerm.trim()) return this.getAvailableCategories().slice(0, limit);
    
    const term = searchTerm.toLowerCase();
    return this.getAvailableCategories()
      .filter(cat => 
        cat.label.toLowerCase().includes(term) ||
        cat.value.toLowerCase().includes(term)
      )
      .slice(0, limit);
  }

  public getTTADebug() { return this.ttaCache; }
  public forceRecomputeTTA() { this.ttaCache = null; return this.computeTTA(false, null); }
  public getDatasetSizes() {
    const out: Record<string, number> = {};
    for (const [k,v] of this.datos.entries()) out[k] = v.length;
    return out;
  }

  // ================================
  // MÉTODOS PARA CARGA DIRECTA DESDE CACHE
  // ================================

  /**
   * Inyecta datos directamente sin cargar archivos CSV
   * Útil para cargar desde cache consolidado
   * 
   * OPTIMIZADO: Procesa datos en chunks para evitar bloquear el navegador
   */
  public async loadDataFromMemory(consolidatedData: Record<string, any[]>): Promise<void> {
    try {
      this.loadingProgress = 0;
      this.loadingStage = 'Cargando datos desde cache';
      console.log('🚀 Iniciando carga de datos desde cache consolidado...');

      const tables = Object.keys(consolidatedData);
      const totalTables = tables.length;

      // Cargar cada tabla (SIN CAMBIOS en el loop principal)
      for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i];
        const rawData = consolidatedData[tableName] ?? [];
        const data = Array.isArray(rawData) ? rawData : [];
        
        // Mapear nombre de tabla si es necesario
        // Proveedores_unido → Proveedores
        let mappedTableName = tableName;
        if (tableName === 'Proveedores_unido') {
          mappedTableName = 'Proveedores';
          console.log(`📝 Mapeando ${tableName} → ${mappedTableName}`);
        }
        
        this.loadingStage = `Cargando ${mappedTableName}`;
        this.loadingProgress = Math.round((i / totalTables) * 70);
        
        console.log(`📊 Cargando ${mappedTableName}: ${data.length} registros`);
        const headerMap = this.prepararHeaderMap(mappedTableName);
        
        // OPTIMIZACIÓN: Procesar en chunks para evitar "Wait" del navegador
        const normalizedData = await this.normalizarDataEnChunks(mappedTableName, data, headerMap);
        
        this.datos.set(mappedTableName, normalizedData);
        this.diagnostics.rowCounts[mappedTableName] = normalizedData.length;
      }

      // Verificar Proveedores
      const provsCargados = this.datos.get('Proveedores') || [];
      if (!provsCargados.length) {
        console.warn('⚠️ No se cargaron Proveedores. Generando fallback...');
        const fuentes: string[] = ['Ofertas', 'LineasAdjudicadas', 'Contratos'];
        const ids = new Set<string>();
        fuentes.forEach(f => {
          const arr: any[] = this.datos.get(f) || [];
          arr.forEach(r => {
            const id = String(r.idProveedorAdjudicado || r.idProveedor || '').replace(/\D+/g, '').trim();
            if (id) ids.add(id);
          });
        });
        const sinteticos = Array.from(ids).map(id => ({ idProveedor: id, nombreProveedor: id }));
        this.datos.set('Proveedores', sinteticos);
        this.diagnostics.rowCounts['Proveedores'] = sinteticos.length;
        console.warn(`🧩 Fallback Proveedores generado: ${sinteticos.length} registros sintéticos.`);
      }

      // Crear índices
      this.loadingStage = 'Construyendo índices de búsqueda';
      this.loadingProgress = 85;
      console.log('🔍 Creando índices...');
      await this.crearIndices(); // OPTIMIZADO: Ahora es async
      await this.construirIndiceTexto(); // OPTIMIZADO: Ahora es async

      // Validar integridad
      this.loadingStage = 'Validando integridad';
      this.loadingProgress = 95;
      console.log('🔗 Validando relaciones...');
      this.validarIntegridad();

      // Generar estadísticas
      this.loadingStage = 'Generando estadísticas';
      console.log('📊 Generando estadísticas...');
      this.generarEstadisticasIniciales();
      this.logValidationSummary({ showSamples: false });

      this.isLoaded = true;
      this.loadingProgress = 100;
      this.loadingStage = 'Completado';
      console.log('🎉 Carga desde cache completa! Datos listos para consultas.');

    } catch (error) {
      console.error('💥 Error cargando datos desde cache:', error);
      throw new Error(`Error cargando datos desde cache: ${error}`);
    }
  }

  private prepararHeaderMap(tableName: string): Record<string, string> {
    const rawMap = MAPEO_HEADERS_POR_TABLA[tableName] || {};
    const normalizedMap: Record<string, string> = {};
    Object.entries(rawMap).forEach(([key, value]) => {
      normalizedMap[key.trim().toLowerCase()] = value;
    });
    return normalizedMap;
  }

  /**
   * OPTIMIZACIÓN: Procesa datos en chunks para evitar bloquear el navegador
   * Divide el array en lotes pequeños y procesa cada lote con un pequeño delay
   */
  private async normalizarDataEnChunks(
    tableName: string,
    data: any[],
    headerMap: Record<string, string>,
    chunkSize: number = 1000 // Procesar 1000 registros a la vez
  ): Promise<any[]> {
    const normalizedData: any[] = [];
    const totalRecords = data.length;
    
    // Si son pocos registros, procesar todo de una vez
    if (totalRecords <= chunkSize) {
      return data.map(record => this.normalizarRegistroDesdeCache(tableName, record, headerMap));
    }
    
    // Procesar en chunks
    for (let i = 0; i < totalRecords; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, totalRecords));
      
      // Procesar el chunk actual
      const normalizedChunk = chunk.map(record => 
        this.normalizarRegistroDesdeCache(tableName, record, headerMap)
      );
      
      normalizedData.push(...normalizedChunk);
      
      // Dar tiempo al navegador para procesar otros eventos
      // Esto evita el mensaje "Wait" del navegador
      await this.yieldToMainThread();
      
      // Log de progreso cada 10000 registros
      if ((i + chunkSize) % 10000 === 0 || i + chunkSize >= totalRecords) {
        console.log(`  ⏳ Procesados ${Math.min(i + chunkSize, totalRecords)}/${totalRecords} registros`);
      }
    }
    
    return normalizedData;
  }

  /**
   * Cede el control al thread principal para que el navegador pueda procesar eventos
   * Esto previene el mensaje "Wait" cuando hay operaciones largas
   */
  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => {
      // Usar setTimeout con 0ms para ceder el control al event loop
      // El navegador procesará eventos pendientes antes de continuar
      setTimeout(resolve, 0);
    });
  }

  private normalizarRegistroDesdeCache(
    _: string,
    record: Record<string, any>,
    headerMap: Record<string, string>
  ): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [rawKey, rawValue] of Object.entries(record)) {
      if (!rawKey) continue;

      if (rawKey.startsWith('_') || this.cacheMetadataFields.has(rawKey)) {
        normalized[rawKey] = rawValue;
        continue;
      }

      const keyLower = rawKey.trim().toLowerCase();
      const mappedKey = headerMap[keyLower] || this.normalizarNombreColumna(rawKey);

      let transformedValue: any = rawValue;
      if (typeof rawValue === 'string') {
        transformedValue = this.transformarValor(rawValue, mappedKey);
      }

      if (mappedKey in normalized) {
        if ((normalized[mappedKey] == null || normalized[mappedKey] === '') && transformedValue != null) {
          normalized[mappedKey] = transformedValue;
        }
      } else {
        normalized[mappedKey] = transformedValue;
      }
    }

    return normalized;
  }

  /**
   * Obtiene el progreso de carga actual
   */
  public getLoadingProgress(): { progress: number; stage: string } {
    return {
      progress: this.loadingProgress,
      stage: this.loadingStage
    };
  }

  /**
   * Limpia todos los datos cargados
   */
  public clearData(): void {
    this.datos.clear();
    this.indices.clear();
    this.isLoaded = false;
    this.loadingProgress = 0;
    this.loadingStage = '';
    this.ttaCache = null;
    this.integridadResumen = null;
    console.log('🧹 Datos del DataManager limpiados');
  }
}

// Instancia singleton
export const dataManager = new SicopDataManager();
// Exponer para consola de debug
if (typeof window !== 'undefined') {
  (window as any).SICOP_DM = dataManager;
}
