
// ---------------------------------------------------------
// Mode « Étages » — logique pure (testable sous Node, recopiée
// telle quelle dans acidome-cover-plus.html)
// ---------------------------------------------------------
function makeEtages(dome){
  const dist3 = (a,b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);

  // 1) anneaux de nœuds : distance (en arêtes) depuis le sommet du dôme
  function vertexRings(){
    const nb = new Map(dome.points.map(p => [p._id, new Set()]));
    dome.lines.forEach(l => { nb.get(l.pointIds[0]).add(l.pointIds[1]); nb.get(l.pointIds[1]).add(l.pointIds[0]); });
    const ring = new Map([[dome.upperPointId, 0]]);
    let fr = [dome.upperPointId];
    while (fr.length) {
      const next = [];
      fr.forEach(id => nb.get(id).forEach(j => { if (!ring.has(j)) { ring.set(j, ring.get(id) + 1); next.push(j); } }));
      fr = next;
    }
    return ring;
  }

  // 2) étages : un triangle appartient à l'étage k s'il relie l'anneau k à
  //    l'anneau k+1 (dents de scie). Ordre cyclique : deux triangles voisins
  //    dans l'étage partagent une arête « montante » (anneau k -> k+1).
  function buildBands(){
    const ring = vertexRings();
    const byBand = new Map();
    dome.faces.forEach(f => {
      const rs = f.pointIds.map(id => ring.get(id));
      const b = Math.min(...rs);
      if (!byBand.has(b)) byBand.set(b, []);
      byBand.get(b).push(f.index);
    });
    const bands = [];
    [...byBand.keys()].sort((a,b)=>a-b).forEach(k => {
      const set = new Set(byBand.get(k));
      const adj = new Map();
      set.forEach(idx => adj.set(idx, (dome.faceAdjacency[idx]||[]).filter(a => set.has(a.neighbor))));
      // parcours de l'anneau de triangles. En symétrie Pentad, chaque étage est un
      // anneau simple. En Triad / Cross, un étage peut être ouvert ou se ramifier :
      // on le découpe alors en plusieurs chaînes, qui gardent le même niveau.
      const seen = new Set();
      const free = idx => adj.get(idx).filter(a => !seen.has(a.neighbor)).length;
      let first = true;
      while (seen.size < set.size) {
        const rest = [...set].filter(i => !seen.has(i));
        const ends = rest.filter(i => free(i) <= 1);
        const start = ends.length ? Math.min(...ends) : Math.min(...rest);
        const order = [start]; seen.add(start);
        let cur = start;
        while (true) {
          const nxt = adj.get(cur).find(a => !seen.has(a.neighbor));
          if (!nxt) break;
          order.push(nxt.neighbor); seen.add(nxt.neighbor); cur = nxt.neighbor;
        }
        const closed = first && order.length === set.size && adj.get(cur).some(a => a.neighbor === start) && set.size > 2;
        bands.push({ level: k, order, closed, complete: first && order.length === set.size });
        first = false;
      }
    });
    return bands;
  }

  // 3) dépliage d'une bande (chaîne de triangles) à plat
  function unfoldChain(chain){
    const placed = new Map();
    const placements = [];
    const f0 = dome.faces[chain[0]];
    const P = f0.pointIds.map(id => dome.pointById.get(id));
    const lAB = dist3(P[0],P[1]), lAC = dist3(P[0],P[2]), lBC = dist3(P[1],P[2]);
    const cosA = (lAB*lAB + lAC*lAC - lBC*lBC) / (2*lAB*lAC);
    const angA = Math.acos(Math.max(-1, Math.min(1, cosA)));
    placed.set(f0.pointIds[0], {x:0,y:0});
    placed.set(f0.pointIds[1], {x:lAB,y:0});
    placed.set(f0.pointIds[2], {x:lAC*Math.cos(angA), y:lAC*Math.sin(angA)});
    placements.push({ idx: chain[0], pts: f0.pointIds.map(id => placed.get(id)), pointIds: f0.pointIds.slice() });
    for (let i = 1; i < chain.length; i++) {
      const f = dome.faces[chain[i]];
      const prev = placements[i-1];
      const shared = f.pointIds.filter(id => prev.pointIds.includes(id));
      const [id1, id2] = shared;
      const unknown = f.pointIds.find(id => !shared.includes(id));
      const otherPrev = prev.pointIds.find(id => !shared.includes(id));
      // positions locales (chaque pièce garde ses propres coordonnées 2D)
      const P1 = prev.pts[prev.pointIds.indexOf(id1)], P2 = prev.pts[prev.pointIds.indexOf(id2)];
      const ref = prev.pts[prev.pointIds.indexOf(otherPrev)];
      const d1 = dist3(dome.pointById.get(unknown), dome.pointById.get(id1));
      const d2 = dist3(dome.pointById.get(unknown), dome.pointById.get(id2));
      const dx = P2.x-P1.x, dy = P2.y-P1.y, d = Math.hypot(dx,dy) || 1e-9;
      const a = (d1*d1 - d2*d2 + d*d) / (2*d);
      const hh = Math.sqrt(Math.max(0, d1*d1 - a*a));
      const xm = P1.x + a*dx/d, ym = P1.y + a*dy/d, rx = -dy/d, ry = dx/d;
      const s1 = {x:xm+hh*rx, y:ym+hh*ry}, s2 = {x:xm-hh*rx, y:ym-hh*ry};
      const side = p => (P2.x-P1.x)*(p.y-P1.y) - (P2.y-P1.y)*(p.x-P1.x);
      const C = (side(s1) * side(ref) < 0) ? s1 : s2;
      const map = { [id1]: P1, [id2]: P2, [unknown]: C };
      placements.push({ idx: chain[i], pts: f.pointIds.map(id => map[id]), pointIds: f.pointIds.slice() });
    }
    return placements;
  }

  // 4) largeur minimale d'un ensemble de points (orientation optimale,
  //    calibre tournant sur l'enveloppe convexe) — c'est la largeur de
  //    toile que la pièce occupe si on la pose dans le meilleur sens.
  function convexHull(pts){
    const p = pts.slice().sort((a,b) => a.x-b.x || a.y-b.y);
    const cross = (o,a,b) => (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
    const lo = [], hi = [];
    p.forEach(q => { while (lo.length>=2 && cross(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i=p.length-1;i>=0;i--){ const q=p[i]; while (hi.length>=2 && cross(hi[hi.length-2], hi[hi.length-1], q) <= 0) hi.pop(); hi.push(q); }
    hi.pop(); lo.pop();
    return lo.concat(hi);
  }
  function minWidth(pts){
    const h = convexHull(pts);
    let best = { width: Infinity, length: 0, angle: 0 };
    for (let i=0;i<h.length;i++){
      const a = h[i], b = h[(i+1)%h.length];
      const ex = b.x-a.x, ey = b.y-a.y, L = Math.hypot(ex,ey) || 1e-12;
      const ux = ex/L, uy = ey/L;
      let wMax = 0, tMin = Infinity, tMax = -Infinity;
      h.forEach(q => {
        const w = Math.abs((q.x-a.x)*uy - (q.y-a.y)*ux);
        const t = (q.x-a.x)*ux + (q.y-a.y)*uy;
        if (w>wMax) wMax=w; if (t<tMin) tMin=t; if (t>tMax) tMax=t;
      });
      if (wMax < best.width) best = { width: wMax, length: tMax-tMin, angle: Math.atan2(uy,ux) };
    }
    return best;
  }

  // chevauchement interne d'une pièce dépliée (triangles non voisins)
  function overlapDepth(placements){
    let worst = 0;
    const axesOf = pts => [[0,1],[1,2],[2,0]].map(([i,j]) => { const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y, L=Math.hypot(dx,dy)||1; return {x:-dy/L,y:dx/L}; });
    const proj = (pts,ax) => { let mn=Infinity,mx=-Infinity; pts.forEach(p=>{const v=p.x*ax.x+p.y*ax.y; if(v<mn)mn=v; if(v>mx)mx=v;}); return [mn,mx]; };
    for (let i=0;i<placements.length;i++) for (let j=i+2;j<placements.length;j++){
      const A = placements[i], B = placements[j];
      if (A.pointIds.some(id => B.pointIds.includes(id))) continue;
      let depth = Infinity;
      for (const ax of axesOf(A.pts).concat(axesOf(B.pts))){
        const [a0,a1] = proj(A.pts,ax), [b0,b1] = proj(B.pts,ax);
        const d = Math.min(a1,b1) - Math.max(a0,b0);
        if (d <= 1e-9) { depth = 0; break; }
        if (d < depth) depth = d;
      }
      if (depth > worst) worst = depth;
    }
    return worst;
  }

  function pieceInfo(chain){
    const pl = unfoldChain(chain);
    const pts = pl.flatMap(p => p.pts);
    const mw = minWidth(pts);
    return { chain, placements: pl, width: mw.width, length: mw.length, angle: mw.angle, overlap: overlapDepth(pl) };
  }

  // 5) découpe d'un étage (anneau fermé) en un minimum de pièces contiguës.
  //    Chaque coupe tombe entre deux triangles voisins = sur une arête montante.
  //    On essaie chaque point de départ (l'anneau n'a pas de début naturel),
  //    remplissage glouton (optimal pour un point de départ donné), puis on
  //    garde le moins de pièces ; à égalité, la pièce la plus large possible
  //    la plus petite (meilleure marge de sécurité dans la laize).
  const infoCache = new Map();
  function splitBand(band, usableW, overlapTol, cap){
    cap = cap || Infinity;
    const n = band.order.length;
    const fits = info => info.width <= usableW + 1e-9 && info.overlap <= overlapTol + 1e-9;
    // cache partagé entre appels : la géométrie d'une chaîne ne dépend pas de la laize
    const memo = infoCache;
    const info = (s, len) => {
      const key = band.level + '/' + band.order[0] + '/' + n + ':' + s + ':' + len;
      if (!memo.has(key)) { const chain = []; for (let k=0;k<len;k++) chain.push(band.order[(s+k)%n]); memo.set(key, pieceInfo(chain)); }
      return memo.get(key);
    };
    let best = null;
    const starts = band.closed ? [...Array(n).keys()] : [0];
    for (const s of starts) {
      const pieces = [];
      let pos = 0, ok = true;
      while (pos < n) {
        let len = 1;
        if (!fits(info((s+pos)%n, 1))) { ok = false; }
        while (pos + len < n && len < cap && fits(info((s+pos)%n, len+1))) len++;
        pieces.push(info((s+pos)%n, len));
        pos += len;
      }
      const maxW = Math.max(...pieces.map(p => p.width));
      const cand = { start: s, pieces, ok, maxW };
      if (!best || cand.pieces.length < best.pieces.length ||
          (cand.pieces.length === best.pieces.length && cand.maxW < best.maxW)) best = cand;
    }
    return best;
  }

  // 5 bis) découpe « moins de gabarits » : l'étage est découpé en 5 secteurs
  //    identiques (symétrie d'ordre 5 du dôme, axe Pentad). Le même découpage
  //    est répété dans chaque secteur, donc chaque morceau d'un secteur a
  //    4 jumeaux identiques autour du dôme. On cherche, pour un décalage de
  //    départ donné, le découpage du secteur en un MINIMUM de morceaux
  //    (= de gabarits pour cet étage) qui tiennent tous dans la laize.
  function chainInfo(band, s, len){
    const n = band.order.length, key = band.level + '/' + band.order[0] + '/' + n + ':' + (((s % n) + n) % n) + ':' + len;
    if (!infoCache.has(key)) { const chain = []; for (let k = 0; k < len; k++) chain.push(band.order[(s + k) % n]); infoCache.set(key, pieceInfo(chain)); }
    return infoCache.get(key);
  }
  function compositions(k){ // découpages d'un segment de k triangles en morceaux consécutifs
    const out = [];
    for (let mask = 0; mask < (1 << (k - 1)); mask++) {
      const parts = []; let len = 1;
      for (let i = 0; i < k - 1; i++) { if (mask & (1 << i)) { parts.push(len); len = 1; } else len++; }
      parts.push(len); out.push(parts);
    }
    return out.sort((a, b) => a.length - b.length);
  }
  function splitBandSymmetric(band, usableW, overlapTol, cap){
    cap = cap || Infinity;
    const n = band.order.length;
    if (!band.closed || n % 5 !== 0) return null;
    const k = n / 5;
    if (k > 14) return null;
    const fits = info => info.width <= usableW + 1e-9 && info.overlap <= overlapTol + 1e-9;
    const comps = compositions(k);
    let best = null;
    for (let s = 0; s < k; s++) {
      for (const parts of comps) {
        if (best && parts.length > best.parts.length) break;
        if (parts.some(l => l > cap)) continue;
        let pos = s, ok = true, maxW = 0;
        for (const len of parts) { const inf = chainInfo(band, pos, len); if (!fits(inf)) { ok = false; break; } maxW = Math.max(maxW, inf.width); pos += len; }
        if (!ok) continue;
        if (!best || parts.length < best.parts.length || (parts.length === best.parts.length && maxW < best.maxW - 1e-9)) best = { s, parts, maxW };
      }
    }
    if (!best) return null;
    const pieces = [];
    for (let r = 0; r < 5; r++) {
      let pos = best.s + r * k;
      best.parts.forEach(len => { pieces.push(Object.assign({}, chainInfo(band, pos, len))); pos += len; });
    }
    return { pieces, ok: true, perSector: best.parts.length };
  }

  // 6) plan complet : sommet = triangles indépendants, puis étages découpés
  //    opts.strategy : 'pieces' (moins de morceaux) | 'gabarits' (moins de gabarits)
  //    opts.base     : 'ring' (anneau entier si possible) | 'sectors' (5 morceaux identiques)
  function plan(usableW, overlapTol, opts){
    opts = opts || {};
    const strategy = opts.strategy || 'pieces', baseMode = opts.base || 'ring';
    const bands = buildBands();
    const lastLevel = Math.max(...bands.map(b => b.level));
    const result = [];
    bands.forEach(b => {
      if (b.level === 0) {
        const pieces = b.order.map(idx => Object.assign({}, pieceInfo([idx])));
        result.push({ level: 0, band: b, pieces, ok: pieces.every(p => p.width <= usableW + 1e-9), cap: true });
        return;
      }
      const isBase = b.level === lastLevel;
      let sp = null;
      if (strategy === 'triangles') sp = { pieces: b.order.map(idx => Object.assign({}, pieceInfo([idx]))), ok: true };
      else if (strategy === 'custom') {
        // opts.bands[level] = { mode: 'g' (glouton) | 's' (secteurs identiques), cap, w }
        const spec = (opts.bands && opts.bands[b.level]) || { mode: 'g', cap: 1 };
        const w = spec.w || usableW;
        if (spec.cap === 1) sp = { pieces: b.order.map(idx => Object.assign({}, pieceInfo([idx]))), ok: true };
        else if (spec.mode === 's') sp = splitBandSymmetric(b, w, overlapTol, spec.cap);
        if (!sp) { const g = splitBand(b, w, overlapTol, spec.cap); sp = { pieces: g.pieces.map(p => Object.assign({}, p)), ok: g.ok }; }
      }
      if (!sp && isBase && baseMode === 'sectors' && strategy !== 'custom') sp = splitBandSymmetric(b, usableW, overlapTol);
      else if (!sp && strategy === 'gabarits') {
        const ring = b.closed ? chainInfo(b, 0, b.order.length) : null;
        if (isBase && ring && ring.width <= usableW + 1e-9 && ring.overlap <= overlapTol + 1e-9) sp = { pieces: [Object.assign({}, ring)], ok: true };
        else sp = splitBandSymmetric(b, usableW, overlapTol);
      }
      if (!sp) { const g = splitBand(b, usableW, overlapTol); sp = { pieces: g.pieces.map(p => Object.assign({}, p)), ok: g.ok }; }
      result.push({ level: b.level, band: b, pieces: sp.pieces, ok: sp.ok, cap: false });
    });
    // noms + appartenance face -> pièce ; une pièce qui reprend TOUT un étage
    // fermé est un anneau : ses deux extrémités se recousent (couture de fermeture)
    const perLevel = new Map();
    result.forEach((b, bi) => b.pieces.forEach((pc, pi) => {
      const n = (perLevel.get(b.level) || 0) + 1; perLevel.set(b.level, n);
      pc.name = b.cap ? 'S' + n : 'E' + b.level + '-' + n;
      pc.bandIndex = bi; pc.pieceIndex = pi;
      pc.closedRing = !b.cap && b.band.closed && pc.chain.length === b.band.order.length;
    }));
    return result;
  }

  // ---------------------------------------------------------
  // 7) Contrôles et fiche patron
  // ---------------------------------------------------------
  function pieceOfFace(planRes){
    const m = new Map();
    planRes.forEach(b => b.pieces.forEach(pc => pc.chain.forEach(i => m.set(i, pc))));
    return m;
  }

  // coutures = arêtes internes du dôme entre deux pièces différentes
  //          + couture de fermeture de chaque anneau d'un seul tenant
  function seamStats(planRes){
    const pof = pieceOfFace(planRes);
    let between = 0, total = 0;
    dome.faceAdjacency.forEach((adj, i) => adj.forEach(a => {
      if (a.neighbor <= i) return;
      total++;
      if (pof.get(i) !== pof.get(a.neighbor)) between++;
    }));
    const closures = planRes.reduce((n, b) => n + b.pieces.filter(pc => pc.closedRing).length, 0);
    return { between, closures, sewn: between + closures, total };
  }

  // numérotation stable des nœuds : du sommet vers la base, puis par azimut
  let _nodeLabels = null;
  function nodeLabels(){
    if (_nodeLabels) return _nodeLabels;
    const ring = vertexRings();
    const pts = dome.points.slice().sort((a, b) =>
      (ring.get(a._id) - ring.get(b._id)) || (Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)));
    _nodeLabels = new Map(pts.map((p, i) => [p._id, 'N' + (i + 1)]));
    _nodeLabels.ring = ring;
    return _nodeLabels;
  }

  function outwardNormal(face){
    const P = face.pointIds.map(id => dome.pointById.get(id));
    const e1 = {x:P[1].x-P[0].x, y:P[1].y-P[0].y, z:P[1].z-P[0].z};
    const e2 = {x:P[2].x-P[0].x, y:P[2].y-P[0].y, z:P[2].z-P[0].z};
    let n = {x:e1.y*e2.z-e1.z*e2.y, y:e1.z*e2.x-e1.x*e2.z, z:e1.x*e2.y-e1.y*e2.x};
    const c = {x:(P[0].x+P[1].x+P[2].x)/3, y:(P[0].y+P[1].y+P[2].y)/3, z:(P[0].z+P[1].z+P[2].z)/3};
    const s = (n.x*c.x + n.y*c.y + n.z*c.z) >= 0 ? 1 : -1;
    const L = Math.hypot(n.x, n.y, n.z) || 1;
    return { n: {x:s*n.x/L, y:s*n.y/L, z:s*n.z/L}, ccwIsOutward: s > 0 };
  }

  function classOf(len){
    let best = null, bd = Infinity;
    dome.edgeClasses.forEach(g => { const d = Math.abs(g.length - len); if (d < bd) { bd = d; best = g; } });
    return best ? best.name : '?';
  }

  // Fiche complète d'une pièce, prête à tracer :
  //  - pièce vue de l'EXTÉRIEUR (face endroit), posée sur le rouleau :
  //    X = le long du rouleau, Y = à travers la laize, origine en bas à gauche,
  //    côté sommet du dôme vers le haut ;
  //  - cotes nettes, de centre de nœud à centre de nœud (sans marge).
  function pieceSheet(planRes, pc){
    const labels = nodeLabels(), ring = labels.ring;
    const pof = pieceOfFace(planRes);
    const d3 = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
    let pl = unfoldChain(pc.chain).map(p => ({ idx: p.idx, pointIds: p.pointIds, pts: p.pts.map(q => ({x:q.x, y:q.y})) }));

    // a) face endroit : si le dépliage montre l'envers, on le retourne (miroir)
    const f0 = dome.faces[pl[0].idx], q = pl[0].pts;
    const s2 = (q[1].x-q[0].x)*(q[2].y-q[0].y) - (q[1].y-q[0].y)*(q[2].x-q[0].x);
    if ((s2 > 0) !== outwardNormal(f0).ccwIsOutward) pl.forEach(p => p.pts.forEach(v => { v.x = -v.x; }));

    // b) orientation de coupe : plus petite largeur à travers la laize
    const all0 = pl.flatMap(p => p.pts);
    const mw = minWidth(all0);
    const ca = Math.cos(-mw.angle), sa = Math.sin(-mw.angle);
    pl.forEach(p => p.pts = p.pts.map(v => ({ x: v.x*ca - v.y*sa, y: v.x*sa + v.y*ca })));

    // c) côté sommet du dôme vers le haut (rotation 180°, sans retourner la toile)
    let yTop = 0, nTop = 0, yBot = 0, nBot = 0;
    const minRing = Math.min(...pl.flatMap(p => p.pointIds.map(id => ring.get(id))));
    pl.forEach(p => p.pointIds.forEach((id, k) => {
      if (ring.get(id) === minRing) { yTop += p.pts[k].y; nTop++; } else { yBot += p.pts[k].y; nBot++; }
    }));
    if (nTop && nBot && yTop/nTop < yBot/nBot) pl.forEach(p => p.pts.forEach(v => { v.x = -v.x; v.y = -v.y; }));

    // d) origine en bas à gauche
    const all = pl.flatMap(p => p.pts);
    const minX = Math.min(...all.map(v => v.x)), minY = Math.min(...all.map(v => v.y));
    pl.forEach(p => p.pts.forEach(v => { v.x -= minX; v.y -= minY; }));
    const lengthX = Math.max(...all.map(v => v.x)), widthY = Math.max(...all.map(v => v.y));

    // e) contour : arêtes non partagées avec le triangle précédent/suivant de la chaîne
    const ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
    const internal = new Map(); // edgeKey -> [i, i+1]
    for (let i = 0; i + 1 < pl.length; i++) {
      const sh = pl[i].pointIds.filter(id => pl[i+1].pointIds.includes(id));
      internal.set(ek(sh[0], sh[1]) + '@' + i, [i, i + 1, sh]);
    }
    const isInternal = (i, a, b) => internal.has(ek(a, b) + '@' + i) || internal.has(ek(a, b) + '@' + (i - 1));
    const vkey = v => Math.round(v.x * 1e6) + ',' + Math.round(v.y * 1e6);
    const segs = [];
    pl.forEach((p, i) => {
      for (let k = 0; k < 3; k++) {
        const a = p.pointIds[k], b = p.pointIds[(k+1)%3];
        if (isInternal(i, a, b)) continue;
        segs.push({ tri: i, ids: [a, b], A: p.pts[k], B: p.pts[(k+1)%3] });
      }
    });
    // chaînage des segments en polygone fermé
    const byKey = new Map();
    segs.forEach(s => [s.A, s.B].forEach(v => { const k = vkey(v); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(s); }));
    const start = segs.slice().sort((s, t) => (Math.min(s.A.x, s.B.x) - Math.min(t.A.x, t.B.x)) || (Math.min(s.A.y, s.B.y) - Math.min(t.A.y, t.B.y)))[0];
    const loop = []; const used = new Set();
    let cur = start, curV = (start.A.y <= start.B.y ? start.A : start.B);
    // on démarre au point le plus bas-gauche
    {
      const lowest = segs.flatMap(s => [s.A, s.B]).sort((u, v) => (u.x - v.x) || (u.y - v.y))[0];
      curV = lowest; cur = byKey.get(vkey(lowest))[0];
    }
    while (cur && !used.has(cur)) {
      used.add(cur);
      const fromA = vkey(cur.A) === vkey(curV);
      const nextV = fromA ? cur.B : cur.A;
      loop.push({ from: curV, to: nextV, seg: cur, fromId: fromA ? cur.ids[0] : cur.ids[1], toId: fromA ? cur.ids[1] : cur.ids[0] });
      curV = nextV;
      cur = (byKey.get(vkey(curV)) || []).find(s => !used.has(s));
    }
    // sens trigonométrique
    let area2 = 0; loop.forEach(e => { area2 += e.from.x * e.to.y - e.to.x * e.from.y; });
    if (area2 < 0) { loop.reverse(); loop.forEach(e => { [e.from, e.to] = [e.to, e.from]; [e.fromId, e.toId] = [e.toId, e.fromId]; }); }

    const points = loop.map((e, i) => ({ label: 'P' + (i + 1), node: labels.get(e.fromId), nodeId: e.fromId, ring: ring.get(e.fromId), x: e.from.x, y: e.from.y }));
    points.forEach((p, i) => {
      const prev = points[(i - 1 + points.length) % points.length], next = points[(i + 1) % points.length];
      const ux = next.x - p.x, uy = next.y - p.y, vx = prev.x - p.x, vy = prev.y - p.y;
      let th = Math.atan2(ux*vy - uy*vx, ux*vx + uy*vy); if (th < 0) th += 2*Math.PI;
      p.angle = th * 180 / Math.PI;
    });

    const edges = loop.map((e, i) => {
      const len3 = d3(dome.pointById.get(e.fromId), dome.pointById.get(e.toId));
      const face = pl[e.seg.tri].idx;
      const adj = (dome.faceAdjacency[face] || []).find(a => a.edgePointIds.includes(e.fromId) && a.edgePointIds.includes(e.toId));
      let type, kind, other = null, side;
      // côté de couture : A = recouvrant, B = recouvert, H = ourlet
      //  - couture d'étage : le morceau du dessus (plus près du sommet) recouvre ;
      //  - coupe montante / fermeture : dans le sens de parcours de l'étage,
      //    le début d'un morceau recouvre la fin du morceau précédent.
      const first = pc.chain[0], last = pc.chain[pc.chain.length - 1];
      const hemKey = e.fromId < e.toId ? e.fromId + '-' + e.toId : e.toId + '-' + e.fromId;
      if (!adj && dome.openingHem && dome.openingHem.has(hemKey)) { type = 'bord d\'ouverture (ourlet)'; kind = 'ourlet'; side = 'H'; }
      else if (!adj) { type = 'bord bas du dôme (ourlet)'; kind = 'ourlet'; side = 'H'; }
      else {
        const op = pof.get(adj.neighbor);
        if (op === pc) {
          type = 'fermeture : se recoud sur l\'autre extrémité de la bande'; kind = 'fermeture';
          side = face === first ? 'A' : 'B';
        } else {
          other = op.name;
          const sameBand = op.bandIndex === pc.bandIndex, lvA = planRes[pc.bandIndex].level, lvB = planRes[op.bandIndex].level;
          const sameLevel = !sameBand && lvA === lvB; // deux chaînes d'un même étage (Triad / Cross)
          type = (sameBand || sameLevel ? 'coupe montante' : 'couture d\'étage') + ' ↔ ' + op.name; kind = sameBand || sameLevel ? 'montante' : 'etage';
          if (sameLevel) side = pc.bandIndex < op.bandIndex ? 'A' : 'B';
          else if (!sameBand) side = lvA < lvB ? 'A' : 'B';
          else {
            const oFirst = op.chain[0], oLast = op.chain[op.chain.length - 1];
            const isEnd = face === last && adj.neighbor === oFirst, isStart = face === first && adj.neighbor === oLast;
            if (isEnd && !isStart) side = 'B';
            else if (isStart && !isEnd) side = 'A';
            else if (!planRes[pc.bandIndex].band.closed) side = op.pieceIndex > pc.pieceIndex ? 'B' : 'A'; // chaîne ouverte : pas de bouclage
            else { const nP = planRes[pc.bandIndex].pieces.length; side = op.pieceIndex === (pc.pieceIndex + 1) % nP ? 'B' : 'A'; }
          }
        }
      }
      return { from: points[i].label, to: points[(i + 1) % points.length].label, length: Math.hypot(e.to.x-e.from.x, e.to.y-e.from.y),
               length3D: len3, cls: classOf(len3), type, kind, other, side, nodeIds: [e.fromId, e.toId] };
    });

    const labelAt = new Map(); // position -> label (pour nommer les plis)
    points.forEach(p => labelAt.set(vkey(p), p.label));
    const folds = [];
    for (let i = 0; i + 1 < pl.length; i++) {
      const sh = pl[i].pointIds.filter(id => pl[i+1].pointIds.includes(id));
      const A = pl[i].pts[pl[i].pointIds.indexOf(sh[0])], B = pl[i].pts[pl[i].pointIds.indexOf(sh[1])];
      const n1 = outwardNormal(dome.faces[pl[i].idx]).n, n2 = outwardNormal(dome.faces[pl[i+1].idx]).n;
      const fold = Math.acos(Math.max(-1, Math.min(1, n1.x*n2.x + n1.y*n2.y + n1.z*n2.z))) * 180 / Math.PI;
      folds.push({ from: labelAt.get(vkey(A)), to: labelAt.get(vkey(B)), A, B, length: Math.hypot(B.x-A.x, B.y-A.y),
                   cls: classOf(d3(dome.pointById.get(sh[0]), dome.pointById.get(sh[1]))), fold, tris: [pl[i].idx, pl[i+1].idx] });
    }

    let area = 0;
    const triangles = pl.map(p => {
      const P = p.pts, sides = [], angles = [];
      for (let k = 0; k < 3; k++) {
        const a = P[k], b = P[(k+1)%3], c = P[(k+2)%3];
        const L = Math.hypot(b.x-a.x, b.y-a.y); sides.push({ len: L, cls: classOf(L) });
        const ux=b.x-a.x, uy=b.y-a.y, vx=c.x-a.x, vy=c.y-a.y;
        angles.push(Math.acos(Math.max(-1, Math.min(1, (ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy))))) * 180 / Math.PI);
      }
      const ar = Math.abs((P[1].x-P[0].x)*(P[2].y-P[0].y) - (P[1].y-P[0].y)*(P[2].x-P[0].x)) / 2;
      area += ar;
      return { idx: p.idx, nodes: p.pointIds.map(id => labels.get(id)), pts: P, sides, angles, area: ar };
    });

    // f) contrôle « sans vague » : longueurs conservées + aucun nœud entièrement
    //    entouré par la pièce (un tel nœud forcerait un cône => pli/vague)
    let maxErr = 0;
    pl.forEach(p => { for (let k = 0; k < 3; k++) {
      const e = Math.abs(Math.hypot(p.pts[(k+1)%3].x-p.pts[k].x, p.pts[(k+1)%3].y-p.pts[k].y) - d3(dome.pointById.get(p.pointIds[k]), dome.pointById.get(p.pointIds[(k+1)%3])));
      if (e > maxErr) maxErr = e; } });
    const inPiece = new Set(pc.chain);
    const interiorNodes = [...new Set(pl.flatMap(p => p.pointIds))].filter(id =>
      dome.faces.filter(f => f.pointIds.includes(id)).every(f => inPiece.has(f.index)) &&
      !dome.lines.some(l => l.selvage && l.pointIds.includes(id)));

    return {
      name: pc.name, chain: pc.chain, closedRing: pc.closedRing,
      triangles, points, edges, folds,
      width: widthY, length: lengthX, area, bboxArea: widthY * lengthX,
      check: { maxLengthError: maxErr, interiorNodes: interiorNodes.length, overlap: pc.overlap,
               flat: maxErr < 1e-6 && interiorNodes.length === 0 && pc.overlap < 1e-9 }
    };
  }

  return { vertexRings, buildBands, unfoldChain, minWidth, pieceInfo, splitBand, plan,
           pieceOfFace, seamStats, nodeLabels, pieceSheet };
}
if (typeof module !== 'undefined' && module.exports) module.exports = makeEtages;
