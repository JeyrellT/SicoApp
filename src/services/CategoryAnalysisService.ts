// ================================
// SERVICIO PARA ANÁLISIS DE CATEGORÍAS EXISTENTES
// ================================

import _ from 'lodash';
import { dataManager } from '../data/DataManager';

export interface CategoryAnalysis {
  categoria: string;
  totalLineas: number;
  porcentaje: number;
  montoTotal: number;
  ejemplos: Array<{
    numeroCartel: string;
    descripcionLinea: string;
    presupuestoLinea?: number;
    codigoInstitucion: string;
    palabrasCoincidentes: string[];
    // Nuevos campos para diferenciar nivel de coincidencia
    tipoCoincidencia: 'cartel' | 'lineas'; // Si coincidió en datos del cartel o en líneas específicas
    lineasCoincidentes?: Array<{
      descripcion: string;
      presupuesto: number;
      palabrasEncontradas: string[];
    }>; // Solo para tipoCoincidencia === 'lineas'
    todasLasLineas?: Array<{
      descripcion: string;
      presupuesto: number;
    }>; // Solo para tipoCoincidencia === 'cartel', para mostrar expandible
  }>;
  subcategorias?: Array<{
    nombre: string;
    count: number;
    ejemplos: string[];
  }>;
  instituciones: Array<{
    codigo: string;
    nombre: string;
    lineas: number;
    monto: number;
  }>;
  tendenciaMensual: Array<{
    mes: string;
    lineas: number;
    monto: number;
  }>;
}

export interface SystemCategoryOverview {
  totalLineas: number;
  totalMonto: number;
  cobertura: number; // % de líneas categorizadas
  categorias: CategoryAnalysis[];
  sinCategorizar: {
    lineas: number;
    ejemplos: string[];
  };
}

class CategoryAnalysisServiceImpl {
  
  // Obtiene las reglas de sector del DataManager
  private getSectorRules(): Record<string, RegExp[]> {
    return dataManager.getSectorRules();
  }

  // Clasifica una descripción según las reglas de sectores
  private clasificarSector(descripcion: string): { sector: string; coincidencias: string[] } {
    const desc = (descripcion || '').toLowerCase();
    const rules = this.getSectorRules();
    
    for (const [sector, regexes] of Object.entries(rules)) {
      const coincidencias: string[] = [];
      
      for (const regex of regexes) {
        const match = desc.match(regex);
        if (match) {
          // Extraer la parte que coincidió
          const coincidencia = match[0] || '';
          if (coincidencia && !coincidencias.includes(coincidencia)) {
            coincidencias.push(coincidencia);
          }
        }
      }
      
      if (coincidencias.length > 0) {
        return { sector, coincidencias };
      }
    }
    
    return { sector: 'Sin categorizar', coincidencias: [] };
  }

  analyzeSystemCategories(): SystemCategoryOverview {
    const lineas: any[] = dataManager.obtenerDatos('DetalleLineaCartel') || [];
    const carteles: any[] = dataManager.obtenerDatos('DetalleCarteles') || [];
    const instituciones: any[] = dataManager.obtenerDatos('InstitucionesRegistradas') || [];
    
    // DEBUG: Verificar reglas disponibles
    const activeRules = this.getSectorRules();
    console.log('[CategoryAnalysisService] Reglas activas:', Object.keys(activeRules));
    console.log('[CategoryAnalysisService] Total líneas a analizar:', lineas.length);
    
    // Crear mapas para joins eficientes
    const cartelMap = new Map(carteles.map(c => [c.numeroCartel, c]));
    const institucionMap = new Map(instituciones.map(i => [i.codigoInstitucion, i]));
    
    const totalLineas = lineas.length;
    const totalMonto = _.sumBy(lineas, l => l.presupuestoLinea || 0);
    
    // Clasificar todas las líneas
    const clasificaciones = lineas.map(linea => {
      const cartel = cartelMap.get(linea.numeroCartel);
      const { sector, coincidencias } = this.clasificarSector(linea.descripcionLinea);
      
      return {
        ...linea,
        sector,
        coincidencias,
        cartel,
        institucion: cartel ? institucionMap.get(cartel.codigoInstitucion) : null
      };
    });
    
    // Agrupar por sector
    const porSector = _.groupBy(clasificaciones, 'sector');
    
    console.log('[CategoryAnalysisService] Sectores encontrados:', Object.keys(porSector));
    console.log('[CategoryAnalysisService] Distribución:', 
      Object.entries(porSector).map(([s, ls]) => `${s}: ${ls.length}`).join(', ')
    );
    
    const categorias: CategoryAnalysis[] = [];
    
    for (const [sector, lineasSector] of Object.entries(porSector)) {
      if (sector === 'Sin categorizar') continue;
      
      const totalLineasSector = lineasSector.length;
      const montoTotalSector = _.sumBy(lineasSector, l => l.presupuestoLinea || 0);
      const porcentaje = (totalLineasSector / totalLineas) * 100;
      
      // Top ejemplos con mejor score de coincidencias
      const ejemplosConScore = lineasSector
        .map(l => ({
          ...l,
          score: l.coincidencias.length
        }))
        .filter(l => l.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      const ejemplos = ejemplosConScore.map(l => ({
        numeroCartel: l.numeroCartel,
        descripcionLinea: l.descripcionLinea,
        presupuestoLinea: l.presupuestoLinea,
        codigoInstitucion: l.cartel?.codigoInstitucion || '',
        palabrasCoincidentes: l.coincidencias,
        tipoCoincidencia: 'cartel' as const // Por defecto en este servicio legacy
      }));
      
      // Análisis por institución
      const porInstitucion = _.groupBy(lineasSector, l => l.cartel?.codigoInstitucion);
      const instituciones = Object.entries(porInstitucion)
        .map(([codigo, lineas]) => {
          const inst = institucionMap.get(codigo);
          return {
            codigo: codigo || 'N/A',
            nombre: inst?.nombreInstitucion || 'Desconocida',
            lineas: lineas.length,
            monto: _.sumBy(lineas, l => l.presupuestoLinea || 0)
          };
        })
        .sort((a, b) => b.lineas - a.lineas)
        .slice(0, 10);
      
      // Tendencia mensual básica (últimos 12 meses)
      const tendenciaMensual = this.calcularTendenciaMensual(lineasSector);
      
      categorias.push({
        categoria: sector,
        totalLineas: totalLineasSector,
        porcentaje,
        montoTotal: montoTotalSector,
        ejemplos,
        instituciones,
        tendenciaMensual
      });
    }
    
    // Ordenar por número de líneas
    categorias.sort((a, b) => b.totalLineas - a.totalLineas);
    
    const sinCategorizar = porSector['Sin categorizar'] || [];
    const cobertura = ((totalLineas - sinCategorizar.length) / totalLineas) * 100;
    
    console.log('[CategoryAnalysisService] Resultado final:');
    console.log('  - Total categorías:', categorias.length);
    console.log('  - Cobertura:', cobertura.toFixed(2) + '%');
    console.log('  - Sin categorizar:', sinCategorizar.length);
    
    return {
      totalLineas,
      totalMonto,
      cobertura,
      categorias,
      sinCategorizar: {
        lineas: sinCategorizar.length,
        ejemplos: sinCategorizar.slice(0, 20).map(l => l.descripcionLinea)
      }
    };
  }
  
  private calcularTendenciaMensual(lineas: any[]): Array<{ mes: string; lineas: number; monto: number }> {
    // Agrupar por mes basado en fecha de publicación del cartel
    const porMes = new Map<string, any[]>();
    
    lineas.forEach(linea => {
      const fechaPub = linea.cartel?.fechaPublicacion;
      if (fechaPub) {
        const fecha = new Date(fechaPub);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!porMes.has(mesKey)) {
          porMes.set(mesKey, []);
        }
        porMes.get(mesKey)!.push(linea);
      }
    });
    
    // Convertir a array y ordenar
    const resultado = Array.from(porMes.entries())
      .map(([mes, lineasMes]) => ({
        mes,
        lineas: lineasMes.length,
        monto: _.sumBy(lineasMes, l => l.presupuestoLinea || 0)
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Últimos 12 meses
    
    return resultado;
  }
}

export const CategoryAnalysisService = new CategoryAnalysisServiceImpl();