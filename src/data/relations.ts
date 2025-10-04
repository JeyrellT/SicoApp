// ================================
// CONFIGURACIÓN DE RELACIONES ENTRE TABLAS
// ================================
// Define la estructura relacional del modelo de datos SICOP

import { RelacionTabla, IndiceTabla } from '../types/entities';

export const RELACIONES_TABLAS: RelacionTabla[] = [
  // ================================
  // RELACIONES DESDE DETALLE CARTELES (tabla central)
  // ================================
  {
    tablaOrigen: 'DetalleCarteles',
    campoOrigen: 'codigoInstitucion',
    tablaDestino: 'InstitucionesRegistradas',
    campoDestino: 'codigoInstitucion',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'DetalleCarteles',
    campoOrigen: 'codigoProcedimiento',
    tablaDestino: 'ProcedimientoAdjudicacion',
    campoDestino: 'codigoProcedimiento',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'DetalleCarteles',
    campoOrigen: 'codigoSistema',
    tablaDestino: 'Sistemas',
    campoDestino: 'codigoSistema',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'DetalleCarteles',
    campoOrigen: 'codigoSistemaEvaluacion',
    tablaDestino: 'SistemaEvaluacionOfertas',
    campoDestino: 'codigoSistemaEval',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE LÍNEAS DE CARTEL
  // ================================
  {
    tablaOrigen: 'DetalleLineaCartel',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE FECHAS POR ETAPAS
  // ================================
  {
    tablaOrigen: 'FechaPorEtapas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-uno'
  },

  // ================================
  // RELACIONES DE OFERTAS
  // ================================
  {
    tablaOrigen: 'Ofertas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Ofertas',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE LÍNEAS OFERTADAS
  // ================================
  {
    tablaOrigen: 'LineasOfertadas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'LineasOfertadas',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE LÍNEAS RECIBIDAS
  // ================================
  {
    tablaOrigen: 'LineasRecibidas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE INVITACIONES
  // ================================
  {
    tablaOrigen: 'InvitacionProcedimiento',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'InvitacionProcedimiento',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE ADJUDICACIONES
  // ================================
  {
    tablaOrigen: 'LineasAdjudicadas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'LineasAdjudicadas',
    campoOrigen: 'idProveedorAdjudicado',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'AdjudicacionesFirme',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-uno'
  },

  // ================================
  // RELACIONES DE CONTRATOS
  // ================================
  {
    tablaOrigen: 'Contratos',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Contratos',
    campoOrigen: 'codigoInstitucion',
    tablaDestino: 'InstitucionesRegistradas',
    campoDestino: 'codigoInstitucion',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Contratos',
    campoOrigen: 'codigoProcedimiento',
    tablaDestino: 'ProcedimientoAdjudicacion',
    campoDestino: 'codigoProcedimiento',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE LÍNEAS CONTRATADAS
  // ================================
  {
    tablaOrigen: 'LineasContratadas',
    campoOrigen: 'idContrato',
    tablaDestino: 'Contratos',
    campoDestino: 'idContrato',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'LineasContratadas',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE ÓRDENES Y RECEPCIONES
  // ================================
  {
    tablaOrigen: 'OrdenPedido',
    campoOrigen: 'idContrato',
    tablaDestino: 'Contratos',
    campoDestino: 'idContrato',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Recepciones',
    campoOrigen: 'idContrato',
    tablaDestino: 'Contratos',
    campoDestino: 'idContrato',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Recepciones',
    campoOrigen: 'idOrden',
    tablaDestino: 'OrdenPedido',
    campoDestino: 'idOrden',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE GARANTÍAS
  // ================================
  {
    tablaOrigen: 'Garantias',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Garantias',
    campoOrigen: 'idContrato',
    tablaDestino: 'Contratos',
    campoDestino: 'idContrato',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'Garantias',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE RECURSOS Y OBJECIONES
  // ================================
  {
    tablaOrigen: 'RecursosObjecion',
    campoOrigen: 'numeroCartel',
    tablaDestino: 'DetalleCarteles',
    campoDestino: 'numeroCartel',
    tipo: 'uno-a-muchos'
  },
  {
    tablaOrigen: 'RecursosObjecion',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE SANCIONES
  // ================================
  {
    tablaOrigen: 'SancionProveedores',
    campoOrigen: 'idProveedor',
    tablaDestino: 'Proveedores',
    campoDestino: 'idProveedor',
    tipo: 'uno-a-muchos'
  },

  // ================================
  // RELACIONES DE REAJUSTES
  // ================================
  {
    tablaOrigen: 'ReajustePrecios',
    campoOrigen: 'idContrato',
    tablaDestino: 'Contratos',
    campoDestino: 'idContrato',
    tipo: 'uno-a-muchos'
  }
];

export const INDICES_TABLAS: IndiceTabla[] = [
  // ================================
  // ÍNDICES PRIMARIOS
  // ================================
  {
    tabla: 'InstitucionesRegistradas',
    campos: ['codigoInstitucion'],
    tipo: 'primario',
    nombre: 'pk_instituciones'
  },
  {
    tabla: 'Proveedores',
    campos: ['idProveedor'],
    tipo: 'primario',
    nombre: 'pk_proveedores'
  },
  {
    tabla: 'DetalleCarteles',
    campos: ['numeroCartel'],
    tipo: 'primario',
    nombre: 'pk_carteles'
  },
  {
    tabla: 'DetalleLineaCartel',
    campos: ['numeroCartel', 'numeroLinea'],
    tipo: 'primario',
    nombre: 'pk_lineas_cartel'
  },
  {
    tabla: 'Contratos',
    campos: ['idContrato'],
    tipo: 'primario',
    nombre: 'pk_contratos'
  },

  // ================================
  // ÍNDICES FORÁNEOS PARA JOINS RÁPIDOS
  // ================================
  {
    tabla: 'DetalleCarteles',
    campos: ['codigoInstitucion'],
    tipo: 'foraneo',
    nombre: 'fk_carteles_institucion'
  },
  {
    tabla: 'Ofertas',
    campos: ['numeroCartel'],
    tipo: 'foraneo',
    nombre: 'fk_ofertas_cartel'
  },
  {
    tabla: 'Ofertas',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_ofertas_proveedor'
  },
  {
    tabla: 'LineasOfertadas',
    campos: ['numeroCartel', 'numeroLinea'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_ofertadas_cartel_linea'
  },
  {
    tabla: 'LineasOfertadas',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_ofertadas_proveedor'
  },
  {
    tabla: 'LineasAdjudicadas',
    campos: ['numeroCartel', 'numeroLinea'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_adjudicadas_cartel_linea'
  },
  {
    tabla: 'LineasAdjudicadas',
    campos: ['idProveedorAdjudicado'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_adjudicadas_proveedor'
  },
  {
    tabla: 'Contratos',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_contratos_proveedor'
  },
  {
    tabla: 'Contratos',
    campos: ['codigoInstitucion'],
    tipo: 'foraneo',
    nombre: 'fk_contratos_institucion'
  },
  {
    tabla: 'Contratos',
    campos: ['codigoProcedimiento'],
    tipo: 'foraneo',
    nombre: 'fk_contratos_procedimiento'
  },
  {
    tabla: 'InvitacionProcedimiento',
    campos: ['numeroCartel'],
    tipo: 'foraneo',
    nombre: 'fk_invitacion_cartel'
  },
  {
    tabla: 'InvitacionProcedimiento',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_invitacion_proveedor'
  },
  {
    tabla: 'LineasRecibidas',
    campos: ['numeroCartel'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_recibidas_cartel'
  },
  {
    tabla: 'LineasContratadas',
    campos: ['idContrato'],
    tipo: 'foraneo',
    nombre: 'fk_lineas_contratadas_contrato'
  },
  {
    tabla: 'OrdenPedido',
    campos: ['idContrato'],
    tipo: 'foraneo',
    nombre: 'fk_orden_contrato'
  },
  {
    tabla: 'Recepciones',
    campos: ['idContrato'],
    tipo: 'foraneo',
    nombre: 'fk_recepciones_contrato'
  },
  {
    tabla: 'Garantias',
    campos: ['numeroCartel'],
    tipo: 'foraneo',
    nombre: 'fk_garantias_cartel'
  },
  {
    tabla: 'Garantias',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_garantias_proveedor'
  },
  {
    tabla: 'RecursosObjecion',
    campos: ['numeroCartel'],
    tipo: 'foraneo',
    nombre: 'fk_recursos_cartel'
  },
  {
    tabla: 'RecursosObjecion',
    campos: ['idProveedor'],
    tipo: 'foraneo',
    nombre: 'fk_recursos_proveedor'
  },

  // ================================
  // ÍNDICES DE BÚSQUEDA POR TEXTO
  // ================================
  {
    tabla: 'DetalleCarteles',
    campos: ['nombreCartel', 'descripcionCartel'],
    tipo: 'busqueda',
    nombre: 'idx_busqueda_carteles'
  },
  {
    tabla: 'DetalleLineaCartel',
    campos: ['descripcionLinea'],
    tipo: 'busqueda',
    nombre: 'idx_busqueda_lineas'
  },
  {
    tabla: 'Proveedores',
    campos: ['nombreProveedor'],
    tipo: 'busqueda',
    nombre: 'idx_busqueda_proveedores'
  },
  {
    tabla: 'InstitucionesRegistradas',
    campos: ['nombreInstitucion'],
    tipo: 'busqueda',
    nombre: 'idx_busqueda_instituciones'
  },

  // ================================
  // ÍNDICES DE FECHAS PARA FILTROS TEMPORALES
  // ================================
  {
    tabla: 'DetalleCarteles',
    campos: ['fechaPublicacion'],
    tipo: 'busqueda',
    nombre: 'idx_fecha_publicacion'
  },
  {
    tabla: 'DetalleCarteles',
    campos: ['fechaCierre'],
    tipo: 'busqueda',
    nombre: 'idx_fecha_cierre'
  },
  {
    tabla: 'AdjudicacionesFirme',
    campos: ['fechaAdjudicacionFirme'],
    tipo: 'busqueda',
    nombre: 'idx_fecha_adjudicacion'
  },
  {
    tabla: 'Contratos',
    campos: ['fechaFirma'],
    tipo: 'busqueda',
    nombre: 'idx_fecha_firma'
  },

  // ================================
  // ÍNDICES DE MONTOS PARA FILTROS NUMÉRICOS
  // ================================
  {
    tabla: 'DetalleCarteles',
    campos: ['presupuestoOficial'],
    tipo: 'busqueda',
    nombre: 'idx_presupuesto_cartel'
  },
  {
    tabla: 'Contratos',
    campos: ['montoContrato'],
    tipo: 'busqueda',
    nombre: 'idx_monto_contrato'
  },
  {
    tabla: 'AdjudicacionesFirme',
    campos: ['montoTotalAdjudicado'],
    tipo: 'busqueda',
    nombre: 'idx_monto_adjudicado'
  }
];

// ================================
// MAPEO DE ARCHIVOS CSV A ENTIDADES
// ================================
export const MAPEO_ARCHIVOS: Record<string, string> = {
  'InstitucionesRegistradas.csv': 'InstitucionesRegistradas',
  'Proveedores_unido.csv': 'Proveedores',
  'ProcedimientoAdjudicacion.csv': 'ProcedimientoAdjudicacion',
  'ProcedimientoADM.csv': 'ProcedimientoADM',
  'Sistemas.csv': 'Sistemas',
  'SistemaEvaluacionOfertas.csv': 'SistemaEvaluacionOfertas',
  'DetalleCarteles.csv': 'DetalleCarteles',
  'DetalleLineaCartel.csv': 'DetalleLineaCartel',
  'FechaPorEtapas.csv': 'FechaPorEtapas',
  'Ofertas.csv': 'Ofertas',
  'LineasOfertadas.csv': 'LineasOfertadas',
  'LineasRecibidas.csv': 'LineasRecibidas',
  'InvitacionProcedimiento.csv': 'InvitacionProcedimiento',
  'LineasAdjudicadas.csv': 'LineasAdjudicadas',
  'AdjudicacionesFirme.csv': 'AdjudicacionesFirme',
  'Contratos.csv': 'Contratos',
  'LineasContratadas.csv': 'LineasContratadas',
  'OrdenPedido.csv': 'OrdenPedido',
  'Recepciones.csv': 'Recepciones',
  'ReajustePrecios.csv': 'ReajustePrecios',
  'Garantias.csv': 'Garantias',
  'RecursosObjecion.csv': 'RecursosObjecion',
  'FuncionariosInhibicion.csv': 'FuncionariosInhibicion',
  'SancionProveedores.csv': 'SancionProveedores',
  'Remates.csv': 'Remates'
};

// ================================
// CONFIGURACIÓN DE CAMPOS DE TEXTO PARA BÚSQUEDA
// ================================
export const CAMPOS_BUSQUEDA_TEXTO: Record<string, string[]> = {
  'DetalleCarteles': ['nombreCartel', 'descripcionCartel'],
  'DetalleLineaCartel': ['descripcionLinea'],
  'Proveedores': ['nombreProveedor'],
  'InstitucionesRegistradas': ['nombreInstitucion', 'siglas'],
  'Contratos': ['objetoContrato'],
  'RecursosObjecion': ['motivoRecurso', 'detalleResultado'],
  'SancionProveedores': ['motivoSancion']
};

// ================================
// CONFIGURACIÓN DE CAMPOS DE FECHA
// ================================
export const CAMPOS_FECHA: Record<string, string[]> = {
  'DetalleCarteles': ['fechaPublicacion', 'fechaCierre'],
  'FechaPorEtapas': ['fechaPublicacion', 'fechaAperturaOfertas', 'fechaAdjudicacion', 'fechaFirmaContrato'],
  'Ofertas': ['fechaOferta'],
  'AdjudicacionesFirme': ['fechaAdjudicacionFirme'],
  'Contratos': ['fechaFirma'],
  'OrdenPedido': ['fechaOrden'],
  'Recepciones': ['fechaRecepcion'],
  'ReajustePrecios': ['fechaReajuste'],
  'InvitacionProcedimiento': ['fechaInvitacion'],
  'RecursosObjecion': ['fechaPresentacion'],
  'SancionProveedores': ['fechaInicioSancion', 'fechaFinSancion'],
  'Garantias': ['fechaInicio', 'fechaVencimiento'],
  'Remates': ['fechaRemate']
};

// ================================
// MAPEO ESPECÍFICO DE HEADERS POR TABLA
// ================================
// Evita ambigüedades como 'cedula' que puede referir a proveedor o institución
export const MAPEO_HEADERS_POR_TABLA: Record<string, Record<string, string>> = {
  InstitucionesRegistradas: {
    'cedula_institucion': 'codigoInstitucion',
    'cedula': 'codigoInstitucion',
    'nombre_institucion': 'nombreInstitucion',
    'nombreinstitucion': 'nombreInstitucion',
    'nombre institucion': 'nombreInstitucion',
    'sigla': 'siglas'
  },
  Proveedores: {
    'cedula_proveedor': 'idProveedor',
    'cedula_juridica': 'idProveedor',
    'cedula': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'nombre proveedor': 'nombreProveedor',
    'nom_proveedor': 'nombreProveedor',
    'razon_social': 'nombreProveedor',
    'nombre': 'nombreProveedor',
    // Variantes con espacios (como en Proveedores_unido.csv)
    'cédula proveedor': 'idProveedor',
    'cédula_proveedor': 'idProveedor',
    'cedula proveedor': 'idProveedor',
    // Variantes de tipo y tamaño
    'tipo proveedor': 'tipoProveedor',
    'tipo_proveedor': 'tipoProveedor',
    'tamaño proveedor': 'tamanoProveedor',
    'tamano proveedor': 'tamanoProveedor',
    'tamaño_proveedor': 'tamanoProveedor',
    'tamano_proveedor': 'tamanoProveedor',
    // Variantes de ubicación
    'codigo postal': 'codigoPostal',
    'codigo_postal': 'codigoPostal',
    'código postal': 'codigoPostal',
    'provincia': 'provincia',
    'canton': 'canton',
    'cantón': 'canton',
    'distrito': 'distrito'
  },
  Proveedores_unido: {
    'cedula_proveedor': 'idProveedor',
    'cedula_juridica': 'idProveedor',
    'cedula': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'nombre_proveedor': 'nombreProveedor',
    'nombre proveedor': 'nombreProveedor',
    'nom_proveedor': 'nombreProveedor',
    'razon_social': 'nombreProveedor',
    'nombre': 'nombreProveedor',
    'cédula proveedor': 'idProveedor',
    'cédula_proveedor': 'idProveedor',
    'cedula proveedor': 'idProveedor',
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
    'distrito': 'distrito'
  },
  DetalleCarteles: {
    // variantes con underscore
    'nro_sicop': 'numeroCartel',
    'numero_sicop': 'numeroCartel',
    'nro_procedimiento': 'codigoProcedimiento',
    'cartel_nm': 'nombreCartel',
    'fecha_publicacion': 'fechaPublicacion',
    'presupuesto_oficial': 'presupuestoOficial',
    'monto_est': 'presupuestoOficial',
    'cedula_institucion': 'codigoInstitucion',
    'clas_obj': 'clasificacionObjeto',
    // variantes sin underscore (como se observan en logs reales)
    'numerocartel': 'numeroCartel',
    'codigoinstitucion': 'codigoInstitucion',
    'fechapublicacion': 'fechaPublicacion',
    'codigoprocedimiento': 'codigoProcedimiento',
    'nombrecartel': 'nombreCartel',
    'presupuestooficial': 'presupuestoOficial',
    'clasificacionobjeto': 'clasificacionObjeto'
  },
  DetalleLineaCartel: {
    'descripcion_linea': 'descripcionLinea',
    'desc_linea': 'descripcionLinea',
    'numero_linea': 'numeroLinea',
    'nro_linea': 'numeroLinea',
    'nro_sicop': 'numeroCartel',
    'numero_partida': 'numeroPartida', // Agregado - requerido por schema
    'cantidad_solicitada': 'cantidadRequerida',
    'precio_unitario_estimado': 'presupuestoLinea',
    'tipo_moneda': 'tipoMoneda',
    'tipo_cambio_crc': 'tipoCambioCRC',
    'tipo_cambio_dolar': 'tipoCambioDolar',
    'codigo_identificacion': 'codigoIdentificacion',
    'monto_reservado': 'montoReservado',
    // variantes sin underscore
    'desc_producto': 'descripcionLinea',
    'numerolinea': 'numeroLinea',
    'numerocartel': 'numeroCartel',
    'numeropartida': 'numeroPartida'
  },
  FechaPorEtapas: {
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimiento',
    'publicacion': 'fechaPublicacion',
    'fecha_publicacion': 'fechaPublicacion',
    'fecha_apertura': 'fechaAperturaOfertas',
    'fecha_apertura_ofertas': 'fechaAperturaOfertas',
    'adjudicacion_firme': 'fechaAdjudicacion',
    'fecha_adjudicacion': 'fechaAdjudicacion',
    'fecha_elaboracion_contrato': 'fechaFirmaContrato',
    'fecha_firma_contrato': 'fechaFirmaContrato'
  },
  Ofertas: {
    'nro_sicop': 'numeroCartel',
    'numero_oferta': 'numeroOferta',
    'nro_oferta': 'numeroOferta',
    'cedula_proveedor': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'fecha_presenta_oferta': 'fechaOferta',
    'fecha_oferta': 'fechaOferta',
    'tipo_moneda': 'tipoMoneda'
  },
  LineasOfertadas: {
    'nro_sicop': 'numeroCartel',
    'nro_linea': 'numeroLinea',
    'numero_linea': 'numeroLinea',
    'nro_oferta': 'numeroOferta',
    'numero_oferta': 'numeroOferta',
    'id_proveedor': 'idProveedor',
    'cedula_proveedor': 'idProveedor',
    'codigo_producto': 'codigoProducto',
    'cantidad_ofertada': 'cantidadOfertada',
    'precio_unitario': 'precioUnitario',
    'tipo_moneda': 'tipoMoneda'
  },
  LineasRecibidas: {
    'nro_sicop': 'numeroCartel',
    'nro_contrato': 'idContrato',
    'nro_linea': 'numeroLinea',
    'numero_linea': 'numeroLinea',
    'codigo_producto': 'codigoProducto'
  },
  InvitacionProcedimiento: {
    'nro_sicop': 'numeroCartel',
    'cedula_proveedor': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'fecha_invitacion': 'fechaInvitacion'
  },
  LineasContratadas: {
    'nro_sicop': 'numeroCartel',
    'nro_contrato': 'idContrato',
    'nro_linea_cartel': 'numeroLinea',
    'nro_linea_contrato': 'numeroLineaContrato',
    'nro_linea': 'numeroLinea',
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
  OrdenPedido: {
    'nro_sicop': 'numeroCartel', // Agregado - requerido por schema
    'nro_contrato': 'idContrato',
    'nro_orden': 'idOrden',
    'nro_orden_pedido': 'idOrden', // Variante del campo requerido
    'numero_orden_pedido': 'idOrden',
    'fecha_elaboracion_orden': 'fechaOrden',
    'fecha_orden': 'fechaOrden'
  },
  Recepciones: {
    'nro_sicop': 'numeroCartel', // Agregado - requerido por schema
    'nro_contrato': 'idContrato',
    'nro_recep_definitiva': 'idRecepcion',
    'nro_recepcion': 'idRecepcion', // Variante del campo requerido
    'numero_recepcion': 'idRecepcion',
    'fecha_recep_definitiva': 'fechaRecepcion',
    'fecha_recepcion': 'fechaRecepcion'
  },
  Garantias: {
    'nro_sicop': 'numeroCartel',
    'cedula_proveedor': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'tipo_garantia': 'tipoGarantia', // Agregado - requerido por schema
    'monto': 'montoGarantia',
    'fecha_inicio': 'fechaInicio',
    'fecha_vencimiento': 'fechaVencimiento'
  },
  RecursosObjecion: {
    'nro_sicop': 'numeroCartel',
    'numero_recurso': 'idRecurso', // Agregado - requerido por schema
    'cedula_proveedor': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'fecha_presentacion_recurso': 'fechaPresentacion',
    'fecha_presentacion': 'fechaPresentacion'
  },
  SancionProveedores: {
    'cedula_proveedor': 'idProveedor',
    'id_proveedor': 'idProveedor',
    'nombre_proveedor': 'nombreProveedor', // Agregado - requerido por schema
    'inicio_sancion': 'fechaInicioSancion',
    'fecha_inicio_sancion': 'fechaInicioSancion',
    'final_sancion': 'fechaFinSancion',
    'fecha_fin_sancion': 'fechaFinSancion'
  },
  Contratos: {
    'nro_contrato': 'idContrato',
    'numero_contrato': 'idContrato',
    
    // ===== CAMPOS DE MONTO - VARIANTES MÚLTIPLES =====
    // Variantes principales
    'monto_contrato': 'montoContrato',
    'monto': 'montoContrato',
    
    // Variantes alternativas comunes
    'monto_total': 'montoContrato',
    'monto_total_contrato': 'montoContrato',
    'valor_contrato': 'montoContrato',
    'monto_adjudicado': 'montoContrato',
    'precio_total': 'montoContrato',
    'importe': 'montoContrato',
    'total': 'montoContrato',
    'total_contrato': 'montoContrato',
    'valor_total': 'montoContrato',
    'monto_total_adjudicado': 'montoContrato',
    
    // Variantes en mayúsculas
    'MONTO_CONTRATO': 'montoContrato',
    'MONTO_TOTAL': 'montoContrato',
    'MONTO': 'montoContrato',
    'VALOR_CONTRATO': 'montoContrato',
    
    // Variantes con espacios (pre-normalización)
    'monto contrato': 'montoContrato',
    'monto total': 'montoContrato',
    'valor del contrato': 'montoContrato',
    'valor contrato': 'montoContrato',
    // ===== FIN CAMPOS DE MONTO =====
    
    'fecha_firma': 'fechaFirma',
    'fecha_elaboracion': 'fechaFirma',
    'cedula_proveedor': 'idProveedor',
    'cedula_institucion': 'codigoInstitucion',
    'nro_sicop': 'numeroCartel',
    'numero_procedimiento': 'codigoProcedimiento',
    'secuencia': 'secuencia',
    'tipo_contrato': 'tipoContrato',
    'tipo_modificacion': 'tipoModificacion',
    'fecha_notificacion': 'fechaNotificacion',
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
  AdjudicacionesFirme: {
    'nro_sicop': 'numeroCartel',
    'numero_sicop': 'numeroCartel',
    'nro_acto': 'numeroActo',
    'fecha_adjudicacion_firme': 'fechaAdjudicacionFirme',
    'fecha_adj_firme': 'fechaAdjudicacionFirme',
    'fecha_adjudicacion': 'fechaAdjudicacionFirme', // Variante adicional
    'monto_total_adjudicado': 'montoTotalAdjudicado',
    'permite_recursos': 'permiteRecursos',
    'desierto': 'desierto',
    'fecha_rev': 'fechaRevision'
  },
  LineasAdjudicadas: {
    'nro_sicop': 'numeroCartel',
    'numero_sicop': 'numeroCartel',
    'nro_linea': 'numeroLinea',
    'numero_linea': 'numeroLinea',
    'cedula_proveedor': 'idProveedorAdjudicado',
    'cedula_proveedor_adjudicado': 'idProveedorAdjudicado',
    'id_proveedor': 'idProveedorAdjudicado',
    'id_proveedor_adjudicado': 'idProveedorAdjudicado',
    'precio_unitario_adjudicado': 'precioUnitarioAdjudicado',
    'precio_adjudicado': 'precioAdjudicado',
    'cantidad_adjudicada': 'cantidadAdjudicada',
    'monto_linea_adjudicada': 'montoLineaAdjudicada',
    'tipo_moneda': 'tipoMoneda',
    'tipo_cambio_crc': 'tipoCambioCRC',
    'tipo_cambio_dolar': 'tipoCambioDolar',
    'descuento': 'descuento',
    'iva': 'iva',
    'otros_impuestos': 'otrosImpuestos',
    'acarreos': 'acarreos',
    'nro_acto': 'numeroActo'
  },
  ProcedimientoAdjudicacion: {
    'numero_procedimiento': 'codigoProcedimiento',
    'descr_procedimiento': 'descripcionProcedimiento',
    'cedula': 'codigoInstitucion', // Agregado - requerido por schema
    'institucion': 'nombreInstitucion' // Agregado - requerido por schema
  },
  ProcedimientoADM: {
    'numero_procedimiento': 'codigoProcedimientoADM',
    'descr_procedimiento': 'descripcionProcedimientoADM',
    'nro_sicop': 'numeroCartel', // Agregado - requerido por schema
    'numero_pa': 'numeroPA' // Agregado - requerido por schema
  },
  FuncionariosInhibicion: {
    'cedula_institucion': 'codigoInstitucion',
    'cédula_institucion': 'codigoInstitucion',
    'cedula institucion': 'codigoInstitucion',
    'cedula_funcionario': 'cedulaFuncionario',
    'cédula_funcionario': 'cedulaFuncionario',
    'cedula funcionario': 'cedulaFuncionario',
    'nombre_funcionario': 'nombreFuncionario',
    'nombre funcionario': 'nombreFuncionario',
    'fecha_inicio': 'fechaInicio',
    'fecha_fin': 'fechaFin'
  },
  Sistemas: {
    'nro_sicop': 'numeroCartel', // Agregado - requerido por schema
    'numero_linea': 'numeroLinea', // Agregado - requerido por schema
    'numero_partida': 'numeroPartida' // Agregado - requerido por schema
  },
  SistemaEvaluacionOfertas: {
    'nro_sicop': 'numeroCartel' // Agregado - requerido por schema
  },
  ReajustePrecios: {
    'nro_contrato': 'idContrato', // Agregado - requerido por schema
    'numero_reajuste': 'numeroReajuste' // Agregado - requerido por schema
  }
};
