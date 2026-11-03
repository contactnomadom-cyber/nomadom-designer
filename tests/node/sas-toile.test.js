// NOMAD-2026-007 — Toile du sas (sas-toile.js) et charges du sas (floor.js)
// Usage : node tests/node/sas-toile.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const O = require(path.join(SRC, 'ouvertures.js'));
const D = require(path.join(SRC, 'door.js'));
const T = require(path.join(SRC, 'sas-toile.js'));
const F = require(path.join(SRC, 'floor.js'));
const St = require(path.join(SRC, 'dome-state.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= (t || 1e-6);
const ek = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
const gen = r => E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: r });
function opening(dome, label) {
  const L = O.nodeLabels(dome), id = [...L].find(([, l]) => l === label)[0], P = i => dome.pointById.get(i), yB = Math.min(...dome.points.map(p => p.y)), a0 = Math.atan2(P(id).z, P(id).x);
  const set = dome.faces.filter(f => { const q = f.pointIds.map(P), cx = (q[0].x + q[1].x + q[2].x) / 3, cy = (q[0].y + q[1].y + q[2].y) / 3, cz = (q[0].z + q[1].z + q[2].z) / 3;
    const d = Math.atan2(cz, cx) - a0; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.35 && cy - yB < 2.3 * dome.params.radius / 2.5; });
  const c = new Map(); set.forEach(f => [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => { const k = ek(f.pointIds[i], f.pointIds[j]); c.set(k, (c.get(k) || 0) + 1); }));
  return O.analyse(dome, [...c].filter(([k, v]) => v === 1 && !k.split('-').every(i => Math.abs(P(+i).y - yB) < 1e-6)).map(([k]) => k)).openings[0];
}
const dome = gen(2.5), S = O.strutIndex(dome), op = opening(dome, 'N40'), fab = St.create().fabric;
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé');
const r = D.compute(dome, S, op, { width: 0.9, height: 2 });
const sx = D.sas(r, null, { direction: 'exterieur', length: 2.5 }), tx = T.patterns(sx, fab);

// 1. une pièce par face (sans le plancher), aire nette = couverture du sas
check(tx.pieces.length === r.nodes.length - 1, 'une pièce par face du tunnel, plancher exclu (' + tx.pieces.length + ')');
check(near(tx.pieces.reduce((s, p) => s + p.area, 0), sx.coverArea, 1e-9), 'aire des pièces = couverture calculée par le sas (' + sx.coverArea.toFixed(3) + ' m²)');
check(near(tx.netArea, sx.coverArea + sx.areas.pignon, 1e-9) && tx.pignon && near(tx.pignon.area, sx.areas.pignon, 1e-9), 'total net = faces + pignon (autour de la porte 2)');
check(tx.pieces.filter(p => p.kind === 'toit').length === 2 && tx.pieces.filter(p => p.kind === 'paroi').length === 6, '2 pièces de toit, 6 de paroi');
// 2. trapèzes : longueurs = distance au bout, côté dôme = longueur du montant
const nd = id => r.nodes.find(p => p.id === id);
check(tx.pieces.every(p => near(p.Lp, 2.5 - nd(p.nodes[0]).depth) && near(p.Lq, 2.5 - nd(p.nodes[1]).depth)), 'longueurs : du nœud du dôme au bout du sas');
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
check(tx.pieces.every(p => near(p.strut, dist3(dome.pointById.get(p.nodes[0]), dome.pointById.get(p.nodes[1])), 1e-9)), 'bord côté dôme = longueur exacte du montant du cadre');
check(near(tx.raccord.length, tx.pieces.reduce((s, p) => s + p.strut, 0)) && tx.raccord.flap === 0.1, 'raccord au dôme : somme des montants, rabat de 100 mm');
// 3. surplus : coutures A/B, ourlet de pied, couture avec le pignon, rabat
check(tx.pieces.every(p => near(p.width, p.Le + p.allow.left.a + p.allow.right.a) && near(p.length, Math.max(p.Lp, p.Lq) + p.allow.outer.a + 0.1)), 'taille de coupe = net + surplus');
check(tx.pieces.filter(p => p.allow.left.kind === 'ourlet de pied' || p.allow.right.kind === 'ourlet de pied').length === 2, 'deux pièces touchent le sol : ourlet de pied');
check(tx.pieces.every(p => p.allow.outer.kind === 'couture avec le pignon'), 'sas extérieur : couture avec le pignon au bout');
check(tx.pieces.every(p => p.width <= fab.usable) && tx.pieces.every(p => p.les === 1), 'chaque face tient dans la laize utile (' + Math.round(fab.usable * 1000) + ' mm)');
check(tx.pignon.les === Math.ceil(tx.pignon.width / fab.usable - 1e-9), 'pignon : nombre de lés selon la laize');
// 4. étanchéité : la pièce du haut recouvre celle du bas ; faîtage couvert
const top = name => { const p = tx.pieces.find(q => q.name === name); return Math.max(...p.nodes.map(id => nd(id).t)) + Math.min(...p.nodes.map(id => nd(id).t)); };
check(tx.overlaps.filter(o => !o.ridge).every(o => top(o.upper) >= top(o.lower) - 1e-9), 'recouvrements : toujours la pièce la plus haute par-dessus');
check(tx.overlaps.filter(o => o.ridge).length === 1 && tx.ridge.length > 3, 'faîtage : une bande de faîtage sur toute la longueur');
check(tx.overlaps.length === r.nodes.length - 2, 'une couture par nœud hors sol entre deux faces (' + tx.overlaps.length + ')');
// 5. sas intérieur : seule la partie dehors (entre la porte 1 et le montant) reçoit de la toile
const si = D.sas(r, null, { direction: 'interieur', length: 2.5 }), ti = T.patterns(si, fab);
check(!ti.pignon && ti.pieces.every(p => near(p.Lp, Math.abs(nd(p.nodes[0]).depth)) && p.allow.outer.kind === 'ourlet sur l\'huisserie'), 'sas intérieur : toile de la porte 1 au montant, ourlet sur l\'huisserie, pas de pignon');
check(ti.netArea < tx.netArea / 3, 'sas intérieur : beaucoup moins de toile');
// 6. homothétie
const big = gen(5), rb = D.compute(big, O.strutIndex(big), opening(big, 'N40'), { width: 1.8, height: 4 });
const tb = T.patterns(D.sas(rb, null, { direction: 'exterieur', length: 5 }), fab);
check(near(tb.netArea, 4 * tx.netArea, 1e-6), 'Ø 10 m, sas 5 m : toile × 4');
// 7. charges du sas
const L = F.sasLoad(sx);
check(L.G > 0 && near(L.Q, sx.floorArea * F.DEFAULTS.loads.liveQ) && L.S > 0 && near(L.total, L.G + L.Q + L.S), 'charges du sas : bois + toile + plancher, occupation, neige');
const lay = F.layout(dome, {}), ex = F.extraPiles(lay, sx.groundPoints, -0.0225, L), all = F.withExtra(lay, ex);
check(ex.length === 6 && near(ex.reduce((s, p) => s + p.loads.els, 0) - ex.reduce((s, p) => s + (23 + 15 * p.stack.next) * 0.00981, 0), L.total, 1e-9), 'pilotis du sas : la charge du sas est répartie sur ses 6 pilotis (+ blocs)');
check(near(all.loads.totalEls, lay.loads.totalEls + ex.reduce((s, p) => s + p.loads.els, 0), 1e-9) && all.qty.pilesSas === 6 && all.qty.piles === 29, 'plancher + sas : total et quantités mis à jour (29 pilotis)');
check(all.loads.pmax >= lay.loads.pmax && F.withExtra(lay, []) === lay, 'pilotis le plus chargé recalculé ; sans sas, rien ne change');
// 8. fiche
const h = T.html([tx]);
check(h.includes('<svg') && h.includes('rabat') && h.includes('recouvre') && h.includes('🟠') && h.includes('Pignon'), 'fiche : patrons, rabat, recouvrements, aperçu 🟠, pignon');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
