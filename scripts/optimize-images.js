/**
 * Script de Optimización de Imágenes
 * Comprime imágenes PNG/JPG y genera versiones WebP
 * 
 * Uso: node scripts/optimize-images.js
 */

const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = 'public/images';
const OUTPUT_DIR = 'public/images/optimized';

async function optimizeImages() {
  console.log('🖼️  Iniciando optimización de imágenes...\n');

  try {
    // Crear directorio de salida si no existe
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Optimizar imágenes
    const files = await imagemin([`${INPUT_DIR}/*.{jpg,png,jpeg}`], {
      destination: OUTPUT_DIR,
      plugins: [
        imageminMozjpeg({ quality: 80 }),
        imageminPngquant({ 
          quality: [0.6, 0.8],
          speed: 1
        }),
        imageminWebp({ 
          quality: 75,
          method: 6
        })
      ]
    });

    console.log('✅ Imágenes optimizadas:', files.length);
    
    // Calcular ahorro de espacio
    let originalSize = 0;
    let optimizedSize = 0;

    files.forEach(file => {
      const originalPath = path.join(INPUT_DIR, path.basename(file.sourcePath));
      if (fs.existsSync(originalPath)) {
        originalSize += fs.statSync(originalPath).size;
      }
      optimizedSize += fs.statSync(file.destinationPath).size;
    });

    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);
    
    console.log('\n📊 Estadísticas:');
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimizado: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Ahorro: ${savings}%`);
    
    console.log('\n✨ Optimización completada!');
    console.log(`   Archivos guardados en: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Error al optimizar imágenes:', error);
    process.exit(1);
  }
}

optimizeImages();
