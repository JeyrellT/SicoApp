// ================================
// SERVICIO DE REPORTES Y ANÁLISIS
// ================================
// Delegado del DataManager para mantener compatibilidad con el resto de la app

import { dataManager } from '../data/DataManager';
import {
  ReporteEjecutivo,
  ReporteEjecutivoParametros
} from '../types/reports';

export class ReportService {
  generarReporteEjecutivo(parametros: ReporteEjecutivoParametros): ReporteEjecutivo {
    return dataManager.generarReporteEjecutivo(parametros);
  }

  analizarPosicionCompetitiva(idProveedor: string, periodo?: { inicio: Date; fin: Date }): any {
    return dataManager.analizarPosicionCompetitiva(idProveedor, periodo);
  }

  analizarTendenciasPrecios(sectores: string[], periodo?: { inicio: Date; fin: Date }): any {
    return dataManager.analizarTendenciasPrecios(sectores, periodo);
  }
}

export const reportService = new ReportService();
