// NOMAD-2026-005 — Bibliothèque d'assemblages (joinery.js) et fiche porte (door-ui.js)
// Usage : node tests/node/joinery.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const J = require(path.join(SRC, 'joinery.js'));
const UI = require(path.join(SRC, 'door-ui.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };

const ids = Object.keys(J.LIBRARY), fams = Object.keys(J.FAMILIES);
check(ids.length >= 14, 'au moins 14 fiches (' + ids.length + ')');
check(['bois-bois', 'quincaillerie', 'dome', 'sol'].every(g => ids.some(id => J.LIBRARY[id].family === g)), 'les 4 groupes demandés sont présents');
['tenon-mortaise', 'mi-bois', 'embrevement', 'entaille', 'sabot', 'equerre', 'platine', 'boulon', 'vis-structurelle', 'moise', 'cale-biaise', 'pied-poteau', 'platine-plancher', 'lisse-ancree']
  .forEach(id => check(J.LIBRARY[id], 'fiche « ' + id + ' » présente'));
ids.forEach(id => { const f = J.LIBRARY[id];
  check(f.name && f.analogy && f.use && f.limits && f.tools && f.steps.length >= 3, 'fiche ' + id + ' : nom, analogie, usage, limites, outillage, ≥ 3 étapes');
  check(/^<svg [^>]*viewBox="0 0 160 100"/.test(f.svg) && f.svg.endsWith('</svg>') && !/script|on\w+=/i.test(f.svg), 'fiche ' + id + ' : schéma SVG propre'); });
fams.forEach(f => { const F = J.FAMILIES[f];
  check(F.options.includes(F.default) && F.options.every(o => J.LIBRARY[o]), 'famille ' + f + ' : défaut parmi les choix, choix tous dans la bibliothèque'); });
check(['angle', 'T', 'oblique', 'pose', 'dome-noeud', 'dome-montant', 'sol'].every(f => fams.includes(f)), 'les 7 familles de raccords calculées par door.js');
const r0 = J.resolve({}), r1 = J.resolve({ T: 'sabot', sol: 'inconnu', angle: '<b>' });
check(fams.every(f => r0[f] === J.FAMILIES[f].default), 'sans choix : assemblages par défaut');
check(r1.T === 'sabot' && r1.sol === J.FAMILIES.sol.default && r1.angle === J.FAMILIES.angle.default, 'choix valable gardé, choix inconnu remplacé par le défaut');
check(UI.fiche(J, 'moise').includes('Moisage') && UI.fiche(J, 'moise').includes('🟠') && UI.fiche(J, 'rien') === '', 'fiche HTML : nom, statut 🟠 ; id inconnu → rien');
const h = UI.html(J, { key: 'N1–N2 "x"', door: { width: 0.9, height: 2, offset: 0, setback: 0 }, result: { ok: false, error: '<i>erreur</i>' }, deep: 0 });
check(h.includes('&lt;i&gt;erreur') && h.includes('N1–N2 &quot;x&quot;') && !h.includes('<i>erreur'), 'fiche porte : texte et clé échappés');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
