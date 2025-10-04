/**
 * CacheService - Maneja el almacenamiento en caché de archivos CSV
 * Organiza datos por año y mes usando IndexedDB para grandes volúmenes
 */

interface CachedFile {
  id: string;
  fileName: string;
  year: number;
  month: number;
  uploadDate: string;
  size: number;
  recordCount: number;
  type: string; // Tipo de archivo CSV (ej: 'Proveedores', 'Contratos', etc.)
}

interface CachedData {
  id: string;          // ID único para IndexedDB
  fileInfo: CachedFile;
  data: any[];
}

interface CacheMetadata {
  files: CachedFile[];
  lastUpdated: string;
  totalRecords: number;
}

class CacheService {
  private dbName = 'SicopCache';
  private dbVersion = 2; // Incrementado para agregar índices
  private db: IDBDatabase | null = null;
  private metadataKey = 'cache_metadata';

  /**
   * Inicializa la base de datos IndexedDB
   */
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para los datos de archivos CSV
        if (!db.objectStoreNames.contains('csvData')) {
          const csvStore = db.createObjectStore('csvData', { keyPath: 'id' });
          
          // Crear índices para búsquedas optimizadas
          csvStore.createIndex('year', 'fileInfo.year', { unique: false });
          csvStore.createIndex('month', 'fileInfo.month', { unique: false });
          csvStore.createIndex('type', 'fileInfo.type', { unique: false });
          csvStore.createIndex('yearMonth', ['fileInfo.year', 'fileInfo.month'], { unique: false });
          csvStore.createIndex('yearType', ['fileInfo.year', 'fileInfo.type'], { unique: false });
          csvStore.createIndex('uploadDate', 'fileInfo.uploadDate', { unique: false });
        } else if (event.oldVersion < 2) {
          // Actualizar store existente con nuevos índices
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const csvStore = transaction.objectStore('csvData');
          
          // Verificar y crear índices si no existen
          if (!csvStore.indexNames.contains('year')) {
            csvStore.createIndex('year', 'fileInfo.year', { unique: false });
          }
          if (!csvStore.indexNames.contains('month')) {
            csvStore.createIndex('month', 'fileInfo.month', { unique: false });
          }
          if (!csvStore.indexNames.contains('type')) {
            csvStore.createIndex('type', 'fileInfo.type', { unique: false });
          }
          if (!csvStore.indexNames.contains('yearMonth')) {
            csvStore.createIndex('yearMonth', ['fileInfo.year', 'fileInfo.month'], { unique: false });
          }
          if (!csvStore.indexNames.contains('yearType')) {
            csvStore.createIndex('yearType', ['fileInfo.year', 'fileInfo.type'], { unique: false });
          }
          if (!csvStore.indexNames.contains('uploadDate')) {
            csvStore.createIndex('uploadDate', 'fileInfo.uploadDate', { unique: false });
          }
        }
        
        // Store para metadatos
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      };
    });
  }

  /**
   * Guarda un archivo CSV en caché
   */
  async saveFile(
    fileName: string,
    data: any[],
    year: number,
    month: number,
    type: string
  ): Promise<string> {
    if (!this.db) await this.initDB();

    const fileId = `${type}_${year}_${month}_${Date.now()}`;
    const fileInfo: CachedFile = {
      id: fileId,
      fileName,
      year,
      month,
      uploadDate: new Date().toISOString(),
      size: new Blob([JSON.stringify(data)]).size,
      recordCount: data.length,
      type,
    };

    const cachedData: CachedData = {
      id: fileId,
      fileInfo,
      data,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData', 'metadata'], 'readwrite');
      const csvStore = transaction.objectStore('csvData');

      // Guardar datos del archivo
      const addRequest = csvStore.add(cachedData);

      addRequest.onsuccess = async () => {
        // Actualizar metadatos
        await this.updateMetadata(fileInfo);
        resolve(fileId);
      };

      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  /**
   * Actualiza los metadatos después de agregar un archivo
   */
  private async updateMetadata(newFile: CachedFile): Promise<void> {
    const metadata = await this.getMetadata();
    metadata.files.push(newFile);
    metadata.lastUpdated = new Date().toISOString();
    metadata.totalRecords += newFile.recordCount;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put(metadata, this.metadataKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene los metadatos del caché
   */
  async getMetadata(): Promise<CacheMetadata> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(this.metadataKey);

      request.onsuccess = () => {
        const metadata = request.result || {
          files: [],
          lastUpdated: new Date().toISOString(),
          totalRecords: 0,
        };
        resolve(metadata);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene datos de un archivo específico
   */
  async getFile(fileId: string): Promise<CachedData | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los archivos de un año específico usando índice
   */
  async getFilesByYear(year: number): Promise<CachedData[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const index = store.index('year');
      const request = index.getAll(year);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los archivos de un mes específico usando índice compuesto
   */
  async getFilesByMonth(year: number, month: number): Promise<CachedData[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const index = store.index('yearMonth');
      const request = index.getAll([year, month]);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los archivos de un tipo específico usando índice
   */
  async getFilesByType(type: string): Promise<CachedData[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene archivos de un año y tipo específico usando índice compuesto
   */
  async getFilesByYearAndType(year: number, type: string): Promise<CachedData[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const index = store.index('yearType');
      const request = index.getAll([year, type]);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene archivos filtrados por año, mes y tipo con optimización de índices
   */
  async getFilteredFiles(
    year?: number,
    month?: number,
    type?: string
  ): Promise<CachedData[]> {
    if (!this.db) await this.initDB();

    // Usar índices compuestos cuando sea posible para mejor rendimiento
    if (year !== undefined && month !== undefined && type === undefined) {
      // Usar índice compuesto yearMonth
      return this.getFilesByMonth(year, month);
    }

    if (year !== undefined && type !== undefined && month === undefined) {
      // Usar índice compuesto yearType
      return this.getFilesByYearAndType(year, type);
    }

    if (year !== undefined && month === undefined && type === undefined) {
      // Usar índice year
      return this.getFilesByYear(year);
    }

    if (type !== undefined && year === undefined && month === undefined) {
      // Usar índice type
      return this.getFilesByType(type);
    }

    // Para otros casos (ej: year + month + type), usar cursor para filtrado
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData'], 'readonly');
      const store = transaction.objectStore('csvData');
      const results: CachedData[] = [];

      // Elegir el mejor índice según los filtros
      let cursorRequest: IDBRequest;
      
      if (year !== undefined && month !== undefined) {
        // Usar índice yearMonth y filtrar por type
        const index = store.index('yearMonth');
        cursorRequest = index.openCursor(IDBKeyRange.only([year, month]));
      } else if (year !== undefined) {
        // Usar índice year
        const index = store.index('year');
        cursorRequest = index.openCursor(IDBKeyRange.only(year));
      } else if (type !== undefined) {
        // Usar índice type
        const index = store.index('type');
        cursorRequest = index.openCursor(IDBKeyRange.only(type));
      } else {
        // Sin filtros, obtener todos
        cursorRequest = store.openCursor();
      }

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const data = cursor.value as CachedData;
          let include = true;

          // Aplicar filtros adicionales
          if (year !== undefined && data.fileInfo.year !== year) {
            include = false;
          }
          if (month !== undefined && data.fileInfo.month !== month) {
            include = false;
          }
          if (type !== undefined && data.fileInfo.type !== type) {
            include = false;
          }

          if (include) {
            results.push(data);
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  /**
   * Elimina un archivo del caché
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise(async (resolve, reject) => {
      const metadata = await this.getMetadata();
      const fileIndex = metadata.files.findIndex(f => f.id === fileId);
      
      if (fileIndex === -1) {
        reject(new Error('Archivo no encontrado'));
        return;
      }

      const file = metadata.files[fileIndex];
      
      const transaction = this.db!.transaction(['csvData', 'metadata'], 'readwrite');
      const csvStore = transaction.objectStore('csvData');
      const metadataStore = transaction.objectStore('metadata');

      // Eliminar archivo
      const deleteRequest = csvStore.delete(fileId);

      deleteRequest.onsuccess = () => {
        // Actualizar metadatos
        metadata.files.splice(fileIndex, 1);
        metadata.totalRecords -= file.recordCount;
        metadata.lastUpdated = new Date().toISOString();

        const updateRequest = metadataStore.put(metadata, this.metadataKey);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };

      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  /**
   * Elimina todos los archivos de un año
   */
  async deleteFilesByYear(year: number): Promise<void> {
    const metadata = await this.getMetadata();
    const yearFiles = metadata.files.filter(f => f.year === year);
    
    await Promise.all(yearFiles.map(f => this.deleteFile(f.id)));
  }

  /**
   * Elimina todos los archivos de un mes
   */
  async deleteFilesByMonth(year: number, month: number): Promise<void> {
    const metadata = await this.getMetadata();
    const monthFiles = metadata.files.filter(
      f => f.year === year && f.month === month
    );
    
    await Promise.all(monthFiles.map(f => this.deleteFile(f.id)));
  }

  /**
   * Limpia todo el caché
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['csvData', 'metadata'], 'readwrite');
      
      transaction.objectStore('csvData').clear();
      transaction.objectStore('metadata').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Obtiene el tamaño total del caché en bytes
   */
  async getCacheSize(): Promise<number> {
    const metadata = await this.getMetadata();
    return metadata.files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Obtiene estadísticas del caché
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalRecords: number;
    totalSize: number;
    yearsList: number[];
    fileTypes: string[];
  }> {
    const metadata = await this.getMetadata();
    
    const yearsList = [...new Set(metadata.files.map(f => f.year))].sort();
    const fileTypes = [...new Set(metadata.files.map(f => f.type))].sort();
    
    return {
      totalFiles: metadata.files.length,
      totalRecords: metadata.totalRecords,
      totalSize: await this.getCacheSize(),
      yearsList,
      fileTypes,
    };
  }

  /**
   * Guarda datos personalizados en el caché (para categorías manuales, configuraciones, etc.)
   */
  async setCustomData<T>(key: string, data: T): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const metadataStore = transaction.objectStore('metadata');
      
      const customKey = `custom_${key}`;
      const putRequest = metadataStore.put(data, customKey);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  }

  /**
   * Obtiene datos personalizados del caché
   */
  async getCustomData<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const metadataStore = transaction.objectStore('metadata');
      
      const customKey = `custom_${key}`;
      const getRequest = metadataStore.get(customKey);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Elimina datos personalizados del caché
   */
  async deleteCustomData(key: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const metadataStore = transaction.objectStore('metadata');
      
      const customKey = `custom_${key}`;
      const deleteRequest = metadataStore.delete(customKey);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }
}

export const cacheService = new CacheService();
export type { CachedFile, CachedData, CacheMetadata };
