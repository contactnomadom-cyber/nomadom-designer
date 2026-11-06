// ---------------------------------------------------------
// sheets.js — Plan de coupe des panneaux de plancher (OSB, multiplex) sur les vrais formats.
// Logique pure, sans DOM, testée sous Node (tests/node/sheets.test.js). Unités : m.
//
// Image : le carreleur qui pose par rangées. Les panneaux sont posés en rangées
// en travers des solives ; chaque joint en bout tombe sur une solive ; une rangée
// sur deux commence par un demi-panneau (joints décalés, comme une maçonnerie) ;
// la chute d'un bout de rangée sert à commencer la suivante quand elle suffit.
// Plancher en étoile : chaque secteur est découpé dans un panneau entier
// (encombrement rectangulaire, plusieurs par panneau quand ils tiennent).
//
// Formats : catalogue Bourguignon Bois relevé le 05/11/2026 (prix « à partir de »,
// TVA non précisée) — 🟠 à confirmer au magasin.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const SHEETS = {
    'osb22-rl': { name: 'OSB 3 22 mm rainuré-languetté', l: 2.50, w: 0.675, t: 0.022, tg: true, price: 14.67 },
    'osb18-rl': { name: 'OSB 3 18 mm rainuré-languetté', l: 2.44, w: 0.595, t: 0.018, tg: true, price: 11.18 },
    'osb15-rl': { name: 'OSB 3 15 mm rainuré-languetté', l: 2.50, w: 0.675, t: 0.015, tg: true, price: 10.01 },
    'osb18-bd': { name: 'OSB 3 18 mm bords droits', l: 2.50, w: 1.25, t: 0.018, tg: false, price: 12.09 },
    'mpx18-ad': { name: 'Multiplex bakélisé anti-dérapant 18 mm', l: 2.50, w: 1.25, t: 0.018, tg: false, price: 27.31 },
    'mpx19-pin': { name: 'Multiplex pin A/B 19 mm', l: 2.50, w: 1.22, t: 0.019, tg: false, price: 54.81 }
  };
  const DEFAULT = 'osb22-rl', MIN_PIECE = 0.3, KERF = 0.004;
  // écart maxi entre appuis d'un plancher d'habitation (Premier Guarantee, Technical Update « Floor decks ») :
  // OSB/3 et contreplaqué 15 mm → 450 mm ; 18 mm et plus → 600 mm (22 mm : pas de valeur plus grande retenue) — 🟡
  const spanMax = S => S.t < 0.0175 ? 0.45 : 0.60;
  const dot = (a, b) => a.x * b.x + a.z * b.z;

  // découpe d'un polygone par une bande r0 ≤ r ≤ r1 (r = dot(p, u)) : polygone de la bande
  function clipBand(poly, u, r0, r1) {
    const half = (pts, sgn, lim) => {
      const out = [];
      pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], a = sgn * (dot(p, u) - lim), b = sgn * (dot(q, u) - lim);
        if (a >= 0) out.push(p);
        if ((a >= 0) !== (b >= 0)) { const t = a / (a - b); out.push({ x: p.x + t * (q.x - p.x), z: p.z + t * (q.z - p.z) }); } });
      return out;
    };
    return half(half(poly, 1, r0), -1, r1);
  }
  const area = poly => { let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p.x * q.z - q.x * p.z; }); return Math.abs(a) / 2; };

  // 1D : pièces de longueur ≤ L dans des panneaux de longueur L, une chute de bout de panneau resservant
  function packStrips(lengths, L) {
    const bins = [];
    lengths.slice().sort((a, b) => b - a).forEach(len => {
      let best = null, rest = Infinity;
      bins.forEach(b => { const r = L - b.used - (b.n ? KERF : 0) - len; if (r >= -1e-9 && r < rest) { rest = r; best = b; } });
      if (!best) { best = { used: 0, n: 0, cuts: [] }; bins.push(best); }
      best.used += (best.n ? KERF : 0) + len; best.n++; best.cuts.push(len);
    });
    return bins;
  }

  // plancher à solives parallèles : poly = contour, joists = segments parallèles (a, b) ; sheetKey = format
  function rows(poly, joists, sheetKey) {
    const S = SHEETS[sheetKey] || SHEETS[DEFAULT], errors = [], warnings = [];
    if (!poly || poly.length < 3 || !joists || !joists.length) return { ok: false, errors: ['pas de solives'] };
    const j0 = joists[0], dl = Math.hypot(j0.b.x - j0.a.x, j0.b.z - j0.a.z), u = { x: (j0.b.x - j0.a.x) / dl, z: (j0.b.z - j0.a.z) / dl }, v = { x: -u.z, z: u.x };
    // positions des solives en travers (s), triées, sans doublons
    const js = [...new Set(joists.map(j => Math.round(dot({ x: (j.a.x + j.b.x) / 2, z: (j.a.z + j.b.z) / 2 }, v) * 1e4) / 1e4))].sort((a, b) => a - b);
    const gaps = js.slice(1).map((s, k) => s - js[k]);
    const gmax = gaps.length ? Math.max(...gaps) : 0;
    if (gmax > spanMax(S) + 1e-6) errors.push('écart entre solives ' + Math.round(gmax * 1000) + ' mm > ' + Math.round(spanMax(S) * 1000) + ' mm admis pour ' + S.name + ' : resserrer l\'entraxe ou prendre un panneau plus épais');
    // rangées : bandes de la largeur du panneau le long des solives (r = dot(p, u))
    const rs = poly.map(p => dot(p, u)), rmin = Math.min(...rs), rmax = Math.max(...rs), out = [];
    let k = 0;
    for (let r0 = rmin; r0 < rmax - 1e-6; r0 += S.w, k++) {
      const r1 = Math.min(r0 + S.w, rmax), band = clipBand(poly, u, r0, r1);
      if (band.length < 3) continue;
      const ss = band.map(p => dot(p, v)), s0 = Math.min(...ss), s1 = Math.max(...ss), pieces = [];
      let cur = s0, first = true, guard = 0;
      while (cur < s1 - 1e-6 && guard++ < 200) {
        const want = cur + (first && k % 2 ? S.l / 2 : S.l);
        let end;
        if (want >= s1 - 1e-6) end = s1;
        else {
          // le joint tombe sur la dernière solive avant la longueur voulue (et assez loin du début)
          const cand = js.filter(s => s > cur + MIN_PIECE - 1e-9 && s <= want + 1e-9);
          end = cand.length ? cand[cand.length - 1] : Math.min(want, s1);
          if (!cand.length && end < s1) errors.push('rangée ' + (k + 1) + ' : aucun appui pour le joint');
        }
        pieces.push({ s0: cur, s1: end, len: end - cur });
        cur = end; first = false;
      }
      out.push({ r0, r1, width: r1 - r0, full: r1 - r0 > S.w - 1e-6, pieces });
    }
    // panneaux : bandes pleine largeur ensemble, bandes refendues (dernière rangée) à part
    const full = out.filter(rw => rw.full).flatMap(rw => rw.pieces.map(p => p.len)), ripped = out.filter(rw => !rw.full).flatMap(rw => rw.pieces.map(p => p.len));
    const tooLong = full.concat(ripped).filter(len => len > S.l + 1e-9);
    if (tooLong.length) errors.push(tooLong.length + ' morceau(x) plus long(s) que le panneau');
    const bins = packStrips(full.filter(l => l <= S.l + 1e-9), S.l).concat(packStrips(ripped.filter(l => l <= S.l + 1e-9), S.l));
    const net = area(poly), sheets = bins.length;
    // panneaux à bords droits : les joints longs entre rangées doivent porter sur une entretoise
    const noggings = S.tg ? 0 : Math.max(0, out.length - 1) * js.length;
    if (!S.tg && out.length > 1) warnings.push('Panneaux à bords droits : entretoises sous les joints longs entre rangées (' + noggings + ' entretoises entre solives)');
    return { ok: !errors.length, errors, warnings, kind: 'rangees', spanMax: spanMax(S), gapMax: gmax, sheet: S, sheetKey: SHEETS[sheetKey] ? sheetKey : DEFAULT, u, v, joistsAt: js, rows: out, pieces: out.reduce((t, rw) => t + rw.pieces.length, 0),
      sheets, net, bought: sheets * S.l * S.w, waste: sheets ? 1 - net / (sheets * S.l * S.w) : 0, cost: sheets * S.l * S.w * S.price, noggings };
  }

  // encombrement minimal (rectangle) d'un polygone, toutes orientations à 1° près
  function bbox(poly) {
    let best = null;
    for (let a = 0; a < 180; a++) {
      const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), xs = poly.map(p => p.x * c + p.z * s), ys = poly.map(p => -p.x * s + p.z * c);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), L = Math.max(w, h), W = Math.min(w, h);
      if (!best || L * W < best.l * best.w - 1e-12) best = { l: L, w: W, angle: a };
    }
    return best;
  }

  // plancher en étoile : secteurs et pièce centrale découpés chacun dans les panneaux
  function pieces(panels, sheetKey) {
    const S = SHEETS[sheetKey] || SHEETS[DEFAULT], errors = [], warnings = [];
    const list = panels.map(p => Object.assign({ kind: p.kind, type: p.type }, bbox(p.pts), { area: area(p.pts) }));
    const perSheet = b => {
      const fit = (L, W) => Math.floor((S.l + KERF) / (L + KERF)) * Math.floor((S.w + KERF) / (W + KERF));
      return Math.max(fit(b.l, b.w), fit(b.w, b.l));
    };
    let sheets = 0;
    const groups = [];
    list.forEach(b => {
      const g = groups.find(x => x.kind === b.kind && Math.abs(x.l - b.l) < 0.005 && Math.abs(x.w - b.w) < 0.005);
      if (g) g.n++; else groups.push(Object.assign({ n: 1 }, b));
    });
    groups.forEach(g => {
      g.perSheet = perSheet(g);
      if (!g.perSheet) { errors.push((g.kind === 'centre' ? 'pièce centrale' : 'secteur') + ' ' + Math.round(g.l * 1000) + ' × ' + Math.round(g.w * 1000) + ' mm trop grand pour ' + S.name); return; }
      g.sheets = Math.ceil(g.n / g.perSheet); sheets += g.sheets;
    });
    // en étoile, le panneau porte d'une solive à l'autre : l'écart le plus grand est au bord extérieur du secteur
    const gapOut = Math.max(0, ...panels.filter(p => p.kind === 'secteur').map(p => p.edge || 0));
    if (gapOut > spanMax(S) + 1e-6) errors.push('écart entre solives au bord extérieur ' + Math.round(gapOut * 1000) + ' mm > ' + Math.round(spanMax(S) * 1000) + ' mm admis : ajouter une solive intermédiaire ou des entretoises dans chaque secteur, ou passer en plancher plein');
    if (S.tg && groups.some(g => g.w > S.w)) warnings.push('Panneau étroit : un secteur plus large que le panneau demande deux morceaux, joint sans appui en étoile');
    const net = list.reduce((t, b) => t + b.area, 0);
    return { ok: !errors.length, errors, warnings, kind: 'secteurs', spanMax: spanMax(S), gapMax: gapOut, sheet: S, sheetKey: SHEETS[sheetKey] ? sheetKey : DEFAULT, groups, pieces: list.length,
      sheets, net, bought: sheets * S.l * S.w, waste: sheets ? 1 - net / (sheets * S.l * S.w) : 0, cost: sheets * S.l * S.w * S.price };
  }

  // plan de pose en SVG (vue de dessus) : contour, solives, rangées et joints ; échelle automatique
  function planSvg(res, poly, size) {
    if (!res || res.kind !== 'rangees') return '';
    const W = size || 320, xs = poly.map(p => p.x), zs = poly.map(p => p.z), x0 = Math.min(...xs), z0 = Math.min(...zs);
    const sc = (W - 20) / Math.max(Math.max(...xs) - x0, Math.max(...zs) - z0, 0.1), P = p => ((p.x - x0) * sc + 10).toFixed(1) + ',' + ((p.z - z0) * sc + 10).toFixed(1);
    const at = (r, s) => ({ x: res.u.x * r + res.v.x * s, z: res.u.z * r + res.v.z * s });
    const id = 'cp' + Math.round(Math.random() * 1e6);
    let g = '<defs><clipPath id="' + id + '"><polygon points="' + poly.map(P).join(' ') + '"/></clipPath></defs><polygon points="' + poly.map(P).join(' ') + '" fill="#f6efe2"/><g clip-path="url(#' + id + ')">';
    res.rows.forEach((rw, i) => rw.pieces.forEach(pc => {
      const q = [at(rw.r0, pc.s0), at(rw.r0, pc.s1), at(rw.r1, pc.s1), at(rw.r1, pc.s0)];
      g += '<polygon points="' + q.map(P).join(' ') + '" fill="' + (i % 2 ? '#d9b97a' : '#e6ca8e') + '" fill-opacity="0.75" stroke="#7a5a20" stroke-width="0.8"/>';
    }));
    g += res.joistsAt.map(s0 => { const rs = poly.map(p => dot(p, res.u)), a = at(Math.min(...rs), s0), b = at(Math.max(...rs), s0);
      return '<line x1="' + P(a).split(',')[0] + '" y1="' + P(a).split(',')[1] + '" x2="' + P(b).split(',')[0] + '" y2="' + P(b).split(',')[1] + '" stroke="#555" stroke-width="0.7" stroke-dasharray="3 2"/>'; }).join('') + '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + W + '" width="' + W + '" height="' + W + '" class="sheet-plan">' + g +
      '<polygon points="' + poly.map(P).join(' ') + '" fill="none" stroke="#222" stroke-width="1.6"/></svg>';
  }

  // résumé HTML commun (fiche plancher, mezzanine) : chiffres, alertes, plan de pose ; rien à fabriquer si 🔴 (ADR-0002)
  function html(res, poly) {
    if (!res) return '';
    const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), m = v => v.toFixed(2).replace('.', ',') + ' m', S = res.sheet;
    let h = '<div class="op-status" id="sheetPlan">';
    if (res.errors && res.errors.length) return h + '🔴 ' + res.errors.map(e).join('<br>🔴 ') + '<br>Plan de coupe des panneaux masqué tant que ce n\'est pas réglé.</div>';
    h += '<b>' + res.sheets + ' panneaux ' + e(S.name) + '</b> (' + Math.round(S.l * 1000) + ' × ' + Math.round(S.w * 1000) + ' mm) pour ' + res.net.toFixed(2).replace('.', ',') + ' m² · chute ' + Math.round(res.waste * 100) + ' % · ≈ ' + Math.round(res.cost) + ' € (prix « à partir de » Bourguignon, 🟠)';
    if (res.kind === 'rangees') h += '<br>' + res.rows.length + ' rangées en travers des solives, ' + res.pieces + ' morceaux · joints en bout sur solive, décalés d\'une rangée à l\'autre · écart maxi entre solives ' + Math.round(res.gapMax * 1000) + ' mm (≤ ' + Math.round(res.spanMax * 1000) + ' mm 🟡)';
    else h += '<br>' + res.groups.map(g => g.n + ' × ' + (g.kind === 'centre' ? 'pièce centrale' : 'secteur') + ' ' + Math.round(g.l * 1000) + ' × ' + Math.round(g.w * 1000) + ' mm (' + g.perSheet + ' par panneau)').join(' · ');
    if (res.warnings && res.warnings.length) h += '<br>⚠ ' + res.warnings.map(e).join('<br>⚠ ');
    return h + '</div>' + (res.kind === 'rangees' && poly ? '<div style="margin:6px 0">' + planSvg(res, poly, 300) + '</div>' : '');
  }

  const Sheets = { SHEETS, DEFAULT, spanMax, html, rows, pieces, bbox, packStrips, clipBand, area, planSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sheets;
  else global.Sheets = Sheets;
})(typeof window !== 'undefined' ? window : globalThis);
