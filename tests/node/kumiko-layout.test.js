// NOMAD-2026-003 — panneaux Kumiko posés sur les triangles du dôme (kumiko-layout.js)
// Usage : node tests/node/kumiko-layout.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const O = require(path.join(SRC, 'ouvertures.js'));
const K = require(path.join(SRC, 'kumiko.js'));
const KL = require(path.join(SRC, 'kumiko-layout.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const gen = (radius, extra) => E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius }, extra || {}));
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const dome = gen(2.5), L = O.nodeLabels(dome), keys = KL.faceKeys(dome, L);
const yBase = Math.min(...dome.points.map(p => p.y)), INSET = 0.03;
// 1. identité des triangles : unique, stable quand le diamètre change
check(keys.length === 105 && new Set(keys).size === 105, '105 triangles, 105 clés distinctes');
check(keys.every(k => /^N\d+-N\d+-N\d+$/.test(k)), 'clés « Nx-Ny-Nz »');
const d6 = gen(3.1);
check(JSON.stringify(KL.faceKeys(d6, O.nodeLabels(d6))) === JSON.stringify(keys), 'mêmes clés pour Ø 6,20 m (le diamètre ne change pas l\'identité)');

// 2. chaque triangle reçoit un panneau dont le cadre (waku) suit les montants, au 1/100 mm
const panels = keys.map(face => ({ face, pattern: 'asanoha', density: 2, center: 'centroid' }));
const res = KL.layout(K, dome, L, panels, yBase, -yBase, INSET);
check(res.every(r => r.ok), 'tous les panneaux posés (' + res.filter(r => !r.ok).map(r => r.error).slice(0, 2).join(', ') + ')');
const strutMm = new Set(dome.edgeClasses.map(g => Math.round(g.length * 1e5)));   // 1/100 mm
check(res.every(r => r.place.panel.waku.every(w => strutMm.has(Math.round(w.axisLength * 100)))), 'cadre = longueurs de montants A/B/C/D (824,27 / 955,73 / 1 053,72 / 1 102,64)');
// comptages sur la référence : 30 / 35 / 40 triangles T1 / T2 / T3, 12 tsukeko et 3 lattes par panneau en densité 2
check(res.every(r => r.place.summary.tsukeko === 12 && r.place.summary.jigumi === 3), 'asa-no-ha densité 2 : 12 tsukeko et 3 lattes par panneau');

// 3. posé dans le plan du triangle, côté intérieur, à la distance demandée
let worstPlane = 0, inside = true;
res.forEach(r => {
  const f = dome.faces.find(x => KL.faceKey(x.pointIds, L) === r.key);
  const P = f.pointIds.map(id => { const p = dome.pointById.get(id); return [p.x, p.y - yBase, p.z]; });
  const F = KL.frameOf(P, [0, -yBase, 0]);
  r.place.segments3D.forEach(s => [s.a, s.b].forEach(q => {
    const d = [q[0] - F.A[0], q[1] - F.A[1], q[2] - F.A[2]], h = d[0] * F.n[0] + d[1] * F.n[1] + d[2] * F.n[2];
    worstPlane = Math.max(worstPlane, Math.abs(h + INSET));
  }));
  // la normale pointe vers l'extérieur : le panneau est plus près du centre de la sphère que le triangle
  const g = P.reduce((a, p) => a.map((v, k) => v + p[k] / 3), [0, 0, 0]), c = [0, -yBase, 0];
  const s0 = r.place.segments3D[0], m = s0.a.map((v, k) => (v + s0.b[k]) / 2);
  if (!(d3(m, c) < d3(g, c) + 1e-9 || d3(s0.a, c) < Math.max(...P.map(p => d3(p, c))))) inside = false;
});
check(worstPlane < 1e-9, 'lattes dans le plan décalé de 30 mm vers l\'intérieur (écart ' + worstPlane.toExponential(1) + ' m)');
check(inside, 'panneaux du côté intérieur du dôme');
// 4. le plan à plat garde les longueurs du triangle 3D
const r0 = res[0], f0 = dome.faces[0], P0 = f0.pointIds.map(id => dome.pointById.get(id));
const t2 = r0.place.tri2D, d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lens3 = [[0, 1], [1, 2], [2, 0]].map(([i, j]) => Math.hypot(P0[i].x - P0[j].x, P0[i].y - P0[j].y, P0[i].z - P0[j].z) * 1000);
check([[0, 1], [1, 2], [2, 0]].every(([i, j], k) => Math.abs(d2(t2[i], t2[j]) - lens3[k]) < 1e-6), 'triangle à plat : 3 longueurs conservées (mm)');
check(JSON.stringify(r0.place.summary) === JSON.stringify(KL.summarize(K.generatePanel(t2, { pattern: 'asanoha', density: 2, center: 'centroid' }))), 'chiffres identiques au moteur Kumiko appelé seul');
// biseaux sur le vrai triangle (pas 30° / 60° partout) : contre les lattes 25 à 35°, au centre du motif (coupe partagée) jusqu'à 65°
const bmin = Math.min(...res.map(r => r.place.summary.bevelMin)), bmax = Math.max(...res.map(r => r.place.summary.bevelMax));
check(bmin > 24 && bmin < 26 && bmax > 64 && bmax < 66, 'biseaux de ' + bmin + '° à ' + bmax + '° (recalculés sur chaque triangle)');

// 5. cas particuliers
const bad = KL.layout(K, dome, L, [{ face: 'N1-N2-N999', pattern: 'asanoha', density: 2, center: 'centroid' }, { face: keys[0], pattern: 'goma', density: 2, center: 'centroid' }], yBase, -yBase, INSET);
check(!bad[0].ok && bad[0].error === 'absent de ce dôme', 'triangle absent : signalé, pas d\'erreur');
check(!bad[1].ok && /confirmer/.test(bad[1].error), 'motif non validé (goma) : refusé avec la raison du moteur');
check(KL.validPatterns(K).map(p => p.id).join() === 'mitsukude,asanoha', 'motifs proposés : mitsukude et asa-no-ha seulement');
const mit = KL.layout(K, dome, L, [{ face: keys[0], pattern: 'mitsukude', density: 3, center: 'centroid' }], yBase, -yBase, INSET)[0];
check(mit.ok && mit.place.summary.tsukeko === 0 && mit.place.summary.jigumi === 6, 'mitsukude densité 3 : grille de 6 lattes, aucun tsukeko');
// avec une ouverture : un triangle retiré de la toile peut garder son kumiko (fenêtre)
const S = O.strutIndex(dome), f = dome.faces[50], ek = (a, b) => O.edgeKey(a, b);
const keysOpen = [ek(f.pointIds[0], f.pointIds[1]), ek(f.pointIds[1], f.pointIds[2]), ek(f.pointIds[2], f.pointIds[0])].filter(k => S.has(k));
const an = O.analyse(dome, keysOpen), st = O.structureDome(dome, an);
const rOpen = KL.layout(K, st, L, [{ face: KL.faceKey(f.pointIds, L), pattern: 'asanoha', density: 2, center: 'centroid' }], yBase, -yBase, INSET)[0];
check(an.ok && rOpen.ok, 'triangle ouvert (fenêtre) : panneau posé');

// 6. clic dans la vue 3D : on vise le centre d'un triangle depuis la caméra -> c'est lui qui est choisi
const tris = (dome.allFaces || dome.faces).map(f => f.pointIds.map(id => { const p = dome.pointById.get(id); return { x: p.x, y: p.y - yBase, z: p.z }; }));
let hits = 0, tried = 0;
[0.3, 1.4, 2.6, 4.0, 5.5].forEach(yaw => [0.25, 0.7, 1.2].forEach(pitch => {
  const cam = { yaw, pitch, dist: 9, target: [0, 1.1, 0] };
  const E = [cam.target[0] + cam.dist * Math.cos(pitch) * Math.sin(yaw), cam.target[1] + cam.dist * Math.sin(pitch), cam.target[2] + cam.dist * Math.cos(pitch) * Math.cos(yaw)];
  const f = [cam.target[0] - E[0], cam.target[1] - E[1], cam.target[2] - E[2]], fl = Math.hypot(...f), F = f.map(v => v / fl);
  const R0 = [F[1] * 0 - F[2] * 1, F[2] * 0 - F[0] * 0, F[0] * 1 - F[1] * 0], rl = Math.hypot(...R0), Rr = R0.map(v => v / rl);
  const U = [Rr[1] * F[2] - Rr[2] * F[1], Rr[2] * F[0] - Rr[0] * F[2], Rr[0] * F[1] - Rr[1] * F[0]], tn = Math.tan(20 * Math.PI / 180), aspect = 1.4;
  tris.forEach((t, i) => {
    const g = [0, 1, 2].map(k => ['x', 'y', 'z'].map(c => t[k][c])).reduce((a, p) => a.map((v, k) => v + p[k] / 3), [0, 0, 0]);
    const d = g.map((v, k) => v - E[k]), z = d[0] * F[0] + d[1] * F[1] + d[2] * F[2];
    const nx = (d[0] * Rr[0] + d[1] * Rr[1] + d[2] * Rr[2]) / z / tn / aspect, ny = (d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) / z / tn;
    const n = [0, 1, 2].map(k => 0); // face tournée vers la caméra ?
    const P = [0, 1, 2].map(k => ['x', 'y', 'z'].map(c => t[k][c])), e1 = P[1].map((v, k) => v - P[0][k]), e2 = P[2].map((v, k) => v - P[0][k]);
    const nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], c = [0, -yBase, 0];
    const out = (nn[0] * (g[0] - c[0]) + nn[1] * (g[1] - c[1]) + nn[2] * (g[2] - c[2])) > 0 ? 1 : -1, facing = out * (nn[0] * -d[0] + nn[1] * -d[1] + nn[2] * -d[2]) > 0;
    if (!facing || Math.abs(nx) > 1 || Math.abs(ny) > 1) return;
    tried++; if (KL.pickFace(tris, cam, nx, ny, aspect, 40, false) === i) hits++;
  });
}));
check(tried > 300 && hits === tried, 'clic au centre d\'un triangle vu de face : bon triangle choisi (' + hits + '/' + tried + ')');
check(KL.pickFace(tris, { yaw: 0.7, pitch: 0.55, dist: 9, target: [0, 1.1, 0] }, 0.99, 0.99, 1.4, 40, false) === -1, 'clic dans le ciel : aucun triangle');
const camC = { yaw: 0.7, pitch: 0.3, dist: 9, target: [0, 1.1, 0] }, iFront = KL.pickFace(tris, camC, 0, 0, 1.4, 40, false), iCut = KL.pickFace(tris, camC, 0, 0, 1.4, 40, true);
check(iFront >= 0 && iCut >= 0 && iFront !== iCut, 'vue en coupe : le triangle de devant (coupé) est ignoré, celui du fond est choisi');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
