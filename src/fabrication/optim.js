
// ---------------------------------------------------------
// optim.js — Découpe « Moins de toile » (compromis toile / coutures)
// Idée : couper chaque étage en morceaux plus courts, donc plus droits, qui
// s'emboîtent mieux sur le rouleau, sans tomber dans le triangle par
// triangle (beaucoup de coutures, marges sur 3 côtés de chaque triangle).
//
// Score à minimiser = longueur de rouleau (m) + poids × arêtes cousues,
// où « poids » = la longueur de toile qu'on accepte de payer pour éviter
// une couture (réglage, 10 cm par défaut).
//
// Recherche en 2 temps :
//   1. chaque étage est évalué SEUL, pour plusieurs longueurs max de morceau
//      (1 triangle, 2, 3… jusqu'à l'étage entier), découpe libre ou en
//      secteurs identiques ; on garde les 3 meilleures options par étage ;
//   2. on combine les étages et on améliore étage par étage avec le vrai
//      placement de tout le dôme sur le rouleau.
// Les morceaux restent des bandes de triangles d'un même étage : toujours
// développables sans vague (aucun nœud intérieur).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const T = global.Toile || (typeof require !== 'undefined' ? require('./toile.js') : null);
  const N = global.Nesting || (typeof require !== 'undefined' ? require('./nesting.js') : null);

  function buildPlan(et, U, values, tol, bands) {
    // largeur de planification : on part de la laize utile et on resserre
    // tant qu'un morceau de plusieurs triangles déborde une fois ses marges ajoutées
    let w = U, plan, sheets, ok = false;
    for (let it = 0; it < 30; it++) {
      const spec = {}; Object.keys(bands).forEach(k => { spec[k] = Object.assign({}, bands[k], { w }); });
      plan = et.plan(U, tol, { strategy: 'custom', bands: spec });
      sheets = new Map();
      ok = true;
      plan.forEach(b => b.pieces.forEach(pc => {
        const sh = T.applyAllowances(et.pieceSheet(plan, pc), values);
        sheets.set(pc.name, sh);
        if (pc.chain.length > 1 && sh.cutWidth > U + 1e-9) ok = false;
      }));
      if (ok) break;
      w -= 0.01;
    }
    return { plan, sheets, ok };
  }

  function nestSheets(sheets, U, opts) {
    const items = [...sheets.values()].map(s => ({ name: s.name, poly: s.cut, L: s.cutLength, W: s.cutWidth, area: s.cutArea }));
    return N.nest(items, U, opts);
  }

  function optionsForBand(n, closed) {
    const caps = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, Infinity].filter(c => c === Infinity || c < n);
    const out = [];
    caps.forEach(c => {
      out.push({ mode: 'g', cap: c });
      if (closed && n % 5 === 0 && c > 1 && c !== Infinity) out.push({ mode: 's', cap: c });
    });
    if (closed && n % 5 === 0) out.push({ mode: 's', cap: Infinity });
    return out;
  }
  const keyOf = o => o.mode + (o.cap === Infinity ? '∞' : o.cap);

  // optimise ; onProgress(fraction, texte) ; renvoie une promesse
  async function optimizeFabric(et, U, values, tol, seamWeight, onProgress) {
    const tick = () => new Promise(r => setTimeout(r, 0));
    const bandsInfo = et.buildBands().filter(b => b.level > 0);
    const base = {}; bandsInfo.forEach(b => { base[b.level] = { mode: 'g', cap: 1 }; });
    const fast = { row: 0.01, tries: 3 };

    // 1) chaque étage seul
    const shortlist = {};
    let done = 0;
    const total = bandsInfo.reduce((a, b) => a + optionsForBand(b.order.length, b.closed).length, 0);
    for (const b of bandsInfo) {
      const scored = [];
      for (const o of optionsForBand(b.order.length, b.closed)) {
        const bands = Object.assign({}, base, { [b.level]: o });
        const r = buildPlan(et, U, values, tol, bands);
        done++;
        if (onProgress) onProgress(0.6 * done / total, 'Étage ' + b.level + ' : essai ' + keyOf(o));
        await tick();
        const bandPlan = r.plan.find(x => x.level === b.level);
        const names = new Set(bandPlan.pieces.map(pc => pc.name));
        const sub = new Map([...r.sheets].filter(([k]) => names.has(k)));
        const over = [...sub.values()].filter(s => s.cutWidth > U + 1e-9).length;
        if ([...sub.values()].some(s => s.cutWidth > U + 1e-9 && s.triangles.length > 1)) continue;
        const nr = nestSheets(sub, U, fast);
        const cuts = bandPlan.pieces.length; // coupes montantes (ou fermeture d'anneau)
        scored.push({ o, over, score: nr.length + seamWeight * cuts, len: nr.length, cuts });
      }
      // un morceau hors laize n'est acceptable que s'il n'y a aucune autre solution
      const minOver = Math.min(...scored.map(x => x.over));
      scored.splice(0, scored.length, ...scored.filter(x => x.over === minOver));
      scored.sort((p, q) => p.score - q.score);
      shortlist[b.level] = scored.slice(0, 3).map(x => x.o);
    }

    // 2) combinaison + amélioration étage par étage (vrai placement complet)
    const evalFull = async bands => {
      const r = buildPlan(et, U, values, tol, bands);
      const nr = nestSheets(r.sheets, U, fast);
      const st = et.seamStats(r.plan);
      await tick();
      const over = [...r.sheets.values()].filter(s => s.cutWidth > U + 1e-9).length;
      return { bands, r, nr, st, over, score: nr.length + seamWeight * st.sewn + 1000 * over };
    };
    let cur = {}; bandsInfo.forEach(b => { cur[b.level] = shortlist[b.level][0] || { mode: 'g', cap: 1 }; });
    let best = await evalFull(cur);
    const steps = bandsInfo.reduce((a, b) => a + (shortlist[b.level].length - 1), 0) * 2;
    let k = 0;
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (const b of bandsInfo) {
        for (const o of shortlist[b.level]) {
          if (keyOf(o) === keyOf(best.bands[b.level])) continue;
          k++;
          if (onProgress) onProgress(0.6 + 0.35 * Math.min(1, k / Math.max(1, steps)), 'Combinaison des étages…');
          const cand = await evalFull(Object.assign({}, best.bands, { [b.level]: o }));
          if (cand.score < best.score - 1e-6) { best = cand; improved = true; }
        }
      }
      if (!improved) break;
    }
    // 3) on compare aussi aux découpes de référence : le compromis ne doit jamais faire pire
    for (const strategy of ['gabarits', 'pieces', 'triangles']) {
      if (onProgress) onProgress(0.96, 'Comparaison avec « ' + strategy + ' »…');
      const r = T.planFabric(et, U, values, tol, { strategy, base: 'ring' });
      const nr = nestSheets(r.sheets, U, fast);
      const st = et.seamStats(r.plan);
      const over = [...r.sheets.values()].filter(x => x.cutWidth > U + 1e-9).length;
      const score = nr.length + seamWeight * st.sewn + 1000 * over;
      await tick();
      if (score < best.score - 1e-6) best = { bands: { reference: strategy }, r, nr, st, over, score };
    }
    if (onProgress) onProgress(1, 'Terminé');
    return { plan: best.r.plan, sheets: best.r.sheets, bands: best.bands, roughLength: best.nr.length, seams: best.st.sewn };
  }

  const Optim = { optimizeFabric, buildPlan, optionsForBand };
  if (typeof module !== 'undefined' && module.exports) module.exports = Optim;
  else global.Optim = Optim;
})(typeof window !== 'undefined' ? window : globalThis);
