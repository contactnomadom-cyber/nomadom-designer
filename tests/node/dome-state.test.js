// Objet dôme unique (dome-state.js) — clé de dôme et toile identiques à la 0.9.12
// Usage : node tests/node/dome-state.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const DS = require(path.join(SRC, 'dome-state.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };

// 1. Clé de dôme figée sur les deux références (valeurs par défaut de l'interface).
const FAB = '{"laize":1.5,"selvage":0.01,"usable":1.48,"overlapTol":0.05,"seam":{"A":0.02,"B":0.02,"hem":0.05,"type":"simple","bottom":null}}';
const refs = [
  { id: '3V Kruschke 7/12 Ø5', p: { detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5, alignTheBase: false },
    key: 'g1|Icosahedron|I|3|Kruschke|Pentad|7/12|0|2.5|0|' + FAB + '|0.1' },
  { id: '2V Chords 1/2 Ø5,30', p: { detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65, alignTheBase: false },
    key: 'g1|Icosahedron|I|2|Chords|Pentad|1/2|0|2.65|0|' + FAB + '|0.1' }
];
for (const r of refs) {
  const s = DS.create();
  s.gen = 1;
  s.nominal = s.dome = E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I' }, r.p));
  check(DS.key(s) === r.key, r.id + ' : clé ' + DS.key(s) + ' ≠ ' + r.key);
  // la clé change si la génération, la toile ou le poids de couture changent
  const k0 = DS.key(s);
  s.gen = 2; check(DS.key(s) !== k0, r.id + ' : génération ignorée par la clé');
  s.gen = 1; s.seamWeight = 0.2; check(DS.key(s) !== k0, r.id + ' : poids de couture ignoré par la clé');
  s.seamWeight = 0.1; s.fabric = DS.fabricFromInputs(Object.assign({}, DS.DEFAULT_FABRIC_INPUTS, { seamAMm: 25 }));
  check(DS.key(s) !== k0, r.id + ' : marge A ignorée par la clé');
}
// dôme vide : la clé se calcule sans erreur
check(typeof DS.key(DS.create()) === 'string', 'clé d\'un objet dôme vide');

// 2. Toile : identique à readFabricParams() de la 0.9.12 (copie fidèle, sans DOM).
function legacy(v) {
  const num = (k, def) => { const x = parseFloat(v[k]); return isNaN(x) ? def : x; };
  const W = num('laizeMm', 1500) / 1000, SV = Math.max(0, num('selvageMm', 0)) / 1000;
  const TOL = Math.max(0, num('overlapTolMm', 0)) / 1000, U = Math.max(0, W - 2 * SV);
  const SEAM = { A: Math.max(0, num('seamAMm', 0)) / 1000, B: Math.max(0, num('seamBMm', 0)) / 1000,
    hem: Math.max(0, num('hemMm', 0)) / 1000, type: v.seamType };
  SEAM.bottom = v.bottomOn ? { A: Math.max(0, num('bottomAMm', 0)) / 1000, B: Math.max(0, num('bottomBMm', 0)) / 1000,
    hem: Math.max(0, num('bottomHemMm', 0)) / 1000 } : null;
  return { laize: W, selvage: SV, usable: U, overlapTol: TOL,
    seam: Object.assign({}, SEAM, { bottom: SEAM.bottom ? Object.assign({}, SEAM.bottom) : null }) };
}
const vals = ['', 'abc', -5, 0, 7, 12.5, 20, 1500, 1370];
let combos = 0;
for (const a of vals) for (const w of vals) for (const bot of [false, true]) for (const t of ['simple', 'rabattue', 'perso']) {
  const v = Object.assign({}, DS.DEFAULT_FABRIC_INPUTS, { seamAMm: a, laizeMm: w, selvageMm: a, hemMm: w, bottomOn: bot, bottomBMm: a, seamType: t });
  const got = JSON.stringify(DS.fabricFromInputs(v)), want = JSON.stringify(legacy(v));
  check(got === want, 'toile ' + JSON.stringify(v) + ' : ' + got + ' ≠ ' + want); combos++;
}
const f = DS.fabricFromInputs(DS.DEFAULT_FABRIC_INPUTS);
check(Object.isFrozen(f) && Object.isFrozen(f.seam), 'toile non figée');
check(DS.seamWeightFromInput('10') === 0.1 && DS.seamWeightFromInput('x') === 0 && DS.seamWeightFromInput(-3) === 0, 'poids de couture');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.slice(0, 20).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n + ' (2 références, ' + combos + ' combinaisons de toile)');
