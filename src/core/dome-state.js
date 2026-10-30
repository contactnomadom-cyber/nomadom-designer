
// ---------------------------------------------------------
// dome-state.js — Objet dôme unique (A10, étape 1)
// La « fiche de chantier » du projet courant : réglages de géométrie,
// toile (laize, marges, coutures), ouvertures et dômes calculés.
// Source de vérité unique : l'interface lit et écrit ici, rien ailleurs.
// Logique pure, sans DOM : testable sous Node (tests/node/dome-state.test.js).
// Unités internes : mètres. Les saisies d'atelier arrivent en millimètres.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // Saisies de toile par défaut (mm), identiques aux valeurs de src/index.html.
  const DEFAULT_FABRIC_INPUTS = Object.freeze({
    laizeMm: 1500, selvageMm: 10, overlapTolMm: 50,
    seamAMm: 20, seamBMm: 20, hemMm: 50, seamType: 'simple',
    bottomOn: false, bottomAMm: 15, bottomBMm: 15, bottomHemMm: 30
  });

  // Saisie numérique : NaN → valeur de repli (même règle que l'ancien readFabricParams).
  function numOr(v, def) { const x = parseFloat(v); return isNaN(x) ? def : x; }

  // Toile figée à partir des saisies (mm) → FabricSpec (m).
  // Reproduit exactement readFabricParams() de la 0.9.12 (ordre des clés compris,
  // car la clé de dôme contient JSON.stringify de cet objet).
  function fabricFromInputs(inp) {
    const i = inp || {};
    const laize = numOr(i.laizeMm, 1500) / 1000;
    const selvage = Math.max(0, numOr(i.selvageMm, 0)) / 1000;
    const overlapTol = Math.max(0, numOr(i.overlapTolMm, 0)) / 1000;
    const usable = Math.max(0, laize - 2 * selvage);
    const seam = { A: Math.max(0, numOr(i.seamAMm, 0)) / 1000, B: Math.max(0, numOr(i.seamBMm, 0)) / 1000,
      hem: Math.max(0, numOr(i.hemMm, 0)) / 1000, type: i.seamType };
    seam.bottom = i.bottomOn ? Object.freeze({ A: Math.max(0, numOr(i.bottomAMm, 0)) / 1000,
      B: Math.max(0, numOr(i.bottomBMm, 0)) / 1000, hem: Math.max(0, numOr(i.bottomHemMm, 0)) / 1000 }) : null;
    return Object.freeze({ laize, selvage, usable, overlapTol, seam: Object.freeze(seam) });
  }

  // Poids d'une couture (saisie en cm de rouleau) → m.
  function seamWeightFromInput(cm) { return Math.max(0, parseFloat(cm) || 0) / 100; }

  // Nouvel objet dôme, vide.
  //  fabric.laize      : laize du rouleau.
  //  fabric.selvage    : lisière inutilisable de chaque bord du rouleau.
  //  fabric.usable     : largeur utile = laize − 2 × lisière. Le CONTOUR DE COUPE
  //                      (marges comprises) d'un morceau doit y tenir.
  //  fabric.seam       : marges A (côté recouvrant), B (côté recouvert), ourlet bas, rangée du bas.
  //  fabric.overlapTol : tolérance de chevauchement lors du dépliage d'un groupe.
  function create() {
    return {
      gen: 0,                 // numéro de génération (augmente à chaque recalcul)
      nominal: null,          // dôme de la structure (nœud à nœud)
      cloth: null,            // dôme toile complet (avant ouverture)
      struct: null,           // dôme structure avec ouvertures (onglets Base et Design)
      dome: null,             // dôme toile avec ouvertures : celui que Cover+ découpe
      fabric: fabricFromInputs(DEFAULT_FABRIC_INPUTS),
      seamWeight: seamWeightFromInput(10),
      // Le contour est mémorisé en étiquettes de nœuds (N1–N6…) : les identifiants
      // internes changent à chaque calcul, les étiquettes non (même dôme, autre Ø).
      openings: { labels: [], forKey: null, result: null }
    };
  }

  // Clé de dôme (A2) : identité complète du dôme + génération + toile.
  // Toute modification invalide « moins de toile » et le comparatif.
  // Identique caractère pour caractère à cutKey() de la 0.9.12.
  function key(state) {
    const p = (state.nominal && state.nominal.params) || {}, active = state.dome;
    return ['g' + state.gen, p.base, p.subdivClass, p.detail, p.subdivMethod, p.symmetry, p.partial, p.alignTheBase ? 1 : 0,
      p.radius, active && active.offset ? active.offset.h : 0,
      JSON.stringify(state.fabric), state.seamWeight].join('|');
  }

  const DomeState = { DEFAULT_FABRIC_INPUTS, fabricFromInputs, seamWeightFromInput, create, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = DomeState;
  else global.DomeState = DomeState;
})(typeof window !== 'undefined' ? window : globalThis);
