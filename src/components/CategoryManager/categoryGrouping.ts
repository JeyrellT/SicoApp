/**
 * SICOP Analytics - Agrupación de categorías del backend por reglas manuales.
 *
 * Las reglas manuales de palabras clave (`ManualCategoryRule`) se conservan
 * como una capa de etiquetado/agrupación del lado del cliente: se evalúan
 * contra el código `objeto_gasto` de cada agregado que devuelve
 * `GET /v1/dashboard/categorias` y, si coinciden, agrupan/renombran esos
 * agregados bajo el nombre de la regla.
 *
 * Limitación conocida: `ManualCategoryRule.instituciones` (filtro por
 * institución) no se puede aplicar aquí porque el endpoint de categorías
 * agrega a nivel global, sin desglose por institución.
 */
import type { Categoria } from '../../api/tipos';
import type { CategoryConfiguration, ManualCategoryRule } from '../../types/categories';
import type { CategoriaAgrupada } from './types';

export function normalizarTexto(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function reglaCoincideConObjetoGasto(regla: ManualCategoryRule, objetoGasto: string): boolean {
  const textoNorm = normalizarTexto(objetoGasto);
  if (!textoNorm) return false;
  return regla.palabrasClave.some((palabra) => {
    const palabraNorm = normalizarTexto(palabra);
    return palabraNorm.length > 0 && textoNorm.includes(palabraNorm);
  });
}

export interface ResultadoAgrupacion {
  categorias: CategoriaAgrupada[];
  /** Líneas y monto de objetos de gasto desactivados por configuración (CategoryConfigView). */
  excluidas: { lineas: number; montoCrc: number };
}

/**
 * Agrupa los agregados por objeto de gasto aplicando, del lado del cliente,
 * las reglas manuales activas. Los objetos de gasto que no coincidan con
 * ninguna regla se muestran tal cual (categoría "objeto_gasto"), salvo que
 * hayan sido desactivados explícitamente desde `CategoryConfigView`.
 */
export function agruparCategorias(
  categorias: Categoria[],
  reglas: ManualCategoryRule[],
  config: CategoryConfiguration
): ResultadoAgrupacion {
  const reglasActivas = reglas.filter((r) => r.activo && config.categorias[r.id] !== false);
  const buckets = new Map<string, CategoriaAgrupada>();
  let excluidasLineas = 0;
  let excluidasMonto = 0;

  for (const cat of categorias) {
    const reglaCoincidente = reglasActivas.find((r) => reglaCoincideConObjetoGasto(r, cat.objeto_gasto));
    const activaComoObjetoGasto = config.categorias[cat.objeto_gasto] !== false;

    if (!reglaCoincidente && !activaComoObjetoGasto) {
      excluidasLineas += cat.lineas;
      excluidasMonto += cat.monto_crc;
      continue;
    }

    const id = reglaCoincidente ? reglaCoincidente.id : cat.objeto_gasto;
    const existente = buckets.get(id);

    if (existente) {
      existente.detalle.push(cat);
      existente.lineas += cat.lineas;
      existente.montoCrc += cat.monto_crc;
      existente.montoUsd += cat.monto_usd;
      existente.proveedoresDistintos += cat.proveedores_distintos;
      existente.participacionPct += cat.participacion_pct;
    } else {
      buckets.set(id, {
        id,
        nombre: reglaCoincidente ? reglaCoincidente.nombre : cat.objeto_gasto,
        tipo: reglaCoincidente ? 'manual' : 'objeto_gasto',
        color: reglaCoincidente?.color,
        detalle: [cat],
        lineas: cat.lineas,
        montoCrc: cat.monto_crc,
        montoUsd: cat.monto_usd,
        proveedoresDistintos: cat.proveedores_distintos,
        participacionPct: cat.participacion_pct,
      });
    }
  }

  const resultado = Array.from(buckets.values()).sort((a, b) => b.montoCrc - a.montoCrc);
  return { categorias: resultado, excluidas: { lineas: excluidasLineas, montoCrc: excluidasMonto } };
}
