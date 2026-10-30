// Assemble le HTML autonome à partir du gabarit et des modules (aucune dépendance).
// Usage : node scripts/build.mjs [--out chemin]   → dist/nomadom-designer.html par défaut
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'build/manifest.json'), 'utf8'));
const oi = process.argv.indexOf('--out');
const outFile = path.resolve(root, oi > 0 ? process.argv[oi + 1] : man.output);
let html = fs.readFileSync(path.join(root, man.template), 'utf8');
const used = new Set();
html = html.replace(/\{\{MODULE:([a-z0-9-]+)\}\}/g, (_, id) => {
  if (!man.modules[id]) throw new Error('Marqueur inconnu dans le gabarit : ' + id);
  if (used.has(id)) throw new Error('Module inséré deux fois : ' + id);
  used.add(id);
  const code = fs.readFileSync(path.join(root, man.modules[id]), 'utf8');
  if (/<\/script/i.test(code)) throw new Error('« </script » interdit dans ' + man.modules[id]);
  return code;
});
const unused = Object.keys(man.modules).filter(k => !used.has(k));
if (unused.length) throw new Error('Modules du manifeste sans marqueur dans le gabarit : ' + unused.join(', '));
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
const sha = crypto.createHash('sha256').update(html).digest('hex');
console.log('Assemblé : ' + path.relative(root, outFile) + ' · ' + used.size + ' modules · ' + Buffer.byteLength(html) + ' octets · sha256 ' + sha.slice(0, 16));
