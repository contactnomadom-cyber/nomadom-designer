// ---------------------------------------------------------
// lumber.js — Liste de débits du bois et des panneaux (idée n° 8, aménagement, étape 1).
// Logique pure, sans DOM, testée sous Node (tests/node/lumber.test.js). Unités : m.
//
// Image : le menuisier qui range ses coupes dans les barres du marchand. On place
// d'abord les pièces les plus longues, chacune dans la barre où elle laisse la plus
// petite chute ; une fois tout placé, chaque barre est ramenée à la plus courte
// longueur vendue qui suffit (on n'achète pas 5,40 m pour 2,50 m de coupes).
//
// Stock par défaut : Bourguignon Bois, sapin blanc raboté, longueurs de 2,10 à 5,40 m
// par pas de 30 cm, suivant stock — 🟠 à confirmer chez le fournisseur.
// Panneaux : format 2,44 × 1,22 m par défaut — 🟠 à confirmer (OSB, multiplex, Agepan).
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const LENGTHS = [2.1, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.4];
  const DEFAULTS = { lengths: LENGTHS, kerf: 0.004, sheet: { l: 2.44, w: 1.22 }, sheetWaste: 0.12, supplier: 'Bourguignon Bois' };
  const EPS = 1e-9;

  // pièces [{ ref, len }] → barres [{ stock, cuts: [{ ref, len }], used, waste }] ; tooLong : pièces plus longues que la plus grande barre
  function cutPlan(pieces, lengths, kerf) {
    const L = (lengths || LENGTHS).slice().sort((a, b) => a - b), k = kerf === undefined ? DEFAULTS.kerf : kerf, max = L[L.length - 1];
    const sorted = pieces.slice().sort((a, b) => b.len - a.len), bars = [], tooLong = [];
    sorted.forEach(p => {
      if (p.len > max + EPS) { tooLong.push(p); return; }
      // meilleure place : la barre ouverte qui garde le plus petit reste
      let best = null, bestRest = Infinity;
      bars.forEach(b => { const rest = max - b.used - (b.cuts.length ? k : 0) - p.len; if (rest >= -EPS && rest < bestRest) { best = b; bestRest = rest; } });
      if (!best) { best = { cuts: [], used: 0 }; bars.push(best); }
      best.used += (best.cuts.length ? k : 0) + p.len; best.cuts.push(p);
    });
    bars.forEach(b => { b.stock = L.find(s => s >= b.used - EPS); b.waste = b.stock - b.used; });
    const buy = {};
    bars.forEach(b => { const key = b.stock.toFixed(2); buy[key] = (buy[key] || 0) + 1; });
    const bought = bars.reduce((s, b) => s + b.stock, 0), net = pieces.filter(p => tooLong.indexOf(p) < 0).reduce((s, p) => s + p.len, 0);
    return { bars, tooLong, buy, bought, net, wasteRatio: bought > 0 ? (bought - net) / bought : 0 };
  }

  // angle d'onglet (degrés depuis la coupe d'équerre) entre deux pièces d'un cadre fermé :
  // la coupe partage l'angle entre les deux pièces (bissectrice)
  function miterAt(u, v) {
    const c = Math.max(-1, Math.min(1, (u.x * v.x + u.z * v.z) / (Math.hypot(u.x, u.z) * Math.hypot(v.x, v.z)))); // angle entre les pièces
    return (180 - Math.acos(c) * 180 / Math.PI) / 2;
  }
  const same = (p, q) => Math.hypot(p.x - q.x, p.z - q.z) < 1e-6;

  // pièces d'un cadre (segments a→b de même famille) : longueur d'axe, onglets aux deux bouts,
  // longueur à couper à la pointe longue (axe + largeur × tan(onglet) / 2 à chaque bout)
  function framePieces(segs, width) {
    return segs.map((s, i) => {
      const len = Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z), d = { x: s.b.x - s.a.x, z: s.b.z - s.a.z };
      const end = (p, out) => {
        const o = segs.find((t, j) => j !== i && (same(t.a, p) || same(t.b, p)));
        if (!o) return 0;
        const q = same(o.a, p) ? o.b : o.a, w = { x: q.x - p.x, z: q.z - p.z };
        return miterAt(out, w);
      };
      const m0 = end(s.a, d), m1 = end(s.b, { x: -d.x, z: -d.z });
      const cut = len + width / 2 * (Math.tan(m0 * Math.PI / 180) + Math.tan(m1 * Math.PI / 180));
      return { axis: len, len: cut, miter: [m0, m1] };
    });
  }

  // regroupe des pièces identiques (à 1 mm et 0,1° près) : repère A, B, C… par section
  function group(pieces, prefix) {
    const out = [];
    pieces.forEach(p => {
      const g = out.find(q => Math.abs(q.len - p.len) < 5e-4 && Math.abs(q.miter[0] - p.miter[0]) < 0.1 && Math.abs(q.miter[1] - p.miter[1]) < 0.1 && q.what === p.what);
      if (g) g.n++; else out.push(Object.assign({ n: 1 }, p));
    });
    out.sort((a, b) => b.len - a.len).forEach((g, i) => { g.ref = prefix + (i + 1); });
    return out;
  }

  // liste de débits du plancher (résultat de Floor.layout)
  function floorCutList(r, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    if (!r || !r.ok) return null;
    const bw = r.options.beam.w, jw = r.options.joist.w;
    const beamP = [];
    ['ceinture', 'pentagone', 'triangle'].forEach(kind => {
      const segs = r.beams.filter(b => b.kind === kind);
      if (segs.length) framePieces(segs, bw).forEach(p => beamP.push(Object.assign(p, { what: kind })));
    });
    const joistP = r.joists.map(j => ({ axis: j.length, len: j.length, miter: [0, 0], what: 'solive' }));
    const sections = [
      { key: 'poutres', name: 'Poutres', w: bw, d: r.options.beam.d, groups: group(beamP, 'P') },
      { key: 'solives', name: 'Solives', w: jw, d: r.options.joist.d, groups: group(joistP, 'S') }
    ];
    sections.forEach(s => {
      const pieces = [];
      s.groups.forEach(g => { for (let k = 0; k < g.n; k++) pieces.push({ ref: g.ref, len: g.len }); });
      s.plan = cutPlan(pieces, o.lengths, o.kerf);
    });
    const sheetArea = o.sheet.l * o.sheet.w;
    const panels = { area: r.area, thickness: r.options.deckThickness, sheet: o.sheet, sheets: Math.ceil(r.area * (1 + o.sheetWaste) / sheetArea - 1e-9), waste: o.sheetWaste };
    return { sections, panels, options: o };
  }

  const Lumber = { DEFAULTS, LENGTHS, cutPlan, miterAt, framePieces, group, floorCutList };
  if (typeof module !== 'undefined' && module.exports) module.exports = Lumber;
  else global.Lumber = Lumber;
})(typeof window !== 'undefined' ? window : globalThis);
