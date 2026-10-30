// Statuts 🟢🟡🟠🔴 (status.js) — références, refus, et 🔴 qui bloque toujours
// Usage : node tests/node/status.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const S = require(path.join(SRC, 'status.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const gen = p => E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', symmetry: 'Pentad', alignTheBase: false, radius: 2.5 }, p));
const lv = (p, asked) => { const d = gen(p), g = S.geometry(d, asked || p.subdivMethod); return [g.level, S.fabrication(d, g, []).level]; };
const eq = (a, b, m) => check(JSON.stringify(a) === JSON.stringify(b), m + ' : ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

// les deux références : géométrie 🟢, toile 🟠 (jamais cousue)
eq(lv({ detail: 3, subdivMethod: 'Kruschke', partial: '7/12' }), ['green', 'orange'], '3V Kruschke 7/12');
eq(lv({ detail: 2, subdivMethod: 'Chords', partial: '1/2', radius: 2.65 }), ['green', 'orange'], '2V Chords 1/2');
check(S.geometry(gen({ detail: 3, subdivMethod: 'Kruschke', partial: '7/12' }), 'Kruschke').reasons.some(r => r.includes('30 A, 35 B, 80 C, 20 D')), '3V : référence Domerama citée');
// sans référence indépendante : 🟡
eq(lv({ detail: 4, subdivMethod: 'Kruschke', partial: '1/2' }), ['yellow', 'orange'], '4V Kruschke');
eq(lv({ detail: 4, subdivMethod: 'Mexican', partial: '1/2' }), ['yellow', 'orange'], '4V Mexican');
// 2V Mexican n'existe pas : calculé en Chords (🟢), avec la raison
check(S.geometry(gen({ detail: 2, subdivMethod: 'Mexican', partial: '1/2' }), 'Mexican').reasons[0].startsWith('Mexican n\'existe pas en 2V'), '2V Mexican remplacé par Chords, signalé');
// refus de la toile (étape 9 reportée) : symétrie Triad / Cross, sphère entière
eq(lv({ detail: 2, subdivMethod: 'Chords', partial: '1/2', symmetry: 'Triad' })[1], 'red', 'toile Triad refusée');
eq(lv({ detail: 2, subdivMethod: 'Chords', partial: '1/1' })[1], 'red', 'toile sphère entière refusée');
// vague sur un morceau : 🔴 même pour une référence
const ref = gen({ detail: 3, subdivMethod: 'Kruschke', partial: '7/12' }), gRef = S.geometry(ref, 'Kruschke');
const wavy = S.fabrication(ref, gRef, [{ name: 'E2-1' }]);
eq(wavy.level, 'red', 'morceau avec vague');
check(wavy.reasons[0].includes('E2-1'), 'morceau avec vague nommé');
// méthode demandée absente : signalée
check(S.geometry(ref, 'Chords').reasons[0].startsWith('Chords n\'existe pas'), 'méthode demandée ≠ méthode calculée signalée');
check(S.geometry(null, 'Chords').level === 'yellow', 'pas de dôme : 🟡 sans raison');
check(S.baseFlatError(ref) < 0.0005, '3V 7/12 : base plate');

// barrière avant patrons et exports : 🔴 bloque toujours, la laize n'est contrôlée qu'en dernier
let laizeCalls = 0; const laize = bad => () => { laizeCalls++; return bad; };
const red = { level: 'red', reasons: ['x'] }, orange = { level: 'orange', reasons: ['o'] };
eq(S.gate(red, red, [], laize([])), { block: 'status', reasons: ['x'] }, 'géométrie 🔴 bloque');
eq(S.gate(gRef, red, [], laize([])), { block: 'status', reasons: ['x'] }, 'toile 🔴 bloque');
check(S.gate(gRef, wavy, [{ name: 'E2-1' }], laize([])).reasons.length === 2, 'vague bloque, avec renvoi à l\'étape 9');
check(laizeCalls === 0, 'laize non contrôlée quand le statut bloque déjà');
eq(S.gate(gRef, orange, [], laize([{ name: 'E1-1' }])), { block: 'laize', bad: [{ name: 'E1-1' }] }, 'morceau hors laize bloque');
check(S.gate(gRef, orange, [], laize([])) === null, 'référence 🟠 dans la laize : autorisé');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.slice(0, 20).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
