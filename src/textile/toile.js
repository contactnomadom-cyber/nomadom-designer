
// ---------------------------------------------------------
// toile.js — surface de toile réelle et contour de coupe
// (logique pure, testable sous Node, inlinée dans acidome-cover-plus.html)
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // =========================================================
  // 1) Mode « sans connecteur — GoodKarma »
  //    La toile ne repose pas sur les centres des nœuds mais sur la
  //    face extérieure des montants. Chaque face du dôme est donc
  //    poussée vers l'extérieur de la hauteur d'appui h (plan parallèle).
  //    Chaque nœud de toile = point le plus proche de tous les plans
  //    décalés qui l'entourent (moindres carrés) ; les nœuds de base
  //    restent dans le plan du sol (base plate conservée).
  //    Résultat : même topologie, nouvelles coordonnées, patron toujours
  //    développable exactement (triangles plans).
  // =========================================================
  function solve3(M, b) {
    const [a, c, d] = M;
    const det = a[0]*(c[1]*d[2]-c[2]*d[1]) - a[1]*(c[0]*d[2]-c[2]*d[0]) + a[2]*(c[0]*d[1]-c[1]*d[0]);
    const inv = [
      [(c[1]*d[2]-c[2]*d[1])/det, (a[2]*d[1]-a[1]*d[2])/det, (a[1]*c[2]-a[2]*c[1])/det],
      [(c[2]*d[0]-c[0]*d[2])/det, (a[0]*d[2]-a[2]*d[0])/det, (a[2]*c[0]-a[0]*c[2])/det],
      [(c[0]*d[1]-c[1]*d[0])/det, (a[1]*d[0]-a[0]*d[1])/det, (a[0]*c[1]-a[1]*c[0])/det]
    ];
    return inv.map(r => r[0]*b[0] + r[1]*b[1] + r[2]*b[2]);
  }

  function faceNormal(dome, f) {
    const P = f.pointIds.map(id => dome.pointById.get(id));
    const e1 = {x:P[1].x-P[0].x, y:P[1].y-P[0].y, z:P[1].z-P[0].z};
    const e2 = {x:P[2].x-P[0].x, y:P[2].y-P[0].y, z:P[2].z-P[0].z};
    let n = {x:e1.y*e2.z-e1.z*e2.y, y:e1.z*e2.x-e1.x*e2.z, z:e1.x*e2.y-e1.y*e2.x};
    const c = {x:(P[0].x+P[1].x+P[2].x)/3, y:(P[0].y+P[1].y+P[2].y)/3, z:(P[0].z+P[1].z+P[2].z)/3};
    const L = Math.hypot(n.x, n.y, n.z) * ((n.x*c.x + n.y*c.y + n.z*c.z) >= 0 ? 1 : -1);
    n = {x:n.x/L, y:n.y/L, z:n.z/L};
    return { n, d: n.x*P[0].x + n.y*P[0].y + n.z*P[0].z };
  }

  function edgeKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

  function offsetDome(dome, h) {
    const planes = dome.faces.map(f => { const p = faceNormal(dome, f); return { n: p.n, d: p.d + h }; });
    const selvageNodes = new Set();
    dome.lines.forEach(l => { if (l.selvage) l.pointIds.forEach(id => selvageNodes.add(id)); });
    const yBase = selvageNodes.size ? Math.min(...[...selvageNodes].map(id => dome.pointById.get(id).y)) : null;

    const facesOf = new Map(dome.points.map(p => [p._id, []]));
    dome.faces.forEach(f => f.pointIds.forEach(id => facesOf.get(id).push(f.index)));

    const points = dome.points.map(p => {
      const M = [[0,0,0],[0,0,0],[0,0,0]], b = [0,0,0];
      const add = (n, d, w) => {
        const v = [n.x, n.y, n.z];
        for (let i = 0; i < 3; i++) { b[i] += w * v[i] * d; for (let j = 0; j < 3; j++) M[i][j] += w * v[i] * v[j]; }
      };
      facesOf.get(p._id).forEach(fi => add(planes[fi].n, planes[fi].d, 1));
      if (selvageNodes.has(p._id)) add({x:0, y:1, z:0}, yBase, 1000); // reste au sol
      const q = solve3(M, b);
      return { _id: p._id, x: q[0], y: q[1], z: q[2], pptPoint: p.pptPoint };
    });
    const pointById = new Map(points.map(p => [p._id, p]));
    const d3 = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);

    // écart entre la toile réelle et le plan idéal de chaque face (contrôle)
    let maxPlaneDev = 0;
    dome.faces.forEach((f, fi) => f.pointIds.forEach(id => {
      const q = pointById.get(id), pl = planes[fi];
      maxPlaneDev = Math.max(maxPlaneDev, Math.abs(pl.n.x*q.x + pl.n.y*q.y + pl.n.z*q.z - pl.d));
    }));

    // classes de longueur : on garde le nom de la classe nominale (A, B, C…)
    const nominalClassOf = len => {
      let best = null, bd = Infinity;
      dome.edgeClasses.forEach(g => { const dd = Math.abs(g.length - len); if (dd < bd) { bd = dd; best = g; } });
      return best;
    };
    const lines = dome.lines.map(l => ({
      pointIds: l.pointIds.slice(), selvage: l.selvage,
      length: d3(pointById.get(l.pointIds[0]), pointById.get(l.pointIds[1])),
      nominalLength: l.length, cls: nominalClassOf(l.length).name
    }));
    const edgeClasses = dome.edgeClasses.map(g => {
      const ls = lines.filter(l => l.cls === g.name).map(l => l.length);
      return { name: g.name, count: ls.length, length: ls.reduce((a, v) => a + v, 0) / ls.length,
               min: Math.min(...ls), max: Math.max(...ls), nominal: g.length };
    });

    return Object.assign({}, dome, {
      points, pointById, lines, edgeClasses,
      offset: { h, maxPlaneDev, nominalEdgeClasses: dome.edgeClasses,
                nominalLengthOf: new Map(dome.lines.map(l => [edgeKey(l.pointIds[0], l.pointIds[1]), l.length])) }
    });
  }

  // =========================================================
  // 2) Assemblages : valeurs par défaut (modifiables dans l'interface)
  //    A = côté RECOUVRANT (morceau du dessus : l'eau ruisselle sur la couture)
  //    B = côté recouvert
  // =========================================================
  const SEAM_PRESETS = {
    simple:     { label: 'Couture simple',          A: 20, B: 20, note: 'même marge des deux côtés' },
    rabattue:   { label: 'Couture rabattue',        A: 40, B: 20, note: 'le côté A, plus large, se rabat sur le côté B' },
    recouvrement:{ label: 'Recouvrement / soudure', A: 40, B: 0,  note: 'le côté A recouvre le côté B sur la largeur A' },
    perso:      { label: 'Personnalisé',            A: null, B: null, note: 'valeurs saisies' }
  };

  // =========================================================
  // 3) Contour de coupe : décalage de chaque bord net de sa marge
  //    (intersection des bords décalés ; coin chanfreiné si l'angle
  //    est très aigu, pour ne pas créer une longue pointe de tissu)
  // =========================================================
  function cutOutline(points, allowances, miterLimit) {
    miterLimit = miterLimit || 2.5;
    const n = points.length;
    const lines = points.map((p, i) => {
      const q = points[(i + 1) % n];
      const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1e-12;
      const nx = dy / L, ny = -dx / L; // normale extérieure (contour trigonométrique)
      const a = allowances[i];
      return { p: { x: p.x + nx * a, y: p.y + ny * a }, d: { x: dx / L, y: dy / L }, nrm: { x: nx, y: ny }, a };
    });
    const out = [];
    for (let i = 0; i < n; i++) {
      const L1 = lines[(i - 1 + n) % n], L2 = lines[i], v = points[i];
      const cr = L1.d.x * L2.d.y - L1.d.y * L2.d.x;
      if (Math.abs(cr) < 1e-9) { // bords alignés
        const a = Math.max(L1.a, L2.a);
        if (Math.abs(L1.a - L2.a) < 1e-12) out.push({ x: v.x + L2.nrm.x * a, y: v.y + L2.nrm.y * a });
        else { out.push({ x: v.x + L1.nrm.x * L1.a, y: v.y + L1.nrm.y * L1.a }); out.push({ x: v.x + L2.nrm.x * L2.a, y: v.y + L2.nrm.y * L2.a }); }
        continue;
      }
      const t = ((L2.p.x - L1.p.x) * L2.d.y - (L2.p.y - L1.p.y) * L2.d.x) / cr;
      const X = { x: L1.p.x + L1.d.x * t, y: L1.p.y + L1.d.y * t };
      const dist = Math.hypot(X.x - v.x, X.y - v.y), amax = Math.max(L1.a, L2.a);
      if (amax > 0 && dist > miterLimit * amax) {
        out.push({ x: v.x + L1.nrm.x * L1.a + L1.d.x * 0, y: v.y + L1.nrm.y * L1.a });
        out.push({ x: v.x + L2.nrm.x * L2.a, y: v.y + L2.nrm.y * L2.a });
      } else out.push(X);
    }
    // supprime les points confondus
    return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return Math.hypot(p.x - q.x, p.y - q.y) > 1e-9 || out.length < 4; });
  }

  // largeur minimale (orientation optimale) d'un polygone
  function minWidthPoly(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
    const lo = [], hi = [];
    p.forEach(q => { while (lo.length >= 2 && cross(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length-2], hi[hi.length-1], q) <= 0) hi.pop(); hi.push(q); }
    hi.pop(); lo.pop();
    const h = lo.concat(hi);
    let best = { width: Infinity, angle: 0 };
    for (let i = 0; i < h.length; i++) {
      const a = h[i], b = h[(i+1) % h.length], L = Math.hypot(b.x-a.x, b.y-a.y) || 1e-12;
      const ux = (b.x-a.x)/L, uy = (b.y-a.y)/L;
      let w = 0; h.forEach(q => { w = Math.max(w, Math.abs((q.x-a.x)*uy - (q.y-a.y)*ux)); });
      if (w < best.width) best = { width: w, angle: Math.atan2(uy, ux) };
    }
    return best;
  }

  // Applique les marges à une fiche (pieceSheet) et la réoriente pour que
  // le CONTOUR DE COUPE prenne la plus petite largeur possible dans la laize.
  // values = { A, B, hem } en mètres.
  function applyAllowances(sheet, values) {
    // Rangée du bas (étape 3 bis, 30/10/2026) : si values.bottom = { A, B, hem } est donné, les morceaux
    // qui portent l'ourlet (bord du dôme) prennent ces marges sur TOUS leurs bords.
    const isBottom = sheet.edges.some(e => e.side === 'H');
    if (values.bottom && isBottom) values = values.bottom;
    sheet.bottomRow = isBottom;
    const allow = sheet.edges.map(e => e.side === 'H' ? values.hem : (e.side === 'A' ? values.A : values.B));
    sheet.edges.forEach((e, i) => { e.allowance = allow[i]; });
    let cut = cutOutline(sheet.points, allow);

    // réorientation (rotation pure : la toile n'est jamais retournée)
    const mw = minWidthPoly(cut);
    const ca = Math.cos(-mw.angle), sa = Math.sin(-mw.angle);
    const rot = v => ({ x: v.x*ca - v.y*sa, y: v.x*sa + v.y*ca });
    const tf = f => {
      sheet.points.forEach(p => { const r = f(p); p.x = r.x; p.y = r.y; });
      sheet.folds.forEach(fl => { fl.A = f(fl.A); fl.B = f(fl.B); });
      sheet.triangles.forEach(t => { t.pts = t.pts.map(f); });
      cut = cut.map(f);
    };
    tf(rot);
    // côté sommet du dôme vers le haut
    const minRing = Math.min(...sheet.points.map(p => p.ring));
    const top = sheet.points.filter(p => p.ring === minRing), bot = sheet.points.filter(p => p.ring !== minRing);
    const avg = a => a.reduce((s, p) => s + p.y, 0) / a.length;
    if (top.length && bot.length && avg(top) < avg(bot)) tf(v => ({ x: -v.x, y: -v.y }));
    // origine en bas à gauche du contour de coupe
    const mx = Math.min(...cut.map(v => v.x)), my = Math.min(...cut.map(v => v.y));
    tf(v => ({ x: v.x - mx, y: v.y - my }));

    sheet.cut = cut;
    sheet.cutLength = Math.max(...cut.map(v => v.x));
    sheet.cutWidth = Math.max(...cut.map(v => v.y));
    const xs = sheet.points.map(p => p.x), ys = sheet.points.map(p => p.y);
    sheet.length = Math.max(...xs) - Math.min(...xs);
    sheet.width = Math.max(...ys) - Math.min(...ys);
    let a2 = 0; cut.forEach((p, i) => { const q = cut[(i+1) % cut.length]; a2 += p.x*q.y - q.x*p.y; });
    sheet.cutArea = Math.abs(a2) / 2;
    sheet.bboxArea = sheet.cutLength * sheet.cutWidth;
    return sheet;
  }

  // =========================================================
  // 4) Découpe en étages avec les VRAIES largeurs de coupe
  //    La découpe (etages.plan) raisonne en largeur nette. On cherche la
  //    plus grande largeur nette de planification pour laquelle chaque
  //    morceau de plusieurs triangles, une fois ses marges ajoutées, tient
  //    dans la laize utile (laize − 2 × lisière). Recherche par dichotomie.
  // =========================================================
  function planFabric(et, laizeUsable, values, overlapTol, planOpts) {
    const evaluate = U => {
      const plan = et.plan(U, overlapTol, planOpts);
      const sheets = new Map();
      let ok = true, count = 0, maxCut = 0;
      plan.forEach(b => b.pieces.forEach(pc => {
        count++;
        const sh = applyAllowances(et.pieceSheet(plan, pc), values);
        sheets.set(pc.name, sh);
        if (pc.chain.length > 1 && sh.cutWidth > laizeUsable + 1e-9) ok = false;
        maxCut = Math.max(maxCut, sh.cutWidth);
      }));
      return { plan, sheets, ok, count, maxCut, planningWidth: U };
    };
    let lo = Math.max(0.05, laizeUsable - (values.B + Math.max(values.A, values.hem)));
    let hi = laizeUsable;
    let best = evaluate(lo);
    // si l'estimation de départ ne suffit pas (orientation défavorable), on resserre
    while (!best.ok && lo > 0.3) { lo -= 0.02; hi = lo + 0.02; best = evaluate(lo); }
    if (best.ok) hi = laizeUsable;
    for (let it = 0; it < 12; it++) {
      const mid = (lo + hi) / 2;
      const r = evaluate(mid);
      if (r.ok) { if (!best.ok || r.count < best.count || (r.count === best.count && r.maxCut <= best.maxCut)) best = r; lo = mid; }
      else hi = mid;
    }
    return best;
  }

  // =========================================================
  // 5) Gabarits : morceaux de même forme de COUPE (marges comprises).
  //    Signature = suite cyclique (longueur de bord, angle) du contour de
  //    coupe, arrondie à 1 mm / 0,1°, et de la ligne de couture. Option :
  //    une image miroir compte comme le même gabarit (gabarit retourné).
  // =========================================================
  function shapeSeq(poly){ // [[longueur bord suivant, angle intérieur], ...]
    const n = poly.length, seq = [];
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
      const L = Math.hypot(c.x - b.x, c.y - b.y);
      const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y };
      let ang = Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y); if (ang < 0) ang += 2 * Math.PI;
      seq.push([L, ang]);
    }
    return seq;
  }
  // deux contours sont identiques si une rotation cyclique fait coïncider
  // toutes les longueurs (à 0,5 mm) et tous les angles (à 0,05°)
  function sameShape(s1, s2){
    if (s1.length !== s2.length) return false;
    const n = s1.length, tl = 0.0005, ta = 0.05 * Math.PI / 180;
    for (let k = 0; k < n; k++) {
      let ok = true;
      for (let i = 0; i < n && ok; i++) {
        const p = s1[i], q = s2[(i + k) % n];
        if (Math.abs(p[0] - q[0]) > tl || Math.abs(p[1] - q[1]) > ta) ok = false;
      }
      if (ok) return true;
    }
    return false;
  }
  function mirrorPoly(poly){ return poly.map(p => ({ x: -p.x, y: p.y })).reverse(); }
  function groupGabarits(sheets, allowMirror){
    const groups = [];
    const sig = sh => ({ cut: shapeSeq(sh.cut), net: shapeSeq(sh.points), n: sh.triangles.length });
    const same = (a, b) => a.n === b.n && sameShape(a.cut, b.cut) && sameShape(a.net, b.net);
    sheets.forEach(sh => {
      const k = sig(sh);
      let g = groups.find(gr => same(gr.sig, k)), mirrored = false;
      if (!g && allowMirror) {
        const mk = { cut: shapeSeq(mirrorPoly(sh.cut)), net: shapeSeq(mirrorPoly(sh.points)), n: k.n };
        g = groups.find(gr => same(gr.sig, mk)); mirrored = !!g;
      }
      if (!g) { g = { sig: k, id: 'G' + (groups.length + 1), members: [], ref: sh }; groups.push(g); }
      g.members.push({ sheet: sh, mirrored });
      sh.gabarit = g.id; sh.gabMirror = mirrored; sh.gabGroup = g;
    });
    return groups;
  }

  const Toile = { groupGabarits, shapeSeq, planFabric, offsetDome, SEAM_PRESETS, cutOutline, minWidthPoly, applyAllowances, edgeKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = Toile;
  else global.Toile = Toile;
})(typeof window !== 'undefined' ? window : globalThis);
