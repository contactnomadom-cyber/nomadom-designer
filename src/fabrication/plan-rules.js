
// ---------------------------------------------------------
// plan-rules.js — Règles du plan de coupe (A10, étape 5)
// Logique pure sortie de l'interface (app.js), sans DOM :
//  - laize : un morceau plus large que la largeur utile ne peut pas être coupé ;
//  - rangée du bas : quel ourlet ferait passer les morceaux qui dépassent ;
//  - mesures d'un plan (comparatif des découpes) ;
//  - contenu du CSV de fabrication d'un morceau.
// Unités : mètres. Testé sous Node : tests/node/plan-rules.test.js.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const mm = v => Math.round(v * 1000);

  function fitsLaize(sh, usable) { return sh.cutWidth <= usable + 1e-9; }

  // fiches (dans l'ordre donné) qui ne tiennent pas dans la largeur utile
  function laizeFailures(sheets, usable) { return sheets.filter(sh => sh && !fitsLaize(sh, usable)); }

  // Si seuls des morceaux de la rangée du bas dépassent : quels ourlets (avec les marges
  // actuelles, puis 15/15 et 10/10 mm si plus petites) les feraient passer ?
  // rawSheet(name) = fiche du morceau sans marge ; applyAllowances(raw, {A,B,hem}) = fiche avec marges.
  // Renvoie null si la règle ne s'applique pas, sinon [{A, B, hem}] (vide : rien ne passe, même sans marge).
  function bottomHemOptions(bad, seam, usable, rawSheet, applyAllowances) {
    if (!bad.length || !bad.every(sh => sh.bottomRow)) return null;
    const cur = seam.bottom || { A: seam.A, B: seam.B, hem: seam.hem };
    const names = bad.map(sh => sh.name).filter(n => rawSheet(n));
    const fitsWith = v => names.every(n => applyAllowances(rawSheet(n), { A: v.A, B: v.B, hem: v.hem }).cutWidth <= usable + 1e-9);
    const maxHem = (A, B) => { if (!fitsWith({ A, B, hem: 0 })) return -1; let lo = 0, hi = 0.2;
      for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (fitsWith({ A, B, hem: m })) lo = m; else hi = m; } return Math.floor(lo * 1000) / 1000; };
    const opts = [];
    const h1 = maxHem(cur.A, cur.B);
    if (h1 >= 0) opts.push({ A: cur.A, B: cur.B, hem: h1 });
    [[0.015, 0.015], [0.01, 0.01]].forEach(([A, B]) => { if (A < Math.max(cur.A, cur.B) - 1e-9) { const hh = maxHem(A, B); if (hh >= 0) opts.push({ A, B, hem: hh }); } });
    return opts;
  }

  // Mesures d'un plan de coupe pour le comparatif. deps = { Toile, Nesting } (modules du projet).
  function measurePlan(tool, res, fabric, deps) {
    const sheets = [...res.sheets.values()];
    const groups = deps.Toile.groupGabarits(sheets, true);
    const st = tool.seamStats(res.plan);
    const nr = deps.Nesting.nest(sheets.map(sh => ({ name: sh.name, poly: sh.cut, L: sh.cutLength, W: sh.cutWidth, area: sh.cutArea })), fabric.usable, { row: 0.01, tries: 8 });
    return {
      pieces: sheets.length, gabarits: groups.length, sewn: st.sewn, total: st.total,
      cutArea: sheets.reduce((a, x) => a + x.cutArea, 0), roll: nr.length, rollArea: nr.length * fabric.laize,
      util: nr.utilisation, maxLen: Math.max(...sheets.map(x => x.cutLength)),
      over: sheets.filter(x => x.cutWidth > fabric.usable + 1e-9).length, flat: sheets.every(x => x.check.flat)
    };
  }

  const SIDE_TXT = { A: 'A — recouvrant', B: 'B — recouvert', H: 'ourlet' };
  // CSV de fabrication d'un morceau (séparateur « ; », BOM UTF-8, fins de ligne Windows).
  // offset = dôme GoodKarma (ou null), nominalLength(e) = longueur nœud à nœud d'un bord.
  function sheetCsv(sh, offset, seam, presetLabel, nominalLength) {
    const r = [];
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const gk = !!offset;
    r.push(['Morceau', sh.name],
           ['Structure', gk ? 'sans connecteur GoodKarma, hauteur d\'appui ' + mm(offset.h) + ' mm' : 'avec connecteur (noeud a noeud)'],
           ['Assemblage', presetLabel + ' : A ' + mm(seam.A) + ' mm, B ' + mm(seam.B) + ' mm, ourlet ' + mm(seam.hem) + ' mm'],
           ['Coupe longueur (mm)', mm(sh.cutLength)], ['Coupe largeur (mm)', mm(sh.cutWidth)],
           ['Toile coupee (m2)', sh.cutArea.toFixed(4)], ['Sans vague', sh.check.flat ? 'oui' : 'non'],
           ['Repere', 'X le long du rouleau, Y a travers la laize, origine en bas a gauche du contour de coupe, vue exterieure'], []);
    r.push(['LIGNE DE COUTURE'], ['Point', 'Noeud', 'X (mm)', 'Y (mm)', 'Angle (deg)']);
    sh.points.forEach(p => r.push([p.label, p.node, (p.x * 1000).toFixed(1), (p.y * 1000).toFixed(1), p.angle.toFixed(2)]));
    r.push([], ['CONTOUR DE COUPE'], ['Point', 'X (mm)', 'Y (mm)']);
    sh.cut.forEach((p, i) => r.push(['C' + (i + 1), (p.x * 1000).toFixed(1), (p.y * 1000).toFixed(1)]));
    r.push([], ['BORDS'], ['De', 'A', 'Longueur (mm)'].concat(gk ? ['Noeud a noeud (mm)'] : [], ['Classe', 'Type', 'Cote', 'Marge (mm)']));
    sh.edges.forEach(e => r.push([e.from, e.to, (e.length * 1000).toFixed(1)].concat(gk ? [(nominalLength(e) * 1000).toFixed(1)] : [], [e.cls, e.type, SIDE_TXT[e.side], mm(e.allowance)])));
    r.push([], ['PLIS'], ['De', 'A', 'Longueur (mm)', 'Classe', 'Angle de pli (deg)']);
    sh.folds.forEach(f => r.push([f.from, f.to, (f.length * 1000).toFixed(1), f.cls, f.fold.toFixed(2)]));
    r.push([], ['TRIANGLES'], ['Triangle', 'Noeuds', 'Cote 1 (mm)', 'Cote 2 (mm)', 'Cote 3 (mm)', 'Angle 1', 'Angle 2', 'Angle 3']);
    sh.triangles.forEach(t => r.push(['#' + t.idx, t.nodes.join('-')].concat(t.sides.map(sd => (sd.len * 1000).toFixed(1)), t.angles.map(a => a.toFixed(2)))));
    return '﻿' + r.map(row => row.map(q).join(';')).join('\r\n');
  }

  const PlanRules = { SIDE_TXT, fitsLaize, laizeFailures, bottomHemOptions, measurePlan, sheetCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = PlanRules;
  else global.PlanRules = PlanRules;
})(typeof window !== 'undefined' ? window : globalThis);
