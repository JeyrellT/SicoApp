/**
 * HeaderNormalizationService - Normaliza los headers de los archivos CSV
 * Convierte los nombres reales de columnas a los nombres esperados por DataManager
 */

/**
 * Mapeo completo de headers basado en los archivos CSV reales de SICOP
 * Incluye todas las variantes encontradas en los archivos
 */
const HEADER_MAPPINGS: Record<string, Record<string, string>> = {
  // ================================
  // PROVEEDORES
  // ================================
  Proveedores: {
    // Headers del archivo Proveedores_unido.csv (con y sin acentos)
    'cédula proveedor': 'idProveedor',
    'cedula proveedor': 'idProveedor',
    'cédula_proveedor': 'idProveedor',
    'cedula_proveedor': 'idProveedor',
    'nombre proveedor': 'nombreProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'tipo proveedor': 'tipoProveedor',
    'tipo_proveedor': 'tipoProveedor',
    'tamaño proveedor': 'tamanoProveedor',
    'tamano proveedor': 'tamanoProveedor',
    'tamaño_proveedor': 'tamanoProveedor',
    'tamano_proveedor': 'tamanoProveedor',
    'codigo postal': 'codigoPostal',
    'codigo_postal': 'codigoPostal',
    'código postal': 'codigoPostal',
    'provincia': 'provincia',
    'canton': 'canton',
    'cantón': 'canton',
    'distrito': 'distrito',
    'cedula': 'idProveedor',
    'nombre': 'nombreProveedor'
  },

  Proveedores_unido: {
    'cédula proveedor': 'idProveedor',
    'cedula proveedor': 'idProveedor',
    'cédula_proveedor': 'idProveedor',
    'cedula_proveedor': 'idProveedor',
    'nombre proveedor': 'nombreProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'tipo proveedor': 'tipoProveedor',
    'tipo_proveedor': 'tipoProveedor',
    'tamaño proveedor': 'tamanoProveedor',
    'tamano proveedor': 'tamanoProveedor',
    'tamaño_proveedor': 'tamanoProveedor',
    'tamano_proveedor': 'tamanoProveedor',
    'codigo postal': 'codigoPostal',
    'codigo_postal': 'codigoPostal',
    'código postal': 'codigoPostal',
    'provincia': 'provincia',
    'canton': 'canton',
    'cantón': 'canton',
    'distrito': 'distrito',
    'cedula': 'idProveedor',
    'nombre': 'nombreProveedor'
  },

  // ================================
  // INSTITUCIONES REGISTRADAS
  // ================================
  InstitucionesRegistradas: {
    'cedula': 'codigoInstitucion',
    'nombre_institucion': 'nombreInstitucion',
    'zona_geo_inst': 'zonaGeografica',
    'fecha_ingreso': 'fechaIngreso',
    'fecha_mod': 'fechaModificacion'
  },

  // ================================
  // LINEAS ADJUDICADAS
  // ================================
  LineasAdjudicadas: {
    'nro_sicop': 'numeroCartel',
    'nro_oferta': 'numeroOferta',
    'codigo_producto': 'codigoProducto',
    'nro_linea': 'numeroLinea',
    'nro_acto': 'numeroActo',
    'cedula_proveedor': 'idProveedorAdjudicado',
    'cantidad_adjudicada': 'cantidadAdjudicada',
    'precio_unitario_adjudicado': 'precioUnitarioAdjudicado',
    'tipo_moneda': 'tipoMoneda',
    'descuento': 'descuento',
    'iva': 'iva',
    'otros_impuestos': 'otrosImpuestos',
    'acarreos': 'acarreos',
    'tipo_cambio_crc': 'tipoCambioCRC',
    'tipo_cambio_dolar': 'tipoCambioDolar'
  },

  // ================================
  // DETALLE LINEA CARTEL
  // ================================
  DetalleLineaCartel: {
    'nro_sicop': 'numeroCartel',
    'numero_linea': 'numeroLinea',
    'numero_partida': 'numeroPartida',
    'cantidad_solicitada': 'cantidadRequerida',
    'precio_unitario_estimado': 'presupuestoLinea',
    'tipo_moneda': 'tipoMoneda',
    'tipo_cambio_crc': 'tipoCambioCRC',
    'tipo_cambio_dolar': 'tipoCambioDolar',
    'codigo_identificacion': 'codigoIdentificacion',
    'monto_reservado': 'montoReservado',
    'desc_linea': 'descripcionLinea'
  },

  // ================================
  // PROCEDIMIENTO ADJUDICACION
  // ================================
  ProcedimientoAdjudicacion: {
    'cedula': 'codigoInstitucion',
    'institucion': 'nombreInstitucion',
    'ano': 'anio',
    'numero_procedimiento': 'codigoProcedimiento',
    'descr_procedimiento': 'descripcionProcedimiento',
    'linea': 'numeroLinea',
    'prod_id': 'productoId',
    'descr_bien_servicio': 'descripcionBienServicio',
    'cantidad': 'cantidad',
    'unidad_medida': 'unidadMedida',
    'monto_unitario': 'montoUnitario',
    'moneda_precio_est': 'monedaPrecioEstimado',
    'moneda_adjudicada': 'monedaAdjudicada',
    'monto_adju_linea': 'montoAdjudicadoLinea',
    'monto_adju_linea_crc': 'montoAdjudicadoLineaCRC',
    'monto_adju_linea_usd': 'montoAdjudicadoLineaUSD',
    'fecha_adjud_firme': 'fechaAdjudicacionFirme',
    'fecha_sol_contra': 'fechaSolicitudContrato',
    'cedula_proveedor': 'idProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'perfil_prov': 'perfilProveedor',
    'cedula_representante': 'cedulaRepresentante',
    'representante': 'nombreRepresentante',
    'objeto_gasto': 'objetoGasto',
    'nro_sicop': 'numeroCartel',
    'tipo_procedimiento': 'tipoProcedimiento',
    'modalidad_procedimiento': 'modalidadProcedimiento',
    'fecha_rev': 'fechaRevision',
    'fecha_sol_contra_cl': 'fechaSolicitudContratoClean',
    'prod_id_cl': 'productoIdClean'
  },

  // ================================
  // CONTRATOS
  // ================================
  Contratos: {
    'nro_contrato': 'idContrato',
    'secuencia': 'secuencia',
    'numero_procedimiento': 'codigoProcedimiento',
    'cedula_proveedor': 'idProveedor',
    'nro_sicop': 'numeroCartel',
    'cedula_institucion': 'codigoInstitucion',
    'tipo_contrato': 'tipoContrato',
    'tipo_modificacion': 'tipoModificacion',
    'fecha_notificacion': 'fechaNotificacion',
    'fecha_elaboracion': 'fechaFirma',
    'tipo_autorizacion': 'tipoAutorizacion',
    'tipo_disminucion': 'tipoDisminucion',
    'vigencia': 'vigencia',
    'moneda': 'tipoMoneda',
    'tipo_moneda': 'tipoMoneda',
    'fecha_ini_susp': 'fechaInicioSuspension',
    'fecha_reini_cont': 'fechaReinicioContrato',
    'plazo_susp': 'plazoSuspension',
    'fecha_modificacion': 'fechaModificacion',
    'fecha_ini_prorr': 'fechaInicioProrroga',
    'fecha_fin_prorr': 'fechaFinProrroga',
    'nro_contrato_web': 'numeroContratoWeb'
  },

  // ================================
  // ADJUDICACIONES FIRME
  // ================================
  AdjudicacionesFirme: {
    'nro_sicop': 'numeroCartel',
    'nro_acto': 'numeroActo',
    'fecha_adj_firme': 'fechaAdjudicacionFirme',
    'permite_recursos': 'permiteRecursos',
    'desierto': 'desierto',
    'fecha_rev': 'fechaRevision'
  },

  // ================================
  // OFERTAS
  // ================================
  Ofertas: {
    'nro_sicop': 'numeroCartel',
    'nro_oferta': 'numeroOferta',
    'cedula_proveedor': 'idProveedor',
    'fecha_presenta_oferta': 'fechaOferta',
    'id_consorcio': 'idConsorcio',
    'tipo_moneda': 'tipoMoneda'
  },

  // ================================
  // LINEAS OFERTADAS
  // ================================
  LineasOfertadas: {
    'nro_sicop': 'numeroCartel',
    'nro_oferta': 'numeroOferta',
    'codigo_producto': 'codigoProducto',
    'nro_linea': 'numeroLinea',
    'cedula_proveedor': 'idProveedor',
    'cantidad_ofertada': 'cantidadOfertada',
    'precio_unitario': 'precioUnitario',
    'tipo_moneda': 'tipoMoneda'
  },

  // ================================
  // LINEAS RECIBIDAS
  // ================================
  LineasRecibidas: {
    'nro_sicop': 'numeroCartel',
    'nro_linea': 'numeroLinea',
    'codigo_producto': 'codigoProducto',
    'cantidad_recibida': 'cantidadRecibida'
  },

  // ================================
  // LINEAS CONTRATADAS
  // ================================
  LineasContratadas: {
    'nro_sicop': 'numeroCartel',
    'nro_contrato': 'idContrato',
  'nro_linea': 'numeroLinea',
  'nro_linea_contrato': 'numeroLineaContrato',
  'nro_linea_cartel': 'numeroLineaCartel',
    'codigo_producto': 'codigoProducto',
    'cantidad': 'cantidad',
    'cantidad_contratada': 'cantidad',
    'cantidad_adjudicada': 'cantidadAdjudicada',
    'cantidad_aumentada': 'cantidadAumentada',
    'cantidad_disminuida': 'cantidadDisminuida',
    'precio_unitario': 'precioUnitario',
    'precio_unitario_adjudicado': 'precioAdjudicado',
    'monto_total': 'montoTotal',
    'monto_linea_contratada': 'montoLineaContratada',
    'monto_aumentado': 'montoAumentado',
    'monto_disminuido': 'montoDisminuido',
    'desc_producto': 'descripcionProducto',
    'tipo_moneda': 'tipoMoneda',
    'tipo_cambio_crc': 'tipoCambioCRC',
    'tipo_cambio_dolar': 'tipoCambioDolar',
    'descuento': 'descuento',
    'iva': 'iva',
    'otros_impuestos': 'otrosImpuestos',
    'acarreos': 'acarreos'
  },

  // ================================
  // ORDEN PEDIDO
  // ================================
  OrdenPedido: {
    'nro_orden': 'idOrden',
    'nro_contrato': 'idContrato',
    'numero_procedimiento': 'codigoProcedimiento',
    'fecha_elaboracion': 'fechaOrden',
    'fecha_elaboracion_orden': 'fechaOrden',
    'nro_sicop': 'numeroCartel',
    'cedula_proveedor': 'idProveedor',
    'cedulaproveedor': 'idProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'desc_procedimiento': 'descripcionOrden',
    'total_orden': 'montoOrden',
    'totalestimado': 'montoOrdenEstimado',
    'moneda_orden': 'monedaOrden',
    'estado_orden': 'estadoOrden',
    'fecha_notificacion_orden': 'fechaNotificacionOrden',
    'fecha_prov_recibe_orden': 'fechaProveedorRecibeOrden',
    'fecha_proveedor_recibe_orden': 'fechaProveedorRecibeOrden',
    'fecha_rec_pedido': 'fechaRecepcionOrden',
    'linea_ord_pedido': 'lineaOrdPedido',
    'linea_orden_pedido': 'lineaOrdPedido'
  },

  // ================================
  // RECEPCIONES
  // ================================
  Recepciones: {
    'nro_contrato': 'idContrato',
    'nro_recepcion': 'idRecepcion',
    'fecha_recepcion': 'fechaRecepcion',
    'fecha_recep_definitiva': 'fechaRecepcion',
    'nro_recep_definitiva': 'idRecepcion',
    'nro_orden': 'idOrden',
    'nro_sicop': 'numeroCartel',
    'cantidad_recibida': 'cantidadRecibida'
  },

  // ================================
  // INVITACION PROCEDIMIENTO
  // ================================
  InvitacionProcedimiento: {
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimiento',
    'cedula_proveedor': 'idProveedor',
    'fecha_invitacion': 'fechaInvitacion'
  },

  // ================================
  // OTROS ARCHIVOS
  // ================================
  DetalleCarteles: {
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimiento',
    'nro_procedimiento': 'codigoProcedimiento',
    'cedula_institucion': 'codigoInstitucion',
    'nombre_cartel': 'nombreCartel',
    'cartel_nm': 'nombreCartel',
    'descripcion': 'descripcionCartel',
    'fecha_publicacion': 'fechaPublicacion',
    'fecha_cierre': 'fechaCierre',
    'fechah_apertura': 'fechaAperturaOfertas',
    'presupuesto': 'presupuestoOficial',
    'monto_est': 'presupuestoOficial'
  },

  FechaPorEtapas: {
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimiento',
    'fecha_publicacion': 'fechaPublicacion',
    'fecha_apertura': 'fechaAperturaOfertas',
    'fecha_adjudicacion': 'fechaAdjudicacion',
    'fecha_elaboracion_contrato': 'fechaFirmaContrato'
  },

  Garantias: {
    'nro_sicop': 'numeroCartel',
    'nro_contrato': 'idContrato',
    'cedula_proveedor': 'idProveedor',
    'cedulaproveedor': 'idProveedor',
    'tipo_garantia': 'tipoGarantia',
    'monto': 'monto',
    'monto_garantia': 'monto',
    'fecha_inicio': 'fechaInicio',
    'fecha_vencimiento': 'fechaVencimiento'
  },

  RecursosObjecion: {
    'nro_sicop': 'numeroCartel',
    'nro_recurso': 'numeroRecurso',
    'cedula_proveedor': 'idProveedor',
    'cedulaproveedor': 'idProveedor',
    'fecha_presentacion': 'fechaPresentacion',
    'motivo': 'motivoRecurso',
    'resultado': 'detalleResultado'
  },

  SancionProveedores: {
    'cedula_proveedor': 'idProveedor',
    'cedulaproveedor': 'idProveedor',
    'tipo_sancion': 'tipoSancion',
    'motivo': 'motivoSancion',
    'fecha_inicio': 'fechaInicioSancion',
    'inicio_sancion': 'fechaInicioSancion',
    'fecha_fin': 'fechaFinSancion',
    'final_sancion': 'fechaFinSancion'
  },

  FuncionariosInhibicion: {
    'cedula_institucion': 'codigoInstitucion',
    'ced_institucion': 'codigoInstitucion',
    'cedula_funcionario': 'cedulaFuncionario',
    'ced_funcionario': 'cedulaFuncionario',
    'nombre_funcionario': 'nombreFuncionario',
    'nom_funcionario': 'nombreFuncionario',
    'fecha_inicio': 'fechaInicio',
    'fecha_fin': 'fechaFin'
  },

  ReajustePrecios: {
    'nro_contrato': 'idContrato',
    'nro_reajuste': 'numeroReajuste',
    'numero_reajuste': 'numeroReajuste',
    'fecha_reajuste': 'fechaReajuste',
    'porcentaje': 'porcentaje',
    'porc_incr_ult_rj': 'porcentajeIncremento',
    'monto': 'monto'
  },

  Sistemas: {
    'codigo_sistema': 'codigoSistema',
    'nombre_sistema': 'nombreSistema',
    'nro_sicop': 'numeroCartel',
    'numero_linea': 'numeroLinea',
    'numero_partida': 'numeroPartida',
    'desc_linea': 'descripcionLinea',
    'cedula_institucion': 'codigoInstitucion',
    'nro_procedimiento': 'codigoProcedimiento',
    'tipo_procedimiento': 'tipoProcedimiento',
    'fecha_publicacion': 'fechaPublicacion'
  },

  SistemaEvaluacionOfertas: {
    'nro_sicop': 'numeroCartel',
    'tipo_evaluacion': 'tipoEvaluacion',
    'factor_eval': 'tipoEvaluacion',
    'eval_item_seqno': 'secuenciaEvaluacion',
    'porc_eval': 'porcentajeEvaluacion',
    'descripcion': 'descripcion'
  },

  ProcedimientoADM: {
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimientoADM',
    'cedula_institucion': 'codigoInstitucion',
    'descripcion': 'descripcionProcedimientoADM',
    'numero_pa': 'numeroPA'
  },

  Remates: {
    'nro_remate': 'numeroRemate',
    'descripcion': 'descripcion',
    'fecha_remate': 'fechaRemate'
  }
};

class HeaderNormalizationService {
  /**
   * Normaliza los headers de un registro según el tipo de archivo
   */
  /**
   * Normaliza los headers de un registro según el tipo de archivo
   * ADEMÁS conserva los campos originales para compatibilidad con datos antiguos en caché
   */
  normalizeRecord(record: any, fileType: string): any {
    const mapping = HEADER_MAPPINGS[fileType];
    if (!mapping) {
      // Si no hay mapeo específico, retornar el registro sin cambios
      console.warn(`⚠️ [HeaderNormalization] No hay mapeo de headers para tipo: "${fileType}". Tipos disponibles:`, Object.keys(HEADER_MAPPINGS));
      return record;
    }

    const normalized: any = {};
    let camposNormalizados = 0;
    
    for (const [key, value] of Object.entries(record)) {
      // CONSERVAR el campo original (para compatibilidad con caché antiguo)
      normalized[key] = value;
      
      // Convertir el key a minúsculas para comparación
      const keyLower = key.toLowerCase().trim();
      
      // Buscar el mapeo correspondiente
      const normalizedKey = mapping[keyLower];
      
      // Si hay un mapeo Y es diferente del original, agregar TAMBIÉN el normalizado
      if (normalizedKey && normalizedKey !== key) {
        camposNormalizados++;
        normalized[normalizedKey] = value;
        
        if (key.toLowerCase().includes('desc') || key.toLowerCase().includes('linea')) {
          console.log(`🔄 [HeaderNormalization] "${key}" → "${normalizedKey}" (tipo: ${fileType}, conservando ambos)`);
        }
      }
    }

    if (camposNormalizados > 0) {
      console.log(`✅ [HeaderNormalization] Normalizados ${camposNormalizados} campos para tipo "${fileType}" (conservando originales)`);
    }

    return normalized;
  }

  /**
   * Normaliza un array completo de registros
   */
  normalizeRecords(records: any[], fileType: string): any[] {
    return records.map(record => this.normalizeRecord(record, fileType));
  }

  /**
   * Obtiene el mapeo de headers para un tipo de archivo específico
   */
  getMapping(fileType: string): Record<string, string> | undefined {
    return HEADER_MAPPINGS[fileType];
  }

  /**
   * Verifica si un tipo de archivo tiene mapeo definido
   */
  hasMapping(fileType: string): boolean {
    return fileType in HEADER_MAPPINGS;
  }

  /**
   * Lista todos los tipos de archivo con mapeo disponible
   */
  getAvailableTypes(): string[] {
    return Object.keys(HEADER_MAPPINGS);
  }
}

export const headerNormalizationService = new HeaderNormalizationService();
export default headerNormalizationService;
