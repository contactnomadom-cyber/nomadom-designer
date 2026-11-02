// ---------------------------------------------------------
// door-ui.js — Fiche « Porte d'aplomb » de l'onglet Base (NOMAD-2026-005) : réglages, résultat,
// choix constructifs, raccords et bibliothèque d'assemblages. Ne fait que du texte HTML
// à partir des calculs (door.js) et des fiches (joinery.js) ; les événements restent dans app.js
// (attributs data-door-key / data-door-f / data-door-add / data-door-del / data-joint-fiche).
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mm = v => Math.round(v * 1000) + ' mm', m2 = v => v.toFixed(2) + ' m²';
  const PIECES = { huisserie: 'Huisserie (montants, linteau, seuil)', chevetre: 'Chevêtre (posé sur le linteau)', appui: 'Appuis du chevêtre (jusqu\'au montant du dôme)',
    contrefiche: 'Contrefiches (du chevêtre au nœud du dôme)', potelet: 'Potelets', rampant: 'Rampants (bord haut, plan de porte)', chevron: 'Chevrons du toit (jusqu\'au dôme)',
    poteau: 'Poteaux d\'angle', lisse: 'Lisses basses (jusqu\'au seuil du dôme)', traverse: 'Traverses des parois' };
  const SUPPORT = { poteaux: 'Poteaux d\'angle au sol + lisses basses', parois: 'Poteaux + parois latérales fermées', 'porte-a-faux': '⛔ Porte-à-faux (déconseillé)' };
  const SUPPORT_WHY = {
    poteaux: 'Comme les pieds d\'une table : les bouts du chevêtre descendent au sol par un poteau, et une lisse basse relie chaque pied au seuil du dôme.',
    parois: 'Comme une cabane accolée : les poteaux reçoivent des traverses qui ferment les côtés jusqu\'au cadre du dôme ; l\'avant-corps devient une petite pièce.',
    'porte-a-faux': 'Comme une étagère sans équerre : tout le poids du toit pend sur les appuis vissés au dôme. Gardé pour comparer, sans document de fabrication.' };
  const ATTACH = { montant: 'sur le montant (n\'importe où)', noeud: 'sur un nœud seulement' };
  const sel = (key, f, cur, opts) => '<select data-door-key="' + esc(key) + '" data-door-f="' + f + '">' +
    Object.keys(opts).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(opts[k]) + '</option>').join('') + '</select>';

  function fiche(J, id) {
    const f = J.LIBRARY[id]; if (!f) return '';
    return '<div class="jfiche" data-fiche="' + id + '"><div class="jfiche-svg">' + f.svg + '</div><div><b>' + esc(f.name) + '</b> <span class="muted">🟠 fiche didactique, à valider en atelier</span>' +
      '<p><i>' + esc(f.analogy) + '</i></p><dl><dt>Quand</dt><dd>' + esc(f.use) + '</dd><dt>Limites</dt><dd>' + esc(f.limits) + '</dd><dt>Outillage</dt><dd>' + esc(f.tools) + '</dd></dl>' +
      '<ol>' + f.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol></div></div>';
  }

  // o = { key, door, result (Door.compute), structure (Door.structure), joints (Joinery.resolve), fiche (id ouvert ou null), deep (recul maxi) }
  function html(J, o) {
    const key = o.key, d = o.door, r = o.result, sk = o.structure;
    const num = (f, lab, v, min, max, step) => '<label>' + lab + ' <input type="number" data-door-key="' + esc(key) + '" data-door-f="' + f + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>';
    let h = '<div class="door"><div class="door-head"><b>Porte d\'aplomb</b><button class="ghost" data-door-del="' + esc(key) + '">Retirer la porte</button></div>';
    if (!r.ok) return h + '<div class="op-warn">' + esc(r.error) + '</div></div>';
    h += '<div class="door-in">' + num('width', 'Largeur (m)', d.width, 0.5, 3, 0.01) + num('height', 'Hauteur (m)', d.height, 1.5, 3, 0.01) +
      num('offset', 'Décalage (m)', d.offset, -2, 2, 0.01) +
      '<label>Recul vers l\'intérieur <input type="range" data-door-key="' + esc(key) + '" data-door-f="setback" min="0" max="' + o.deep.toFixed(3) + '" step="0.01" value="' + d.setback + '"> ' + mm(d.setback) + ' / ' + mm(o.deep) + '</label></div>';
    h += r.fits ? '<div class="op-status ok">🟡 La porte passe dans l\'ouverture (calculé).</div>'
      : '<div class="op-status err">🔴 La porte ne passe pas : un montant du cadre la coupe. Maxi : ' + mm(r.max.heightForWidth) + ' de haut pour ' + mm(d.width) + ' de large, ou ' + mm(r.max.widthForHeight) + ' de large pour ' + mm(d.height) + ' de haut.</div>';
    if (!r.fits) return h + '</div>';
    const post = (n, p) => p ? '<dt>Potelet ' + n + '</dt><dd>monte de ' + mm(p.rise) + ' au-dessus du linteau, puis ' + (Math.abs(p.depth) < 0.005 ? 'touche le cadre' : (p.depth < 0 ? 'recule' : 'avance') + ' de ' + mm(Math.abs(p.depth)) + ' jusqu\'au montant du dôme') + '</dd>' : '';
    h += '<dl><dt>Huisserie (axes)</dt><dd>2 montants de ' + mm(d.height) + ' · linteau et seuil de ' + mm(d.width) + '</dd>' +
      post('gauche', r.parts.posts[0]) + post('du milieu', r.parts.posts[1]) + post('droit', r.parts.posts[2]) + '</dl>';
    h += '<dl><dt>Fermeture autour de la porte</dt><dd>' + m2(r.infill.total) + ' (au-dessus du linteau ' + m2(r.infill.tympan) + ' · sur les côtés ' + m2(r.infill.sides) + ')</dd>' +
      '<dt>Ébrasement (écart porte ↔ cadre)</dt><dd>de ' + mm(r.reveal.min) + ' à ' + mm(r.reveal.max) + ' (négatif = derrière la porte, côté intérieur)</dd></dl>';
    if (!sk) return h + '</div>';
    // choix constructifs
    h += '<div class="door-choice"><b>Choix constructifs</b>' +
      '<label>Tenue de l\'avant-corps ' + sel(key, 'support', sk.support, SUPPORT) + '</label>' +
      '<label>Appuis du chevêtre ' + sel(key, 'attachAppui', sk.attachAppui, ATTACH) + '</label>' +
      '<label>Chevrons ' + sel(key, 'attachChevron', sk.attachChevron, ATTACH) + '</label>' +
      '<div class="door-note">' + esc(SUPPORT_WHY[sk.support]) + '</div></div>';
    sk.warnings.forEach(w => { h += '<div class="op-status err">⚠ ' + esc(w) + '</div>'; });
    // raccords : rien de volant
    h += sk.complete
      ? '<div class="op-status ok">✅ Aucune pièce volante : ' + sk.connections.length + ' raccords, chaque pièce rejoint le sol ou le dôme par une chaîne d\'assemblages.</div>'
      : '<div class="op-status err">⚠ ' + sk.floating.length + ' bout(s) de pièce volant(s), ' + sk.unsupported.length + ' pièce(s) non portée(s) : ' +
        esc(sk.floating.map(f => PIECES[f.kind] || f.kind).concat(sk.unsupported.map(i => PIECES[sk.pieces[i].kind] || sk.pieces[i].kind)).join(', ')) + '</div>';
    // pièces
    h += '<div class="door-3d"><b>Pièces (dessinées en 3D)</b> <span class="muted">🟠 aperçu · section 45 × 70 mm · longueurs d\'axe, sans les coupes d\'assemblage</span><dl>' +
      Object.keys(PIECES).filter(k => sk.totals[k]).map(k => '<dt>' + PIECES[k] + '</dt><dd>' + sk.totals[k].count + ' · ' +
        sk.pieces.filter(p => p.kind === k).map(p => mm(p.length)).join(', ') + '</dd>').join('') +
      '<dt>Toit de l\'avant-corps</dt><dd>' + m2(sk.areas.toit || 0) + '</dd>' +
      (sk.areas.paroi ? '<dt>Parois latérales · façade</dt><dd>' + m2(sk.areas.paroi) + ' · ' + m2(sk.areas.facade || 0) + '</dd>' : '') +
      (sk.byFamily['dome-montant'] && o.joints['dome-montant'] === 'moise' ? '<dt>Moises (2 par raccord sur montant)</dt><dd>' + 2 * sk.byFamily['dome-montant'] + ' · 300 mm</dd>' : '') + '</dl></div>';
    // raccords et assemblages
    h += '<div class="door-joints"><b>Raccords et assemblages</b> <span class="muted">cliquer un nom pour ouvrir sa fiche</span><table><tr><th>Raccord</th><th>Nombre</th><th>Assemblage</th></tr>' +
      Object.keys(J.FAMILIES).filter(f => sk.byFamily[f]).map(f => '<tr><td>' + esc(J.FAMILIES[f].name) + '</td><td>' + sk.byFamily[f] + '</td><td>' +
        sel(key, 'joint:' + f, o.joints[f], Object.fromEntries(J.FAMILIES[f].options.map(id => [id, J.LIBRARY[id].name]))) +
        ' <a href="#" data-joint-fiche="' + o.joints[f] + '">fiche</a></td></tr>').join('') + '</table>' +
      (o.fiche ? fiche(J, o.fiche) : '') + '</div>';
    // bibliothèque complète
    const fam = { 'bois-bois': 'Assemblages bois-bois', quincaillerie: 'Quincaillerie', dome: 'Raccords au dôme', sol: 'Ancrages au sol' };
    h += '<details class="door-lib"><summary>Bibliothèque d\'assemblages (' + Object.keys(J.LIBRARY).length + ' fiches)</summary>' +
      Object.keys(fam).map(g => '<div><b>' + fam[g] + '</b> : ' + Object.keys(J.LIBRARY).filter(id => J.LIBRARY[id].family === g)
        .map(id => '<a href="#" data-joint-fiche="' + id + '">' + esc(J.LIBRARY[id].name) + '</a>').join(' · ') + '</div>').join('') + '</details>';
    h += '<div class="door-note">Comme une porte dans un mur épais : la paroi du dôme penche, donc au-dessus de la porte le cadre est en retrait. ' +
      'Porte au droit du seuil (recul 0) : il faut un petit toit, un <i>avant-corps</i>, du linteau jusqu\'au dôme. Porte reculée : elle se rapproche du cadre et forme un <i>sas intérieur</i>. ' +
      '🟠 La tenue de la structure (efforts, sections) n\'est pas encore calculée.</div>';
    return h + '</div>';
  }

  const DoorUI = { html, fiche, PIECES, SUPPORT };
  if (typeof module !== 'undefined' && module.exports) module.exports = DoorUI;
  else global.DoorUI = DoorUI;
})(typeof window !== 'undefined' ? window : globalThis);
