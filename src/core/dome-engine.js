
/**
 * dome-engine.js
 * ------------------------------------------------------------------
 * Portage fidèle et validé du moteur géométrique d'ACIDOME CALC
 * (version-local 221027), limité pour l'instant au cas :
 *
 *    Icosahedron / Class I / V=3 Kruschke (5/9) et V=2 Chords pur (1/2)
 *
 * Sources exactes dans le fichier original (blocks extraits) :
 *   - Figure.Icosahedron          : génération des 12 sommets + 20 faces
 *                                    + rotation d'orientation "Pentad"
 *   - Figure.prototype.splitFaces : subdivision "Chords" (V quelconque)
 *   - Kruschke magic fix (V=3)    : MAGIC_FIX_RATIO = 0.9442890204731844
 *   - Figure.prototype.relations  : topologie sub/super (adjacence)
 *   - Figure.prototype.sliceByFraction : troncature par propagation
 *                                    de faces depuis le sommet supérieur
 *   - Figure.prototype.detectSelvage   : bord vs arête interne
 *
 * Validation (voir VALIDATION.md) :
 *   - 4 facteurs de corde A/B/C/D conformes aux valeurs de contrôle
 *     fournies (écart ~1e-8, dû à l'arrondi du magic ratio d'origine)
 *   - Comptage des struts du dôme tronqué "5/9" : 30xA, 35xB, 80xC, 20xD
 *     -> identique aux chiffres publiés par Domerama pour ce même modèle
 *     "3V 5/9 Kruschke flat base" (30/35/80/20, total 165 struts)
 *   - Bord de base (15 arêtes) : motif B-C-C x5, conforme à la
 *     description du modèle de référence
 * ------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------
  // Vecteur 3D minimal
  // ---------------------------------------------------------------
  class Vec3 {
    constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    scale(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() { const l = this.length(); return new Vec3(this.x / l, this.y / l, this.z / l); }
    distance(v) { return this.sub(v).length(); }
  }

  let POINT_ID = 0;
  function mkPoint(x, y, z, extra) {
    const p = new Vec3(x, y, z);
    p._id = POINT_ID++;
    Object.assign(p, extra || {});
    return p;
  }

  // ---------------------------------------------------------------
  // 1) Génération du polyèdre de base (Icosahedron)
  // ---------------------------------------------------------------
  function buildIcosahedron(opts) {
    opts = opts || {};
    const symmetry = opts.symmetry || 'Pentad';
    const axis = opts.axis || 'y';

    const a = 4 / Math.sqrt(2 * (5 + Math.sqrt(5))) / 2;
    const b = Math.sqrt(1 - a * a);

    const raw = [
      [-a, 0.0, b], [a, 0.0, b], [-a, 0.0, -b], [a, 0.0, -b],
      [0.0, b, a], [0.0, b, -a], [0.0, -b, a], [0.0, -b, -a],
      [b, a, 0.0], [-b, a, 0.0], [b, -a, 0.0], [-b, -a, 0.0]
    ];
    const points = raw.map(p => mkPoint(p[0], p[1], p[2], { pptPoint: true }));

    // orientation (voir Figure.Icosahedron, switch(params.symmetry))
    if (symmetry === 'Pentad') {
      const angle = Math.atan(a / b);
      rotateAroundAxis(points, angle, { y: 'x', z: 'y', x: 'z' }[axis]);
    } else if (symmetry === 'Triad') {
      const angle = Math.asin(2 / (Math.sqrt(3) + Math.sqrt(15)));
      rotateAroundAxis(points, angle, { y: 'z', z: 'x', x: 'y' }[axis]);
    }
    // 'Cross' : pas de rotation

    const faceIdx = [
      [0,4,1], [0,9,4], [9,5,4], [4,5,8], [4,8,1],
      [8,10,1], [8,3,10],[5,3,8], [5,2,3], [2,7,3],
      [7,10,3], [7,6,10], [7,11,6], [11,0,6], [0,1,6],
      [6,1,10], [9,0,11], [9,11,2], [9,2,5], [7,2,11]
    ];
    const faces = faceIdx.map(f => f.map(i => points[i]));
    return { points, faces };
  }

  function rotateAroundAxis(points, angle, axis) {
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    points.forEach(p => {
      let x2, y2, z2;
      switch (axis) {
        case 'x':
          x2 = p.x; y2 = p.y * cosA + p.z * sinA; z2 = p.z * cosA - p.y * sinA;
          break;
        case 'y':
          x2 = p.x * cosA + p.z * sinA; y2 = p.y; z2 = p.z * cosA - p.x * sinA;
          break;
        default: // 'z'
          x2 = p.x * cosA + p.y * sinA; y2 = p.y * cosA - p.x * sinA; z2 = p.z;
      }
      p.x = x2; p.y = y2; p.z = z2;
    });
  }

  // ---------------------------------------------------------------
  // 2) Subdivision "Chords" (Class I), fréquence N
  // ---------------------------------------------------------------
  function splitFacesChords(base, N) {
    const cache = new Map();

    function middlePoint(a, b, q) {
      if (q === 0) return a;
      if (q === 1) return b;
      // arrondi pour éviter les non-identités flottantes (1 - 2/3 !== 1/3)
      const qa = Math.round(q * 1e9) / 1e9;
      const qb = Math.round((1 - q) * 1e9) / 1e9;
      const key = (a._id < b._id) ? (a._id + '-' + b._id + '@' + qa) : (b._id + '-' + a._id + '@' + qb);
      if (cache.has(key)) return cache.get(key);
      const pt = a.scale(1 - q).add(b.scale(q)).normalize();
      pt._id = POINT_ID++;
      cache.set(key, pt);
      return pt;
    }

    const faces = [];
    const lineSet = new Map();
    function addLine(p, q) {
      const key = p._id < q._id ? p._id + '-' + q._id : q._id + '-' + p._id;
      if (!lineSet.has(key)) lineSet.set(key, [p, q]);
    }
    function addFace(p1, p2, p3, originFace) {
      const face = [p1, p2, p3];
      face.originFace = originFace;
      faces.push(face);
      addLine(p1, p2); addLine(p2, p3); addLine(p3, p1);
    }

    for (let fi = 0; fi < base.faces.length; fi++) {
      const [A, B, C] = base.faces[fi];
      let up = [A];
      for (let n = 1; n <= N; n++) {
        const li = middlePoint(A, B, n / N);
        const ri = middlePoint(A, C, n / N);
        const down = [];
        for (let i = 0; i <= n; i++) down.push(middlePoint(li, ri, i / n));
        addFace(up[0], down[0], down[1], fi);
        for (let i = 1; i < up.length; i++) {
          addFace(up[i], up[i - 1], down[i], fi);
          addFace(up[i], down[i], down[i + 1], fi);
        }
        up = down;
      }
    }

    const pointSet = new Map();
    faces.forEach(f => f.forEach(p => pointSet.set(p._id, p)));
    return { points: [...pointSet.values()], faces, lines: [...lineSet.values()] };
  }

  // ---------------------------------------------------------------
  // 3) Correction "Kruschke" (base plate automatique)
  //    Ratios validés : V=3. V=4 = valeur du fichier source, NON
  //    validée ici (absence de valeurs de contrôle) -> à confirmer.
  // ---------------------------------------------------------------
  const KRUSCHKE_MAGIC_FIX_RATIO = {
    3: 0.9442890204731844,
    // 4V : valeur du fichier source ACIDOME (cible Domerama F = 0.22219), validée
    // le 29/10/2026 contre ACIDOME CALC 221027 exécuté tel quel (voir VALIDATION-BASE.md)
    4: 0.22219 / 0.253185 * 0.9983958444733023
  };

  function applyKruschkeFix(mesh, V) {
    const mr = KRUSCHKE_MAGIC_FIX_RATIO[V];
    if (mr === undefined) {
      throw new Error('Méthode Kruschke disponible seulement en 3V et 4V (V=' + V + ')');
    }
    for (const [p, q] of mesh.lines) {
      const aIsPpt = !!p.pptPoint, bIsPpt = !!q.pptPoint;
      if (!aIsPpt && !bIsPpt) continue;
      const E = aIsPpt ? p : q;
      const S = aIsPpt ? q : p;
      const T = E.scale(1 - mr).add(S.scale(mr)).normalize();
      S.x = T.x; S.y = T.y; S.z = T.z;
    }
    return mesh;
  }

  // ---------------------------------------------------------------
  // 3 bis) Subdivision « Equal Arcs » (Figure.prototype.splitFaces_EA)
  //    Points des arêtes à angles égaux sur les grands cercles ; points
  //    intérieurs = « incentre sphérique » de trois grands cercles
  //    (bissectrices de plans passant par le centre). Chaque montant garde
  //    sa « sideDistance », utilisée par la méthode Mexican.
  // ---------------------------------------------------------------
  function splitFacesArcs(base, N) {
    let en = 0; const pts = new Map();
    base.points.forEach(p => { p._enum = en++; });
    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
    const cross = (a, b) => new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    function edgePoint(A, B, i, N, key) {
      key = key || (A._enum < B._enum ? [A._enum, B._enum, i].join() : [B._enum, A._enum, N - i].join());
      if (i * 2 > N) return edgePoint(B, A, N - i, N, key);
      if (pts.has(key)) return pts.get(key);
      const cos = dot(A, B), Y = B.sub(A.scale(cos)).normalize(), ang = Math.acos(Math.max(-1, Math.min(1, cos))) * i / N;
      const pt = Y.scale(Math.sin(ang)).add(A.scale(Math.cos(ang)));
      pt._id = POINT_ID++; pt._enum = en++; pts.set(key, pt); return pt;
    }
    function findPoint(a1, a2, b1, b2, c1, c2, control, step) {
      const n = [[a1, a2], [b1, b2], [c1, c2]].map(([u, v]) => cross(u, v).normalize());
      // incentre sphérique : intersection des deux plans bissecteurs avec la sphère, du côté de « control »
      const b1n = n[0].sub(n[1]), b2n = n[2].sub(n[1]);
      let d = cross(b1n, b2n).normalize();
      if (dot(d, control) < 0) d = d.scale(-1);
      d._id = POINT_ID++; d._enum = en++; pts.set([a1._enum, a2._enum, step].join(), d); return d;
    }
    const faces = [], lines = new Map();
    function addFace(A, B, C, sd, tri) {
      const f = [A, B, C]; f.originFace = tri; faces.push(f);
      [[B, C], [C, A], [A, B]].forEach((pair, i) => {
        const key = [pair[0]._enum, pair[1]._enum].map(String).sort().join();
        if (!lines.has(key)) lines.set(key, Object.assign([pair[0], pair[1]], { sideDistance: sd[i] }));
      });
    }
    base.faces.forEach((face, tri) => {
      const [A, B, C] = face;
      const seg = (a, b) => { const s = [a]; for (let i = 1; i < N; i++) s.push(edgePoint(a, b, i, N)); s.push(b); return s; };
      const AB = seg(A, B), BC = seg(B, C), CA = seg(C, A);
      let up = [A];
      for (let n = 1; n <= N; n++) {
        const down = [CA[N - n]];
        for (let i = 1; i < n; i++) down.push(n === N ? BC[N - i] : findPoint(AB[n], CA[N - n], BC[N - i], AB[i], CA[N - n + i], BC[n - i], A, i));
        down.push(AB[n]);
        for (let i = 0; i < n; i++) {
          addFace(up[i], down[i + 1], down[i], [n, N - i, N - n + i + 1], tri);
          if (i > 0) addFace(down[i], up[i - 1], up[i], [n - 1, N - i, N - n + i], tri);
        }
        up = down;
      }
    });
    const pointSet = new Map(); base.points.forEach(p => pointSet.set(p._id, p)); faces.forEach(f => f.forEach(p => pointSet.set(p._id, p)));
    return { points: [...pointSet.values()], faces, lines: [...lines.values()] };
  }

  // Méthode « Mexican » (splitFaces_EA_updateToMexican + Figure.equalizeLineGroups) :
  // on part d'Equal Arcs, puis on égalise par itérations les longueurs de chaque
  // famille de montants (même sideDistance), en reprojetant les nœuds sur la sphère.
  const MEXICAN_RENORMALIZE = false;
  function equalizeMexican(mesh, diffPrecision, stepLimit) {
    diffPrecision = diffPrecision || 1e-12; stepLimit = stepLimit || 300;
    const groups = new Map();
    mesh.lines.forEach(l => { const k = l.sideDistance; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(l); });
    const keys = [...groups.keys()].sort((a, b) => a - b);
    const used = new Set(); mesh.lines.forEach(l => { used.add(l[0]); used.add(l[1]); });
    let step = 0, delta;
    do {
      delta = 0;
      keys.forEach(k => groups.get(k).forEach(l => { l.__d = [l[0].sub(l[1]), l[1].sub(l[0])]; l.__len = l.__d[0].length(); }));
      keys.forEach(k => {
        const ls = groups.get(k), lens = ls.map(l => l.__len), diff = Math.max(...lens) - Math.min(...lens);
        if (diff < diffPrecision) return;
        delta = Math.max(delta, diff);
        const avg = lens.reduce((a, v) => a + v, 0) / lens.length;
        ls.forEach(l => { const q = (avg - l.__len) / l.__len / 4;
          [0, 1].forEach(i => { const p = l[i]; p.x += l.__d[i].x * q; p.y += l.__d[i].y * q; p.z += l.__d[i].z * q; }); });
      });
      // ACIDOME veut ici reprojeter les nœuds sur la sphère, mais sa liste « usedPoints »
      // est vide (underscore 1.8.3 : _.flatten() appliqué à un objet ne renvoie rien) :
      // aucun nœud n'est reprojeté. On reproduit ce comportement pour rester identique
      // (écart à la sphère ≈ 3e-5 du rayon, soit < 0,1 mm sur un dôme de 5 m).
      if (MEXICAN_RENORMALIZE) used.forEach(p => { const L = Math.hypot(p.x, p.y, p.z); p.x /= L; p.y /= L; p.z /= L; });
    } while (delta && ++step < stepLimit);
    mesh.lines.forEach(l => { delete l.__d; delete l.__len; });
    mesh.mexicanSteps = step;
    return mesh;
  }

  // ---------------------------------------------------------------
  // 4) relations() : topologie ligne <-> face, sommet <-> faces
  // ---------------------------------------------------------------
  function buildRelations(mesh) {
    const lineKey = (p, q) => (p._id < q._id ? p._id + '-' + q._id : q._id + '-' + p._id);
    const lineByKey = new Map();
    mesh.lines.forEach(([p, q]) => {
      lineByKey.set(lineKey(p, q), { points: [p, q], faces: [], id: lineKey(p, q) });
    });

    mesh.faces.forEach((f, fi) => {
      f.faceObj = { points: f, index: fi, lines: [], live: true, originFace: f.originFace };
      for (let i = 0; i < 3; i++) {
        const p = f[i], q = f[(i + 1) % 3];
        const line = lineByKey.get(lineKey(p, q));
        line.faces.push(f.faceObj);
        f.faceObj.lines.push(line);
      }
    });

    const vertexFaces = new Map();
    mesh.points.forEach(p => vertexFaces.set(p._id, []));
    mesh.faces.forEach(f => f.forEach(p => vertexFaces.get(p._id).push(f.faceObj)));

    return {
      lineByKey,
      lines: [...lineByKey.values()],
      faceObjs: mesh.faces.map(f => f.faceObj),
      vertexFaces
    };
  }

  // ---------------------------------------------------------------
  // 5) sliceByFraction : troncature par propagation de faces
  //    depuis le sommet le plus haut (flat base garantie par Kruschke)
  // ---------------------------------------------------------------
  function sliceByFraction(rel, upperPoint, fractionStr) {
    if (fractionStr === '1' || fractionStr === '1/1') {
      rel.faceObjs.forEach(f => f.live = true);
      return { facesDone: rel.faceObjs.length, facesTotal: rel.faceObjs.length, fraction: 1 };
    }

    const [num, den] = fractionStr.split('/').map(Number);
    const fraction = num / den;
    const facesTotal = rel.faceObjs.length;

    rel.lines.forEach(l => { l._ready = false; });
    rel.faceObjs.forEach(f => { f.live = false; });

    let wave = rel.vertexFaces.get(upperPoint._id).slice();
    let facesDone = 0;

    while (facesDone / facesTotal < fraction) {
      wave.forEach(face => {
        face.live = true;
        face.lines.forEach(line => {
          line.faces.forEach(f2 => { f2._ready = true; });
        });
        facesDone++;
      });
      wave = rel.faceObjs.filter(f => f._ready && !f.live);
      if (wave.length === 0 && facesDone / facesTotal < fraction) {
        throw new Error('sliceByFraction: propagation épuisée avant la fraction cible');
      }
    }
    return { facesDone, facesTotal, fraction };
  }

  // ---------------------------------------------------------------
  // 5 bis) sliceByAxis (symétries Triad / Cross) : on garde les nœuds des faces
  //    dont le centre est au-dessus du plan y = 1 - 2 × fraction ; une face
  //    (ou une arête) vit si tous ses nœuds sont gardés.
  // ---------------------------------------------------------------
  function sliceByAxis(rel, mesh, fractionStr, axis) {
    const [num, den] = fractionStr.split('/').map(Number), threshold = 1 - 2 * (num / (den || 1));
    const remain = new Set();
    rel.faceObjs.forEach(f => { const c = f.points.reduce((a, p) => a + p[axis], 0) / 3;
      if (Math.abs(c - threshold) > 1e-6 && c > threshold) f.points.forEach(p => remain.add(p._id)); });
    rel.faceObjs.forEach(f => { f.live = f.points.every(p => remain.has(p._id)); });
    rel.lines.forEach(l => { l._liveByAxis = l.points.every(p => remain.has(p._id)); });
  }

  // groundSliced (« aligner la base ») : les nœuds vivants qui touchent une face
  // morte sont ramenés à la même hauteur (celle du plus proche de l'équateur),
  // en restant sur la sphère.
  function groundSliced(rel, axis) {
    const border = new Map();
    rel.faceObjs.forEach(f => { if (f.live) return;
      f.points.forEach(p => { if (rel.vertexFaces.get(p._id).some(g => g.live)) border.set(p._id, p); }); });
    let aval = false;
    border.forEach(p => { aval = aval !== false && Math.abs(aval) < Math.abs(p[axis]) ? aval : p[axis]; });
    let moved = 0;
    border.forEach(p => {
      if (Math.abs(p[axis] - aval) > 1e-6) {
        moved++;
        p[axis] = aval;
        const len = Math.hypot(p.x, p.y, p.z), q = Math.sqrt((1 - aval * aval) / (len * len - aval * aval));
        ['x', 'y', 'z'].forEach(k => { if (k !== axis) p[k] *= q; });
      }
    });
    return moved;   // 0.9.8 : nombre de nœuds réellement déplacés (0 = base déjà plate)
  }

  // liste des découpages proposés par ACIDOME (partialList_ClassI) : p / 4V
  function partialListClassI(V) {
    const gcd = (a, b) => b ? gcd(b, a % b) : a, list = [];
    for (let p = V, q = V * 4; p <= V * 4; p += (p !== V * 3) ? 2 : V) { const g = gcd(p, q); list.push((p / g) + '/' + (q / g)); }
    return list;
  }

  // ---------------------------------------------------------------
  // 6) detectSelvage + extraction du maillage "vivant"
  // ---------------------------------------------------------------
  function extractLiveMesh(rel) {
    const liveFaces = rel.faceObjs.filter(f => f.live);
    const liveLines = rel.lines.filter(l => l.faces.some(f => f.live));
    liveLines.forEach(l => {
      l.selvage = l.faces.filter(f => f.live).length === 1;
    });
    const pointMap = new Map();
    liveFaces.forEach(f => f.points.forEach(p => pointMap.set(p._id, p)));
    return {
      points: [...pointMap.values()],
      faces: liveFaces,
      lines: liveLines
    };
  }

  // ---------------------------------------------------------------
  // 7) classification automatique des longueurs d'arêtes (A, B, C, ...)
  // ---------------------------------------------------------------
  function classifyEdgeLengths(lines, precision) {
    precision = precision || 1e-6;
    const lengths = lines.map(l => l.points[0].distance(l.points[1]));
    const groups = []; // {length, count}
    lengths.forEach(len => {
      let g = groups.find(g => Math.abs(g.length - len) < precision * 10);
      if (g) { g.count++; g.sum += len; g.length = g.sum / g.count; }
      else groups.push({ length: len, sum: len, count: 1 });
    });
    groups.sort((a, b) => a.length - b.length);
    const names = 'ABCDEFGHIJ';
    groups.forEach((g, i) => { g.name = names[i] || ('L' + (i + 1)); });
    return groups;
  }

  // ---------------------------------------------------------------
  // 8) Pipeline complet
  // ---------------------------------------------------------------
  function generateDome(params) {
    params = Object.assign({
      base: 'Icosahedron',
      subdivClass: 'I',
      subdivMethod: 'Kruschke',
      detail: 3,       // fréquence V
      partial: '5/9',  // fraction de faces conservées
      symmetry: 'Pentad',
      axis: 'y',
      radius: 1
    }, params || {});

    if (params.base !== 'Icosahedron') throw new Error('Seul base=Icosahedron est implémenté pour le moment');
    if (params.subdivClass !== 'I') throw new Error('Seul subdivClass=I est implémenté pour le moment');
    // compatibilité : l'ancien appel « Kruschke » en 2V voulait dire Chords pur
    if (params.subdivMethod === 'Kruschke' && params.detail === 2) params.subdivMethod = 'Chords';
    if (!/^(Chords|Arcs|Mexican|Kruschke)$/.test(params.subdivMethod)) throw new Error('Méthode inconnue : ' + params.subdivMethod);
    if (params.subdivMethod === 'Kruschke' && !KRUSCHKE_MAGIC_FIX_RATIO[params.detail]) throw new Error('Méthode Kruschke disponible seulement en 3V et 4V');
    if ((params.subdivMethod === 'Arcs' || params.subdivMethod === 'Mexican') && params.detail < 3) params.subdivMethod = 'Chords'; // ACIDOME : Arcs/Mexican à partir de 3V

    const baseFigure = buildIcosahedron({ symmetry: params.symmetry, axis: params.axis });

    // adjacence des 20 faces D'ORIGINE de l'icosaèdre (avant subdivision) : nécessaire
    // pour regrouper les faces subdivisées par paires en "losanges" (mode Bandes/Gores)
    const origFaceAdjacency = baseFigure.faces.map(() => []);
    for (let i = 0; i < baseFigure.faces.length; i++) {
      for (let j = i + 1; j < baseFigure.faces.length; j++) {
        const shared = baseFigure.faces[i].filter(p => baseFigure.faces[j].indexOf(p) !== -1);
        if (shared.length === 2) {
          origFaceAdjacency[i].push({ neighbor: j, edgePointIds: [shared[0]._id, shared[1]._id] });
          origFaceAdjacency[j].push({ neighbor: i, edgePointIds: [shared[0]._id, shared[1]._id] });
        }
      }
    }

    let mesh;
    switch (params.subdivMethod) {
      case 'Arcs': mesh = splitFacesArcs(baseFigure, params.detail); break;
      case 'Mexican': mesh = equalizeMexican(splitFacesArcs(baseFigure, params.detail)); break;
      case 'Kruschke': mesh = applyKruschkeFix(splitFacesChords(baseFigure, params.detail), params.detail); break;
      default: mesh = splitFacesChords(baseFigure, params.detail);
    }

    const rel = buildRelations(mesh);

    // sommet supérieur = max sur l'axe choisi, parmi tous les sommets du maillage subdivisé
    const axisKey = params.axis;
    const upper = mesh.points.slice().sort((p, q) => p[axisKey] - q[axisKey]).pop();

    let liveMesh;
    if (params.partial === '1' || params.partial === '1/1') {
      rel.faceObjs.forEach(f => f.live = true);
      rel.lines.forEach(l => l.selvage = l.faces.length === 1);
      liveMesh = { points: mesh.points, faces: rel.faceObjs, lines: rel.lines };
    } else if (params.symmetry === 'Pentad') {
      // ACIDOME : classe I en Pentad -> propagation de faces depuis le sommet
      sliceByFraction(rel, upper, params.partial);
      liveMesh = extractLiveMesh(rel);
    } else {
      // Triad / Cross -> coupe par plan horizontal (sliceByAxis)
      sliceByAxis(rel, mesh, params.partial, axisKey);
      liveMesh = extractLiveMesh(rel);
    }
    // aligner la base (ACIDOME : pas en Kruschke, ni pour 1/2 ou la sphère entière).
    // Nomad'Om Beta 0.9.4 (étape 4, décision de Nathan du 30/10/2026) : autorisé aussi en Kruschke.
    // Les coupes déjà plates (3V 5/12, 7/12 ; 4V 3/8, 5/8) ne bougent pas au-delà de la tolérance ;
    // les autres (3V 1/4, 3/4…) voient leurs nœuds de bord ramenés dans un plan, sur la sphère.
    // Statut 🟡 : calculé, sans référence indépendante pour les coupes Kruschke non plates.
    params.canAlignTheBase = !/^1(\/[12])?$/.test(params.partial);
    if (params.alignTheBase && params.canAlignTheBase) {
      // garde-fou (audit 30/10/2026) : en Triad / Cross et en haute fréquence, ramener le bord dans un
      // plan peut retourner des triangles (toile impossible). On compare la normale de chaque face
      // avant / après l'alignement ; une face retournée = alignement refusé.
      const normalOf = f => { const [a, b, c] = f.points;
        const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
        return [u[1]*v[2] - u[2]*v[1], u[2]*v[0] - u[0]*v[2], u[0]*v[1] - u[1]*v[0]]; };
      const before = liveMesh.faces.map(normalOf);
      params.alignMoved = groundSliced(rel, axisKey);
      let flipped = 0;
      liveMesh.faces.forEach((f, i) => { const n = normalOf(f), m = before[i];
        if (n[0]*m[0] + n[1]*m[1] + n[2]*m[2] <= 0) flipped++; });
      if (flipped > 0) {
        const err = new Error('Aligner la base est impossible pour cette coupe : ' + flipped + ' triangle(s) se retourneraient.');
        err.code = 'ALIGN_FLIP'; err.flipped = flipped;
        throw err;
      }
    }

    // adjacence face <-> face (nécessaire au dépliage / Cover+) : pour chaque
    // arête vivante touchant exactement 2 faces vivantes, on relie leurs index
    // FINAUX (position dans liveMesh.faces, identique à l'index public "faces[i].index")
    const faceIndexOf = new Map();
    liveMesh.faces.forEach((f, i) => faceIndexOf.set(f, i));
    const faceAdjacency = liveMesh.faces.map(() => []);
    liveMesh.lines.forEach(l => {
      const liveFacesOfLine = l.faces.filter(f => f.live);
      if (liveFacesOfLine.length === 2) {
        const [fa, fb] = liveFacesOfLine;
        const ia = faceIndexOf.get(fa), ib = faceIndexOf.get(fb);
        const edgePointIds = [l.points[0]._id, l.points[1]._id];
        faceAdjacency[ia].push({ neighbor: ib, edgePointIds });
        faceAdjacency[ib].push({ neighbor: ia, edgePointIds });
      }
    });

    // mise à l'échelle (rayon unitaire -> rayon demandé)
    const R = params.radius;
    const scaledPoints = liveMesh.points.map(p => ({
      _id: p._id,
      x: p.x * R, y: p.y * R, z: p.z * R,
      pptPoint: !!p.pptPoint
    }));
    const pointById = new Map(scaledPoints.map(p => [p._id, p]));

    const faces = liveMesh.faces.map((f, i) => ({
      index: i,
      pointIds: f.points.map(p => p._id),
      originFace: f.originFace
    }));

    const lines = liveMesh.lines.map(l => ({
      pointIds: [l.points[0]._id, l.points[1]._id],
      selvage: !!l.selvage,
      length: l.points[0].distance(l.points[1]) * R
    }));

    const edgeClasses = classifyEdgeLengths(liveMesh.lines);
    edgeClasses.forEach(g => { g.length *= R; });

    return {
      params,
      points: scaledPoints,
      pointById,
      faces,
      lines,
      faceAdjacency,
      origFaceAdjacency,
      edgeClasses,
      upperPointId: upper._id,
      stats: {
        pointCount: scaledPoints.length,
        faceCount: faces.length,
        lineCount: lines.length,
        selvageCount: lines.filter(l => l.selvage).length
      }
    };
  }

  const DomeEngine = {
    Vec3,
    buildIcosahedron,
    splitFacesChords,
    splitFacesArcs,
    equalizeMexican,
    applyKruschkeFix,
    partialListClassI,
    buildRelations,
    sliceByFraction,
    extractLiveMesh,
    classifyEdgeLengths,
    generateDome
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomeEngine;
  } else {
    global.DomeEngine = DomeEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
