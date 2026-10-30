// ---------------------------------------------------------
// kumiko.js — Panneaux décoratifs Kumiko (option de l'aménagement Design)
// Mission NOMAD-2026-002 : moteur repris du projet Claude « Acidome Cover+ »
// (kumiko-engine.js, étape K1), logique inchangée, noms passés en anglais.
// Vocabulaire d'atelier conservé (docs/glossary.md) : kumiko, waku (cadre),
// jigumi (grille de lattes), tsukeko (pièces du motif).
//
// Fonctions pures, sans DOM, sans dépendance à dome-engine.js.
//  - Un motif est défini UNE FOIS dans un triangle de référence, en
//    coordonnées barycentriques (u, v, w) avec u + v + w = 1.
//  - Il est projeté par application affine sur le triangle réel :
//      P = u·A + v·B + w·C
//  - Le panneau est subdivisé en density² petits triangles (jigumi) et le
//    motif (tsukeko) est répété dans chacun.
// L'application affine conserve les droites, le parallélisme et les rapports
// de longueur sur une droite, mais PAS les angles : les biseaux sont donc
// recalculés sur le triangle réel, jamais supposés à 30° / 60°.
//
// Unités : mm et degrés (écart avec les mètres du moteur de dôme, ADR-0001
// §7 — à trancher avant le branchement sur Design, voir le bilan de mission).
// Pas encore dans le HTML assemblé (absent de build/manifest.json).
// Testé sous Node : tests/node/kumiko.test.js.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const EPS = 1e-9;
  const DEG = 180 / Math.PI;

  // --- Outils 2D ---
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const len = (v) => Math.hypot(v.x, v.y);
  const dist = (a, b) => len(sub(a, b));
  const angleOf = (v) => Math.atan2(v.y, v.x); // radians
  // angle (0..2π) en tournant dans le sens trigonométrique de a vers b
  const ccwGap = (a, b) => { let d = b - a; while (d <= EPS) d += 2 * Math.PI; while (d > 2 * Math.PI + EPS) d -= 2 * Math.PI; return d; };

  // --- Barycentriques ---
  /** Point barycentrique. Les coordonnées doivent sommer à 1. */
  function bary(u, v, w) { return [u, v, w]; }
  const barySum = (b) => b[0] + b[1] + b[2];

  /** Projection affine : barycentrique -> point 2D du triangle [A, B, C]. */
  function toCartesian(tri, b) {
    return {
      x: b[0] * tri[0].x + b[1] * tri[1].x + b[2] * tri[2].x,
      y: b[0] * tri[0].y + b[1] * tri[1].y + b[2] * tri[2].y
    };
  }

  /** Combinaison barycentrique dans un sous-triangle dont les sommets sont
   *  eux-mêmes donnés en barycentriques du panneau. */
  function composeBary(subTriBary, b) {
    return [0, 1, 2].map(k => b[0] * subTriBary[0][k] + b[1] * subTriBary[1][k] + b[2] * subTriBary[2][k]);
  }

  // --- Centre du motif dans un (sous-)triangle réel ---
  //  'centroid' : barycentre (1/3, 1/3, 1/3), invariant par application affine
  //  'incenter' : centre du cercle inscrit, (a, b, c)/(a+b+c), a = côté opposé à A
  function centerBary(tri2D, mode) {
    if (mode === 'incenter') {
      const a = dist(tri2D[1], tri2D[2]), b = dist(tri2D[2], tri2D[0]), c = dist(tri2D[0], tri2D[1]);
      const s = a + b + c;
      return [a / s, b / s, c / s];
    }
    return [1 / 3, 1 / 3, 1 / 3];
  }

  // --- Bibliothèque de motifs ---
  //  Chaque segment relie deux points symboliques : 'A','B','C' = sommets du
  //  petit triangle, 'O' = centre du motif, ou un tableau [u,v,w] explicite.
  //  status : 'valid' (géométrie sûre) | 'unconfirmed' (refusé tant que la
  //  définition n'est pas validée par Nathan). name = libellé d'interface.
  const PATTERNS = {
    mitsukude: { name: 'Mitsukude — grille triangulaire seule', status: 'valid', segments: [] },
    // 3 pièces par triangle, des 3 sommets vers le centre (asanoha traditionnel ;
    // pas de segments « centre -> milieux des côtés »).
    asanoha: { name: 'Asa-no-ha — feuille de chanvre', status: 'valid', segments: [['A', 'O'], ['B', 'O'], ['C', 'O']] },
    goma: { name: 'Goma — sésame', status: 'unconfirmed', segments: null },
    rindo: { name: 'Rindō — gentiane', status: 'unconfirmed', segments: null },
    kikko: { name: 'Kikkō — écaille de tortue', status: 'unconfirmed', segments: null }
  };

  function resolvePoint(sym, center) {
    if (Array.isArray(sym)) return sym;
    switch (sym) {
      case 'A': return [1, 0, 0];
      case 'B': return [0, 1, 0];
      case 'C': return [0, 0, 1];
      case 'O': return center;
      default: throw new Error('Point de motif inconnu : ' + sym);
    }
  }

  // --- Subdivision du panneau en density² petits triangles ---
  //  P(i,j) = ((n-i-j)/n, i/n, j/n)
  //  cellule 'up'   : P(i,j), P(i+1,j), P(i,j+1)        -> n(n+1)/2
  //  cellule 'down' : P(i+1,j), P(i+1,j+1), P(i,j+1)    -> n(n-1)/2
  //  Les deux sont orientées dans le même sens que le panneau.
  function subdivide(n) {
    if (!Number.isInteger(n) || n < 1) throw new Error('densité : entier >= 1 attendu');
    const P = (i, j) => [(n - i - j) / n, i / n, j / n];
    const res = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        res.push({ bary: [P(i, j), P(i + 1, j), P(i, j + 1)], orientation: 'up', ij: [i, j] });
        if (i + j <= n - 2) res.push({ bary: [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], orientation: 'down', ij: [i, j] });
      }
    }
    return res;
  }

  // --- Lattes du jigumi : 3 familles parallèles aux côtés, bord à bord ---
  //  famille k : coordonnée k constante = t/n, t = 1..n-1
  //  (k=0 : parallèle à BC, k=1 : parallèle à CA, k=2 : parallèle à AB)
  //  Le cadre (waku) = les 3 côtés du panneau.
  function jigumiLines(n) {
    const lines = [];
    for (let k = 0; k < 3; k++) {
      const k1 = (k + 1) % 3, k2 = (k + 2) % 3;
      for (let t = 1; t < n; t++) {
        const c = t / n;
        const a = [0, 0, 0], b = [0, 0, 0];
        a[k] = c; a[k1] = 1 - c;  // extrémité sur le côté où k2 = 0
        b[k] = c; b[k2] = 1 - c;  // extrémité sur le côté où k1 = 0
        lines.push({ family: k, rank: t, a, b });
      }
    }
    const waku = [
      { side: 'AB', a: [1, 0, 0], b: [0, 1, 0] },
      { side: 'BC', a: [0, 1, 0], b: [0, 0, 1] },
      { side: 'CA', a: [0, 0, 1], b: [1, 0, 0] }
    ];
    return { lines, waku };
  }

  // --- Biseaux d'une extrémité de tsukeko ---
  //  Au point P, dans SA cellule, on liste les rayons partant de P :
  //   - côtés de la cellule (lattes du jigumi ou cadre) : continus, la face de
  //     coupe s'appuie dessus -> biseau = angle entier ;
  //   - autres tsukeko de la même cellule finissant en P : coupe partagée ->
  //     biseau = moitié de l'angle (bissectrice).
  //  leftBevel / rightBevel = angle entre l'axe de la pièce et la face de coupe,
  //  vus en regardant la pièce vers cette extrémité (gauche = sens trigo dans
  //  le plan du panneau, face intérieure du dôme vers soi). tipAngle = gauche + droite.
  function raysAtPoint(P, cell2D, cellPieces, pieceIndex) {
    const rays = [];
    const pts = cell2D;
    let corner = -1;
    for (let k = 0; k < 3; k++) if (dist(P, pts[k]) < 1e-6) corner = k;
    if (corner >= 0) {
      // P est un coin de cellule : 2 côtés
      [pts[(corner + 1) % 3], pts[(corner + 2) % 3]].forEach(Q =>
        rays.push({ ang: angleOf(sub(Q, P)), type: 'lath' }));
    } else {
      // P sur un côté de la cellule : ce côté dans les deux sens
      for (let k = 0; k < 3; k++) {
        const A = pts[k], B = pts[(k + 1) % 3];
        const onSide = Math.abs(dist(A, P) + dist(P, B) - dist(A, B)) < 1e-6;
        if (onSide) {
          rays.push({ ang: angleOf(sub(A, P)), type: 'lath' });
          rays.push({ ang: angleOf(sub(B, P)), type: 'lath' });
        }
      }
    }
    cellPieces.forEach((pc, idx) => {
      if (idx === pieceIndex) return;
      if (dist(pc.p1, P) < 1e-6) rays.push({ ang: angleOf(sub(pc.p2, P)), type: 'tsukeko' });
      else if (dist(pc.p2, P) < 1e-6) rays.push({ ang: angleOf(sub(pc.p1, P)), type: 'tsukeko' });
    });
    return rays;
  }

  function endBevels(P, Q, cell2D, cellPieces, pieceIndex) {
    // P = extrémité étudiée, Q = autre extrémité ; l'axe vu depuis P pointe vers Q.
    const axis = angleOf(sub(Q, P));
    const rays = raysAtPoint(P, cell2D, cellPieces, pieceIndex);
    if (rays.length === 0) return { leftBevel: 90, rightBevel: 90, tipAngle: 180, free: true };
    let minCcw = Infinity, minCw = Infinity, nCcw = null, nCw = null;
    rays.forEach(r => {
      const dT = ccwGap(axis, r.ang), dH = ccwGap(r.ang, axis);
      if (dT < minCcw) { minCcw = dT; nCcw = r; }
      if (dH < minCw) { minCw = dH; nCw = r; }
    });
    const bevel = (d, r) => (r.type === 'lath' ? d : d / 2) * DEG;
    // En regardant la pièce depuis Q vers P, le côté trigo autour de P est la droite.
    const rightBevel = bevel(minCcw, nCcw), leftBevel = bevel(minCw, nCw);
    return {
      leftBevel, rightBevel, tipAngle: leftBevel + rightBevel,
      leftContact: nCw.type, rightContact: nCcw.type
    };
  }

  // --- Génération d'un panneau complet (2D) ---
  //  tri2D   : [A, B, C] points {x,y} en mm (contour du panneau)
  //  options : { pattern, density, center: 'centroid' | 'incenter' }
  function generatePanel(tri2D, options) {
    const opt = Object.assign({ pattern: 'asanoha', density: 2, center: 'centroid' }, options || {});
    const pattern = PATTERNS[opt.pattern];
    if (!pattern) throw new Error('Motif inconnu : ' + opt.pattern);
    if (pattern.status !== 'valid') throw new Error('Motif « ' + opt.pattern + ' » à confirmer : définition non validée');
    if (area(tri2D) <= EPS) throw new Error('Triangle dégénéré');

    const n = opt.density;
    const cells = subdivide(n).map((c, idx) => {
      const pts = c.bary.map(b => toCartesian(tri2D, b));
      return Object.assign({ index: idx, pts }, c);
    });

    const tsukeko = [];
    cells.forEach(cell => {
      const center = centerBary(cell.pts, opt.center);
      const pieces = pattern.segments.map(([s1, s2]) => {
        const b1 = composeBary(cell.bary, resolvePoint(s1, center));
        const b2 = composeBary(cell.bary, resolvePoint(s2, center));
        const p1 = toCartesian(tri2D, b1), p2 = toCartesian(tri2D, b2);
        return { cell: cell.index, orientation: cell.orientation, b1, b2, p1, p2, axisLength: dist(p1, p2) };
      });
      pieces.forEach((pc, i) => {
        pc.end1 = endBevels(pc.p1, pc.p2, cell.pts, pieces, i);
        pc.end2 = endBevels(pc.p2, pc.p1, cell.pts, pieces, i);
      });
      tsukeko.push(...pieces);
    });

    const jg = jigumiLines(n);
    const toSegment = l => Object.assign({}, l, { p1: toCartesian(tri2D, l.a), p2: toCartesian(tri2D, l.b), axisLength: dist(toCartesian(tri2D, l.a), toCartesian(tri2D, l.b)) });

    return {
      options: opt,
      pattern: pattern.name,
      triangle: tri2D,
      cells,
      jigumi: jg.lines.map(toSegment),
      waku: jg.waku.map(toSegment),
      tsukeko
    };
  }

  function area(t) {
    return Math.abs((t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[2].x - t[0].x) * (t[1].y - t[0].y)) / 2;
  }

  /** Triangle 2D à partir des trois longueurs de côtés.
   *  a = BC, b = CA, c = AB. A en (0,0), B sur l'axe x. */
  function triangleFromSides(a, b, c) {
    const x = (b * b + c * c - a * a) / (2 * c);
    const y = Math.sqrt(Math.max(0, b * b - x * x));
    if (!(y > EPS)) throw new Error('Longueurs incompatibles (inégalité triangulaire)');
    return [{ x: 0, y: 0 }, { x: c, y: 0 }, { x, y }];
  }

  const Kumiko = {
    PATTERNS, bary, barySum, toCartesian, composeBary, centerBary,
    subdivide, jigumiLines, generatePanel, triangleFromSides, area
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Kumiko;
  else global.Kumiko = Kumiko;
})(typeof window !== 'undefined' ? window : globalThis);
