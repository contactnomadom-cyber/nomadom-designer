// ---------------------------------------------------------
// floor-ui.js — Fiche « Plancher et soubassement » de l'onglet Base (NOMAD-2026-006).
// Texte HTML seulement, à partir de Floor.layout ; les événements restent dans app.js
// (attributs data-floor-f, data-floor-on, data-floor-off).
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mm = v => Math.round(v * 1000) + ' mm', m = v => v.toFixed(2).replace('.', ',') + ' m', kN = v => v.toFixed(1).replace('.', ',') + ' kN';
  const SUPPORT = { pilotis: 'Pilotis (ceinture + triangle central)', pentagone: 'Pentagone + triangle central (2 rangées de pilotis)' };
  const DECK = { etoile: 'En étoile (suit la géodésie)', plein: 'Plein (solives parallèles)' };
  const WHY = {
    pilotis: 'Comme une roue de vélo posée à plat : la ceinture (la jante) repose sur 15 pilotis, un sous chaque nœud de base, et le petit triangle central (le moyeu) sur 3 pilotis.',
    pentagone: 'On ajoute une deuxième roue dans la première : un pentagone de poutres (un sommet tous les 3 nœuds de base), porté en plus par un pilotis au milieu de chaque côté. Les solives ont un appui de plus à mi-chemin.',
    etoile: 'Comme les parts d\'un camembert : une solive part de chaque nœud de base vers le triangle central ; les panneaux sont des triangles (deux modèles, un par longueur de côté de base) autour d\'une pièce centrale pleine.',
    plein: 'Comme un parquet classique : des solives parallèles, à entraxe régulier, sous un plateau plein. Leur direction est choisie pour la plus petite portée.'
  };
  const sel = (f, cur, opts) => '<select data-floor-f="' + f + '">' + Object.keys(opts).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(opts[k]) + '</option>').join('') + '</select>';
  const num = (f, lab, v, min, max, step) => '<label>' + lab + ' <input type="number" data-floor-f="' + f + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>';

  // plan vu de dessus (SVG) : panneaux, solives, poutres, pilotis
  function plan(r) {
    const R = Math.max(...r.poly.map(p => Math.hypot(p.x, p.z))) * 1.08, S = 320, k = S / (2 * R), X = p => ((p.x + R) * k).toFixed(1), Y = p => ((R - p.z) * k).toFixed(1);
    const pts = l => l.map(p => X(p) + ',' + Y(p)).join(' ');
    const line = (a, b, c, w, dash) => '<line x1="' + X(a) + '" y1="' + Y(a) + '" x2="' + X(b) + '" y2="' + Y(b) + '" stroke="' + c + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + '/>';
    const COL = { ceinture: '#6b4426', pentagone: '#9c3d1c', triangle: '#1f5a8a' };
    let g = r.panels.map(pn => '<polygon points="' + pts(pn.pts) + '" fill="' + (pn.kind === 'centre' ? '#b98d63' : (r.sectorTypes.indexOf(pn.type) ? '#ecd9bd' : '#f5e8d2')) + '" stroke="#c9a77f" stroke-width="0.8"/>').join('');
    g += r.joists.map(j => line(j.a, j.b, '#a8875f', 1.5, true)).join('');
    g += r.beams.map(b => line(b.a, b.b, COL[b.kind], b.kind === 'ceinture' ? 4 : 3.5)).join('');
    g += r.piles.map(p => '<rect x="' + (X(p.at) - 5) + '" y="' + (Y(p.at) - 5) + '" width="10" height="10" fill="' + (p.row === 'exterieure' ? '#7d7d78' : '#c0392b') + '" stroke="#333" stroke-width="0.6"/>').join('');
    const leg = [['#6b4426', 'ceinture'], ['#9c3d1c', 'pentagone'], ['#1f5a8a', 'triangle'], ['#a8875f', 'solives'], ['#7d7d78', 'pilotis ext.'], ['#c0392b', 'pilotis 2ᵉ rangée']]
      .filter(([, n]) => n !== 'pentagone' || r.pentagon).map(([c, n]) => '<span><i style="background:' + c + '"></i>' + n + '</span>').join('');
    return '<div class="floor-plan"><svg viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '">' + g + '</svg><div class="op-legend">' + leg + '</div><div class="muted">plan vu de dessus, plancher fini</div></div>';
  }

  function html(F, f, r) {
    let h = '<div class="sheet-head"><b>Plancher et soubassement</b>' + (f ? '<button class="ghost" data-floor-off="1">Retirer le plancher</button>' : '') +
      '<span class="muted">pilotis, poutres, solives, plancher · aperçu 🟠</span></div>';
    if (!f) return h + '<div class="op-status"><button data-floor-on="1">Ajouter un plancher sur pilotis</button></div>';
    h += '<div class="door-choice"><b>Choix</b><label>Soubassement ' + sel('support', f.support, SUPPORT) + '</label><label>Plancher ' + sel('deck', f.deck, DECK) + '</label>' +
      '<span class="muted">Plancher en diaphragme : plus tard</span></div>';
    // bois : sections au choix (provisoires, CLS, KVH) et assemblage des cadres
    const SEC = Object.fromEntries(Object.keys(F.SECTIONS || {}).map(k => [k, F.SECTIONS[k].name]));
    if (F.SECTIONS) h += '<div class="door-choice"><b>Bois</b><label>Poutres ' + sel('beamSection', f.beamSection || 'prov-75x195', SEC) + '</label>' +
      '<label>Solives ' + sel('joistSection', f.joistSection || 'prov-45x145', SEC) + '</label>' +
      '<label>Assemblage des cadres ' + sel('joint', f.joint || 'onglet', F.JOINTS) + '</label>' +
      '<span class="muted">🟠 sections et portées à vérifier avec les tables de dimensionnement</span></div>';
    h += '<div class="door-in">' + num('triangleDiameter', 'Cercle du triangle (m)', f.triangleDiameter, 1, 1.5, 0.05) +
      (f.deck === 'etoile' ? num('hubDiameter', 'Pièce centrale Ø (m)', f.hubDiameter, 0.8, 1, 0.05) : num('joistSpacing', 'Entraxe solives (m)', f.joistSpacing, 0.3, 0.6, 0.05)) +
      num('slope', 'Pente du terrain (%)', f.slope, 0, 30, 1) + num('slopeDir', 'Direction de la pente (°)', f.slopeDir, 0, 359, 5) +
      '<label>Sol d\'assise ' + sel('soil', f.soil, Object.fromEntries(Object.keys(F.SOILS).map(k => [k, F.SOILS[k].name + ' (' + F.SOILS[k].q + ' kPa)']))) + '</label></div>';
    h += '<div class="door-note">' + esc(WHY[r.support] || '') + ' ' + esc(WHY[r.deck] || '') + '</div>';
    if (!r.ok) return h + '<div class="op-status err">' + r.errors.map(esc).join('<br>') + '</div>';
    r.warnings.forEach(w => { h += '<div class="op-status err">⚠ ' + esc(w) + '</div>'; });
    h += plan(r);
    const q = r.qty, L = r.loads;
    h += '<div class="door-3d"><b>Quantités</b> <span class="muted">🟠 aperçu · longueurs d\'axe · poutres ' + Math.round(r.options.beam.w * 1000) + ' × ' + Math.round(r.options.beam.d * 1000) + ', solives ' + Math.round(r.options.joist.w * 1000) + ' × ' + Math.round(r.options.joist.d * 1000) + '</span><dl>' +
      '<dt>Pilotis</dt><dd>' + q.piles + ' (' + q.pilesOuter + ' sous les nœuds de base' + (q.pilesInner ? ' + ' + q.pilesInner + ' en 2ᵉ rangée' : '') + (q.pilesSas ? ' + ' + q.pilesSas + ' sous le sas' : '') + ')</dd>' +
      '<dt>Blocs béton</dt><dd>' + q.blocksFirst + ' × 39 × 29 × 19 (assise, couchés) + ' + q.blocksNext + ' × 39 × 19 × 19</dd>' +
      '<dt>Ceinture</dt><dd>' + m(q.beams.ceinture) + ' (' + r.ring.length + ' côtés)</dd>' +
      (q.beams.pentagone ? '<dt>Pentagone</dt><dd>' + m(q.beams.pentagone) + ' (5 côtés de ' + mm(q.beams.pentagone / 5) + ')</dd>' : '') +
      '<dt>Triangle central</dt><dd>' + m(q.beams.triangle) + ' (3 côtés de ' + mm(q.beams.triangle / 3) + ')</dd>' +
      '<dt>Solives</dt><dd>' + q.joists + ' · ' + m(q.joistLength) + ' · portée libre maxi ' + mm(r.maxJoistSpan) + (r.joistAngle !== null ? ' · direction ' + Math.round(r.joistAngle) + '°' : '') + '</dd>' +
      (r.deck === 'etoile' ? '<dt>Panneaux en triangle</dt><dd>2 modèles : ' + r.sectorTypes.map(t => r.panels.filter(p => p.type === t).length + ' sur côté de ' + t + ' mm').join(' · ') + ' · pièce centrale Ø ' + mm(r.options.hubDiameter) + '</dd>' : '') +
      '<dt>Surface de plancher</dt><dd>' + q.deckArea.toFixed(2).replace('.', ',') + ' m²</dd>' +
      '<dt>Vide ventilé</dt><dd>' + mm(r.voidMin) + ' au point le plus haut du terrain (mini 300 mm)</dd></dl></div>';
    // pilotis : empilement et charges
    const rows = r.piles.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + (p.row === 'exterieure' ? 'ext.' : p.row === 'sas' ? 'sas' : 'int.') + '</td><td>' + mm(p.stack.height) + '</td><td>1 + ' + p.stack.next + '</td><td>' + mm(p.stack.shim) + '</td><td>' +
      p.area.toFixed(2).replace('.', ',') + '</td><td>' + kN(p.loads.els) + '</td><td>' + Math.round(p.pressure) + '</td></tr>').join('');
    h += '<details class="door-lib"><summary>Pilotis : blocs et charges (' + r.piles.length + ')</summary><table class="floor-t"><tr><th>n°</th><th>rangée</th><th>hauteur sous poutre</th><th>blocs 29 + 19</th><th>calage</th><th>zone (m²)</th><th>charge</th><th>kPa</th></tr>' + rows + '</table></details>';
    h += '<div class="door-3d"><b>Charges et portance</b> <span class="muted">🟠 ordres de grandeur, pas une note de calcul · vent (soulèvement) non calculé</span><dl>' +
      '<dt>Poids du dôme (montants, nœuds, toile)</dt><dd>' + kN(L.domeG) + ' sur les ' + q.pilesOuter + ' pilotis de la ceinture</dd>' +
      '<dt>Neige</dt><dd>' + kN(L.snowS) + ' (' + String(r.options.loads.snow).replace('.', ',') + ' kN/m² × ' + String(r.options.loads.snowShape).replace('.', ',') + ' sur ' + L.floorArea.toFixed(1).replace('.', ',') + ' m²)</dd>' +
      (q.pilesSas ? '<dt>Sas d\'entrée (bois, toile, plancher, occupation, neige)</dt><dd>' + kN(r.piles.filter(p => p.row === 'sas').reduce((t, p) => t + p.loads.els, 0)) + ' sur ' + q.pilesSas + ' pilotis du sas</dd>' : '') +
      '<dt>Plancher + occupation</dt><dd>' + String(r.options.loads.floorG).replace('.', ',') + ' + ' + String(r.options.loads.liveQ).replace('.', ',') + ' kN/m² (habitation)</dd>' +
      '<dt>Total sur les pilotis</dt><dd>' + kN(L.totalEls) + ' (≈ ' + Math.round(L.totalEls / 9.81 * 100) / 100 + ' t)</dd>' +
      '<dt>Pilotis le plus chargé</dt><dd>' + kN(Math.max(...r.piles.map(p => p.loads.els))) + ' → ' + Math.round(L.pmax) + ' kPa sous le bloc de 39 × 29 · ' + esc(L.soil.name) + ' : ' + L.soil.q + ' kPa courants · ' +
        (L.ratio <= 1 ? '✅ ' + Math.round(L.ratio * 100) + ' % utilisé' : '⚠ ' + Math.round(L.ratio * 100) + ' %') + '</dd></dl></div>';
    h += '<details class="door-lib"><summary>Le procédé de fondation, pas à pas</summary><ol>' +
      '<li>Décaisser 15 à 30 cm de terre, jusqu\'au sol rocheux (le bon sol, pas la terre végétale qui bouge et retient l\'eau).</li>' +
      '<li>Poser un géotextile : il sépare la terre et le gravier, comme un filtre à café.</li>' +
      '<li>Gravier de nivellement : on règle chaque assise de niveau (le point le plus haut du terrain fixe la hauteur de tout le plancher).</li>' +
      '<li>Un bloc béton 39 × 29 × 19 couché à plat : la semelle, qui étale la charge (c\'est sa surface qui compte pour la portance).</li>' +
      '<li>Des blocs 39 × 19 × 19 croisés d\'un rang à l\'autre selon la pente, puis une cale en tête pour l\'ajustage fin.</li>' +
      '<li>Toujours au moins 30 cm de vide ventilé sous les poutres : l\'air circule, le bois reste sec (étanchéité avant tout).</li></ol></details>';
    h += cutList(r);
    return h;
  }

  // liste de débits (lumber.js) : pièces repérées, onglets, barres à commander, panneaux
  function cutList(r) {
    const Lb = global.Lumber, cl = Lb ? Lb.floorCutList(r) : null;
    if (!cl) return '';
    const deg = v => v ? (Math.round(v * 10) / 10).toString().replace('.', ',') + '°' : 'équerre';
    const sec = s => s.groups.reduce((t, g) => t + g.n, 0);
    let h = '<details class="door-lib" id="floorCuts"><summary>Liste de débits — bois et panneaux (' + (sec(cl.sections[0]) + sec(cl.sections[1])) + ' pièces, ' + cl.panels.sheets + ' panneaux)</summary>' +
      '<div class="muted">🟠 aperçu · cadres ' + (cl.sections[0].joint === 'about' ? 'en about : coupes d\'équerre, pièces raccourcies pour que les coins intérieurs se touchent, jour à l\'extérieur jusqu\'à ' + mm(cl.sections[0].maxGap) + ' (plaque ou équerre métallique)' : 'en onglet : longueur à la pointe longue') + ' · trait de scie ' + mm(cl.options.kerf) +
      ' · barres de ' + m(cl.options.lengths[0]) + ' à ' + m(cl.options.lengths[cl.options.lengths.length - 1]) + ' par 30 cm chez ' + esc(cl.options.supplier) + ' (suivant stock, à confirmer)</div>';
    cl.sections.forEach(s => {
      const P = s.plan;
      const secName = global.Floor && global.Floor.SECTIONS && global.Floor.SECTIONS[s.section] ? global.Floor.SECTIONS[s.section].name : Math.round(s.w * 1000) + ' × ' + Math.round(s.d * 1000);
      h += '<b>' + s.name + ' ' + esc(secName) + '</b><table class="floor-t"><tr><th>repère</th><th>rôle</th><th>nb</th><th>axe</th><th>à couper' + (s.joint === 'onglet' ? ' (pointe longue)' : '') + '</th><th>' + (s.joint === 'onglet' ? 'onglets' : 'coupes') + '</th></tr>' +
        s.groups.map(g => '<tr><td>' + g.ref + '</td><td>' + esc(g.what) + '</td><td>' + g.n + '</td><td>' + mm(g.axis) + '</td><td>' + mm(g.len) + '</td><td>' + deg(g.miter[0]) + ' / ' + deg(g.miter[1]) + '</td></tr>').join('') + '</table>' +
        '<div class="op-status">À commander : ' + Object.keys(P.buy).sort((a, b) => b - a).map(k => P.buy[k] + ' × ' + k.replace('.', ',') + ' m').join(' + ') +
        ' = ' + m(P.bought) + ' pour ' + m(P.net) + ' de coupes · chute ' + Math.round(P.wasteRatio * 100) + ' %' +
        (P.tooLong.length ? ' · ⚠ ' + P.tooLong.length + ' pièce(s) plus longue(s) que ' + m(cl.options.lengths[cl.options.lengths.length - 1]) + ' : à abouter' : '') + '</div>' +
        '<details><summary>Plan de coupe des barres (' + P.bars.length + ')</summary><ol>' + P.bars.map(b => '<li>' + m(b.stock) + ' : ' + b.cuts.map(c => c.ref + ' ' + mm(c.len)).join(' · ') + ' · chute ' + mm(b.waste) + '</li>').join('') + '</ol></details>';
    });
    const pn = cl.panels;
    h += '<b>Panneaux de plancher ' + Math.round(pn.thickness * 1000) + ' mm</b><div class="op-status">' + pn.area.toFixed(2).replace('.', ',') + ' m² → ' + pn.sheets + ' panneaux de ' +
      m(pn.sheet.l) + ' × ' + m(pn.sheet.w) + ' (chute comptée ' + Math.round(pn.waste * 100) + ' %) · OSB ou multiplex · format 🟠 à confirmer</div></details>';
    return h;
  }

  const FloorUI = { html, plan, cutList, SUPPORT, DECK };
  if (typeof module !== 'undefined' && module.exports) module.exports = FloorUI;
  else global.FloorUI = FloorUI;
})(typeof window !== 'undefined' ? window : globalThis);
