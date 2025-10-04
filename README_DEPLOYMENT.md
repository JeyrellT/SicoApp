# 🏛️ SICOP App - Sistema de Consulta y Análisis de Contrataciones Públicas

[![Deploy Status](https://github.com/JeyrellT/SicoApp/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/JeyrellT/SicoApp/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://jeyrelit.github.io/SicoApp)

Sistema interactivo para analizar datos de contrataciones del Sistema de Compras Públicas (SICOP) con clasificación automatizada, dashboards interactivos y filtros avanzados.

## 🌐 Demo en Vivo

**[🚀 Ver Aplicación](https://jeyrelit.github.io/SicoApp)**

## ✨ Características Principales

- 📊 **Dashboards Interactivos** - Visualización de métricas y estadísticas
- 🏢 **Análisis por Institución** - Datos filtrados por entidad gubernamental
- 🏷️ **Clasificación Automática NLP** - Categorización inteligente de contratos
- 🔍 **Filtros Avanzados** - Búsqueda por múltiples criterios
- 📈 **Gráficos Dinámicos** - Visualizaciones con Chart.js y Recharts
- 📁 **Carga de CSV** - Importación de datos personalizados
- ⚡ **Alto Rendimiento** - Optimizado para grandes volúmenes de datos

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Git

### Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/JeyrellT/SicoApp.git

# Navegar al directorio
cd SicoApp/sicop-app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación se abrirá en [http://localhost:3000](http://localhost:3000)

## 📦 Scripts Disponibles

```bash
npm start          # Iniciar servidor de desarrollo
npm run build      # Construir para producción
npm test           # Ejecutar tests
npm run deploy     # Deploy manual a GitHub Pages
```

## 🔄 Deployment Automático

Esta aplicación usa **GitHub Actions** para deployment automático:

1. **Haz tus cambios** en el código
2. **Commit y push** a la rama `main`
3. **GitHub Actions automáticamente:**
   - ✅ Construye la aplicación
   - ✅ Ejecuta verificaciones
   - ✅ Despliega a GitHub Pages
4. **Tu sitio se actualiza** en 2-3 minutos

### Deployment Manual

Para hacer deployment manual inmediato:

```bash
npm run deploy
```

## 📚 Documentación

- **[🚀 Guía Rápida de Deployment](./QUICK_DEPLOY.md)** - Setup y comandos básicos
- **[📖 Guía Completa de Deployment](./DEPLOYMENT_GUIDE.md)** - Documentación detallada
- **[🏗️ Arquitectura de Datos](./ARQUITECTURA_DATOS.md)** - Estructura del sistema
- **[🤖 Sistema de Clasificación NLP](./CLASIFICACION_AVANZADA_NLP.md)** - IA para categorización

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19** - Framework UI
- **Zustand** - State management
- **Chart.js & Recharts** - Visualizaciones
- **Lucide React** - Iconos
- **TanStack Query** - Data fetching

### Procesamiento de Datos
- **PapaParse** - Parsing CSV
- **Lodash** - Utilidades
- **Moment.js & date-fns** - Manejo de fechas

### Build & Deploy
- **React Scripts** - Build tooling
- **GitHub Actions** - CI/CD automático
- **GitHub Pages** - Hosting

## 📊 Estructura del Proyecto

```
sicop-app/
├── src/
│   ├── components/        # Componentes React
│   ├── utils/            # Utilidades y helpers
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── public/               # Assets estáticos
├── scripts/              # Scripts de utilidad
├── .github/
│   └── workflows/        # GitHub Actions
└── build/               # Build de producción
```

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` según tus necesidades.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Changelog

Ver historial de cambios en las [GitHub Releases](https://github.com/JeyrellT/SicoApp/releases)

## 🐛 Reportar Problemas

Encontraste un bug? [Crea un issue](https://github.com/JeyrellT/SicoApp/issues/new)

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la [Licencia MIT](LICENSE)

## 👨‍💻 Autor

**Jeyrell Thompson**

- GitHub: [@JeyrellT](https://github.com/JeyrellT)
- Repositorio: [SicoApp](https://github.com/JeyrellT/SicoApp)

## 🙏 Agradecimientos

- Sistema de Compras Públicas (SICOP)
- Comunidad Open Source
- Contribuidores del proyecto

---

## 🔗 Enlaces Útiles

- **[🌐 Aplicación en Vivo](https://jeyrelit.github.io/SicoApp)**
- **[📊 GitHub Actions](https://github.com/JeyrellT/SicoApp/actions)**
- **[⚙️ Configuración](https://github.com/JeyrellT/SicoApp/settings)**

---

**¿Listo para publicar?** Lee la [Guía Rápida de Deployment](./QUICK_DEPLOY.md) 🚀
