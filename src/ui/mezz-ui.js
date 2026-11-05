// ---------------------------------------------------------
// mezz-ui.js — Fiche « Ossature de la mezzanine » de l'onglet Design (idée n° 8, aménagement, étape 2).
// Texte HTML seulement, à partir de MezzFrame.layout ; les événements restent dans designui.js.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mm = v => Math.round(v * 1000) + ' mm', m = v => v.toFixed(2).replace('.', ',') + ' m', pc = v => Math.round(v * 100) + ' %';
  const mark = x => x.ok ? (x.max > 0.85 ? '🟡' : '🟢') : '🔴';

  function html(r, F) {
    if (!r) return '';
    if (!r.ok && r.errors && r.errors.length) return '<div class="op-status">🔴 ' + r.errors.map(esc).join(' · ') + '</div>';
    const name = k => F.SECTIONS[k] ? F.SECTIONS[k].name.replace(' (poteau)', '') + ' ' + F.SECTIONS[k].grade : k;
    const row = (lab, x, span) => '<tr><td style="text-align:left">' + mark(x) + ' ' + lab + '</td><td style="white-space:nowrap">' + esc(name(x.section)) + '</td><td>' + m(span) + '</td>' +
      (x.bending !== undefined ? '<td>' + pc(x.bending) + '</td><td>' + pc(x.shear) + '</td><td>' + pc(x.deflection) + '</td>' : '<td colspan="3">compression + flambement ' + pc(x.compression) + '</td>') + '</tr>' +
      (x.ok ? '' : '<tr><td colspan="6" style="text-align:left">→ ' + (x.suggest ? 'il faut au moins ' + esc(name(x.suggest)) : 'ajouter des appuis ou changer de famille de bois') + '</td></tr>');
    const C = r.check;
    let h = '<div class="op-status" id="dsMezzStrength"><b>Solidité ' + (r.ok ? '— tout passe' : '— 🔴 pièce trop faible') + '</b><div style="overflow-x:auto"><table class="floor-t">' +
      '<tr><th style="text-align:left">pièce</th><th>section</th><th>portée</th><th>flexion</th><th>cisail.</th><th>flèche</th></tr>' +
      row('Solives (entraxe ' + m(r.spacing) + ')', C.joist, C.joist.span) +
      C.beams.map((b, i) => row((b.kind === 'appui' ? 'Poutre côté paroi ' : 'Poutre de rive ') + (C.beams.length > 1 ? i + 1 : '') + (b.posts ? ' (+' + b.posts + ' poteau' + (b.posts > 1 ? 'x' : '') + ')' : ''), b, b.span)).join('') +
      (C.post ? row('Poteaux (' + r.posts.length + ')', C.post, r.postHeight) : '') + '</table></div>' +
      '<div class="muted">🟡 calculé (Eurocode 5 simplifié) : plancher 0,5 + habitation 2 kN/m², flèche ≤ portée/300 · poteaux : hauteur ' + m(r.postHeight) + ' sous la poutre · CLS supposé C16, KVH C24 (🟠 à confirmer)</div></div>';
    if (r.warnings.length) h += '<div class="op-status">' + r.warnings.map(w => '⚠ ' + esc(w)).join('<br>') + '</div>';
    if (!r.ok) return h + '<details class="door-lib" id="dsMezzCuts"><summary>🔴 Liste de débits masquée : pièce trop faible</summary><div class="op-status">Choisissez une section plus forte : la liste revient dès que tout passe.</div></details>';
    // liste de débits
    const Lb = global.Lumber;
    if (!Lb) return h;
    const secs = [
      { name: 'Solives', key: r.options.joistSection, s: r.sections.joist, groups: Lb.group(r.pieces.joists, 'S') },
      { name: 'Poutres', key: r.options.beamSection, s: r.sections.beam, groups: Lb.group(r.pieces.beams, 'P') },
      { name: 'Poteaux', key: r.options.postSection, s: r.sections.post, groups: Lb.group(r.pieces.posts, 'T') }
    ].filter(x => x.groups.length);
    const deg = v => v > 0.05 ? (Math.round(v * 10) / 10).toString().replace('.', ',') + '°' : 'équerre';
    let n = 0;
    const body = secs.map(x => {
      const pcs = []; x.groups.forEach(g => { n += g.n; for (let k = 0; k < g.n; k++) pcs.push({ ref: g.ref, len: g.len }); });
      const P = Lb.cutPlan(pcs);
      return '<b>' + x.name + ' ' + esc(name(x.key)) + '</b><table class="floor-t"><tr><th>repère</th><th>rôle</th><th>nb</th><th>à couper</th><th>coupes (biais en plan)</th></tr>' +
        x.groups.map(g => '<tr><td>' + g.ref + '</td><td>' + esc(g.what) + '</td><td>' + g.n + '</td><td>' + mm(g.len) + '</td><td>' + deg(g.miter[0]) + ' / ' + deg(g.miter[1]) + '</td></tr>').join('') + '</table>' +
        '<div class="op-status">À commander : ' + Object.keys(P.buy).sort((a, b) => b - a).map(k => P.buy[k] + ' × ' + k.replace('.', ',') + ' m').join(' + ') + ' = ' + m(P.bought) + ' · chute ' + Math.round(P.wasteRatio * 100) + ' %' +
        (P.tooLong.length ? ' · ⚠ ' + P.tooLong.length + ' pièce(s) trop longue(s) : à abouter' : '') + '</div>';
    }).join('');
    const sheets = Math.ceil(r.deckArea * (1 + Lb.DEFAULTS.sheetWaste) / (Lb.DEFAULTS.sheet.l * Lb.DEFAULTS.sheet.w) - 1e-9);
    return h + '<details class="door-lib" id="dsMezzCuts"><summary>Liste de débits — mezzanine (' + n + ' pièces, ' + sheets + ' panneaux)</summary>' +
      '<div class="muted">🟠 aperçu · solives : bout contre la poutre raccourci de la demi-largeur de poutre (sabot), bout côté paroi : ' + (r.options.wallSupport === 'paroi' ? 'jeu de 10 mm sur la lambourde' : 'sabot sur la poutre côté paroi') + ' · cadres de rive ' + (r.options.joint === 'about' ? 'en about' : 'en onglet') + ' · barres 2,10 à 5,40 m (à confirmer)</div>' +
      body + '<b>Plancher 22 mm</b><div class="op-status">' + r.deckArea.toFixed(2).replace('.', ',') + ' m² → ' + sheets + ' panneaux de 2,44 m × 1,22 m (chute comptée 12 %) · format 🟠 à confirmer</div></details>';
  }

  const MezzUI = { html };
  if (typeof module !== 'undefined' && module.exports) module.exports = MezzUI;
  else global.MezzUI = MezzUI;
})(typeof window !== 'undefined' ? window : globalThis);
