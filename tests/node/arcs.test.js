// Arcs (arcs égaux) contre Antiprism, logiciel indépendant : node tests/arcs.test.js <src>
// Attendu (audit 30/10/2026) : 3V identique (🟢) ; 4V–6V mêmes comptages, longueurs à < 3e-4 × rayon (🟡, points intérieurs définis autrement)
'use strict';
const path = require('path');
const E = require(path.join(path.resolve(process.argv[2] || 'src'), 'dome-engine.js'));
const REF = require(path.join(__dirname, '../../data/references/antiprism/arcs-ico-3v-6v.json'));
let fail = 0;
for (const V of [3, 4, 5, 6]) {
  const d = E.generateDome({ detail: V, subdivMethod: 'Arcs', partial: '1/1', symmetry: 'Pentad', radius: 1 });
  const L = d.lines.map(l => { const [a, b] = l.pointIds.map(i => d.pointById.get(i)); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }).sort((a, b) => a - b);
  const cls = []; L.forEach(x => { const c = cls[cls.length - 1]; if (c && Math.abs(x - c[1]) < 1e-7) c[0]++; else cls.push([1, x]); });
  const ref = REF.classes[V];
  const counts = cls.length === ref.length && cls.every((c, i) => c[0] === ref[i][0]);
  const dev = Math.max(...cls.map((c, i) => Math.abs(c[1] - (ref[i] || [0, 0])[1])));
  const ok = counts && (V === 3 ? dev < 1e-9 : dev < 3e-4);
  if (!ok) fail++;
  console.log((ok ? 'OK    ' : 'ÉCHEC ') + V + 'V Arcs : ' + cls.length + ' longueurs, comptages ' + (counts ? 'identiques' : 'différents') + ', écart max ' + dev.toExponential(2) + ' × rayon' + (V === 3 ? ' (attendu identique)' : ' (attendu < 3e-4)'));
}
process.exit(fail ? 1 : 0);
