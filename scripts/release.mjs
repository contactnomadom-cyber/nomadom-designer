// Feu vert de publication : refuse si le HTML de dist/ n'est pas exactement celui qui a passé le contrôle complet.
// Usage : node scripts/release.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'build/manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, man.output)), sha = crypto.createHash('sha256').update(html).digest('hex');
const passFile = path.join(root, 'build/check/PASS');
const pass = fs.existsSync(passFile) ? fs.readFileSync(passFile, 'utf8').trim() : null;
const ver = (html.toString().match(/version bêta ([0-9.]+) du ([0-9/]+)/) || [])[1] || '?';
if (pass !== sha) { console.error('REFUSÉ : ' + man.output + ' (version ' + ver + ') n\'a pas passé le contrôle complet. Lancer : node scripts/test-all.mjs'); process.exit(1); }
console.log('FEU VERT : ' + man.output + ' · version ' + ver + ' · sha256 ' + sha.slice(0, 16) + ' · contrôle complet réussi.');
