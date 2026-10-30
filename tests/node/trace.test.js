// Fiche de traçage (export.js) — tournée « au mètre puis à l'équerre » (30/10/2026)
// Usage : node tests/node/trace.test.js <dossier des modules>
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.resolve(process.argv[2] || 'src');
const req = n => { const flat = path.join(SRC, n); return require(fs.existsSync(flat) ? flat : require.resolve(path.join(SRC, { 'dome-engine.js': 'core', 'etages.js': 'textile', 'toile.js': 'textile', 'export.js': 'fabrication' }[n], n))); };
const E = req('dome-engine.js'), makeEtages = req('etages.js'), Toile = req('toile.js'), Exp = req('export.js');
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };

// 1. regroupement et alerte « proche »
const m = Exp.metreMarks([{ label: 'P1', x: 0.5, y: 0.1 }, { label: 'P2', x: 0.1, y: 0.2 }, { label: 'P3', x: 0.1004, y: 0.9 }, { label: 'P4', x: 0.103, y: 0.3 }, { label: 'P5', x: 0.2, y: 0.3 }]);
check(m.map(k => k.x).join(',') === '100,103,200,500', 'marques triées par X : ' + m.map(k => k.x).join(','));
check(m[0].pts.map(p => p.label).join('+') === 'P2+P3', 'même millimètre = une seule marque');
check(m[1].close === true && m[1].gap === 3, 'marque à 3 mm : ⚠ proche');
check(!m[2].close && !m[3].close, 'marques éloignées : pas d\'alerte');

// 2. fiche réelle : chaque point P apparaît une fois, par X croissant, et l'annexe garde la corde et les points C
const dome = E.generateDome({ detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 });
const res = Toile.planFabric(makeEtages(dome), 1.48, { A: 0.02, B: 0.02, hem: 0.05, type: 'simple' }, 0.05, { strategy: 'gabarits' });
const meta = { title: 't', dome: 'd', structure: 's', seams: 'c', laize: '1500 mm', date: 'x', selvage: 0.01 };
for (const sh of res.sheets.values()) {
  const html = Exp.tracingDocument([sh], meta, false);
  const main = html.split('Annexe —')[0];
  const tbl = main.slice(main.indexOf('<th>Marque</th>'), main.indexOf('</table>', main.indexOf('<th>Marque</th>')));
  const rows = [...tbl.matchAll(/<td><b>(\d+) mm<\/b>/g)].map(x => +x[1]);
  check(rows.every((v, i) => !i || v > rows[i - 1]), sh.name + ' : X non croissants');
  const labels = [...tbl.matchAll(/<b>(P\d+)<\/b> : Y/g)].map(x => x[1]);
  check(labels.length === sh.points.length && new Set(labels).size === labels.length, sh.name + ' : ' + labels.length + ' points au mètre pour ' + sh.points.length);
  check(/Annexe —/.test(html) && /Corde \(2 arcs\)/.test(html) && /C1<\/td>/.test(html), sh.name + ' : annexe incomplète');
  check(!/Corde \(2 arcs\)/.test(main), sh.name + ' : la corde doit être en annexe seulement');
}
console.log('Fiche de traçage : ' + (n - fails.length) + '/' + n + ' contrôles OK');
fails.slice(0, 20).forEach(f => console.log('  ✗ ' + f));
process.exit(fails.length ? 1 : 0);
