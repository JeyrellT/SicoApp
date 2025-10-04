/* Simple script to load dataManager and print getInstitucionDashboard for one institution.
   Usage: node scripts/check_institucion.js
*/

const path = require('path');
const { dataManager } = require('../src/data/DataManager');

async function run() {
  try {
    const cleanedDir = path.resolve(__dirname, '..', '..', 'cleaned');

    if (typeof dataManager.cargarDatos === 'function') {
      console.log('Cargando datos desde:', cleanedDir);
      // Note: cargarDatos may be synchronous or asynchronous depending on implementation
      const res = dataManager.cargarDatos(cleanedDir);
      if (res && typeof res.then === 'function') {
        await res;
      }
      console.log('Carga finalizada.');
    } else {
      console.log('dataManager.cargarDatos no está disponible. Asumiendo datos ya cargados.');
    }

    const params = { codigoInstitucion: '4000042147' };
    console.log('Llamando getInstitucionDashboard con params:', params);
    const result = dataManager.getInstitucionDashboard(params);
    console.log('Resultado obtenido:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error al ejecutar script:', err);
    process.exit(1);
  }
}

run();
