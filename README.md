# SICOP Analytics - HQ Analytics™

![HQ Analytics Logo](public/logo-hq-analytics.png)

## Sistema de Análisis de Contrataciones Públicas

**SICOP Analytics** es un sistema avanzado de análisis y gestión de datos de contrataciones públicas, desarrollado con tecnología de alta calidad (High Technology Quality).

---

## 🏢 Información Corporativa

**© 2025 Saenz Fallas S.A. - Todos los derechos reservados**

- **Empresa Creadora:** Saenz Fallas S.A.
- **Marca:** HQ Analytics™ (High Technology Quality Analytics)
- **Licencia:** Propiedad Privada - Uso Exclusivo
- **Derechos:** Software de propiedad exclusiva

> ⚠️ **AVISO LEGAL**: Este software es propiedad exclusiva de Saenz Fallas S.A. Queda prohibida su reproducción, distribución o modificación sin autorización expresa por escrito de Saenz Fallas S.A.

---

## Arquitectura (desde julio 2026)

La aplicación **ya no carga archivos CSV en el navegador**. Los datos viven en un
backend propio que ingiere a diario el ZIP mensual del Observatorio de Compra
Pública y conserva los **últimos 24 meses**.

```
Observatorio ──▶ ETL diario ──▶ PostgreSQL ──▶ API FastAPI ──▶ este frontend
  (ZIP mensual)   (cron 08:00)   (24 meses)     (agregados)     (GitHub Pages)
```

- El acceso requiere **cuenta de usuario**. Hay tres perfiles: `consulta`,
  `analista` y `admin`, con distintos permisos, límites de página y meses de
  historia visibles.
- El navegador ya no recibe filas crudas: pide agregados ya calculados. Una vista
  de dashboard pesa menos de 1 KB, contra los 37 MB del ZIP que antes descargaba
  cada usuario.

El backend vive en [`backend/`](backend/README.md). Para desplegarlo, ver
[`backend/docs/DESPLIEGUE_RAILWAY.md`](backend/docs/DESPLIEGUE_RAILWAY.md).

### Variable obligatoria para compilar el frontend

```bash
REACT_APP_API_URL=https://<dominio-de-la-api> npm run build
```

Sin ella el cliente apunta a `http://localhost:8000` y la aplicación publicada no
podrá autenticarse. El dominio del frontend debe además estar en `CORS_ORIGINS`
del servicio `api`.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# SICOP App

## Nueva pestaña: Categorías

- Ubicación: abrir la app y entrar a "🏷️ Categorías" en el panel principal.
- Permite: crear, editar y eliminar categorías manuales con:
  - Palabras clave para detectar licitaciones relacionadas.
  - Filtro por instituciones específicas.
  - Agrupar categorías para futuros análisis.
- Asistente: ejecuta el análisis por keywords para previsualizar licitaciones relevantes antes de guardar.
- Persistencia: se guarda en `localStorage` del navegador (no requiere backend).
