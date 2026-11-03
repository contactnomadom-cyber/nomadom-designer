// NOMAD-2026-006 — Plancher et soubassement (floor.js, floor-ui.js)
// Usage : node tests/node/floor.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const F = require(path.join(SRC, 'floor.js'));
const UI = require(path.join(SRC, 'floor-ui.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= (t || 1e-6);
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const gen = (radius, extra) => E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius }, extra || {}));
const dome = gen(2.5);
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');

// 1. base, pentagone, triangle
const ring = F.baseRing(dome);
check(ring.length === 15 && ring.filter(p => near(p.edge, 0.9557, 1e-3)).length === 5 && ring.filter(p => near(p.edge, 1.0537, 1e-3)).length === 10, 'base : 15 nœuds, 5 côtés B (956) et 10 côtés C (1054)');
const P = F.layout(dome, { support: 'pentagone', deck: 'etoile' });
check(P.ok && P.pentagon.length === 5 && P.pentagon.every((k, j) => (k - P.pentagon[0] + 15) % 15 === 3 * j), 'pentagone : un sommet tous les 3 nœuds de base');
const pent = P.beams.filter(b => b.kind === 'pentagone');
check(pent.length === 5 && pent.every(b => near(d2(b.a, b.b), d2(pent[0].a, pent[0].b), 1e-9)), 'pentagone régulier : 5 côtés égaux (' + Math.round(d2(pent[0].a, pent[0].b) * 1000) + ' mm)');
const tri = P.beams.filter(b => b.kind === 'triangle');
check(tri.length === 3 && tri.every(b => near(d2(b.a, b.b), 1.2 * Math.sqrt(3) / 2, 1e-9)) && P.triangle.every(t => near(Math.hypot(t.x, t.z), 0.6)), 'triangle inscrit dans un cercle de Ø 1,20 m');
check(P.triangle.some(t => near(Math.atan2(t.z, t.x), ring[P.pentagon[0]].a, 1e-9)), 'une pointe du triangle face à un sommet du pentagone');
check(F.layout(dome, { triangleDiameter: 2 }).warnings.some(w => w.includes('1,00 et 1,50')) && F.layout(dome, { hubDiameter: 0.5 }).warnings.some(w => w.includes('0,80 et 1,00')), 'Ø hors limites ramenés et signalés');

// 2. pilotis : deux rangées
check(P.qty.pilesOuter === 15 && P.qty.pilesInner === 8, 'pentagone : 15 pilotis extérieurs + 8 en 2ᵉ rangée (5 mi-côtés + 3 pointes)');
check(P.piles.filter(p => p.row === 'exterieure').every((p, i) => near(p.at.x, ring[i].x) && near(p.at.z, ring[i].z)), 'rangée extérieure : sous les nœuds de base');
check(pent.every(b => P.piles.some(p => p.what === 'milieu du pentagone' && near(d2(p.at, { x: (b.a.x + b.b.x) / 2, z: (b.a.z + b.b.z) / 2 }), 0))), 'un pilotis au milieu de chaque côté du pentagone');
const Pi = F.layout(dome, { support: 'pilotis' });
check(Pi.ok && Pi.qty.piles === 18 && !Pi.beams.some(b => b.kind === 'pentagone'), 'pilotis seuls : 15 + 3, pas de pentagone');

// 3. plancher en étoile
const js = P.joists;
check(js.length === 15 && js.every((j, i) => near(d2(j.a, ring[i]), 0)), 'étoile : une solive par nœud de base');
check(js.every(j => tri.some(b => { const t = F.segX(j.b, { x: j.b.x + 1e-9, z: j.b.z }, b.a, b.b); return Math.abs((b.b.x - b.a.x) * (j.b.z - b.a.z) - (b.b.z - b.a.z) * (j.b.x - b.a.x)) < 1e-9; })), 'chaque solive finit sur le triangle (il reprend tout le camembert)');
check(js.every(j => j.carried) && P.maxJoistSpan < 2.4 && P.maxJoistSpan < Pi.maxJoistSpan + 1e-9, 'solives portées ; portée libre < 2,40 m, pas plus longue avec le pentagone');
check(JSON.stringify(P.sectorTypes) === '[956,1054]' && P.panels.filter(p => p.type === 956).length === 5 && P.panels.filter(p => p.type === 1054).length === 10 && P.panels.filter(p => p.kind === 'centre').length === 1, 'panneaux : 2 modèles (5 + 10) et une pièce centrale');
const sumPanels = P.panels.reduce((s, p) => s + F.polyArea(p.pts), 0);
check(near(sumPanels, P.area, 0.01), 'panneaux : couvrent le plancher (' + sumPanels.toFixed(3) + ' / ' + P.area.toFixed(3) + ' m²)');

// 4. plancher plein
const Pl = F.layout(dome, { support: 'pentagone', deck: 'plein' });
check(Pl.ok && Pl.panels.length === 1 && near(F.polyArea(Pl.panels[0].pts), Pl.area) && Pl.joists.length >= 10, 'plein : un plateau, solives parallèles');
check(Pl.joists.every(j => near(Math.atan2(j.b.z - j.a.z, j.b.x - j.a.x) % Math.PI, Math.atan2(Pl.joists[0].b.z - Pl.joists[0].a.z, Pl.joists[0].b.x - Pl.joists[0].a.x) % Math.PI, 1e-6)), 'plein : solives toutes parallèles');
check(Pl.maxJoistSpan > 2.4 ? Pl.warnings.some(w => w.includes('Portée libre')) : true, 'portée trop longue : signalée');

// 5. hauteurs : vide ventilé, blocs entiers au point haut, calage < un bloc
[0, 5, 10, 20].forEach(sl => [0, 45, 200].forEach(dir => {
  const r = F.layout(dome, { slope: sl, slopeDir: dir });
  const ok = r.voidMin >= 0.3 - 1e-9 && r.piles.every(p => p.stack.shim >= -1e-9 && p.stack.shim < 0.19 + 1e-9) && r.piles.some(p => near(p.stack.shim, 0, 1e-9));
  check(ok, 'pente ' + sl + ' % vers ' + dir + '° : vide ≥ 300 mm, blocs entiers au point haut, calage < 190 mm');
}));
check(near(P.voidMin, 0.38, 1e-9) && P.piles.every(p => p.stack.next === 1), 'terrain plat : 1 bloc de 29 + 1 bloc de 19 = 380 mm de vide');

// 6. charges
const sumA = P.piles.reduce((s, p) => s + p.area, 0);
check(near(sumA, P.area, 1e-9), 'zones d\'influence : somme = surface du plancher');
const L = P.options.loads, blocks = P.piles.reduce((s, p) => s + (23 + 15 * p.stack.next) * 0.00981, 0);
check(near(P.loads.totalEls, P.loads.domeG + P.loads.snowS + P.area * (L.floorG + L.liveQ) + blocks, 1e-6), 'total = dôme + neige + plancher + occupation + blocs');
check(P.piles.every(p => near(p.pressure, p.loads.els / (0.39 * 0.29))), 'pression = charge / surface du bloc 39 × 29');
check(P.loads.domeG > 2 && P.loads.domeG < 10 && P.loads.ratio < 0.2, 'ordres de grandeur : dôme 2 à 10 kN, roche peu sollicitée');
check(F.layout(dome, { soil: 'argile' }).loads.ratio > P.loads.ratio, 'sol plus faible : taux plus élevé');

// 7. autre dôme : 2V Chords 1/2 Ø 5,30 ; base non multiple de 5
const D2 = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65 });
const r2 = F.layout(D2, {});
check(D2.points.length === 26 && r2.ok && r2.ring.length % 5 === 0, '2V Ø 5,30 : plancher calculé (' + r2.ring.length + ' nœuds de base)');
const fake = { points: [], lines: [], faces: [], pointById: new Map() };
for (let k = 0; k < 12; k++) { const p = { _id: k, x: 2 * Math.cos(k * Math.PI / 6), y: 0, z: 2 * Math.sin(k * Math.PI / 6) }; fake.points.push(p); fake.pointById.set(k, p); }
fake.points.push({ _id: 99, x: 0, y: 2, z: 0 });
check(!F.layout(fake, { support: 'pentagone' }).ok && F.layout(fake, { support: 'pilotis' }).ok, 'base de 12 nœuds : pentagone refusé, pilotis possible');

// 8. rendu et fiche
const sc = F.scene(P);
check(sc.beams.length === P.beams.length + P.joists.length && sc.boxes.filter(b => b.kind === 'bloc29').length === 23 && sc.panels.length === P.panels.length, 'scène 3D : poutres, solives, 23 assises, panneaux');
check(sc.beams.filter(b => b.kind === 'solive').every(b => near(b.a.y + 0.145 / 2, -0.022, 1e-9)) && sc.groundY < -0.6, 'solives sous le plateau, sol sous les pilotis');
const h = UI.html(F, F.choices(), P);
check(h.includes('<svg') && h.includes('2ᵉ rangée') && h.includes('🟠') && h.includes('kPa') && h.includes('géotextile'), 'fiche : plan, rangées, aperçu 🟠, portance, procédé');
check(UI.html(F, null, null).includes('data-floor-on'), 'sans plancher : bouton « Ajouter »');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
