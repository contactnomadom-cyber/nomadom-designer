// ---------------------------------------------------------
// sas-toile.js — Toile d'un sas d'entrée (NOMAD-2026-007, étape 3) : patrons, raccord au dôme,
// recouvrements dans le sens de l'eau, consommation de rouleau. Logique pure, sans DOM
// (le HTML renvoyé est du texte), testée sous Node (tests/node/sas-toile.test.js). Unités : m.
//
// Image : le sas est un tunnel droit ; chaque face du tunnel est plate. On la déroule comme
// une planche : un trapèze rectangle — le grand bord le long du bout du sas, le bord biais le
// long du montant du dôme où la face s'arrête.
//
// Étanchéité avant tout (ADR-0002) :
//  - côté dôme, chaque pièce a un RABAT qui passe SOUS la toile du dôme (comme les tuiles : la
//    pièce du haut recouvre celle du bas, l'eau qui coule du dôme ne rentre pas dans le raccord) ;
//  - entre deux faces, la pièce la plus haute recouvre la plus basse ; au faîtage, une bande de
//    faîtage recouvre les deux ;
//  - pied des parois : ourlet ; bout extérieur : couture avec le pignon (sas extérieur) ou ourlet
//    fixé sur l'huisserie (sas intérieur, le bout extérieur est la porte 1).
// Statut 🟠 : patrons calculés, non vérifiés en atelier ; pas encore placés sur le rouleau avec
// le reste du dôme (nesting) ni exportés en fiches de traçage.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const FLAP = 0.10;   // rabat sous la toile du dôme
  const RIDGE = 0.15;  // largeur de la bande de faîtage

  function patterns(sc, fabric) {
    const g = sc.geom, loop = g.loop, m = loop.length;
    const seam = (fabric && fabric.seam) || { A: 0.02, B: 0.02, hem: 0.05 }, usable = (fabric && fabric.usable) || 1.48;
    const ground = p => p.t < 1e-7;
    const faces = [];
    for (let i = 0; i < m; i++) {
      const p = loop[i], q = loop[(i + 1) % m];
      if (ground(p) && ground(q)) continue;   // plancher du sas : pas de toile
      const Le = Math.hypot(q.s - p.s, q.t - p.t), Lp = Math.abs(g.dOuter - p.d), Lq = Math.abs(g.dOuter - q.d);
      faces.push({ i, p, q, Le, Lp, Lq, kind: Math.abs(q.t - p.t) <= Math.abs(q.s - p.s) ? 'toit' : 'paroi',
        strut: Math.hypot(Le, q.d - p.d), top: Math.max(p.t, q.t), area: Le * (Lp + Lq) / 2 });
    }
    // voisins par nœud : couture (et qui recouvre qui) ou pied de paroi
    const byNode = new Map(); faces.forEach(f => [f.p.id, f.q.id].forEach(id => { if (!byNode.has(id)) byNode.set(id, []); byNode.get(id).push(f); }));
    const seams = [];
    byNode.forEach((fs, id) => {
      if (fs.length !== 2) return;
      const [a, b] = fs, other = f => (f.p.id === id ? f.q : f.p);
      const ta = other(a).t, tb = other(b).t, tn = loop.find(x => x.id === id).t;
      if (ta < tn && tb < tn) seams.push({ node: id, ridge: true, faces: [a, b] });
      else seams.push({ node: id, upper: ta >= tb ? a : b, lower: ta >= tb ? b : a });
    });
    // surplus par pièce et taille sur le rouleau
    const pieces = faces.map((f, k) => {
      const side = node => ground(node) ? { kind: 'ourlet de pied', a: seam.hem } : { kind: 'couture', a: null };
      const left = side(f.p), right = side(f.q);
      if (left.a === null) left.a = seam.A; if (right.a === null) right.a = seam.B;
      const outer = g.outerIsToile ? { kind: 'couture avec le pignon', a: seam.A } : { kind: 'ourlet sur l\'huisserie', a: seam.hem };
      const width = f.Le + left.a + right.a, length = Math.max(f.Lp, f.Lq) + outer.a + FLAP;
      const les = Math.max(1, Math.ceil(width / usable - 1e-9));
      return { name: 'S' + (k + 1), kind: f.kind, Le: f.Le, Lp: f.Lp, Lq: f.Lq, area: f.area, strut: f.strut,
        allow: { left, right, outer, dome: { kind: 'rabat sous la toile du dôme', a: FLAP } }, width, length, les,
        roll: length * les, nodes: [f.p.id, f.q.id],
        // contour net (m) : x le long du bout du sas, y depuis le bout extérieur vers le dôme
        net: [{ x: 0, y: 0 }, { x: f.Le, y: 0 }, { x: f.Le, y: f.Lq }, { x: 0, y: f.Lp }] };
    });
    const nameOf = f => pieces[faces.indexOf(f)].name;
    const overlaps = seams.map(sm => sm.ridge ? { node: sm.node, ridge: true, pieces: sm.faces.map(nameOf), text: 'faîtage : bande de ' + Math.round(RIDGE * 1000) + ' mm qui recouvre ' + sm.faces.map(nameOf).join(' et ') }
      : { node: sm.node, upper: nameOf(sm.upper), lower: nameOf(sm.lower), text: nameOf(sm.upper) + ' recouvre ' + nameOf(sm.lower) + ' (la pièce du haut par-dessus)' });
    // faîtage : bande sur toute la longueur
    const ridgeLen = seams.filter(s => s.ridge).reduce((t, s) => t + Math.max(...s.faces.map(f => Math.max(f.Lp, f.Lq))), 0);
    // pignon (sas extérieur) : contour moins la porte du bout
    let pignon = null;
    if (g.outerIsToile) {
      const C = g.contour; let a = 0; C.forEach((p, i) => { const q = C[(i + 1) % C.length]; a += p.s * q.t - q.s * p.t; });
      const door = g.outerDoor, net = Math.abs(a) / 2 - door.width * door.height;
      const ss = C.map(p => p.s), W = Math.max(...ss) - Math.min(...ss), H = Math.max(...C.map(p => p.t));
      const width = W + 2 * seam.A, length = H + seam.A + seam.hem, les = Math.max(1, Math.ceil(width / usable - 1e-9));
      pignon = { name: 'P', area: net, width, length, les, roll: length * les, doorHole: { width: door.width, height: door.height }, contour: C, door };
    }
    const net = pieces.reduce((t, p) => t + p.area, 0) + (pignon ? pignon.area : 0);
    const roll = pieces.reduce((t, p) => t + p.roll, 0) + (pignon ? pignon.roll : 0) + (ridgeLen ? ridgeLen + 0.1 : 0);
    return { direction: sc.direction, length: sc.length, pieces, pignon, overlaps, ridge: { length: ridgeLen, width: RIDGE },
      raccord: { length: pieces.reduce((t, p) => t + p.strut, 0), flap: FLAP, struts: pieces.map(p => ({ piece: p.name, length: p.strut })) },
      netArea: net, rollLength: roll, laize: fabric ? fabric.laize : 1.5, usable };
  }

  // ---- fiche HTML (Cover+) ----
  const mm = v => Math.round(v * 1000) + ' mm', m2 = v => v.toFixed(2).replace('.', ',') + ' m²', m = v => v.toFixed(2).replace('.', ',') + ' m';
  function pieceSvg(p) {
    const W = 150, H = 110, sx = (W - 20) / Math.max(p.Le, 0.3), sy = (H - 24) / Math.max(p.Lp, p.Lq, 0.3), k = Math.min(sx, sy);
    const X = x => (10 + x * k).toFixed(1), Y = y => (H - 14 - y * k).toFixed(1);
    const pts = p.net.map(q => X(q.x) + ',' + Y(q.y)).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"><polygon points="' + pts + '" fill="#f3ead9" stroke="#7d6a50" stroke-width="1.2"/>' +
      '<line x1="' + X(0) + '" y1="' + Y(p.Lp) + '" x2="' + X(p.Le) + '" y2="' + Y(p.Lq) + '" stroke="#1f5a8a" stroke-width="2.4"/>' +
      '<text x="' + X(p.Le / 2) + '" y="' + (H - 3) + '" font-size="8" text-anchor="middle">' + mm(p.Le) + '</text>' +
      '<text x="' + X(p.Le / 2) + '" y="' + (+Y(Math.max(p.Lp, p.Lq)) - 4) + '" font-size="8" text-anchor="middle" fill="#1f5a8a">côté dôme</text>' +
      '<text x="' + X(p.Le / 2) + '" y="' + Y(Math.min(p.Lp, p.Lq) / 2) + '" font-size="11" font-weight="bold" text-anchor="middle">' + p.name + '</text></svg>';
  }
  function html(list) {
    if (!list || !list.length) return '';
    return list.map((T, n) => {
      let h = '<div class="sas-toile"><b>Toile du sas ' + (list.length > 1 ? (n + 1) + ' ' : '') + '</b><span class="muted"> 🟠 patrons calculés, non vérifiés en atelier · pas encore placés sur le rouleau avec le dôme</span>';
      h += '<div class="door-note">Chaque face du tunnel est plate : on la déroule en trapèze. Le bord bleu suit le montant du dôme ; son rabat de ' + mm(T.raccord.flap) +
        ' passe sous la toile du dôme (comme les tuiles, celle du haut recouvre celle du bas).</div>';
      h += '<div class="sas-pieces">' + T.pieces.map(p => '<figure>' + pieceSvg(p) + '<figcaption>' + p.name + ' · ' + p.kind + '<br>' + mm(p.Le) + ' × ' + mm(p.Lp) + ' / ' + mm(p.Lq) +
        '<br>coupe ' + mm(p.width) + ' × ' + mm(p.length) + (p.les > 1 ? ' · ' + p.les + ' lés' : '') + '</figcaption></figure>').join('') + '</div>';
      h += '<table class="floor-t"><tr><th>pièce</th><th>bord gauche</th><th>bord droit</th><th>bout</th><th>côté dôme</th><th>m²</th></tr>' +
        T.pieces.map(p => '<tr><td>' + p.name + '</td><td>' + p.allow.left.kind + ' ' + mm(p.allow.left.a) + '</td><td>' + p.allow.right.kind + ' ' + mm(p.allow.right.a) + '</td><td>' + p.allow.outer.kind + ' ' + mm(p.allow.outer.a) +
          '</td><td>rabat ' + mm(p.allow.dome.a) + ' · montant ' + mm(p.strut) + '</td><td>' + p.area.toFixed(2).replace('.', ',') + '</td></tr>').join('') + '</table>';
      h += '<dl>' + (T.pignon ? '<dt>Pignon (bout, autour de la porte 2)</dt><dd>' + m2(T.pignon.area) + ' net · coupe ' + mm(T.pignon.width) + ' × ' + mm(T.pignon.length) + (T.pignon.les > 1 ? ' en ' + T.pignon.les + ' lés (coutures verticales à recouvrement)' : '') + ' · ourlet autour de la porte</dd>' : '') +
        '<dt>Recouvrements (sens de l\'eau)</dt><dd>' + T.overlaps.map(o => o.text).join(' · ') + '</dd>' +
        '<dt>Raccord au dôme</dt><dd>' + m(T.raccord.length) + ' le long des montants du cadre de l\'ouverture, rabat de ' + mm(T.raccord.flap) + ' sous la toile du dôme</dd>' +
        '<dt>Total</dt><dd>' + m2(T.netArea) + ' net · environ ' + m(T.rollLength) + ' de rouleau (laize ' + mm(T.laize) + ')</dd></dl></div>';
      return h;
    }).join('');
  }

  const SasToile = { FLAP, RIDGE, patterns, html };
  if (typeof module !== 'undefined' && module.exports) module.exports = SasToile;
  else global.SasToile = SasToile;
})(typeof window !== 'undefined' ? window : globalThis);
