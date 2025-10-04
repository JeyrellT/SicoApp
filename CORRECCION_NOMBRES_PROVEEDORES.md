# 🔧 Corrección: Nombres de Proveedores

## 🎯 Problema

Los nombres de proveedores no se mostraban en los gráficos, solo se veía el ID:

```
❌ ANTES:
Top 10 Proveedores por Monto
1. 3101670329 (ID: 3101670329)
2. 9000015611 (ID: 9000015611)
```

## 🔍 Causa Raíz

**Dos problemas combinados:**

### 1. Nombre de tabla incorrecto
Los datos se guardaban en cache como `Proveedores_unido` pero DataManager buscaba `Proveedores`.

### 2. Nombres de columnas no mapeados
Los datos del CSV tienen:
- `"Cédula Proveedor"` → Debería mapearse a `idProveedor`
- `"Nombre Proveedor"` → Debería mapearse a `nombreProveedor`

Pero el método `buildProveedorNombreMap` solo buscaba los nombres ya mapeados (`idProveedor`, `nombreProveedor`) que no existen en los datos del cache.

## ✅ Solución Implementada

### 1. **Mapeo automático de nombre de tabla** (`DataManager.ts`)

```typescript
// En loadDataFromMemory()
if (tableName === 'Proveedores_unido') {
  mappedTableName = 'Proveedores';
  console.log(`📝 Mapeando ${tableName} → ${mappedTableName}`);
}
```

### 2. **Búsqueda flexible de campos** (`DataManager.ts`)

```typescript
// Nuevo helper que busca campos con múltiples variantes
const buscarCampo = (obj: any, variantes: string[]): any => {
  if (!obj || typeof obj !== 'object') return undefined;
  
  for (const nombreCampo of variantes) {
    // Buscar exacto
    if (obj[nombreCampo] !== undefined) return obj[nombreCampo];
    
    // Buscar case-insensitive
    const nombreLower = nombreCampo.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === nombreLower) {
        return obj[key];
      }
    }
  }
  return undefined;
};

const extractNombre = (o: any): string => {
  const nombre = buscarCampo(o, [
    'nombreProveedor',      // Nombre mapeado
    'Nombre Proveedor',     // ✅ Nombre real del CSV
    'nombre_proveedor',
    'nombre proveedor',
    'razonSocial',
    'razon_social',
    'nombre',
    'NOMBRE_PROVEEDOR'
  ]);
  
  return String(nombre || '').trim();
};

const extractId = (o: any): string => {
  const id = buscarCampo(o, [
    'idProveedor',          // Nombre mapeado
    'Cédula Proveedor',     // ✅ Nombre real del CSV
    'cedula_proveedor',
    'cedula proveedor',
    'cédula proveedor',
    'CEDULA_PROVEEDOR',
    'cedula',
    'Cedula'
  ]);
  
  return String(id || '').trim();
};
```

### 3. **Logging mejorado**

```typescript
console.log(`🔍 Proveedores mapeados desde tabla Proveedores: ${map.size}`);
if (proveedores.length > 0 && map.size === 0) {
  console.warn('⚠️ No se pudieron mapear proveedores. Estructura de ejemplo:', proveedores[0]);
}
```

## 📊 Resultado

Ahora los nombres se muestran correctamente:

```
✅ AHORA:
Top 10 Proveedores por Monto
1. AGENCIA SUPERVIAJES OLYMPIA SOCIEDAD ANONIMA
   ID: 3101031137 • ₡203.0B

2. MOBI OFFICE SOCIEDAD ANONIMA
   ID: 3101545286 • ₡30.5B
```

## 🔑 Principio Clave

> **Los datos en cache mantienen los nombres de columnas originales del CSV. DataManager debe buscar campos usando múltiples variantes (con/sin acentos, espacios, guiones bajos) para ser robusto.**

## 📁 Archivos Modificados

- 🔧 `src/data/DataManager.ts` - Método `buildProveedorNombreMap()` mejorado
- 🔧 `src/data/DataManager.ts` - Método `loadDataFromMemory()` con mapeo de tabla

## 🧪 Validación

Los logs mostrarán:

```
📝 Mapeando Proveedores_unido → Proveedores
📊 Cargando Proveedores: 52,337 registros
🔍 Proveedores mapeados desde tabla Proveedores: 52,337
```

Si el mapeo falla, verás:

```
⚠️ No se pudieron mapear proveedores. Estructura de ejemplo: {
  "Cédula Proveedor": "3101031137",
  "Nombre Proveedor": "AGENCIA SUPERVIAJES...",
  ...
}
```

---

**Cambios implementados:** 3 de Octubre, 2025
**Estado:** ✅ Completado - Nombres de proveedores ahora se muestran correctamente
