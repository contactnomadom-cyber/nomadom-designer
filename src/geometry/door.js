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
      if (kp !== kq) { const k = (h - p.t) / (q.t - p.t), c = { s: p.s + k * (q.s - p.s), t: h }; if (p.d !== undefined) c.d = p.d + k * (q.d - p.d); out.push(c); }
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

  // Structure 3D qui porte la porte (aperçu 🟠, axes des pièces, section affichée sec = { w, d } en m).
  // Entrée : résultat de compute() quand la porte passe. Points { x, y, z } : y = hauteur depuis le sol.
  //  - huisserie : 2 montants, seuil, linteau (plan de la porte) ;
  //  - chevêtre : poutre horizontale posée sur le linteau (axe à h + sec.d), d'un bord du contour à l'autre,
  //    avec ses 2 appuis (retours horizontaux jusqu'aux montants du dôme) ;
  //  - potelets : du chevêtre jusqu'au bord haut de la fermeture, à l'aplomb des montants de porte et au milieu ;
  //  - rampants : bord haut de la fermeture, dans le plan de la porte (le contour du dôme ramené sur ce plan) ;
  //  - chevrons : retours horizontaux, du rampant jusqu'au cadre du dôme (à chaque nœud et en tête de potelet) ;
  //  - toit : surface entre les rampants et le cadre du dôme (le dessus de l'avant-corps).
  // Chaque retour finit sur un montant du cadre (nœud, ou point du montant interpolé).
  function structure(r, sec) {
    if (!r || !r.ok || !r.fits) return null;
    sec = sec || { w: 0.045, d: 0.07 };
    const { s0, width: w, height: h, setback: sb } = r.door, L = r.plane.origin, u = r.plane.along, n = r.plane.normal;
    const P = (s, t, d) => ({ x: L.x + u.x * s + n.x * ((d || 0) - sb), y: t, z: L.z + u.z * s + n.z * ((d || 0) - sb) });
    const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const pieces = [], roof = [], MIN = 0.005;
    const add = (kind, a, b, up) => { const l = len(a, b); if (l > MIN) pieces.push({ kind, a, b, length: l, up }); };
    const V = { x: 0, y: 1, z: 0 };   // section posée « à plat » sur les retours : 70 mm vertical
    // huisserie
    add('huisserie', P(s0, 0), P(s0, h), n); add('huisserie', P(s0 + w, 0), P(s0 + w, h), n);
    add('huisserie', P(s0, 0), P(s0 + w, 0), n); add('huisserie', P(s0, h), P(s0 + w, h), n);
    // bord haut de la fermeture, au-dessus du chevêtre : chaîne gauche → droite
    const hc = h + sec.d, cl = clipT(r.contour, hc, true);
    let chain = null;
    const flat = cl.map((p, i) => [i, cl[(i + 1) % cl.length]]).filter(([i, q]) => Math.abs(cl[i].t - hc) < 1e-7 && Math.abs(q.t - hc) < 1e-7 && q.s > cl[i].s);
    if (cl.length > 2 && flat.length === 1) {
      const i = flat[0][0], k = (i + 1) % cl.length; chain = [];
      for (let j = 0; j < cl.length; j++) chain.push(cl[(k + j) % cl.length]);   // droite → haut → gauche
      chain.reverse();
    }
    if (chain) {
      const a = chain[0], b = chain[chain.length - 1];
      add('chevetre', P(a.s, hc), P(b.s, hc), n);
      add('appui', P(a.s, hc), P(a.s, hc, a.d), V); add('appui', P(b.s, hc), P(b.s, hc, b.d), V);
      for (let j = 0; j + 1 < chain.length; j++) {
        const p = chain[j], q = chain[j + 1];
        add('rampant', P(p.s, p.t), P(q.s, q.t), n);
        roof.push([P(p.s, p.t), P(q.s, q.t), P(q.s, q.t, q.d), P(p.s, p.t, p.d)]);
        if (j > 0) add('chevron', P(p.s, p.t), P(p.s, p.t, p.d), V);
      }
      [s0, s0 + w / 2, s0 + w].forEach(s => {
        const tp = topAt(r.contour, s, hc); if (!tp) return;
        add('potelet', P(s, hc), P(s, tp.t), n);
        if (!chain.some(p => Math.abs(p.s - s) < MIN)) add('chevron', P(s, tp.t), P(s, tp.t, tp.d), V);   // pas de doublon sous un nœud
      });
    }
    const totals = {}; pieces.forEach(p => { const t = totals[p.kind] || (totals[p.kind] = { count: 0, length: 0 }); t.count++; t.length += p.length; });
    let roofArea = 0; roof.forEach(q => { [[0, 1, 2], [0, 2, 3]].forEach(([i, j, k]) => { const A = q[i], B = q[j], C = q[k];
      const e = [B.x - A.x, B.y - A.y, B.z - A.z], f = [C.x - A.x, C.y - A.y, C.z - A.z];
      roofArea += Math.hypot(e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]) / 2; }); });
    return { section: sec, pieces, roof, totals, roofArea, closed: !!chain };
  }

  const Door = { compute, structure, contourLoop, plumbPlane, fits, inside, clipT, area2, topAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = Door;
  else global.Door = Door;
})(typeof window !== 'undefined' ? window : globalThis);
