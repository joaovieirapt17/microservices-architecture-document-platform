#!/usr/bin/env node

/**
 * Test Runner Helper
 * Facilita a execução de testes específicos
 * 
 * Uso:
 *   node test-runner.js [opções]
 * 
 * Opções:
 *   --unit              Executar apenas testes unitários
 *   --integration       Executar apenas testes de integração
 *   --e2e               Executar apenas testes E2E
 *   --coverage          Gerar relatório de cobertura
 *   --watch             Modo watch
 *   --file=<nome>       Executar ficheiro específico
 *   --test=<nome>       Executar teste específico
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse argumentos
const args = process.argv.slice(2);
const options = {
  unit: args.includes('--unit'),
  integration: args.includes('--integration'),
  e2e: args.includes('--e2e'),
  coverage: args.includes('--coverage'),
  watch: args.includes('--watch'),
  file: args.find(arg => arg.startsWith('--file='))?.split('=')[1],
  test: args.find(arg => arg.startsWith('--test='))?.split('=')[1],
};

// Build comando Jest
let jestArgs = [];

// Tipo de teste
if (options.unit) {
  jestArgs.push('--testPathPattern=unit');
} else if (options.integration) {
  jestArgs.push('--testPathPattern=integration');
} else if (options.e2e) {
  jestArgs.push('--testPathPattern=e2e');
}

// Ficheiro específico
if (options.file) {
  jestArgs.push(options.file);
}

// Teste específico
if (options.test) {
  jestArgs.push('-t', options.test);
}

// Coverage
if (options.coverage) {
  jestArgs.push('--coverage');
}

// Watch mode
if (options.watch) {
  jestArgs.push('--watch');
}

// Adicionar flags padrão
jestArgs.push('--verbose');

// Executar Jest
console.log('🧪 Executando testes...\n');
console.log(`Comando: jest ${jestArgs.join(' ')}\n`);

const jest = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
});

jest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Todos os testes passaram!');
  } else {
    console.log('\n❌ Alguns testes falharam.');
    process.exit(code);
  }
});

jest.on('error', (error) => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});
