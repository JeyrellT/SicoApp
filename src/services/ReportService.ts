// ================================
// SERVICIO DE REPORTES Y ANÁLISIS
// ================================
// Genera reportes ejecutivos y análisis estadísticos profundos

import _ from 'lodash';
import { dataManager } from '../data/DataManager';
import { 
  DetalleCartel,
  Contrato,
  Proveedor
} from '../types/entities';

export interface ReporteEjecutivo {
  resumenGeneral: ResumenGeneral;
  tendenciasMercado: TendenciasMercado;
  analisisCompetencia: AnalisisCompetenciaDetallado;
  oportunidades: Oportunidad[];
  recomendaciones: string[];
}

export interface ResumenGeneral {
  periodo: { inicio: Date; fin: Date };
  totalLicitaciones: number;
  totalContratos: number;
  montoTotalAdjudicado: number;
  crecimientoAnual: number;
  institucionesMasActivas: { nombre: string; cantidad: number; monto: number }[];
  sectoresPrincipales: { sector: string; participacion: number }[];
}

export interface TendenciasMercado {
  evolucionMontos: { periodo: string; monto: number }[];
  evolucionCantidad: { periodo: string; cantidad: number }[];
  estacionalidad: { mes: string; actividad: number }[];
  competenciaPromedio: number;
  tiempoPromedioProceso: number;
}

export interface AnalisisCompetenciaDetallado {
  ranking: RankingProveedor[];
  concentracionMercado: number;
  nuevosEntrantes: Proveedor[];
  proveedoresEnDecadencia: Proveedor[];
  colaboracionesFrecuentes: { proveedor1: string; proveedor2: string; frecuencia: number }[];
}

export interface RankingProveedor {
  id: string;
  nombre: string;
  posicion: number;
  cantidadContratos: number;
  montoTotal: number;
  marketShare: number;
  tasaExito: number;
  sectoresPrincipales: string[];
  crecimiento: number;
}

export interface Oportunidad {
  tipo: 'nicho_poca_competencia' | 'mercado_creciente' | 'cliente_potencial' | 'sector_emergente';
  titulo: string;
  descripcion: string;
  potencial: 'Alto' | 'Medio' | 'Bajo';
  montoEstimado: number;
  plazoRecomendado: string;
  accionesRecomendadas: string[];
}

export class ReportService {

  // ================================
  // GENERACIÓN DE REPORTES EJECUTIVOS
  // ================================

  /**
   * Genera un reporte ejecutivo completo para un proveedor
   */
  generarReporteEjecutivo(parametros: {
    idProveedor?: string;
    periodo?: { inicio: Date; fin: Date };
    sectores?: string[];
    competidores?: string[];
    incluirOportunidades?: boolean;
  }): ReporteEjecutivo {
    const periodo = parametros.periodo || this.obtenerPeriodoDefault();
    
    return {
      resumenGeneral: this.generarResumenGeneral(periodo, parametros.sectores),
      tendenciasMercado: this.analizarTendenciasMercado(periodo, parametros.sectores),
      analisisCompetencia: this.analizarCompetenciaDetallado(parametros.competidores, periodo),
      oportunidades: parametros.incluirOportunidades ? 
        this.identificarOportunidades(parametros.idProveedor, parametros.sectores) : [],
      recomendaciones: this.generarRecomendaciones(parametros)
    };
  }

  private generarResumenGeneral(periodo: { inicio: Date; fin: Date }, sectores?: string[]): ResumenGeneral {
    let carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => this.estaEnPeriodo(c.fechaPublicacion, periodo));
    
    let contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => this.estaEnPeriodo(c.fechaFirma, periodo));

    // Filtrar por sectores si se especifica
    if (sectores && sectores.length > 0) {
      carteles = this.filtrarPorSectores(carteles, sectores);
      // Para contratos, necesitamos vincular con líneas para filtrar por sector
      contratos = this.filtrarContratosPorSectores(contratos, sectores);
    }

    const montoTotal = _.sumBy(contratos, 'montoContrato') || 0;
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
    let carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => this.estaEnPeriodo(c.fechaPublicacion, periodo));
    
    let contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => this.estaEnPeriodo(c.fechaFirma, periodo));

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
    let contratos = dataManager.obtenerDatos('Contratos');
    
    if (periodo) {
      contratos = contratos.filter(c => this.estaEnPeriodo(c.fechaFirma, periodo));
    }

    if (competidores && competidores.length > 0) {
      contratos = contratos.filter(c => competidores.includes(c.idProveedor));
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

    // Nichos con poca competencia
    const nichos = this.identificarNichosPocaCompetencia(sectores);
    oportunidades.push(...nichos);

    // Mercados en crecimiento
    const mercadosCrecientes = this.identificarMercadosCrecientes(sectores);
    oportunidades.push(...mercadosCrecientes);

    // Clientes potenciales para el proveedor específico
    if (idProveedor) {
      const clientesPotenciales = this.identificarClientesPotenciales(idProveedor);
      oportunidades.push(...clientesPotenciales);
    }

    return _.orderBy(oportunidades, 'montoEstimado', 'desc').slice(0, 10);
  }

  // ================================
  // ANÁLISIS ESPECÍFICOS
  // ================================

  /**
   * Analiza la posición competitiva de un proveedor
   */
  analizarPosicionCompetitiva(idProveedor: string, periodo?: { inicio: Date; fin: Date }): any {
    const proveedor = dataManager.obtenerDatos('Proveedores')
      .find(p => p.idProveedor === idProveedor);
    
    if (!proveedor) {
      throw new Error(`Proveedor ${idProveedor} no encontrado`);
    }

    let contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.idProveedor === idProveedor);
    
    if (periodo) {
      contratos = contratos.filter(c => this.estaEnPeriodo(c.fechaFirma, periodo));
    }

    const ofertas = dataManager.obtenerDatos('Ofertas')
      .filter(o => o.idProveedor === idProveedor);

    const lineasAdjudicadas = dataManager.obtenerDatos('LineasAdjudicadas')
      .filter(l => l.idProveedorAdjudicado === idProveedor);

    const tasaExito = ofertas.length > 0 ? (contratos.length / ofertas.length) * 100 : 0;
    const montoTotal = _.sumBy(contratos, 'montoContrato');
    
    // Analizar competidores directos
    const competidoresDirectos = this.obtenerCompetidoresDirectos(idProveedor);
    
    // Analizar sectores de actividad
    const sectoresActividad = this.analizarSectoresActividad(idProveedor);

    return {
      proveedor: proveedor.nombreProveedor,
      estadisticas: {
        totalContratos: contratos.length,
        montoTotal,
        montoPromedio: montoTotal / (contratos.length || 1),
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

  /**
   * Analiza las tendencias de precios en un sector
   */
  analizarTendenciasPrecios(sectores: string[], periodo?: { inicio: Date; fin: Date }): any {
    const lineasCartel = dataManager.obtenerDatos('DetalleLineaCartel');
    const lineasAdjudicadas = dataManager.obtenerDatos('LineasAdjudicadas');
    const carteles = dataManager.obtenerDatos('DetalleCarteles');

    // Filtrar líneas por sectores
    const lineasSector = lineasCartel.filter(linea => {
      const cartel = carteles.find(c => c.numeroCartel === linea.numeroCartel);
      if (!cartel) return false;

      if (periodo && !this.estaEnPeriodo(cartel.fechaPublicacion, periodo)) {
        return false;
      }

      const textoCartel = `${cartel.nombreCartel} ${cartel.descripcionCartel} ${linea.descripcionLinea}`.toLowerCase();
      return sectores.some(sector => textoCartel.includes(sector.toLowerCase()));
    });

    // Obtener precios adjudicados para estas líneas
    const preciosHistoricos: any[] = [];
    
    lineasSector.forEach(linea => {
      const adjudicacion = lineasAdjudicadas.find(adj => 
        adj.numeroCartel === linea.numeroCartel && adj.numeroLinea === linea.numeroLinea
      );

      if (adjudicacion) {
        const cartel = carteles.find(c => c.numeroCartel === linea.numeroCartel);
        preciosHistoricos.push({
          fecha: cartel?.fechaPublicacion,
          producto: linea.descripcionLinea,
          precio: adjudicacion.precioAdjudicado,
          cantidad: adjudicacion.cantidadAdjudicada,
          proveedor: adjudicacion.idProveedorAdjudicado,
          cartel: linea.numeroCartel
        });
      }
    });

    // Agrupar por producto similar
    const productosSimilares = this.agruparProductosSimilares(preciosHistoricos);
    
    return {
      totalProductos: Object.keys(productosSimilares).length,
      tendenciasPorProducto: this.calcularTendenciasPorProducto(productosSimilares),
      variabilidadPrecios: this.calcularVariabilidadPrecios(preciosHistoricos),
      proveedoresDominantes: this.identificarProveedoresDominantes(preciosHistoricos)
    };
  }

  // ================================
  // MÉTODOS AUXILIARES
  // ================================

  private obtenerPeriodoDefault(): { inicio: Date; fin: Date } {
    const fin = new Date();
    const inicio = new Date();
    inicio.setFullYear(fin.getFullYear() - 1);
    return { inicio, fin };
  }

  private estaEnPeriodo(fecha: Date | undefined, periodo: { inicio: Date; fin: Date }): boolean {
    if (!fecha) return false;
    return fecha >= periodo.inicio && fecha <= periodo.fin;
  }

  private filtrarPorSectores(carteles: any[], sectores: string[]): any[] {
    return carteles.filter(cartel => {
      const texto = `${cartel.nombreCartel} ${cartel.descripcionCartel}`.toLowerCase();
      return sectores.some(sector => texto.includes(sector.toLowerCase()));
    });
  }

  private filtrarContratosPorSectores(contratos: any[], sectores: string[]): any[] {
    const lineasContratadas = dataManager.obtenerDatos('LineasContratadas');
    const lineasCartel = dataManager.obtenerDatos('DetalleLineaCartel');
    
    const contratosConSector = new Set<string>();

    lineasContratadas.forEach(lineaContratada => {
      const lineaCartel = lineasCartel.find(lc => 
        lc.numeroCartel === lineaContratada.numeroCartel && 
        lc.numeroLinea === lineaContratada.numeroLinea
      );

      if (lineaCartel) {
        const descripcion = lineaCartel.descripcionLinea.toLowerCase();
        const tieneSector = sectores.some(sector => descripcion.includes(sector.toLowerCase()));
        
        if (tieneSector) {
          contratosConSector.add(lineaContratada.idContrato);
        }
      }
    });

    return contratos.filter(contrato => contratosConSector.has(contrato.idContrato));
  }

  private calcularCrecimientoAnual(contratos: any[], periodo: { inicio: Date; fin: Date }): number {
    const añoInicio = periodo.inicio.getFullYear();
    const añoFin = periodo.fin.getFullYear();
    
    if (añoInicio === añoFin) return 0;

    const contratosInicio = contratos.filter(c => c.fechaFirma?.getFullYear() === añoInicio);
    const contratosFin = contratos.filter(c => c.fechaFirma?.getFullYear() === añoFin);

    const montoInicio = _.sumBy(contratosInicio, 'montoContrato') || 1;
    const montoFin = _.sumBy(contratosFin, 'montoContrato') || 0;

    return ((montoFin - montoInicio) / montoInicio) * 100;
  }

  private obtenerInstitucionesMasActivas(carteles: any[], contratos: any[]): any[] {
    const instituciones = dataManager.obtenerDatos('InstitucionesRegistradas');
    
    const actividad = _.groupBy(carteles, 'codigoInstitucion');
    const montos = _.groupBy(contratos, 'codigoInstitucion');

    return _.map(actividad, (cartelesInst, codigo) => {
      const institucion = instituciones.find(i => i.codigoInstitucion === codigo);
      const contratosInst = montos[codigo] || [];
      
      return {
        nombre: institucion?.nombreInstitucion || 'Desconocida',
        cantidad: cartelesInst.length,
        monto: _.sumBy(contratosInst, 'montoContrato') || 0
      };
    })
    .filter(inst => inst.cantidad > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 10);
  }

  private obtenerSectoresPrincipales(carteles: any[]): any[] {
    const palabrasClave = [
      'medicamento', 'salud', 'educación', 'tecnología', 'construcción',
      'transporte', 'seguridad', 'alimentos', 'servicios', 'consultoría'
    ];

    const sectores = palabrasClave.map(sector => {
      const cartelesDelSector = carteles.filter(cartel => {
        const texto = `${cartel.nombreCartel} ${cartel.descripcionCartel}`.toLowerCase();
        return texto.includes(sector);
      });

      return {
        sector,
        participacion: (cartelesDelSector.length / carteles.length) * 100
      };
    })
    .filter(sector => sector.participacion > 0)
    .sort((a, b) => b.participacion - a.participacion);

    return sectores.slice(0, 5);
  }

  private calcularEvolucionMontos(contratos: any[]): any[] {
    const porMes = _.groupBy(contratos, contrato => {
      const fecha = contrato.fechaFirma;
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    return _.map(porMes, (contratosDelMes, periodo) => ({
      periodo,
      monto: _.sumBy(contratosDelMes, 'montoContrato') || 0
    }))
    .filter(item => item.periodo !== 'Sin fecha')
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  private calcularEvolucionCantidad(carteles: any[]): any[] {
    const porMes = _.groupBy(carteles, cartel => {
      const fecha = cartel.fechaPublicacion;
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
      const fecha = cartel.fechaPublicacion;
      return fecha ? fecha.getMonth() : -1;
    });

    return meses.map((mes, index) => ({
      mes,
      actividad: (porMes[index] || []).length
    }));
  }

  private calcularCompetenciaPromedio(carteles: any[]): number {
    const lineasRecibidas = dataManager.obtenerDatos('LineasRecibidas');
    const totalOfertas = _.sumBy(lineasRecibidas, 'cantidadOfertasRecibidas');
    return totalOfertas / (lineasRecibidas.length || 1);
  }

  private calcularTiempoPromedioProceso(carteles: any[]): number {
    const fechasPorEtapas = dataManager.obtenerDatos('FechaPorEtapas');
    
    const tiempos = carteles.map(cartel => {
      const fechas = fechasPorEtapas.find(f => f.numeroCartel === cartel.numeroCartel);
      if (!fechas || !fechas.fechaPublicacion || !fechas.fechaAdjudicacion) return 0;
      
      const inicio = new Date(fechas.fechaPublicacion);
      const fin = new Date(fechas.fechaAdjudicacion);
      return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24); // días
    }).filter(tiempo => tiempo > 0);

    return _.mean(tiempos) || 0;
  }

  private generarRankingProveedores(contratos: any[]): RankingProveedor[] {
    const proveedores = dataManager.obtenerDatos('Proveedores');
    const ofertas = dataManager.obtenerDatos('Ofertas');
    
    const porProveedor = _.groupBy(contratos, 'idProveedor');
    
    return _.map(porProveedor, (contratosProveedor, idProveedor) => {
      const proveedor = proveedores.find(p => p.idProveedor === idProveedor);
      const ofertasProveedor = ofertas.filter(o => o.idProveedor === idProveedor);
      const montoTotal = _.sumBy(contratosProveedor, 'montoContrato');
      
      return {
        id: idProveedor,
        nombre: proveedor?.nombreProveedor || 'Desconocido',
        posicion: 0, // Se calculará después del ordenamiento
        cantidadContratos: contratosProveedor.length,
        montoTotal,
        marketShare: 0, // Se calculará después
        tasaExito: ofertasProveedor.length > 0 ? 
          (contratosProveedor.length / ofertasProveedor.length) * 100 : 0,
        sectoresPrincipales: [], // TODO: implementar
        crecimiento: 0 // TODO: implementar
      };
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

  private identificarNuevosEntrantes(periodo?: { inicio: Date; fin: Date }): Proveedor[] {
    // TODO: Implementar lógica para identificar nuevos entrantes
    return [];
  }

  private identificarProveedoresEnDecadencia(periodo?: { inicio: Date; fin: Date }): Proveedor[] {
    // TODO: Implementar lógica para identificar proveedores en decadencia
    return [];
  }

  private analizarColaboraciones(contratos: any[]): any[] {
    // TODO: Implementar análisis de colaboraciones frecuentes
    return [];
  }

  private identificarNichosPocaCompetencia(sectores?: string[]): Oportunidad[] {
    // TODO: Implementar identificación de nichos
    return [];
  }

  private identificarMercadosCrecientes(sectores?: string[]): Oportunidad[] {
    // TODO: Implementar identificación de mercados crecientes
    return [];
  }

  private identificarClientesPotenciales(idProveedor: string): Oportunidad[] {
    // TODO: Implementar identificación de clientes potenciales
    return [];
  }

  private obtenerCompetidoresDirectos(idProveedor: string): any[] {
    // TODO: Implementar obtención de competidores directos
    return [];
  }

  private analizarSectoresActividad(idProveedor: string): any[] {
    // TODO: Implementar análisis de sectores de actividad
    return [];
  }

  private identificarFortalezasProveedor(idProveedor: string): string[] {
    // TODO: Implementar identificación de fortalezas
    return [];
  }

  private identificarDebilidadesProveedor(idProveedor: string): string[] {
    // TODO: Implementar identificación de debilidades
    return [];
  }

  private generarRecomendacionesEstrategicas(idProveedor: string): string[] {
    // TODO: Implementar generación de recomendaciones estratégicas
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

  private calcularVariabilidadPrecios(precios: any[]): any {
    // TODO: Implementar cálculo de variabilidad de precios
    return {};
  }

  private identificarProveedoresDominantes(precios: any[]): any[] {
    // TODO: Implementar identificación de proveedores dominantes
    return [];
  }

  private generarRecomendaciones(parametros: any): string[] {
    const recomendaciones: string[] = [];
    
    // Generar recomendaciones básicas
    recomendaciones.push("Considere diversificar su portafolio de clientes");
    recomendaciones.push("Analice las tendencias estacionales para optimizar sus ofertas");
    recomendaciones.push("Evalúe oportunidades en nichos con poca competencia");
    
    return recomendaciones;
  }
}

export const reportService = new ReportService();
