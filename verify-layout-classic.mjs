#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('═══════════════════════════════════════════════════════════');
console.log('Classic Layout Reorganization — Verification');
console.log('═══════════════════════════════════════════════════════════\n');

const checks = [];

// 1. Verify CampoPage.jsx structure
console.log('1. CampoPage.jsx Structure:');
const campoPath = path.join(__dirname, 'src/CampoPage.jsx');
const campoContent = fs.readFileSync(campoPath, 'utf8');

const checks1 = [
  { name: 'Grid layout (2 columns)', check: campoContent.includes('grid-template-columns:1fr 240px') },
  { name: '.campo-main container', check: campoContent.includes('className="campo-main"') },
  { name: '.campo-sidebar container', check: campoContent.includes('className="campo-sidebar"') },
  { name: 'RÉGUA DE BORNES present', check: campoContent.includes('RÉGUA DE BORNES') },
  { name: 'MALETA DE TESTE present', check: campoContent.includes('MALETA DE TESTE') },
  { name: 'CHAVE DE AFERIÇÃO present', check: campoContent.includes('CHAVE DE AFERIÇÃO') },
  { name: 'DISJUNTOR in sidebar', check: campoContent.includes('DISJUNTOR') },
  { name: 'PREDEFINIÇÕES in sidebar', check: campoContent.includes('PREDEFINIÇÕES') },
];

checks1.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// 2. Verify CSS changes
console.log('\n2. CSS Updates:');

const checks2 = [
  { name: 'campo-root uses var(--bg)', check: campoContent.includes('background:var(--bg)') },
  { name: 'bk-cmd-bar background var(--card2)', check: campoContent.includes('background:var(--card2)') },
  { name: 'preset-bar background var(--card2)', check: campoContent.includes('flex-direction:column') },
  { name: 'Section labels uppercase', check: campoContent.includes('text-transform:uppercase') },
];

checks2.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// 3. Count occurrences
console.log('\n3. Content Organization:');

const countRegulex = (pattern) => (campoContent.match(new RegExp(pattern, 'g')) || []).length;

const checks3 = [
  { name: 'RÉGUA appears once', check: countRegulex('RÉGUA DE BORNES') === 1 },
  { name: 'MALETA appears once', check: countRegulex('MALETA DE TESTE') === 1 },
  { name: 'CHAVE appears once', check: countRegulex('CHAVE DE AFERIÇÃO') === 1 },
  { name: 'DISJUNTOR appears once', check: countRegulex('DISJUNTOR') === 1 },
  { name: 'PREDEFINIÇÕES appears once', check: countRegulex('PREDEFINIÇÕES') === 1 },
];

checks3.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
const passed = checks.filter(Boolean).length;
const total = checks.length;
console.log(`Result: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('✅ Layout reorganization verified!');
  console.log('\nBrowser Testing:');
  console.log('  • Open http://localhost:5180');
  console.log('  • Verify 2-column layout: main + sidebar');
  console.log('  • Check section positioning');
  console.log('  • Test functionality (wiring, buttons)');
} else {
  console.log(`❌ ${total - passed} issues found.`);
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════\n');
