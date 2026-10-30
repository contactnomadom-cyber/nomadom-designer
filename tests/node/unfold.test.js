// Développement 2D (unfold.js) — triangles de base, dépliage, chevauchements
// Usage : node tests/node/unfold.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const U = require(path.join(SRC, 'unfold.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z), d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const TOL = 1e-5;   // 0,01 mm

const refs = [
  { id: '3V Kruschke 7/12 Ø5', p: { detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 },
    types: 'T1:30:BAA:isocèle T2:35:BCC:isocèle T3:40:DCC:isocèle', area: 45.138466, fullOverlaps: 3 },
  { id: '2V Chords 1/2 Ø5,30', p: { detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65 },
    types: 'T1:30:BAA:isocèle T2:10:BBB:équilatéral', area: 40.962002, fullOverlaps: 0 }
];
for (const r of refs) {
  const dome = E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I' }, r.p));
  // classes : une longueur exacte retrouve sa classe
  dome.edgeClasses.forEach(g => check(U.classifyLength(dome, g.length) === g, r.id + ' : classe ' + g.name));
  // triangles de base : formes, effectifs, surface nette
  const T = U.baseTriangleTypes(dome);
  const sig = T.map(t => t.id + ':' + t.faces.length + ':' + t.sides.map(s => s.cls).join('') + ':' + t.kind).join(' ');
  check(sig === r.types, r.id + ' : triangles de base ' + sig + ' ≠ ' + r.types);
  check(T.reduce((a, t) => a + t.faces.length, 0) === dome.faces.length, r.id + ' : chaque face a un type');
  const area = T.reduce((a, t) => a + t.area * t.faces.length, 0);
  check(Math.abs(area - r.area) < 1e-6, r.id + ' : surface nette ' + area.toFixed(6) + ' m² ≠ ' + r.area);
  // à plat, chaque triangle garde ses 3 longueurs (0,01 mm) et ses angles font 180°
  dome.faces.forEach(f => {
    const P = f.pointIds.map(id => dome.pointById.get(id)), F = U.flattenTriangle(P[0], P[1], P[2]);
    const ok = Math.abs(d2(F.pts[0], F.pts[1]) - d3(P[0], P[1])) < TOL && Math.abs(d2(F.pts[0], F.pts[2]) - d3(P[0], P[2])) < TOL &&
      Math.abs(d2(F.pts[1], F.pts[2]) - d3(P[1], P[2])) < TOL && Math.abs(F.angles[0] + F.angles[1] + F.angles[2] - Math.PI) < 1e-12;
    check(ok, r.id + ' : triangle ' + f.index + ' déformé à plat');
  });
  // dépliage du dôme entier : toutes les faces placées (un nœud partagé n'est placé qu'une fois)
  const all = dome.faces.map(f => f.index), res = U.unfoldGroup(dome, all);
  check(res.placements.length === all.length && res.unreached.length === 0, r.id + ' : dépliage complet');
  // deux faces voisines (pas de boucle) : les 5 longueurs conservées, la voisine rabattue de l'autre côté
  const nb = dome.faceAdjacency[0][0].neighbor, pair = U.unfoldGroup(dome, [0, nb]);
  let worst = 0;
  pair.placements.forEach(pl => [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
    const A = pl.pointIds[a], B = pl.pointIds[b];
    worst = Math.max(worst, Math.abs(d2(pair.placedPts.get(A), pair.placedPts.get(B)) - d3(dome.pointById.get(A), dome.pointById.get(B))));
  }));
  check(worst < TOL, r.id + ' : écart de longueur après dépliage ' + (worst * 1000).toFixed(4) + ' mm');
  check(U.detectOverlaps(pair.placements, pair.placedPts, 0).length === 0, r.id + ' : deux faces voisines sans chevauchement');
  const ov = U.detectOverlaps(res.placements, res.placedPts, 0.05);
  check(ov.length === r.fullOverlaps, r.id + ' : ' + ov.length + ' chevauchements au-delà de 5 cm (attendu ' + r.fullOverlaps + ')');
  // un groupe non connexe est signalé
  const lone = all.find(i => !(dome.faceAdjacency[0] || []).some(a => a.neighbor === i) && i !== 0 && i > 20);
  check(U.unfoldGroup(dome, [0, lone]).unreached.length === 1, r.id + ' : face isolée signalée');
}
// chevauchement : triangles disjoints → 0 ; triangle sur lui-même → > 0
const t = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], far = t.map(p => ({ x: p.x + 5, y: p.y }));
check(U.trianglesOverlapDepthSAT(t, far) === 0, 'triangles disjoints');
check(U.trianglesOverlapDepthSAT(t, t) > 0.1, 'triangle superposé');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.slice(0, 20).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n + ' (2 références)');
