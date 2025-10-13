import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, File, AlertCircle, CheckCircle, X } from 'lucide-react';
import { cacheService, CachedFile } from '../services/CacheService';
import { fileValidationService } from '../services/FileValidationService';
import { headerNormalizationService } from '../services/HeaderNormalizationService';

interface FileWithMetadata {
  file: File;
  year: number;
  month: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'skipped';
  error?: string;
  recordCount?: number;
}

// Tipos de archivos CSV conocidos del sistema SICOP
// ⚠️ SINCRONIZADO CON DataManager.ts - MAPEO_ARCHIVOS (25 archivos exactos)
const CSV_TYPES = [
  'InstitucionesRegistradas',
  'Proveedores_unido',  // Archivo unificado de proveedores (reemplaza a Proveedores.csv)
  'ProcedimientoAdjudicacion',
  'ProcedimientoADM',
  'Sistemas',
  'SistemaEvaluacionOfertas',
  'DetalleCarteles',
  'DetalleLineaCartel',
  'FechaPorEtapas',
  'Ofertas',
  'LineasOfertadas',
  'LineasRecibidas',
  'InvitacionProcedimiento',
  'LineasAdjudicadas',
  'AdjudicacionesFirme',
  'Contratos',
  'LineasContratadas',
  'OrdenPedido',
  'Recepciones',
  'ReajustePrecios',
  'Garantias',
  'RecursosObjecion',
  'FuncionariosInhibicion',
  'SancionProveedores',
  'Remates',
];

// Archivos opcionales (no críticos para la funcionalidad principal)
// ⚠️ SINCRONIZADO CON DataManager.ts - ARCHIVOS_OPCIONALES
const ARCHIVOS_OPCIONALES = new Set([
  'InvitacionProcedimiento', // Solo enriquece nombres (0.95% de valor agregado)
  'Garantias',               // Datos complementarios
  'RecursosObjecion',        // Datos complementarios
  'SancionProveedores',      // Datos complementarios
  'Remates'                  // Datos complementarios
]);

export const FileUploader: React.FC<{
  onUploadComplete?: (uploadedFiles: CachedFile[]) => void;
}> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // NUEVO: Año y mes globales para todos los archivos
  const [globalYear, setGlobalYear] = useState(currentYear);
  const [globalMonth, setGlobalMonth] = useState(currentMonth);

  /**
   * Detecta el tipo de archivo CSV basándose en el nombre
   */
  const detectFileType = (fileName: string): string => {
    const baseName = fileName.replace(/\.[^/.]+$/i, '');
    const normalizedName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const matchedType = CSV_TYPES.find(type => {
      const normalizedType = type.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedName.includes(normalizedType);
    });

    if (!matchedType) {
      console.warn(`❓ No se pudo detectar el tipo de archivo para "${fileName}": usando "Desconocido"`);
    }

    return matchedType || 'Desconocido';
  };

  /**
   * Maneja la selección de archivos
   */
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithMetadata[] = Array.from(selectedFiles)
      .filter(file => file.name.endsWith('.csv'))
      .map(file => ({
        file,
        year: globalYear,  // Usar año global
        month: globalMonth, // Usar mes global
        type: detectFileType(file.name),
        status: 'pending' as const,
      }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [globalYear, globalMonth]); // Dependencias actualizadas

  /**
   * Maneja el drag and drop
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const preprocessCsvChunk = useCallback((chunk: string, delimiterHint?: string) => {
    if (!chunk) return chunk;

    const newline = chunk.includes('\r\n') ? '\r\n' : '\n';
    const delimiter = delimiterHint || (chunk.includes(';') ? ';' : ',');

    // Eliminar BOM si existe
    let text = chunk.replace(/^\uFEFF/, '');
    
    // Dividir en líneas
    let lines = text.split(/\r?\n/);
    
    const countUnquotedDelimiters = (line: string, sep: string) => {
      let count = 0;
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          const nextChar = line[i + 1];
          if (inQuotes && nextChar === '"') {
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (!inQuotes && char === sep) {
          count += 1;
        }
      }

      return count;
    };

    const unwrapLine = (line: string) => {
      const trimmed = line.trim();
      if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/""/g, '"');
      }
      return line;
    };

    // Detectar si todas las líneas están envueltas en comillas
    // (caso especial de archivos como SancionProveedores.csv)
    const sampleLines = lines
      .slice(0, Math.min(lines.length, 10))
      .filter(line => line.trim().length > 0);

    const shouldUnwrapAllLines = sampleLines.length > 0 && sampleLines.every(rawLine => {
      const trimmed = rawLine.trim();
      return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"') &&
        countUnquotedDelimiters(trimmed, delimiter) === 0;
    });

    const dataSample = lines
      .slice(1, Math.min(lines.length, 11))
      .filter(line => line.trim().length > 0);

    const shouldUnwrapDataLines = !shouldUnwrapAllLines &&
      dataSample.length > 0 &&
      dataSample.every(rawLine => {
        const trimmed = rawLine.trim();
        return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"') &&
          countUnquotedDelimiters(trimmed, delimiter) === 0;
      });

    if (shouldUnwrapAllLines) {
      console.log('🔧 Todas las líneas están envueltas en comillas, desempaquetando...');
      lines = lines.map(line => unwrapLine(line));
    } else if (shouldUnwrapDataLines) {
      console.log('🔧 Registros envueltos en comillas dobles detectados, desempaquetando registros...');
      lines = lines.map((line, index) =>
        index === 0 ? line : unwrapLine(line)
      );
    }
    
    // Detectar y eliminar línea de título corrupta
    // (línea que tiene solo un campo cuando se esperan múltiples)
    if (lines.length > 1) {
      const first = lines[0]?.trim() ?? '';
      const second = lines[1]?.trim() ?? '';

      if (first && second) {
        const firstDelimiters = countUnquotedDelimiters(first, delimiter);
        const secondDelimiters = countUnquotedDelimiters(second, delimiter);

        if (firstDelimiters === 0 && secondDelimiters > 0) {
          console.log(`🔧 Eliminando línea de título corrupta: "${first.substring(0, 50)}..."`);
          lines.shift();
        }
      }
    }

    // NO eliminar comillas del contenido completo - PapaParse las necesita
    // para manejar campos multi-línea correctamente (excepto cuando ya desempaquetamos arriba)
    
    return lines.join(newline);
  }, []);

  const detectDelimiter = useCallback(async (file: File, fileType: string): Promise<string> => {
    const defaultDelimiter = fileType === 'Proveedores_unido' ? ';' : ',';

    try {
      const sampleText = await file.slice(0, 8192).text();
      const lines = sampleText
        .split(/\r?\n|\r/g)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length < 2) {
        return defaultDelimiter;
      }

      // Función para contar delimitadores fuera de comillas
      const countUnquotedDelimiters = (line: string, delimiter: string): number => {
        let count = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            const nextChar = line[i + 1];
            // Detectar comillas escapadas ""
            if (inQuotes && nextChar === '"') {
              i++; // Saltar la siguiente comilla
              continue;
            }
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            count++;
          }
        }

        return count;
      };

      // Usar la primera línea (header) y algunas líneas de datos para detectar
      const headerLine = lines[0];
      const dataLines = lines.slice(1, Math.min(lines.length, 6));

      const semicolonsInHeader = countUnquotedDelimiters(headerLine, ';');
      const commasInHeader = countUnquotedDelimiters(headerLine, ',');

      // Si el header tiene más de un delimitador de un tipo, usar ese
      if (semicolonsInHeader > 0 && semicolonsInHeader > commasInHeader) {
        // Verificar consistencia en líneas de datos
        const avgSemicolonsInData = dataLines.reduce((sum, line) => 
          sum + countUnquotedDelimiters(line, ';'), 0) / Math.max(dataLines.length, 1);
        
        if (avgSemicolonsInData >= semicolonsInHeader * 0.8) {
          return ';';
        }
      }

      if (commasInHeader > 0 && commasInHeader > semicolonsInHeader) {
        // Verificar consistencia en líneas de datos
        const avgCommasInData = dataLines.reduce((sum, line) => 
          sum + countUnquotedDelimiters(line, ','), 0) / Math.max(dataLines.length, 1);
        
        if (avgCommasInData >= commasInHeader * 0.8) {
          return ',';
        }
      }

      return defaultDelimiter;
    } catch (error) {
      console.warn('No fue posible detectar el delimitador, usando valor por defecto:', defaultDelimiter, error);
      return defaultDelimiter;
    }
  }, []);

  const parseCsv = useCallback(async (
    file: File,
    options: { delimiter?: string }
  ): Promise<{ data: any[]; delimiterUsed: string; warnings: Papa.ParseError[] }> => {
    return new Promise(async (resolve, reject) => {
      // Para archivos que pueden tener saltos de línea en campos citados,
      // leemos todo el contenido primero y lo preprocesamos
      const fullText = await file.text();
      const preprocessedText = preprocessCsvChunk(fullText, options.delimiter);
      
      const config: Papa.ParseConfig<any> = {
        header: true,
        skipEmptyLines: true,
        quoteChar: '"',
        escapeChar: '"',
        // NUEVO: Permitir parsing más tolerante con quotes malformados
        comments: false,
        complete: (results: Papa.ParseResult<any>) => {
          const warnings = results.errors.filter(error => 
            error.type === 'FieldMismatch' || error.type === 'Quotes'
          );
          const fatalErrors = results.errors.filter(error => 
            error.type !== 'FieldMismatch' && error.type !== 'Quotes'
          );

          // Si solo hay errores de quotes, intentar recuperar los datos
          if (fatalErrors.length === 0 && results.data && results.data.length > 0) {
            resolve({
              data: results.data as any[],
              delimiterUsed: results.meta.delimiter || options.delimiter || ',',
              warnings,
            });
            return;
          }

          if (fatalErrors.length > 0) {
            const errorMessage = fatalErrors[0].message || 'Error desconocido';
            reject(new Error(`Error parseando CSV (${fatalErrors[0].type}): ${errorMessage}`));
            return;
          }

          resolve({
            data: results.data as any[],
            delimiterUsed: results.meta.delimiter || options.delimiter || ',',
            warnings,
          });
        }
      };

      if (options.delimiter) {
        config.delimiter = options.delimiter;
      }

      Papa.parse(preprocessedText, config);
    });
  }, [preprocessCsvChunk]);

  const parseCsvWithFallback = useCallback(async (
    fileMetadata: FileWithMetadata
  ): Promise<{ data: any[]; delimiterUsed: string; warnings: Papa.ParseError[] }> => {
    const primaryDelimiter = await detectDelimiter(fileMetadata.file, fileMetadata.type);
    const candidateDelimiters = [primaryDelimiter, primaryDelimiter === ';' ? ',' : ';'];
    let lastError: Error | null = null;
    let bestResult: { data: any[]; delimiterUsed: string; warnings: Papa.ParseError[] } | null = null;

    for (const delimiter of candidateDelimiters) {
      try {
        const result = await parseCsv(fileMetadata.file, { delimiter });
        
        // Si obtuvimos datos, aunque haya advertencias, es un buen resultado
        if (result.data && result.data.length > 0) {
          // Si no hay errores fatales, retornar inmediatamente
          const hasOnlyWarnings = result.warnings.every(w => 
            w.type === 'FieldMismatch' || w.type === 'Quotes'
          );
          
          if (hasOnlyWarnings || result.warnings.length === 0) {
            console.log(`✅ CSV ${fileMetadata.file.name} parseado con delimitador "${delimiter}"`);
            return result;
          }
          
          // Guardar como mejor resultado si aún no tenemos uno
          if (!bestResult || result.data.length > bestResult.data.length) {
            bestResult = result;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Fallo parseando con delimitador "${delimiter}" para ${fileMetadata.file.name}:`, lastError.message);
      }
    }

    // Si tenemos un mejor resultado (aunque tenga advertencias), usarlo
    if (bestResult && bestResult.data.length > 0) {
      console.log(`✅ CSV ${fileMetadata.file.name} parseado con delimitador "${bestResult.delimiterUsed}" (con ${bestResult.warnings.length} advertencias)`);
      return bestResult;
    }

    // Último intento con detección automática
    try {
      const autoResult = await parseCsv(fileMetadata.file, {});
      if (autoResult.data && autoResult.data.length > 0) {
        console.info(`✅ Se utilizó detección automática de delimitador para ${fileMetadata.file.name}: ${autoResult.delimiterUsed}`);
        return autoResult;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error parseando CSV tras probar delimitadores ${candidateDelimiters.join(', ')}: ${reason}`);
    }

    throw new Error(`No se pudo parsear el archivo ${fileMetadata.file.name} después de intentar múltiples métodos`);
  }, [detectDelimiter, parseCsv]);

  /**
   * Actualiza los metadatos de un archivo
   */
  const updateFileMetadata = (
    index: number,
    updates: Partial<FileWithMetadata>
  ) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, ...updates } : f
    ));
  };

  /**
   * Elimina un archivo de la lista
   */
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Procesa y sube un archivo individual
   */
  const uploadFile = async (fileMetadata: FileWithMetadata, index: number) => {
    updateFileMetadata(index, { status: 'uploading' });

    try {
      const { data, delimiterUsed, warnings } = await parseCsvWithFallback(fileMetadata);

      if (warnings.length > 0) {
        console.warn(`⚠️ Advertencias al parsear ${fileMetadata.file.name} (${delimiterUsed}):`, warnings);
      } else {
        console.log(`✅ CSV ${fileMetadata.file.name} parseado con delimitador "${delimiterUsed}"`);
      }

      // NUEVO: Normalizar los headers de los datos
      const normalizedData = headerNormalizationService.normalizeRecords(
        data,
        fileMetadata.type
      );

      console.log(`✅ Normalizando headers para ${fileMetadata.type}:`, {
        registrosOriginales: data.length,
        registrosNormalizados: normalizedData.length,
        primerRegistroOriginal: data[0] ? Object.keys(data[0]) : [],
        primerRegistroNormalizado: normalizedData[0] ? Object.keys(normalizedData[0]) : []
      });

      // Guardar en caché con datos normalizados
      await cacheService.saveFile(
        fileMetadata.file.name,
        normalizedData,
        fileMetadata.year,
        fileMetadata.month,
        fileMetadata.type
      );

      updateFileMetadata(index, { 
        status: 'success',
        recordCount: normalizedData.length 
      });
    } catch (error) {
      const esOpcional = ARCHIVOS_OPCIONALES.has(fileMetadata.type);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Si el archivo es opcional y el error es por tamaño, marcarlo como "skipped"
      if (esOpcional && (errorMessage.includes('string length') || errorMessage.includes('tamaño'))) {
        updateFileMetadata(index, { 
          status: 'skipped',
          error: 'Archivo opcional no cargado (excede límite de tamaño)'
        });
        console.info(`ℹ️ ${fileMetadata.type} omitido (archivo opcional): ${errorMessage}`);
      } else {
        updateFileMetadata(index, { 
          status: 'error',
          error: errorMessage
        });
        console.error(`❌ Error cargando ${fileMetadata.type}:`, errorMessage);
      }
    }
  };

  /**
   * Sube todos los archivos pendientes
   */
  const uploadAllFiles = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    // Generar reporte de validación automáticamente
    const successCount = files.filter(f => f.status === 'success').length;
    if (successCount > 0) {
      console.log('Generando reporte de validación...');
      try {
        const report = await fileValidationService.generateValidationReport();
        console.log('=== REPORTE DE VALIDACIÓN ===');
        console.log(report);
        
        // Mostrar resumen en consola
        const analysis = await fileValidationService.analyzeAllFiles();
        if (analysis.missingFileTypes.length > 0) {
          console.warn(`⚠️ Tipos de archivos faltantes: ${analysis.missingFileTypes.join(', ')}`);
        }
        if (analysis.recommendations.length > 0) {
          console.info('💡 Recomendaciones:');
          analysis.recommendations.forEach((rec, i) => {
            console.info(`  ${i + 1}. ${rec}`);
          });
        }
      } catch (error) {
        console.error('Error generando reporte de validación:', error);
      }
    }

    // Notificar cuando termine
    const successFiles = files.filter(f => f.status === 'success');
    if (onUploadComplete && successFiles.length > 0) {
      const metadata = await cacheService.getMetadata();
      onUploadComplete(metadata.files);
    }
  };

  /**
   * Formatea el tamaño del archivo
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  return (
    <div className="file-uploader">
      <style>{`
        .file-uploader {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .global-metadata {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .global-metadata h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 1.1em;
        }

        .global-metadata-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 10px;
        }

        .global-metadata-info {
          margin: 10px 0 0 0;
          color: #666;
          font-size: 0.9em;
          font-style: italic;
        }

        .upload-zone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          background: #fafafa;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-zone.drag-active {
          border-color: #4CAF50;
          background: #e8f5e9;
        }

        .upload-zone:hover {
          border-color: #999;
          background: #f5f5f5;
        }

        .upload-icon {
          margin: 0 auto 20px;
          color: #666;
        }

        .upload-input {
          display: none;
        }

        .files-list {
          margin-top: 30px;
        }

        .file-item {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .file-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .file-name {
          font-weight: 500;
          color: #333;
        }

        .file-size {
          color: #666;
          font-size: 0.9em;
        }

        .file-metadata {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 10px;
        }

        .metadata-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .metadata-label {
          font-size: 0.85em;
          color: #666;
          font-weight: 500;
        }

        .metadata-select,
        .metadata-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95em;
          background: white;
        }

        .metadata-select:focus,
        .metadata-input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .metadata-value {
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 0.95em;
          color: #666;
        }

        .file-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .status-pending {
          background: #fff9e6;
          color: #f57c00;
        }

        .status-uploading {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status-success {
          background: #e8f5e9;
          color: #388e3c;
        }

        .status-skipped {
          background: #fff3e0;
          color: #f57c00;
        }

        .status-error {
          background: #ffebee;
          color: #d32f2f;
        }

        .remove-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .remove-btn:hover {
          color: #d32f2f;
        }

        .upload-actions {
          margin-top: 20px;
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .error-message {
          color: #d32f2f;
          font-size: 0.85em;
          margin-top: 5px;
        }
      `}</style>

      <h2>Cargar Archivos CSV</h2>
      
      {/* Selectores globales de año y mes */}
      <div className="global-metadata">
        <h3>Período de Datos</h3>
        <div className="global-metadata-fields">
          <div className="metadata-field">
            <label className="metadata-label">Año</label>
            <select
              className="metadata-select"
              value={globalYear}
              onChange={(e) => setGlobalYear(parseInt(e.target.value))}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="metadata-field">
            <label className="metadata-label">Mes</label>
            <select
              className="metadata-select"
              value={globalMonth}
              onChange={(e) => setGlobalMonth(parseInt(e.target.value))}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="global-metadata-info">
          Este período se aplicará a todos los archivos que cargues en este grupo
        </p>
      </div>
      
      {/* Zona de carga */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload size={48} className="upload-icon" />
        <h3>Arrastra archivos CSV aquí</h3>
        <p>o haz clic para seleccionar archivos</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".csv"
          className="upload-input"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="files-list">
          <h3>Archivos a cargar ({files.length})</h3>
          
          {files.map((fileData, index) => (
            <div key={index} className="file-item">
              <div className="file-header">
                <div className="file-info">
                  <File size={20} />
                  <div>
                    <div className="file-name">{fileData.file.name}</div>
                    <div className="file-size">
                      {formatFileSize(fileData.file.size)}
                      {fileData.recordCount && ` • ${fileData.recordCount.toLocaleString()} registros`}
                    </div>
                  </div>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeFile(index)}
                  disabled={fileData.status === 'uploading'}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="file-metadata">
                <div className="metadata-field">
                  <label className="metadata-label">Tipo de archivo</label>
                  <select
                    className="metadata-select"
                    value={fileData.type}
                    onChange={(e) => updateFileMetadata(index, { 
                      type: e.target.value 
                    })}
                    disabled={fileData.status !== 'pending'}
                  >
                    {CSV_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="metadata-field">
                  <label className="metadata-label">Período</label>
                  <div className="metadata-value">
                    {months.find(m => m.value === fileData.month)?.label} {fileData.year}
                  </div>
                </div>
              </div>

              <div className={`file-status status-${fileData.status}`}>
                {fileData.status === 'pending' && (
                  <>
                    <AlertCircle size={16} />
                    <span>Pendiente</span>
                  </>
                )}
                {fileData.status === 'uploading' && (
                  <>
                    <div className="spinner" />
                    <span>Subiendo...</span>
                  </>
                )}
                {fileData.status === 'success' && (
                  <>
                    <CheckCircle size={16} />
                    <span>Cargado exitosamente</span>
                  </>
                )}
                {fileData.status === 'skipped' && (
                  <>
                    <AlertCircle size={16} />
                    <span>No cargado (opcional)</span>
                  </>
                )}
                {fileData.status === 'error' && (
                  <>
                    <AlertCircle size={16} />
                    <span>Error al cargar</span>
                  </>
                )}
              </div>

              {fileData.error && (
                <div className="error-message">{fileData.error}</div>
              )}
            </div>
          ))}

          <div className="upload-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setFiles([])}
              disabled={files.some(f => f.status === 'uploading')}
            >
              Limpiar lista
            </button>
            <button
              className="btn btn-primary"
              onClick={uploadAllFiles}
              disabled={
                files.length === 0 ||
                files.every(f => f.status !== 'pending') ||
                files.some(f => f.status === 'uploading')
              }
            >
              <Upload size={20} />
              Cargar archivos ({files.filter(f => f.status === 'pending').length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
