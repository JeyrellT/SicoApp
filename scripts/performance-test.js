/**
 * Script de Test de Performance
 * Ejecuta Lighthouse y muestra métricas Core Web Vitals
 * 
 * Requisitos: npm install -g lighthouse
 * Uso: node scripts/performance-test.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL = 'https://jeyrellt.github.io/SicoApp';
const OUTPUT_DIR = path.join(__dirname, '../performance-reports');

async function runLighthouse() {
  console.log('🔍 Ejecutando Lighthouse Performance Test...\n');
  console.log(`📍 URL: ${URL}\n`);

  // Crear directorio de reportes
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.html`);
  const jsonPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.json`);

  const lighthouse = spawn('lighthouse', [
    URL,
    '--output=html,json',
    `--output-path=${reportPath.replace('.html', '')}`,
    '--preset=desktop',
    '--only-categories=performance',
    '--chrome-flags="--headless"'
  ]);

  lighthouse.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  lighthouse.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  lighthouse.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Lighthouse test completado!');
      console.log(`\n📄 Reporte HTML: ${reportPath}`);
      console.log(`📄 Reporte JSON: ${jsonPath}`);
      
      // Leer y mostrar métricas clave
      try {
        const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const audits = report.audits;
        
        console.log('\n📊 Core Web Vitals:\n');
        console.log(`   LCP (Largest Contentful Paint): ${audits['largest-contentful-paint'].displayValue}`);
        console.log(`   FID (First Input Delay): ${audits['max-potential-fid']?.displayValue || 'N/A'}`);
        console.log(`   CLS (Cumulative Layout Shift): ${audits['cumulative-layout-shift'].displayValue}`);
        console.log(`   FCP (First Contentful Paint): ${audits['first-contentful-paint'].displayValue}`);
        console.log(`   TBT (Total Blocking Time): ${audits['total-blocking-time'].displayValue}`);
        console.log(`   Speed Index: ${audits['speed-index'].displayValue}`);
        
        const score = report.categories.performance.score * 100;
        console.log(`\n🎯 Performance Score: ${score}/100`);
        
        if (score >= 90) {
          console.log('   🎉 ¡Excelente! Tu sitio es muy rápido.');
        } else if (score >= 50) {
          console.log('   ⚠️  Mejorable. Revisa las oportunidades en el reporte.');
        } else {
          console.log('   🔴 Crítico. Se requieren optimizaciones urgentes.');
        }
        
      } catch (error) {
        console.error('❌ Error al leer reporte JSON:', error.message);
      }
      
    } else {
      console.error(`❌ Lighthouse falló con código: ${code}`);
      console.error('\n💡 Asegúrate de tener Lighthouse instalado:');
      console.error('   npm install -g lighthouse');
    }
  });
}

runLighthouse();
