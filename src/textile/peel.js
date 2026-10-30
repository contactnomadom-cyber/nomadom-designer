
// ---------------------------------------------------------
// peel.js — Vue aplatie en « pelure d'orange » (logique pure, testable
// sous Node, inlinée dans acidome-cover-plus.html)
//
// Image : on pèle une orange depuis le haut. Le sommet reste au centre ;
// chaque étage (rangée de triangles) est fendu à un ou plusieurs endroits
// (les FENTES) ; chaque arc ainsi obtenu reste d'un seul tenant et pend sous
// l'étage du dessus, accroché par une seule arête (la CHARNIÈRE). À plat,
// le reste de chaque couture d'étage s'ouvre en éventail ; sur le dôme, il
// se referme.
//
// Types d'ouverture (choix de Nathan, 29/10) — fentes réparties de façon
// égale autour de l'axe (symétrie d'ordre 5 du dôme Pentad) :
//   one      : 1 fente (côté imposé par l'étage le plus contraint)
//   edges5   : 5 fentes dans l'axe des arêtes de l'icosaèdre d'origine
//   offset5  : 5 fentes décalées d'un demi-secteur (36°)
//   ten      : 10 fentes (les deux combinées)
//   spiral5  : 5 fentes tournant régulièrement d'un étage à l'autre
// Une fente passe toujours sur une arête montante, entre deux triangles.
// Si elle tombe au milieu d'un morceau, la découpe n'est PAS changée : le
// morceau est signalé « à casser », avec l'endroit de la coupe.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const TYPES = [
    { id: 'one', label: '1 fente', n: 1 },
    { id: 'edges5', label: '5 fentes — axe des arêtes d\'origine', n: 5 },
    { id: 'offset5', label: '5 fentes — décalées d\'un demi-secteur', n: 5 },
    { id: 'ten', label: '10 fentes — les deux combinées', n: 10 },
    { id: 'spiral5', label: '5 fentes en spirale', n: 5 },
    { id: 'gabarit5', label: '5 fentes — suivant les gabarits (zigzag)', n: 5 }
  ];
  const TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

  function context(dome, et, plan) {
    const ring = et.vertexRings();
    const P3 = id => dome.pointById.get(id);
    const azOf = ids => { let x = 0, z = 0; ids.forEach(id => { x += P3(id).x; z += P3(id).z; }); return Math.atan2(z, x); };
    // frontières d'un étage : entre order[i-1] et order[i] (arête montante commune)
    const bands = plan.map(b => {
      const order = b.band.order, n = order.length;
      const bounds = order.map((cur, i) => {
        const prev = order[(i - 1 + n) % n];
        const sh = dome.faces[cur].pointIds.filter(id => dome.faces[prev].pointIds.includes(id));
        return { i, az: azOf(sh.length === 2 ? sh : dome.faces[cur].pointIds), ids: sh };
      });
      const pieceStarts = new Set(b.pieces.map(pc => order.indexOf(pc.chain[0])));
      return { b, order, n, bounds, pieceStarts, level: b.band.level, closed: b.band.closed };
    });
    // θ0 : azimut des 5 sommets d'origine (icosaèdre) voisins du sommet du dôme
    const V = dome.params.detail;
    const ppt = dome.points.filter(p => p.pptPoint && ring.get(p._id) === V);
    let theta0 = ppt.length ? Math.atan2(ppt[0].z, ppt[0].x) : azOf(dome.faces[plan[0].band.order[0]].pointIds);
    // côté de la fente unique : frontière d'un morceau de l'étage le plus contraint
    let tight = null;
    bands.forEach(B => { if (B.b.cap || !B.closed) return; if (!tight || B.b.pieces.length <= tight.b.pieces.length) tight = B; });
    const oneAz = tight ? tight.bounds[[...tight.pieceStarts][0]].az : theta0 + Math.PI;
    return { ring, azOf, bands, theta0, oneAz, P3, faces: dome.faces };
  }

  // familles de fentes : azimut de base de chaque famille ; les autres fentes
  // d'une famille s'en déduisent par la symétrie d'ordre 5 (décalage de n/5)
  function families(type, ctx, levelIndex, nLevels) {
    const t0 = ctx.theta0;
    switch (type) {
      case 'edges5': return [t0];
      case 'offset5': return [t0 + 36 * DEG];
      case 'ten': return [t0, t0 + 36 * DEG];
      case 'spiral5': return [t0 + (levelIndex - 1) * 72 * DEG / Math.max(1, nLevels)];
    }
    return [];
  }
  const nearest = (B, a, onlyPieces) => {
    let best = 0, bd = Infinity;
    B.bounds.forEach(x => { if (onlyPieces && !B.pieceStarts.has(x.i)) return; const d = angDist(x.az, a); if (d < bd - 1e-9) { bd = d; best = x.i; } });
    return best;
  };

  // fentes de chaque étage (indices de frontière) ; le sommet garde une seule fente
  function slitsFor(type, ctx) {
    const nLevels = ctx.bands.length - 1;
    const res = [];
    let ok = true, reason = '', prevAz = ctx.theta0;
    ctx.bands.forEach((B, k) => {
      if (!B.closed) { res.push([0]); return; }
      if (type === 'one') { res.push([nearest(B, ctx.oneAz, true)]); return; }   // toujours entre deux morceaux
      if (type === 'gabarit5') { const g = gabaritSlits(ctx, B, k, prevAz); if (g.err) { ok = false; reason = g.err; } res.push(g.slits); prevAz = g.az; return; }
      const fam = families(type, ctx, Math.max(1, k), nLevels);
      if (k === 0) { res.push([nearest(B, fam[0], false)]); return; }
      if (B.n % 5) { ok = false; reason = 'étage ' + B.level + ' : ' + B.n + ' triangles, pas divisible par 5'; res.push([nearest(B, fam[0], false)]); return; }
      const step = B.n / 5;
      const trySet = fm => {
        const set = [];
        fm.forEach(a => { const b0 = nearest(B, a, false); for (let q = 0; q < 5; q++) set.push((b0 + q * step) % B.n); });
        const uniq = [...new Set(set)].sort((a, b) => a - b);
        if (uniq.length < set.length) return { err: 'étage ' + B.level + ' : ' + B.n + ' triangles, pas assez pour ' + set.length + ' fentes distinctes' };
        // chaque arc doit pouvoir pendre par une ARÊTE : il lui faut au moins un
        // triangle « pointe en bas » (deux nœuds sur l'anneau du dessus)
        for (let q = 0; q < uniq.length; q++) {
          const st = uniq[q], end = q + 1 < uniq.length ? uniq[q + 1] : uniq[0] + B.n;
          let hang = false;
          for (let t = st; t < end && !hang; t++) hang = dome_topEdge(ctx, B, B.order[t % B.n]);
          if (!hang) return { err: 'étage ' + B.level + ' : avec ' + uniq.length + ' fentes, un arc ne touche l\'étage du dessus que par une pointe' };
        }
        return { uniq };
      };
      let r = trySet(fam);
      // 10 fentes : là où l'étage ne le permet pas (étage 1 : seulement 5 triangles
      // accrochés au pentagone du sommet), on garde 5 fentes
      if (r.err && fam.length > 1) { const r5 = trySet([fam[0]]); if (!r5.err) r = r5; }
      if (r.err) { ok = false; reason = r.err; res.push([nearest(B, fam[0], false)]); return; }
      const uniq = r.uniq;
      res.push(uniq);
    });
    return { slits: res, ok, reason };
  }

  // « suivant les gabarits » : les fentes tombent sur les jonctions entre
  // morceaux de la découpe (jamais dans un morceau). Si l'étage est fait de
  // 5 secteurs identiques, on prend la même jonction dans chaque secteur
  // (symétrie d'ordre 5) ; parmi les jonctions possibles, celle qui suit au
  // plus près la fente de l'étage du dessus (zigzag continu). Un anneau
  // d'un seul tenant garde une seule fente, à sa couture de fermeture.
  function gabaritSlits(ctx, B, k, prevAz) {
    const starts = [...B.pieceStarts];
    if (k === 0) { const i = nearest(B, prevAz, true); return { slits: [i], az: B.bounds[i].az }; }
    if (starts.length === 1) return { slits: starts, az: prevAz };
    const step = B.n / 5;
    const periodic = B.n % 5 === 0 && starts.length % 5 === 0 && starts.every(s => B.pieceStarts.has((s + step) % B.n));
    if (!periodic) return { slits: [nearest(B, prevAz, true)], az: prevAz, err: 'étage ' + B.level + ' : les morceaux ne forment pas 5 secteurs identiques (choisir la découpe « Moins de gabarits »)' };
    const cands = starts.slice().sort((a, b) => angDist(B.bounds[a].az, prevAz) - angDist(B.bounds[b].az, prevAz));
    let err = '';
    for (const b0 of cands) {
      const uniq = [0, 1, 2, 3, 4].map(q => (b0 + q * step) % B.n).sort((a, b) => a - b);
      let hangAll = true;
      for (let q = 0; q < 5 && hangAll; q++) {
        const st = uniq[q], end = q + 1 < 5 ? uniq[q + 1] : uniq[0] + B.n;
        let hang = false;
        for (let t = st; t < end && !hang; t++) hang = dome_topEdge(ctx, B, B.order[t % B.n]);
        hangAll = hang;
      }
      if (hangAll) return { slits: uniq, az: B.bounds[b0].az };
      err = 'étage ' + B.level + ' : un arc ne touche l\'étage du dessus que par une pointe';
    }
    return { slits: [cands[0]], az: prevAz, err };
  }

  function dome_topEdge(ctx, B, faceIdx) {
    return ctx.faces[faceIdx].pointIds.filter(id => ctx.ring.get(id) === B.level).length === 2;
  }
  function availableTypes(dome, et, plan) {
    const ctx = context(dome, et, plan);
    return TYPES.map(t => { const r = slitsFor(t.id, ctx); return { id: t.id, label: t.label, ok: r.ok, reason: r.reason }; });
  }

  // deux triangles posés au même endroit d'un nœud commun sont voisins (pas de test)
  const same = (A, B) => A.pointIds.some((id, i) => { const j = B.pointIds.indexOf(id); return j >= 0 && Math.hypot(A.pts[i].x - B.pts[j].x, A.pts[i].y - B.pts[j].y) < 1e-6; });
  const axesOf = pts => [[0, 1], [1, 2], [2, 0]].map(([i, j]) => { const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y, L = Math.hypot(dx, dy) || 1; return { x: -dy / L, y: dx / L }; });
  const proj = (pts, ax) => { let mn = Infinity, mx = -Infinity; pts.forEach(p => { const v = p.x * ax.x + p.y * ax.y; if (v < mn) mn = v; if (v > mx) mx = v; }); return [mn, mx]; };
  // profondeur de recouvrement de deux triangles (séparation des axes), 0 si disjoints
  function triOverlap(A, B) {
    let depth = Infinity;
    for (const ax of axesOf(A.pts).concat(axesOf(B.pts))) { const [a0, a1] = proj(A.pts, ax), [b0, b1] = proj(B.pts, ax); const d = Math.min(a1, b1) - Math.max(a0, b0); if (d <= 1e-6) return 0; depth = Math.min(depth, d); }
    return depth;
  }

  function rigid(a0, a1, b0, b1) {
    const ang = Math.atan2(b1.y - b0.y, b1.x - b0.x) - Math.atan2(a1.y - a0.y, a1.x - a0.x), c = Math.cos(ang), s = Math.sin(ang);
    return p => ({ x: b0.x + c * (p.x - a0.x) - s * (p.y - a0.y), y: b0.y + s * (p.x - a0.x) + c * (p.y - a0.y) });
  }

  // sheetOf(name) -> fiche patron avec marges (toile.applyAllowances)
  function build(dome, et, plan, sheetOf, type) {
    const ctx = context(dome, et, plan);
    let sl = slitsFor(type, ctx);
    if (!sl.ok) { type = 'one'; sl = slitsFor('one', ctx); }
    const ring = ctx.ring;

    // 1) arcs : chaque étage coupé à ses fentes, chaque arc déplié d'un seul tenant
    const arcs = [];
    ctx.bands.forEach((B, k) => {
      const s = sl.slits[k];
      s.forEach((start, j) => {
        const end = j + 1 < s.length ? s[j + 1] : s[0] + B.n;
        const chain = []; for (let i = start; i < end; i++) chain.push(B.order[i % B.n]);
        const pl = et.unfoldChain(chain).map(p => ({ idx: p.idx, pointIds: p.pointIds, pts: p.pts.map(q => ({ x: q.x, y: q.y })) }));
        arcs.push({ k, level: B.level, j, chain, pl });
      });
    });
    const apply = (arc, f) => arc.pl.forEach(p => { p.pts = p.pts.map(f); });

    // 2) charnières : chaque arc pend sous l'étage du dessus par une arête
    //    d'étage. Par défaut, celle la plus proche de son milieu (rang 0).
    //    Si un arc de l'étage chevauche alors un arc déjà posé, on essaie le
    //    rang suivant (arête suivante en s'éloignant du milieu) POUR TOUS les
    //    arcs de l'étage à la fois : des arcs identiques gardent ainsi la même
    //    charnière et la pelure reste symétrique. On garde le premier rang
    //    sans chevauchement (à défaut, le moins chevauchant).
    const hinges = [];
    const placedTri = new Map(); // idx -> placement déjà posé
    const placedList = [];
    arcs.filter(a => a.k === 0).forEach(a => a.pl.forEach(p => { placedTri.set(p.idx, p); placedList.push(p); }));
    const third = (tri, a, b) => tri.pts[tri.pointIds.findIndex(id => id !== a && id !== b)];
    const hingeMove = c => {
      const { t, tp, u, v } = c;
      const a0 = { ...t.pts[t.pointIds.indexOf(u)] }, a1 = { ...t.pts[t.pointIds.indexOf(v)] };
      const b0 = tp.pts[tp.pointIds.indexOf(u)], b1 = tp.pts[tp.pointIds.indexOf(v)];
      let f = rigid(a0, a1, b0, b1);
      const side = q => (b1.x - b0.x) * (q.y - b0.y) - (b1.y - b0.y) * (q.x - b0.x);
      if (side(f(third(t, u, v))) * side(third(tp, u, v)) > 0) {
        const dx = b1.x - b0.x, dy = b1.y - b0.y, L2 = dx * dx + dy * dy, g = f;
        f = q => { const r = g(q), tt = ((r.x - b0.x) * dx + (r.y - b0.y) * dy) / L2, fx = b0.x + tt * dx, fy = b0.y + tt * dy; return { x: 2 * fx - r.x, y: 2 * fy - r.y }; };
      }
      return { f, b0, b1 };
    };
    for (let k = 1; k < ctx.bands.length; k++) {
      const lv = ctx.bands[k].level;
      const level = arcs.filter(a => a.k === k).map(arc => {
        const cands = [];
        const mid = (arc.pl.length - 1) / 2;
        arc.pl.forEach((t, i) => {
          const top = t.pointIds.filter(id => ring.get(id) === lv);
          if (top.length !== 2) return;
          let tp = null;
          placedTri.forEach(q => { if (!tp && top.every(id => q.pointIds.includes(id)) && q.idx !== t.idx) tp = q; });
          if (!tp) return;
          cands.push({ d: Math.abs(i - mid), i, t, tp, u: top[0], v: top[1] });
        });
        cands.sort((a, b) => a.d - b.d || a.i - b.i);
        return { arc, cands };
      }).filter(x => x.cands.length);
      const ranks = Math.max(0, ...level.map(x => x.cands.length));
      let best = null;
      for (let r = 0; r < ranks; r++) {
        const moves = level.map(x => { const c = x.cands[Math.min(r, x.cands.length - 1)], m = hingeMove(c); return { x, c, m, pl: x.arc.pl.map(p => ({ idx: p.idx, pointIds: p.pointIds, pts: p.pts.map(m.f) })) }; });
        let ov = 0;
        const others = placedList.slice();
        moves.forEach(mv => { for (const A of mv.pl) for (const B of others) { if (same(A, B)) continue; ov = Math.max(ov, triOverlap(A, B)); } mv.pl.forEach(p => others.push(p)); });
        if (!best || ov < best.ov - 1e-9) best = { ov, moves };
        if (ov <= 1e-9) break;
      }
      if (best) best.moves.forEach(mv => {
        apply(mv.x.arc, mv.m.f);
        mv.x.arc.pl.forEach(p => placedList.push(p));
        hinges.push({ level: lv, arc: mv.x.arc, u: mv.c.u, v: mv.c.v, A: { ...mv.m.b0 }, B: { ...mv.m.b1 } });
      });
      arcs.filter(a => a.k === k).forEach(a => a.pl.forEach(p => placedTri.set(p.idx, p)));
    }

    // 3) orientation : sommet en haut / premier pétale vers le bas ; vu de l'extérieur
    const allPts = () => arcs.flatMap(a => a.pl.flatMap(p => p.pts));
    const cen = pts => ({ x: pts.reduce((s, q) => s + q.x, 0) / pts.length, y: pts.reduce((s, q) => s + q.y, 0) / pts.length });
    const tf = f => { arcs.forEach(a => apply(a, f)); hinges.forEach(h => { h.A = f(h.A); h.B = f(h.B); }); };
    let from, to;
    if (type === 'one') {
      const mid = h => ({ x: (h.A.x + h.B.x) / 2, y: (h.A.y + h.B.y) / 2 });
      from = hinges.length > 1 ? mid(hinges[0]) : cen(arcs[0].pl.flatMap(p => p.pts));
      to = hinges.length ? mid(hinges[hinges.length - 1]) : cen(allPts());
    } else {
      // centre = sommet du dôme ; premier pétale (fentes 0 et 1 du dernier étage) vers le bas
      const top = arcs[0].pl[0], k = top.pointIds.indexOf(dome.upperPointId);
      from = k >= 0 ? { ...top.pts[k] } : cen(arcs[0].pl.flatMap(p => p.pts));
      const last = arcs.filter(a => a.k === ctx.bands.length - 1);
      to = cen(last[0].pl.flatMap(p => p.pts));
    }
    const rot = -Math.PI / 2 - Math.atan2(to.y - from.y, to.x - from.x), cr = Math.cos(rot), sr = Math.sin(rot);
    tf(q => ({ x: cr * q.x - sr * q.y, y: sr * q.x + cr * q.y }));
    const cross = t => (t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[1].y - t[0].y) * (t[2].x - t[0].x);
    const triPos = new Map(); arcs.forEach(a => a.pl.forEach(p => triPos.set(p.idx, p)));
    const sh0 = sheetOf(plan[0].pieces[0].name), st0 = sh0.triangles[0];
    if (cross(st0.pts) * cross(triPos.get(st0.idx).pts) < 0) tf(q => ({ x: -q.x, y: q.y }));

    // 4) morceaux : entiers (rotation + translation de la fiche) ou à casser
    const pieces = [], broken = [];
    let maxFit = 0;
    ctx.bands.forEach((B, k) => {
      const slitSet = new Set(sl.slits[k]);
      B.b.pieces.forEach(pc => {
        const cuts = [];
        for (let t = 0; t + 1 < pc.chain.length; t++) {
          const i = B.order.indexOf(pc.chain[t + 1]);
          if (slitSet.has(i)) cuts.push(t);
        }
        const sh = sheetOf(pc.name);
        if (!cuts.length) {
          const t = sh.triangles[0], lp = triPos.get(t.idx);
          const T = rigid(t.pts[0], t.pts[1], lp.pts[0], lp.pts[1]);
          const e = Math.hypot(T(t.pts[2]).x - lp.pts[2].x, T(t.pts[2]).y - lp.pts[2].y);
          maxFit = Math.max(maxFit, e);
          pieces.push({ pc, sh, T, level: B.level });
        } else {
          // parties (triangles posés) + lignes de coupe des deux côtés de chaque fente
          const parts = []; let cur = [];
          pc.chain.forEach((idx, t) => { cur.push(triPos.get(idx)); if (cuts.includes(t)) { parts.push(cur); cur = []; } });
          parts.push(cur);
          const cutLines = cuts.map(t => {
            const a = triPos.get(pc.chain[t]), b = triPos.get(pc.chain[t + 1]);
            const ids = a.pointIds.filter(id => b.pointIds.includes(id));
            const seg = p => ({ A: p.pts[p.pointIds.indexOf(ids[0])], B: p.pts[p.pointIds.indexOf(ids[1])] });
            const P = ctx.P3(ids[0]), Q = ctx.P3(ids[1]);
            return { sides: [seg(a), seg(b)], length: Math.hypot(P.x - Q.x, P.y - Q.y, P.z - Q.z), ids };
          });
          broken.push({ pc, sh, level: B.level, parts, cutLines });
        }
      });
    });

    // 5) contrôle : deux triangles posés ne se recouvrent pas (sauf voisins qui
    //    se touchent au même endroit)
    const tris = arcs.flatMap(a => a.pl);
    let overlap = 0;
    for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length; j++) {
      const A = tris[i], B = tris[j];
      if (same(A, B)) continue;
      let depth = Infinity;
      for (const ax of axesOf(A.pts).concat(axesOf(B.pts))) { const [a0, a1] = proj(A.pts, ax), [b0, b1] = proj(B.pts, ax); const d = Math.min(a1, b1) - Math.max(a0, b0); if (d <= 1e-6) { depth = 0; break; } depth = Math.min(depth, d); }
      overlap = Math.max(overlap, depth);
    }
    const xs = [], ys = [];
    pieces.forEach(p => p.sh.cut.forEach(q => { const v = p.T(q); xs.push(v.x); ys.push(v.y); }));
    tris.forEach(t => t.pts.forEach(v => { xs.push(v.x); ys.push(v.y); }));
    return {
      type, requested: sl.ok, arcs, hinges, pieces, broken, overlap, maxFit,
      slitsPerBand: sl.slits.map(s => s.length),
      minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys)
    };
  }

  const Peel = { TYPES, availableTypes, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = Peel;
  else global.Peel = Peel;
})(typeof window !== 'undefined' ? window : globalThis);
