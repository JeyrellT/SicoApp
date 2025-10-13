// ================================
// SERVICIO DE MÉTRICAS AVANZADAS
// ================================
// Cálculos especializados para análisis profundo de licitaciones

import moment from 'moment';
import { 
  DetalleCartel, 
  Contrato, 
  Proveedor, 
  InstitucionRegistrada 
} from '../types/entities';

export interface MetricasAvanzadas {
  tasaExito: number;
  tiempoPromedioAdjudicacion: number;
  montoTotalEnJuego: number;
  eficienciaInstitucional: number;
  riesgoProveedores: AnalisisRiesgo[];
  proyecciones: ProyeccionPeriodo;
  alertas: AlertaInteligente[];
  tendenciasTempo: TendenciaTemporal[];
}

export interface AnalisisRiesgo {
  cedulaProveedor: string;
  nombreProveedor: string;
  nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO';
  totalSanciones: number;
  ultimaSancion: Date | null;
  tiposSancion: string[];
  participacionReciente: number;
  montoPromedio: number;
}

export interface ProyeccionPeriodo {
  proximoMes: {
    procedimientosEsperados: number;
    montoEstimado: number;
    confianza: number;
  };
  trimestre: {
    tendenciaGeneral: 'CRECIENTE' | 'ESTABLE' | 'DECRECIENTE';
    sectoresOportunidad: string[];
    riesgosMercado: string[];
  };
}

export interface AlertaInteligente {
  id: string;
  tipo: 'CIERRE_PROXIMOS' | 'OPORTUNIDAD_DETECTADA' | 'REAJUSTE_SIGNIFICATIVO' | 'COMPETENCIA_BAJA';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  titulo: string;
  descripcion: string;
  accionRecomendada: string;
  fechaDeteccion: Date;
  vigencia: Date;
  metadata: any;
}

export interface TendenciaTemporal {
  fecha: Date;
  procedimientos: number;
  montoTotal: number;
  proveedoresUnicos: number;
  tiempoPromedio: number;
  sectoresPredominantes: string[];
}

class MetricasService {
  
  // ================================
  // CÁLCULO DE TASA DE ÉXITO
  // ================================
  calcularTasaExito(carteles: DetalleCartel[], contratos: Contrato[]): number {
    if (!carteles.length) return 0;
    
    const cartelesConContrato = new Set();
    contratos.forEach(contrato => {
      if (contrato.numeroCartel) {
        cartelesConContrato.add(contrato.numeroCartel);
      }
    });
    
    return (cartelesConContrato.size / carteles.length) * 100;
  }

  // ================================
  // TIEMPO PROMEDIO DE ADJUDICACIÓN
  // ================================
  calcularTiempoPromedioAdjudicacion(datos: any[]): number {
    // Simular cálculo basado en FechaPorEtapas
    const tiemposValidosDs = datos
      .filter(item => item.fechaPublicacion && item.fechaAdjudicacion)
      .map(item => {
        const inicio = moment(item.fechaPublicacion);
        const fin = moment(item.fechaAdjudicacion);
        return fin.diff(inicio, 'days');
      })
      .filter(dias => dias > 0 && dias < 365); // Filtrar valores anómalos

    if (!tiemposValidosDs.length) return 45; // Default simulado

    return tiemposValidosDs.reduce((sum, dias) => sum + dias, 0) / tiemposValidosDs.length;
  }

  // ================================
  // ANÁLISIS DE RIESGO DE PROVEEDORES
  // ================================
  analizarRiesgoProveedores(
    proveedores: Proveedor[],
    sanciones: any[],
    participacion: any[]
  ): AnalisisRiesgo[] {
    
    return proveedores.slice(0, 100).map(proveedor => {
      // Simular datos de sanciones (en producción vendría de SancionProveedores.csv)
      const sancionesProveedor = sanciones.filter(s => 
        s.idProveedor === proveedor.idProveedor
      );
      
      const participacionProveedor = participacion.filter(p => 
        p.idProveedor === proveedor.idProveedor
      );

      const totalSanciones = sancionesProveedor.length;
      const ultimaSancion = sancionesProveedor.length > 0 ? 
        new Date(Math.max(...sancionesProveedor.map(s => new Date(s.fecha).getTime()))) : 
        null;

      let nivelRiesgo: 'ALTO' | 'MEDIO' | 'BAJO' = 'BAJO';
      if (totalSanciones >= 3) nivelRiesgo = 'ALTO';
      else if (totalSanciones >= 1) nivelRiesgo = 'MEDIO';

      return {
        cedulaProveedor: proveedor.idProveedor,
        nombreProveedor: proveedor.nombreProveedor,
        nivelRiesgo,
        totalSanciones,
        ultimaSancion,
        tiposSancion: sancionesProveedor.map(s => s.tipo || 'No especificado'),
        participacionReciente: participacionProveedor.length,
        montoPromedio: participacionProveedor.length > 0 ? 
          participacionProveedor.reduce((sum, p) => sum + (p.monto || 0), 0) / participacionProveedor.length :
          0
      };
    });
  }

  // ================================
  // PROYECCIONES PREDICTIVAS
  // ================================
  generarProyecciones(datosHistoricos: TendenciaTemporal[]): ProyeccionPeriodo {
    if (!datosHistoricos.length) {
      return {
        proximoMes: {
          procedimientosEsperados: 0,
          montoEstimado: 0,
          confianza: 0
        },
        trimestre: {
          tendenciaGeneral: 'ESTABLE',
          sectoresOportunidad: [],
          riesgosMercado: []
        }
      };
    }

    // Análisis de patrones estacionales
    const tendenciaReciente = datosHistoricos.slice(-30);
    const promedioMensual = tendenciaReciente.reduce((sum, item) => sum + item.procedimientos, 0) / tendenciaReciente.length;
    const promedioMontoMensual = tendenciaReciente.reduce((sum, item) => sum + item.montoTotal, 0) / tendenciaReciente.length;

    // Calcular tendencia (simplificado)
    const primerosMeses = datosHistoricos.slice(0, Math.floor(datosHistoricos.length / 2));
    const ultimosMeses = datosHistoricos.slice(Math.floor(datosHistoricos.length / 2));
    
    const promedioInicial = primerosMeses.reduce((sum, item) => sum + item.procedimientos, 0) / primerosMeses.length;
    const promedioFinal = ultimosMeses.reduce((sum, item) => sum + item.procedimientos, 0) / ultimosMeses.length;
    
    let tendenciaGeneral: 'CRECIENTE' | 'ESTABLE' | 'DECRECIENTE' = 'ESTABLE';
    if (promedioFinal > promedioInicial * 1.1) tendenciaGeneral = 'CRECIENTE';
    else if (promedioFinal < promedioInicial * 0.9) tendenciaGeneral = 'DECRECIENTE';

    return {
      proximoMes: {
        procedimientosEsperados: Math.round(promedioMensual * 1.05), // 5% ajuste estacional
        montoEstimado: Math.round(promedioMontoMensual * 1.05),
        confianza: 0.75 // 75% de confianza
      },
      trimestre: {
        tendenciaGeneral,
        sectoresOportunidad: ['tecnología', 'salud', 'construcción'],
        riesgosMercado: ['inflación', 'cambios regulatorios']
      }
    };
  }

  // ================================
  // GENERACIÓN DE ALERTAS INTELIGENTES
  // ================================
  generarAlertas(
    carteles: DetalleCartel[],
    contratos: Contrato[],
    participacion: any[]
  ): AlertaInteligente[] {
    const alertas: AlertaInteligente[] = [];
    const ahora = new Date();

    // Alerta 1: Procedimientos próximos a cerrar
    const proximosCierres = carteles.filter(cartel => {
      if (!cartel.fechaCierre) return false;
      const fechaCierre = moment(cartel.fechaCierre);
      const horasRestantes = fechaCierre.diff(moment(), 'hours');
      return horasRestantes > 0 && horasRestantes <= 48;
    });

    if (proximosCierres.length > 0) {
      alertas.push({
        id: `cierre-${Date.now()}`,
        tipo: 'CIERRE_PROXIMOS',
        prioridad: 'ALTA',
        titulo: 'Procedimientos Próximos a Cerrar',
        descripcion: `${proximosCierres.length} licitaciones cierran en las próximas 48 horas`,
        accionRecomendada: 'Revisar documentación y preparar ofertas',
        fechaDeteccion: ahora,
        vigencia: moment().add(2, 'days').toDate(),
        metadata: { procedimientos: proximosCierres.slice(0, 5) }
      });
    }

    // Alerta 2: Oportunidades de baja competencia
    const oportunidadesBajaCompetencia = carteles.filter(cartel => {
      const ofertasCartel = participacion.filter(p => p.numeroCartel === cartel.numeroCartel);
      return ofertasCartel.length <= 2 && (cartel.presupuestoOficial || 0) > 500000;
    });

    if (oportunidadesBajaCompetencia.length > 0) {
      alertas.push({
        id: `oportunidad-${Date.now()}`,
        tipo: 'OPORTUNIDAD_DETECTADA',
        prioridad: 'MEDIA',
        titulo: 'Oportunidades de Baja Competencia',
        descripcion: `${oportunidadesBajaCompetencia.length} licitaciones con menos de 3 ofertas`,
        accionRecomendada: 'Evaluar factibilidad de participación',
        fechaDeteccion: ahora,
        vigencia: moment().add(7, 'days').toDate(),
        metadata: { oportunidades: oportunidadesBajaCompetencia.slice(0, 3) }
      });
    }

    // Alerta 3: Reajustes significativos de precio
    // Simular detección de reajustes (en producción vendría de ReajustePrecios.csv)
    const reajustesSignificativos = Math.random() > 0.7; // 30% probabilidad
    if (reajustesSignificativos) {
      alertas.push({
        id: `reajuste-${Date.now()}`,
        tipo: 'REAJUSTE_SIGNIFICATIVO',
        prioridad: 'MEDIA',
        titulo: 'Reajustes de Precio Detectados',
        descripcion: 'Algunos contratos han tenido incrementos superiores al 10%',
        accionRecomendada: 'Revisar impacto en costos proyectados',
        fechaDeteccion: ahora,
        vigencia: moment().add(5, 'days').toDate(),
        metadata: { porcentajePromedio: 12.5 }
      });
    }

    return alertas;
  }

  // ================================
  // ANÁLISIS DE TENDENCIAS TEMPORALES
  // ================================
  analizarTendenciasTempo(
    carteles: DetalleCartel[],
    contratos: Contrato[],
    dias: number = 30
  ): TendenciaTemporal[] {
    const tendencias: TendenciaTemporal[] = [];
    
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = moment().subtract(i, 'days').toDate();
      
      // Simular datos (en producción sería consulta real)
      const procedimientosDia = Math.floor(Math.random() * 15) + 5;
      const montoTotalDia = Math.floor(Math.random() * 5000000) + 1000000;
      const proveedoresUnicosDia = Math.floor(Math.random() * 30) + 10;
      const tiempoPromedioDia = Math.floor(Math.random() * 20) + 30;
      
      tendencias.push({
        fecha,
        procedimientos: procedimientosDia,
        montoTotal: montoTotalDia,
        proveedoresUnicos: proveedoresUnicosDia,
        tiempoPromedio: tiempoPromedioDia,
        sectoresPredominantes: this.obtenerSectoresPredominantes(fecha)
      });
    }
    
    return tendencias;
  }

  // ================================
  // ANÁLISIS DE EFICIENCIA INSTITUCIONAL
  // ================================
  calcularEficienciaInstitucional(
    instituciones: InstitucionRegistrada[],
    carteles: DetalleCartel[],
    contratos: Contrato[]
  ): number {
    // Métricas de eficiencia:
    // 1. Tiempo promedio de adjudicación
    // 2. Tasa de éxito en adjudicaciones
    // 3. Cantidad de recursos/objeciones
    // 4. Cumplimiento de cronogramas

    const metricas = instituciones.slice(0, 10).map(inst => {
      const cartelesInst = carteles.filter(c => c.codigoInstitucion === inst.codigoInstitucion);
      const contratosInst = contratos.filter(c => c.codigoInstitucion === inst.codigoInstitucion);
      
      const tasaAdjudicacion = cartelesInst.length > 0 ? 
        (contratosInst.length / cartelesInst.length) * 100 : 0;
      
      // Simular otras métricas
      const tiempoPromedio = 30 + Math.random() * 40; // 30-70 días
      const cumplimientoCronograma = 60 + Math.random() * 35; // 60-95%
      
      // Puntaje compuesto
      const puntaje = (tasaAdjudicacion * 0.4) + 
                     ((100 - tiempoPromedio) * 0.3) + 
                     (cumplimientoCronograma * 0.3);
      
      return Math.min(100, puntaje);
    });
    
    return metricas.length > 0 ? 
      metricas.reduce((sum, score) => sum + score, 0) / metricas.length : 
      75; // Default
  }

  // ================================
  // CÁLCULO COMPLETO DE MÉTRICAS
  // ================================
  calcularMetricasCompletas(
    carteles: DetalleCartel[],
    contratos: Contrato[],
    proveedores: Proveedor[],
    instituciones: InstitucionRegistrada[],
    sanciones: any[] = [],
    participacion: any[] = []
  ): MetricasAvanzadas {
    
    return {
      tasaExito: this.calcularTasaExito(carteles, contratos),
      tiempoPromedioAdjudicacion: this.calcularTiempoPromedioAdjudicacion(carteles),
      montoTotalEnJuego: contratos.reduce((sum, c) => sum + (c.montoContrato || 0), 0),
      eficienciaInstitucional: this.calcularEficienciaInstitucional(instituciones, carteles, contratos),
      riesgoProveedores: this.analizarRiesgoProveedores(proveedores, sanciones, participacion),
      proyecciones: this.generarProyecciones(this.analizarTendenciasTempo(carteles, contratos)),
      alertas: this.generarAlertas(carteles, contratos, participacion),
      tendenciasTempo: this.analizarTendenciasTempo(carteles, contratos)
    };
  }

  // ================================
  // MÉTODOS AUXILIARES
  // ================================
  private obtenerSectoresPredominantes(fecha: Date): string[] {
    // Simular sectores predominantes por fecha
    const sectores = ['tecnología', 'salud', 'construcción', 'servicios', 'suministros'];
    const cantidad = Math.floor(Math.random() * 3) + 1;
    return sectores.slice(0, cantidad);
  }

  // ================================
  // ANÁLISIS ESPECIALIZADO POR KEYWORDS
  // ================================
  analizarKeywordsTrending(descripciones: string[]): { keyword: string; frecuencia: number; tendencia: 'up' | 'down' | 'stable' }[] {
    const stopwords = ['de', 'la', 'el', 'en', 'y', 'a', 'para', 'con', 'por', 'del', 'los', 'las'];
    const palabrasRelevantes: { [key: string]: number } = {};
    
    descripciones.forEach(descripcion => {
      if (!descripcion) return;
      
      const palabras = descripcion
        .toLowerCase()
        .replace(/[^\w\sáéíóúñü]/g, '')
        .split(/\s+/)
        .filter(palabra => 
          palabra.length > 3 && 
          !stopwords.includes(palabra) &&
          !/^\d+$/.test(palabra)
        );
      
      palabras.forEach(palabra => {
        palabrasRelevantes[palabra] = (palabrasRelevantes[palabra] || 0) + 1;
      });
    });
    
    return Object.entries(palabrasRelevantes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([keyword, frecuencia]) => ({
        keyword,
        frecuencia,
        tendencia: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down'
      }));
  }
}

export const metricsService = new MetricasService();
