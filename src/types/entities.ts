// ================================
// TIPOS DE DATOS DEL SISTEMA SICOP
// ================================
// Basado en el análisis integral de datos de licitaciones públicas
// Estructura normalizada que refleja el flujo completo del proceso

// ================================
// TABLAS MAESTRAS (CATÁLOGOS)
// ================================

export interface InstitucionRegistrada {
  codigoInstitucion: string;
  nombreInstitucion: string;
  siglas?: string;
  sectorGobierno?: string;
}

export interface Proveedor {
  idProveedor: string;
  nombreProveedor: string;
  tipoProveedor?: string;
  telefono?: string;
  email?: string;
  estadoHabilitacion?: string;
}

export interface ProcedimientoAdjudicacion {
  codigoProcedimiento: string;
  descripcionProcedimiento: string;
}

export interface ProcedimientoADM {
  codigoProcedimientoADM: string;
  descripcionProcedimientoADM: string;
}

export interface Sistema {
  codigoSistema: string;
  nombreSistema: string;
  descripcionSistema?: string;
}

export interface SistemaEvaluacionOferta {
  codigoSistemaEval: string;
  descripcionSistemaEval: string;
}

// ================================
// TABLAS DE PROCESOS LICITATORIOS
// ================================

export interface DetalleCartel {
  numeroCartel: string;
  codigoInstitucion: string;
  nombreCartel: string;
  descripcionCartel?: string;
  codigoProcedimiento: string;
  codigoSistema?: string;
  codigoSistemaEvaluacion?: string;
  presupuestoOficial?: number;
  fechaPublicacion?: Date;
  fechaCierre?: Date;
  estadoCartel?: string;
}

export interface DetalleLineaCartel {
  numeroCartel: string;
  numeroLinea: number;
  descripcionLinea: string;
  unidadMedida?: string;
  cantidadRequerida?: number;
  presupuestoLinea?: number;
  numeroPartida?: number;
  tipoMoneda?: string;
  tipoCambioCRC?: number;
  tipoCambioDolar?: number;
  codigoIdentificacion?: string;
  montoReservado?: number;
}

export interface FechaPorEtapa {
  numeroCartel: string;
  fechaPublicacion?: Date;
  fechaAperturaOfertas?: Date;
  fechaAdjudicacion?: Date;
  fechaFirmaContrato?: Date;
}

// ================================
// TABLAS DE PARTICIPACIÓN
// ================================

export interface Oferta {
  idOferta?: string;
  numeroCartel: string;
  idProveedor: string;
  fechaOferta?: Date;
  montoOferta?: number;
  estadoOferta?: string;
  cantidadLineasOfertadas?: number;
  numeroOferta?: string;
  tipoMoneda?: string;
}

export interface LineaOfertada {
  numeroCartel: string;
  numeroLinea: number;
  idProveedor: string;
  idOferta?: string;
  precioUnitarioOfertado: number;
  cantidadOfertada?: number;
  montoOfertadoLinea?: number;
  numeroOferta?: string;
  tipoMoneda?: string;
  codigoProducto?: string;
}

export interface LineaRecibida {
  numeroCartel: string;
  numeroLinea: number;
  cantidadOfertasRecibidas: number;
  mejorOferta?: number;
  peorOferta?: number;
  promedioOfertas?: number;
  desierta?: boolean;
  codigoProducto?: string;
}

export interface InvitacionProcedimiento {
  numeroCartel: string;
  idProveedor: string;
  fechaInvitacion?: Date;
  estadoInvitacion?: string;
}

// ================================
// TABLAS DE ADJUDICACIÓN
// ================================

export interface LineaAdjudicada {
  numeroCartel: string;
  numeroLinea: number;
  idProveedorAdjudicado: string;
  precioAdjudicado: number;
  cantidadAdjudicada: number;
  montoLineaAdjudicada?: number;
  idOfertaGanadora?: string;
  tipoMoneda?: string;
  tipoCambioCRC?: number;
  tipoCambioDolar?: number;
  descuento?: number;
  iva?: number;
  otrosImpuestos?: number;
  acarreos?: number;
  numeroActo?: string;
}

export interface AdjudicacionFirme {
  numeroCartel: string;
  fechaAdjudicacionFirme: Date;
  montoTotalAdjudicado: number;
  idProveedorAdjudicadoPrincipal?: string;
  numeroActa?: string;
  estadoAdjudicacion?: string;
  numeroActo?: string;
  permiteRecursos?: string;
  desierto?: string;
  fechaRevision?: Date;
}

// ================================
// TABLAS DE CONTRATOS
// ================================

export interface Contrato {
  idContrato: string;
  numeroCartel?: string;
  idProveedor: string;
  codigoInstitucion: string;
  fechaFirma: Date;
  montoContrato: number;
  plazoContrato?: number;
  objetoContrato?: string;
  modalidadContratacion?: string;
  codigoProcedimiento?: string;
  codigoProcedimientoADM?: string;
  estadoContrato?: string;
  secuencia?: number;
  tipoContrato?: string;
  tipoModificacion?: string;
  fechaNotificacion?: Date;
  tipoAutorizacion?: string;
  tipoDisminucion?: string;
  vigencia?: string;
  tipoMoneda?: string;
  fechaInicioSuspension?: Date;
  fechaReinicioContrato?: Date;
  plazoSuspension?: string;
  fechaModificacion?: Date;
  fechaInicioProrroga?: Date;
  fechaFinProrroga?: Date;
  numeroContratoWeb?: string;
}

export interface LineaContratada {
  idContrato: string;
  numeroCartel: string;
  numeroLinea: number;
  cantidadAdjudicada: number;
  precioAdjudicado: number;
  montoLineaContratada: number;
  numeroLineaContrato?: string;
  cantidad?: number;
  precioUnitario?: number;
  descripcionProducto?: string;
  descuento?: number;
  iva?: number;
  otrosImpuestos?: number;
  acarreos?: number;
  tipoMoneda?: string;
  tipoCambioCRC?: number;
  tipoCambioDolar?: number;
  montoTotal?: number;
  cantidadAumentada?: number;
  cantidadDisminuida?: number;
  montoAumentado?: number;
  montoDisminuido?: number;
}

// ================================
// TABLAS DE EJECUCIÓN
// ================================

export interface OrdenPedido {
  idOrden: string;
  idContrato: string;
  fechaOrden: Date;
  cantidadOrdenada?: number;
  montoOrden?: number;
  descripcionOrden?: string;
}

export interface Recepcion {
  idRecepcion: string;
  idContrato?: string;
  idOrden?: string;
  fechaRecepcion: Date;
  cantidadRecibida?: number;
  observacionesRecepcion?: string;
  conformeEntrega?: boolean;
}

export interface ReajustePrecio {
  idReajuste: string;
  idContrato: string;
  fechaReajuste: Date;
  porcentajeReajuste?: number;
  montoReajuste?: number;
  nuevoMontoContrato?: number;
  motivoReajuste?: string;
}

// ================================
// TABLAS AUXILIARES
// ================================

export interface Garantia {
  idGarantia: string;
  numeroCartel?: string;
  idContrato?: string;
  idProveedor: string;
  tipoGarantia: 'Oferta' | 'Cumplimiento' | 'Otro';
  montoGarantia: number;
  emisorGarantia?: string;
  fechaInicio?: Date;
  fechaVencimiento?: Date;
}

export interface RecursoObjecion {
  idRecurso: string;
  numeroCartel: string;
  idProveedor: string;
  fechaPresentacion: Date;
  estadoRecurso: 'Pendiente' | 'Resuelto' | 'En proceso';
  resultadoRecurso?: 'Acogido' | 'Rechazado' | 'Parcialmente acogido';
  detalleResultado?: string;
  motivoRecurso?: string;
}

export interface FuncionarioInhibicion {
  idInhibicion?: string;
  numeroCartel: string;
  idFuncionario?: string;
  nombreFuncionario: string;
  cargoFuncionario?: string;
  motivoInhibicion?: string;
  fechaInhibicion?: Date;
}

export interface SancionProveedor {
  idSancion: string;
  idProveedor: string;
  tipoSancion: string;
  fechaInicioSancion: Date;
  fechaFinSancion?: Date;
  motivoSancion?: string;
  montoMulta?: number;
  estadoSancion?: string;
}

export interface Remate {
  numeroRemate: string;
  numeroCartel?: string;
  fechaRemate: Date;
  resultadoRemate?: string;
  participantesRemate?: number;
  mejorOfertaFinal?: number;
  proveedorGanador?: string;
}

// ================================
// TIPOS PARA ANÁLISIS Y CONSULTAS
// ================================

export interface FiltroBusqueda {
  institucion?: string[];
  proveedor?: string[];
  keywords?: string[];
  fechaDesde?: Date;
  fechaHasta?: Date;
  montoMinimo?: number;
  montoMaximo?: number;
  incluirSinPresupuesto?: boolean;
  procedimiento?: string[];
  sistema?: string[];
  estadoCartel?: string[];
  soloAdjudicados?: boolean;
  sector?: string[];
}

export interface ResultadoBusqueda {
  carteles: DetalleCartel[];
  contratos: Contrato[];
  total: number;
  estadisticas: EstadisticaBusqueda;
}

export interface EstadisticaBusqueda {
  totalCarteles: number;
  totalContratos: number;
  montoTotal: number;
  promedioOfertas: number;
  institucionesMasActivas: { institucion: string; cantidad: number }[];
  proveedoresMasActivos: { proveedor: string; cantidad: number }[];
}

export interface AnalisisCompetencia {
  proveedor: string;
  competidores: {
    id: string;
    nombre: string;
    contractosGanados: number;
    montoTotal: number;
    marketShare: number;
  }[];
  sectoresActividad: {
    sector: string;
    participacion: number;
    exito: number;
  }[];
}

export interface HistorialPrecio {
  producto: string;
  precios: {
    fecha: Date;
    precio: number;
    proveedor: string;
    institucion: string;
    numeroCartel: string;
  }[];
  tendencia: 'Subida' | 'Bajada' | 'Estable';
  precioPromedio: number;
  precioMinimo: number;
  precioMaximo: number;
}

// ================================
// TIPOS PARA RELACIONES Y ÍNDICES
// ================================

export interface RelacionTabla {
  tablaOrigen: string;
  campoOrigen: string;
  tablaDestino: string;
  campoDestino: string;
  tipo: 'uno-a-uno' | 'uno-a-muchos' | 'muchos-a-muchos';
}

export interface IndiceTabla {
  tabla: string;
  campos: string[];
  tipo: 'primario' | 'foraneo' | 'busqueda';
  nombre: string;
}

// ================================
// CONFIGURACIÓN DE DATOS
// ================================

export interface ConfiguracionCSV {
  archivo: string;
  separador: string;
  encoding: string;
  tieneEncabezados: boolean;
  mapeoColumnas: Record<string, string>;
}

export interface ConfiguracionCarga {
  rutaCarpetaCSV: string;
  archivos: ConfiguracionCSV[];
  validarIntegridad: boolean;
  crearIndices: boolean;
}
