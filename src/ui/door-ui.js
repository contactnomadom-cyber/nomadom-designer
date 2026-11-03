// ---------------------------------------------------------
// door-ui.js — Fiche « Porte d'aplomb » de l'onglet Base (NOMAD-2026-005) : réglages, résultat,
// choix constructifs, raccords et bibliothèque d'assemblages. Ne fait que du texte HTML
// à partir des calculs (door.js) et des fiches (joinery.js) ; les événements restent dans app.js
// (attributs data-door-key / data-door-f / data-door-add / data-door-del / data-joint-fiche).
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const kN = v => v.toFixed(1).replace('.', ',') + ' kN';
  const mm = v => Math.round(v * 1000) + ' mm', m2 = v => v.toFixed(2).replace('.', ',') + ' m²';
  const PIECES = { huisserie: 'Huisserie (montants, linteau, seuil)', chevetre: 'Chevêtre (posé sur le linteau)', appui: 'Appuis du chevêtre (jusqu\'au montant du dôme)',
    contrefiche: 'Contrefiches (du chevêtre au nœud du dôme)', panne: 'Pannes du sas (du nœud du dôme au bout)', 'lisse-basse': 'Lisses basses du sas', cadre: 'Cadres de section', 'lisse-cadre': 'Traverses basses des cadres', potelet: 'Potelets', rampant: 'Rampants (bord haut, plan de porte)', chevron: 'Chevrons du toit (jusqu\'au dôme)',
    poteau: 'Poteaux d\'angle', lisse: 'Lisses basses (jusqu\'au seuil du dôme)', traverse: 'Traverses des parois' };
  const SUPPORT = { poteaux: 'Poteaux d\'angle au sol + lisses basses', parois: 'Poteaux + parois latérales fermées', 'porte-a-faux': '⛔ Porte-à-faux (déconseillé)' };
  const SUPPORT_WHY = {
    poteaux: 'Comme les pieds d\'une table : les bouts du chevêtre descendent au sol par un poteau, et une lisse basse relie chaque pied au seuil du dôme.',
    parois: 'Comme une cabane accolée : les poteaux reçoivent des traverses qui ferment les côtés jusqu\'au cadre du dôme ; l\'avant-corps devient une petite pièce.',
    'porte-a-faux': 'Comme une étagère sans équerre : tout le poids du toit pend sur les appuis vissés au dôme. Gardé pour comparer, sans document de fabrication.' };
  const SAS = { aucun: 'aucun (avant-corps)', exterieur: 'vers l\'extérieur', interieur: 'vers l\'intérieur' };
  const SAS_WHY = 'Comme un tiroir qu\'on tire hors de la commode : la forme de l\'ouverture est prolongée tout droit, à l\'horizontale. Une panne part de chaque nœud du cadre de l\'ouverture, des cadres de la même forme la tiennent à intervalle régulier, et une deuxième porte ferme le bout. Deux portes = un sas : on n\'ouvre jamais directement l\'intérieur sur le dehors (chaleur, vent, pluie).';
  const ATTACH = { montant: 'sur le montant (n\'importe où)', noeud: 'sur un nœud seulement' };
  const sel = (key, f, cur, opts) => '<select data-door-key="' + esc(key) + '" data-door-f="' + f + '">' +
    Object.keys(opts).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(opts[k]) + '</option>').join('') + '</select>';

  // longueurs regroupées : « 8 × 943 mm, 4 × 1088 mm »
  const group = list => { const c = new Map(); list.forEach(p => { const k = Math.round(p.length * 1000); c.set(k, (c.get(k) || 0) + 1); });
    return [...c].sort((a, b) => a[0] - b[0]).map(([k, n]) => (n > 1 ? n + ' × ' : '') + k + ' mm').join(', '); };
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
      (d.sas ? '' : post('gauche', r.parts.posts[0]) + post('du milieu', r.parts.posts[1]) + post('droit', r.parts.posts[2])) + '</dl>';
    h += '<dl><dt>Fermeture autour de la porte</dt><dd>' + m2(r.infill.total) + ' (au-dessus du linteau ' + m2(r.infill.tympan) + ' · sur les côtés ' + m2(r.infill.sides) + ')</dd>' +
      '<dt>Ébrasement (écart porte ↔ cadre)</dt><dd>de ' + mm(r.reveal.min) + ' à ' + mm(r.reveal.max) + ' (négatif = derrière la porte, côté intérieur)</dd></dl>';
    if (!sk) return h + '</div>';
    // sas d'entrée ou avant-corps
    const isSas = sk.kind === 'sas', sv = d.sas || {}, d2 = sv.door2 || {};
    h += '<div class="door-choice"><b>Entrée</b><label>Sas ' + sel(key, 'sas', isSas ? sk.direction : 'aucun', SAS) + '</label>' +
      (isSas ? num('sas.length', 'Longueur du sas (m)', sk.length, 0.6, 6, 0.05) + num('sas.spacing', 'Cadres tous les (m)', sk.spacing, 0.4, 1.5, 0.05) +
        '<span><b>Porte 2</b></span>' + num('sas.door2.width', 'Largeur (m)', d2.width !== undefined ? d2.width : d.width, 0.5, 3, 0.01) +
        num('sas.door2.height', 'Hauteur (m)', d2.height !== undefined ? d2.height : d.height, 1.5, 3, 0.01) + num('sas.door2.offset', 'Décalage (m)', d2.offset || 0, -2, 2, 0.01) : '') +
      '<div class="door-note">' + esc(isSas ? SAS_WHY : 'Sans sas : la porte s\'ouvre directement dehors, sous un avant-corps.') + '</div></div>';
    if (!isSas) h += '<div class="door-choice"><b>Choix constructifs</b>' +
      '<label>Tenue de l\'avant-corps ' + sel(key, 'support', sk.support, SUPPORT) + '</label>' +
      '<label>Appuis du chevêtre ' + sel(key, 'attachAppui', sk.attachAppui, ATTACH) + '</label>' +
      '<label>Chevrons ' + sel(key, 'attachChevron', sk.attachChevron, ATTACH) + '</label>' +
      '<div class="door-note">' + esc(SUPPORT_WHY[sk.support]) + '</div></div>';
    (sk.errors || []).forEach(w => { h += '<div class="op-status err">🔴 ' + esc(w) + '</div>'; });
    sk.warnings.forEach(w => { h += '<div class="op-status err">⚠ ' + esc(w) + '</div>'; });
    if (isSas) h += '<div class="door-3d"><b>Sas</b> <span class="muted">🟠 aperçu · prisme droit de la forme de l\'ouverture</span><dl>' +
      '<dt>Section</dt><dd>' + mm(sk.inside.width) + ' au sol · ' + mm(sk.inside.height) + ' sous le faîte · ' + sk.frames + ' cadres</dd>' +
      '<dt>Volume</dt><dd>' + sk.inside.volume.toFixed(2).replace('.', ',') + ' m³</dd>' +
      '<dt>Couverture (toit + parois)</dt><dd>' + m2(sk.coverArea) + ' (toit ' + m2(sk.areas.toit || 0) + ' · parois ' + m2(sk.areas.paroi || 0) + ')</dd>' +
      '<dt>Plancher du sas</dt><dd>' + m2(sk.floorArea) + '</dd>' +
      '<dt>Pignon (bout, sans la porte 2) · cloison (porte 1)</dt><dd>' + m2(sk.areas.pignon) + ' · ' + m2(sk.areas.cloison) + '</dd>' +
      (o.sasLoad ? '<dt>Charges du sas 🟠</dt><dd>bois ' + kN(o.sasLoad.wood) + ' · total permanent ' + kN(o.sasLoad.G) + ' · occupation ' + kN(o.sasLoad.Q) + ' · neige ' + kN(o.sasLoad.S) + ' = ' + kN(o.sasLoad.total) +
        (sk.direction === 'exterieur' ? ' (portés par les pilotis ou les lisses du sas)' : ' (portés par le plancher du dôme)') + '</dd>' : '') +
      '<dt>Porte 2</dt><dd>' + (sk.door2.fits ? '🟡 passe (' + mm(sk.door2.width) + ' × ' + mm(sk.door2.height) + ')' : '🔴 ne passe pas') + '</dd></dl></div>';
    // raccords : rien de volant
    h += sk.complete
      ? '<div class="op-status ok">✅ Aucune pièce volante : ' + sk.connections.length + ' raccords, chaque pièce rejoint le sol ou le dôme par une chaîne d\'assemblages.</div>'
      : '<div class="op-status err">⚠ ' + sk.floating.length + ' bout(s) de pièce volant(s), ' + sk.unsupported.length + ' pièce(s) non portée(s) : ' +
        esc(sk.floating.map(f => PIECES[f.kind] || f.kind).concat(sk.unsupported.map(i => PIECES[sk.pieces[i].kind] || sk.pieces[i].kind)).join(', ')) + '</div>';
    // pièces
    h += '<div class="door-3d"><b>Pièces (dessinées en 3D)</b> <span class="muted">🟠 aperçu · section 45 × 70 mm · longueurs d\'axe, sans les coupes d\'assemblage</span><dl>' +
      Object.keys(PIECES).filter(k => sk.totals[k]).map(k => '<dt>' + PIECES[k] + '</dt><dd>' + sk.totals[k].count + ' · ' +
        group(sk.pieces.filter(p => p.kind === k)) + '</dd>').join('') +
      (isSas ? '' : '<dt>Toit de l\'avant-corps</dt><dd>' + m2(sk.areas.toit || 0) + '</dd>') +
      (sk.areas.paroi && !isSas ? '<dt>Parois latérales · façade</dt><dd>' + m2(sk.areas.paroi) + ' · ' + m2(sk.areas.facade || 0) + '</dd>' : '') +
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

  // Récapitulatif pour les autres onglets. scenes = structures des portes (Door.build), fl = Floor.layout ou null.
  // mode 'cover' : ce que la toile doit prévoir (Cover+) ; mode 'info' : section complète (Informations).
  function summary(scenes, fl, mode) {
    scenes = scenes || [];
    const sas = scenes.filter(x => x.kind === 'sas'), ac = scenes.filter(x => x.kind !== 'sas');
    if (mode === 'cover') {
      if (!scenes.length && !fl) return '';
      let h = '<div class="op-warn">';
      scenes.forEach((x, i) => { h += '🟠 Porte ' + (i + 1) + (x.kind === 'sas' ? ' avec sas ' + (x.direction === 'exterieur' ? 'extérieur' : 'intérieur') + ' de ' + mm(x.length) +
        ' : ' + m2(x.coverArea) + ' de toile à prévoir (toit + parois du sas) et le raccord au dôme — patron pas encore calculé (étape 3).'
        : ' : avant-corps, toit de ' + m2(x.areas.toit || 0) + ' à couvrir — patron pas encore calculé.') + '<br>'; });
      if (fl && fl.ok) h += '🟠 Plancher sur pilotis : la toile descend jusqu\'à la ceinture du plancher (bas de toile à régler sur place).';
      return h + '</div>';
    }
    if (!scenes.length && !(fl && fl.ok)) return '';
    const tot = {}; scenes.forEach(x => x.pieces.forEach(p => { const t = tot[p.kind] || (tot[p.kind] = { n: 0, L: 0 }); t.n++; t.L += p.length; }));
    let h = '<section class="info-card"><h3>Portes, sas et plancher</h3><p class="muted">🟠 aperçu calculé dans l\'onglet Base · longueurs d\'axe, sans les coupes d\'assemblage · sections provisoires</p>';
    if (scenes.length) {
      h += '<table><tr><th>Pièce</th><th>Nombre</th><th>Longueur totale</th></tr>' + Object.keys(PIECES).filter(k => tot[k]).map(k => '<tr><td>' + PIECES[k] + '</td><td>' + tot[k].n + '</td><td>' + tot[k].L.toFixed(2).replace('.', ',') + ' m</td></tr>').join('') + '</table>';
      h += '<p>' + scenes.length + ' porte(s) d\'aplomb' + (sas.length ? ' · ' + sas.length + ' sas (' + sas.map(x => mm(x.length) + ' ' + (x.direction === 'exterieur' ? 'dehors' : 'dedans') + ', ' + x.inside.volume.toFixed(1).replace('.', ',') + ' m³, couverture ' + m2(x.coverArea)).join(' ; ') + ')' : '') +
        (ac.length ? ' · ' + ac.length + ' avant-corps (toit ' + m2(ac.reduce((s, x) => s + (x.areas.toit || 0), 0)) + ')' : '') + ' · ' +
        (scenes.every(x => x.complete) ? '✅ aucune pièce volante' : '⚠ pièce volante ou non portée') + '</p>';
    }
    if (fl && fl.ok) { const q = fl.qty;
      h += '<p>Plancher ' + (fl.deck === 'etoile' ? 'en étoile' : 'plein') + ' sur ' + (fl.support === 'pentagone' ? 'pentagone + triangle' : 'pilotis') + ' : ' + q.deckArea.toFixed(2).replace('.', ',') + ' m², ' + q.piles + ' pilotis (' + q.blocksFirst + ' blocs de 29 + ' + q.blocksNext + ' blocs de 19), solives ' + q.joistLength.toFixed(1).replace('.', ',') + ' m, poutres ' + (q.beams.ceinture + q.beams.pentagone + q.beams.triangle).toFixed(1).replace('.', ',') + ' m · charge totale ' + fl.loads.totalEls.toFixed(0) + ' kN, pilotis le plus chargé ' + Math.round(fl.loads.pmax) + ' kPa.</p>'; }
    return h + '</section>';
  }

  // modifie les réglages d'une porte (champ data-door-f) ; renvoie l'id de fiche à ouvrir, s'il y en a une
  function apply(dd, f, value, tag) {
    if (f.startsWith('joint:')) { dd.joints = Object.assign({}, dd.joints, { [f.slice(6)]: value }); return value; }
    if (f === 'sas') { dd.sas = value === 'aucun' ? null : Object.assign({ length: 2.5, spacing: 1.2, door2: { width: dd.width, height: dd.height, offset: 0 } }, dd.sas, { direction: value }); return null; }
    const v = parseFloat(value);
    if (f.startsWith('sas.') && dd.sas) { const path = f.split('.').slice(1); if (!isFinite(v)) return null;
      if (path[0] === 'door2') dd.sas.door2 = Object.assign({}, dd.sas.door2, { [path[1]]: v }); else dd.sas[path[0]] = v; return null; }
    if (tag === 'SELECT') dd[f] = value; else if (isFinite(v)) dd[f] = v;
    return null;
  }

  const DoorUI = { html, apply, summary, fiche, PIECES, SUPPORT };
  if (typeof module !== 'undefined' && module.exports) module.exports = DoorUI;
  else global.DoorUI = DoorUI;
})(typeof window !== 'undefined' ? window : globalThis);
