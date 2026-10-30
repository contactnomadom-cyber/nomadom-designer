// Découpe un HTML assemblé en gabarit + modules (sert une fois, pour amorcer le dépôt,
// ou pour vérifier qu'un HTML reçu d'ailleurs correspond aux sources).
// Usage : node scripts/split.mjs <fichier.html> [dossier-racine]
import fs from 'node:fs'; import path from 'node:path';
const [src, rootArg] = process.argv.slice(2);
const root = path.resolve(rootArg || '.');
const man = JSON.parse(fs.readFileSync(path.join(root, 'build/manifest.json'), 'utf8'));
let html = fs.readFileSync(src, 'utf8');
const i0 = html.indexOf('<!DOCTYPE html>'); if (i0 > 0) html = html.slice(i0);   // enveloppe de la page publiée
const re = /<script(?: id="([^"]+)")?>([\s\S]*?)<\/script>/g;
let out = '', last = 0, m, seen = new Set();
while ((m = re.exec(html))) {
  const id = m[1] || 'main';
  if (!man.modules[id]) throw new Error('Script sans entrée dans le manifeste : ' + id);
  if (seen.has(id)) throw new Error('Script en double : ' + id); seen.add(id);
  const file = path.join(root, man.modules[id]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, m[2]);
  const open = m[1] ? '<script id="' + m[1] + '">' : '<script>';
  out += html.slice(last, m.index) + open + '{{MODULE:' + id + '}}</script>';
  last = re.lastIndex;
}
out += html.slice(last);
const missing = Object.keys(man.modules).filter(k => !seen.has(k));
if (missing.length) throw new Error('Modules du manifeste absents du HTML : ' + missing.join(', '));
fs.writeFileSync(path.join(root, man.template), out);
console.log('Gabarit + ' + seen.size + ' modules écrits.');
