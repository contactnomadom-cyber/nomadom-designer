
// ---------------------------------------------------------
// nesting.js — Étape 9 : placement des morceaux sur le rouleau
// Règles (choix de Nathan, 27/10) :
//   - rouleau continu de largeur utile U (laize − 2 × lisière) ;
//   - rotation 0° ou 180° seulement (droit-fil conservé) ;
//   - jamais retourné (la toile a un endroit) ;
//   - espacement 0 : deux morceaux peuvent partager un trait de coupe.
// Méthode : « bas-gauche » sur une grille de bandes horizontales de faible
// hauteur (ROW). Chaque morceau est décrit, bande par bande, par ses
// intervalles occupés le long du rouleau ; on le pousse vers la gauche
// jusqu'à la première position libre, pour chaque hauteur et chaque
// rotation, et on garde la position la plus à gauche (puis la plus basse).
// Plusieurs ordres de placement sont essayés ; on garde le plus court.
// Un contrôle exact (géométrie des polygones) vérifie le résultat final.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // intervalles x occupés par un polygone dans la bande [y0, y1]
  function slabIntervals(poly, y0, y1, samples) {
    const ivs = [];
    const n = poly.length;
    for (let s = 0; s <= samples; s++) {
      const y = y0 + (y1 - y0) * s / samples;
      const xs = [];
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) ivs.push([xs[k], xs[k + 1]]);
    }
    // sommets dans la bande : on les ajoute comme intervalles ponctuels
    poly.forEach(p => { if (p.y >= y0 && p.y <= y1) ivs.push([p.x, p.x]); });
    // segments dans la bande (un bord presque horizontal doit être couvert entièrement)
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const lo = Math.max(y0, Math.min(a.y, b.y)), hi = Math.min(y1, Math.max(a.y, b.y));
      if (hi < lo) continue;
      const xAt = y => (Math.abs(b.y - a.y) < 1e-12) ? null : a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
      const xa = xAt(lo), xb = xAt(hi);
      if (xa === null) ivs.push([Math.min(a.x, b.x), Math.max(a.x, b.x)]);
      else ivs.push([Math.min(xa, xb), Math.max(xa, xb)]);
    }
    // fusion
    ivs.sort((p, q) => p[0] - q[0]);
    const out = [];
    ivs.forEach(iv => {
      const last = out[out.length - 1];
      if (last && iv[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], iv[1]); else out.push([iv[0], iv[1]]);
    });
    return out;
  }

  function rotate180(poly, L, W) { return poly.map(p => ({ x: L - p.x, y: W - p.y })); }

  // profil d'un morceau : pour chaque bande k (0..nRows-1), ses intervalles
  function profile(poly, H, ROW) {
    const nRows = Math.ceil(H / ROW - 1e-9);
    const rows = [];
    for (let k = 0; k < nRows; k++) rows.push(slabIntervals(poly, k * ROW, Math.min(H, (k + 1) * ROW), 4));
    return rows;
  }

  // ---------- contrôle exact : deux polygones se recouvrent-ils ? ----------
  function segInter(p, q, r, s) {
    const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(d) < 1e-15) return false;
    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
    const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
    const e = 1e-7;
    return t > e && t < 1 - e && u > e && u < 1 - e;
  }
  function inside(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }
  // profondeur de recouvrement approximative (0 = aucun) — on teste les
  // croisements de bords et les sommets intérieurs (rétractés de 0,5 mm)
  function overlapping(P, Q) {
    for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++)
      if (segInter(P[i], P[(i + 1) % P.length], Q[j], Q[(j + 1) % Q.length])) return true;
    const cP = centroid(P), cQ = centroid(Q);
    const shrink = (p, c) => { const dx = c.x - p.x, dy = c.y - p.y, L = Math.hypot(dx, dy) || 1; return { x: p.x + dx / L * 5e-4, y: p.y + dy / L * 5e-4 }; };
    return P.some(p => inside(shrink(p, cP), Q)) || Q.some(q => inside(shrink(q, cQ), P));
  }
  function centroid(P) { let x = 0, y = 0; P.forEach(p => { x += p.x; y += p.y; }); return { x: x / P.length, y: y / P.length }; }

  // ---------- placement ----------
  function nest(items, U, opts) {
    opts = opts || {};
    const ROW = opts.row || 0.005;
    const nRowsU = Math.floor(U / ROW + 1e-9);
    const tries = opts.tries || 24;

    // pré-calcul des deux orientations
    const variants = items.map(it => {
      const v0 = it.poly;
      const v1 = rotate180(it.poly, it.L, it.W);
      return { it, rots: [{ rot: 0, poly: v0, prof: profile(v0, it.W, ROW) }, { rot: 180, poly: v1, prof: profile(v1, it.W, ROW) }] };
    });
    const fits = variants.filter(v => v.it.W <= U + 1e-9), tooWide = variants.filter(v => v.it.W > U + 1e-9);

    // intervalles occupés par bande : listes triées, fusionnées (donc fins croissantes)
    function firstEndAfter(oc, v){ // premier intervalle dont la fin dépasse v
      let lo = 0, hi = oc.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (oc[m][1] <= v) lo = m + 1; else hi = m; }
      return lo;
    }
    function insertMerge(oc, s0, e0){
      let i = firstEndAfter(oc, s0 - 1e-9);
      let s = s0, e = e0, j = i;
      while (j < oc.length && oc[j][0] <= e + 1e-9) { s = Math.min(s, oc[j][0]); e = Math.max(e, oc[j][1]); j++; }
      oc.splice(i, j - i, [s, e]);
    }
    function run(order, bestSoFar) {
      const occ = []; for (let k = 0; k < nRowsU; k++) occ.push([]);
      const placed = [];
      let length = 0;
      for (const v of order) {
        let best = null;
        for (const r of v.rots) {
          const hRows = r.prof.length;
          for (let y0 = 0; y0 + hRows <= nRowsU; y0++) {
            let x = 0, moved = true, guard = 0;
            while (moved && guard++ < 20000) {
              moved = false;
              for (let k = 0; k < hRows; k++) {
                const pr = r.prof[k], oc = occ[y0 + k];
                if (!oc.length) continue;
                for (const a of pr) {
                  const i = firstEndAfter(oc, x + a[0] + 1e-9);
                  if (i < oc.length && oc[i][0] < x + a[1] - 1e-9) { x = oc[i][1] - a[0]; moved = true; }
                }
              }
              if (best && x > best.x + 1e-9) break; // déjà moins bon
            }
            if (!best || x < best.x - 1e-9 || (Math.abs(x - best.x) < 1e-9 && y0 < best.y0)) best = { x, y0, r };
          }
        }
        const r = best.r;
        r.prof.forEach((pr, k) => { const oc = occ[best.y0 + k]; pr.forEach(a => insertMerge(oc, best.x + a[0], best.x + a[1])); });
        const poly = r.poly.map(p => ({ x: p.x + best.x, y: p.y + best.y0 * ROW }));
        length = Math.max(length, ...poly.map(q => q.x));
        if (bestSoFar && length > bestSoFar + 1e-9) return null; // abandon : déjà plus long que le meilleur
        placed.push({ name: v.it.name, rot: r.rot, x: best.x, y: best.y0 * ROW, poly, L: v.it.L, W: v.it.W, area: v.it.area });
      }
      return { placed, length };
    }

    // ordres essayés : heuristiques classiques + mélanges déterministes
    const orders = [];
    const by = f => fits.slice().sort(f);
    orders.push(by((a, b) => b.it.area - a.it.area));
    orders.push(by((a, b) => b.it.L - a.it.L));
    orders.push(by((a, b) => b.it.W - a.it.W));
    orders.push(by((a, b) => (b.it.W * b.it.L) - (a.it.W * a.it.L)));
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let t = orders.length; t < tries; t++) {
      const o = by((a, b) => b.it.area - a.it.area);
      // échanges aléatoires locaux autour de l'ordre par surface
      for (let k = 0; k < o.length; k++) { const j = Math.min(o.length - 1, k + Math.floor(rnd() * 4)); [o[k], o[j]] = [o[j], o[k]]; }
      orders.push(o);
    }
    let best = null;
    orders.forEach(o => { const r = run(o, best ? best.length : null); if (r && (!best || r.length < best.length - 1e-9)) best = r; });

    // contrôle exact final
    let overlaps = 0, outside = 0;
    const P = best.placed;
    for (let i = 0; i < P.length; i++) {
      if (P[i].poly.some(q => q.y < -1e-6 || q.y > U + 1e-6 || q.x < -1e-6)) outside++;
      for (let j = i + 1; j < P.length; j++) if (overlapping(P[i].poly, P[j].poly)) overlaps++;
    }
    const used = best.placed.reduce((s, p) => s + p.area, 0);
    return {
      placed: best.placed, length: best.length, U,
      utilisation: best.length > 0 ? used / (best.length * U) : 0,
      tooWide: tooWide.map(v => v.it.name),
      check: { overlaps, outside }
    };
  }

  const Nesting = { nest, slabIntervals, overlapping };
  if (typeof module !== 'undefined' && module.exports) module.exports = Nesting;
  else global.Nesting = Nesting;
})(typeof window !== 'undefined' ? window : globalThis);
