/**
 * FileValidationService - Valida y analiza archivos CSV cargados
 * Verifica estructura, campos requeridos y completitud de datos
 */

import { cacheService } from './CacheService';
import { headerNormalizationService } from './HeaderNormalizationService';

// Definición de estructuras esperadas para cada tipo de archivo
interface FileSchema {
  type: string;
  requiredFields: string[];
  optionalFields?: string[];
  description: string;
}

// Esquemas de archivos SICOP - CORREGIDOS Y COMPLETOS
// ⚠️ SINCRONIZADO CON DataManager.ts - MAPEO_ARCHIVOS (25 archivos exactos)
// ✅ Basado en análisis real de CSV (scripts/analyze_csv_structure.js)
const FILE_SCHEMAS: FileSchema[] = [
  // ===== INSTITUCIONES Y PROVEEDORES =====
  {
    type: 'InstitucionesRegistradas',
    requiredFields: ['CEDULA', 'NOMBRE_INSTITUCION'],
    optionalFields: ['ZONA_GEO_INST', 'FECHA_INGRESO', 'FECHA_MOD'],
    description: 'Catálogo de instituciones públicas registradas en SICOP'
  },
  {
    type: 'Proveedores_unido',
    requiredFields: ['Cédula Proveedor', 'Nombre Proveedor'],
    optionalFields: ['Tipo Proveedor', 'Tamaño Proveedor', 'Codigo Postal', 'Provincia', 'Canton', 'Distrito'],
    description: 'Catálogo unificado de proveedores (separador: punto y coma)'
  },

  // ===== PROCEDIMIENTOS =====
  {
    type: 'ProcedimientoAdjudicacion',
    requiredFields: ['CEDULA', 'INSTITUCION', 'NUMERO_PROCEDIMIENTO'],
    optionalFields: [
      'ANO', 'DESCR_PROCEDIMIENTO', 'LINEA', 'PROD_ID', 'DESCR_BIEN_SERVICIO',
      'CANTIDAD', 'UNIDAD_MEDIDA', 'MONTO_UNITARIO', 'MONEDA_PRECIO_EST',
      'MONEDA_ADJUDICADA', 'MONTO_ADJU_LINEA', 'MONTO_ADJU_LINEA_CRC',
      'MONTO_ADJU_LINEA_USD', 'FECHA_ADJUD_FIRME', 'FECHA_SOL_CONTRA',
      'CEDULA_PROVEEDOR', 'NOMBRE_PROVEEDOR', 'PERFIL_PROV',
      'CEDULA_REPRESENTANTE', 'REPRESENTANTE', 'OBJETO_GASTO',
      'NRO_SICOP', 'TIPO_PROCEDIMIENTO', 'MODALIDAD_PROCEDIMIENTO',
      'fecha_rev', 'FECHA_SOL_CONTRA_CL', 'PROD_ID_CL'
    ],
    description: 'Procedimientos de adjudicación y licitaciones (~3,885 registros)'
  },
  {
    type: 'ProcedimientoADM',
    requiredFields: ['NRO_SICOP', 'NUMERO_PROCEDIMIENTO', 'NUMERO_PA'],
    optionalFields: [
      'NOMBRE_PROVEEDOR', 'NOMBRE_INSTITUCION', 'CEDULA_INSTITUCION',
      'CEDULA_PROVEEDOR', 'FECHA_NOTIFICACION', 'INHAB_APERC', 'MULTA_CAUSULA'
    ],
    description: 'Procedimientos administrativos (~5 registros)'
  },

  // ===== SISTEMAS Y EVALUACIÓN =====
  {
    type: 'Sistemas',
    requiredFields: ['NRO_SICOP', 'NUMERO_LINEA', 'NUMERO_PARTIDA'],
    optionalFields: [
      'DESC_LINEA', 'CEDULA_INSTITUCION', 'NRO_PROCEDIMIENTO',
      'TIPO_PROCEDIMIENTO', 'FECHA_PUBLICACION'
    ],
    description: 'Sistemas asociados a carteles y líneas (~8,664 registros)'
  },
  {
    type: 'SistemaEvaluacionOfertas',
    requiredFields: ['NRO_SICOP'],
    optionalFields: ['EVAL_ITEM_SEQNO', 'FACTOR_EVAL', 'PORC_EVAL', 'fecha_registro'],
    description: 'Metodologías de evaluación de ofertas (~4,965 registros)'
  },

  // ===== CARTELES Y LÍNEAS =====
  {
    type: 'DetalleCarteles',
    requiredFields: ['NRO_SICOP', 'CEDULA_INSTITUCION', 'NRO_PROCEDIMIENTO'],
    optionalFields: [
      'FECHA_PUBLICACION', 'TIPO_PROCEDIMIENTO', 'MODALIDAD_PROCEDIMIENTO',
      'CARTEL_STAT', 'CARTEL_NM', 'FECHAH_APERTURA', 'CODIGO_BPIP',
      'CLAS_OBJ', 'COD_EXCEPCION', 'DES_EXCEPCION', 'MONTO_EST', 'FECHA_MOD'
    ],
    description: 'Detalle de carteles de licitación (~1,555 registros)'
  },
  {
    type: 'DetalleLineaCartel',
    requiredFields: ['NRO_SICOP', 'NUMERO_LINEA', 'NUMERO_PARTIDA'],
    optionalFields: [
      'CANTIDAD_SOLICITADA', 'PRECIO_UNITARIO_ESTIMADO', 'TIPO_MONEDA',
      'TIPO_CAMBIO_CRC', 'TIPO_CAMBIO_DOLAR', 'CODIGO_IDENTIFICACION',
      'MONTO_RESERVADO', 'DESC_LINEA'
    ],
    description: 'Líneas de detalle de carteles (~8,664 registros)'
  },
  {
    type: 'FechaPorEtapas',
    requiredFields: ['NRO_SICOP', 'NUMERO_PROCEDIMIENTO'],
    optionalFields: [
      'FECHA_PUBLICACION', 'FECHA_APERTURA_OFERTAS', 'FECHA_ADJUDICACION', 'FECHA_FIRMA_CONTRATO'
    ],
    description: 'Cronograma de etapas de procedimientos (~8,664 registros)'
  },

  // ===== OFERTAS Y PARTICIPACIÓN =====
  {
    type: 'Ofertas',
    requiredFields: ['NRO_SICOP', 'NUMERO_OFERTA', 'CEDULA_PROVEEDOR'],
    optionalFields: [
      'NRO_PROCEDIMIENTO', 'CEDULA_INSTITUCION', 'FECHA_OFERTA',
      'TIPO_MONEDA', 'CONSORCIO', 'DESC_CONSORCIO', 'fecha_registro'
    ],
    description: 'Ofertas presentadas por proveedores (~11,609 registros)'
  },
  {
    type: 'LineasOfertadas',
    requiredFields: ['NRO_SICOP', 'NUMERO_LINEA', 'NUMERO_OFERTA'],
    optionalFields: [
      'CEDULA_PROVEEDOR', 'CANTIDAD_OFERTADA', 'PRECIO_UNITARIO',
      'TIPO_MONEDA', 'CODIGO_PRODUCTO', 'MARCA', 'TIPO_CAMBIO_CRC',
      'TIPO_CAMBIO_DOLAR', 'FECHA_FABRICACION', 'fecha_registro'
    ],
    description: 'Líneas ofertadas en cada propuesta (~13,576 registros)'
  },
  {
    type: 'LineasRecibidas',
    requiredFields: ['NRO_SICOP', 'NUMERO_LINEA'],
    optionalFields: [
      'CODIGO_PRODUCTO', 'CANTIDAD_RECIBIDA', 'PRECIO_UNITARIO',
      'TIPO_MONEDA', 'TIPO_CAMBIO_CRC', 'TIPO_CAMBIO_DOLAR', 'fecha_registro'
    ],
    description: 'Líneas recibidas en apertura de ofertas (~2,939 registros)'
  },
  {
    type: 'InvitacionProcedimiento',
    requiredFields: ['NRO_SICOP', 'CEDULA_PROVEEDOR'],
    optionalFields: ['FECHA_INVITACION', 'fecha_registro'],
    description: 'Proveedores invitados a procedimientos (~736,295 registros)'
  },

  // ===== ADJUDICACIONES =====
  {
    type: 'LineasAdjudicadas',
    requiredFields: ['NRO_SICOP', 'NUMERO_LINEA', 'CEDULA_PROVEEDOR'],
    optionalFields: [
      'NUMERO_OFERTA', 'CODIGO_PRODUCTO', 'NUMERO_ACTO', 'CANTIDAD_ADJUDICADA',
      'PRECIO_UNITARIO_ADJUDICADO', 'TIPO_MONEDA', 'TIPO_CAMBIO_CRC',
      'TIPO_CAMBIO_DOLAR', 'DESC_PRODUCTO', 'fecha_registro'
    ],
    description: 'Líneas adjudicadas a proveedores ganadores (~4,611 registros)'
  },
  {
    type: 'AdjudicacionesFirme',
    requiredFields: ['NRO_SICOP', 'FECHA_ADJUDICACION_FIRME'],
    optionalFields: ['NUMERO_ACTO', 'PERMITE_RECURSOS', 'DESIERTO', 'fecha_registro'],
    description: 'Adjudicaciones en firme y definitivas (~3,899 registros)'
  },

  // ===== CONTRATOS Y EJECUCIÓN =====
  {
    type: 'Contratos',
    requiredFields: ['NRO_CONTRATO', 'CEDULA_INSTITUCION', 'CEDULA_PROVEEDOR'],
    optionalFields: [
      'SECUENCIA', 'NUMERO_PROCEDIMIENTO', 'NRO_SICOP', 'TIPO_CONTRATO',
      'TIPO_MODIFICACION', 'FECHA_NOTIFICACION', 'FECHA_ELABORACION',
      'TIPO_AUTORIZACION', 'TIPO_DISMINUCION', 'VIGENCIA', 'MONEDA',
      'FECHA_INI_SUSP', 'FECHA_REINI_CONT', 'PLAZO_SUSP', 'FECHA_MODIFICACION',
      'FECHA_INI_PRORR', 'FECHA_FIN_PRORR', 'NRO_CONTRATO_WEB'
    ],
    description: 'Contratos formalizados y firmados (~2,420 registros)'
  },
  {
    type: 'LineasContratadas',
    requiredFields: ['NRO_SICOP', 'NRO_CONTRATO', 'NRO_LINEA_CONTRATO'],
    optionalFields: [
      'NRO_LINEA_CARTEL', 'SECUENCIA', 'CEDULA_PROVEEDOR', 'CODIGO_PRODUCTO',
      'CANTIDAD_CONTRATADA', 'PRECIO_UNITARIO', 'TIPO_MONEDA', 'DESCUENTO',
      'IVA', 'OTROS_IMPUESTOS', 'ACARREOS', 'TIPO_CAMBIO_CRC', 'TIPO_CAMBIO_DOLAR',
      'NRO_ACTO', 'DESC_PRODUCTO', 'cantidad_aumentada', 'cantidad_disminuida',
      'monto_aumentado', 'monto_disminuido'
    ],
    description: 'Detalle de líneas contratadas (~3,926 registros)'
  },
  {
    type: 'OrdenPedido',
    requiredFields: ['NRO_SICOP', 'NRO_ORDEN_PEDIDO', 'NRO_CONTRATO'],
    optionalFields: [
      'NUMERO_PROCEDIMIENTO', 'FECHA_ORDEN', 'MONTO_ORDEN', 'MONEDA_ORDEN',
      'ESTADO_ORDEN', 'LINEA_ORD_PEDIDO', 'TIPO_CAMBIO_CRC',
      'TIPO_CAMBIO_DOLAR', 'fecha_registro'
    ],
    description: 'Órdenes de compra emitidas (~23,533 registros)'
  },
  {
    type: 'Recepciones',
    requiredFields: ['NRO_SICOP', 'NRO_CONTRATO', 'NRO_RECEPCION'],
    optionalFields: [
      'NRO_ORDEN_PEDIDO', 'FECHA_RECEPCION', 'CANTIDAD_RECIBIDA',
      'CODIGO_PRODUCTO', 'NUMERO_LINEA', 'MONTO_RECEPCION', 'fecha_registro'
    ],
    description: 'Recepción de bienes y servicios (~1,394 registros)'
  },
  {
    type: 'ReajustePrecios',
    requiredFields: ['NRO_CONTRATO', 'NUMERO_REAJUSTE'],
    optionalFields: ['FECHA_REAJUSTE', 'PORCENTAJE', 'MONTO', 'fecha_registro'],
    description: 'Reajustes de precios en contratos (~3 registros)'
  },

  // ===== GARANTÍAS Y RIESGOS =====
  {
    type: 'Garantias',
    requiredFields: ['CEDULA_PROVEEDOR', 'TIPO_GARANTIA'],
    optionalFields: [
      'NRO_CONTRATO', 'NRO_SICOP', 'MONTO', 'FECHA_INICIO',
      'FECHA_VENCIMIENTO', 'NUMERO_POLIZA', 'ENTIDAD_EMISORA', 'fecha_registro'
    ],
    description: 'Garantías de cumplimiento y participación (~1,077 registros)'
  },
  {
    type: 'RecursosObjecion',
    requiredFields: ['NRO_SICOP', 'NUMERO_RECURSO'],
    optionalFields: [
      'CEDULA_PROVEEDOR', 'FECHA_PRESENTACION', 'MOTIVO_RECURSO',
      'DETALLE_RESULTADO', 'ESTADO_RECURSO', 'fecha_registro'
    ],
    description: 'Recursos de objeción presentados (~261 registros)'
  },
  {
    type: 'FuncionariosInhibicion',
    requiredFields: ['CEDULA_INSTITUCION', 'CEDULA_FUNCIONARIO'],
    optionalFields: ['NOMBRE_FUNCIONARIO', 'FECHA_INICIO', 'FECHA_FIN', 'fecha_registro'],
    description: 'Inhibiciones de funcionarios públicos (~86,340 registros)'
  },
  {
    type: 'SancionProveedores',
    requiredFields: ['CEDULA_PROVEEDOR', 'NOMBRE_PROVEEDOR'],
    optionalFields: [
      'NOMBRE_INSTITUCION', 'CEDULA_INSTITUCION', 'CODIGO_PRODUCTO',
      'DESCRIP_PRODUCTO', 'TIPO_SANCION', 'DESCR_SANCION', 'INICIO_SANCION',
      'FINAL_SANCION', 'ESTADO', 'NO_RESOLUCION', 'fecha_registro'
    ],
    description: 'Sanciones aplicadas a proveedores (~7 registros)'
  },

  // ===== OTROS =====
  {
    type: 'Remates',
    requiredFields: ['NUMERO_REMATE'],
    optionalFields: ['DESCRIPCION', 'FECHA_REMATE', 'CEDULA_INSTITUCION', 'fecha_registro'],
    description: 'Remates de bienes del Estado (~0 registros)'
  }
];

const FILE_TYPE_GROUPS: Record<string, string> = {
  // Catálogos base
  InstitucionesRegistradas: 'Catálogos base',
  Proveedores_unido: 'Catálogos base',

  // Procesos y carteles
  ProcedimientoAdjudicacion: 'Procesos y carteles',
  ProcedimientoADM: 'Procesos y carteles',
  DetalleCarteles: 'Procesos y carteles',
  DetalleLineaCartel: 'Procesos y carteles',
  FechaPorEtapas: 'Procesos y carteles',
  InvitacionProcedimiento: 'Procesos y carteles',
  Sistemas: 'Procesos y carteles',
  SistemaEvaluacionOfertas: 'Procesos y carteles',

  // Ofertas y adjudicaciones
  Ofertas: 'Ofertas y adjudicaciones',
  LineasOfertadas: 'Ofertas y adjudicaciones',
  LineasRecibidas: 'Ofertas y adjudicaciones',
  LineasAdjudicadas: 'Ofertas y adjudicaciones',
  AdjudicacionesFirme: 'Ofertas y adjudicaciones',

  // Contratación y ejecución
  Contratos: 'Contratación y ejecución',
  LineasContratadas: 'Contratación y ejecución',
  OrdenPedido: 'Contratación y ejecución',
  Recepciones: 'Contratación y ejecución',
  ReajustePrecios: 'Contratación y ejecución',
  Garantias: 'Contratación y ejecución',

  // Control y sanciones
  RecursosObjecion: 'Control y sanciones',
  SancionProveedores: 'Control y sanciones',
  FuncionariosInhibicion: 'Control y sanciones',
  Remates: 'Control y sanciones'
};

const FILE_GROUP_ORDER = [
  'Catálogos base',
  'Procesos y carteles',
  'Ofertas y adjudicaciones',
  'Contratación y ejecución',
  'Control y sanciones',
  'Otros'
];

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  count?: number;
}

interface FileValidationResult {
  fileId: string;
  fileName: string;
  type: string;
  isValid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalRecords: number;
    validRecords: number;
    emptyFields: { [field: string]: number };
    fieldsCoverage: { [field: string]: number };
  };
}

interface GroupSummary {
  group: string;
  totalTypes: number;
  loadedTypes: string[];
  missingTypes: string[];
  completion: number;
}

interface YearCoverageDetail {
  month: number;
  monthLabel: string;
  hasData: boolean;
  types: string[];
}

interface YearCoverageSummary {
  year: number;
  monthsWithData: number;
  monthsMissing: number;
  completion: number;
  detail: YearCoverageDetail[];
}

interface AnalysisReport {
  totalFiles: number;
  validFiles: number; // Archivos sin errores críticos
  filesWithIssues: number; // Archivos con errores o warnings
  filesWithErrors: number; // Archivos solo con errores críticos
  filesWithWarnings: number; // Archivos solo con warnings
  missingFileTypes: string[];
  fileValidations: FileValidationResult[];
  recommendations: string[];
  completeness: number; // Porcentaje de tipos de archivos esperados vs cargados
  groupSummaries: GroupSummary[];
  yearCoverage: YearCoverageSummary[];
}

class FileValidationService {
  private normalizeKey(key: string): string {
    return key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private getFieldCandidates(field: string, fileType: string): string[] {
    const candidates = new Set<string>();

    const trimmed = field.trim();
    const lower = trimmed.toLowerCase();
    const snake = lower.replace(/\s+/g, '_');
    const compact = lower.replace(/[^a-z0-9]/g, '');

    [trimmed, lower, snake, compact].forEach(value => {
      if (value.length > 0) {
        candidates.add(value);
      }
    });

    const mapping = headerNormalizationService.getMapping(fileType);
    if (mapping) {
      if (mapping[lower]) {
        candidates.add(mapping[lower]);
      }
      if (mapping[snake]) {
        candidates.add(mapping[snake]);
      }

      Object.entries(mapping).forEach(([rawKey, normalizedKey]) => {
        if (lower.includes(rawKey) || rawKey.includes(lower) || snake.includes(rawKey)) {
          candidates.add(normalizedKey);
        }
      });
    }

    return Array.from(candidates);
  }

  private findMatchingField(
    field: string,
    fileType: string,
    fileFieldVariants: Array<{ original: string; lower: string; normalized: string }>
  ): string | undefined {
    const candidates = this.getFieldCandidates(field, fileType);
    if (candidates.length === 0) {
      return undefined;
    }

    const candidateLower = candidates.map(candidate => candidate.toLowerCase());
    const candidateNormalized = candidates.map(candidate => this.normalizeKey(candidate));

    for (const variant of fileFieldVariants) {
      if (candidateLower.includes(variant.lower) || candidateNormalized.includes(variant.normalized)) {
        return variant.original;
      }
    }

    return undefined;
  }

  /**
   * Obtiene el esquema esperado para un tipo de archivo
   */
  private getSchema(fileType: string): FileSchema | undefined {
    return FILE_SCHEMAS.find(schema => schema.type === fileType);
  }

  /**
   * Valida un archivo individual
   */
  async validateFile(fileId: string): Promise<FileValidationResult> {
    const fileData = await cacheService.getFile(fileId);
    
    if (!fileData) {
      return {
        fileId,
        fileName: 'Unknown',
        type: 'Unknown',
        isValid: false,
        issues: [{ type: 'error', message: 'Archivo no encontrado en caché' }],
        stats: {
          totalRecords: 0,
          validRecords: 0,
          emptyFields: {},
          fieldsCoverage: {}
        }
      };
    }

    const { fileInfo, data } = fileData;
    const schema = this.getSchema(fileInfo.type);
    const issues: ValidationIssue[] = [];
    const emptyFields: { [field: string]: number } = {};
    const fieldsCoverage: { [field: string]: number } = {};

    // Validar si existe esquema
    if (!schema) {
      issues.push({
        type: 'warning',
        message: `No hay esquema definido para el tipo "${fileInfo.type}"`
      });
    }

    // Validar que hay datos
    if (!data || data.length === 0) {
      issues.push({
        type: 'error',
        message: 'El archivo no contiene datos'
      });
      
      return {
        fileId,
        fileName: fileInfo.fileName,
        type: fileInfo.type,
        isValid: false,
        issues,
        stats: {
          totalRecords: 0,
          validRecords: 0,
          emptyFields,
          fieldsCoverage
        }
      };
    }

    // Obtener campos del archivo
    const fileFields = Object.keys(data[0] || {});
    const fieldVariants = fileFields.map(field => ({
      original: field,
      lower: field.toLowerCase(),
      normalized: this.normalizeKey(field)
    }));

    const resolvedFieldMap: Record<string, string | undefined> = {};

    // Validar campos requeridos
    if (schema) {
      const missingFields = schema.requiredFields.filter(field => 
        !this.findMatchingField(field, fileInfo.type, fieldVariants)
      );

      if (missingFields.length > 0) {
        issues.push({
          type: 'error',
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
          count: missingFields.length
        });
      }

      // Analizar cobertura de campos
      schema.requiredFields.forEach(requiredField => {
        const matchingField = this.findMatchingField(requiredField, fileInfo.type, fieldVariants);
        resolvedFieldMap[requiredField] = matchingField;

        if (matchingField) {
          const nonEmptyCount = data.filter(row => {
            const value = row[matchingField];
            return value !== null && value !== undefined && value !== '';
          }).length;

          const coverage = (nonEmptyCount / data.length) * 100;
          fieldsCoverage[requiredField] = coverage;

          if (coverage < 50) {
            issues.push({
              type: 'warning',
              field: requiredField,
              message: `Campo "${requiredField}" tiene solo ${coverage.toFixed(1)}% de datos completos`,
              count: data.length - nonEmptyCount
            });
          }

          emptyFields[requiredField] = data.length - nonEmptyCount;
        } else {
          fieldsCoverage[requiredField] = 0;
          emptyFields[requiredField] = data.length;
        }
      });
    }

    // Validar registros duplicados (si hay un campo ID)
    const idFields = fileFields.filter(f => 
      f.toLowerCase().includes('id') || 
      f.toLowerCase().includes('numero') ||
      f.toLowerCase().includes('codigo')
    );

    if (idFields.length > 0) {
      const primaryField = idFields[0];
      const values = data.map(row => row[primaryField]).filter(v => v);
      const uniqueValues = new Set(values);
      
      if (values.length !== uniqueValues.size) {
        const duplicateCount = values.length - uniqueValues.size;
        issues.push({
          type: 'warning',
          field: primaryField,
          message: `Posibles ${duplicateCount} registros duplicados en campo "${primaryField}"`,
          count: duplicateCount
        });
      }
    }

    // Calcular registros válidos
    let validRecords = 0;
    if (schema) {
      validRecords = data.filter(row => {
        return schema.requiredFields.every(field => {
          const matchingField = resolvedFieldMap[field];
          if (!matchingField) return false;
          const value = row[matchingField];
          return value !== null && value !== undefined && value !== '';
        });
      }).length;

      if (validRecords < data.length) {
        issues.push({
          type: 'info',
          message: `${data.length - validRecords} registros tienen campos requeridos vacíos`,
          count: data.length - validRecords
        });
      }
    } else {
      validRecords = data.length;
    }

    const isValid = issues.filter(i => i.type === 'error').length === 0;

    return {
      fileId,
      fileName: fileInfo.fileName,
      type: fileInfo.type,
      isValid,
      issues,
      stats: {
        totalRecords: data.length,
        validRecords,
        emptyFields,
        fieldsCoverage
      }
    };
  }

  /**
   * Analiza todos los archivos en caché
   * @param month - Mes a filtrar (01-12), opcional
   * @param year - Año a filtrar (YYYY), opcional
   */
  async analyzeAllFiles(month?: string, year?: string): Promise<AnalysisReport> {
    const metadata = await cacheService.getMetadata();
    let filesToAnalyze = metadata.files;

    // Filtrar archivos por fecha si se especifica
    if (month || year) {
      filesToAnalyze = metadata.files.filter(file => {
        // Usar el año y mes que el usuario seleccionó al subir, no la fecha de upload
        const fileMonth = file.month.toString().padStart(2, '0');
        const fileYear = file.year.toString();

        const matchesMonth = !month || fileMonth === month;
        const matchesYear = !year || fileYear === year;

        return matchesMonth && matchesYear;
      });
    }

    const fileValidations: FileValidationResult[] = [];

    // Validar cada archivo
    for (const file of filesToAnalyze) {
      const validation = await this.validateFile(file.id);
      fileValidations.push(validation);
    }

    // Identificar tipos de archivos faltantes
    const loadedTypes = new Set(filesToAnalyze.map(f => f.type));
    const missingFileTypes = FILE_SCHEMAS
      .map(schema => schema.type)
      .filter(type => !loadedTypes.has(type));

    // Calcular métricas - CORREGIDO
    const validFiles = fileValidations.filter(v => 
      v.issues.filter(i => i.type === 'error').length === 0
    ).length;
    
    const filesWithErrors = fileValidations.filter(v => 
      v.issues.some(i => i.type === 'error')
    ).length;
    
    const filesWithWarnings = fileValidations.filter(v => 
      v.issues.some(i => i.type === 'warning') && !v.issues.some(i => i.type === 'error')
    ).length;
    
    const filesWithIssues = filesWithErrors + filesWithWarnings;
    
    const completeness = FILE_SCHEMAS.length > 0 
      ? ((loadedTypes.size / FILE_SCHEMAS.length) * 100) 
      : 0;

    // Generar recomendaciones
    const recommendations: string[] = [];

    if (missingFileTypes.length > 0) {
      recommendations.push(
        `Cargar ${missingFileTypes.length} tipos de archivos faltantes: ${missingFileTypes.slice(0, 3).join(', ')}${missingFileTypes.length > 3 ? '...' : ''}`
      );
    }
    
    if (filesWithErrors > 0) {
      recommendations.push(
        `Corregir errores críticos en ${filesWithErrors} archivo(s) antes de proceder con el análisis`
      );
    }

    const filesWithLowCoverage = fileValidations.filter(v => {
      const coverageValues = Object.values(v.stats.fieldsCoverage);
      if (coverageValues.length === 0) return false;
      const avgCoverage = coverageValues.reduce((a, b) => a + b, 0) / coverageValues.length;
      return avgCoverage < 70;
    });

    if (filesWithLowCoverage.length > 0) {
      recommendations.push(
        `Revisar ${filesWithLowCoverage.length} archivo(s) con baja cobertura de datos (<70%)`
      );
    }

    if (completeness < 50) {
      recommendations.push(
        `Completitud actual: ${completeness.toFixed(1)}%. Se recomienda cargar más tipos de archivos para análisis completo`
      );
    }

    const groupAccumulator = new Map<string, {
      totalTypes: number;
      loadedTypes: Set<string>;
      missingTypes: string[];
    }>();

    FILE_SCHEMAS.forEach(schema => {
      const groupName = FILE_TYPE_GROUPS[schema.type] || 'Otros';
      if (!groupAccumulator.has(groupName)) {
        groupAccumulator.set(groupName, {
          totalTypes: 0,
          loadedTypes: new Set<string>(),
          missingTypes: []
        });
      }

      const accumulator = groupAccumulator.get(groupName)!;
      accumulator.totalTypes += 1;

      if (loadedTypes.has(schema.type)) {
        accumulator.loadedTypes.add(schema.type);
      } else {
        accumulator.missingTypes.push(schema.type);
      }
    });

    const groupSummaries: GroupSummary[] = Array.from(groupAccumulator.entries())
      .map(([group, info]) => ({
        group,
        totalTypes: info.totalTypes,
        loadedTypes: Array.from(info.loadedTypes).sort(),
        missingTypes: info.missingTypes.sort(),
        completion: info.totalTypes > 0
          ? (info.loadedTypes.size / info.totalTypes) * 100
          : 0
      }))
      .sort((a, b) => {
        const orderA = FILE_GROUP_ORDER.indexOf(a.group);
        const orderB = FILE_GROUP_ORDER.indexOf(b.group);
        const safeA = orderA === -1 ? FILE_GROUP_ORDER.length : orderA;
        const safeB = orderB === -1 ? FILE_GROUP_ORDER.length : orderB;

        if (safeA !== safeB) {
          return safeA - safeB;
        }

        return a.group.localeCompare(b.group);
      });

    const coverageMap = new Map<number, Map<number, Set<string>>>();

    filesToAnalyze.forEach(file => {
      const fileYear = Number(file.year);
      const fileMonth = Number(file.month);

      if (!Number.isFinite(fileYear) || !Number.isFinite(fileMonth)) {
        return;
      }

      if (!coverageMap.has(fileYear)) {
        coverageMap.set(fileYear, new Map());
      }

      const monthsMap = coverageMap.get(fileYear)!;

      if (!monthsMap.has(fileMonth)) {
        monthsMap.set(fileMonth, new Set());
      }

      monthsMap.get(fileMonth)!.add(file.type);
    });

    if (year) {
      const numericYear = parseInt(year, 10);
      if (!Number.isNaN(numericYear) && !coverageMap.has(numericYear)) {
        coverageMap.set(numericYear, new Map());
      }
    }

    const yearCoverage: YearCoverageSummary[] = Array.from(coverageMap.entries())
      .map(([yearKey, monthsMap]) => {
        const detail: YearCoverageDetail[] = MONTH_NAMES.map((label, index) => {
          const monthNumber = index + 1;
          const typesSet = monthsMap.get(monthNumber);
          const types = typesSet ? Array.from(typesSet).sort() : [];
          const hasData = types.length > 0;

          return {
            month: monthNumber,
            monthLabel: label,
            hasData,
            types
          };
        });

        const monthsWithData = detail.filter(item => item.hasData).length;
        const monthsMissing = detail.length - monthsWithData;
        const completion = detail.length > 0 ? (monthsWithData / detail.length) * 100 : 0;

        return {
          year: yearKey,
          monthsWithData,
          monthsMissing,
          completion,
          detail
        };
      })
      .sort((a, b) => b.year - a.year);

    return {
      totalFiles: filesToAnalyze.length,
      validFiles,
      filesWithIssues,
      filesWithErrors,
      filesWithWarnings,
      missingFileTypes,
      fileValidations,
      recommendations,
      completeness,
      groupSummaries,
      yearCoverage
    };
  }

  /**
   * Genera un reporte detallado de validación
   */
  async generateValidationReport(): Promise<string> {
    const analysis = await this.analyzeAllFiles();
    
    let report = '=== REPORTE DE VALIDACIÓN DE ARCHIVOS ===\n\n';
    
    report += `📊 RESUMEN GENERAL\n`;
    report += `  Total de archivos: ${analysis.totalFiles}\n`;
    report += `  Archivos válidos: ${analysis.validFiles}\n`;
    report += `  Archivos con problemas: ${analysis.filesWithIssues}\n`;
    report += `  Completitud: ${analysis.completeness.toFixed(1)}%\n\n`;

    if (analysis.missingFileTypes.length > 0) {
      report += `⚠️  TIPOS DE ARCHIVOS FALTANTES (${analysis.missingFileTypes.length}):\n`;
      analysis.missingFileTypes.forEach(type => {
        const schema = FILE_SCHEMAS.find(s => s.type === type);
        report += `  - ${type}${schema ? ': ' + schema.description : ''}\n`;
      });
      report += '\n';
    }

    report += `📋 VALIDACIÓN POR ARCHIVO:\n\n`;
    analysis.fileValidations.forEach(validation => {
      const statusIcon = validation.isValid ? '✅' : '❌';
      report += `${statusIcon} ${validation.fileName} (${validation.type})\n`;
      report += `   Registros: ${validation.stats.totalRecords} (${validation.stats.validRecords} válidos)\n`;
      
      if (validation.issues.length > 0) {
        validation.issues.forEach(issue => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          report += `   ${icon} ${issue.message}\n`;
        });
      }
      report += '\n';
    });

    if (analysis.recommendations.length > 0) {
      report += `💡 RECOMENDACIONES:\n`;
      analysis.recommendations.forEach((rec, i) => {
        report += `  ${i + 1}. ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * Obtiene tipos de archivos esperados pero no cargados
   */
  async getMissingFileTypes(): Promise<{ type: string; description: string }[]> {
    const metadata = await cacheService.getMetadata();
    const loadedTypes = new Set(metadata.files.map(f => f.type));
    
    return FILE_SCHEMAS
      .filter(schema => !loadedTypes.has(schema.type))
      .map(schema => ({
        type: schema.type,
        description: schema.description
      }));
  }

  /**
   * Obtiene estadísticas de validación por tipo de archivo
   */
  async getValidationStatsByType(): Promise<{ [type: string]: any }> {
    const analysis = await this.analyzeAllFiles();
    const statsByType: { [type: string]: any } = {};

    analysis.fileValidations.forEach(validation => {
      if (!statsByType[validation.type]) {
        statsByType[validation.type] = {
          fileCount: 0,
          totalRecords: 0,
          validRecords: 0,
          hasErrors: false,
          hasWarnings: false
        };
      }

      statsByType[validation.type].fileCount++;
      statsByType[validation.type].totalRecords += validation.stats.totalRecords;
      statsByType[validation.type].validRecords += validation.stats.validRecords;
      
      if (validation.issues.some(i => i.type === 'error')) {
        statsByType[validation.type].hasErrors = true;
      }
      if (validation.issues.some(i => i.type === 'warning')) {
        statsByType[validation.type].hasWarnings = true;
      }
    });

    return statsByType;
  }
}

export const fileValidationService = new FileValidationService();
export type {
  FileValidationResult,
  AnalysisReport,
  ValidationIssue,
  FileSchema,
  GroupSummary,
  YearCoverageSummary,
  YearCoverageDetail
};
export { FILE_SCHEMAS };
