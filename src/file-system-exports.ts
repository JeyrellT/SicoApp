/**
 * Sistema de Gestión de Archivos CSV para SICOP
 * 
 * Este módulo exporta todos los componentes, servicios y hooks
 * necesarios para el sistema de carga y consolidación de archivos CSV.
 */

// Componentes principales
export { FileUploader } from './components/FileUploader';
export { CacheManager } from './components/CacheManager';
export { DataManagementHub } from './components/DataManagementHub';
export { WelcomeScreenModern } from './components/WelcomeScreenModern';
export { ValidationReportPanel } from './components/ValidationReportPanel';

// Servicios
export { cacheService } from './services/CacheService';
export { consolidationService } from './services/DataConsolidationService';
export { dataLoaderService } from './services/DataLoaderService';
export { fileValidationService } from './services/FileValidationService';

// Hooks personalizados
export { 
  useFileCache, 
  useDataConsolidation, 
  useSicopData 
} from './hooks/useSicopData';

// Tipos TypeScript
export type { 
  CachedFile, 
  CachedData, 
  CacheMetadata 
} from './services/CacheService';

export type { 
  ConsolidationOptions, 
  ConsolidatedResult 
} from './services/DataConsolidationService';
