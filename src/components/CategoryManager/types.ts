/**
 * SICOP Analytics - Tipos compartidos del subárbol CategoryManager.
 *
 * `CategoriaAgrupada` es el resultado de aplicar las reglas manuales de
 * palabras clave (capa de etiquetado del lado del cliente, ver
 * `categoryGrouping.ts`) sobre los agregados por objeto de gasto que expone
 * el backend (`GET /v1/dashboard/categorias`). No representa licitaciones
 * individuales: el backend no expone datos fila a fila de carteles/líneas
 * de forma confiable (esas tablas se publican vacías varios meses), así que
 * toda esta vista trabaja sobre agregados.
 */
import type { Categoria } from '../../api/tipos';

export interface CategoriaAgrupada {
  /** Id del bucket: el id de la regla manual si hubo coincidencia, o el propio objeto_gasto si no. */
  id: string;
  /** Nombre a mostrar: nombre de la regla manual, o el código de objeto_gasto tal cual lo publica el backend. */
  nombre: string;
  tipo: 'objeto_gasto' | 'manual';
  color?: string;
  /** Agregados originales del backend que fueron agrupados bajo este bucket. */
  detalle: Categoria[];
  lineas: number;
  montoCrc: number;
  montoUsd: number;
  /**
   * Suma de `proveedores_distintos` de cada objeto_gasto agrupado. Es una
   * aproximación por exceso cuando `detalle.length > 1`: el backend entrega
   * el conteo de proveedores distintos por objeto_gasto, no el set de
   * cédulas, así que no se puede deduplicar un proveedor que participa en
   * varios objetos de gasto agrupados bajo la misma regla manual.
   */
  proveedoresDistintos: number;
  participacionPct: number;
}
