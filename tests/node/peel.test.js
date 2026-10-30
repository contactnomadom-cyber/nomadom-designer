// Pelure d'orange (peel.js) — fentes « suivant les gabarits » + non-régression
// Usage : node tests/node/peel.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const makeEtages = require(path.join(SRC, 'etages.js'));
const Toile = require(path.join(SRC, 'toile.js'));
const Peel = require(path.join(SRC, 'peel.js'));
const SEAM = { A: 0.02, B: 0.02, hem: 0.05, type: 'simple' };
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };

const refs = [
  { id: '3V Kruschke 7/12 Ø5', p: { detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 }, slits: { ring: '1,5,5,5,1', sectors: '1,5,5,5,5' } },
  { id: '2V Chords 1/2 Ø5,30', p: { detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65 }, slits: { ring: '1,5,5', sectors: '1,5,5' } }
];
for (const r of refs) for (const base of ['ring', 'sectors']) {
  const dome = E.generateDome(r.p), tool = makeEtages(dome);
  const res = Toile.planFabric(tool, 1.48, SEAM, 0.05, { strategy: 'gabarits', base });
  const sheetOf = nm => res.sheets.get(nm), id = r.id + ' · gabarits ' + base;
  const av = Peel.availableTypes(dome, tool, res.plan).find(t => t.id === 'gabarit5');
  check(av && av.ok, id + ' : type « suivant les gabarits » indisponible (' + (av && av.reason) + ')');
  const L = Peel.build(dome, tool, res.plan, sheetOf, 'gabarit5');
  check(L.type === 'gabarit5', id + ' : repli sur ' + L.type);
  check(L.broken.length === 0, id + ' : ' + L.broken.length + ' morceau(x) cassé(s) par une fente');
  check(L.overlap <= 1e-6, id + ' : recouvrement à plat ' + L.overlap.toFixed(4) + ' m');
  check(L.maxFit < 1e-6, id + ' : morceau mal replacé (' + L.maxFit + ')');
  check(L.slitsPerBand.join(',') === r.slits[base], id + ' : fentes ' + L.slitsPerBand.join(',') + ' au lieu de ' + r.slits[base]);
  // symétrie d'ordre 5 : sur chaque étage à 5 fentes, les 5 arcs ont la même charnière
  const byLevel = new Map();
  L.hinges.forEach(h => { const i = h.arc.pl.findIndex(p => p.pointIds.includes(h.u) && p.pointIds.includes(h.v));
    if (!byLevel.has(h.level)) byLevel.set(h.level, []); byLevel.get(h.level).push(i + '/' + h.arc.pl.length); });
  byLevel.forEach((v, lv) => { if (v.length === 5) check(new Set(v).size === 1, id + ' : étage ' + lv + ' charnières non symétriques ' + v.join(' ')); });
  // les anciens types restent sans recouvrement sur les références
  for (const t of Peel.TYPES) { const Lt = Peel.build(dome, tool, res.plan, sheetOf, t.id); check(Lt.overlap <= 1e-6, id + ' · ' + t.id + ' : recouvrement ' + Lt.overlap.toFixed(4)); }
}
// découpe « Gabarits alignés sur les axes » : la pelure 5 fentes (axe des arêtes) ne casse aucun morceau
for (const r of refs) {
  const dome = E.generateDome(r.p), tool = makeEtages(dome);
  const res = Toile.planFabric(tool, 1.48, SEAM, 0.05, { strategy: 'axes' });
  const id = r.id + ' · axes';
  const L = Peel.build(dome, tool, res.plan, nm => res.sheets.get(nm), 'edges5');
  check(L.type === 'edges5', id + ' : repli sur ' + L.type);
  check(L.broken.length === 0, id + ' : ' + L.broken.length + ' morceau(x) cassé(s) par les fentes des axes');
  check(L.overlap <= 1e-6, id + ' : recouvrement à plat ' + L.overlap.toFixed(4) + ' m');
  const sheets = [...res.sheets.values()];
  check(sheets.every(s => s.check.flat), id + ' : morceau non développable');
  if (r.p.detail === 3) {
    check(sheets.length === 25, id + ' : ' + sheets.length + ' morceaux au lieu de 25');
    check(Toile.groupGabarits(sheets).length === 5, id + ' : ' + Toile.groupGabarits(sheets).length + ' gabarits au lieu de 5');
    check(Math.max(...sheets.map(s => s.cutWidth)) <= 1.48 + 1e-9, id + ' : un morceau dépasse la laize');
  }
}
console.log('Pelure : ' + (n - fails.length) + '/' + n + ' contrôles OK');
fails.forEach(f => console.log('  ✗ ' + f));
process.exit(fails.length ? 1 : 0);
