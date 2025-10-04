#!/usr/bin/env node
/**
 * Ayuda rápida para comandos de deployment
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('\n');
log('═'.repeat(70), 'cyan');
log('  🚀 SICOP App - Comandos de Deployment', 'bright');
log('═'.repeat(70), 'cyan');

console.log('\n');
log('📦 DESARROLLO', 'blue');
log('─'.repeat(70), 'cyan');
log('  npm start                     → Servidor local (localhost:3000)', 'reset');
log('  npm run build                 → Build de producción', 'reset');
log('  npm test                      → Ejecutar tests', 'reset');

console.log('\n');
log('🚀 DEPLOYMENT', 'blue');
log('─'.repeat(70), 'cyan');
log('  npm run deploy                → Deploy manual inmediato', 'green');
log('  npm run status                → Ver estado del deployment', 'reset');
log('  npm run precheck              → Verificar pre-requisitos', 'reset');
log('  node deploy.js                → Deploy con verificaciones', 'reset');

console.log('\n');
log('📊 GIT & GITHUB', 'blue');
log('─'.repeat(70), 'cyan');
log('  git status                    → Ver cambios pendientes', 'reset');
log('  git add .                     → Agregar todos los cambios', 'reset');
log('  git commit -m "mensaje"       → Hacer commit', 'reset');
log('  git push                      → Subir a GitHub (auto-deploy)', 'green');
log('  git log --oneline             → Ver historial', 'reset');

console.log('\n');
log('🌐 URLS IMPORTANTES', 'blue');
log('─'.repeat(70), 'cyan');
log('  Sitio Web:', 'yellow');
log('    https://jeyrelit.github.io/SicoApp', 'green');
log('  GitHub Actions:', 'yellow');
log('    https://github.com/JeyrellT/SicoApp/actions', 'cyan');
log('  Settings:', 'yellow');
log('    https://github.com/JeyrellT/SicoApp/settings/pages', 'cyan');

console.log('\n');
log('⚡ FLUJO RÁPIDO DE ACTUALIZACIÓN', 'blue');
log('─'.repeat(70), 'cyan');
log('  1. Haz tus cambios en el código', 'reset');
log('  2. git add . && git commit -m "mensaje"', 'yellow');
log('  3. git push', 'green');
log('  4. ¡Espera 2-3 minutos y tu sitio estará actualizado!', 'cyan');

console.log('\n');
log('📚 DOCUMENTACIÓN', 'blue');
log('─'.repeat(70), 'cyan');
log('  QUICK_DEPLOY.md               → Guía rápida', 'reset');
log('  DEPLOYMENT_GUIDE.md           → Guía completa', 'reset');
log('  TUTORIAL_VISUAL.md            → Tutorial paso a paso', 'reset');
log('  SETUP_COMPLETO.md             → Setup completo', 'reset');

console.log('\n');
log('💡 TIPS', 'blue');
log('─'.repeat(70), 'cyan');
log('  • Siempre prueba con "npm start" antes de deployar', 'yellow');
log('  • Revisa GitHub Actions para ver el estado del deploy', 'yellow');
log('  • Usa "npm run status" para verificar todo', 'yellow');
log('  • Limpia caché del navegador: Ctrl + Shift + F5', 'yellow');

console.log('\n');
log('═'.repeat(70), 'cyan');
console.log('\n');
