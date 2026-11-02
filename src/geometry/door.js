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

  // Structure 3D qui porte la porte (aperçu 🟠 : axes des pièces, section sec = { w, d } en m, w = côté « à plat »).
  // Entrée : résultat de compute() quand la porte passe. Points { x, y, z } : y = hauteur depuis le sol.
  // opts (choix constructifs, tous facultatifs) :
  //  support : 'poteaux' (défaut : poteaux d'angle sous le chevêtre + lisses basses jusqu'au seuil du dôme)
  //          | 'parois' (poteaux + parois latérales : traverses et panneaux jusqu'au cadre)
  //          | 'porte-a-faux' (rien sous les bouts du chevêtre — déconseillé)
  //  attachAppui / attachChevron : 'montant' (défaut : retour horizontal, posé sur le montant du dôme)
  //          | 'noeud' (appui → contrefiche jusqu'au nœud le plus proche ; chevrons des potelets supprimés)
  //  joints : { famille de raccord → id d'assemblage } (voir joinery.js) ; recopié sur chaque raccord.
  // Pièces : huisserie (montants, seuil, linteau), chevêtre posé SUR le linteau, appuis ou contrefiches,
  //  potelets, rampants (bord haut, plan de porte), chevrons (jusqu'au cadre), poteaux, lisses, traverses.
  // Raccords : chaque bout de pièce est classé (sol, nœud du dôme, montant du dôme, autre pièce : angle, T,
  //  oblique, pose). Un bout qui ne touche rien est « volant » ; une pièce qui ne rejoint ni le sol ni le dôme
  //  par une chaîne de raccords est « non portée ». La structure est complète quand il n'y a ni l'un ni l'autre.
  const SUPPORTS = ['poteaux', 'parois', 'porte-a-faux'], ATTACH = ['montant', 'noeud'];
  function structure(r, sec, opts) {
    if (!r || !r.ok || !r.fits) return null;
    sec = sec || { w: 0.045, d: 0.07 }; opts = opts || {};
    const support = SUPPORTS.includes(opts.support) ? opts.support : 'poteaux';
    const attA = ATTACH.includes(opts.attachAppui) ? opts.attachAppui : 'montant', attC = ATTACH.includes(opts.attachChevron) ? opts.attachChevron : 'montant';
    const { s0, width: w, height: h, setback: sb } = r.door, L = r.plane.origin, u = r.plane.along, n = r.plane.normal;
    const P = (s, t, d) => ({ x: L.x + u.x * s + n.x * ((d || 0) - sb), y: t, z: L.z + u.z * s + n.z * ((d || 0) - sb) });
    const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const pieces = [], panels = [], MIN = 0.005;
    const add = (kind, a, b, up) => { const l = dist(a, b); if (l > MIN) pieces.push({ kind, a, b, length: l, up }); };
    const V = { x: 0, y: 1, z: 0 };   // pièces de retour : posées « de chant », 70 mm à la verticale
    // huisserie (axes : montants et linteau se croisent aux angles, le linteau a 45 mm de haut)
    add('huisserie', P(s0, 0), P(s0, h), n); add('huisserie', P(s0 + w, 0), P(s0 + w, h), n);
    add('huisserie', P(s0, 0), P(s0 + w, 0), n); add('huisserie', P(s0, h), P(s0 + w, h), n);
    // chevêtre posé sur le linteau : axe à h + sec.w (les deux faces se touchent)
    const hc = h + sec.w, cl = clipT(r.contour, hc, true);
    let chain = null;
    const flat = cl.map((p, i) => [i, cl[(i + 1) % cl.length]]).filter(([i, q]) => Math.abs(cl[i].t - hc) < 1e-7 && Math.abs(q.t - hc) < 1e-7 && q.s > cl[i].s);
    if (cl.length > 2 && flat.length === 1) {
      const i = flat[0][0], k = (i + 1) % cl.length; chain = [];
      for (let j = 0; j < cl.length; j++) chain.push(cl[(k + j) % cl.length]);   // droite → haut → gauche
      chain.reverse();
    }
    // nœuds du cadre en 3D, et montants du cadre (contour sans le seuil)
    const node3 = r.nodes.map(p => ({ id: p.id, s: p.s, t: p.t, d: p.depth, p: P(p.s, p.t, p.depth) }));
    const loop = r.nodes, struts = [];
    loop.forEach((p, i) => { const q = loop[(i + 1) % loop.length]; if (p.t < 1e-7 && q.t < 1e-7) return; struts.push([P(p.s, p.t, p.depth), P(q.s, q.t, q.depth)]); });
    const ground = node3.filter(p => p.t < 1e-7).sort((a, b) => a.s - b.s);
    // point du cadre à la hauteur t, côté gauche ou droit (null si aucun)
    const sideAt = (t, left) => {
      const xs = [];
      loop.forEach((p, i) => { const q = loop[(i + 1) % loop.length]; if ((p.t - t) * (q.t - t) > 0 || Math.abs(q.t - p.t) < 1e-9) return;
        const k = (t - p.t) / (q.t - p.t); xs.push({ s: p.s + k * (q.s - p.s), d: p.depth + k * (q.depth - p.depth) }); });
      if (!xs.length) return null; xs.sort((a, b) => a.s - b.s); return left ? xs[0] : xs[xs.length - 1];
    };
    let warnings = [];
    if (chain) {
      const a = chain[0], b = chain[chain.length - 1];
      add('chevetre', P(a.s, hc), P(b.s, hc), n);
      // appuis : retour horizontal sur le montant, ou contrefiche jusqu'au nœud le plus proche
      [a, b].forEach((e, side) => {
        if (attA === 'montant') { add('appui', P(e.s, hc), P(e.s, hc, e.d), V); return; }
        const cand = node3.filter(p => p.t > 1e-7 && (side === 0 ? p.s <= (a.s + b.s) / 2 : p.s >= (a.s + b.s) / 2));
        const tgt = cand.sort((x, y) => dist(x.p, P(e.s, hc)) - dist(y.p, P(e.s, hc)))[0];
        if (tgt) add('contrefiche', P(e.s, hc), tgt.p, n);
      });
      for (let j = 0; j + 1 < chain.length; j++) {
        const p = chain[j], q = chain[j + 1];
        add('rampant', P(p.s, p.t), P(q.s, q.t), n);
        panels.push({ kind: 'toit', pts: [P(p.s, p.t), P(q.s, q.t), P(q.s, q.t, q.d), P(p.s, p.t, p.d)] });
        if (j > 0) add('chevron', P(p.s, p.t), P(p.s, p.t, p.d), V);
      }
      [s0, s0 + w / 2, s0 + w].forEach(s => {
        const tp = topAt(r.contour, s, hc); if (!tp) return;
        add('potelet', P(s, hc), P(s, tp.t), n);
        if (attC === 'montant' && !chain.some(p => Math.abs(p.s - s) < MIN)) add('chevron', P(s, tp.t), P(s, tp.t, tp.d), V);   // pas de doublon sous un nœud
      });
      // dessous des bouts du chevêtre : poteaux d'angle et lisses basses jusqu'au seuil du dôme
      if (support !== 'porte-a-faux') {
        [[a.s, s0, ground[0]], [b.s, s0 + w, ground[ground.length - 1]]].forEach(([sp, sj, g]) => {
          if (Math.abs(sp - sj) < 0.05) return;   // le bout du chevêtre tombe sur un montant de porte
          add('poteau', P(sp, 0), P(sp, hc), n);
          if (g) add('lisse', P(sp, 0), g.p, n);
          if (support === 'parois') {
            const left = sp < sj, lev = [hc / 3, 2 * hc / 3];
            lev.forEach(t => { add('traverse', P(sp, t), P(sj, t), n); const f = sideAt(t, left); if (f) add('traverse', P(sp, t), P(f.s, t, f.d), V); });
            panels.push({ kind: 'facade', pts: [P(sp, 0), P(sj, 0), P(sj, hc), P(sp, hc)] });
            const hs = [0].concat(lev, [hc]), fr = hs.map(t => t < 1e-7 ? (g ? { s: g.s, d: g.d } : null) : sideAt(t, left));
            for (let k = 0; k + 1 < hs.length; k++) if (fr[k] && fr[k + 1])
              panels.push({ kind: 'paroi', pts: [P(sp, hs[k]), P(sp, hs[k + 1]), P(fr[k + 1].s, hs[k + 1], fr[k + 1].d), P(fr[k].s, hs[k], fr[k].d)] });
          }
        });
      } else warnings.push('Porte-à-faux : les bouts du chevêtre et le toit ne tiennent que par les appuis sur le dôme. Déconseillé — pas de document de fabrication.');
    } else warnings.push('Bord haut de l\'ouverture trop découpé : seule l\'huisserie est dessinée.');

    // ---- raccords ----
    const segDist = (p, a, b) => { const ab = [b.x - a.x, b.y - a.y, b.z - a.z], ap = [p.x - a.x, p.y - a.y, p.z - a.z], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const k = L2 < 1e-12 ? 0 : Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / L2));
      return { d: Math.hypot(ap[0] - k * ab[0], ap[1] - k * ab[1], ap[2] - k * ab[2]), k }; };
    const dir = p => { const v = [p.b.x - p.a.x, p.b.y - p.a.y, p.b.z - p.a.z], l = Math.hypot(...v); return v.map(x => x / l); };
    const cosAng = (p, q) => { const a = dir(p), b = dir(q); return Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]); };
    const TOL = 1e-6, joints = opts.joints || {}, connections = [], floating = [];
    const link = new Map(pieces.map((_, i) => [i, new Set()])), anchored = new Set();
    const pushC = (family, at, list, extra) => connections.push(Object.assign({ family, at, pieces: list, joint: joints[family] || null }, extra || {}));
    // 1) regrouper les bouts de pièces par point (un raccord = un endroit où des pièces se rencontrent)
    const clusters = [];
    pieces.forEach((p, i) => [p.a, p.b].forEach((E, end) => {
      let c = clusters.find(c => dist(c.at, E) < TOL); if (!c) { c = { at: E, ends: [] }; clusters.push(c); }
      c.ends.push({ i, end });
    }));
    clusters.forEach(c => {
      const E = c.at, ids = [...new Set(c.ends.map(e => e.i))];
      // pièces qui passent par ce point sans y finir (assemblage en T)
      const through = pieces.map((q, j) => j).filter(j => !ids.includes(j) && (() => { const sd = segDist(E, pieces[j].a, pieces[j].b); return sd.d < TOL && sd.k > 1e-6 && sd.k < 1 - 1e-6; })());
      const all = ids.concat(through);
      all.forEach(a => all.forEach(b => { if (a !== b) link.get(a).add(b); }));
      const nd = node3.find(q => dist(q.p, E) < TOL), st = !nd && struts.find(([a, b]) => segDist(E, a, b).d < TOL), gr = !nd && E.y < TOL;
      if (nd || st || gr) all.forEach(k => anchored.add(k));
      if (nd) pushC('dome-noeud', E, all, { node: nd.id });
      else if (st) { const v = [st[1].x - st[0].x, st[1].y - st[0].y, st[1].z - st[0].z], l = Math.hypot(...v); pushC('dome-montant', E, all, { strutDir: v.map(x => x / l) }); }
      else if (gr) pushC('sol', E, all);
      if (all.length >= 2) {
        let fam;
        if (through.length) fam = through.some(j => ids.some(i => cosAng(pieces[i], pieces[j]) < 0.17)) ? 'T' : 'oblique';
        else fam = ids.some(i => ids.some(j => i !== j && cosAng(pieces[i], pieces[j]) < 0.17)) ? 'angle' : 'oblique';
        if (!(nd || st)) pushC(fam, E, all);   // sur le dôme, l'assemblage au dôme fait aussi la liaison entre pièces
      }
      if (!nd && !st && !gr && all.length < 2) c.ends.forEach(e => floating.push({ piece: e.i, kind: pieces[e.i].kind, end: e.end, at: E }));
    });
    // 2) contacts « posé sur » : pièces parallèles, côte à côte (distance d'axe = une section) et qui se recouvrent
    pieces.forEach((p, i) => pieces.forEach((q, j) => { if (j <= i || cosAng(p, q) < 0.999) return;
      const e = dir(p), proj = X => (X.x - p.a.x) * e[0] + (X.y - p.a.y) * e[1] + (X.z - p.a.z) * e[2];
      const lo = Math.max(0, Math.min(proj(q.a), proj(q.b))), hi = Math.min(p.length, Math.max(proj(q.a), proj(q.b)));
      if (hi - lo < MIN) return;
      const m = proj(q.a), Q = { x: p.a.x + e[0] * m, y: p.a.y + e[1] * m, z: p.a.z + e[2] * m }, ld = dist(Q, q.a);
      if (Math.abs(ld - sec.w) < 1e-6) { link.get(i).add(j); link.get(j).add(i);
        const mid = (lo + hi) / 2; pushC('pose', { x: p.a.x + e[0] * mid, y: p.a.y + e[1] * mid, z: p.a.z + e[2] * mid }, [i, j]); }
    }));
    // moises : deux joues de 300 mm, parallèles au montant du dôme, de part et d'autre (rayon du montant 22 mm)
    const extras = [];
    connections.filter(c => c.family === 'dome-montant' && c.joint === 'moise').forEach(c => {
      const sd = c.strutDir, pd = dir(pieces[c.pieces[0]]);
      let k = [sd[1] * pd[2] - sd[2] * pd[1], sd[2] * pd[0] - sd[0] * pd[2], sd[0] * pd[1] - sd[1] * pd[0]]; const kl = Math.hypot(...k); if (kl < 1e-9) return; k = k.map(x => x / kl);
      const off = Math.max(0.022, sec.d / 2) + 0.011;   // de part et d'autre du plus épais des deux, moise de 22 mm
      [-1, 1].forEach(sg => { const C = { x: c.at.x + k[0] * off * sg, y: c.at.y + k[1] * off * sg, z: c.at.z + k[2] * off * sg };
        extras.push({ kind: 'moise', a: { x: C.x - sd[0] * 0.15, y: C.y - sd[1] * 0.15, z: C.z - sd[2] * 0.15 }, b: { x: C.x + sd[0] * 0.15, y: C.y + sd[1] * 0.15, z: C.z + sd[2] * 0.15 }, length: 0.3, up: { x: k[0], y: k[1], z: k[2] } }); });
    });
    const reach = new Set(anchored), stack = [...anchored];
    while (stack.length) { const i = stack.pop(); link.get(i).forEach(j => { if (!reach.has(j)) { reach.add(j); stack.push(j); } }); }
    const unsupported = pieces.map((p, i) => i).filter(i => !reach.has(i));

    const totals = {}; pieces.forEach(p => { const t = totals[p.kind] || (totals[p.kind] = { count: 0, length: 0 }); t.count++; t.length += p.length; });
    const area4 = q => { let A = 0; [[0, 1, 2], [0, 2, 3]].forEach(([i, j, k]) => { const a = q[i], b = q[j], c = q[k];
      const e = [b.x - a.x, b.y - a.y, b.z - a.z], f = [c.x - a.x, c.y - a.y, c.z - a.z];
      A += Math.hypot(e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]) / 2; }); return A; };
    const areas = {}; panels.forEach(pn => { areas[pn.kind] = (areas[pn.kind] || 0) + area4(pn.pts); });
    const byFamily = {}; connections.forEach(c => { byFamily[c.family] = (byFamily[c.family] || 0) + 1; });
    return { section: sec, support, attachAppui: attA, attachChevron: attC, pieces, panels, roof: panels.filter(p => p.kind === 'toit').map(p => p.pts),
      roofArea: areas.toit || 0, areas, totals, connections, extras, byFamily, floating, unsupported,
      complete: !!chain && !floating.length && !unsupported.length, closed: !!chain, warnings,
      advised: support !== 'porte-a-faux' };
  }

  const Door = { SUPPORTS, ATTACH, compute, structure, contourLoop, plumbPlane, fits, inside, clipT, area2, topAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = Door;
  else global.Door = Door;
})(typeof window !== 'undefined' ? window : globalThis);
