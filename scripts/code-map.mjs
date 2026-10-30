// Carte du code : modules, taille, fonctions et leur ligne — pour lire de façon ciblée.
// Usage : node scripts/code-map.mjs              → résumé de tous les modules
//         node scripts/code-map.mjs app          → fonctions des modules dont le chemin contient « app »
//         node scripts/code-map.mjs -f regenerate → où est définie une fonction
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'build/manifest.json'), 'utf8'));
const args = process.argv.slice(2), fi = args.indexOf('-f'), fnQuery = fi >= 0 ? args[fi + 1] : null, filter = fi >= 0 ? null : args[0];
const RE = /^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|^\s*(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/;
for (const [id, rel] of Object.entries(man.modules)) {
  if (rel.startsWith('vendor/')) { if (!filter && !fnQuery) console.log(rel.padEnd(42) + '  (tiers — ne pas lire)'); continue; }
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
  const fns = []; lines.forEach((l, i) => { const m = l.match(RE); if (m) fns.push([m[1] || m[2], i + 1]); });
  if (fnQuery) { fns.filter(f => f[0] === fnQuery).forEach(f => console.log(rel + ':' + f[1] + '  ' + f[0])); continue; }
  if (filter && !rel.includes(filter)) continue;
  console.log(rel.padEnd(42) + String(lines.length).padStart(6) + ' lignes  ' + fns.length + ' fonctions');
  if (filter) console.log('  ' + fns.map(f => f[0] + ':' + f[1]).join('  '));
}
