// ---------------------------------------------------------
// vent.js — aération naturelle du dôme par effet cheminée (idée n° 8, étape 3).
//
// Image : le dôme est une cheminée. L'air chaud monte et sort par la coupole
// du sommet ; il aspire l'air frais par les ouvertures du bas. Plus l'écart
// de hauteur et de température est grand, plus le tirage est fort ; et le
// débit est limité par le plus petit des deux passages (un entonnoir).
//
// Formules (guides de ventilation naturelle, CIBSE AM10) :
//  - bas + haut : Q = Cd · A* · √(2 g H ΔT / T), avec 1/A*² = 1/A_bas² + 1/A_haut²
//  - une seule ouverture (sans coupole) : Q = Cd · A/3 · √(g h ΔT / T)
//  Cd = 0,6 ; vent ignoré (cas défavorable) → statut 🟡 calculé.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const G = 9.81, CD = 0.6, T_EXT = 293;   // K (20 °C dehors)
  // situations de calcul : écart de température intérieur − extérieur
  const CASES = [
    { id: 'ete', label: 'été, soirée calme', dT: 3 },
    { id: 'mi', label: 'mi-saison', dT: 10 }
  ];
  const DEFAULT_VENT = { target: 5, open: {} };

  // type d'une ouverture tracée sur la structure (onglet Base)
  function classify(op, domeHeight) {
    if (op.heightMin >= 0.6 * domeHeight) return 'coupole';
    if (op.closedByGround) return 'porte';
    return 'fenetre';
  }
  // ouvrable par défaut : porte, baie et coupole ; les fenêtres sont supposées fixes
  const defaultOpen = kind => kind !== 'fenetre';
  const LABEL = { porte: 'Porte', fenetre: 'Fenêtre', baie: 'Baie vitrée', coupole: 'Coupole zénitale' };

  // ops : [{ key, kind, area, yMin, yMax }] ouvrables ; volume en m³
  function airflow(ops, volume, dT) {
    const top = ops.filter(o => o.kind === 'coupole'), low = ops.filter(o => o.kind !== 'coupole');
    const sum = a => a.reduce((s, o) => s + o.area, 0);
    const yc = a => a.reduce((s, o) => s + o.area * (o.yMin + o.yMax) / 2, 0) / (sum(a) || 1);
    const Al = sum(low), Ah = sum(top);
    let q = 0, mode = 'aucune', H = 0, Aeff = 0;
    if (Al > 0 && Ah > 0) {
      mode = 'cheminee'; H = Math.max(0, yc(top) - yc(low));
      Aeff = 1 / Math.sqrt(1 / (Al * Al) + 1 / (Ah * Ah));
      q = CD * Aeff * Math.sqrt(2 * G * H * dT / T_EXT);
    } else if (Al > 0 || Ah > 0) {
      mode = 'simple';
      q = ops.reduce((s, o) => s + CD * o.area / 3 * Math.sqrt(G * Math.max(0, o.yMax - o.yMin) * dT / T_EXT), 0);
    }
    return { mode, low: Al, high: Ah, height: H, aEff: Aeff, q, ach: volume > 0 ? q * 3600 / volume : 0 };
  }

  // dimensionnement : surface d'entrée basse pour atteindre `target` renouvellements/heure
  // (situation la plus faible : été), avec la coupole tracée ; null si la coupole seule ne suffit pas
  function sizing(ops, volume, target) {
    const r = airflow(ops, volume, CASES[0].dT);
    if (r.mode !== 'cheminee' || r.height <= 0) return { ok: false, reason: r.high > 0 ? 'il faut au moins une entrée basse ouvrable' : 'pas de coupole ouvrable : l\'effet cheminée ne joue pas' };
    const qT = target * volume / 3600, aT = qT / (CD * Math.sqrt(2 * G * r.height * CASES[0].dT / T_EXT));
    const needLow = aT >= r.high ? null : 1 / Math.sqrt(1 / (aT * aT) - 1 / (r.high * r.high));
    // coupole nécessaire si les entrées basses étaient « infinies » (borne basse)
    return { ok: true, aEffTarget: aT, needLow, highTooSmall: needLow === null, minHigh: aT };
  }

  // alerte d'équilibre : l'entonnoir le plus étroit fixe le débit
  function balance(r) {
    if (r.mode !== 'cheminee') return null;
    const k = r.low / r.high;
    if (k < 0.8) return { level: 'warn', text: 'entrées basses trop petites (' + Math.round(k * 100) + ' % de la coupole) : la coupole ne tire pas à fond' };
    if (k > 3) return { level: 'info', text: 'coupole petite face aux entrées basses : c\'est elle qui limite le débit' };
    return { level: 'ok', text: 'entrées basses et coupole équilibrées' };
  }

  const Vent = { CASES, DEFAULT_VENT, LABEL, classify, defaultOpen, airflow, sizing, balance };
  if (typeof module !== 'undefined' && module.exports) module.exports = Vent;
  else global.Vent = Vent;
})(typeof window !== 'undefined' ? window : globalThis);
