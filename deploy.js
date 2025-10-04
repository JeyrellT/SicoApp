#!/usr/bin/env node
/**
 * Script de Deployment Manual para SICOP App
 * 
 * Este script permite hacer deployment manual a GitHub Pages
 * cuando no quieras esperar al workflow automático.
 * 
 * Uso:
 *   node deploy.js
 *   npm run deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execute(command, description) {
  log(`\n🔧 ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completado`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error en ${description}`, 'red');
    log(error.message, 'red');
    return false;
  }
}

async function deploy() {
  log('\n🚀 Iniciando Deployment de SICOP App', 'bright');
  log('=' .repeat(50), 'blue');

  // Verificar que estamos en el directorio correcto
  if (!fs.existsSync('package.json')) {
    log('❌ Error: No se encuentra package.json', 'red');
    log('Asegúrate de ejecutar este script desde el directorio sicop-app', 'yellow');
    process.exit(1);
  }

  // Verificar que git está instalado
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (error) {
    log('❌ Error: Git no está instalado', 'red');
    process.exit(1);
  }

  // Verificar que gh-pages está instalado
  if (!fs.existsSync('node_modules/gh-pages')) {
    log('⚠️  gh-pages no está instalado, instalando...', 'yellow');
    if (!execute('npm install gh-pages --save-dev', 'Instalando gh-pages')) {
      process.exit(1);
    }
  }

  // Preguntar si quiere hacer commit de cambios pendientes
  try {
    const status = execSync('git status --porcelain').toString();
    if (status) {
      log('\n⚠️  Tienes cambios sin commitear:', 'yellow');
      log(status, 'yellow');
      log('\n💡 Tip: Haz commit de tus cambios antes de hacer deploy', 'blue');
      log('El workflow automático se ejecutará cuando hagas push', 'blue');
    }
  } catch (error) {
    // Ignorar errores de git
  }

  // Instalar dependencias si es necesario
  if (!fs.existsSync('node_modules')) {
    if (!execute('npm install', 'Instalando dependencias')) {
      process.exit(1);
    }
  }

  // Construir la aplicación
  if (!execute('npm run build', 'Construyendo aplicación para producción')) {
    process.exit(1);
  }

  // Deploy a GitHub Pages
  if (!execute('npx gh-pages -d build', 'Desplegando a GitHub Pages')) {
    process.exit(1);
  }

  log('\n' + '='.repeat(50), 'green');
  log('🎉 ¡Deployment completado exitosamente!', 'bright');
  log('\n📱 Tu aplicación estará disponible en:', 'blue');
  log('   https://jeyrelit.github.io/SicoApp', 'green');
  log('\n⏰ Nota: Puede tomar unos minutos en actualizarse', 'yellow');
  log('=' .repeat(50), 'green');
}

// Ejecutar deployment
deploy().catch((error) => {
  log('\n❌ Error durante el deployment:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
