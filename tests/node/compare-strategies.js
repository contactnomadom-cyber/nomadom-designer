// Comparatif des 4 stratégies de découpe : node tests/compare-strategies.js <src> <sortie.json>
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.resolve(process.argv[2] || 'src');
global.Toile = require(path.join(SRC, 'toile.js')); global.Nesting = require(path.join(SRC, 'nesting.js'));
const E = require(path.join(SRC, 'dome-engine.js')), mk = require(path.join(SRC, 'etages.js')), O = require(path.join(SRC, 'optim.js'));
const U = 1.48, SEAM = { A: 0.02, B: 0.02, hem: 0.05, type: 'simple' }, TOL = 0.05;
const CASES = [
  { name: '2V 1/2 Ø5,30 m', p: { detail: 2, subdivMethod: 'Chords', partial: '1/2' }, D: 5.3 },
  { name: '3V Kruschke 5/9 Ø5 m', p: { detail: 3, subdivMethod: 'Kruschke', partial: '7/12' }, D: 5 },
  { name: '4V 1/2 Ø8 m', p: { detail: 4, subdivMethod: 'Chords', partial: '1/2' }, D: 8 },
  { name: '6V 1/2 Ø12 m', p: { detail: 6, subdivMethod: 'Chords', partial: '1/2' }, D: 12 }
];
const measure = (tool, res, ms) => {
  const sheets = [...res.sheets.values()], st = tool.seamStats(res.plan);
  const t0 = Date.now();
  const nr = Nesting.nest(sheets.map(sh => ({ name: sh.name, poly: sh.cut, L: sh.cutLength, W: sh.cutWidth, area: sh.cutArea })), U, { row: 0.01, tries: 8 });
  return { pieces: sheets.length, gabarits: Toile.groupGabarits(sheets, true).length, sewn: st.sewn, total: st.total,
    cutArea: +sheets.reduce((a, x) => a + x.cutArea, 0).toFixed(2), roll: +nr.length.toFixed(2), util: +(nr.utilisation * 100).toFixed(1),
    tooWide: sheets.filter(x => x.cutWidth > U + 1e-9).length, nestTooWide: nr.tooWide.length, overlaps: nr.check.overlaps,
    flat: sheets.every(x => x.check.flat), planMs: ms, nestMs: Date.now() - t0 };
};
(async () => {
  const out = [];
  for (const c of CASES) {
    const dome = E.generateDome(Object.assign({ symmetry: 'Pentad', radius: c.D / 2 }, c.p));
    for (const s of ['pieces', 'gabarits', 'triangles', 'toile']) {
      const tool = mk(dome), t0 = Date.now();
      let res;
      if (s === 'toile') res = await O.optimizeFabric(tool, U, SEAM, TOL, 0.10, () => {});
      else res = Toile.planFabric(tool, U, SEAM, TOL, { strategy: s, base: 'ring' });
      const m = measure(tool, res, Date.now() - t0);
      out.push(Object.assign({ dome: c.name, faces: dome.faces.length, strategy: s }, m));
      console.log(c.name, s, JSON.stringify(m));
      fs.writeFileSync(process.argv[3] || 'compare.json', JSON.stringify(out, null, 1));
    }
  }
})();
