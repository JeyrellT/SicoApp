# 🚀 Guía de Deployment - SICOP App

## 📋 Índice
- [Configuración Inicial](#configuración-inicial)
- [Deployment Automático](#deployment-automático)
- [Deployment Manual](#deployment-manual)
- [Actualizar la Aplicación](#actualizar-la-aplicación)
- [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Configuración Inicial

### 1. Configurar GitHub Pages en tu Repositorio

1. Ve a tu repositorio en GitHub: https://github.com/JeyrellT/SicoApp
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En **Source** (Fuente), selecciona:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click en **Save**

### 2. Instalar Dependencias

```bash
cd sicop-app
npm install
```

Esto instalará todas las dependencias, incluyendo `gh-pages` que necesitamos para el deployment.

---

## 🤖 Deployment Automático (Recomendado)

### ¿Cómo Funciona?

Cada vez que hagas `push` a las ramas `main` o `master`, GitHub Actions automáticamente:
1. ✅ Construye tu aplicación
2. ✅ Ejecuta tests (si los hay)
3. ✅ Despliega a GitHub Pages
4. ✅ Tu sitio se actualiza automáticamente

### Pasos para Actualizar tu Aplicación

```bash
# 1. Haz tus cambios en el código
# 2. Guarda tus cambios
git add .
git commit -m "Descripción de tus cambios"

# 3. Sube los cambios a GitHub
git push origin main

# 4. ¡Listo! GitHub Actions se encargará del resto
```

### Ver el Estado del Deployment

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Verás el workflow "Deploy to GitHub Pages" ejecutándose
4. Cuando termine (✅ verde), tu sitio estará actualizado

**URL de tu aplicación:** https://jeyrelit.github.io/SicoApp

---

## 🛠️ Deployment Manual

### Cuándo Usar Deployment Manual

- Quieres probar cambios rápidamente sin hacer commit
- Necesitas hacer un hotfix urgente
- El workflow automático falló y necesitas deployar de emergencia

### Opción 1: Usando npm (Más Fácil)

```bash
cd sicop-app
npm run deploy
```

Este comando:
- Construye la aplicación
- Despliega a GitHub Pages
- Todo en un solo comando

### Opción 2: Usando el Script de Deploy

```bash
cd sicop-app
node deploy.js
```

Este script incluye:
- ✅ Verificaciones previas
- ✅ Construcción optimizada
- ✅ Deployment a GitHub Pages
- ✅ Mensajes informativos

### Pre-Deploy Check

Antes de hacer deployment, puedes verificar que todo esté listo:

```bash
node scripts/pre-deploy-check.js
```

---

## 🔄 Actualizar la Aplicación (Flujo Completo)

### Para Cambios Pequeños (Hot Fix)

```bash
# 1. Haz tus cambios
# 2. Haz deployment manual rápido
npm run deploy

# 3. Luego, cuando puedas, haz commit
git add .
git commit -m "Fix: descripción del fix"
git push
```

### Para Cambios Grandes (Features)

```bash
# 1. Crea una rama para tu feature
git checkout -b feature/nueva-funcionalidad

# 2. Haz tus cambios y commits
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Prueba localmente
npm start

# 4. Cuando esté listo, merge a main
git checkout main
git merge feature/nueva-funcionalidad

# 5. Push a GitHub (deployment automático)
git push origin main
```

---

## 📊 Monitoreo y Verificación

### Ver Logs del Deployment

1. GitHub Actions:
   - Ve a https://github.com/JeyrellT/SicoApp/actions
   - Click en el último workflow
   - Revisa los logs de cada paso

2. Build Local:
   ```bash
   npm run build
   ```
   Revisa la carpeta `build/` generada

### Verificar que el Deployment Funcionó

1. Espera 2-5 minutos después del deployment
2. Visita: https://jeyrelit.github.io/SicoApp
3. Haz Ctrl+F5 para forzar recarga (limpiar caché)
4. Verifica que tus cambios estén ahí

---

## 🐛 Solución de Problemas

### Error: "gh-pages not found"

```bash
npm install gh-pages --save-dev
```

### Error: "Permission denied" en GitHub Actions

1. Ve a Settings > Actions > General
2. En "Workflow permissions", selecciona "Read and write permissions"
3. Click en Save

### El Sitio No Se Actualiza

1. **Limpia el caché del navegador:**
   - Chrome/Edge: Ctrl + Shift + Delete
   - O simplemente: Ctrl + F5

2. **Verifica GitHub Pages:**
   - Settings > Pages
   - Debe estar en "gh-pages" branch

3. **Revisa el workflow:**
   - Actions tab
   - Debe estar ✅ verde

### Build Falla Localmente

```bash
# Limpia todo y reinstala
rm -rf node_modules package-lock.json build
npm install
npm run build
```

### El Workflow de GitHub Actions Falla

1. Ve a Actions y revisa el error
2. Errores comunes:
   - **Warnings en el build:** Agrega `CI=false` al build (ya está configurado)
   - **Tests fallan:** Asegúrate que todos los tests pasen localmente
   - **Permisos:** Verifica configuración de permisos

---

## 📝 Comandos Rápidos de Referencia

```bash
# Desarrollo local
npm start                          # Iniciar servidor de desarrollo
npm run build                      # Construir para producción
npm test                          # Ejecutar tests

# Deployment
npm run deploy                    # Deploy manual rápido
node deploy.js                    # Deploy con verificaciones
node scripts/pre-deploy-check.js  # Verificar pre-requisitos

# Git
git status                        # Ver cambios
git add .                         # Agregar todos los cambios
git commit -m "mensaje"           # Hacer commit
git push                          # Subir a GitHub (activa auto-deploy)

# Verificación
git log --oneline                 # Ver historial de commits
npm run verify:montos             # Verificar montos (tu script custom)
```

---

## 🎯 Mejores Prácticas

### 1. **Siempre Prueba Localmente Primero**
```bash
npm start  # Prueba en http://localhost:3000
```

### 2. **Usa Mensajes de Commit Descriptivos**
```bash
git commit -m "feat: agregar filtro por institución"
git commit -m "fix: corregir cálculo de montos"
git commit -m "docs: actualizar README"
```

### 3. **Revisa los Cambios Antes de Commit**
```bash
git diff              # Ver cambios no staged
git diff --staged     # Ver cambios staged
```

### 4. **Mantén Tu Rama Main Limpia**
- Usa ramas para features: `feature/nombre`
- Usa ramas para fixes: `fix/nombre`
- Merge solo cuando esté probado

### 5. **Monitorea el Deployment**
- Revisa Actions después de cada push
- Verifica el sitio después de cada deployment
- Mantén un registro de cambios (CHANGELOG)

---

## 🔗 Enlaces Útiles

- **Aplicación en Vivo:** https://jeyrelit.github.io/SicoApp
- **Repositorio:** https://github.com/JeyrellT/SicoApp
- **GitHub Actions:** https://github.com/JeyrellT/SicoApp/actions
- **Settings:** https://github.com/JeyrellT/SicoApp/settings

---

## 📞 Soporte

Si tienes problemas:

1. Revisa esta guía primero
2. Revisa los logs en GitHub Actions
3. Verifica que todos los pre-requisitos estén instalados
4. Crea un issue en el repositorio si el problema persiste

---

**¡Tu aplicación está configurada para deployment automático!** 🎉

Cada vez que hagas `git push`, tu aplicación se actualizará automáticamente.
