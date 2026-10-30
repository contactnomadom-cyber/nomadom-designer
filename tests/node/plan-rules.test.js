// Règles du plan de coupe (plan-rules.js) — laize, rangée du bas, comparatif, CSV
// Usage : node tests/node/plan-rules.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const makeEtages = require(path.join(SRC, 'etages.js'));
const Toile = require(path.join(SRC, 'toile.js'));
const Nesting = require(path.join(SRC, 'nesting.js'));
const PR = require(path.join(SRC, 'plan-rules.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const SEAM = { A: 0.02, B: 0.02, hem: 0.05, type: 'simple', bottom: null };
const gen = p => E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', symmetry: 'Pentad', alignTheBase: false }, p));
const plan = (dome, W, seam, strategy, base) => {
  const tool = makeEtages(dome), res = Toile.planFabric(tool, W, seam, 0.05, { strategy, base });
  const pieces = res.plan.flatMap(b => b.pieces);
  return { tool, res, pieces, sheets: pieces.map(pc => res.sheets.get(pc.name)),
    raw: nm => { const pc = pieces.find(x => x.name === nm); return pc ? tool.pieceSheet(res.plan, pc) : null; } };
};

// 1. comparatif : 3V de référence, laize 1 500 / utile 1 480, marges 20/20, ourlet 50
const v3 = gen({ detail: 3, subdivMethod: 'Kruschke', partial: '7/12', radius: 2.5 });
const want3 = { pieces: { pieces: 18, gabarits: 9, sewn: 63, total: 150 }, gabarits: { pieces: 21, gabarits: 5, sewn: 66, total: 150 }, triangles: { pieces: 105, gabarits: 5, sewn: 150, total: 150 } };
for (const st of Object.keys(want3)) {
  const P = plan(v3, 1.48, SEAM, st, 'ring'), m = PR.measurePlan(P.tool, P.res, { laize: 1.5, usable: 1.48 }, { Toile, Nesting });
  const got = { pieces: m.pieces, gabarits: m.gabarits, sewn: m.sewn, total: m.total };
  check(JSON.stringify(got) === JSON.stringify(want3[st]), '3V ' + st + ' : ' + JSON.stringify(got) + ' ≠ ' + JSON.stringify(want3[st]));
  check(m.flat, '3V ' + st + ' : sans vague');
  check(m.over === 0 && PR.laizeFailures(P.sheets, 1.48).length === 0, '3V ' + st + ' : tout tient dans la laize');
  check(m.roll > 0 && m.util > 0 && m.util <= 1 && Math.abs(m.rollArea - m.roll * 1.5) < 1e-12, '3V ' + st + ' : rouleau et utilisation cohérents');
  check(m.cutArea <= m.roll * 1.48 + 1e-9, '3V ' + st + ' : la toile coupée tient sur le rouleau (pas de chevauchement)');
}

// 2. laize : 2V Ø5,30 en largeur utile 1 480 → les 5 morceaux de la rangée du bas dépassent (1 508 mm)
const v2 = gen({ detail: 2, subdivMethod: 'Chords', partial: '1/2', radius: 2.65 });
const P2 = plan(v2, 1.48, SEAM, 'gabarits', 'sectors'), bad2 = PR.laizeFailures(P2.sheets, 1.48);
check(bad2.length === 5 && bad2.every(sh => sh.bottomRow && Math.round(sh.cutWidth * 1000) === 1508), '2V : 5 morceaux du bas à 1 508 mm hors laize');
check(PR.fitsLaize({ cutWidth: 1.48 }, 1.48) && !PR.fitsLaize({ cutWidth: 1.4801 }, 1.48), 'laize : limite à 0,01 mm près');
// rangée du bas : ourlets proposés (atelier : marges ou ourlet plus petits sur cette rangée)
const opts = PR.bottomHemOptions(bad2, SEAM, 1.48, P2.raw, Toile.applyAllowances);
check(JSON.stringify(opts) === JSON.stringify([{ A: 0.02, B: 0.02, hem: 0.021 }, { A: 0.015, B: 0.015, hem: 0.031 }, { A: 0.01, B: 0.01, hem: 0.041 }]), '2V : ourlets proposés ' + JSON.stringify(opts));
(opts || []).forEach(o => {
  check(bad2.every(sh => Toile.applyAllowances(P2.raw(sh.name), o).cutWidth <= 1.48 + 1e-9), 'option ' + JSON.stringify(o) + ' : tient dans la laize');
  check(bad2.some(sh => Toile.applyAllowances(P2.raw(sh.name), { A: o.A, B: o.B, hem: o.hem + 0.002 }).cutWidth > 1.48 + 1e-9), 'option ' + JSON.stringify(o) + ' : ourlet maximal (+2 mm ne passe plus)');
});
// pas de suggestion si un morceau hors rangée du bas dépasse
const P2b = plan(v2, 1.45, SEAM, 'gabarits', 'sectors');
check(PR.bottomHemOptions(PR.laizeFailures(P2b.sheets, 1.45), SEAM, 1.45, P2b.raw, Toile.applyAllowances) === null, '2V laize 1 450 : rangées hautes aussi → pas de suggestion');
check(PR.bottomHemOptions([], SEAM, 1.48, P2.raw, Toile.applyAllowances) === null, 'rien ne dépasse → pas de suggestion');

// 3. CSV de fabrication : en-tête, sections, un point par point de couture
const sh = P2.sheets[0], csv = PR.sheetCsv(sh, null, SEAM, Toile.SEAM_PRESETS.simple.label, () => null);
check(csv.charCodeAt(0) === 0xFEFF && csv.includes('\r\n') && csv.split('\r\n')[0] === '﻿"Morceau";"' + sh.name + '"', 'CSV : BOM, fins de ligne, en-tête');
['LIGNE DE COUTURE', 'CONTOUR DE COUPE', 'BORDS', 'PLIS', 'TRIANGLES'].forEach(t => check(csv.includes('"' + t + '"'), 'CSV : section ' + t));
check(csv.split('\r\n').filter(l => /^"P\d+";"N\d+";/.test(l)).length === sh.points.length, 'CSV : une ligne par point de couture');
const gk = Toile.offsetDome(v3, 0.04), Pg = plan(gk, 1.48, SEAM, 'gabarits', 'ring');
const csvG = PR.sheetCsv(Pg.sheets[0], gk.offset, SEAM, 'Couture simple', e => gk.offset.nominalLengthOf.get(Toile.edgeKey(e.nodeIds[0], e.nodeIds[1])));
check(csvG.includes('hauteur d\'appui 40 mm') && csvG.includes('"Noeud a noeud (mm)"'), 'CSV GoodKarma : appui et longueurs nœud à nœud');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.slice(0, 20).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
