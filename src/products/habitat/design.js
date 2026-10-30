
// ---------------------------------------------------------
// design.js — Onglet « Design » : aménagement intérieur (logique pure,
// testable sous Node, inlinée dans acidome-cover-plus.html)
//
// Image : on regarde le dôme d'en haut comme une planche d'architecte ;
// le sol est un polygone (la base), on y pose des meubles à l'échelle.
// Une mezzanine est un plancher à une hauteur donnée, coupé par la paroi.
//
// Géométrie exacte sur les FACETTES du dôme (pas sur une sphère idéale) :
//  - contour à une hauteur h = coupe horizontale de toutes les faces ;
//  - hauteur sous plafond en un point = hauteur de la facette au-dessus ;
//  - la zone où l'on a au moins H de hauteur = la coupe à (sol + H),
//    projetée au sol (le dôme est convexe).
// Repère du plan : x, z horizontaux (m), origine sur l'axe du dôme ;
// y vertical (m), sol = 0.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // ---------------- géométrie de base ----------------
  function area(poly) { let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p.x * q.z - q.x * p.z; }); return Math.abs(a) / 2; }
  function pointIn(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.z > pt.z) !== (b.z > pt.z) && pt.x < (b.x - a.x) * (pt.z - a.z) / (b.z - a.z) + a.x) c = !c;
    }
    return c;
  }
  // découpe d'un polygone par un demi-plan { p : n·p >= c }
  function clipHalf(poly, n, c) {
    const out = [], inside = p => n.x * p.x + n.z * p.z >= c - 1e-12;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], ia = inside(A), ib = inside(B);
      if (ia) out.push(A);
      if (ia !== ib) {
        const da = n.x * A.x + n.z * A.z - c, db = n.x * B.x + n.z * B.z - c, t = da / (da - db);
        out.push({ x: A.x + t * (B.x - A.x), z: A.z + t * (B.z - A.z) });
      }
    }
    return out;
  }
  // intersection de deux polygones convexes (Sutherland–Hodgman)
  function clipConvex(subject, clip) {
    let out = subject.slice();
    const s = area2(clip) > 0 ? 1 : -1;
    for (let i = 0; i < clip.length && out.length; i++) {
      const A = clip[i], B = clip[(i + 1) % clip.length];
      const n = { x: -(B.z - A.z) * s, z: (B.x - A.x) * s };
      out = clipHalf(out, n, n.x * A.x + n.z * A.z);
    }
    return out;
  }
  function area2(poly) { let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p.x * q.z - q.x * p.z; }); return a; }

  // ---------------- le dôme vu par l'aménagement ----------------
  function domeModel(dome) {
    const ys = dome.points.map(p => p.y), yBase = Math.min(...ys), yTop = Math.max(...ys);
    const tri = f => f.pointIds.map(id => { const p = dome.pointById.get(id); return { x: p.x, y: p.y - yBase, z: p.z }; });
    // tris = enveloppe pleine (hauteurs, sections) ; skinTris = toile réelle (sans les ouvertures)
    const tris = (dome.allFaces || dome.faces).map(tri), skinTris = dome.allFaces ? dome.faces.map(tri) : tris;
    // arêtes du bas (bord) : polygone du sol
    const sel = new Set(); dome.lines.forEach(l => { if (l.selvage) l.pointIds.forEach(id => sel.add(id)); });
    const base = [...sel].map(id => dome.pointById.get(id)).map(p => ({ x: p.x, z: p.z, id: p._id }))
      .sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
    const lines = dome.lines.map(l => l.pointIds.map(id => { const p = dome.pointById.get(id); return { x: p.x, y: p.y - yBase, z: p.z }; }));
    return { tris, skinTris, base, lines, height: yTop - yBase, radius: Math.max(...dome.points.map(p => Math.hypot(p.x, p.z))) };
  }

  // coupe horizontale à la hauteur h : polygone convexe (ou null au-dessus du sommet)
  function section(model, h) {
    if (h <= 1e-9) return model.base.map(p => ({ x: p.x, z: p.z }));
    if (h >= model.height - 1e-9) return null;
    const pts = [];
    model.tris.forEach(t => {
      for (let i = 0; i < 3; i++) {
        const a = t[i], b = t[(i + 1) % 3];
        if ((a.y - h) * (b.y - h) < 0) { const u = (h - a.y) / (b.y - a.y); pts.push({ x: a.x + u * (b.x - a.x), z: a.z + u * (b.z - a.z) }); }
        else if (Math.abs(a.y - h) < 1e-12) pts.push({ x: a.x, z: a.z });
      }
    });
    if (pts.length < 3) return null;
    pts.sort((p, q) => Math.atan2(p.z, p.x) - Math.atan2(q.z, q.x));
    return pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p.x - q.x, p.z - q.z) > 1e-7; });
  }

  // hauteur de la paroi au-dessus du point (x, z) du sol (null si hors du dôme)
  function ceilingAt(model, x, z) {
    let best = null;
    model.tris.forEach(t => {
      const [A, B, C] = t;
      const d = (B.z - C.z) * (A.x - C.x) + (C.x - B.x) * (A.z - C.z);
      if (Math.abs(d) < 1e-14) return;
      const l1 = ((B.z - C.z) * (x - C.x) + (C.x - B.x) * (z - C.z)) / d;
      const l2 = ((C.z - A.z) * (x - C.x) + (A.x - C.x) * (z - C.z)) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) return;
      const y = l1 * A.y + l2 * B.y + l3 * C.y;
      if (best === null || y > best) best = y;
    });
    return best;
  }

  // ---------------- mezzanine ----------------
  // mezz = { on, h (hauteur du dessus du plancher), thick, shape: 'demi'|'secteur'|'droit',
  //          depth (m depuis la paroi), angle (°, secteur), width (m, droit), orient (°) }
  function mezzPolygon(model, mezz) {
    if (!mezz || !mezz.on) return null;
    const sec = section(model, mezz.h);
    if (!sec) return null;
    const o = (mezz.orient || 0) * Math.PI / 180, u = { x: Math.cos(o), z: Math.sin(o) }, v = { x: -u.z, z: u.x };
    const rWall = Math.max(...sec.map(p => p.x * u.x + p.z * u.z));
    let poly = sec;
    if (mezz.shape === 'secteur') {
      const a = Math.max(10, Math.min(350, mezz.angle || 120)) * Math.PI / 360, R = 100, fan = [{ x: 0, z: 0 }];
      for (let k = 0; k <= 24; k++) { const t = o - a + 2 * a * k / 24; fan.push({ x: R * Math.cos(t), z: R * Math.sin(t) }); }
      // secteur > 180° non convexe : on le découpe en deux moitiés convexes
      if (a > Math.PI / 2) {
        const h1 = [{ x: 0, z: 0 }], h2 = [{ x: 0, z: 0 }];
        for (let k = 0; k <= 12; k++) { const t = o - a + a * k / 12; h1.push({ x: R * Math.cos(t), z: R * Math.sin(t) }); }
        for (let k = 0; k <= 12; k++) { const t = o + a * k / 12; h2.push({ x: R * Math.cos(t), z: R * Math.sin(t) }); }
        const p1 = clipConvex(sec, h1), p2 = clipConvex(sec, h2);
        poly = mergeFans(p1, p2);
      } else poly = clipConvex(sec, fan);
      if (mezz.depth) poly = clipRing(poly, sec, mezz.depth);
    } else {
      poly = clipHalf(sec, u, rWall - (mezz.depth || 2));
      if (mezz.shape === 'droit') {
        const w = (mezz.width || 3) / 2;
        poly = clipHalf(poly, v, -w); poly = clipHalf(poly, { x: -v.x, z: -v.z }, -w);
      }
    }
    return poly.length >= 3 ? poly : null;
  }
  function mergeFans(p1, p2) { // deux polygones convexes accolés par le centre -> contour
    const all = p1.concat(p2), c = { x: 0, z: 0 };
    all.forEach(p => { c.x += p.x / all.length; c.z += p.z / all.length; });
    const uniq = [];
    all.forEach(p => { if (!uniq.some(q => Math.hypot(p.x - q.x, p.z - q.z) < 1e-6)) uniq.push(p); });
    return uniq.sort((a, b) => Math.atan2(a.z - c.z, a.x - c.x) - Math.atan2(b.z - c.z, b.x - c.x));
  }
  function clipRing(poly) { return poly; }

  // ---------------- bibliothèque d'éléments ----------------
  // dimensions en m : w = largeur, d = profondeur, h = hauteur ; shape 'rect' | 'circle'
  const LIBRARY = [
    { type: 'lit1', cat: 'Couchage et séjour', label: 'Lit 1 place', w: 0.9, d: 1.9, h: 0.5, color: [120, 160, 210] },
    { type: 'lit2', cat: 'Couchage et séjour', label: 'Lit 2 places', w: 1.4, d: 1.9, h: 0.5, color: [100, 140, 200] },
    { type: 'lit2xl', cat: 'Couchage et séjour', label: 'Lit 160 × 200', w: 1.6, d: 2.0, h: 0.5, color: [90, 130, 195] },
    { type: 'canape', cat: 'Couchage et séjour', label: 'Canapé', w: 2.0, d: 0.9, h: 0.85, color: [190, 140, 100] },
    { type: 'tableR', cat: 'Couchage et séjour', label: 'Table ronde', w: 1.0, d: 1.0, h: 0.75, shape: 'circle', color: [170, 130, 90] },
    { type: 'table', cat: 'Couchage et séjour', label: 'Table', w: 1.4, d: 0.8, h: 0.75, color: [170, 130, 90] },
    { type: 'chaise', cat: 'Couchage et séjour', label: 'Chaise', w: 0.45, d: 0.45, h: 0.9, color: [150, 115, 80] },
    { type: 'poele', cat: 'Couchage et séjour', label: 'Poêle à bois', w: 0.5, d: 0.5, h: 1.0, color: [70, 70, 70], clearance: 0.4 },
    { type: 'plan', cat: 'Cuisine et sanitaires', label: 'Plan de travail', w: 1.8, d: 0.6, h: 0.9, color: [200, 200, 190] },
    { type: 'evier', cat: 'Cuisine et sanitaires', label: 'Évier', w: 0.8, d: 0.6, h: 0.9, color: [180, 200, 210] },
    { type: 'frigo', cat: 'Cuisine et sanitaires', label: 'Frigo', w: 0.6, d: 0.65, h: 1.5, color: [225, 230, 235] },
    { type: 'cuisson', cat: 'Cuisine et sanitaires', label: 'Cuisson', w: 0.6, d: 0.6, h: 0.9, color: [150, 150, 150] },
    { type: 'douche', cat: 'Cuisine et sanitaires', label: 'Douche', w: 0.9, d: 0.9, h: 2.0, color: [160, 205, 225] },
    { type: 'wc', cat: 'Cuisine et sanitaires', label: 'WC sec', w: 0.5, d: 0.7, h: 0.8, color: [215, 205, 180] },
    { type: 'lavabo', cat: 'Cuisine et sanitaires', label: 'Lavabo', w: 0.5, d: 0.4, h: 0.85, color: [200, 220, 230] },
    { type: 'escalier', cat: 'Accès', label: 'Escalier', w: 0.8, d: 2.6, h: 2.2, color: [160, 140, 110] },
    { type: 'echelle', cat: 'Accès', label: 'Échelle de meunier', w: 0.6, d: 1.0, h: 2.2, color: [160, 140, 110] },
    { type: 'rect', cat: 'Formes libres', label: 'Rectangle libre', w: 1.0, d: 0.6, h: 0.9, color: [190, 190, 190] },
    { type: 'rond', cat: 'Formes libres', label: 'Cercle libre', w: 1.0, d: 1.0, h: 0.9, shape: 'circle', color: [190, 190, 190] }
  ];
  const OPENINGS = [
    { type: 'porte', label: 'Porte', w: 0.9, h: 2.0, sill: 0 },
    { type: 'fenetre', label: 'Fenêtre', w: 0.6, h: 0.6, sill: 0.9 },
    { type: 'baie', label: 'Baie vitrée', w: 1.6, h: 2.0, sill: 0 }
  ];
  const libOf = t => LIBRARY.find(l => l.type === t) || LIBRARY[LIBRARY.length - 2];

  // contour d'un élément (coins, ou polygone à 24 côtés pour un cercle), repère du plan
  function itemPolygon(it) {
    const L = libOf(it.type), a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const tf = (x, y) => ({ x: it.x + c * x - s * y, z: it.z + s * x + c * y });
    if ((it.shape || L.shape) === 'circle') { const out = []; for (let k = 0; k < 24; k++) { const t = k * Math.PI / 12; out.push(tf(it.w / 2 * Math.cos(t), it.d / 2 * Math.sin(t))); } return out; }
    return [tf(-it.w / 2, -it.d / 2), tf(it.w / 2, -it.d / 2), tf(it.w / 2, it.d / 2), tf(-it.w / 2, it.d / 2)];
  }

  // symbole d'architecte, dans le repère de l'élément (origine au centre,
  // x = largeur, y = profondeur, y négatif = côté « dos » / mur).
  // Primitives : rect (contour principal), poly {pts, open, fill, thin, dash}, line, ellipse.
  function rr(x, y, w, h, r) { // rectangle arrondi -> polygone
    r = Math.max(0, Math.min(r, w / 2, h / 2)); const pts = [], k = 6;
    const corner = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + i / k * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
    return pts;
  }
  function symbolOps(it) {
    const w = it.w, d = it.d, W = w / 2, D = d / 2, ops = [];
    const R = (x, y, ww, hh, f) => ops.push({ t: 'rect', x, y, w: ww, h: hh, fill: f });
    const PL = (pts, o) => ops.push(Object.assign({ t: 'poly', pts }, o || {}));
    const RR = (x, y, ww, hh, r, o) => PL(rr(x, y, ww, hh, r), o);
    const C = (cx, cy, r, o) => ops.push(Object.assign({ t: 'ellipse', cx, cy, rx: r, ry: r }, o || {}));
    const E = (cx, cy, rx, ry, o) => ops.push(Object.assign({ t: 'ellipse', cx, cy, rx, ry }, o || {}));
    const Ln = (x1, y1, x2, y2, o) => ops.push(Object.assign({ t: 'line', x1, y1, x2, y2 }, o || {}));
    const L = libOf(it.type), circ = (it.shape || L.shape) === 'circle';
    if (it.type === 'echelle') { // échelle : pas de contour plein
      Ln(-W, -D, -W, D); Ln(W, -D, W, D); const n = Math.max(3, Math.round(d / 0.25)); for (let k = 0; k <= n; k++) Ln(-W, -D + k * d / n, W, -D + k * d / n, { thin: true });
      Ln(0, D - 0.05, 0, -D + 0.1, { thin: true }); Ln(0, -D + 0.1, -0.07, -D + 0.22, { thin: true }); Ln(0, -D + 0.1, 0.07, -D + 0.22, { thin: true });
      return ops;
    }
    if (circ) E(0, 0, W, D); else R(-W, -D, w, d, true);
    switch (it.type) {
      case 'lit1': case 'lit2': case 'lit2xl': {
        RR(-W + 0.03, -D + 0.06, w - 0.06, d - 0.09, 0.04, { thin: true });                 // matelas
        const np = w > 1.1 ? 2 : 1, pw = (w - 0.16) / np - 0.04;
        for (let i = 0; i < np; i++) RR(-W + 0.1 + i * (pw + 0.04), -D + 0.12, pw, 0.32, 0.06, { fill: true });   // oreillers
        RR(-W + 0.01, -D + 0.55, w - 0.02, d - 0.57, 0.03, { fill: true });               // couette
        Ln(-W + 0.01, -D + 0.72, W - 0.01, -D + 0.72, { thin: true });                     // revers
        PL([[W - 0.01, D - 0.45], [W - 0.01, D - 0.02], [W - 0.45, D - 0.02]], { fill: true, thin: true });         // coin replié
        Ln(W - 0.01, D - 0.45, W - 0.45, D - 0.02, { thin: true });
        Ln(-W, -D + 0.04, W, -D + 0.04);                                                    // tête de lit
        break; }
      case 'canape': {
        RR(-W, -D, w, 0.2, 0.05, { fill: true });                                          // dossier
        RR(-W, -D, 0.18, d, 0.05, { fill: true }); RR(W - 0.18, -D, 0.18, d, 0.05, { fill: true }); // accoudoirs
        const n = w > 1.6 ? 2 : 1, cw = (w - 0.36) / n;
        for (let i = 0; i < n; i++) RR(-W + 0.18 + i * cw + 0.01, -D + 0.21, cw - 0.02, d - 0.24, 0.05, { thin: true });
        break; }
      case 'table': RR(-W + 0.03, -D + 0.03, w - 0.06, d - 0.06, 0.02, { thin: true, dash: [3, 2] }); break;
      case 'tableR': E(0, 0, W - 0.03, D - 0.03, { thin: true, dash: [3, 2] }); C(0, 0, 0.05, { thin: true }); break;
      case 'chaise': RR(-W + 0.02, -D + 0.08, w - 0.04, d - 0.1, 0.03, { thin: true }); RR(-W, -D, w, 0.07, 0.02, { fill: true }); break;
      case 'poele': {
        RR(-W - 0.3, -D - 0.1, w + 0.6, d + 0.5, 0.08, { thin: true, dash: [4, 3], nofill: true }); // distance de sécurité
        RR(-W + 0.05, -D + 0.05, w - 0.1, d - 0.12, 0.03, { thin: true });
        C(0, -D + 0.16, 0.085); C(0, -D + 0.16, 0.06, { thin: true });                     // conduit
        RR(-W * 0.6, D - 0.14, W * 1.2, 0.08, 0.02, { fill: true, thin: true });            // porte vitrée
        break; }
      case 'plan': Ln(-W, -D + 0.03, W, -D + 0.03, { thin: true }); Ln(-W, D - 0.03, W, D - 0.03, { thin: true, dash: [4, 3] }); break;
      case 'evier': RR(-W + 0.1, -D + 0.08, w - 0.2, d - 0.18, 0.06, { thin: true }); RR(-W + 0.14, -D + 0.12, w - 0.28, d - 0.26, 0.05, { thin: true }); C(0, 0.02, 0.025, { thin: true });
        Ln(0, -D + 0.03, 0, -D + 0.12); C(0, -D + 0.03, 0.02, { thin: true }); break;
      case 'cuisson': [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { const r = Math.min(W, D) * (i * j > 0 ? 0.36 : 0.28); C(i * W / 2, j * D / 2, r, { thin: true }); C(i * W / 2, j * D / 2, r * 0.55, { thin: true }); }); break;
      case 'frigo': R(-W + 0.03, -D + 0.03, w - 0.06, d - 0.08); Ln(-W + 0.03, -D + 0.03, W - 0.03, D - 0.05, { thin: true }); Ln(W - 0.03, -D + 0.03, -W + 0.03, D - 0.05, { thin: true }); break;
      case 'douche': RR(-W + 0.04, -D + 0.04, w - 0.08, d - 0.08, 0.04, { thin: true }); Ln(-W + 0.04, -D + 0.04, W - 0.04, D - 0.04, { thin: true }); Ln(W - 0.04, -D + 0.04, -W + 0.04, D - 0.04, { thin: true }); C(0, 0, 0.035, { fill: true }); break;
      case 'wc': RR(-W + 0.03, -D, w - 0.06, 0.2, 0.03, { fill: true }); E(0, 0.08, W * 0.72, D * 0.55); E(0, 0.1, W * 0.48, D * 0.36, { thin: true }); break;
      case 'lavabo': E(0, 0.03, W * 0.82, D * 0.72, { thin: true }); E(0, 0.05, W * 0.6, D * 0.5, { thin: true }); C(0, 0.06, 0.018, { thin: true }); Ln(0, -D + 0.02, 0, -D + 0.1); break;
      case 'escalier': {
        const n = Math.max(3, Math.round(d / 0.25)); for (let k = 1; k < n; k++) Ln(-W, -D + k * d / n, W, -D + k * d / n, { thin: true });
        Ln(0, D - 0.08, 0, -D + 0.18, { thin: true }); PL([[0, -D + 0.08], [-0.07, -D + 0.22], [0.07, -D + 0.22]], { fill: true, thin: true }); // ligne de foulée + flèche (montée)
        Ln(-W, 0.15, W, -0.15, { thin: true }); Ln(-W, 0.2, W, -0.1, { thin: true });       // ligne de coupe (escalier coupé au niveau du plan)
        break; }
      case 'rect': case 'rond': break;
    }
    return ops;
  }

  // ---------------- contrôles de place ----------------
  // niveau 0 = sol, 1 = mezzanine. Renvoie la liste des problèmes (texte).
  function checkItem(model, state, it) {
    const issues = [];
    const mezzPoly = mezzPolygon(model, state.mezz);
    const lvl = it.level || 0;
    if (lvl === 1 && !mezzPoly) return ['pas de mezzanine'];
    const floorY = lvl === 1 ? state.mezz.h : 0;
    const outline = lvl === 1 ? mezzPoly : section(model, 0);
    const poly = itemPolygon(it);
    if (poly.some(p => !pointIn(p, outline))) issues.push(lvl === 1 ? 'déborde de la mezzanine' : 'touche la paroi');
    // hauteur disponible au-dessus de chaque coin
    let minHead = Infinity;
    const isAccess = it.type === 'escalier' || it.type === 'echelle';
    poly.concat([{ x: it.x, z: it.z }]).forEach(p => {
      let ceil = ceilingAt(model, p.x, p.z);
      if (ceil === null) return;
      if (lvl === 0 && mezzPoly && pointIn(p, mezzPoly) && !isAccess) ceil = Math.min(ceil, state.mezz.h - (state.mezz.thick || 0.15));
      minHead = Math.min(minHead, ceil - floorY);
    });
    if (!isAccess && minHead < it.h - 1e-9) issues.push('trop haut ici : ' + Math.round(it.h * 100) + ' cm pour ' + Math.round(minHead * 100) + ' cm sous plafond');
    return issues;
  }

  function stats(model, state) {
    const ground = section(model, 0), s100 = section(model, 1.0), s180 = section(model, 1.8);
    const mp = mezzPolygon(model, state.mezz);
    const res = { ground: area(ground), sit: s100 ? area(s100) : 0, stand: s180 ? area(s180) : 0, height: model.height,
                  diameter: 2 * Math.max(...ground.map(p => Math.hypot(p.x, p.z))), mezz: mp ? area(mp) : 0, mezzStand: 0, mezzSit: 0 };
    if (mp) {
      const a = section(model, state.mezz.h + 1.8), b = section(model, state.mezz.h + 1.0);
      res.mezzStand = a ? area(clipConvex(mp, a)) : 0; res.mezzSit = b ? area(clipConvex(mp, b)) : 0;
    }
    // volume intérieur (tranches de 2 cm)
    let vol = 0; const dh = 0.02;
    for (let h = dh / 2; h < model.height; h += dh) { const sct = section(model, h); if (sct) vol += area(sct) * dh; }
    res.volume = vol;
    return res;
  }

  function newItem(type, x, z, level) {
    const L = libOf(type);
    return { id: 'i' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), type, name: L.label, x: x || 0, z: z || 0, rot: 0, w: L.w, d: L.d, h: L.h, level: level || 0 };
  }
  function defaultState() {
    return { version: 1, items: [], openings: [], mezz: { on: false, h: 2.2, thick: 0.15, shape: 'demi', depth: 2.0, angle: 140, width: 3.0, orient: 90 }, style: 'nb' };
  }

  const Design = { domeModel, section, ceilingAt, mezzPolygon, clipConvex, clipHalf, area, pointIn, LIBRARY, OPENINGS, libOf, itemPolygon, symbolOps, checkItem, stats, newItem, defaultState };
  if (typeof module !== 'undefined' && module.exports) module.exports = Design;
  else global.Design = Design;
})(typeof window !== 'undefined' ? window : globalThis);
