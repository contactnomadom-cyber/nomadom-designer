// Poteaux d'angle de l'avant-corps sur leurs propres pilotis (door.js + floor.js)
// Usage : node tests/node/porte-pilotis.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const O = require(path.join(SRC, 'ouvertures.js'));
const D = require(path.join(SRC, 'door.js'));
const F = require(path.join(SRC, 'floor.js'));
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
const dome = gen(2.5), S = O.strutIndex(dome), op = opening(dome, 'N40');
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé');
const lay = F.layout(dome, {}), r = D.compute(dome, S, op, { width: 0.9, height: 2 });
check(lay.ok && lay.piles.length === 23 && r.ok && r.fits, 'plancher et porte de référence');

// 1. pieds des poteaux : un par poteau d'angle, au niveau du plancher fini (y = 0)
const st = D.build(r, { width: 0.9, height: 2 }), nPost = st.pieces.filter(p => p.kind === 'poteau').length;
check(nPost === 2 && st.groundPoints.length === 2 && st.groundPoints.every(p => Math.abs(p.y) < 1e-9), 'avant-corps : 2 poteaux d\'angle, 2 pieds au niveau du plancher');
check(D.build(r, { width: 0.9, height: 2, support: 'parois' }).groundPoints.length === 2, 'parois latérales : mêmes 2 poteaux');
check(D.build(r, { width: 0.9, height: 2, support: 'porte-a-faux' }).groundPoints.length === 0, 'porte-à-faux : aucun poteau, aucun pilotis');

// 2. porte au nu du dôme : les pieds tombent hors du plancher → un pilotis chacun
const out = F.outsideDeck(lay, st.groundPoints);
check(out.length === 2, 'porte au nu du dôme : les 2 pieds sont hors du plancher (' + out.length + ')');
// porte reculée vers l'intérieur : les poteaux posent sur le plancher
const ri = D.compute(dome, S, op, { width: 0.9, height: 2, setback: 0.8 }), sti = D.build(ri, { width: 0.9, height: 2, setback: 0.8 });
check(ri.ok && sti && sti.groundPoints.length > 0 && F.outsideDeck(lay, sti.groundPoints).length === 0, 'porte reculée de 0,80 m : poteaux sur le plancher, pas de pilotis');

// 3. charges de l'avant-corps : bois + toile, neige, pas d'occupation ni de plancher
const L = F.sasLoad(st);
check(L.G > 0 && L.Q === 0 && L.floorArea === 0 && L.S > 0 && near(L.total, L.G + L.S), 'charges de l\'avant-corps : permanentes + neige, sans plancher');
check(L.total < F.sasLoad(D.sas(r, null, { direction: 'exterieur', length: 2.5 })).total, 'avant-corps bien plus léger qu\'un sas de 2,50 m');

// 4. pilotis ajoutés au plancher
const ex = F.extraPiles(lay, out, -0.0225, L, 'porte'), all = F.withExtra(lay, ex);
check(ex.length === 2 && ex.every(p => p.row === 'porte' && p.stack.shim >= -1e-9 && near(p.stack.height, -0.0225 - p.ground)), 'pilotis des poteaux : mêmes blocs, calage, rangée « porte »');
check(near(ex.reduce((s, p) => s + p.loads.els, 0) - ex.reduce((s, p) => s + (23 + 15 * p.stack.next) * 0.00981, 0), L.total, 1e-9), 'toute la charge de l\'avant-corps va sur ses 2 pilotis (+ blocs)');
check(all.qty.piles === 25 && all.qty.pilesPorte === 2 && all.qty.pilesSas === 0, 'quantités : 23 + 2 pilotis, comptés à part');
const sx = D.sas(r, null, { direction: 'exterieur', length: 2.5 }), both = F.withExtra(lay, F.extraPiles(lay, sx.groundPoints, -0.0225, F.sasLoad(sx)).concat(ex));
check(both.qty.pilesSas === 6 && both.qty.pilesPorte === 2 && both.qty.piles === 31, 'sas et poteaux comptés séparément');
// le sas n'a pas de poteau d'angle : ses pilotis restent ceux du tunnel
check(!sx.pieces.some(p => p.kind === 'poteau'), 'sas : pas de poteau d\'angle');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
