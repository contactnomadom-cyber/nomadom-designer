// Batterie de non-régression — découpe textile (etages.js, toile.js, nesting.js)
// Usage : node tests/textile.test.js <dossier des modules> [--quick] [--json sortie.json]
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js'));
const makeEtages = require(path.join(SRC, 'etages.js'));
const Toile = require(path.join(SRC, 'toile.js'));
const Nesting = require(path.join(SRC, 'nesting.js'));
const quick = process.argv.includes('--quick');
const USABLE = 1.48, TOL = 0.05, SEAM = { A: 0.02, B: 0.02, hem: 0.05, type: 'simple' };
const out = { runs: [], failures: [], known: [] };

function checkPlan(dome, tool, res) {
  const issues = [];
  // 1. chaque face dans exactement un morceau
  const seen = new Map();
  res.plan.forEach(b => b.pieces.forEach(pc => pc.chain.forEach(f => seen.set(f, (seen.get(f) || 0) + 1))));
  const missing = dome.faces.filter(f => !seen.has(f.index)).length, dup = [...seen.values()].filter(c => c > 1).length;
  if (missing) issues.push(missing + ' face(s) sans morceau');
  if (dup) issues.push(dup + ' face(s) dans plusieurs morceaux');
  // 2. planéité (« sans vague »)
  const sheets = [...res.sheets.values()];
  const notFlat = sheets.filter(s => !s.check.flat);
  if (notFlat.length) issues.push(notFlat.length + ' morceau(x) non développable(s) : ' + notFlat.slice(0, 3).map(s => s.name + ' (err ' + s.check.maxLengthError.toExponential(1) + ', nœuds int. ' + s.check.interiorNodes + ', recouvr. ' + (+s.check.overlap).toFixed(4) + ')').join(', '));
  // 3. côtés A / B : chaque arête cousue = un A et un B
  const sides = new Map();
  sheets.forEach(s => s.edges.forEach(e => { if (e.side === 'H') return; const k = e.nodeIds.slice().sort().join('|');
    if (!sides.has(k)) sides.set(k, []); sides.get(k).push(e.side + ':' + s.name); }));
  let badAB = 0; sides.forEach(v => { const s = v.map(x => x[0]).sort().join(''); if (s !== 'AB') badAB++; });
  if (badAB) issues.push(badAB + ' couture(s) sans paire A/B');
  // 4. ourlet = exactement les arêtes du bord
  const hem = sheets.reduce((a, s) => a + s.edges.filter(e => e.side === 'H').length, 0), sel = dome.lines.filter(l => l.selvage).length;
  if (hem !== sel) issues.push('ourlet sur ' + hem + ' arêtes, bord de ' + sel);
  // 5. laize
  const tooWide = sheets.filter(s => s.cutWidth > USABLE + 1e-9);
  return { issues, sheets, tooWide };
}

const combos = [];
const METHODS = V => (V === 3 || V === 4) ? ['Kruschke', 'Chords'] : ['Chords'];
const vArg = process.argv.find(x => /^--v=/.test(x)), VS = vArg ? vArg.slice(4).split(',').map(Number) : [1, 2, 3, 4, 5, 6];
for (const V of VS.filter(v => !quick || v <= 4)) for (const m of METHODS(V).concat(V >= 4 && !quick ? ['Arcs'] : []))
  for (const sym of ['Pentad', 'Triad', 'Cross']) for (const part of E.partialListClassI(V)) {
    const align = m !== 'Kruschke' && !/^1(\/[12])?$/.test(part);
    combos.push({ V, m, sym, part, align });
  }
for (const c of combos) {
  const id = `${c.V}V ${c.m} ${c.sym} ${c.part}${c.align ? ' alignée' : ''}`;
  let dome;
  try { dome = E.generateDome({ detail: c.V, subdivMethod: c.m, symmetry: c.sym, partial: c.part, alignTheBase: c.align, radius: 2.5 }); }
  catch (e) { if (e.code === 'ALIGN_FLIP') { out.known.push(id + ' : alignement refusé (attendu)'); continue; } out.failures.push(id + ' : moteur ' + e.message); continue; }
  for (const strategy of ['pieces', 'gabarits', 'triangles']) for (const base of (strategy === 'pieces' ? ['ring', 'sectors'] : ['ring'])) {
    const sid = id + ' · ' + strategy + (base === 'sectors' ? ' (5 secteurs)' : '');
    const t0 = Date.now(); let tool, res, chk, nest;
    try {
      tool = makeEtages(dome);
      res = Toile.planFabric(tool, USABLE, SEAM, TOL, { strategy, base });
      chk = checkPlan(dome, tool, res);
      const t1 = Date.now();
      const sheets = chk.sheets;
      nest = Nesting.nest(sheets.map(sh => ({ name: sh.name, poly: sh.cut, L: sh.cutLength, W: sh.cutWidth, area: sh.cutArea })), USABLE, { row: 0.01, tries: 8 });
      if (nest.check.overlaps) chk.issues.push(nest.check.overlaps + ' chevauchement(s) sur le rouleau');
      if (nest.check.outside) chk.issues.push(nest.check.outside + ' morceau(x) hors du rouleau');
      out.runs.push({ id: sid, V: c.V, m: c.m, sym: c.sym, part: c.part, strategy, base, faces: dome.faces.length, pieces: sheets.length,
        bands: res.plan.length, tooWide: chk.tooWide.length, tooWideMax: chk.tooWide.length ? Math.max(...chk.tooWide.map(s => s.cutWidth)) : 0,
        nestTooWide: nest.tooWide.length, roll: nest.length, util: nest.utilisation, planMs: t1 - t0, nestMs: Date.now() - t1, issues: chk.issues });
      if (chk.issues.length) out.failures.push(sid + ' : ' + chk.issues.join(' ; '));
      const jj = process.argv.indexOf('--json'); if (jj > 0) fs.writeFileSync(process.argv[jj + 1], JSON.stringify(out, null, 1));
    } catch (e) {
      out.runs.push({ id: sid, V: c.V, m: c.m, sym: c.sym, part: c.part, strategy, base, exception: String(e && e.message || e) });
      out.failures.push(sid + ' : exception ' + (e && e.message || e));
    }
  }
}
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
console.log('Découpes testées :', out.runs.length, '· en échec :', out.failures.length);
out.failures.slice(0, 50).forEach(f => console.log('  ✗ ' + f));
process.exit(out.failures.length ? 1 : 0);
