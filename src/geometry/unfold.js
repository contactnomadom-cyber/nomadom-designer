
// ---------------------------------------------------------
// unfold.js — Développement 2D des triangles du dôme (A10, étape 3)
// Logique pure sortie de l'interface (app.js), sans DOM :
//  - classe de montant la plus proche d'une longueur ;
//  - un triangle 3D posé à plat (côté 1 sur l'axe x) ;
//  - triangles de base : les formes distinctes qui composent le dôme ;
//  - dépliage d'un groupe de faces connectées, et chevauchements (SAT).
// Unités : mètres. Testé sous Node : tests/node/unfold.test.js.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  // classe de montant (A, B, C…) dont la longueur est la plus proche
  function classifyLength(dome, len) {
    let best = null, bestDiff = Infinity;
    dome.edgeClasses.forEach(g => {
      const diff = Math.abs(g.length - len);
      if (diff < bestDiff) { bestDiff = diff; best = g; }
    });
    return best;
  }

  // triangle 3D → 2D : A en (0,0), B sur l'axe x, C au-dessus
  function flattenTriangle(P0, P1, P2) {
    const lAB = d3(P0, P1), lAC = d3(P0, P2), lBC = d3(P1, P2);
    const Ax = 0, Ay = 0, Bx = lAB, By = 0;
    const cosA = (lAB * lAB + lAC * lAC - lBC * lBC) / (2 * lAB * lAC);
    const angleA = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const Cx = lAC * Math.cos(angleA);
    const Cy = lAC * Math.sin(angleA);
    const angleAtA = angleA;
    const cosB = (lAB * lAB + lBC * lBC - lAC * lAC) / (2 * lAB * lBC);
    const angleAtB = Math.acos(Math.max(-1, Math.min(1, cosB)));
    const angleAtC = Math.PI - angleAtA - angleAtB;
    return {
      pts: [{ x: Ax, y: Ay }, { x: Bx, y: By }, { x: Cx, y: Cy }],
      edges: [lAB, lBC, lAC],
      angles: [angleAtA, angleAtB, angleAtC]
    };
  }

  // Triangles de base : les différentes formes de triangle qui composent le dôme
  // pour les options de construction choisies. Deux faces sont du même type si
  // leurs 3 côtés coïncident à 0,5 mm près (un symétrique = même type).
  // Renvoie les types triés du plus petit au plus grand, nommés T1, T2…
  function baseTriangleTypes(dome) {
    const types = [];
    dome.faces.forEach(f => {
      const P = f.pointIds.map(id => dome.pointById.get(id));
      const L = [d3(P[0], P[1]), d3(P[1], P[2]), d3(P[2], P[0])].sort((a, b) => a - b);
      let t = types.find(t => t.L.every((v, i) => Math.abs(v - L[i]) < 0.0005));
      if (!t) { t = { L, faces: [] }; types.push(t); }
      t.faces.push(f.index);
    });
    types.sort((a, b) => (a.L[0] + a.L[1] + a.L[2]) - (b.L[0] + b.L[1] + b.L[2]));
    const cls = len => classifyLength(dome, len).name;
    types.forEach((t, i) => {
      t.id = 'T' + (i + 1);
      t.cls = t.L.map(cls);
      // base posée à plat : le côté « différent » d'un isocèle, sinon le plus long
      let bi = 2;
      if (Math.abs(t.L[0] - t.L[1]) < 0.0005 && Math.abs(t.L[1] - t.L[2]) >= 0.0005) bi = 2;
      else if (Math.abs(t.L[1] - t.L[2]) < 0.0005 && Math.abs(t.L[0] - t.L[1]) >= 0.0005) bi = 0;
      const b = t.L[bi], o = t.L.filter((_, k) => k !== bi), l1 = o[0], l2 = o[1];
      const ax = (b * b + l1 * l1 - l2 * l2) / (2 * b), ay = Math.sqrt(Math.max(0, l1 * l1 - ax * ax));
      t.pts = [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: ax, y: ay }];
      t.sides = [{ len: b, cls: cls(b) }, { len: l2, cls: cls(l2) }, { len: l1, cls: cls(l1) }]; // 0-1, 1-2, 2-0
      const ang = (p, q, r) => { const ux = q.x - p.x, uy = q.y - p.y, vx = r.x - p.x, vy = r.y - p.y; return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))))) * 180 / Math.PI; };
      t.angles = [ang(t.pts[0], t.pts[1], t.pts[2]), ang(t.pts[1], t.pts[2], t.pts[0]), ang(t.pts[2], t.pts[0], t.pts[1])];
      t.area = b * ay / 2;
      t.height = ay;
      const eq = Math.abs(t.L[0] - t.L[2]) < 0.0005, iso = !eq && (Math.abs(t.L[0] - t.L[1]) < 0.0005 || Math.abs(t.L[1] - t.L[2]) < 0.0005);
      t.kind = eq ? 'équilatéral' : (iso ? 'isocèle' : 'quelconque');
    });
    return types;
  }

  // Dépliage d'un groupe connecté : la face de plus petit n° est posée à plat,
  // puis chaque voisine est rabattue autour de l'arête commune, du côté opposé.
  function unfoldGroup(dome, faceIndices) {
    const idSet = new Set(faceIndices);
    const localAdj = new Map();
    faceIndices.forEach(idx => {
      localAdj.set(idx, (dome.faceAdjacency[idx] || []).filter(a => idSet.has(a.neighbor)));
    });

    const placedPts = new Map();
    const placements = [];
    const visited = new Set();

    function placeRoot(idx) {
      const f = dome.faces[idx];
      const P = f.pointIds.map(id => dome.pointById.get(id));
      const flat = flattenTriangle(P[0], P[1], P[2]);
      f.pointIds.forEach((id, i) => { if (!placedPts.has(id)) placedPts.set(id, flat.pts[i]); });
      placements.push({ idx, pointIds: f.pointIds.slice() });
      visited.add(idx);
    }

    function placeNeighbor(idx, sharedEdgePointIds) {
      const f = dome.faces[idx];
      const unknownId = f.pointIds.find(id => sharedEdgePointIds.indexOf(id) === -1);
      const [id1, id2] = sharedEdgePointIds;
      const P1 = placedPts.get(id1), P2 = placedPts.get(id2);

      const p3 = dome.pointById;
      const d1 = d3(p3.get(unknownId), p3.get(id1));
      const d2 = d3(p3.get(unknownId), p3.get(id2));

      const dx = P2.x - P1.x, dy = P2.y - P1.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const a = (d1 * d1 - d2 * d2 + d * d) / (2 * d);
      const hh = Math.sqrt(Math.max(0, d1 * d1 - a * a));
      const xm = P1.x + a * dx / d, ym = P1.y + a * dy / d;
      const rx = -dy / d, ry = dx / d;
      const sol1 = { x: xm + hh * rx, y: ym + hh * ry };
      const sol2 = { x: xm - hh * rx, y: ym - hh * ry };

      let refPoint = null;
      for (const pl of placements) {
        if (pl.pointIds.indexOf(id1) !== -1 && pl.pointIds.indexOf(id2) !== -1) {
          const otherId = pl.pointIds.find(id => id !== id1 && id !== id2);
          refPoint = placedPts.get(otherId);
          break;
        }
      }
      function side(pt) { return (P2.x - P1.x) * (pt.y - P1.y) - (P2.y - P1.y) * (pt.x - P1.x); }
      const refSide = refPoint ? side(refPoint) : 1;
      const chosen = (side(sol1) * refSide < 0) ? sol1 : sol2;

      if (!placedPts.has(unknownId)) placedPts.set(unknownId, chosen);
      placements.push({ idx, pointIds: f.pointIds.slice() });
      visited.add(idx);
    }

    const root = Math.min(...faceIndices);
    placeRoot(root);
    let frontier = [root];
    while (frontier.length) {
      const next = [];
      frontier.forEach(idx => {
        (localAdj.get(idx) || []).forEach(a => {
          if (!visited.has(a.neighbor)) {
            placeNeighbor(a.neighbor, a.edgePointIds);
            next.push(a.neighbor);
          }
        });
      });
      frontier = next;
    }

    const unreached = faceIndices.filter(idx => !visited.has(idx));
    return { placements, placedPts, unreached };
  }

  function projectOntoAxis(pts, axis) {
    let min = Infinity, max = -Infinity;
    pts.forEach(p => { const d = p.x * axis.x + p.y * axis.y; if (d < min) min = d; if (d > max) max = d; });
    return [min, max];
  }

  // profondeur de recouvrement de deux triangles 2D (0 = disjoints), théorème des axes séparateurs
  function trianglesOverlapDepthSAT(pts1, pts2) {
    const edgesOf = pts => [[pts[0], pts[1]], [pts[1], pts[2]], [pts[2], pts[0]]];
    const axes = [];
    edgesOf(pts1).concat(edgesOf(pts2)).forEach(([a, b]) => {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      axes.push({ x: -dy / len, y: dx / len });
    });
    let minDepth = Infinity;
    for (const axis of axes) {
      const [min1, max1] = projectOntoAxis(pts1, axis);
      const [min2, max2] = projectOntoAxis(pts2, axis);
      const depth = Math.min(max1, max2) - Math.max(min1, min2);
      if (depth <= 1e-9) return 0;
      if (depth < minDepth) minDepth = depth;
    }
    return minDepth;
  }

  // paires de faces dépliées qui se recouvrent au-delà de la tolérance (m)
  function detectOverlaps(placements, placedPts, toleranceM) {
    toleranceM = toleranceM || 0;
    const overlaps = [];
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const A = placements[i], B = placements[j];
        const shared = A.pointIds.some(id => B.pointIds.indexOf(id) !== -1);
        if (shared) continue;
        const ptsA = A.pointIds.map(id => placedPts.get(id));
        const ptsB = B.pointIds.map(id => placedPts.get(id));
        const depth = trianglesOverlapDepthSAT(ptsA, ptsB);
        if (depth > toleranceM) overlaps.push({ a: A.idx, b: B.idx, depth });
      }
    }
    return overlaps;
  }

  const Unfold = { classifyLength, flattenTriangle, baseTriangleTypes, unfoldGroup, trianglesOverlapDepthSAT, detectOverlaps };
  if (typeof module !== 'undefined' && module.exports) module.exports = Unfold;
  else global.Unfold = Unfold;
})(typeof window !== 'undefined' ? window : globalThis);
