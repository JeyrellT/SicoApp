// ================================
// TIPOS DE REPORTES ANALÍTICOS
// ================================
// Estructuras compartidas para generar reportes ejecutivos y métricas avanzadas

import { Proveedor } from './entities';

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

export interface ReporteEjecutivoParametros {
  idProveedor?: string;
  periodo?: { inicio: Date; fin: Date };
  sectores?: string[];
  competidores?: string[];
  incluirOportunidades?: boolean;
}
