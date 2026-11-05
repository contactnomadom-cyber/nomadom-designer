// ---------------------------------------------------------
// floor.js — Plancher et soubassement du dôme (mission NOMAD-2026-006). Logique pure, sans DOM,
// testée sous Node (tests/node/floor.test.js). Unités : m, kN, kPa. Repère du Design :
// x, z horizontaux, y vertical, DESSUS DU PLANCHER À y = 0 (le dôme se pose dessus).
//
// Image : une table ronde. Les pieds (pilotis en blocs béton) portent un cadre (poutres
// porteuses), le cadre porte les lattes (solives), les lattes portent le plateau (plancher).
//
// Choix (combinables) :
//  soubassement : 'pilotis'  → 15 pilotis sous les nœuds de base + ceinture (15 côtés)
//                              + triangle central (inscrit dans un cercle de Ø 1 à 1,5 m) sur 3 pilotis ;
//                 'pentagone' → idem + pentagone (un sommet tous les 3 nœuds de base)
//                              + 5 pilotis au milieu des côtés du pentagone (2ᵉ rangée).
//  plancher     : 'etoile' → solives rayonnantes (le « camembert ») de chaque nœud de base jusqu'au
//                            triangle, panneaux triangulaires (2 types : côtés B et C de la base)
//                            autour d'une pièce centrale pleine Ø 0,80 à 1 m ;
//                 'plein'  → solives parallèles (entraxe réglable) et plateau plein.
//  (plancher en diaphragme : plus tard, décision de Nathan du 03/11/2026)
//
// Fondations, procédé de Nathan : décaisser 15 à 30 cm jusqu'au sol rocheux, géotextile, gravier
// de nivellement, un bloc béton 39 × 29 × 19 couché à plat, puis des blocs 39 × 19 × 19 selon le
// terrain, calage au-dessus ; toujours au moins 30 cm de vide ventilé sous les poutres.
//
// Charges et portance : APERÇU 🟠, ordres de grandeur pour comparer les choix, pas une note de calcul.
// Répartition par zones d'influence (chaque point du plancher va au pilotis le plus proche) ; le
// poids du dôme et la neige vont aux 15 pilotis de la ceinture. Vent (soulèvement) non calculé.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const SUPPORTS = ['pilotis', 'pentagone'], DECKS = ['etoile', 'plein'];
  const SOILS = {
    roche: { name: 'Roche saine', q: 1000 },
    gravier: { name: 'Grave compactée', q: 250 },
    argile: { name: 'Argile ferme', q: 100 }
  };
  // sections de bois au choix (largeur × hauteur, m) : provisoires d'origine, CLS sapin raboté, KVH — 🟠 à confirmer chez le fournisseur
  const SECTIONS = {
    'prov-75x195': { name: '75 × 195 (provisoire)', w: 0.075, d: 0.195, grade: 'C24' },
    'prov-45x145': { name: '45 × 145 (provisoire)', w: 0.045, d: 0.145, grade: 'C24' },
    'cls-38x63': { name: 'CLS 38 × 63', w: 0.038, d: 0.063, grade: 'C16' },
    'cls-38x89': { name: 'CLS 38 × 89', w: 0.038, d: 0.089, grade: 'C16' },
    'cls-38x140': { name: 'CLS 38 × 140', w: 0.038, d: 0.140, grade: 'C16' },
    'cls-38x184': { name: 'CLS 38 × 184', w: 0.038, d: 0.184, grade: 'C16' },
    'cls-38x235': { name: 'CLS 38 × 235', w: 0.038, d: 0.235, grade: 'C16' },
    'kvh-60x120': { name: 'KVH 60 × 120', w: 0.060, d: 0.120, grade: 'C24' },
    'kvh-60x160': { name: 'KVH 60 × 160', w: 0.060, d: 0.160, grade: 'C24' },
    'kvh-60x200': { name: 'KVH 60 × 200', w: 0.060, d: 0.200, grade: 'C24' },
    'kvh-80x160': { name: 'KVH 80 × 160', w: 0.080, d: 0.160, grade: 'C24' },
    'kvh-80x200': { name: 'KVH 80 × 200', w: 0.080, d: 0.200, grade: 'C24' },
    'kvh-100x200': { name: 'KVH 100 × 200', w: 0.100, d: 0.200, grade: 'C24' },
    'kvh-80x80': { name: 'KVH 80 × 80 (poteau)', w: 0.080, d: 0.080, grade: 'C24', post: true },
    'kvh-100x100': { name: 'KVH 100 × 100 (poteau)', w: 0.100, d: 0.100, grade: 'C24', post: true },
    'kvh-120x120': { name: 'KVH 120 × 120 (poteau)', w: 0.120, d: 0.120, grade: 'C24', post: true }
  };
  // classes de résistance (EN 338) : f_m, f_v (MPa), E moyen (MPa), masse volumique (kg/m³)
  // CLS supposé C16 (classement courant, 🟠 à confirmer), KVH et sections d'origine C24
  const GRADES = { C16: { fm: 16, fv: 3.2, E: 8000, rho: 370 }, C24: { fm: 24, fv: 4.0, E: 11000, rho: 420 } };
  // assemblage des cadres (ceinture, pentagone, triangle) aux nœuds
  const JOINTS = { onglet: 'En onglet (coupe d\'angle)', about: 'En about (bout à bout, coupe d\'équerre)' };
  const DEFAULTS = {
    support: 'pentagone', deck: 'etoile', beamSection: 'prov-75x195', joistSection: 'prov-45x145', joint: 'onglet',
    triangleDiameter: 1.2,      // cercle du triangle central (1 à 1,5 m)
    hubDiameter: 0.9,           // pièce centrale du plancher en étoile (0,80 à 1 m)
    joistSpacing: 0.4,          // plancher plein
    beam: { w: 0.075, d: 0.195 },   // poutres porteuses (ceinture, pentagone, triangle), aperçu
    joist: { w: 0.045, d: 0.145 },  // solives
    deckThickness: 0.022,
    minVoid: 0.30,              // vide ventilé mini sous les poutres
    slope: 0, slopeDir: 0,      // pente du terrain (%) et direction de la descente (degrés, 0 = +x)
    soil: 'roche',
    loads: { floorG: 0.5, liveQ: 2.0, snow: 0.5, snowShape: 0.8, strutKgPerM: 2.0, nodeKg: 1.5, coverKgPerM2: 0.6 },
    blocks: { first: { l: 0.39, w: 0.29, h: 0.19, kg: 23 }, next: { l: 0.39, w: 0.19, h: 0.19, kg: 15 } },
    maxJoistSpan: 2.4           // portée libre maxi conseillée pour une solive (aperçu)
  };

  const v2 = (x, z) => ({ x, z });
  const sub = (a, b) => v2(a.x - b.x, a.z - b.z), add = (a, b) => v2(a.x + b.x, a.z + b.z), mul = (a, k) => v2(a.x * k, a.z * k);
  const len = a => Math.hypot(a.x, a.z), dist = (a, b) => len(sub(a, b));
  const cross = (a, b) => a.x * b.z - a.z * b.x;
  // intersection des segments [p, p2] et [q, q2] : paramètre t sur le premier, ou null
  function segX(p, p2, q, q2) {
    const r = sub(p2, p), s = sub(q2, q), d = cross(r, s); if (Math.abs(d) < 1e-12) return null;
    const t = cross(sub(q, p), s) / d, u = cross(sub(q, p), r) / d;
    return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null;
  }
  const lerp = (a, b, t) => v2(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
  function inPoly(poly, p) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) c = !c; } return c; }
  function polyArea(poly) { let A = 0; poly.forEach((p, i) => { A += cross(p, poly[(i + 1) % poly.length]); }); return Math.abs(A) / 2; }

  // nœuds de base du dôme (repère du dôme : y mini), triés par azimut, avec la longueur du côté suivant
  function baseRing(dome) {
    const yB = Math.min(...dome.points.map(p => p.y));
    const ring = dome.points.filter(p => Math.abs(p.y - yB) < 1e-6).map(p => ({ id: p._id !== undefined ? p._id : p.id, x: p.x, z: p.z, a: Math.atan2(p.z, p.x) }))
      .sort((a, b) => a.a - b.a);
    ring.forEach((p, i) => { p.edge = dist(p, ring[(i + 1) % ring.length]); });
    return ring;
  }
  // sommets du pentagone : un nœud tous les 3, sur l'axe de symétrie (nœud entre deux côtés de même longueur)
  function pentagonIdx(ring) {
    const n = ring.length, same = i => Math.abs(ring[(i - 1 + n) % n].edge - ring[i].edge) < 1e-6;
    let start = 0; for (let k = 0; k < 3; k++) { const ok = [0, 1, 2, 3, 4].every(j => same((k + 3 * j) % n)); if (ok) { start = k; break; } }
    return [0, 1, 2, 3, 4].map(j => (start + 3 * j) % n);
  }

  function layout(dome, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    o.loads = Object.assign({}, DEFAULTS.loads, opts && opts.loads);
    o.blocks = DEFAULTS.blocks; o.beam = Object.assign({}, DEFAULTS.beam, opts && opts.beam); o.joist = Object.assign({}, DEFAULTS.joist, opts && opts.joist);
    // section choisie dans la liste (un ancien projet sans choix garde les sections d'origine)
    if (!SECTIONS[o.beamSection]) o.beamSection = DEFAULTS.beamSection; else if (!(opts && opts.beam)) o.beam = { w: SECTIONS[o.beamSection].w, d: SECTIONS[o.beamSection].d };
    if (!SECTIONS[o.joistSection]) o.joistSection = DEFAULTS.joistSection; else if (!(opts && opts.joist)) o.joist = { w: SECTIONS[o.joistSection].w, d: SECTIONS[o.joistSection].d };
    if (!JOINTS[o.joint]) o.joint = DEFAULTS.joint;
    const support = SUPPORTS.includes(o.support) ? o.support : DEFAULTS.support, deck = DECKS.includes(o.deck) ? o.deck : DEFAULTS.deck;
    const warnings = [], errors = [];
    const ring = baseRing(dome), n = ring.length;
    if (n < 5) return { ok: false, errors: ['base du dôme introuvable (moins de 5 nœuds au sol)'] };
    if (support === 'pentagone' && n % 5 !== 0) errors.push('pentagone : il faut un nombre de nœuds de base multiple de 5 (ici ' + n + ')');
    const Dt = Math.max(1.0, Math.min(1.5, o.triangleDiameter)), Dh = Math.max(0.8, Math.min(1.0, o.hubDiameter));
    if (Dt !== o.triangleDiameter) warnings.push('Cercle du triangle ramené entre 1,00 et 1,50 m.');
    if (Dh !== o.hubDiameter) warnings.push('Pièce centrale ramenée entre 0,80 et 1,00 m.');
    const poly = ring.map(p => v2(p.x, p.z)), area = polyArea(poly);

    // ---- poutres porteuses (niveau 1), posées sur les pilotis ----
    const beams = [];
    for (let i = 0; i < n; i++) beams.push({ kind: 'ceinture', a: poly[i], b: poly[(i + 1) % n] });
    const pIdx = support === 'pentagone' && !errors.length ? pentagonIdx(ring) : null;
    const az0 = pIdx ? ring[pIdx[0]].a : ring[0].a;
    const tri = [0, 1, 2].map(k => v2(Dt / 2 * Math.cos(az0 + k * 2 * Math.PI / 3), Dt / 2 * Math.sin(az0 + k * 2 * Math.PI / 3)));
    for (let k = 0; k < 3; k++) beams.push({ kind: 'triangle', a: tri[k], b: tri[(k + 1) % 3] });
    if (pIdx) for (let k = 0; k < 5; k++) beams.push({ kind: 'pentagone', a: poly[pIdx[k]], b: poly[pIdx[(k + 1) % 5]] });

    // ---- pilotis ----
    const piles = ring.map((p, i) => ({ row: 'exterieure', at: poly[i], node: p.id }));
    tri.forEach(t => piles.push({ row: 'interieure', at: t, what: 'pointe du triangle' }));
    if (pIdx) for (let k = 0; k < 5; k++) piles.push({ row: 'interieure', at: lerp(poly[pIdx[k]], poly[pIdx[(k + 1) % 5]], 0.5), what: 'milieu du pentagone' });

    // ---- solives (niveau 2), posées sur les poutres ----
    const joists = [];
    // point où une demi-droite p → centre rencontre le triangle
    const hitTriangle = p => { let best = null; for (let k = 0; k < 3; k++) { const t = segX(p, v2(0, 0), tri[k], tri[(k + 1) % 3]); if (t !== null && (best === null || t < best)) best = t; } return best === null ? v2(0, 0) : lerp(p, v2(0, 0), best); };
    if (deck === 'etoile') poly.forEach((p, i) => joists.push({ kind: 'solive', a: p, b: hitTriangle(p), node: ring[i].id }));
    // appuis d'une solive : croisements avec les poutres → portée libre maxi
    const spanOf = j => {
      const ts = [];
      beams.forEach(b => { const t = segX(j.a, j.b, b.a, b.b); if (t !== null) ts.push(t); });
      ts.sort((a, b) => a - b);
      const L = dist(j.a, j.b); j.length = L; j.supports = ts.length;
      j.span = ts.length ? Math.max(ts[0] * L, (1 - ts[ts.length - 1]) * L, ...ts.slice(1).map((t, k) => (t - ts[k]) * L)) : L;
      j.carried = ts.length >= 2 || (deck === 'etoile' && ts.length >= 1);
      return j;
    };
    // plancher plein : solives parallèles, entraxe e, coupées par le contour ; direction choisie pour la plus petite portée
    const parallel = ang => {
      const c = Math.cos(ang), sn = Math.sin(ang), rot = p => v2(p.x * c + p.z * sn, -p.x * sn + p.z * c), back = p => v2(p.x * c - p.z * sn, p.x * sn + p.z * c);
      const rp = poly.map(rot), zs = rp.map(p => p.z), zmin = Math.min(...zs), zmax = Math.max(...zs), e = Math.max(0.2, o.joistSpacing), out = [];
      for (let z = zmin + e / 2; z < zmax; z += e) {
        const xs = []; rp.forEach((p, i) => { const q = rp[(i + 1) % n]; if ((p.z - z) * (q.z - z) <= 0 && p.z !== q.z) xs.push(p.x + (z - p.z) / (q.z - p.z) * (q.x - p.x)); });
        xs.sort((a, b) => a - b); if (xs.length >= 2) out.push(spanOf({ kind: 'solive', a: back(v2(xs[0], z)), b: back(v2(xs[xs.length - 1], z)) }));
      }
      return out;
    };
    let joistAngle = null;
    if (deck === 'etoile') joists.forEach(spanOf);
    else {
      let best = null;
      for (let k = 0; k < 90; k++) { const ang = k * Math.PI / 90, js = parallel(ang), m = Math.max(...js.map(j => j.span)); if (!best || m < best.m - 1e-9) best = { m, js, ang }; }
      best.js.forEach(j => joists.push(j)); joistAngle = best.ang * 180 / Math.PI;
    }
    const maxSpan = Math.max(0, ...joists.map(j => j.span));
    if (joists.some(j => !j.carried)) errors.push('une solive n\'est portée que par une seule poutre');
    if (maxSpan > o.maxJoistSpan + 1e-9) warnings.push('Portée libre de solive ' + Math.round(maxSpan * 1000) + ' mm > ' + Math.round(o.maxJoistSpan * 1000) + ' mm conseillés : ajouter une poutre de reprise sous les solives, prendre une solive plus haute, ou choisir le plancher en étoile.');

    // ---- plancher : panneaux ----
    const panels = [];
    if (deck === 'etoile') {
      // chaque secteur : du côté de base jusqu'à l'arc de la pièce centrale (mêmes points des deux côtés : pas de recouvrement)
      const r = Dh / 2, hub = [], SUB = 4;
      poly.forEach((p, i) => { const q = poly[(i + 1) % n], a0 = Math.atan2(p.z, p.x); let a1 = Math.atan2(q.z, q.x); if (a1 < a0) a1 += 2 * Math.PI;
        const arc = []; for (let k = 0; k <= SUB; k++) { const a = a0 + (a1 - a0) * k / SUB; arc.push(v2(r * Math.cos(a), r * Math.sin(a))); }
        arc.slice(0, SUB).forEach(x => hub.push(x));
        panels.push({ kind: 'secteur', type: Math.round(ring[i].edge * 1000), pts: [p, q].concat(arc.slice().reverse()), edge: ring[i].edge }); });
      panels.unshift({ kind: 'centre', pts: hub });
    } else panels.push({ kind: 'plein', pts: poly.slice() });
    const sectorTypes = [...new Set(panels.filter(p => p.kind === 'secteur').map(p => p.type))].sort((a, b) => a - b);

    // ---- hauteurs : terrain, vide ventilé, empilement de blocs ----
    const sl = (o.slope || 0) / 100, dirv = v2(Math.cos((o.slopeDir || 0) * Math.PI / 180), Math.sin((o.slopeDir || 0) * Math.PI / 180));
    const ground = p => -sl * (p.x * dirv.x + p.z * dirv.z);   // terrain relatif (m), descend dans la direction donnée
    const yBeamTop = -(o.deckThickness + o.joist.d), yBeamBot = yBeamTop - o.beam.d;
    const B1 = o.blocks.first, B2 = o.blocks.next;
    // au point le plus haut du terrain : un nombre entier de blocs, au moins le vide mini (pas de calage)
    const H0 = B1.h + Math.max(0, Math.ceil((o.minVoid - B1.h) / B2.h - 1e-9)) * B2.h;
    const gMax = Math.max(...piles.map(p => ground(p.at)));
    const lift = gMax + H0 - yBeamBot;   // le plancher se règle sur le point le plus haut
    piles.forEach(p => {
      p.ground = ground(p.at) - lift;              // repère : plancher fini à y = 0
      // vide ventilé = du terrain (gravier réglé) au-dessous de la poutre ; sous la poutre, les blocs le remplissent, calés en tête
      const H = yBeamBot - p.ground, h = H - o.minVoid;
      const nNext = Math.max(0, Math.floor((H - B1.h) / B2.h + 1e-9));
      p.stack = { height: H, first: 1, next: nNext, shim: H - B1.h - nNext * B2.h, void: H };
      if (h < -1e-9) warnings.push('vide ventilé insuffisant sous un pilotis');
    });
    const voidMin = Math.min(...piles.map(p => p.stack.void));
    const floorAboveHighGround = -Math.min(...piles.map(p => p.ground));

    // ---- charges (aperçu 🟠) ----
    const L = o.loads, kgToKN = 0.00981;
    const strutLen = dome.lines.reduce((s, l) => s + l.length, 0);
    let skin = 0; (dome.faces || []).forEach(f => { const [a, b, c] = f.pointIds.map(id => dome.pointById.get(id)); const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
      skin += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2; });
    const domeG = (strutLen * L.strutKgPerM + dome.points.length * L.nodeKg + skin * L.coverKgPerM2) * kgToKN;
    const snowS = area * L.snow * L.snowShape;
    // zones d'influence du plancher : grille de 5 cm
    const step = 0.05, trib = piles.map(() => 0);
    const xs = poly.map(p => p.x), zs2 = poly.map(p => p.z);
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) for (let z = Math.min(...zs2) + step / 2; z < Math.max(...zs2); z += step) {
      const P = v2(x, z); if (!inPoly(poly, P)) continue;
      let bi = 0, bd = Infinity; piles.forEach((p, i) => { const d = dist(p.at, P); if (d < bd) { bd = d; bi = i; } }); trib[bi] += step * step;
    }
    const tsum = trib.reduce((a, b) => a + b, 0); trib.forEach((t, i) => { trib[i] = t * area / tsum; });
    const outer = piles.filter(p => p.row === 'exterieure').length, foot = B1.l * B1.w;
    piles.forEach((p, i) => {
      const stackKN = (B1.kg + p.stack.next * B2.kg) * kgToKN;
      const G = trib[i] * L.floorG + (p.row === 'exterieure' ? domeG / outer : 0) + stackKN;
      const Q = trib[i] * L.liveQ, S = p.row === 'exterieure' ? snowS / outer : 0;
      p.area = trib[i]; p.loads = { G, Q, S, els: G + Q + S, elu: 1.35 * G + 1.5 * Q + 1.5 * 0.5 * S };
      p.pressure = p.loads.els / foot;   // kPa sous le premier bloc
    });
    const soil = SOILS[o.soil] || SOILS.roche, pmax = Math.max(...piles.map(p => p.pressure));
    const ratio = pmax / soil.q;
    if (ratio > 1) warnings.push('Pression sous le bloc le plus chargé (' + Math.round(pmax) + ' kPa) au-delà de la valeur courante pour « ' + soil.name + ' » (' + soil.q + ' kPa) : agrandir l\'assise.');

    // ---- quantités ----
    const lenSum = list => list.reduce((s, b) => s + dist(b.a, b.b), 0);
    const byKind = k => beams.filter(b => b.kind === k);
    const qty = {
      piles: piles.length, pilesOuter: outer, pilesInner: piles.length - outer,
      blocksFirst: piles.length, blocksNext: piles.reduce((s, p) => s + p.stack.next, 0),
      beams: { ceinture: lenSum(byKind('ceinture')), pentagone: lenSum(byKind('pentagone')), triangle: lenSum(byKind('triangle')) },
      joists: joists.length, joistLength: joists.reduce((s, j) => s + j.length, 0),
      deckArea: area
    };
    return {
      ok: !errors.length, errors, warnings, support, deck, options: o, ring, poly, area,
      beams, joists, piles, panels, sectorTypes, triangle: tri, pentagon: pIdx,
      levels: { deckTop: 0, joistTop: -o.deckThickness, beamTop: yBeamTop, beamBottom: yBeamBot },
      voidMin, floorAboveHighGround, maxJoistSpan: maxSpan, joistAngle, groundAt: p => ground(p) - lift,
      loads: { domeG, snowS, floorArea: area, soil, pmax, ratio, totalEls: piles.reduce((s, p) => s + p.loads.els, 0) },
      qty
    };
  }

  // choix réglables par l'utilisateur, valeurs de départ (ce qui est mémorisé dans l'objet dôme)
  const choices = () => ({ support: DEFAULTS.support, deck: DEFAULTS.deck, triangleDiameter: DEFAULTS.triangleDiameter, hubDiameter: DEFAULTS.hubDiameter,
    joistSpacing: DEFAULTS.joistSpacing, slope: 0, slopeDir: 0, soil: DEFAULTS.soil,
    beamSection: DEFAULTS.beamSection, joistSection: DEFAULTS.joistSection, joint: DEFAULTS.joint });

  // Pilotis supplémentaires (sous un sas d'entrée, NOMAD-2026-007) : mêmes blocs, même terrain, tête à topY.
  function extraPiles(res, pts, topY, load) {
    if (!res || !res.ok || !pts.length) return [];
    const B1 = res.options.blocks.first, B2 = res.options.blocks.next, k = 1 / pts.length, kg = 0.00981, foot = B1.l * B1.w;
    return pts.map(at => { const gr = res.groundAt(at), H = topY - gr, nx = Math.max(0, Math.floor((H - B1.h) / B2.h + 1e-9));
      const G = (load ? load.G * k : 0) + (B1.kg + nx * B2.kg) * kg, Q = load ? load.Q * k : 0, S = load ? load.S * k : 0;
      return { row: 'sas', at: { x: at.x, z: at.z }, ground: gr, area: load ? load.floorArea * k : 0,
        stack: { height: H, first: 1, next: nx, shim: H - B1.h - nx * B2.h, void: H }, tooLow: H < B1.h,
        loads: { G, Q, S, els: G + Q + S, elu: 1.35 * G + 1.5 * Q + 1.5 * 0.5 * S }, pressure: (G + Q + S) / foot }; });
  }
  // Charges d'un sas d'entrée (Door.sas), aperçu 🟠 : bois (pièces × kg/m), toile, plancher + occupation, neige sur le toit.
  function sasLoad(sc, opts) {
    const L = Object.assign({}, DEFAULTS.loads, opts && opts.loads), kg = 0.00981, woodKgPerM = 1.5;   // 45 × 70 résineux
    const wood = sc.pieces.reduce((s, p) => s + p.length, 0) * woodKgPerM * kg;
    let roofPlan = 0; sc.panels.filter(p => p.kind === 'toit').forEach(p => { const q = p.pts; let a = 0; q.forEach((P, i) => { const R = q[(i + 1) % q.length]; a += P.x * R.z - R.x * P.z; }); roofPlan += Math.abs(a) / 2; });
    const G = wood + sc.coverArea * L.coverKgPerM2 * kg + sc.floorArea * L.floorG, Q = sc.floorArea * L.liveQ, S = roofPlan * L.snow * L.snowShape;
    return { G, Q, S, total: G + Q + S, wood, roofPlan, floorArea: sc.floorArea };
  }
  // Ajoute des pilotis (sas) au plancher : quantités, total, pilotis le plus chargé.
  function withExtra(res, extra) {
    if (!res || !res.ok || !extra || !extra.length) return res;
    const piles = res.piles.concat(extra), pmax = Math.max(...piles.map(p => p.pressure)), soil = res.loads.soil, ratio = pmax / soil.q;
    const warnings = res.warnings.filter(w => !w.startsWith('Pression sous le bloc'));
    if (ratio > 1) warnings.push('Pression sous le bloc le plus chargé (' + Math.round(pmax) + ' kPa) au-delà de la valeur courante pour « ' + soil.name + ' » (' + soil.q + ' kPa) : agrandir l\'assise.');
    if (extra.some(p => p.tooLow)) warnings.push('Sous le sas, le terrain est trop haut pour un bloc d\'assise complet : décaisser davantage.');
    return Object.assign({}, res, { piles, warnings,
      loads: Object.assign({}, res.loads, { pmax, ratio, totalEls: piles.reduce((s, p) => s + p.loads.els, 0) }),
      qty: Object.assign({}, res.qty, { piles: piles.length, pilesSas: extra.length, blocksFirst: piles.length, blocksNext: piles.reduce((s, p) => s + p.stack.next, 0) }) });
  }

  // Pièces 3D pour le rendu (repère du Design, plancher fini à y = 0) : poutres, solives, blocs, panneaux.
  function scene(res, extra) {
    if (!res || !res.ok) return null;
    const o = res.options, lv = res.levels, beams = [], boxes = [], panels = [];
    const P3 = (p, y) => ({ x: p.x, y, z: p.z });
    res.beams.forEach(b => beams.push({ kind: b.kind, a: P3(b.a, lv.beamBottom + o.beam.d / 2), b: P3(b.b, lv.beamBottom + o.beam.d / 2), w: o.beam.w, d: o.beam.d }));
    res.joists.forEach(j => beams.push({ kind: 'solive', a: P3(j.a, lv.beamTop + o.joist.d / 2), b: P3(j.b, lv.beamTop + o.joist.d / 2), w: o.joist.w, d: o.joist.d }));
    const B1 = o.blocks.first, B2 = o.blocks.next;
    res.piles.concat(extra || []).forEach(p => {
      const rot = Math.atan2(p.at.z, p.at.x) * 180 / Math.PI + 90;   // bloc couché le long de la ceinture
      let y = p.ground;
      boxes.push({ kind: 'gravier', x: p.at.x, y: y - 0.025, z: p.at.z, l: B1.l + 0.2, w: B1.w + 0.2, h: 0.05, rot });
      boxes.push({ kind: 'bloc29', x: p.at.x, y: y + B1.h / 2, z: p.at.z, l: B1.l, w: B1.w, h: B1.h, rot }); y += B1.h;
      for (let k = 0; k < p.stack.next; k++) { boxes.push({ kind: 'bloc19', x: p.at.x, y: y + B2.h / 2, z: p.at.z, l: B2.l, w: B2.w, h: B2.h, rot: rot + 90 * (k % 2 ? 0 : 1) }); y += B2.h; }
      if (p.stack.shim > 0.002) boxes.push({ kind: 'cale', x: p.at.x, y: y + p.stack.shim / 2, z: p.at.z, l: 0.2, w: 0.15, h: p.stack.shim, rot });
    });
    res.panels.forEach(pn => panels.push({ kind: pn.kind, type: pn.type, typeIdx: res.sectorTypes.indexOf(pn.type), pts: pn.pts, y0: -o.deckThickness, y1: 0 }));
    return { beams, boxes, panels, groundY: Math.min(...res.piles.map(p => p.ground)) - 0.05 };
  }

  // ---- solidité des solives et des poutres (aperçu 🟡, Eurocode 5 simplifié) ----
  // Image : une planche posée sur deux tréteaux. Elle doit ne pas casser (flexion), ne pas se fendre
  // près des appuis (cisaillement) et ne pas trop plier (flèche ≤ portée / 300 sous les charges
  // de calcul, fluage compris). Chaque pièce est une poutre sur deux appuis avec une charge répartie.
  // kmod 0,8 (charges de moyenne durée, classe de service 2), γM 1,3, kcr 0,67, kdef 0,8, ψ2 0,3.
  const KMOD = 0.8, GM = 1.3, KCR = 0.67, KDEF = 0.8, PSI2 = 0.3, LIM = 300;
  // une pièce : section s (w, d, grade), portée l (m), charges réparties g et q (kN/m, g sans poids propre)
  function checkPiece(sec, l, g, q) {
      const gr = GRADES[sec.grade] || GRADES.C24, b = sec.w * 1000, h = sec.d * 1000, Lmm = l * 1000;
      const gTot = g + gr.rho * 9.81e-3 * sec.w * sec.d;                    // + poids propre (kN/m)
      const qd = 1.35 * gTot + 1.5 * q;                                      // ELU (kN/m = N/mm)
      const M = qd * Lmm * Lmm / 8, V = qd * Lmm / 2, W = b * h * h / 6, I = b * h * h * h / 12;
      const fm = KMOD * gr.fm / GM, fv = KMOD * gr.fv / GM;
      const defl = w => 5 * w * Math.pow(Lmm, 4) / (384 * gr.E * I);
      const wfin = defl(gTot) * (1 + KDEF) + defl(q) * (1 + PSI2 * KDEF);
      const r = { bending: M / W / fm, shear: 1.5 * V / (b * h * KCR) / fv, deflection: wfin / (Lmm / LIM), wfin, span: l };
      r.max = Math.max(r.bending, r.shear, r.deflection); r.ok = r.max <= 1 + 1e-9;
      return r;
  }
  // un poteau : compression avec flambement (EN 1995-1-1 §6.3.2), section s, hauteur H (m), effort N (kN, ELU)
  // classes : f_c,0 (MPa) et E_0,05 (MPa)
  const POST = { C16: { fc: 17, E05: 5400 }, C24: { fc: 21, E05: 7400 } };
  function checkPost(sec, H, N) {
    const g = POST[sec.grade] || POST.C24, b = Math.min(sec.w, sec.d) * 1000, A = sec.w * sec.d * 1e6, i = b / Math.sqrt(12);
    const lam = H * 1000 / i, lrel = lam / Math.PI * Math.sqrt(g.fc / g.E05), k = 0.5 * (1 + 0.2 * (lrel - 0.3) + lrel * lrel);
    const kc = Math.min(1, 1 / (k + Math.sqrt(k * k - lrel * lrel))), fcd = KMOD * g.fc / GM;
    const r = { compression: N * 1000 / A / (kc * fcd), kc, slenderness: lam, height: H, N };
    r.max = r.compression; r.ok = r.max <= 1 + 1e-9;
    return r;
  }
  function strength(res) {
    if (!res || !res.ok) return null;
    const o = res.options, L = o.loads, piece = checkPiece;
    const p = L.floorG, q = L.liveQ;   // kN/m²
    // solives : largeur reprise = entraxe (plein) ou écart moyen entre solives voisines (étoile)
    let width = o.joistSpacing;
    // étoile : la largeur reprise diminue vers le centre (part de camembert) ; charge en trapèze ≈ charge uniforme
    // de largeur moyenne (moment maxi à 3 % près pour un triangle), écart maxi pris entre solives voisines
    if (o.deck === 'etoile') {
      const gap = pts => Math.max(...pts.map((e, i) => dist(e, pts[(i + 1) % pts.length])));
      width = (gap(res.joists.map(j => j.a)) + gap(res.joists.map(j => j.b))) / 2;
    }
    const jSec = Object.assign({ grade: 'C24' }, SECTIONS[o.joistSection], o.joist);
    const jSpan = Math.max(0, ...res.joists.map(j => j.span));
    const joist = Object.assign(piece(jSec, jSpan, p * width, q * width), { width, section: o.joistSection });
    // poutres : portée = plus grand écart entre pilotis sous la poutre ; charge = surface reprise par la rangée / longueur des poutres
    const bSec = Object.assign({ grade: 'C24' }, SECTIONS[o.beamSection], o.beam);
    const spanOnPiles = bm => {
      const ts = res.piles.map(pl => { const ab = { x: bm.b.x - bm.a.x, z: bm.b.z - bm.a.z }, l2 = ab.x * ab.x + ab.z * ab.z;
        const t = ((pl.at.x - bm.a.x) * ab.x + (pl.at.z - bm.a.z) * ab.z) / l2, c = { x: bm.a.x + t * ab.x, z: bm.a.z + t * ab.z };
        return t > -1e-6 && t < 1 + 1e-6 && dist(c, pl.at) < 0.02 ? t : null; }).filter(t => t !== null).sort((a, b) => a - b);
      const len = dist(bm.a, bm.b);
      if (ts.length < 2) return len;
      return Math.max(ts[0] * len, (1 - ts[ts.length - 1]) * len, ...ts.slice(1).map((t, k) => (t - ts[k]) * len));
    };
    const rows = [{ key: 'ceinture', beams: res.beams.filter(b => b.kind === 'ceinture'), piles: res.piles.filter(pl => pl.row === 'exterieure') },
      { key: 'interieur', beams: res.beams.filter(b => b.kind !== 'ceinture'), piles: res.piles.filter(pl => pl.row !== 'exterieure') }];
    const beams = rows.filter(rw => rw.beams.length).map(rw => {
      const area = rw.piles.reduce((t, pl) => t + pl.area, 0), len = rw.beams.reduce((t, b) => t + dist(b.a, b.b), 0), tw = area / len;
      const span = Math.max(...rw.beams.map(spanOnPiles));
      return Object.assign(piece(bSec, span, p * tw, q * tw), { key: rw.key, width: tw, section: o.beamSection });
    });
    // section conseillée : la plus petite (par aire) de la même famille qui passe
    const suggest = (cur, test) => {
      const fam = cur.split('-')[0], list = Object.keys(SECTIONS).filter(k => k.split('-')[0] === fam && !SECTIONS[k].post).sort((a, b) => SECTIONS[a].w * SECTIONS[a].d - SECTIONS[b].w * SECTIONS[b].d);
      return list.find(k => test(SECTIONS[k]).ok) || null;
    };
    if (!joist.ok) joist.suggest = suggest(o.joistSection, sc => piece(Object.assign({}, sc), jSpan, p * width, q * width));
    beams.forEach(bm => { if (!bm.ok) bm.suggest = suggest(o.beamSection, sc => piece(Object.assign({}, sc), bm.span, p * bm.width, q * bm.width)); });
    return { joist, beams, ok: joist.ok && beams.every(b => b.ok), loads: { G: p, Q: q } };
  }

  const Floor = { SUPPORTS, DECKS, SOILS, SECTIONS, JOINTS, GRADES, strength, checkPiece, checkPost, DEFAULTS,
 layout, scene, choices, extraPiles, sasLoad, withExtra, baseRing, pentagonIdx, polyArea, segX };
  if (typeof module !== 'undefined' && module.exports) module.exports = Floor;
  else global.Floor = Floor;
})(typeof window !== 'undefined' ? window : globalThis);
