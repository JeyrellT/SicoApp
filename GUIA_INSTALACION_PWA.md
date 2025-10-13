# 📱 Guía de Instalación - SICOP Analytics PWA

**SICOP Analytics - HQ Analytics™**  
© 2025 Saenz Fallas S.A. - Todos los derechos reservados

---

## 🎯 ¿Qué es una PWA?

SICOP Analytics ahora es una **Progressive Web App (PWA)**, lo que significa que puedes **instalarla en tu dispositivo** como si fuera una aplicación nativa, pero sin necesidad de descargarla desde una tienda de aplicaciones.

### ✨ Beneficios de Instalar la App:

✅ **Acceso Más Rápido** - Icono directo en tu escritorio o pantalla de inicio  
✅ **Experiencia de App Nativa** - Se abre en su propia ventana sin el navegador  
✅ **Funciona Offline** - Accede a datos previamente cargados sin internet  
✅ **Actualizaciones Automáticas** - Siempre tendrás la última versión  
✅ **Ocupa Poco Espacio** - Solo 5-10 MB (vs 100+ MB de apps tradicionales)  
✅ **Sin Tiendas de Apps** - Instalación directa desde el navegador

---

## 💻 Instalación en Windows

### Google Chrome / Microsoft Edge

1. **Abre la aplicación** en tu navegador:
   ```
   https://jeyrelit.github.io/SicoApp
   ```

2. **Busca el icono de instalación** en la barra de direcciones:
   - 🔵 Chrome: Icono ⊕ (más) a la derecha de la URL
   - 🔷 Edge: Icono de instalación similar

3. **Click en "Instalar"** o presiona el banner que aparece en pantalla

4. **Confirma la instalación** en el diálogo que aparece

5. **¡Listo!** La aplicación se abre automáticamente y aparece un icono en tu escritorio

### Desinstalar (Windows):

**Opción 1: Desde la app**
- Abre SICOP Analytics
- Menú (⋮) → Configuración → Desinstalar

**Opción 2: Desde Chrome**
- Chrome → Menú (⋮) → Más herramientas → Desinstalar SICOP Analytics

**Opción 3: Desde Windows**
- Configuración → Aplicaciones → Buscar "SICOP Analytics" → Desinstalar

---

## 🍎 Instalación en Mac

### Google Chrome

1. **Abre la aplicación** en Chrome:
   ```
   https://jeyrelit.github.io/SicoApp
   ```

2. **Click en el icono de instalación** en la barra de direcciones

3. **Confirma "Instalar"**

4. **Accede desde:**
   - Launchpad → SICOP Analytics
   - Aplicaciones → SICOP Analytics
   - Spotlight (⌘ + Espacio) → "SICOP Analytics"

### Safari

1. **Abre la aplicación** en Safari

2. **Click en "Compartir"** (icono de compartir)

3. **Selecciona "Agregar al Dock"**

4. **Personaliza el nombre** (opcional) y confirma

### Desinstalar (Mac):

- Finder → Aplicaciones → Arrastra "SICOP Analytics" a la Papelera
- O: Click derecho en Dock → Opciones → Eliminar del Dock

---

## 🤖 Instalación en Android

### Google Chrome / Samsung Internet

1. **Abre la aplicación** en tu navegador móvil:
   ```
   https://jeyrelit.github.io/SicoApp
   ```

2. **Aparecerá un banner** automáticamente: "Agregar SICOP Analytics a pantalla de inicio"

3. **Toca "Agregar"** o "Instalar"

4. **Confirma la instalación**

5. **El icono aparece** en tu pantalla de inicio

**Alternativa:**
- Menú (⋮) → "Agregar a pantalla de inicio"

### Desinstalar (Android):

- Mantén presionado el icono de la app → "Desinstalar"
- O: Configuración → Aplicaciones → SICOP Analytics → Desinstalar

---

## 📱 Instalación en iPhone/iPad (iOS)

### Safari

1. **Abre la aplicación** en Safari:
   ```
   https://jeyrelit.github.io/SicoApp
   ```

2. **Toca el botón "Compartir"** (□ con flecha hacia arriba)

3. **Desplázate y selecciona** "Agregar a inicio"

4. **Personaliza el nombre** (opcional)

5. **Toca "Agregar"** en la esquina superior derecha

6. **El icono aparece** en tu pantalla de inicio

**Nota:** En iOS, Safari es el único navegador que soporta instalación de PWAs.

### Desinstalar (iOS):

- Mantén presionado el icono → "Eliminar app" → Confirmar

---

## ⚙️ Características de la PWA

### Funcionalidad Offline

Una vez instalada, SICOP Analytics puede funcionar sin conexión a internet:

✅ **Datos en Caché:** Archivos CSV previamente cargados están disponibles  
✅ **Interfaz Completa:** Toda la UI funciona sin internet  
✅ **Sincronización Automática:** Cuando vuelva la conexión, se sincroniza

**Limitaciones Offline:**
- ❌ No se pueden cargar nuevos archivos CSV sin internet
- ❌ No se pueden acceder a enlaces externos

### Actualizaciones Automáticas

La aplicación se actualiza automáticamente cuando:
- Hay una nueva versión disponible
- Cierras y vuelves a abrir la app
- Se detecta conexión a internet

**Actualización Manual:**
1. Cierra completamente la aplicación
2. Vuelve a abrirla
3. Si hay actualización, verás un mensaje de confirmación

### Espacio en Disco

- **Aplicación:** ~5-10 MB
- **Datos en Caché:** Variable según archivos CSV cargados
- **Total Aproximado:** 10-50 MB

**Ver espacio usado:**
- Chrome: chrome://settings/content/all?searchSubpage=sicop
- Edge: edge://settings/content/all?searchSubpage=sicop

---

## 🛠️ Solución de Problemas

### No Aparece la Opción de Instalar

**Posibles causas:**

1. **No estás usando HTTPS**
   - Verifica que la URL comience con `https://`
   - GitHub Pages ya usa HTTPS ✅

2. **Ya está instalada**
   - Verifica si ya tienes la app instalada
   - Desinstala y vuelve a instalar si es necesario

3. **Navegador no compatible**
   - Usa Chrome, Edge o Safari
   - Actualiza tu navegador a la última versión

4. **Ya rechazaste la instalación**
   - Chrome recuerda si rechazaste antes
   - Borra los datos del sitio y vuelve a intentar
   - O usa el menú: ⋮ → Instalar SICOP Analytics

### La App No Abre o Da Error

1. **Verifica conexión a internet** (primera vez)
2. **Borra caché de la app:**
   - Chrome → Configuración → Privacidad → Borrar datos de navegación
   - Selecciona "Imágenes y archivos en caché"
3. **Desinstala y reinstala** la app

### Datos No Aparecen Offline

1. **Asegúrate de haber cargado datos** mientras estabas online
2. **El Service Worker necesita tiempo** para cachear (espera ~30 segundos)
3. **Abre Chrome DevTools:**
   - F12 → Application → Cache Storage
   - Verifica que existan cachés

### La App No Se Actualiza

1. **Cierra completamente** todas las ventanas de la app
2. **Espera ~30 segundos**
3. **Vuelve a abrir** la app
4. **Si persiste:** Desinstala, borra caché, reinstala

---

## 🔍 Verificar Estado de PWA

### Chrome DevTools

1. **Abre DevTools:** `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Opt+I` (Mac)

2. **Ve a la pestaña "Application"**

3. **Verifica:**
   - **Manifest:** Ver configuración de la PWA
   - **Service Workers:** Estado del worker (activado/instalando)
   - **Cache Storage:** Datos en caché
   - **Storage:** Espacio usado

### Lighthouse Audit

1. **Abre DevTools:** `F12`

2. **Pestaña "Lighthouse"**

3. **Selecciona "Progressive Web App"**

4. **Click "Generate report"**

5. **Verifica puntaje:** Debe ser >90 para buena PWA

---

## 📊 Uso y Rendimiento

### Primera Carga

La primera vez que abres la app:
- Descarga recursos (~5-10 MB)
- Registra Service Worker
- Cachea archivos para offline

**Tiempo:** ~10-30 segundos (dependiendo de conexión)

### Cargas Posteriores

Después de la primera instalación:
- Carga instantánea desde caché
- Solo descarga cambios necesarios

**Tiempo:** <1 segundo ⚡

### Recomendaciones de Uso

✅ **Mantén la app actualizada:** Acepta actualizaciones cuando aparezcan  
✅ **Carga datos regularmente:** Para tener información offline  
✅ **Cierra pestañas duplicadas:** Evita conflictos de caché  
✅ **Usa conexión WiFi:** Para cargas iniciales grandes

---

## 🔒 Privacidad y Seguridad

### ¿Qué Datos se Almacenan?

- ✅ Archivos de la aplicación (HTML, CSS, JS)
- ✅ Imágenes y recursos (logos, iconos)
- ✅ Archivos CSV que tú cargues
- ✅ Configuraciones de la app

### ¿Dónde se Almacenan?

**Localmente en tu dispositivo:**
- Cache API del navegador
- IndexedDB (base de datos local)
- Local Storage

**NO se envían a servidores externos** ❌

### Borrar Todos los Datos

**Chrome/Edge:**
1. Configuración → Privacidad y seguridad
2. Borrar datos de navegación
3. Seleccionar "Sitios específicos"
4. Buscar "sicop" o "jeyrelit.github.io"
5. Click "Borrar"

**Safari:**
1. Preferencias → Privacidad
2. Administrar datos de sitios web
3. Buscar "sicop"
4. Eliminar

---

## 📞 Soporte

### Problemas o Preguntas

Si tienes problemas con la instalación o uso de la PWA:

1. **Revisa esta guía** completamente
2. **Verifica requisitos del sistema**
3. **Prueba en otro navegador**
4. **Contacta a soporte técnico:**
   - Email: [soporte@saenzfallas.com]
   - Teléfono: [número de contacto]

### Reportar Bugs

Si encuentras un error:
1. Anota el navegador y versión
2. Describe el problema detalladamente
3. Incluye capturas de pantalla si es posible
4. Envía a: [email de soporte]

---

## 📚 Recursos Adicionales

### Documentación Técnica

- [INVESTIGACION_PWA_INSTALABLE.md](./INVESTIGACION_PWA_INSTALABLE.md) - Detalles técnicos de la PWA
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guía de despliegue

### Enlaces Útiles

- **Aplicación Web:** https://jeyrelit.github.io/SicoApp
- **Repositorio:** https://github.com/JeyrellT/SicoApp
- **Sitio Web:** [URL de Saenz Fallas S.A.]

---

## 🎓 Preguntas Frecuentes (FAQ)

**Q: ¿Necesito pagar por la PWA?**  
A: No, SICOP Analytics es completamente gratuita de instalar y usar.

**Q: ¿Ocupa mucho espacio?**  
A: No, solo 5-10 MB para la app + datos que cargues.

**Q: ¿Funciona sin internet?**  
A: Sí, una vez instalada y con datos cargados, funciona completamente offline.

**Q: ¿Se actualiza automáticamente?**  
A: Sí, la app se actualiza automáticamente cuando hay nuevas versiones.

**Q: ¿Puedo instalarla en múltiples dispositivos?**  
A: Sí, puedes instalarla en todos tus dispositivos.

**Q: ¿Es segura?**  
A: Sí, todos los datos se almacenan localmente en tu dispositivo y usa HTTPS.

**Q: ¿Puedo desinstalarla cuando quiera?**  
A: Sí, se desinstala como cualquier otra aplicación.

**Q: ¿Funciona en tablets?**  
A: Sí, funciona en cualquier dispositivo con navegador moderno.

**Q: ¿Necesito cuenta para usar la app?**  
A: No, la app funciona completamente offline sin necesidad de cuenta.

**Q: ¿Los datos se sincronizan entre dispositivos?**  
A: No, cada instalación es independiente. Debes cargar datos en cada dispositivo.

---

## ✅ Checklist de Instalación

Antes de reportar un problema, verifica:

- [ ] Estoy usando un navegador compatible (Chrome, Edge, Safari)
- [ ] Mi navegador está actualizado a la última versión
- [ ] La URL es correcta: `https://jeyrelit.github.io/SicoApp`
- [ ] Tengo conexión a internet estable (para primera instalación)
- [ ] Tengo espacio disponible en mi dispositivo (>50 MB)
- [ ] No tengo la app ya instalada
- [ ] He intentado en modo incógnito/privado

---

**Última actualización:** 4 de octubre de 2025  
**Versión de la guía:** 1.0  
**Compatibilidad:** SICOP Analytics v1.0.0+

---

© 2025 Saenz Fallas S.A. - Todos los derechos reservados  
HQ Analytics™ - High Technology Quality Analytics
