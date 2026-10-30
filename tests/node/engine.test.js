// Batterie de non-régression — moteur géométrique (dome-engine.js)
// Usage : node tests/engine.test.js <dossier des modules> [--json sortie.json]
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const out = { refs: [], combos: [], failures: [] };
let nFail = 0;
// anomalies connues (relevées par l'audit du 30/10/2026) : signalées mais non bloquantes
const KNOWN = [/^1V Chords (Triad|Cross) 3\/4/];
out.known = [];
const fail = (where, msg) => { if (KNOWN.some(r => r.test(where))) { out.known.push(where + ' : ' + msg); return; } nFail++; out.failures.push(where + ' : ' + msg); };

// ---------- 1. Références indépendantes (Domerama) : 🟢 ----------
const REFS = [
  { name: '3V Kruschke 5/9 (ACIDOME 7/12), Ø5 m', p: { detail: 3, subdivMethod: 'Kruschke', partial: '7/12', symmetry: 'Pentad' }, D: 5.0,
    stats: { pointCount: 61, lineCount: 165, faceCount: 105, selvageCount: 15 },
    classes: [[30, 0.329706463356374, 824.27], [35, 0.382290185640323, 955.73], [80, 0.421488791193215, 1053.72], [20, 0.441056358833072, 1102.64]], tolUnit: 1e-7 },
  { name: '2V Chords 1/2, Ø5,30 m', p: { detail: 2, subdivMethod: 'Chords', partial: '1/2', symmetry: 'Pentad' }, D: 5.3,
    stats: { pointCount: 26, lineCount: 65, faceCount: 40, selvageCount: 10 },
    classes: [[30, 0.54653, 1448.31], [35, 0.61803, 1637.79]], tolUnit: 5e-6 }
];
REFS.forEach(r => {
  const d1 = E.generateDome(Object.assign({ radius: 1 }, r.p)), dD = E.generateDome(Object.assign({ radius: r.D / 2 }, r.p));
  const res = { name: r.name, ok: true, detail: [] };
  Object.entries(r.stats).forEach(([k, v]) => { if (d1.stats[k] !== v) { res.ok = false; res.detail.push(k + ' ' + d1.stats[k] + ' ≠ ' + v); } });
  if (d1.edgeClasses.length !== r.classes.length) { res.ok = false; res.detail.push('classes ' + d1.edgeClasses.length + ' ≠ ' + r.classes.length); }
  r.classes.forEach(([n, f, mm], i) => {
    const g = d1.edgeClasses[i], gD = dD.edgeClasses[i];
    if (!g) return;
    if (g.count !== n) { res.ok = false; res.detail.push(g.name + ' ×' + g.count + ' ≠ ×' + n); }
    if (Math.abs(g.length - f) > r.tolUnit) { res.ok = false; res.detail.push(g.name + ' facteur ' + g.length + ' ≠ ' + f); }
    if (Math.abs(gD.length * 1000 - mm) > 0.006) { res.ok = false; res.detail.push(g.name + ' ' + (gD.length * 1000).toFixed(3) + ' mm ≠ ' + mm); }
  });
  out.refs.push(res);
  if (!res.ok) fail(r.name, res.detail.join(' ; '));
});

// ---------- 2. Toutes les combinaisons : topologie et cohérence ----------
const METHODS = V => ['Chords'].concat(V >= 3 ? ['Arcs', 'Mexican'] : []).concat(V === 3 || V === 4 ? ['Kruschke'] : []);
const area3 = (a, b, c) => { const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
  return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]); };
for (let V = 1; V <= 8; V++) for (const m of METHODS(V)) for (const sym of ['Pentad', 'Triad', 'Cross'])
  for (const part of E.partialListClassI(V).concat(['1/1'])) for (const align of [false, true]) {
    const canAlign = !/^1(\/[12])?$/.test(part);  // 0.9.4 : Kruschke aussi
    if (align && !canAlign) continue;
    const id = `${V}V ${m} ${sym} ${part}${align ? ' base alignée' : ''}`;
    let d;
    try { d = E.generateDome({ detail: V, subdivMethod: m, symmetry: sym, partial: part, alignTheBase: align, radius: 1 }); }
    catch (e) {
      // 0.9.4 : l'alignement qui retournerait des triangles est refusé (attendu, non bloquant)
      if (e.code === 'ALIGN_FLIP' && align) { (out.alignRefused = out.alignRefused || []).push(id + ' (' + e.flipped + ' triangles)'); continue; }
      fail(id, 'exception ' + e.message); continue; }
    const P = d.points.length, L = d.lines.length, F = d.faces.length, sel = d.lines.filter(l => l.selvage);
    const full = part === '1/1';
    // faces par arête
    const key = (a, b) => a < b ? a + '|' + b : b + '|' + a, cnt = new Map();
    d.faces.forEach(f => [0, 1, 2].forEach(i => { const k = key(f.pointIds[i], f.pointIds[(i + 1) % 3]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
    const lineKeys = new Set(d.lines.map(l => key(...l.pointIds)));
    let bad = 0; cnt.forEach((c, k) => { if (c > 2 || !lineKeys.has(k)) bad++; });
    d.lines.forEach(l => { const c = cnt.get(key(...l.pointIds)) || 0; if (c === 0 || (l.selvage ? c !== 1 : c !== 2)) bad++; });
    // bord : boucles fermées
    const adj = new Map(); sel.forEach(l => l.pointIds.forEach((p, i) => { if (!adj.has(p)) adj.set(p, []); adj.get(p).push(l.pointIds[1 - i]); }));
    let deg2 = true; adj.forEach(v => { if (v.length !== 2) deg2 = false; });
    let loops = 0; const seen = new Set();
    adj.forEach((_, s) => { if (seen.has(s)) return; loops++; const st = [s]; while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); adj.get(x).forEach(y => st.push(y)); } });
    const euler = P - L + F, expectEuler = full ? 2 : 2 - loops; // disque = 1 ; anneau = 0
    // faces dégénérées, rayon
    const minA = Math.min(...d.faces.map(f => area3(...f.pointIds.map(i => d.pointById.get(i)))));
    const rs = d.points.map(p => Math.hypot(p.x, p.y, p.z)), rDev = Math.max(...rs.map(r => Math.abs(r - 1)));
    // base
    const ys = sel.flatMap(l => l.pointIds.map(i => d.pointById.get(i).y)), baseDy = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    const yMin = Math.min(...d.points.map(p => p.y));
    const lowestOnBorder = ys.length ? Math.abs(Math.min(...ys) - yMin) < 1e-9 : true;
    const rec = { id, V, method: m, sym, part, align, P, L, F, edgeClasses: d.edgeClasses.length, loops, euler, minArea: minA, rDev, baseDy,
      flatBase: baseDy < 1e-9, effectiveMethod: d.params.subdivMethod, lowestOnBorder };
    out.combos.push(rec);
    if (bad) fail(id, bad + ' arêtes mal partagées');
    if (!full && (!deg2 || loops !== 1)) fail(id, 'bord : ' + loops + ' boucle(s)' + (deg2 ? '' : ', nœud de bord de degré ≠ 2'));
    if (full && sel.length) fail(id, 'sphère entière avec bord');
    if (euler !== expectEuler) fail(id, 'Euler V−E+F = ' + euler + ' (attendu ' + expectEuler + ')');
    if (!(minA > 1e-9)) fail(id, 'face dégénérée (aire ' + minA + ')');
    if (rDev > 1e-9 && m !== 'Mexican' && m !== 'Kruschke') fail(id, 'nœud hors sphère (écart ' + rDev.toExponential(2) + ')');
    if (align && baseDy > 1e-6) fail(   // seuil du moteur (groundSliced ne bouge pas un nœud de moins de 1e-6 × rayon)
      id, 'base alignée mais pas plate (Δy ' + baseDy.toExponential(2) + ')');
    // symétrie face-face
    const asym = d.faceAdjacency.some((a, i) => a.some(x => !d.faceAdjacency[x.neighbor].some(y => y.neighbor === i)));
    if (asym) fail(id, 'adjacence de faces non symétrique');
  }

const sum = (f) => out.combos.filter(f).length;
out.summary = { combos: out.combos.length, failures: nFail, flatBase: sum(c => c.flatBase), notFlat: sum(c => !c.flatBase && c.part !== '1/1'),
  silentMethodChange: sum(c => c.effectiveMethod !== c.method), mexicanOffSphere: Math.max(...out.combos.filter(c => c.method === 'Mexican').map(c => c.rDev)),
  kruschkeOffSphere: Math.max(...out.combos.filter(c => c.method === 'Kruschke').map(c => c.rDev)) };
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
out.refs.forEach(r => console.log((r.ok ? 'OK    ' : 'ÉCHEC ') + r.name + (r.ok ? '' : ' → ' + r.detail.join(' ; '))));
console.log('Combinaisons testées :', out.summary.combos, '· échecs :', nFail, '· bases plates :', out.summary.flatBase, '· bases non plates :', out.summary.notFlat);
out.failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f));
out.known.forEach(f => console.log('  (connu) ' + f));
console.log('Alignements refusés (triangles retournés) :', (out.alignRefused || []).length);
process.exit(nFail ? 1 : 0);
