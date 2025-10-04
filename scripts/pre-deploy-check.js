#!/usr/bin/env node
/**
 * Script de Pre-Deploy Check
 * 
 * Verifica que todo esté listo antes de hacer deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function check(name, test) {
  try {
    const result = test();
    if (result) {
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}: ${error.message}`);
    return false;
  }
}

console.log('\n🔍 Verificando Pre-requisitos de Deployment\n');

const checks = [
  ['Node.js instalado', () => {
    execSync('node --version', { stdio: 'ignore' });
    return true;
  }],
  ['npm instalado', () => {
    execSync('npm --version', { stdio: 'ignore' });
    return true;
  }],
  ['Git instalado', () => {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  }],
  ['package.json existe', () => fs.existsSync('package.json')],
  ['src/ directorio existe', () => fs.existsSync('src')],
  ['public/ directorio existe', () => fs.existsSync('public')],
  ['Dependencias instaladas', () => fs.existsSync('node_modules')],
];

const results = checks.map(([name, test]) => check(name, test));
const allPassed = results.every(r => r);

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log(`${colors.green}✅ Todos los checks pasaron. Listo para deployment!${colors.reset}`);
} else {
  console.log(`${colors.red}❌ Algunos checks fallaron. Revisa los errores arriba.${colors.reset}`);
  process.exit(1);
}
console.log('='.repeat(50) + '\n');
