// ---------------------------------------------------------
// door.js — Porte posée d'aplomb dans une ouverture fermée par le sol
// (mission NOMAD-2026-005, étape 1). Logique pure, sans DOM, testée sous Node
// (tests/node/door.test.js). Unités : mètres et m² ; hauteurs depuis le sol.
//
// Image : on pose un dormant de porte vertical contre le trou du dôme, comme
// une porte dans un mur épais. Le mur, ici, c'est la peau du dôme qui penche :
//  - le PLAN D'APLOMB est vertical et passe par le seuil (les deux nœuds de
//    base où le contour de l'ouverture touche le sol) ;
//  - la PORTE est un rectangle debout dans ce plan (largeur × hauteur) ;
//  - le CONTOUR de l'ouverture (montants du cadre + seuil) est ramené
//    horizontalement sur ce plan : c'est la place disponible ;
//  - la FERMETURE = ce qui reste du contour autour de la porte : tympan au-dessus
//    du linteau, remplissages sur les côtés ; les POTELETS montent à l'aplomb des
//    montants de porte, du linteau jusqu'au cadre du dôme ;
//  - l'ÉBRASEMENT = l'écart horizontal entre le plan de la porte et chaque nœud
//    du contour (l'épaisseur de « mur » à habiller).
// Statut : géométrie 🟡 calculée. La tenue de la structure autour de l'ouverture
// (montants retirés, renforts) n'est PAS évaluée ici.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const EPS = 1e-9;
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

  // aire signée d'un polygone 2D [{s, t}]
  function area2(poly) { let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p.s * q.t - q.s * p.t; }); return a / 2; }
  // point dans un polygone (règle pair-impair)
  function inside(poly, p) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.t > p.t) !== (b.t > p.t) && p.s < (b.s - a.s) * (p.t - a.t) / (b.t - a.t) + a.s) c = !c;
    }
    return c;
  }
  // polygone coupé par le demi-plan t >= h (above) ou t <= h (!above) — Sutherland-Hodgman
  function clipT(poly, h, above) {
    const keep = p => (above ? p.t >= h - EPS : p.t <= h + EPS), out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length], kp = keep(p), kq = keep(q);
      if (kp) out.push(p);
      if (kp !== kq) { const k = (h - p.t) / (q.t - p.t); out.push({ s: p.s + k * (q.s - p.s), t: h }); }
    });
    return out;
  }
  // plus haut point du contour sur la verticale s (au-dessus de tMin) : { t, d } (d = profondeur interpolée), ou null
  function topAt(poly, s, tMin) {
    let best = null;
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      if ((p.s - s) * (q.s - s) > 0 || Math.abs(q.s - p.s) < EPS) return;
      const t = p.t + (s - p.s) / (q.s - p.s) * (q.t - p.t);
      if (t > tMin + EPS && (best === null || t > best.t)) best = { t, d: p.d === undefined ? 0 : p.d + (s - p.s) / (q.s - p.s) * (q.d - p.d) };
    });
    return best;
  }

  // Contour fermé d'une ouverture fermée par le sol : nœuds dans l'ordre (cadre + seuil).
  // struts = Ouvertures.strutIndex(dome) ; opening = un élément de Ouvertures.analyse(...).openings.
  function contourLoop(struts, opening) {
    const keys = opening.frame.concat(opening.seuil), adj = new Map();
    keys.forEach(k => { const [a, b] = k.split('-').map(Number); [[a, b], [b, a]].forEach(([u, v]) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push(v); }); });
    if ([...adj.values()].some(l => l.length !== 2)) return null;   // contour non simple (nœud touché 4 fois…)
    const start = adj.keys().next().value, loop = [start];
    let prev = null, cur = start;
    for (;;) {
      const nx = adj.get(cur).find(v => v !== prev);
      if (nx === start || nx === undefined) break;
      loop.push(nx); prev = cur; cur = nx;
      if (loop.length > keys.length) return null;
    }
    return loop.length === keys.length ? loop : null;
  }

  // Plan d'aplomb : vertical, passant par les deux extrémités du seuil, normale vers l'extérieur du dôme.
  function plumbPlane(dome, struts, opening) {
    const deg = new Map();
    opening.seuil.forEach(k => k.split('-').map(Number).forEach(id => deg.set(id, (deg.get(id) || 0) + 1)));
    const ends = [...deg].filter(([, d]) => d === 1).map(([id]) => id);
    if (ends.length !== 2) return null;
    const yBase = Math.min(...dome.points.map(p => p.y));
    let L = dome.pointById.get(ends[0]), R = dome.pointById.get(ends[1]);
    let u = { x: R.x - L.x, y: 0, z: R.z - L.z }; const ul = Math.hypot(u.x, u.z); u = { x: u.x / ul, y: 0, z: u.z / ul };
    let n = { x: u.z, y: 0, z: -u.x };   // horizontale, perpendiculaire au seuil
    const mid = { x: (L.x + R.x) / 2, z: (L.z + R.z) / 2 };
    if (n.x * mid.x + n.z * mid.z < 0) n = { x: -n.x, y: 0, z: -n.z };
    // repère vu de l'extérieur : s croît de gauche à droite pour quelqu'un face à la porte, dehors
    if (u.x * n.z - u.z * n.x > 0) { const t = L; L = R; R = t; u = { x: -u.x, y: 0, z: -u.z }; }
    return { L, R, u, n, yBase, width: ul };
  }
  const proj = (P, pl) => { const d = sub(P, pl.L); return { s: d.x * pl.u.x + d.z * pl.u.z, t: P.y - pl.yBase, depth: d.x * pl.n.x + d.z * pl.n.z }; };

  // La porte tient-elle dans le contour projeté ? (bord bas posé sur le sol)
  function fits(poly, s0, w, h) {
    if (w <= EPS || h <= EPS) return false;
    const step = 0.005, pts = [];
    for (let k = 0; k <= Math.ceil(h / step); k++) { const t = Math.max(1e-6, Math.min(h, k * step)); pts.push({ s: s0 + 1e-6, t }, { s: s0 + w - 1e-6, t }); }
    for (let k = 0; k <= Math.ceil(w / step); k++) pts.push({ s: Math.min(s0 + w - 1e-6, Math.max(s0 + 1e-6, s0 + k * step)), t: h });
    if (!pts.every(p => inside(poly, p))) return false;
    return !poly.some(p => p.s > s0 + 1e-6 && p.s < s0 + w - 1e-6 && p.t > 1e-6 && p.t < h - 1e-6);   // aucun nœud du cadre dans la porte
  }
  function maxBy(test, hi) { if (!test(1e-3)) return 0; let lo = 1e-3; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (test(m)) lo = m; else hi = m; } return lo; }

  // Calcul complet. door = { width, height, offset, setback } (m) :
  //  offset = décalage du milieu de la porte depuis le milieu du seuil (vers la droite, vu de dehors) ;
  //  setback = recul du plan de porte vers l'intérieur du dôme (0 = au droit du seuil ; > 0 = sas intérieur).
  function compute(dome, struts, opening, door) {
    if (!opening || !opening.closedByGround) return { ok: false, error: 'pas une ouverture fermée par le sol : une porte se pose sur un contour qui finit au bord bas' };
    const pl = plumbPlane(dome, struts, opening);
    if (!pl) return { ok: false, error: 'seuil non continu : le contour doit toucher le sol en une seule fois' };
    const loop = contourLoop(struts, opening);
    if (!loop) return { ok: false, error: 'contour non simple : impossible de le ramener sur le plan de la porte' };
    const back = door.setback || 0;
    const nodes = loop.map(id => { const q = proj(dome.pointById.get(id), pl); return { id, s: q.s, t: q.t, depth: q.depth + back }; });
    let poly = nodes.map(p => ({ s: p.s, t: p.t, d: p.depth }));
    if (area2(poly) < 0) poly = poly.slice().reverse();
    const w = door.width, h = door.height, s0 = pl.width / 2 + (door.offset || 0) - w / 2;
    const tTop = Math.max(...poly.map(p => p.t));
    const fit = fits(poly, s0, w, h);
    const aO = Math.abs(area2(poly)), above = clipT(poly, h, true), tymp = above.length > 2 ? Math.abs(area2(above)) : 0;
    // potelet à l'abscisse s : montée verticale du linteau jusqu'à la hauteur du cadre, puis retour horizontal
    // (depth) jusqu'au montant du dôme (< 0 : le cadre est derrière la porte, côté intérieur)
    const post = s => { const q = topAt(poly, s, h); return q === null ? null : { s, rise: q.t - h, depth: q.d }; };
    const res = {
      ok: true, fits: fit, status: fit ? 'calculé' : 'refusé',
      plane: { width: pl.width, normal: pl.n, along: pl.u, origin: pl.L, yBase: pl.yBase },
      door: { s0, width: w, height: h, setback: back },
      contour: poly, nodes,
      heights: { contourTop: tTop },
      max: { heightForWidth: maxBy(x => fits(poly, s0, w, x), tTop), widthForHeight: maxBy(x => fits(poly, pl.width / 2 + (door.offset || 0) - x / 2, x, h), pl.width) },
      // pièces de menuiserie (longueurs d'axe, m)
      parts: {
        jambs: [h, h], lintel: w, sill: w,
        posts: [post(s0), post(s0 + w / 2), post(s0 + w)]   // potelets : montant gauche, milieu, montant droit (null = pas de cadre au-dessus)
      },
      // fermeture dans le plan de la porte (m²)
      infill: { contour: aO, door: w * h, tympan: tymp, sides: Math.max(0, aO - tymp - w * h), total: Math.max(0, aO - w * h) },
      // ébrasement : écart horizontal plan de porte -> nœuds du contour (m, positif = vers l'extérieur)
      reveal: { max: Math.max(...nodes.map(p => p.depth)), min: Math.min(...nodes.map(p => p.depth)) }
    };
    return res;
  }

  const Door = { compute, contourLoop, plumbPlane, fits, inside, clipT, area2, topAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = Door;
  else global.Door = Door;
})(typeof window !== 'undefined' ? window : globalThis);
