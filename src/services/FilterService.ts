// ================================
// SERVICIO DE FILTROS AVANZADOS
// ================================
// Proporciona filtros especializados para análisis de mercado

import _ from 'lodash';
import { dataManager } from '../data/DataManager';
import { 
  DetalleCartel, 
  Contrato, 
  Proveedor,
  InstitucionRegistrada 
} from '../types/entities';

export class FilterService {

  // ================================
  // FILTROS POR NICHO DE MERCADO
  // ================================

  /**
   * Busca oportunidades con poca competencia
   */
  buscarNichosPocaCompetencia(parametros: {
    maxOfertas: number;
    montoMinimo?: number;
    sectores?: string[];
    instituciones?: string[];
  }): DetalleCartel[] {
    const carteles = dataManager.obtenerDatos('DetalleCarteles');
    const lineasRecibidas = dataManager.obtenerDatos('LineasRecibidas');
    
    // Encontrar líneas con pocas ofertas
    const lineasPocaCompetencia = lineasRecibidas.filter(linea => 
      linea.cantidadOfertasRecibidas <= parametros.maxOfertas
    );

    const cartelesNicho = carteles.filter(cartel => {
      // Verificar si tiene líneas con poca competencia
      const tieneLineasPocaCompetencia = lineasPocaCompetencia.some(linea => 
        linea.numeroCartel === cartel.numeroCartel
      );

      if (!tieneLineasPocaCompetencia) return false;

      // Filtrar por monto mínimo
      if (parametros.montoMinimo && 
          (!cartel.presupuestoOficial || cartel.presupuestoOficial < parametros.montoMinimo)) {
        return false;
      }

      // Filtrar por sectores (usando keywords)
      if (parametros.sectores && parametros.sectores.length > 0) {
        const textoCartel = `${cartel.nombreCartel} ${cartel.descripcionCartel}`.toLowerCase();
        const tieneSector = parametros.sectores.some(sector => 
          textoCartel.includes(sector.toLowerCase())
        );
        if (!tieneSector) return false;
      }

      // Filtrar por instituciones
      if (parametros.instituciones && parametros.instituciones.length > 0) {
        if (!parametros.instituciones.includes(cartel.codigoInstitucion)) {
          return false;
        }
      }

      return true;
    });

    return _.orderBy(cartelesNicho, 'presupuestoOficial', 'desc');
  }

  /**
   * Busca licitaciones donde un proveedor específico nunca ha participado
   */
  buscarOportunidadesNuevas(idProveedor: string, parametros: {
    sectores?: string[];
    instituciones?: string[];
    montoMinimo?: number;
    periodo?: { inicio: Date; fin: Date };
  }): DetalleCartel[] {
    const carteles = dataManager.obtenerDatos('DetalleCarteles');
    const ofertas = dataManager.obtenerDatos('Ofertas');
    
    // Obtener carteles donde este proveedor ya participó
    const cartelesConParticipacion = new Set(
      ofertas
        .filter(oferta => oferta.idProveedor === idProveedor)
        .map(oferta => oferta.numeroCartel)
    );

    // Buscar carteles similares donde NO participó
    const cartelesNuevos = carteles.filter(cartel => {
      // Excluir donde ya participó
      if (cartelesConParticipacion.has(cartel.numeroCartel)) {
        return false;
      }

      // Aplicar filtros adicionales
      if (parametros.montoMinimo && 
          (!cartel.presupuestoOficial || cartel.presupuestoOficial < parametros.montoMinimo)) {
        return false;
      }

      if (parametros.instituciones && 
          !parametros.instituciones.includes(cartel.codigoInstitucion)) {
        return false;
      }

      if (parametros.periodo) {
        const fecha = cartel.fechaPublicacion;
        if (!fecha || fecha < parametros.periodo.inicio || fecha > parametros.periodo.fin) {
          return false;
        }
      }

      if (parametros.sectores && parametros.sectores.length > 0) {
        const textoCartel = `${cartel.nombreCartel} ${cartel.descripcionCartel}`.toLowerCase();
        const tieneSector = parametros.sectores.some(sector => 
          textoCartel.includes(sector.toLowerCase())
        );
        if (!tieneSector) return false;
      }

      return true;
    });

    return _.orderBy(cartelesNuevos, 'fechaPublicacion', 'desc');
  }

  // ================================
  // FILTROS POR PATRÓN INSTITUCIONAL
  // ================================

  /**
   * Analiza patrones de compra de una institución
   */
  analizarPatronesInstitucion(codigoInstitucion: string, parametros: {
    periodo?: { inicio: Date; fin: Date };
    tipoAnalisis: 'frecuencia' | 'montos' | 'proveedores' | 'productos';
  }): any {
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(cartel => cartel.codigoInstitucion === codigoInstitucion);

    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(contrato => contrato.codigoInstitucion === codigoInstitucion);

    // Filtrar por período si se especifica
    let cartelesFiltered = carteles;
    let contratosFiltered = contratos;

    if (parametros.periodo) {
      cartelesFiltered = carteles.filter(cartel => {
        const fecha = cartel.fechaPublicacion;
        return fecha && fecha >= parametros.periodo!.inicio && fecha <= parametros.periodo!.fin;
      });

      contratosFiltered = contratos.filter(contrato => {
        const fecha = contrato.fechaFirma;
        return fecha && fecha >= parametros.periodo!.inicio && fecha <= parametros.periodo!.fin;
      });
    }

    switch (parametros.tipoAnalisis) {
      case 'frecuencia':
        return this.analizarFrecuenciaCompras(cartelesFiltered);
      
      case 'montos':
        return this.analizarMontosInstitucion(contratosFiltered);
      
      case 'proveedores':
        return this.analizarProveedoresInstitucion(contratosFiltered);
      
      case 'productos':
        return this.analizarProductosInstitucion(cartelesFiltered);
      
      default:
        throw new Error(`Tipo de análisis no válido: ${parametros.tipoAnalisis}`);
    }
  }

  private analizarFrecuenciaCompras(carteles: DetalleCartel[]): any {
    const porMes = _.groupBy(carteles, cartel => {
      const fecha = cartel.fechaPublicacion;
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    const porProcedimiento = _.groupBy(carteles, 'codigoProcedimiento');

    return {
      totalLicitaciones: carteles.length,
      distribucionMensual: _.mapValues(porMes, grupo => grupo.length),
      distribucionPorProcedimiento: _.mapValues(porProcedimiento, grupo => grupo.length),
      promedioMensual: carteles.length / (Object.keys(porMes).length || 1)
    };
  }

  private analizarMontosInstitucion(contratos: Contrato[]): any {
    const montos = contratos
      .map(c => c.montoContrato)
      .filter(m => m && !isNaN(m));

    const porMes = _.groupBy(contratos, contrato => {
      const fecha = contrato.fechaFirma;
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : 'Sin fecha';
    });

    const montosPorMes = _.mapValues(porMes, grupo => 
      _.sumBy(grupo, 'montoContrato')
    );

    return {
      montoTotal: _.sum(montos),
      montoPromedio: _.mean(montos) || 0,
      montoMaximo: _.max(montos) || 0,
      montoMinimo: _.min(montos) || 0,
      distribucionMensual: montosPorMes,
      totalContratos: contratos.length
    };
  }

  private analizarProveedoresInstitucion(contratos: Contrato[]): any {
    const porProveedor = _.groupBy(contratos, 'idProveedor');
    const proveedores = dataManager.obtenerDatos('Proveedores');
    
    const estadisticasProveedores = _.map(porProveedor, (contratosProveedor, idProveedor) => {
      const proveedor = proveedores.find(p => p.idProveedor === idProveedor);
      const montoTotal = _.sumBy(contratosProveedor, 'montoContrato');
      
      return {
        idProveedor,
        nombreProveedor: proveedor?.nombreProveedor || 'Desconocido',
        cantidadContratos: contratosProveedor.length,
        montoTotal,
        montoPromedio: montoTotal / contratosProveedor.length,
        participacion: (montoTotal / _.sumBy(contratos, 'montoContrato')) * 100
      };
    });

    return {
      totalProveedores: Object.keys(porProveedor).length,
      proveedoresPrincipales: _.orderBy(estadisticasProveedores, 'montoTotal', 'desc').slice(0, 10),
      concentracion: this.calcularConcentracion(estadisticasProveedores)
    };
  }

  private analizarProductosInstitucion(carteles: DetalleCartel[]): any {
    const lineasCartel = dataManager.obtenerDatos('DetalleLineaCartel');
    
    // Obtener todas las líneas de los carteles de esta institución
    const numeroCarteles = new Set(carteles.map(c => c.numeroCartel));
    const lineasInstitucion = lineasCartel.filter(linea => 
      numeroCarteles.has(linea.numeroCartel)
    );

    // Categorizar por palabras clave comunes
    const categorias = this.categorizarProductos(lineasInstitucion);

    return {
      totalLineas: lineasInstitucion.length,
      totalCarteles: carteles.length,
      lineasPromedioPorCartel: lineasInstitucion.length / carteles.length,
      categorias: _.orderBy(categorias, 'cantidad', 'desc')
    };
  }

  private categorizarProductos(lineas: any[]): any[] {
    const palabrasClave = [
      'medicamento', 'equipo', 'suministro', 'servicio', 'mantenimiento',
      'construcción', 'consultoría', 'vehículo', 'combustible', 'alimento',
      'uniformes', 'mobiliario', 'tecnología', 'software', 'seguridad'
    ];

    const categorias: any[] = [];

    palabrasClave.forEach(palabra => {
      const lineasCategoria = lineas.filter(linea => 
        linea.descripcionLinea.toLowerCase().includes(palabra)
      );

      if (lineasCategoria.length > 0) {
        categorias.push({
          categoria: palabra,
          cantidad: lineasCategoria.length,
          montoTotal: _.sumBy(lineasCategoria, 'presupuestoLinea'),
          ejemplos: lineasCategoria.slice(0, 3).map(l => l.descripcionLinea)
        });
      }
    });

    return categorias;
  }

  private calcularConcentracion(proveedores: any[]): any {
    const totalMonto = _.sumBy(proveedores, 'montoTotal');
    const top5 = _.take(_.orderBy(proveedores, 'montoTotal', 'desc'), 5);
    const montoTop5 = _.sumBy(top5, 'montoTotal');

    return {
      concentracionTop5: (montoTop5 / totalMonto) * 100,
      indiceHerfindahl: _.sumBy(proveedores, p => Math.pow(p.participacion, 2))
    };
  }

  // ================================
  // FILTROS POR ESTACIONALIDAD
  // ================================

  /**
   * Analiza patrones estacionales de licitaciones
   */
  analizarEstacionalidad(parametros: {
    sectores?: string[];
    instituciones?: string[];
    años?: number[];
  }): any {
    let carteles = dataManager.obtenerDatos('DetalleCarteles');

    // Aplicar filtros
    if (parametros.instituciones) {
      carteles = carteles.filter(c => parametros.instituciones!.includes(c.codigoInstitucion));
    }

    if (parametros.sectores) {
      carteles = carteles.filter(cartel => {
        const texto = `${cartel.nombreCartel} ${cartel.descripcionCartel}`.toLowerCase();
        return parametros.sectores!.some(sector => texto.includes(sector.toLowerCase()));
      });
    }

    if (parametros.años) {
      carteles = carteles.filter(cartel => {
        const año = cartel.fechaPublicacion?.getFullYear();
        return año && parametros.años!.includes(año);
      });
    }

    const porMes = _.groupBy(carteles, cartel => {
      const fecha = cartel.fechaPublicacion;
      return fecha ? fecha.getMonth() + 1 : 0;
    });

    const porTrimestre = _.groupBy(carteles, cartel => {
      const fecha = cartel.fechaPublicacion;
      if (!fecha) return 0;
      return Math.ceil((fecha.getMonth() + 1) / 3);
    });

    return {
      distribucionMensual: _.mapValues(porMes, grupo => ({
        cantidad: grupo.length,
        montoPromedio: _.meanBy(grupo, 'presupuestoOficial') || 0
      })),
      distribucionTrimestral: _.mapValues(porTrimestre, grupo => ({
        cantidad: grupo.length,
        montoTotal: _.sumBy(grupo, 'presupuestoOficial')
      })),
      mesConMayorActividad: this.encontrarMesMaximo(porMes),
      recomendaciones: this.generarRecomendacionesEstacionales(porMes)
    };
  }

  private encontrarMesMaximo(porMes: Record<string, any[]>): any {
    const entries = Object.entries(porMes) as [string, any[]][];
    const maxEntry = _.maxBy(entries, ([mes, carteles]) => carteles.length);
    return maxEntry ? {
      mes: parseInt(maxEntry[0]),
      cantidad: maxEntry[1].length
    } : null;
  }

  private generarRecomendacionesEstacionales(porMes: Record<string, any[]>): string[] {
    const recomendaciones: string[] = [];
    
    // Analizar patrones y generar recomendaciones
    const entries = Object.entries(porMes) as [string, any[]][];
    const mesesOrdenados = _.orderBy(
      entries, 
      ([mes, carteles]) => carteles.length, 
      'desc'
    );

    const [mesMasActivo] = mesesOrdenados;
    if (mesMasActivo) {
      const nombreMes = this.obtenerNombreMes(parseInt(mesMasActivo[0]));
      recomendaciones.push(`${nombreMes} es el mes con mayor actividad licitatoria`);
    }

    return recomendaciones;
  }

  private obtenerNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || 'Desconocido';
  }

  // ================================
  // MÉTODOS PÚBLICOS DE UTILIDAD
  // ================================

  /**
   * Obtiene todas las instituciones únicas
   */
  obtenerInstituciones(): InstitucionRegistrada[] {
    return dataManager.obtenerDatos('InstitucionesRegistradas');
  }

  /**
   * Obtiene todos los proveedores únicos
   */
  obtenerProveedores(): Proveedor[] {
    return dataManager.obtenerDatos('Proveedores');
  }

  /**
   * Obtiene palabras clave más comunes en las descripciones
   */
  obtenerKeywordsComunes(limite: number = 50): string[] {
    const carteles = dataManager.obtenerDatos('DetalleCarteles');
    const lineas = dataManager.obtenerDatos('DetalleLineaCartel');
    
    console.log(`🔍 Procesando keywords: ${carteles.length} carteles, ${lineas.length} líneas`);
    
    // Recopilar todos los textos relevantes
    const textos: string[] = [];
    
    carteles.forEach((cartel: any) => {
      if (cartel.cartel_nm) textos.push(cartel.cartel_nm);
      if (cartel.des_excepcion) textos.push(cartel.des_excepcion);
    });
    
    lineas.forEach((linea: any) => {
      if (linea.desc_linea) textos.push(linea.desc_linea);
    });

    console.log(`🔍 Textos recopilados: ${textos.length} elementos`);

    // Palabras a excluir (stopwords en español y términos técnicos comunes)
    const stopwords = new Set([
      'de', 'la', 'el', 'en', 'y', 'a', 'para', 'con', 'por', 'del', 'los', 'las',
      'un', 'una', 'al', 'le', 'da', 'su', 'que', 'se', 'no', 'te', 'lo', 'le',
      'todo', 'esta', 'son', 'como', 'mas', 'pero', 'sus', 'está', 'o', 'ser',
      'tienen', 'tiene', 'puede', 'son', 'dos', 'también', 'fue', 'había',
      'sido', 'hasta', 'bajo', 'donde', 'mientras', 'desde', 'tanto', 'durante',
      'según', 'sin', 'sobre', 'entre', 'cada', 'algunos', 'muchos', 'otros',
      'mediante', 'través', 'favor', 'atención', 'señor', 'señora', 'don',
      'doña', 'doctor', 'doctora', 'licenciado', 'licenciada', 'ing', 'lic',
      'procedimiento', 'licitación', 'contratación', 'compra', 'adquisición',
      'suministro', 'contrato', 'cartel', 'oferta', 'proveedor', 'institución'
    ]);

    // Procesar todos los textos
    const frecuenciaPalabras = new Map<string, number>();
    
    textos.forEach(texto => {
      if (!texto) return;
      
      // Limpiar y dividir en palabras
      const palabras = texto
        .toLowerCase()
        .replace(/[^\w\sáéíóúñü]/g, ' ') // Mantener acentos
        .split(/\s+/)
        .filter(palabra => {
          // Filtros de calidad
          if (palabra.length < 4) return false; // Muy corta
          if (palabra.length > 25) return false; // Muy larga
          if (/^\d+$/.test(palabra)) return false; // Solo números
          if (stopwords.has(palabra)) return false; // Stopwords
          if (/^[a-z]{1,2}$/.test(palabra)) return false; // Letras sueltas
          
          return true;
        });
      
      // Contar frecuencias
      palabras.forEach(palabra => {
        frecuenciaPalabras.set(palabra, (frecuenciaPalabras.get(palabra) || 0) + 1);
      });
    });

    // Filtrar palabras que aparecen muy pocas veces (menos de 3)
    const palabrasFiltradas = Array.from(frecuenciaPalabras.entries())
      .filter(([palabra, frecuencia]) => frecuencia >= 3)
      .sort((a, b) => b[1] - a[1]) // Ordenar por frecuencia descendente
      .slice(0, limite)
      .map(([palabra]) => palabra);

    console.log(`📊 Keywords extraídas: ${palabrasFiltradas.length} de ${frecuenciaPalabras.size} palabras únicas`);
    
    return palabrasFiltradas;
  }
}

export const filterService = new FilterService();
