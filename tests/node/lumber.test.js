// Liste de débits du bois et des panneaux (lumber.js) — idée n° 8, aménagement, étape 1
// Usage : node tests/node/lumber.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const Lb = require(path.join(SRC, 'lumber.js'));
const E = require(path.join(SRC, 'dome-engine.js'));
const F = require(path.join(SRC, 'floor.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= t;

// 1. optimiseur de barres : tout est placé, rien ne déborde, barres ramenées à la longueur utile
const pcs = [2.9, 2.9, 2.0, 1.5, 1.2, 1.2, 0.8, 0.6, 0.6, 0.4].map((len, i) => ({ ref: 'X' + i, len }));
const pl = Lb.cutPlan(pcs, Lb.LENGTHS, 0.004);
const placed = pl.bars.reduce((s, b) => s + b.cuts.length, 0);
check(placed === pcs.length && !pl.tooLong.length, 'toutes les pièces placées (' + placed + ')');
check(pl.bars.every(b => b.used <= b.stock + 1e-9 && near(b.used, b.cuts.reduce((s, c) => s + c.len, 0) + 0.004 * (b.cuts.length - 1), 1e-9)), 'aucune barre ne déborde, trait de scie compté entre les coupes');
check(pl.bars.every(b => Lb.LENGTHS.indexOf(b.stock) >= 0 && (Lb.LENGTHS.indexOf(b.stock) === 0 || Lb.LENGTHS[Lb.LENGTHS.indexOf(b.stock) - 1] < b.used - 1e-9)), 'chaque barre = plus courte longueur vendue qui suffit');
const net = pcs.reduce((s, p) => s + p.len, 0);
check(near(pl.net, net, 1e-9) && pl.bought >= net && pl.wasteRatio < 0.12, 'achat ' + pl.bought.toFixed(2) + ' m pour ' + net.toFixed(2) + ' m de coupes (chute ' + Math.round(pl.wasteRatio * 100) + ' %)');
check(Lb.cutPlan([{ ref: 'L', len: 6 }]).tooLong.length === 1, 'pièce de 6 m : signalée trop longue (plus que 5,40 m)');
check(Lb.cutPlan([{ ref: 'a', len: 1 }, { ref: 'b', len: 1 }]).bars.length === 1 && Lb.cutPlan([{ ref: 'a', len: 1 }, { ref: 'b', len: 1 }]).bars[0].stock === 2.1, '2 × 1 m : une seule barre de 2,10 m');

// 2. onglets : polygones réguliers
const poly = k => Array.from({ length: k }, (_, i) => ({ x: Math.cos(2 * Math.PI * i / k), z: Math.sin(2 * Math.PI * i / k) }));
const frame = k => { const p = poly(k); return Lb.framePieces(p.map((a, i) => ({ a, b: p[(i + 1) % k] })), 0.075); };
check(frame(15).every(f => near(f.miter[0], 12, 1e-9) && near(f.miter[1], 12, 1e-9)), 'ceinture à 15 côtés : onglets de 12°');
check(frame(5).every(f => near(f.miter[0], 36, 1e-9)) && frame(3).every(f => near(f.miter[0], 60, 1e-9)), 'pentagone 36°, triangle 60°');
const sq = frame(4)[0];
check(near(sq.miter[0], 45, 1e-9) && near(sq.len - sq.axis, 0.075, 1e-9), 'carré : onglet 45°, pointe longue = axe + largeur');
check(near(Lb.framePieces([{ a: { x: 0, z: 0 }, b: { x: 2, z: 0 } }], 0.075)[0].len, 2, 1e-12), 'pièce seule : coupe d\'équerre');

// 3. plancher du dôme de référence (3V Kruschke 7/12 Ø 5 m), pentagone + étoile
const dome = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 });
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');
const r = F.layout(dome, { support: 'pentagone', deck: 'etoile' }), cl = Lb.floorCutList(r);
const P = cl.sections[0], S = cl.sections[1];
const cnt = s => s.groups.reduce((t, g) => t + g.n, 0);
check(cnt(P) === r.beams.length && cnt(S) === r.joists.length, 'toutes les poutres (' + cnt(P) + ') et solives (' + cnt(S) + ') listées');
const pent = P.groups.find(g => g.what === 'pentagone'), tri = P.groups.find(g => g.what === 'triangle');
check(pent.n === 5 && near(pent.axis, 2.887, 0.001) && near(pent.miter[0], 36, 1e-6), 'pentagone : 5 × 2887 mm d\'axe, onglets de 36°');
check(tri.n === 3 && near(tri.axis, 1.039, 0.001) && near(tri.miter[0], 60, 1e-6), 'triangle : 3 × 1039 mm d\'axe, onglets de 60°');
check(P.groups.filter(g => g.what === 'ceinture').every(g => g.miter.every(m => m > 5 && m < 20)), 'ceinture : onglets entre 5 et 20°');
check(S.groups.every(g => g.miter[0] === 0 && g.miter[1] === 0), 'solives : coupes d\'équerre (posées sur les poutres)');
check(P.plan.bars.length > 0 && !P.plan.tooLong.length && !S.plan.tooLong.length, 'aucune pièce plus longue qu\'une barre');
check(cl.panels.sheets === Math.ceil(r.area * 1.12 / (2.44 * 1.22) - 1e-9) && cl.panels.sheets > 5, 'plancher ' + r.area.toFixed(2) + ' m² : ' + cl.panels.sheets + ' panneaux de 2,44 × 1,22 (chute 12 %)');
check(Lb.floorCutList({ ok: false }) === null, 'plancher en erreur : pas de liste');

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ')'));
process.exit(fails.length ? 1 : 0);
