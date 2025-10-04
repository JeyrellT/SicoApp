# 📸 Tutorial Visual - Publicar SICOP App

## 🎯 Objetivo
Publicar tu aplicación SICOP en GitHub Pages con deployment automático en **menos de 10 minutos**.

---

## 📋 Pre-requisitos

✅ Cuenta de GitHub  
✅ Git instalado  
✅ Node.js instalado  
✅ Código en tu computadora  

---

## 🚀 Paso a Paso

### **PASO 1: Preparar el Repositorio** ⏱️ 2 minutos

#### 1.1 Inicializar Git (si no lo has hecho)

```bash
cd C:\Users\jason\Desktop\sicop\sicop-app
git init
```

#### 1.2 Conectar con GitHub

```bash
git remote add origin https://github.com/JeyrellT/SicoApp.git
```

#### 1.3 Verificar la conexión

```bash
git remote -v
```

Deberías ver:
```
origin  https://github.com/JeyrellT/SicoApp.git (fetch)
origin  https://github.com/JeyrellT/SicoApp.git (push)
```

---

### **PASO 2: Subir el Código** ⏱️ 3 minutos

#### 2.1 Agregar todos los archivos

```bash
git add .
```

#### 2.2 Hacer el primer commit

```bash
git commit -m "feat: Sistema de deployment automatizado configurado"
```

#### 2.3 Subir a GitHub

```bash
# Si es la primera vez
git push -u origin main

# Si el repo ya existe y quieres forzar
git push -u origin main --force
```

**💡 Tip:** Si te pide usuario y contraseña, usa un Personal Access Token como contraseña.

---

### **PASO 3: Configurar GitHub Pages** ⏱️ 2 minutos

#### 3.1 Ir a Settings del Repositorio

1. Abre: https://github.com/JeyrellT/SicoApp
2. Click en **"Settings"** (⚙️)

#### 3.2 Configurar Pages

1. En el menú lateral izquierdo, click en **"Pages"**
2. En **"Source"**, selecciona:
   - **Branch:** `gh-pages` (espera a que aparezca después del primer deploy)
   - **Folder:** `/ (root)`
3. Click en **"Save"**

#### 3.3 Activar Permisos de GitHub Actions

1. En Settings, click en **"Actions"** → **"General"**
2. En **"Workflow permissions"**, selecciona:
   - ✅ **"Read and write permissions"**
3. Marca: ✅ **"Allow GitHub Actions to create and approve pull requests"**
4. Click en **"Save"**

---

### **PASO 4: Primer Deployment** ⏱️ 3 minutos

#### 4.1 Opción A: Esperar al Deployment Automático

Después de hacer `git push`:

1. Ve a: https://github.com/JeyrellT/SicoApp/actions
2. Verás el workflow **"Deploy to GitHub Pages"** ejecutándose
3. Espera a que termine (✅ verde)

#### 4.2 Opción B: Deploy Manual Inmediato

```bash
npm run deploy
```

Este comando:
- ✅ Construye la aplicación
- ✅ La sube a la rama `gh-pages`
- ✅ Todo listo en 2-3 minutos

---

### **PASO 5: Verificar que Funciona** ⏱️ 1 minuto

#### 5.1 Esperar unos minutos

GitHub Pages tarda 2-5 minutos en actualizar.

#### 5.2 Visitar tu sitio

Abre en el navegador:
```
https://jeyrelit.github.io/SicoApp
```

#### 5.3 Limpiar caché si es necesario

Si no ves cambios:
- **Windows:** `Ctrl + Shift + Delete` o `Ctrl + F5`
- **Mac:** `Cmd + Shift + Delete` o `Cmd + Shift + R`

---

## 🔄 Actualizar la Aplicación (Uso Diario)

### Método Automático (Recomendado) ⭐

```bash
# 1. Haz tus cambios en el código

# 2. Guarda y sube
git add .
git commit -m "feat: descripción de los cambios"
git push

# 3. ¡GitHub Actions se encarga automáticamente!
```

**Ver el progreso:**
- https://github.com/JeyrellT/SicoApp/actions

### Método Manual (Rápido)

```bash
npm run deploy
```

---

## 🎨 Comandos Útiles del Día a Día

```bash
# Ver estado del deployment
npm run status

# Verificar que todo está listo
npm run precheck

# Desarrollo local
npm start

# Ver cambios no guardados
git status

# Ver último commit
git log -1

# Ver todas las ramas
git branch -a
```

---

## 📊 Entender GitHub Actions

### Ver Workflows

1. Ve a: https://github.com/JeyrellT/SicoApp/actions
2. Verás todos los deployments
3. Click en uno para ver detalles

### Estados Posibles

| Icono | Estado | Significado |
|-------|--------|-------------|
| 🟡 | En progreso | Deploying... |
| ✅ | Success | ¡Deploy exitoso! |
| ❌ | Failed | Hubo un error |
| ⏸️ | Queued | Esperando... |

### Si Falla un Deployment

1. Click en el workflow fallido
2. Click en el job que falló (build-and-deploy)
3. Lee el error en los logs
4. Errores comunes:
   - **"Build failed"** → Revisa errores de sintaxis
   - **"Permission denied"** → Verifica permisos en Settings
   - **"gh-pages not found"** → Ejecuta `npm run deploy` primero

---

## 🐛 Problemas Comunes y Soluciones

### ❌ "git push" pide contraseña constantemente

**Solución:**
```bash
# Usa SSH en vez de HTTPS
git remote set-url origin git@github.com:JeyrellT/SicoApp.git
```

O crea un Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Dale permisos de `repo`
4. Usa el token como contraseña

### ❌ "Branch gh-pages no aparece"

**Solución:**
```bash
# Haz el primer deploy manual
npm run deploy

# Espera 1 minuto, luego refresca la página de Settings > Pages
```

### ❌ "npm run deploy" falla

**Solución:**
```bash
# Reinstala gh-pages
npm install gh-pages --save-dev --legacy-peer-deps

# Intenta de nuevo
npm run deploy
```

### ❌ El sitio muestra 404

**Soluciones:**
1. Verifica que GitHub Pages esté en branch `gh-pages`
2. Espera 5-10 minutos (puede tardar)
3. Verifica la URL: `https://jeyrelit.github.io/SicoApp` (sin `/sicop-app`)
4. Limpia caché del navegador

### ❌ Los cambios no se ven en el sitio

**Soluciones:**
1. Limpia caché: `Ctrl + Shift + F5`
2. Verifica que GitHub Actions terminó ✅
3. Espera 3-5 minutos más
4. Abre en modo incógnito

---

## 📱 Desde Otro Lugar (Otro PC / Colaborador)

### Clonar el Repositorio

```bash
git clone https://github.com/JeyrellT/SicoApp.git
cd SicoApp/sicop-app
npm install
```

### Hacer Cambios

```bash
# Crea una rama
git checkout -b mi-feature

# Haz cambios, luego:
git add .
git commit -m "feat: mi cambio"
git push origin mi-feature

# Crea un Pull Request en GitHub
```

---

## 🎓 Conceptos Importantes

### ¿Qué es GitHub Pages?
- Hosting gratuito de GitHub
- Ideal para aplicaciones estáticas (React, Vue, etc.)
- URL: `https://usuario.github.io/repositorio`

### ¿Qué es GitHub Actions?
- CI/CD automático de GitHub
- Corre workflows cuando haces push
- Construye y despliega tu app automáticamente

### ¿Qué es gh-pages?
- NPM package para deployar a GitHub Pages
- Crea la rama `gh-pages` automáticamente
- Sube tu carpeta `build/` a esa rama

### ¿Qué es la rama gh-pages?
- Rama especial de Git
- Solo contiene archivos estáticos (HTML, CSS, JS)
- GitHub Pages sirve archivos desde esta rama

---

## 🎯 Checklist Final

Antes de considerar que todo está listo:

- [ ] ✅ Código subido a GitHub
- [ ] ✅ GitHub Pages configurado en Settings
- [ ] ✅ Permisos de Actions activados
- [ ] ✅ Primer deployment ejecutado
- [ ] ✅ Sitio accesible en https://jeyrelit.github.io/SicoApp
- [ ] ✅ GitHub Actions muestra ✅ verde
- [ ] ✅ Puedo hacer cambios y se actualizan automáticamente

---

## 🎊 ¡Felicidades!

Si llegaste hasta aquí y todo funcionó, ahora tienes:

✅ **Aplicación publicada** en la web  
✅ **Deployment automático** con cada push  
✅ **URL profesional** para compartir  
✅ **Sistema de CI/CD** como empresas grandes  
✅ **Gratis** para siempre en GitHub Pages  

---

## 📞 ¿Necesitas Ayuda?

### Recursos:
- **[Guía Completa de Deployment](./DEPLOYMENT_GUIDE.md)**
- **[Guía Rápida](./QUICK_DEPLOY.md)**
- **[Setup Completo](./SETUP_COMPLETO.md)**

### Soporte:
- GitHub Issues: https://github.com/JeyrellT/SicoApp/issues
- GitHub Actions: https://github.com/JeyrellT/SicoApp/actions

---

**¡Tu aplicación está en vivo!** 🌐🚀

Comparte el link: **https://jeyrelit.github.io/SicoApp**
