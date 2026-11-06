// Mode tuilage : sens d'écoulement de l'eau et côté DESSUS / DESSOUS des bords (tuilage.js)
// Usage : node tests/node/tuilage.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const makeEtages = require(path.join(SRC, 'etages.js'));
const Toile = require(path.join(SRC, 'toile.js'));
const U = require(path.join(SRC, 'tuilage.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };

// 1. mots et couleurs
check(U.side({ side: 'A' }).word === 'DESSUS' && U.side({ side: 'B' }).word === 'DESSOUS' && U.side({ side: 'H' }).word === 'OURLET', 'A → DESSUS, B → DESSOUS, H → OURLET');
check(U.SIDES.A.color !== U.SIDES.B.color, 'DESSUS et DESSOUS de couleurs différentes (bleu / orange)');
check(U.edgeText({ side: 'A', other: 'E4-7', kind: 'etage' }) === 'DESSUS ↔ E4-7', 'texte du bord : « DESSUS ↔ E4-7 »');

// 2. pente d'un triangle simple : plan incliné à 30° qui descend vers −y
const t30 = { pts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], h: [0, 0, 0.5] };
const f30 = U.triFlow(t30);
check(Math.abs(f30.slope - 30) < 1e-9 && Math.abs(f30.d.x) < 1e-12 && Math.abs(f30.d.y + 1) < 1e-12, 'triangle incliné à 30° : l\'eau descend vers −y, pente 30,0°');
check(U.triFlow({ pts: t30.pts, h: [1, 1, 1] }).d === null, 'triangle à plat : pas de sens d\'écoulement');

// 3. les deux dômes de référence, toutes les découpes
const REFS = [
  ['3V Kruschke 7/12 Ø 5 m', { detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 }],
  ['2V Chords 1/2 Ø 5,30 m', { detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65 }]
];
const SEAM = { A: 0.03, B: 0.015, hem: 0.04 };
for (const [name, p] of REFS) {
  const dome = E.generateDome(p), tool = makeEtages(dome);
  // pente 3D des faces : toujours vers le bas, égale à l'inclinaison de la face
  const ff = dome.faces.map((f, i) => U.faceFlow3D(dome, i));
  check(ff.every(f => !f.d || f.d.y < 0) && ff.every(f => !f.d || Math.abs(f.d.x * f.n.x + f.d.y * f.n.y + f.d.z * f.n.z) < 1e-9), name + ' : flèche 3D de chaque face dans le plan de la face, vers le bas');
  for (const strategy of ['pieces', 'gabarits', 'axes', 'triangles']) for (const base of (strategy === 'pieces' ? ['ring', 'sectors'] : ['ring'])) {
    const id = name + ' · ' + strategy + (base === 'sectors' ? ' (secteurs)' : '');
    const res = Toile.planFabric(tool, 1.4, SEAM, 0.005, { strategy, base });
    const sheets = res.plan.flatMap(b => b.pieces).map(pc => res.sheets.get(pc.name));
    const issues = sheets.flatMap(U.checkSheet);
    check(issues.length === 0, id + ' : chaque couture d\'étage a son DESSUS en bas du morceau du haut' + (issues.length ? ' — ' + issues[0] : ''));
    // sur le patron (sommet vers le haut), l'eau ne remonte jamais
    const flows = sheets.flatMap(U.sheetFlow);
    check(flows.length === dome.faces.length && flows.every(f => f.d && f.d.y < 0), id + ' : ' + flows.length + ' flèches d\'eau, toutes vers le bas du patron');
    // pente sur le patron = pente réelle de la face
    const byFace = new Map(); sheets.forEach(sh => sh.triangles.forEach(t => byFace.set(t.idx, U.triFlow(t))));
    const dmax = Math.max(...dome.faces.map((f, i) => Math.abs(byFace.get(i).slope - ff[i].slope)));
    check(dmax < 1e-6, id + ' : pente sur le patron = pente sur le dôme (écart ' + dmax.toExponential(1) + '°)');
    // chaque couture entre deux morceaux : un DESSUS d'un côté, un DESSOUS de l'autre
    const sides = U.seamSides(sheets); let pairs = 0, bad = [];
    sheets.forEach(sh => sh.edges.forEach(e => {
      if (!e.other || e.side === 'H') return;
      const o = sides.get(e.other + '|' + U.edgeKey(e.nodeIds[0], e.nodeIds[1])); pairs++;
      if (!((e.side === 'A' && o === 'B') || (e.side === 'B' && o === 'A'))) bad.push(sh.name + '↔' + e.other);
    }));
    check(pairs > 0 && bad.length === 0, id + ' : ' + pairs + ' bords cousus, toujours un DESSUS face à un DESSOUS' + (bad.length ? ' — ' + bad[0] : ''));
  }
}

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ' contrôles)'));
process.exit(fails.length ? 1 : 0);
