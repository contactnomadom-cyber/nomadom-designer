// ---------------------------------------------------------
// tuilage.js — sens d'écoulement de l'eau et côté DESSUS / DESSOUS
// de chaque bord de morceau (comme des tuiles : celle du haut
// recouvre celle du bas). Logique pure, testable sous Node.
//  - A (recouvrant) → DESSUS  : ce bord passe par-dessus le voisin
//  - B (recouvert)  → DESSOUS : ce bord glisse sous le voisin
//  - H              → OURLET  : bord libre (bas du dôme, ouverture)
// Les hauteurs viennent de pieceSheet (points[].h, triangles[].h).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const SIDES = {
    A: { key: 'A', word: 'DESSUS', color: '#1f6fd1', rgb: [31, 111, 209], hint: 'ce bord passe PAR-DESSUS le morceau voisin' },
    B: { key: 'B', word: 'DESSOUS', color: '#d9700a', rgb: [217, 112, 10], hint: 'ce bord glisse SOUS le morceau voisin' },
    H: { key: 'H', word: 'OURLET', color: '#5d656c', rgb: [93, 101, 108], hint: 'bord libre, replié en ourlet' }
  };
  const WATER = '#2a8fbf';

  function side(e) { return SIDES[e && e.side] || SIDES.H; }
  function edgeText(e) {
    const s = side(e);
    return s.word + (e.other ? ' ↔ ' + e.other : (e.kind === 'fermeture' ? ' (fermeture)' : ''));
  }

  // Pente d'un triangle posé à plat : sommets 2D (pts) + hauteurs réelles (h).
  // La pose à plat conserve les longueurs : la pente calculée dans le plan du patron
  // est exactement celle du triangle sur le dôme. d = sens où l'eau descend (unitaire).
  function triFlow(t) {
    if (!t || !t.h || !t.pts) return null;
    const p0 = t.pts[0], p1 = t.pts[1], p2 = t.pts[2];
    const ax = p1.x - p0.x, ay = p1.y - p0.y, bx = p2.x - p0.x, by = p2.y - p0.y;
    const da = t.h[1] - t.h[0], db = t.h[2] - t.h[0];
    const det = ax * by - ay * bx;
    if (Math.abs(det) < 1e-12) return null;
    const gx = (da * by - db * ay) / det, gy = (ax * db - bx * da) / det, g = Math.hypot(gx, gy);
    const c = { x: (p0.x + p1.x + p2.x) / 3, y: (p0.y + p1.y + p2.y) / 3 };
    if (g < 1e-9) return { c, d: null, slope: 0 };
    return { c, d: { x: -gx / g, y: -gy / g }, slope: Math.asin(Math.min(1, g)) * 180 / Math.PI };
  }
  function sheetFlow(sheet) { return (sheet.triangles || []).map(triFlow).filter(Boolean); }

  // Pente d'une face du dôme en 3D (y vers le haut) : sens de descente dans le plan de la face.
  function faceFlow3D(dome, fi) {
    const P = dome.faces[fi].pointIds.map(id => dome.pointById.get(id));
    const e1 = { x: P[1].x - P[0].x, y: P[1].y - P[0].y, z: P[1].z - P[0].z };
    const e2 = { x: P[2].x - P[0].x, y: P[2].y - P[0].y, z: P[2].z - P[0].z };
    let n = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
    const nl = Math.hypot(n.x, n.y, n.z) || 1; n = { x: n.x / nl, y: n.y / nl, z: n.z / nl };
    const c = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3, z: (P[0].z + P[1].z + P[2].z) / 3 };
    if (n.x * c.x + n.y * c.y + n.z * c.z < 0) n = { x: -n.x, y: -n.y, z: -n.z }; // normale vers l'extérieur
    // (0,-1,0) projeté dans le plan de la face
    const k = -n.y;
    const d = { x: -k * n.x, y: -1 - k * n.y, z: -k * n.z }, dl = Math.hypot(d.x, d.y, d.z);
    const size = (Math.hypot(e1.x, e1.y, e1.z) + Math.hypot(e2.x, e2.y, e2.z)) / 2;
    return { c, n, size, d: dl < 1e-9 ? null : { x: d.x / dl, y: d.y / dl, z: d.z / dl }, slope: Math.acos(Math.min(1, Math.abs(n.y))) * 180 / Math.PI };
  }

  const ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
  // nom du morceau | arête (ids de nœuds) → côté A / B / H
  function seamSides(sheets) {
    const m = new Map();
    sheets.forEach(sh => sh && sh.edges.forEach(e => { if (e.nodeIds) m.set(sh.name + '|' + ek(e.nodeIds[0], e.nodeIds[1]), e.side); }));
    return m;
  }

  // Contrôle d'étanchéité : sur une couture d'étage, le bord DESSUS doit être le bord BAS
  // du morceau (le morceau du haut recouvre celui du bas, comme une tuile) ; le bord DESSOUS
  // est le bord HAUT. Renvoie la liste des bords à l'envers.
  function checkSheet(sheet) {
    const P = sheet.points, n = P.length, issues = [];
    if (!P.every(p => typeof p.h === 'number')) return issues;
    const hMean = P.reduce((s, p) => s + p.h, 0) / n;
    sheet.edges.forEach((e, i) => {
      if (e.kind !== 'etage') return;
      const hE = (P[i].h + P[(i + 1) % n].h) / 2;
      if (e.side === 'A' && !(hE < hMean)) issues.push(sheet.name + ' ' + e.from + '→' + e.to + ' : DESSUS sur le bord haut (l\'eau entrerait sous le recouvrement)');
      if (e.side === 'B' && !(hE > hMean)) issues.push(sheet.name + ' ' + e.from + '→' + e.to + ' : DESSOUS sur le bord bas (l\'eau entrerait sous le recouvrement)');
    });
    return issues;
  }

  // Flèche « eau » sur un canevas 2D : base (x, y), sens (dx, dy) unitaire, longueur len (px).
  function arrow(ctx, x, y, dx, dy, len, color, lw) {
    const ex = x + dx * len, ey = y + dy * len, hs = Math.max(4, len * 0.32), w = lw || 2;
    ctx.save();
    ctx.strokeStyle = color || WATER; ctx.fillStyle = color || WATER; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex - dx * hs * 0.6, ey - dy * hs * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex - dx * hs - dy * hs * 0.55, ey - dy * hs + dx * hs * 0.55);
    ctx.lineTo(ex - dx * hs + dy * hs * 0.55, ey - dy * hs - dx * hs * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Même flèche en SVG (fiches imprimées) : centrée sur (x, y).
  function arrowSvg(x, y, dx, dy, len, color) {
    const f = v => v.toFixed(1), c = color || WATER;
    const x0 = x - dx * len / 2, y0 = y - dy * len / 2, ex = x + dx * len / 2, ey = y + dy * len / 2, hs = Math.max(4, len * 0.32);
    return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(ex - dx * hs * 0.6)}" y2="${f(ey - dy * hs * 0.6)}" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<polygon points="${f(ex)},${f(ey)} ${f(ex - dx * hs - dy * hs * 0.55)},${f(ey - dy * hs + dx * hs * 0.55)} ${f(ex - dx * hs + dy * hs * 0.55)},${f(ey - dy * hs - dx * hs * 0.55)}" fill="${c}"/>`;
  }

  const LEGEND = 'Tuilage : 💧 flèche = l\'eau descend · bleu DESSUS = ce bord recouvre le voisin · orange DESSOUS = ce bord passe sous le voisin';

  const Tuilage = { SIDES, WATER, LEGEND, side, edgeText, triFlow, sheetFlow, faceFlow3D, seamSides, checkSheet, arrow, arrowSvg, edgeKey: ek };
  if (typeof module !== 'undefined' && module.exports) module.exports = Tuilage;
  else global.CoverTuilage = Tuilage;
})(typeof window !== 'undefined' ? window : globalThis);
