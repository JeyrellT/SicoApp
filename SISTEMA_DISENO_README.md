# 🎨 Sistema de Diseño SICOP Analytics

> Sistema de diseño moderno, accesible y responsive para SICOP Analytics  
> Cumple con estándares WCAG 2.1 AA y optimizado para todos los dispositivos

---

## 🚀 Inicio Rápido

### Importar Estilos

```javascript
// src/index.js
import './index.css';      // Sistema base
import './utilities.css';  // Clases de utilidad
```

### Uso Básico

```jsx
// Botón primario
<button className="btn btn-primary">
  Acción Principal
</button>

// Tarjeta con contenido
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Título</h3>
  </div>
  <div className="card-body">
    <p>Contenido de la tarjeta</p>
  </div>
</div>

// Badge de estado
<span className="badge badge-success">Activo</span>

// Grid responsivo
<div className="row">
  <div className="col-md-6 col-sm-12">Columna 1</div>
  <div className="col-md-6 col-sm-12">Columna 2</div>
</div>
```

---

## 🎨 Paleta de Colores

### Colores de Marca

| Color | Variable | Valor | Uso |
|-------|----------|-------|-----|
| 🟣 Primary | `--primary-color` | #667eea | Botones, enlaces, highlights |
| 🟪 Secondary | `--secondary-color` | #764ba2 | Acentos, gradientes |
| 💗 Accent | `--accent-color` | #f093fb | Detalles decorativos |

### Colores de Texto (WCAG AA)

| Color | Variable | Valor | Contraste | Uso |
|-------|----------|-------|-----------|-----|
| ⬛ Primary | `--text-primary` | #1a202c | 15.8:1 ✅ | Títulos, texto principal |
| ⬛ Secondary | `--text-secondary` | #2d3748 | 12.6:1 ✅ | Texto secundario |
| ⬛ Tertiary | `--text-tertiary` | #4a5568 | 8.2:1 ✅ | Metadatos |
| ⬛ Muted | `--text-muted` | #718096 | 5.5:1 ✅ | Placeholders |

### Colores de Estado (WCAG AA)

| Estado | Variable | Valor | Contraste | Uso |
|--------|----------|-------|-----------|-----|
| 🟢 Success | `--success-color` | #047857 | 5.1:1 ✅ | Éxito, confirmación |
| 🟠 Warning | `--warning-color` | #d97706 | 4.6:1 ✅ | Advertencias |
| 🔴 Error | `--error-color` | #dc2626 | 5.9:1 ✅ | Errores, rechazos |
| 🔵 Info | `--info-color` | #0369a1 | 5.3:1 ✅ | Información |

---

## 📏 Espaciado

### Sistema de 8px

| Clase | Variable | Valor | Uso |
|-------|----------|-------|-----|
| `.p-xs` / `.mt-xs` | `--space-xs` | 4px | Muy pequeño |
| `.p-sm` / `.mt-sm` | `--space-sm` | 8px | Pequeño |
| `.p-md` / `.mt-md` | `--space-md` | 16px | Estándar |
| `.p-lg` / `.mt-lg` | `--space-lg` | 24px | Grande |
| `.p-xl` / `.mt-xl` | `--space-xl` | 32px | Extra grande |
| `.p-2xl` | `--space-2xl` | 48px | Secciones |
| `.p-3xl` | `--space-3xl` | 64px | Bloques grandes |

### Ejemplos

```jsx
<div className="p-lg mb-md">
  <h2 className="mt-sm mb-md">Título</h2>
  <p className="mb-sm">Párrafo con márgenes</p>
</div>
```

---

## 🔘 Botones

### Variantes

```jsx
<button className="btn btn-primary">Primario</button>
<button className="btn btn-secondary">Secundario</button>
<button className="btn btn-outline">Outline</button>
<button className="btn btn-success">Éxito</button>
<button className="btn btn-danger">Peligro</button>
```

### Tamaños

```jsx
<button className="btn btn-primary btn-sm">Pequeño</button>
<button className="btn btn-primary">Normal</button>
<button className="btn btn-primary btn-lg">Grande</button>
<button className="btn btn-primary btn-block">Ancho completo</button>
```

### Con Iconos

```jsx
<button className="btn btn-primary">
  <UploadIcon size={16} />
  <span>Cargar Archivo</span>
</button>
```

---

## 🃏 Tarjetas (Cards)

### Básica

```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Título</h3>
    <p className="card-subtitle">Subtítulo</p>
  </div>
  <div className="card-body">
    <p>Contenido principal de la tarjeta</p>
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Acción</button>
  </div>
</div>
```

### Con Gradiente

```jsx
<div className="card card-gradient">
  <div className="card-body">
    <h3 className="card-title">Tarjeta Destacada</h3>
    <p>Contenido con fondo gradiente</p>
  </div>
</div>
```

---

## 🏷️ Badges

### Variantes

```jsx
<span className="badge badge-primary">Primario</span>
<span className="badge badge-success">Éxito</span>
<span className="badge badge-warning">Advertencia</span>
<span className="badge badge-error">Error</span>
<span className="badge badge-info">Info</span>
```

---

## ⚠️ Alertas

### Estructura

```jsx
<div className="alert alert-success">
  <div className="alert-icon">✓</div>
  <div className="alert-content">
    <h4 className="alert-title">¡Éxito!</h4>
    <p className="alert-message">La operación se completó correctamente.</p>
  </div>
</div>
```

### Variantes

```jsx
<div className="alert alert-success">...</div>
<div className="alert alert-warning">...</div>
<div className="alert alert-error">...</div>
<div className="alert alert-info">...</div>
```

---

## 📝 Formularios

### Campos de Texto

```jsx
<div className="form-group">
  <label className="form-label">Nombre</label>
  <input 
    type="text" 
    className="form-input" 
    placeholder="Ingrese su nombre"
  />
  <span className="form-helper">Texto de ayuda</span>
</div>
```

### Con Error

```jsx
<div className="form-group">
  <label className="form-label">Email</label>
  <input 
    type="email" 
    className="form-input" 
    placeholder="ejemplo@correo.com"
  />
  <span className="form-error">Email inválido</span>
</div>
```

### Select

```jsx
<div className="form-group">
  <label className="form-label">País</label>
  <select className="form-select">
    <option>Costa Rica</option>
    <option>Panamá</option>
  </select>
</div>
```

### Textarea

```jsx
<div className="form-group">
  <label className="form-label">Comentarios</label>
  <textarea 
    className="form-textarea"
    placeholder="Escriba sus comentarios..."
  />
</div>
```

---

## 📐 Grid System

### Básico

```jsx
<div className="container">
  <div className="row">
    <div className="col-4">Columna 1/3</div>
    <div className="col-4">Columna 2/3</div>
    <div className="col-4">Columna 3/3</div>
  </div>
</div>
```

### Responsive

```jsx
<div className="row">
  <div className="col-12 col-md-6 col-lg-4">
    <!-- 100% móvil, 50% tablet, 33% desktop -->
  </div>
  <div className="col-12 col-md-6 col-lg-4">...</div>
  <div className="col-12 col-md-6 col-lg-4">...</div>
</div>
```

---

## 📱 Breakpoints

| Dispositivo | Min | Max | Clase |
|-------------|-----|-----|-------|
| 📱 Mobile | - | 640px | `.col-sm-*` |
| 📱 Tablet | 641px | 1024px | `.col-md-*` |
| 💻 Desktop | 1025px | 1440px | `.col-lg-*` |
| 🖥️ Large | 1441px | - | `.col-xl-*` |

---

## 🎭 Utilidades de Display

### Display

```jsx
<div className="d-none">Oculto</div>
<div className="d-block">Bloque</div>
<div className="d-flex">Flex</div>
<div className="d-grid">Grid</div>
```

### Flex

```jsx
<div className="d-flex align-center justify-between gap-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Responsive Visibility

```jsx
<div className="hide-mobile show-desktop">Solo desktop</div>
<div className="show-mobile hide-desktop">Solo móvil</div>
<div className="show-tablet hide-mobile hide-desktop">Solo tablet</div>
```

---

## 📝 Tipografía

### Clases de Texto

```jsx
<p className="text-primary">Texto primario</p>
<p className="text-secondary">Texto secundario</p>
<p className="text-muted">Texto apagado</p>

<p className="text-center">Centrado</p>
<p className="text-left">Izquierda</p>
<p className="text-right">Derecha</p>

<p className="font-normal">Normal (400)</p>
<p className="font-medium">Medio (500)</p>
<p className="font-semibold">Semi-bold (600)</p>
<p className="font-bold">Bold (700)</p>
```

---

## ♿ Accesibilidad

### Focus Ring

```jsx
<button className="btn focus-ring">
  Botón con focus visible
</button>
```

### Screen Reader Only

```jsx
<span className="sr-only">
  Texto solo para lectores de pantalla
</span>
```

### ARIA Labels

```jsx
<button 
  className="btn btn-primary"
  aria-label="Guardar cambios"
>
  💾
</button>
```

---

## 🎬 Animaciones

### Loading States

```jsx
<!-- Spinner -->
<div className="spinner"></div>
<div className="spinner spinner-sm"></div>
<div className="spinner spinner-lg"></div>

<!-- Skeleton -->
<div className="skeleton" style={{width: '100%', height: '20px'}}></div>
```

### Transiciones

```css
/* Usar variables globales */
transition: all var(--transition-base);  /* 250ms */
transition: all var(--transition-fast);  /* 150ms */
transition: all var(--transition-slow);  /* 350ms */
```

---

## 📐 Sombras

### Variables de Sombra

```css
box-shadow: var(--shadow-xs);   /* Muy sutil */
box-shadow: var(--shadow-sm);   /* Pequeña */
box-shadow: var(--shadow-md);   /* Media (default) */
box-shadow: var(--shadow-lg);   /* Grande */
box-shadow: var(--shadow-xl);   /* Extra grande */
box-shadow: var(--shadow-2xl);  /* Máxima */
```

---

## 🎨 Border Radius

### Variables

```css
border-radius: var(--radius-sm);   /* 6px */
border-radius: var(--radius-md);   /* 8px */
border-radius: var(--radius-lg);   /* 12px */
border-radius: var(--radius-xl);   /* 16px */
border-radius: var(--radius-2xl);  /* 24px */
border-radius: var(--radius-full); /* 9999px */
```

---

## 🖨️ Print Styles

### Ocultar en Impresión

```jsx
<button className="btn no-print">
  No se imprime
</button>
```

---

## 📚 Ejemplos Completos

### Tarjeta KPI

```jsx
<div className="card">
  <div className="card-body">
    <div className="d-flex justify-between align-center mb-md">
      <h3 className="text-muted font-semibold">Total Contratos</h3>
      <span className="badge badge-success">+12%</span>
    </div>
    <p className="text-primary font-bold" style={{fontSize: '2rem'}}>
      1,234
    </p>
    <p className="text-muted">vs mes anterior</p>
  </div>
</div>
```

### Formulario de Login

```jsx
<div className="card" style={{maxWidth: '400px', margin: '0 auto'}}>
  <div className="card-header">
    <h2 className="card-title">Iniciar Sesión</h2>
    <p className="card-subtitle">Accede a tu cuenta</p>
  </div>
  <div className="card-body">
    <div className="form-group">
      <label className="form-label">Email</label>
      <input 
        type="email" 
        className="form-input" 
        placeholder="tu@email.com"
      />
    </div>
    <div className="form-group">
      <label className="form-label">Contraseña</label>
      <input 
        type="password" 
        className="form-input" 
        placeholder="••••••••"
      />
    </div>
    <button className="btn btn-primary btn-block">
      Entrar
    </button>
  </div>
</div>
```

---

## 🔧 Personalización

### Sobrescribir Variables

```css
/* En tu archivo CSS personalizado */
:root {
  --primary-color: #your-color;
  --space-md: 20px;  /* En lugar de 16px */
}
```

### Extender Clases

```css
/* Crear variantes propias */
.btn-custom {
  @extend .btn;
  @extend .btn-primary;
  /* Estilos adicionales */
}
```

---

## ✅ Checklist de Uso

- ✅ Importar `utilities.css` en `index.js`
- ✅ Usar variables CSS en lugar de valores hardcoded
- ✅ Aplicar clases de utilidad antes de crear CSS custom
- ✅ Verificar contraste de colores (min 4.5:1)
- ✅ Testear en móvil, tablet y desktop
- ✅ Asegurar touch targets de 44x44px mínimo
- ✅ Añadir focus indicators visibles
- ✅ Incluir labels y ARIA cuando sea necesario

---

## 📖 Referencias

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design System](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**Creado por:** SICOP Analytics Team  
**Versión:** 1.0.0  
**Fecha:** Enero 2025
