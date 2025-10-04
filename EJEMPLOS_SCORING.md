# Ejemplos Prácticos del Sistema de Scoring

## 🎯 Ejemplo Completo: Paso a Paso

### Escenario: Clasificar una Licitación Real

**Descripción del Cartel**:
```
"Adquisición de 50 laptops Dell Latitude 5420 con procesador Intel Core i7, 
16GB RAM, SSD 512GB, Windows 11 Pro, para el Departamento de Tecnologías 
de Información"
```

---

## 🔍 PASO 1: Normalización del Texto

```javascript
Texto original:
"Adquisición de 50 laptops Dell Latitude 5420 con procesador Intel Core i7..."

Texto normalizado (lowercase, sin acentos, espacios únicos):
"adquisicion de 50 laptops dell latitude 5420 con procesador intel core i7 
16gb ram ssd 512gb windows 11 pro para el departamento de tecnologias de informacion"
```

---

## 🏆 PASO 2: Scoring de Categorías

### Categorías Disponibles:

#### 1️⃣ **Tecnología y sistemas**
Keywords: `["tecnología", "tecnologías", "sistemas", "informática", "ti", "it"]`

**Evaluación**:
- ✅ Match: "tecnologias" → +1 punto
- ✅ Match: "informacion" (de "información") → +1 punto
- ❌ No match: "sistemas"
- ❌ No match: "informática"

**Bonus de especificidad**:
- "tecnologías" (11 chars > 10) → +0.5 bonus
- "informacion" (11 chars > 10) → +0.5 bonus

**Score Total**: 2 + 1.0 = **3.0**

---

#### 2️⃣ **Hardware y equipo**
Keywords: `["hardware", "equipo", "computadora", "laptop", "servidor", "procesador", "ram", "ssd", "intel", "dell"]`

**Evaluación**:
- ✅ Match: "laptop" → +1 punto
- ✅ Match: "procesador" → +1 punto
- ✅ Match: "ram" → +1 punto
- ✅ Match: "ssd" → +1 punto
- ✅ Match: "intel" → +1 punto
- ✅ Match: "dell" → +1 punto
- ❌ No match: "hardware"
- ❌ No match: "computadora"

**Bonus de especificidad**:
- "procesador" (10 chars = 10) → +0.2 bonus
- Resto son < 6 chars → +0 bonus

**Score Total**: 6 + 0.2 = **6.2** ✅ **GANADOR**

---

#### 3️⃣ **Adquisiciones**
Keywords: `["adquisición", "adquisicion", "compra", "comprar"]`

**Evaluación**:
- ✅ Match: "adquisicion" → +1 punto

**Bonus de especificidad**:
- "adquisicion" (11 chars > 10) → +0.5 bonus

**Score Total**: 1 + 0.5 = **1.5**

---

### 📊 Tabla de Resultados - Categorías

| Categoría | Matches | Score Base | Bonus | Score Total |
|-----------|---------|------------|-------|-------------|
| Tecnología y sistemas | 2 | 2 | 1.0 | **3.0** |
| **Hardware y equipo** | **6** | **6** | **0.2** | **6.2** ✅ |
| Adquisiciones | 1 | 1 | 0.5 | **1.5** |

**Resultado**: Categoría = **"Hardware y equipo"**

---

## 🎨 PASO 3: Scoring de Subcategorías

Ahora que tenemos la categoría "Hardware y equipo", buscamos la subcategoría:

### Subcategorías Disponibles:

#### 1️⃣ **Computadoras**
Keywords: `["computadora", "laptop", "pc", "desktop"]`

**Evaluación**:
- ✅ Match: "laptop" → +1 punto

**Score Total**: **1.0**

---

#### 2️⃣ **Laptops Dell**
Keywords: `["laptop", "dell", "latitude", "inspiron", "xps", "vostro"]`

**Evaluación**:
- ✅ Match: "laptop" → +1 punto
- ✅ Match: "dell" → +1 punto
- ✅ Match: "latitude" → +1 punto

**Bonus de especificidad**:
- "latitude" (8 chars > 6) → +0.2 bonus

**Score Total**: 3 + 0.2 = **3.2** ✅ **GANADOR**

---

#### 3️⃣ **Procesadores**
Keywords: `["procesador", "cpu", "intel", "amd"]`

**Evaluación**:
- ✅ Match: "procesador" → +1 punto
- ✅ Match: "intel" → +1 punto

**Bonus de especificidad**:
- "procesador" (10 chars = 10) → +0.2 bonus

**Score Total**: 2 + 0.2 = **2.2**

---

#### 4️⃣ **Memoria RAM**
Keywords: `["ram", "memoria"]`

**Evaluación**:
- ✅ Match: "ram" → +1 punto

**Score Total**: **1.0**

---

#### 5️⃣ **Almacenamiento**
Keywords: `["ssd", "disco duro", "almacenamiento", "storage"]`

**Evaluación**:
- ✅ Match: "ssd" → +1 punto

**Bonus de especificidad**:
- "almacenamiento" (14 chars > 10) → +0.5 bonus (si coincidiera)

**Score Total**: **1.0**

---

### 📊 Tabla de Resultados - Subcategorías

| Subcategoría | Matches | Score Base | Bonus | Score Total |
|--------------|---------|------------|-------|-------------|
| Computadoras | 1 | 1 | 0 | **1.0** |
| **Laptops Dell** | **3** | **3** | **0.2** | **3.2** ✅ |
| Procesadores | 2 | 2 | 0.2 | **2.2** |
| Memoria RAM | 1 | 1 | 0 | **1.0** |
| Almacenamiento | 1 | 1 | 0 | **1.0** |

**Resultado**: Subcategoría = **"Laptops Dell"**

---

## ✅ RESULTADO FINAL

```javascript
{
  categoria: "Hardware y equipo",
  subcategoria: "Laptops Dell",
  
  scoring: {
    categoria: {
      score: 6.2,
      matches: ["laptop", "procesador", "ram", "ssd", "intel", "dell"]
    },
    subcategoria: {
      score: 3.2,
      matches: ["laptop", "dell", "latitude"]
    }
  }
}
```

---

## 🔄 Comparación: Sistema Anterior vs Nuevo

### ❌ Sistema Anterior (Primera Coincidencia)

```javascript
// Orden de evaluación:
1. Tecnología y sistemas → coincide "tecnologías" → GANA ❌
   (Se detiene aquí, nunca evalúa las demás)

Resultado: "Tecnología y sistemas" / "General"
```

**Problema**: La primera categoría que coincide gana, aunque haya mejores opciones.

### ✅ Sistema Nuevo (Scoring)

```javascript
// Evalúa TODAS las categorías:
1. Tecnología y sistemas → score: 3.0
2. Hardware y equipo → score: 6.2 ✅
3. Adquisiciones → score: 1.5

// Luego evalúa TODAS las subcategorías:
1. Computadoras → score: 1.0
2. Laptops Dell → score: 3.2 ✅
3. Procesadores → score: 2.2
4. Memoria RAM → score: 1.0
5. Almacenamiento → score: 1.0

Resultado: "Hardware y equipo" / "Laptops Dell"
```

**Ventaja**: Siempre encuentra la mejor categoría/subcategoría, no la primera.

---

## 📈 Más Ejemplos Rápidos

### Ejemplo 2: Servicios de Consultoría

**Descripción**: 
```
"Contratación de servicios de consultoría en transformación digital 
y migración a la nube (cloud computing)"
```

**Scoring de Categorías**:
- Consultoría (keywords: ["consultoría", "asesoría"]) → score: 1.2
- Tecnología (keywords: ["digital", "nube", "cloud", "tecnología"]) → score: 3.0 ✅
- Servicios (keywords: ["servicios"]) → score: 1.0

**Resultado**: "Tecnología" / "Cloud Computing"

---

### Ejemplo 3: Vehículos Específicos

**Descripción**: 
```
"Adquisición de 3 camiones Hino Serie 500 modelo 2024 
para transporte de carga pesada"
```

**Scoring de Categorías**:
- Transporte (keywords: ["transporte", "vehículo"]) → score: 1.0
- Vehículos (keywords: ["camión", "hino", "vehículo", "automóvil"]) → score: 2.0 ✅
- Carga (keywords: ["carga"]) → score: 1.0

**Scoring de Subcategorías**:
- Vehículos ligeros → score: 0
- Camiones Hino (keywords: ["camión", "hino", "serie 500"]) → score: 3.2 ✅
- Vehículos pesados (keywords: ["pesada", "carga"]) → score: 2.0

**Resultado**: "Vehículos" / "Camiones Hino"

---

### Ejemplo 4: Desempate por Total de Keywords

**Descripción**: 
```
"Compra de mobiliario"
```

**Scoring de Categorías**:
- Mobiliario Simple (keywords: ["mobiliario"]) 
  → score: 1.2, total keywords: 1
  
- Mobiliario y Equipo (keywords: ["mobiliario", "escritorio", "silla", "archivo", "mesa"]) 
  → score: 1.2, total keywords: 5 ✅ (gana por desempate)

**Resultado**: "Mobiliario y Equipo" (más específica)

---

## 🎯 Configuración Óptima de Keywords

### ✅ Buenas Prácticas

```javascript
// 1. Mezclar keywords genéricas y específicas
{
  categoria: "Software Microsoft",
  keywords: [
    "software",           // Genérica (base)
    "microsoft",          // Específica (marca)
    "windows",            // Específica (producto)
    "office",             // Específica (producto)
    "azure",              // Específica (servicio)
    "sharepoint"          // Muy específica (producto)
  ]
}

// 2. Usar variaciones y sinónimos
{
  categoria: "Tecnología",
  keywords: [
    "tecnología",
    "tecnologías",
    "tecnológico",
    "ti",
    "it",
    "informática"
  ]
}

// 3. Keywords largas y específicas para subcategorías
{
  subcategoria: "Cloud Computing",
  keywords: [
    "cloud",
    "nube",
    "azure",
    "aws",
    "google cloud",        // Específica larga
    "cloud computing",     // Muy específica
    "infraestructura cloud" // Ultra específica
  ]
}
```

### ❌ Malas Prácticas

```javascript
// 1. Solo keywords genéricas
{
  categoria: "Servicios",
  keywords: ["servicio", "servicios"]  // Demasiado genérico
}

// 2. Solo keywords ultra específicas
{
  categoria: "Software",
  keywords: ["microsoft office 365 enterprise e5"]  // Demasiado específico
}

// 3. Keywords contradictorias
{
  categoria: "Software",
  keywords: ["software", "hardware", "servicio"]  // Mezclado
}
```

---

## 💡 Tips para Optimizar

1. **Agregar más keywords relevantes** → Aumenta chances de match
2. **Usar keywords largas para especificidad** → Gana bonus
3. **Incluir marcas y productos** → Mejora precisión
4. **Agregar variaciones** → Mayor cobertura
5. **Crear subcategorías específicas** → Clasificación granular

---

**Sistema implementado**: Octubre 2025  
**Precisión esperada**: 85-95%  
**Estado**: ✅ Activo
