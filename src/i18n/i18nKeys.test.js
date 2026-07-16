import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import pt from './locales/pt.json';
import en from './locales/en.json';
import es from './locales/es.json';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

// Chaves literais t("ns.chave") no código-fonte; comentários de bloco (JSDoc com
// exemplos) são removidos antes da varredura; chaves dinâmicas (template) ficam fora.
function collectUsedKeys() {
  const keyRe = /(?<![\w$.])t\(\s*['"]([A-Za-z0-9_.-]+)['"]/g;
  const used = new Map(); // key -> Set<arquivo>
  for (const file of walk(SRC)) {
    const txt = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let m;
    while ((m = keyRe.exec(txt))) {
      if (!m[1].includes('.')) continue;
      if (!used.has(m[1])) used.set(m[1], new Set());
      used.get(m[1]).add(file.slice(SRC.length + 1).replace(/\\/g, '/'));
    }
  }
  return used;
}

function hasKey(obj, key) {
  let cur = obj;
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = cur[part];
  }
  return cur != null && typeof cur !== 'object';
}

describe('i18n — chaves usadas existem nos locales', () => {
  const used = collectUsedKeys();
  it('encontra chaves literais no código', () => {
    expect(used.size).toBeGreaterThan(100);
  });
  for (const [name, locale] of [['pt', pt], ['en', en], ['es', es]]) {
    it(`todas as chaves usadas existem em ${name}.json`, () => {
      const missing = [...used]
        .filter(([key]) => !hasKey(locale, key))
        .map(([key, files]) => `${key} (${[...files].join(', ')})`);
      expect(missing, `Chaves ausentes em ${name}.json:\n${missing.join('\n')}`).toEqual([]);
    });
  }
});
