// ---------------------------------------------------------
// mezz-frame.js — Ossature de la mezzanine (idée n° 8, aménagement, étape 2).
// Logique pure, sans DOM, testée sous Node (tests/node/mezz-frame.test.js). Unités : m, kN.
//
// Image : une étagère accrochée au mur d'un côté et posée sur des pieds de l'autre.
//  - Solives parallèles à l'orientation de la mezzanine, à entraxe régulier ; chacune va
//    d'une poutre de rive (bord libre) jusqu'à la paroi, où elle repose sur une lambourde
//    fixée aux montants du dôme.
//  - Un bord libre parallèle aux solives est une solive de rive.
//  - Les autres bords libres sont des poutres de rive (un arc de cercle est remplacé par
//    des cordes), posées sur des poteaux : aux angles libres, plus des poteaux
//    intermédiaires tant que la poutre ne passe pas.
//  - Chaque pièce passe le contrôle de Floor.checkPiece / Floor.checkPost (🟡 calculé).
//  - L'appui sur la paroi charge les montants du dôme : 🟠 à vérifier.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const DEFAULTS = { joistSection: 'cls-38x184', spacing: 0.5, beamSection: 'kvh-80x200', postSection: 'kvh-100x100', joint: 'about' };
  const SPACINGS = [0.3, 0.4, 0.5, 0.6];
  const DECK = 0.022;              // panneau de plancher (m)
  const WALL_GAP = 0.01;           // jeu contre la lambourde (m)
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const dot = (a, b) => a.x * b.x + a.z * b.z;

  // un bord de la mezzanine est-il contre la paroi ?
  function onWall(p, q, wallSec) {
    const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
    return wallSec.some((a, j) => { const b = wallSec[(j + 1) % wallSec.length], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return Math.abs((b.x - a.x) * (m.z - a.z) - (b.z - a.z) * (m.x - a.x)) / L < 0.03 && dot({ x: m.x - a.x, z: m.z - a.z }, { x: b.x - a.x, z: b.z - a.z }) > -0.03 * L && dot({ x: m.x - b.x, z: m.z - b.z }, { x: a.x - b.x, z: a.z - b.z }) > -0.03 * L; });
  }

  // frame = choix (sections, entraxe, assemblage) ; F = module Floor (sections, contrôles)
  function layout(poly, wallSec, mezz, frame, F) {
    const o = Object.assign({}, DEFAULTS, frame || {}), errors = [], warnings = [];
    if (!poly || poly.length < 3 || !wallSec) return { ok: false, errors: ['pas de mezzanine'] };
    ['joistSection', 'beamSection', 'postSection'].forEach(k => { if (!F.SECTIONS[o[k]]) o[k] = DEFAULTS[k]; });
    if (['onglet', 'about'].indexOf(o.joint) < 0) o.joint = DEFAULTS.joint;
    const S = k => Object.assign({ grade: 'C24' }, F.SECTIONS[k]);
    const js = S(o.joistSection), bs = S(o.beamSection), ps = S(o.postSection), e = SPACINGS.indexOf(o.spacing) >= 0 ? o.spacing : DEFAULTS.spacing;
    const ang = (mezz.orient || 0) * Math.PI / 180, u = { x: Math.cos(ang), z: Math.sin(ang) }, v = { x: -u.z, z: u.x };
    const G = F.DEFAULTS.loads.floorG, Q = F.DEFAULTS.loads.liveQ;

    // ---- bords : paroi, solive de rive (parallèle aux solives) ou poutre de rive ----
    const edges = poly.map((p, i) => { const q = poly[(i + 1) % poly.length], d = { x: q.x - p.x, z: q.z - p.z }, L = Math.hypot(d.x, d.z) || 1;
      const kind = onWall(p, q, wallSec) ? 'paroi' : Math.abs(dot(d, v)) / L < 0.05 ? 'rive' : 'poutre';
      return { a: p, b: q, kind, len: L, dir: { x: d.x / L, z: d.z / L } }; });
    // poutres : bords libres consécutifs presque alignés (< 20°) regroupés en une corde
    const beams = [];
    edges.forEach((ed, i) => {
      if (ed.kind !== 'poutre') return;
      const prev = edges[(i + edges.length - 1) % edges.length], last = beams[beams.length - 1];
      if (last && prev === last.lastEdge && dot(prev.dir, ed.dir) > Math.cos(20 * Math.PI / 180) && dot(last.dir0, ed.dir) > Math.cos(35 * Math.PI / 180)) { last.b = ed.b; last.lastEdge = ed; last.edges.push(ed); }
      else beams.push({ a: ed.a, b: ed.b, lastEdge: ed, dir0: ed.dir, edges: [ed] });
    });
    // fermeture du tour : la dernière corde rejoint la première si elles se suivent
    if (beams.length > 1 && dist(beams[beams.length - 1].b, beams[0].a) < 1e-9 && dot(beams[beams.length - 1].dir0, beams[0].dir0) > Math.cos(35 * Math.PI / 180) && edges.indexOf(beams[beams.length - 1].lastEdge) === edges.length - 1) {
      beams[0].a = beams[beams.length - 1].a; beams[0].edges = beams[beams.length - 1].edges.concat(beams[0].edges); beams.pop();
    }
    beams.forEach(b => { b.len = dist(b.a, b.b); b.dir = { x: (b.b.x - b.a.x) / b.len, z: (b.b.z - b.a.z) / b.len }; });

    // ---- solives : lignes parallèles à u, coupées par le contour ----
    const proj = poly.map(p => dot(p, v)), tmin = Math.min(...proj), tmax = Math.max(...proj);
    // répartition régulière et symétrique : n solives, entraxe réel = largeur / (n + 1) ≤ entraxe choisi
    const W = tmax - tmin, nL = Math.max(1, Math.ceil(W / e - 1e-9) - 1), lines = [];
    for (let k = 1; k <= nL; k++) lines.push(tmin + W * k / (nL + 1));
    const joists = [];
    lines.forEach(t => {
      const xs = [];
      edges.forEach(ed => { const da = dot(ed.a, v) - t, db = dot(ed.b, v) - t;
        if ((da < 0 && db >= 0) || (da >= 0 && db < 0)) { const s = da / (da - db); xs.push({ p: { x: ed.a.x + s * (ed.b.x - ed.a.x), z: ed.a.z + s * (ed.b.z - ed.a.z) }, ed }); } });
      xs.sort((a, b) => dot(a.p, u) - dot(b.p, u));
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const A = xs[k], B = xs[k + 1], L = dist(A.p, B.p);
        if (L < 0.3) continue;
        joists.push({ a: A.p, b: B.p, span: L, ends: [A.ed.kind, B.ed.kind], edges: [A.ed, B.ed], rim: false });
      }
    });
    edges.filter(ed => ed.kind === 'rive').forEach(ed => joists.push({ a: ed.a, b: ed.b, span: ed.len, ends: ['poutre', 'poutre'], edges: [null, null], rim: true }));
    if (!joists.length) errors.push('mezzanine trop petite pour une solive');

    // ---- contrôles ----
    const jSpan = Math.max(0, ...joists.map(j => j.span));
    const jChk = Object.assign(F.checkPiece(js, jSpan, G * e, Q * e), { section: o.joistSection, width: e });
    // poutres : charge = demi-portée des solives qui s'y posent ; poteaux intermédiaires ajoutés tant que ça ne passe pas
    const posts = [];
    const vertexOnWall = p => wallSec.some((a, j) => { const b = wallSec[(j + 1) % wallSec.length], ab = { x: b.x - a.x, z: b.z - a.z }, l2 = dot(ab, ab) || 1,
      s = Math.max(0, Math.min(1, dot({ x: p.x - a.x, z: p.z - a.z }, ab) / l2)); return dist(p, { x: a.x + s * ab.x, z: a.z + s * ab.z }) < 0.05; });
    const beamChk = beams.map((b, i) => {
      const on = joists.filter(j => !j.rim && j.edges.some(ed => ed && b.edges.indexOf(ed) >= 0));
      const tw = Math.max(0.3, ...on.map(j => j.span / 2));
      let n = 0, chk;
      for (n = 0; n <= 8; n++) { chk = F.checkPiece(bs, b.len / (n + 1), G * tw, Q * tw); if (chk.ok) break; }
      if (!chk.ok) n = 8;
      b.inner = n; b.span = b.len / (n + 1); b.trib = tw;
      // poteaux : bouts libres (pas contre la paroi) + intermédiaires
      const qdLine = 1.35 * G * tw + 1.5 * Q * tw;
      [b.a, b.b].forEach(p => { if (!vertexOnWall(p)) addPost(posts, p, qdLine * b.span / 2); });
      for (let k = 1; k <= n; k++) addPost(posts, { x: b.a.x + (b.b.x - b.a.x) * k / (n + 1), z: b.a.z + (b.b.z - b.a.z) * k / (n + 1) }, qdLine * b.span);
      return Object.assign(chk, { section: o.beamSection, width: tw, posts: n, key: 'poutre' + (i + 1) });
    });
    const hPost = Math.max(0.3, mezz.h - DECK - Math.max(js.d, bs.d));
    const postChk = posts.length ? Object.assign(F.checkPost(ps, hPost, Math.max(...posts.map(p => p.N))), { section: o.postSection }) : null;
    const thickNeed = DECK + Math.max(js.d, bs.d);
    if ((mezz.thick || 0) + 1e-9 < thickNeed) warnings.push('Épaisseur réglée ' + Math.round((mezz.thick || 0) * 1000) + ' mm < plancher + ossature ' + Math.round(thickNeed * 1000) + ' mm : régler l\'épaisseur à ' + String(Math.ceil(thickNeed * 100) / 100).replace('.', ',') + ' m');
    if (joists.some(j => j.ends.indexOf('paroi') >= 0)) warnings.push('Appui sur la paroi : lambourde vissée aux montants du dôme — la charge passe dans la structure du dôme, 🟠 à vérifier');
    const ok = !errors.length && jChk.ok && beamChk.every(c => c.ok) && (!postChk || postChk.ok);
    if (!ok && !errors.length) {
      if (!jChk.ok) jChk.suggest = suggest(F, o.joistSection, sc => F.checkPiece(sc, jSpan, G * e, Q * e).ok);
      if (postChk && !postChk.ok) postChk.suggest = suggestPost(F, sc => F.checkPost(sc, hPost, postChk.N).ok);
    }

    // ---- pièces à couper ----
    // biais en plan : angle entre la solive et la perpendiculaire au bord (0 = coupe d'équerre)
    const angleTo = (ed, d) => Math.acos(Math.min(1, Math.abs(dot(d, { x: ed.dir.z, z: -ed.dir.x })))) * 180 / Math.PI;
    const jPieces = joists.map(j => {
      const d = { x: (j.b.x - j.a.x) / j.span, z: (j.b.z - j.a.z) / j.span };
      let len = j.span;
      const cuts = j.edges.map((ed, k) => {
        if (j.rim || !ed) return 0;
        const th = angleTo(ed, d);                                  // biais en plan (0 = d'équerre)
        len -= ed.kind === 'paroi' ? WALL_GAP : bs.w / 2 / Math.max(0.2, Math.cos(th * Math.PI / 180));
        return th;
      });
      if (j.rim) len -= bs.w;                                        // solive de rive entre les poutres
      return { axis: j.span, len, miter: cuts, what: j.rim ? 'solive de rive' : 'solive' };
    });
    const bPieces = global.Lumber ? global.Lumber.framePieces(beams.map(b => ({ a: b.a, b: b.b })), bs.w, o.joint).map(p => Object.assign(p, { what: 'poutre de rive' })) : [];
    const pPieces = posts.map(() => ({ axis: hPost, len: hPost, miter: [0, 0], what: 'poteau' }));
    const deckArea = area(poly);

    return { ok, errors, warnings, options: o, sections: { joist: js, beam: bs, post: ps }, spacing: e, joists, beams, posts, postHeight: hPost,
      check: { joist: jChk, beams: beamChk, post: postChk }, pieces: { joists: jPieces, beams: bPieces, posts: pPieces }, deckArea, thickNeed };
  }
  function addPost(posts, p, N) {
    const q = posts.find(x => dist(x.at, p) < 0.05);
    if (q) q.N += N; else posts.push({ at: { x: p.x, z: p.z }, N });
  }
  function area(poly) { let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p.x * q.z - q.x * p.z; }); return Math.abs(a) / 2; }
  function suggest(F, cur, test) {
    const fam = cur.split('-')[0], list = Object.keys(F.SECTIONS).filter(k => k.split('-')[0] === fam && !F.SECTIONS[k].post)
      .sort((a, b) => F.SECTIONS[a].w * F.SECTIONS[a].d - F.SECTIONS[b].w * F.SECTIONS[b].d);
    return list.find(k => test(Object.assign({ grade: 'C24' }, F.SECTIONS[k]))) || null;
  }
  function suggestPost(F, test) {
    return Object.keys(F.SECTIONS).filter(k => F.SECTIONS[k].post).find(k => test(F.SECTIONS[k])) || null;
  }

  const MezzFrame = { DEFAULTS, SPACINGS, DECK, layout, onWall, area };
  if (typeof module !== 'undefined' && module.exports) module.exports = MezzFrame;
  else global.MezzFrame = MezzFrame;
})(typeof window !== 'undefined' ? window : globalThis);
