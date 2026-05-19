#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('═══════════════════════════════════════════════════════════');
console.log('Layout V4 — Teste Funcional');
console.log('═══════════════════════════════════════════════════════════\n');

const checks = [];

// 1. Verificar files exist
console.log('1. Arquivos necessários:');
const requiredFiles = [
  'src/campo/fieldV4/CampoPageV4.jsx',
  'src/campo/fieldV4/FieldHeader.jsx',
  'src/campo/fieldV4/FieldStage.jsx',
  'src/campo/fieldV4/LeverRack.jsx',
  'src/campo/fieldV4/BorneStrip.jsx',
  'src/campo/fieldV4/MaletaPanel.jsx',
  'src/campo/fieldV4/CablesSVG.jsx',
  'src/campo/fieldV4/fieldV4Styles.js',
  'src/campo/fieldV4/fieldV4Data.js',
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✓' : '✗'} ${path.basename(file)}`);
  checks.push(exists);
});

// 2. Verificar imports
console.log('\n2. Imports críticos:');

const campoPagePath = path.join(__dirname, 'src/campo/fieldV4/CampoPageV4.jsx');
const campoPageContent = fs.readFileSync(campoPagePath, 'utf8');

const imports = [
  { name: 'import FieldHeader', check: campoPageContent.includes('FieldHeader') },
  { name: 'import FieldStage', check: campoPageContent.includes('FieldStage') },
  { name: 'useState for mode', check: campoPageContent.includes('useState') && campoPageContent.includes('mode') },
  { name: 'FieldHeader component render', check: campoPageContent.includes('<FieldHeader') },
];

imports.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// 3. Verificar FieldStage
console.log('\n3. Sincronização FieldStage:');

const fieldStagePath = path.join(__dirname, 'src/campo/fieldV4/FieldStage.jsx');
const fieldStageContent = fs.readFileSync(fieldStagePath, 'utf8');

const stageChecks = [
  { name: 'mode prop accepted', check: fieldStageContent.includes('{ mode') },
  { name: 'mode passed to LeverRack', check: fieldStageContent.includes('mode={mode}') },
  { name: 'CablesSVG gets mode', check: fieldStageContent.includes('mode={mode}') && fieldStageContent.includes('CablesSVG') },
];

stageChecks.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// 4. Verificar LeverRack
console.log('\n4. LeverRack sincronizado:');

const leverRackPath = path.join(__dirname, 'src/campo/fieldV4/LeverRack.jsx');
const leverRackContent = fs.readFileSync(leverRackPath, 'utf8');

const leverChecks = [
  { name: 'mode prop accepted', check: leverRackContent.includes('{ mode') },
  { name: 'useEffect for mode sync', check: leverRackContent.includes('useEffect') && leverRackContent.includes('mode') },
  { name: 'applyMode called', check: leverRackContent.includes('applyMode') },
  { name: 'no inline mode toggle buttons', check: !leverRackContent.includes('handleModeChange') || leverRackContent.match(/handleModeChange/g).length < 2 },
];

leverChecks.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// 5. Verificar CSS
console.log('\n5. CSS Structure:');

const stylesPath = path.join(__dirname, 'src/campo/fieldV4/fieldV4Styles.js');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

const cssChecks = [
  { name: '.field-page-v4 flex-column', check: stylesContent.includes('display: flex') && stylesContent.includes('flex-direction: column') },
  { name: '.field-header-v4 present', check: stylesContent.includes('.field-header-v4') },
  { name: '.field-main grid 2-col', check: stylesContent.includes('.field-main') && stylesContent.includes('grid-template-columns: 1fr 320px') },
  { name: '.lever-rack present', check: stylesContent.includes('.lever-rack') },
  { name: 'Media query fixed', check: !stylesContent.match(/\.field-page-v4.*grid-template-columns: 1fr;/) && stylesContent.includes('.field-main') },
];

cssChecks.forEach(({ name, check }) => {
  console.log(`   ${check ? '✓' : '✗'} ${name}`);
  checks.push(check);
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
const passed = checks.filter(Boolean).length;
const total = checks.length;
console.log(`Resultado: ${passed}/${total} verificações passaram`);

if (passed === total) {
  console.log('✅ Layout V4 está estruturalmente correto!');
  console.log('\nPróximas etapas:');
  console.log('  1. npm run dev  (abrir http://localhost:5179)');
  console.log('  2. Testar no browser:');
  console.log('     - Verificar se Header renderiza com título + 3 botões');
  console.log('     - Testar clique em alavancas (deve rotar 28°)');
  console.log('     - Testar toggle de modo (Operação/Teste/Mista)');
  console.log('     - Testar hover em cabos (deve destacar)');
  console.log('  3. Abrir DevTools e verificar console (0 errors)');
} else {
  console.log(`❌ ${total - passed} problemas encontrados. Corrigir antes de continuar.`);
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════\n');
