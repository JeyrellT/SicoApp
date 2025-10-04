#!/usr/bin/env node
/**
 * Script para verificar el estado del deployment
 * Muestra información útil sobre el proyecto y deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

console.log('\n');
log('═'.repeat(60), 'cyan');
log('  🚀 SICOP App - Estado de Deployment', 'bright');
log('═'.repeat(60), 'cyan');

// Información del proyecto
console.log('\n');
log('📦 Información del Proyecto:', 'blue');
log('─'.repeat(60), 'cyan');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
log(`  Nombre: ${packageJson.name}`, 'reset');
log(`  Versión: ${packageJson.version}`, 'reset');
log(`  Homepage: ${packageJson.homepage || 'No configurado'}`, packageJson.homepage ? 'green' : 'yellow');

// Estado de Git
console.log('\n');
log('📁 Estado de Git:', 'blue');
log('─'.repeat(60), 'cyan');

const gitBranch = exec('git rev-parse --abbrev-ref HEAD');
const gitRemote = exec('git config --get remote.origin.url');
const gitStatus = exec('git status --porcelain');

if (gitBranch) {
  log(`  Rama actual: ${gitBranch}`, gitBranch === 'main' || gitBranch === 'master' ? 'green' : 'yellow');
} else {
  log('  No es un repositorio git', 'red');
}

if (gitRemote) {
  log(`  Remoto: ${gitRemote}`, 'green');
} else {
  log('  No hay remoto configurado', 'yellow');
}

if (gitStatus) {
  log(`  ⚠️  Hay cambios sin commitear (${gitStatus.split('\n').length} archivos)`, 'yellow');
} else {
  log('  ✅ Working tree limpio', 'green');
}

// Último commit
const lastCommit = exec('git log -1 --pretty=format:"%h - %s (%cr)"');
if (lastCommit) {
  log(`  Último commit: ${lastCommit}`, 'cyan');
}

// Build
console.log('\n');
log('🏗️  Estado del Build:', 'blue');
log('─'.repeat(60), 'cyan');

if (fs.existsSync('build')) {
  const buildStats = fs.statSync('build');
  const buildDate = buildStats.mtime;
  const now = new Date();
  const diff = Math.floor((now - buildDate) / 1000 / 60); // minutos
  
  if (diff < 60) {
    log(`  ✅ Build existente (hace ${diff} minutos)`, 'green');
  } else if (diff < 1440) {
    log(`  Build existente (hace ${Math.floor(diff / 60)} horas)`, 'yellow');
  } else {
    log(`  Build existente (hace ${Math.floor(diff / 1440)} días)`, 'yellow');
  }
  
  // Tamaño del build
  const buildSize = exec('du -sh build 2>/dev/null || echo "N/A"');
  if (buildSize && buildSize !== 'N/A') {
    log(`  Tamaño: ${buildSize.split('\t')[0]}`, 'cyan');
  }
} else {
  log('  ⚠️  No hay build de producción', 'yellow');
  log('  Ejecuta: npm run build', 'cyan');
}

// Dependencias
console.log('\n');
log('📚 Dependencias:', 'blue');
log('─'.repeat(60), 'cyan');

if (fs.existsSync('node_modules')) {
  log('  ✅ node_modules instalado', 'green');
  
  // Verificar gh-pages
  if (fs.existsSync('node_modules/gh-pages')) {
    log('  ✅ gh-pages instalado', 'green');
  } else {
    log('  ⚠️  gh-pages no instalado', 'yellow');
    log('  Ejecuta: npm install gh-pages --save-dev --legacy-peer-deps', 'cyan');
  }
} else {
  log('  ⚠️  node_modules no existe', 'red');
  log('  Ejecuta: npm install', 'cyan');
}

// GitHub Actions
console.log('\n');
log('⚙️  GitHub Actions:', 'blue');
log('─'.repeat(60), 'cyan');

if (fs.existsSync('.github/workflows/deploy.yml')) {
  log('  ✅ Workflow configurado', 'green');
  log('  Archivo: .github/workflows/deploy.yml', 'cyan');
} else {
  log('  ⚠️  Workflow no encontrado', 'red');
}

// URLs importantes
console.log('\n');
log('🔗 URLs Importantes:', 'blue');
log('─'.repeat(60), 'cyan');

if (packageJson.homepage) {
  log(`  Sitio Web: ${packageJson.homepage}`, 'green');
}

if (gitRemote) {
  const repoUrl = gitRemote.replace('.git', '').replace('git@github.com:', 'https://github.com/');
  log(`  Repositorio: ${repoUrl}`, 'cyan');
  log(`  Actions: ${repoUrl}/actions`, 'cyan');
  log(`  Settings: ${repoUrl}/settings/pages`, 'cyan');
}

// Comandos disponibles
console.log('\n');
log('⚡ Comandos Disponibles:', 'blue');
log('─'.repeat(60), 'cyan');
log('  npm start          - Servidor de desarrollo', 'cyan');
log('  npm run build      - Build de producción', 'cyan');
log('  npm run deploy     - Deploy manual a GitHub Pages', 'cyan');
log('  npm test           - Ejecutar tests', 'cyan');

// Recomendaciones
console.log('\n');
log('💡 Próximos Pasos:', 'blue');
log('─'.repeat(60), 'cyan');

if (!gitRemote) {
  log('  1. Conecta tu repositorio:', 'yellow');
  log('     git remote add origin https://github.com/JeyrellT/SicoApp.git', 'cyan');
}

if (gitStatus) {
  log('  2. Commitea tus cambios:', 'yellow');
  log('     git add . && git commit -m "mensaje"', 'cyan');
}

if (!fs.existsSync('build')) {
  log('  3. Crea un build de producción:', 'yellow');
  log('     npm run build', 'cyan');
}

if (gitRemote && !gitStatus) {
  log('  ✅ Listo para deployment!', 'green');
  log('     git push origin main', 'cyan');
  log('     o ejecuta: npm run deploy', 'cyan');
}

console.log('\n');
log('═'.repeat(60), 'cyan');
console.log('\n');
