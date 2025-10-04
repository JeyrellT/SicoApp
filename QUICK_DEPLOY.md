# 🎯 Guía de Inicio Rápido - SICOP Deployment

## ⚡ Setup Inicial (Una Sola Vez)

### 1. Instalar Dependencias
```bash
cd sicop-app
npm install
```

### 2. Configurar GitHub Pages
1. Ve a https://github.com/JeyrellT/SicoApp/settings/pages
2. En **Source**, selecciona: `gh-pages` branch
3. Click **Save**

¡Listo! El sistema de deployment automático está configurado.

---

## 🚀 Cómo Publicar Actualizaciones

### Método Automático (Recomendado) ⭐

```bash
# 1. Haz tus cambios en el código

# 2. Guarda y sube los cambios
git add .
git commit -m "Descripción de cambios"
git push

# 3. ¡Automáticamente se deploya!
# Espera 2-3 minutos y visita:
# https://jeyrelit.github.io/SicoApp
```

### Método Manual (Rápido)

```bash
npm run deploy
```

---

## 📝 Comandos Útiles

```bash
npm start          # Desarrollo local (localhost:3000)
npm run build      # Construir para producción
npm run deploy     # Deploy manual a GitHub Pages
npm test           # Ejecutar tests
```

---

## 🔗 Enlaces Importantes

- **Sitio Web:** https://jeyrelit.github.io/SicoApp
- **Repositorio:** https://github.com/JeyrellT/SicoApp
- **Actions (ver deploys):** https://github.com/JeyrellT/SicoApp/actions

---

## ❓ ¿Problemas?

Lee la **[Guía Completa de Deployment](./DEPLOYMENT_GUIDE.md)** para más detalles.
