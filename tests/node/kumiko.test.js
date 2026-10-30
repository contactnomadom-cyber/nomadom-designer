// Panneaux Kumiko (kumiko.js) — tests d'origine de l'étape K1, repris sans affaiblissement
// (projet Claude « Acidome Cover+ », kumiko-tests.js ; mission NOMAD-2026-002).
// Usage : node tests/node/kumiko.test.js <dossier contenant kumiko.js>
// Par défaut : src/products/habitat (le module n'est pas encore dans le HTML assemblé).
'use strict';
const path = require('path');
const DIR = path.resolve(process.argv[2] || path.join(__dirname, '../../src/products/habitat'));
const K = require(path.join(DIR, 'kumiko.js'));

let ok = 0, ko = 0;
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6);
function test(name, cond, detail) {
  if (cond) { ok++; console.log('  ✔ ' + name); }
  else { ko++; console.log('  ✘ ' + name + (detail ? '  -> ' + detail : '')); }
}
const f = (x, d) => x.toFixed(d === undefined ? 2 : d);

// Longueurs de montants du dôme de référence 3V Kruschke Ø 5 m (mm)
const A = 824.27, B = 955.73, C = 1053.72, D = 1102.64;

console.log('\n[1] Somme des barycentriques = 1');
{
  let worst = 0, nb = 0;
  [1, 2, 3, 4, 5, 6].forEach(n => {
    const p = K.generatePanel(K.triangleFromSides(C, B, D), { pattern: 'asanoha', density: n });
    p.tsukeko.forEach(t => { [t.b1, t.b2].forEach(b => { worst = Math.max(worst, Math.abs(K.barySum(b) - 1)); nb++; }); });
    p.cells.forEach(c => c.bary.forEach(b => { worst = Math.max(worst, Math.abs(K.barySum(b) - 1)); nb++; }));
    [...p.jigumi, ...p.waku].forEach(l => [l.a, l.b].forEach(b => { worst = Math.max(worst, Math.abs(K.barySum(b) - 1)); nb++; }));
  });
  test(nb + ' points, écart max ' + worst.toExponential(1), worst < 1e-12);
}

console.log('\n[2] Triangle équilatéral 600 mm — asanoha (test de vérité)');
{
  const tri = K.triangleFromSides(600, 600, 600);
  const p = K.generatePanel(tri, { pattern: 'asanoha', density: 1 });
  test('3 tsukeko dans le triangle', p.tsukeko.length === 3);
  const Lth = 600 / Math.sqrt(3);
  test('longueur axe = 600/√3 = ' + f(Lth) + ' mm', p.tsukeko.every(t => near(t.axisLength, Lth)));
  const dirs = p.tsukeko.map(t => Math.atan2(t.p1.y - t.p2.y, t.p1.x - t.p2.x));
  const gaps = [];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    let d = Math.abs(dirs[i] - dirs[j]) * 180 / Math.PI; if (d > 180) d = 360 - d; gaps.push(d);
  }
  test('angle entre pièces au centre = 120°', gaps.every(e => near(e, 120)));
  const corner = p.tsukeko.map(t => t.end1), center = p.tsukeko.map(t => t.end2);
  test('biseaux au sommet = 30° / 30° (pointe 60°)', corner.every(e => near(e.leftBevel, 30) && near(e.rightBevel, 30)),
    corner.map(e => f(e.leftBevel) + '/' + f(e.rightBevel)).join(' '));
  test('biseaux au centre = 60° / 60° (pointe 120°)', center.every(e => near(e.leftBevel, 60) && near(e.rightBevel, 60)),
    center.map(e => f(e.leftBevel) + '/' + f(e.rightBevel)).join(' '));
  test('au sommet : appui sur les lattes ; au centre : coupe partagée',
    corner.every(e => e.leftContact === 'lath' && e.rightContact === 'lath') &&
    center.every(e => e.leftContact === 'tsukeko' && e.rightContact === 'tsukeko'));
  const p3 = K.generatePanel(tri, { pattern: 'asanoha', density: 3 });
  test('densité 3 : 27 pièces toutes à 200/√3 et 30°/60°',
    p3.tsukeko.length === 27 && p3.tsukeko.every(t => near(t.axisLength, 200 / Math.sqrt(3)) &&
      near(t.end1.tipAngle, 60) && near(t.end2.tipAngle, 120)));
}

console.log('\n[3] Symétrie — triangle isocèle (B, B, base A)');
{
  const tri = K.triangleFromSides(A, B, B);
  const p = K.generatePanel(tri, { pattern: 'asanoha', density: 1 });
  const [tA, tB, tC] = p.tsukeko; // pièces issues des sommets A, B, C
  const e1 = tA.end1;
  test('pièce issue du sommet : biseaux gauche = droite (' + f(e1.leftBevel) + '°)', near(e1.leftBevel, e1.rightBevel));
  test('pièce issue du sommet : biseaux au centre égaux', near(tA.end2.leftBevel, tA.end2.rightBevel));
  test('pièces de base : même longueur (' + f(tB.axisLength) + ' mm)', near(tB.axisLength, tC.axisLength));
  test('pièces de base : biseaux en miroir (gauche ↔ droite)',
    near(tB.end1.leftBevel, tC.end1.rightBevel) && near(tB.end1.rightBevel, tC.end1.leftBevel) &&
    near(tB.end2.leftBevel, tC.end2.rightBevel) && near(tB.end2.rightBevel, tC.end2.leftBevel));
}

console.log('\n[4] Densité n -> n² petits triangles, 3(n-1) lattes de jigumi');
{
  const tri = K.triangleFromSides(C, B, D);
  [1, 2, 3, 4, 5, 6].forEach(n => {
    const p = K.generatePanel(tri, { pattern: 'mitsukude', density: n });
    const up = p.cells.filter(c => c.orientation === 'up').length;
    const areas = p.cells.reduce((s, c) => s + K.area(c.pts), 0);
    test('n=' + n + ' : ' + p.cells.length + ' cellules (' + up + ' haut), ' + p.jigumi.length + ' lattes, aires = panneau',
      p.cells.length === n * n && up === n * (n + 1) / 2 && p.jigumi.length === 3 * (n - 1) && near(areas, K.area(tri), 1e-6));
  });
}

console.log('\n[5] Triangle scalène (C, B, D) — invariants géométriques');
{
  const tri = K.triangleFromSides(C, B, D);
  const p = K.generatePanel(tri, { pattern: 'asanoha', density: 2 });
  const cornerAngle = (cell, k) => {
    const P = cell.pts[k], Q = cell.pts[(k + 1) % 3], R = cell.pts[(k + 2) % 3];
    const a1 = Math.atan2(Q.y - P.y, Q.x - P.x), a2 = Math.atan2(R.y - P.y, R.x - P.x);
    let d = Math.abs(a1 - a2) * 180 / Math.PI; return d > 180 ? 360 - d : d;
  };
  let okCorner = true, okCenter = true;
  p.cells.forEach(cell => {
    const pcs = p.tsukeko.filter(t => t.cell === cell.index);
    pcs.forEach((t, k) => { if (!near(t.end1.tipAngle, cornerAngle(cell, k), 1e-6)) okCorner = false; });
    const sum = pcs.reduce((s, t) => s + t.end2.tipAngle, 0);
    if (!near(sum, 360, 1e-6)) okCenter = false;
  });
  test('pointe au sommet = angle du coin (pièce bien logée)', okCorner);
  test('au centre : somme des 3 pointes = 360° (pas de jour ni de recouvrement)', okCenter);
  test('les cellules « haut » et « bas » sont identiques à une symétrie près',
    near(p.tsukeko[0].axisLength + p.tsukeko[1].axisLength + p.tsukeko[2].axisLength,
      p.tsukeko.filter(t => t.orientation === 'down').reduce((s, t) => s + t.axisLength, 0)));
  console.log('\n    Pièces d\'une cellule (densité 2, triangle scalène de test C/B/D, sans retrait) :');
  p.tsukeko.slice(0, 3).forEach((t, i) => console.log('      sommet ' + 'ABC'[i] + ' : L=' + f(t.axisLength) + ' mm' +
    ' | côté sommet ' + f(t.end1.leftBevel) + '°/' + f(t.end1.rightBevel) + '°' +
    ' | côté centre ' + f(t.end2.leftBevel) + '°/' + f(t.end2.rightBevel) + '°'));
}

console.log('\n[6] Option centre = incentre');
{
  const tri = K.triangleFromSides(C, B, D);
  const p = K.generatePanel(tri, { pattern: 'asanoha', density: 1, center: 'incenter' });
  const O = p.tsukeko[0].p2;
  const dLine = (P, A, B) => Math.abs((B.x - A.x) * (A.y - P.y) - (A.x - P.x) * (B.y - A.y)) / Math.hypot(B.x - A.x, B.y - A.y);
  const ds = [dLine(O, tri[0], tri[1]), dLine(O, tri[1], tri[2]), dLine(O, tri[2], tri[0])];
  test('centre équidistant des 3 côtés (r = ' + f(ds[0]) + ' mm)', near(ds[0], ds[1]) && near(ds[1], ds[2]));
  test('chaque pièce coupe l\'angle du sommet en deux (biseaux égaux au sommet)',
    p.tsukeko.every(t => near(t.end1.leftBevel, t.end1.rightBevel)));
}

console.log('\n[7] Garde-fous');
{
  let e1 = false, e2 = false;
  try { K.generatePanel(K.triangleFromSides(600, 600, 600), { pattern: 'goma' }); } catch (e) { e1 = /à confirmer/.test(e.message); }
  try { K.triangleFromSides(100, 100, 300); } catch (e) { e2 = true; }
  test('motif non validé (goma) refusé tant que non confirmé', e1);
  test('triangle impossible refusé', e2);
}

console.log('\nRésultat : ' + ok + ' réussis, ' + ko + ' échoués\n');
process.exit(ko ? 1 : 0);
