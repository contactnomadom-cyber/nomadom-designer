
// ---------------------------------------------------------
// kumiko-layout.js — Panneaux Kumiko posés sur les triangles du dôme
// (mission NOMAD-2026-003, aperçu). Logique pure, sans DOM, testée sous Node
// (tests/node/kumiko-layout.test.js).
//
// Image : on pose un gabarit de vitrail dans chaque triangle choisi. Le
// moteur Kumiko (kumiko.js) dessine le motif à plat, en millimètres ; ce
// module le pose dans le plan du triangle, côté intérieur du dôme, en mètres.
//
// Identité d'un triangle : ses trois nœuds (« N3-N7-N12 »), comme les
// ouvertures. Elle ne change pas avec le diamètre ; elle change si la
// géométrie du dôme change (fréquence, coupe…) : le panneau est alors signalé
// « absent de ce dôme » et gardé dans l'aménagement.
//
// APERÇU 🟠 : les cotes sont d'axe à axe (lattes, cadre et montants sans
// épaisseur) et le panneau prend le triangle nœud à nœud. Aucune liste de
// débit n'est produite ici (décision de Nathan, 01/11/2026).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const DENSITY_MAX = 6;
  const CENTERS = ['centroid', 'incenter'];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; };
  const v3 = p => [p.x, p.y, p.z];

  // clé d'un triangle : ses 3 étiquettes de nœuds, triées par numéro
  function faceKey(pointIds, labels) {
    return pointIds.map(id => labels.get(id)).sort((a, b) => +a.slice(1) - +b.slice(1)).join('-');
  }
  // toutes les faces du dôme (y compris celles retirées par une ouverture : un kumiko peut garnir une fenêtre)
  function faceKeys(dome, labels) {
    return (dome.allFaces || dome.faces).map(f => faceKey(f.pointIds, labels));
  }

  // Repère d'un triangle 3D : origine A, axe x vers B, axe y dans le plan, normale vers l'extérieur.
  // center = un point intérieur du dôme (sur l'axe), pour orienter la normale.
  function frameOf(P, center) {
    const A = P[0], ex = norm(sub(P[1], A));
    let n = norm(cross(sub(P[1], A), sub(P[2], A)));
    const g = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3, (P[0][2] + P[1][2] + P[2][2]) / 3];
    if (dot(n, sub(g, center)) < 0) n = n.map(x => -x);
    const ey = cross(n, ex);
    return { A, ex, ey, n };
  }
  const to2D = (F, p) => { const d = sub(p, F.A); return { x: dot(d, F.ex), y: dot(d, F.ey) }; };

  // Panneau posé sur une face. P = 3 points [x, y, z] en m ; opts = { pattern, density, center } ;
  // inset = distance (m) vers l'intérieur du dôme, sous les montants.
  // Renvoie { tri2D (mm), panel (sortie de Kumiko.generatePanel, mm), segments3D: [{ kind, a, b }] (m), summary }.
  function placePanel(Kumiko, P, opts, center, inset) {
    const F = frameOf(P, center);
    const tri2D = P.map(p => { const q = to2D(F, p); return { x: q.x * 1000, y: q.y * 1000 }; });
    const panel = Kumiko.generatePanel(tri2D, opts);
    const back = q => [0, 1, 2].map(k => F.A[k] + (q.x / 1000) * F.ex[k] + (q.y / 1000) * F.ey[k] - inset * F.n[k]);
    const seg = kind => s => ({ kind, a: back(s.p1), b: back(s.p2) });
    const segments3D = [].concat(panel.waku.map(seg('waku')), panel.jigumi.map(seg('jigumi')), panel.tsukeko.map(seg('tsukeko')));
    return { tri2D, panel, segments3D, summary: summarize(panel) };
  }

  // chiffres d'un panneau (mm, degrés), arrondis pour l'affichage — cotes indicatives
  function summarize(panel) {
    const r1 = v => Math.round(v * 10) / 10;
    const tL = panel.tsukeko.map(t => t.axisLength), bev = panel.tsukeko.flatMap(t => [t.end1.leftBevel, t.end1.rightBevel, t.end2.leftBevel, t.end2.rightBevel]);
    return {
      waku: panel.waku.map(s => r1(s.axisLength)),
      jigumi: panel.jigumi.length,
      tsukeko: panel.tsukeko.length,
      tsukekoMin: tL.length ? r1(Math.min(...tL)) : null, tsukekoMax: tL.length ? r1(Math.max(...tL)) : null,
      bevelMin: bev.length ? r1(Math.min(...bev)) : null, bevelMax: bev.length ? r1(Math.max(...bev)) : null
    };
  }

  // Tous les panneaux d'un aménagement. dome = CoverApp.dome() (structure), labels = étiquettes du dôme nominal,
  // panels = st.kumiko.panels, yShift = décalage vertical du Design (sol à 0), sphereCenterY = centre de la
  // sphère dans le repère du Design. Renvoie [{ panel: entrée, key, ok, error?, place? }].
  function layout(Kumiko, dome, labels, panels, yShift, sphereCenterY, inset) {
    const faces = dome.allFaces || dome.faces, byKey = new Map();
    faces.forEach(f => byKey.set(faceKey(f.pointIds, labels), f));
    const center = [0, sphereCenterY, 0];
    return (panels || []).map(pn => {
      const f = byKey.get(pn.face);
      if (!f) return { panel: pn, key: pn.face, ok: false, error: 'absent de ce dôme' };
      const P = f.pointIds.map(id => { const p = dome.pointById.get(id); return [p.x, p.y - yShift, p.z]; });
      try { return { panel: pn, key: pn.face, ok: true, place: placePanel(Kumiko, P, pn, center, inset) }; }
      catch (e) { return { panel: pn, key: pn.face, ok: false, error: e.message }; }
    });
  }

  // Triangle sous un clic dans la vue 3D du Design (même caméra que design3d-three.js / design3d.js).
  // tris = model.tris (points {x,y,z}, repère du Design) ; cam = { yaw, pitch, dist, target } ;
  // ndc = position du clic dans [-1, 1]² (y vers le haut) ; aspect = largeur / hauteur ; fovDeg ≈ 40.
  // cut = vue « toile en coupe » : ce qui est devant le plan de coupe (côté caméra) est ignoré, comme à l'écran.
  // Renvoie l'index du triangle touché le plus proche, ou -1.
  function pickFace(tris, cam, ndcX, ndcY, aspect, fovDeg, cut) {
    const E = [cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.target[1] + cam.dist * Math.sin(cam.pitch), cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
    const f = norm(sub(cam.target, E)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), t = Math.tan((fovDeg || 40) * Math.PI / 360);
    const D = norm([0, 1, 2].map(k => f[k] + ndcX * t * aspect * r[k] + ndcY * t * u[k]));
    const hx = Math.sin(cam.yaw), hz = Math.cos(cam.yaw);
    let best = -1, bt = Infinity;
    tris.forEach((tr, i) => {
      const P0 = v3(tr[0]), e1 = sub(v3(tr[1]), P0), e2 = sub(v3(tr[2]), P0), p = cross(D, e2), det = dot(e1, p);
      if (Math.abs(det) < 1e-12) return;
      const s = sub(E, P0), uu = dot(s, p) / det; if (uu < 0 || uu > 1) return;
      const q = cross(s, e1), vv = dot(D, q) / det; if (vv < 0 || uu + vv > 1) return;
      const tt = dot(e2, q) / det; if (tt <= 1e-6 || tt >= bt) return;
      if (cut) { const H = [0, 1, 2].map(k => E[k] + D[k] * tt); if (hx * H[0] + hz * H[2] > 0.15) return; }
      bt = tt; best = i;
    });
    return best;
  }

  // motifs proposés dans l'interface : seulement ceux validés
  function validPatterns(Kumiko) {
    return Object.keys(Kumiko.PATTERNS).filter(k => Kumiko.PATTERNS[k].status === 'valid').map(k => ({ id: k, name: Kumiko.PATTERNS[k].name }));
  }

  const KumikoLayout = { DENSITY_MAX, CENTERS, faceKey, faceKeys, frameOf, placePanel, summarize, layout, pickFace, validPatterns };
  if (typeof module !== 'undefined' && module.exports) module.exports = KumikoLayout;
  else global.KumikoLayout = KumikoLayout;
})(typeof window !== 'undefined' ? window : globalThis);
