// NOMAD-2026-005 — Porte posée d'aplomb dans une ouverture fermée par le sol (door.js)
// Usage : node tests/node/door.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const O = require(path.join(SRC, 'ouvertures.js'));
const D = require(path.join(SRC, 'door.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6);
const ek = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

// 1. outils 2D
const sq = [{ s: 0, t: 0 }, { s: 2, t: 0 }, { s: 2, t: 3 }, { s: 0, t: 3 }];
check(near(D.area2(sq), 6), 'aire d\'un rectangle 2 × 3');
check(D.inside(sq, { s: 1, t: 1 }) && !D.inside(sq, { s: 3, t: 1 }), 'point dedans / dehors');
check(near(Math.abs(D.area2(D.clipT(sq, 2, true))), 2), 'découpe au-dessus de 2 m : 2 m²');
check(D.fits(sq, 0.5, 1, 2.5) && !D.fits(sq, 0.5, 1, 3.5) && !D.fits(sq, 1.5, 1, 1), 'rectangle qui tient / trop haut / qui déborde');
const tri = [{ s: 0, t: 0 }, { s: 2, t: 0 }, { s: 1, t: 2, d: -1 }];
const top = D.topAt(tri.map(p => Object.assign({ d: 0 }, p, p.d !== undefined ? { d: p.d } : {})), 1, 0);
check(top && near(top.t, 2) && near(top.d, -1), 'sommet sur la verticale du milieu : hauteur et profondeur');

// 2. ouverture « porte » sur le dôme de référence 3V Kruschke 7/12 Ø5 m
const gen = (radius, extra) => E.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius }, extra || {}));
function doorOpening(dome, nodeId, sector, H) {
  const P = id => dome.pointById.get(id), yB = Math.min(...dome.points.map(p => p.y)), a0 = Math.atan2(P(nodeId).z, P(nodeId).x);
  const set = dome.faces.filter(f => {
    const q = f.pointIds.map(P), c = { x: (q[0].x + q[1].x + q[2].x) / 3, y: (q[0].y + q[1].y + q[2].y) / 3, z: (q[0].z + q[1].z + q[2].z) / 3 };
    const d = Math.atan2(c.z, c.x) - a0; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < sector && c.y - yB < H;
  });
  const cnt = new Map(); set.forEach(f => [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => { const k = ek(f.pointIds[i], f.pointIds[j]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
  const ground = k => k.split('-').every(id => Math.abs(P(+id).y - yB) < 1e-6);
  return O.analyse(dome, [...cnt].filter(([k, c]) => c === 1 && !ground(k)).map(([k]) => k));
}
const dome = gen(2.5), S = O.strutIndex(dome);
check(dome.points.length === 61 && S.size === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');
const an = doorOpening(dome, 39, 0.35, 2.3);
check(an.ok && an.openings.length === 1 && an.openings[0].closedByGround, 'ouverture tracée : une seule, fermée par le sol');
const op = an.openings[0];
const r = D.compute(dome, S, op, { width: 0.9, height: 2 });
check(r.ok && r.fits && r.status === 'calculé', 'porte 0,90 × 2,00 : elle passe');
check(near(r.plane.normal.y, 0) && near(Math.hypot(r.plane.normal.x, r.plane.normal.z), 1), 'plan de porte vertical (d\'aplomb)');
check(r.plane.normal.x * (r.plane.origin.x) + r.plane.normal.z * (r.plane.origin.z) > 0, 'normale tournée vers l\'extérieur');
const ends = r.nodes.filter(p => near(p.t, 0));
check(ends.length === 2 && ends.every(p => near(p.depth, 0)) && near(r.plane.width, 0.956, 1e-3), 'seuil : 2 nœuds au sol, dans le plan, 956 mm');
check(near(r.door.s0, (r.plane.width - 0.9) / 2), 'porte centrée sur le seuil');
check(r.max.heightForWidth >= 2 && r.max.heightForWidth < r.heights.contourTop && r.max.widthForHeight >= 0.9, 'maxima cohérents (hauteur pour 0,90 ; largeur pour 2,00)');
const [pl, pm, pr] = r.parts.posts;
check(pl && pm && pr && near(pl.rise, pr.rise, 1e-6) && near(pl.depth, pr.depth, 1e-6), 'potelets gauche et droit symétriques');
check(pm.rise > pl.rise && pl.rise > 0.2 && pm.rise < 0.6, 'potelet du milieu plus haut (sommet du contour), hauteurs plausibles');
check(pl.depth < -0.5 && pl.depth > -1.2, 'le cadre au-dessus du linteau est en retrait, vers l\'intérieur');
check(near(r.infill.total, r.infill.contour - 1.8) && near(r.infill.tympan + r.infill.sides + r.infill.door, r.infill.contour), 'fermeture = contour − porte = tympan + côtés');
check(r.infill.tympan > 0.3 && r.infill.tympan < 1, 'tympan plausible');
check(r.reveal.max <= 1e-9 && r.reveal.min < -0.5, 'ébrasement : tout le contour est derrière le plan de porte');

// 3. refus
const r2 = D.compute(dome, S, op, { width: 0.9, height: 2.45 });
check(r2.ok && !r2.fits && r2.status === 'refusé', 'porte trop haute : refusée');
check(!D.compute(dome, S, op, { width: 0.9, height: 2, offset: 0.4 }).fits, 'porte décalée hors du contour : refusée');
check(!D.compute(dome, S, op, { width: 1.2, height: 2 }).fits, 'porte trop large pour le seuil : refusée');
const up = O.analyse(dome, (() => { const f = dome.faces.find(g => g.pointIds.every(id => dome.pointById.get(id).y > 1)); return [[0, 1], [1, 2], [2, 0]].map(([i, j]) => ek(f.pointIds[i], f.pointIds[j])); })());
check(up.ok && !D.compute(dome, S, up.openings[0], { width: 0.9, height: 2 }).ok, 'ouverture en hauteur (pas au sol) : pas de porte');

// 4. recul (sas intérieur) : même silhouette, profondeurs décalées
const r3 = D.compute(dome, S, op, { width: 0.9, height: 2, setback: 0.5 });
check(r3.fits && r3.nodes.every((p, i) => near(p.depth, r.nodes[i].depth + 0.5)) && near(r3.parts.posts[0].depth, pl.depth + 0.5), 'recul de 0,50 m : profondeurs décalées de 0,50 m');

// 5. homothétie : Ø10 m, porte 1,80 × 4,00 → longueurs × 2, surfaces × 4
const L5 = O.nodeLabels(dome).get(39), big = gen(5), id10 = [...O.nodeLabels(big)].find(([, l]) => l === L5)[0], anB = doorOpening(big, id10, 0.35, 4.6), rB = D.compute(big, O.strutIndex(big), anB.openings[0], { width: 1.8, height: 4 });
check(rB.fits && near(rB.plane.width, 2 * r.plane.width, 1e-9) && near(rB.parts.posts[1].rise, 2 * pm.rise, 1e-9) && near(rB.infill.tympan, 4 * r.infill.tympan, 1e-9), 'Ø10 m : longueurs × 2, surfaces × 4');

// 6. second dôme de référence 2V Chords 1/2 Ø5,30 : le calcul aboutit
const d2 = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 2, subdivMethod: 'Chords', symmetry: 'Pentad', partial: '1/2', radius: 2.65 });
const b2 = d2.faces.find(f => f.pointIds.filter(id => near(d2.pointById.get(id).y, Math.min(...d2.points.map(p => p.y)))).length === 2);
const a2 = O.analyse(d2, (() => { const yB = Math.min(...d2.points.map(p => p.y)); return [[0, 1], [1, 2], [2, 0]].map(([i, j]) => [b2.pointIds[i], b2.pointIds[j]]).filter(([a, b]) => !(near(d2.pointById.get(a).y, yB) && near(d2.pointById.get(b).y, yB))).map(([a, b]) => ek(a, b)); })());
const rr = a2.ok && D.compute(d2, O.strutIndex(d2), a2.openings[0], { width: 0.9, height: 2 });
check(d2.points.length === 26 && rr && rr.ok && !rr.fits && rr.max.heightForWidth > 0, '2V Ø5,30 : un seul triangle de base ne suffit pas pour une porte, hauteur maxi donnée');

// 7. structure 3D (aperçu) : pièces, retours posés sur le cadre, toit
const sk = D.structure(r), sk5 = D.structure(r3);
check(D.structure(r2) === null, 'porte refusée : pas de structure');
check(sk && sk.closed && sk.totals.huisserie.count === 4 && sk.totals.chevetre.count === 1 && sk.totals.appui.count === 2 && sk.totals.potelet.count === 3,
  'structure : huisserie (4), chevêtre (1), appuis (2), potelets (3)');
check(near(sk.totals.huisserie.length, 2 * 2 + 2 * 0.9) && sk.totals.chevetre.length > 0.9, 'huisserie 5,80 m ; chevêtre plus large que la porte');
const yB0 = Math.min(...dome.points.map(p => p.y));
const frameSegs = op.frame.map(k => k.split('-').map(Number).map(id => { const p = dome.pointById.get(id); return { x: p.x, y: p.y - yB0, z: p.z }; }));
const dSeg = (p, [a, b]) => { const ab = [b.x - a.x, b.y - a.y, b.z - a.z], ap = [p.x - a.x, p.y - a.y, p.z - a.z];
  const t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2))); return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]); };
const rets = sk.pieces.filter(p => p.kind === 'chevron' || p.kind === 'appui');
check(rets.length >= 5 && rets.every(p => Math.min(...frameSegs.map(f => dSeg(p.b, f))) < 1e-9), 'chaque chevron et appui finit sur un montant du cadre');
check(rets.every(p => near(p.a.y, p.b.y)) && sk.pieces.filter(p => p.kind === 'potelet').every(p => near(p.a.x, p.b.x) && near(p.a.z, p.b.z)), 'chevrons horizontaux, potelets verticaux');
check(sk.pieces.filter(p => p.kind === 'huisserie').every(p => [p.a, p.b].every(q => near((q.x - r.plane.origin.x) * r.plane.normal.x + (q.z - r.plane.origin.z) * r.plane.normal.z, 0))), 'huisserie dans le plan de la porte (recul 0)');
check(sk.roof.length === sk.totals.rampant.count && sk.roofArea > 1 && sk.roofArea < 4, 'toit : un pan par rampant, surface plausible');
check(near(sk.totals.chevron.length - sk5.totals.chevron.length, 0.5 * sk.totals.chevron.count) && near(sk.totals.appui.length - sk5.totals.appui.length, 1)
  && near(sk5.totals.huisserie.length, sk.totals.huisserie.length) && sk5.roofArea < sk.roofArea, 'recul 0,50 m : chaque retour raccourcit de 0,50 m, toit plus petit');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
