// Aération par effet cheminée (vent.js) — idée n° 8, étape 3
// Usage : node tests/node/vent.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const V = require(path.join(SRC, 'vent.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= t;

// 1. type des ouvertures tracées
check(V.classify({ heightMin: 2.2, closedByGround: false }, 3) === 'coupole', 'ouverture haute (dès 60 % de la hauteur) = coupole');
check(V.classify({ heightMin: 0, closedByGround: true }, 3) === 'porte' && V.classify({ heightMin: 0.8, closedByGround: false }, 3) === 'fenetre', 'fermée par le sol = porte ; sinon fenêtre');
check(V.defaultOpen('porte') && V.defaultOpen('coupole') && V.defaultOpen('baie') && !V.defaultOpen('fenetre'), 'ouvrables par défaut : porte, baie, coupole (fenêtres fixes)');

// 2. effet cheminée, calcul à la main : 1 m² en bas (0–2 m), 1 m² en haut (3 m), 30 m³, écart 3 °C
const low = { kind: 'porte', area: 1, yMin: 0, yMax: 2 }, top = { kind: 'coupole', area: 1, yMin: 3, yMax: 3 };
const r = V.airflow([low, top], 30, 3);
const qHand = 0.6 * Math.SQRT1_2 * Math.sqrt(2 * 9.81 * 2 * 3 / 293);
check(r.mode === 'cheminee' && near(r.height, 2, 1e-9) && near(r.aEff, Math.SQRT1_2, 1e-9), 'tirage sur 2 m, passage équivalent 0,707 m²');
check(near(r.q, qHand, 1e-9) && near(r.ach, qHand * 3600 / 30, 1e-9) && near(r.ach, 32.27, 0.01), 'débit ' + r.q.toFixed(3) + ' m³/s = ' + r.ach.toFixed(1) + ' renouvellements/h (calcul à la main 32,3)');
const r10 = V.airflow([low, top], 30, 10);
check(near(r10.q / r.q, Math.sqrt(10 / 3), 1e-9), 'débit proportionnel à √(écart de température)');
check(V.airflow([low, Object.assign({}, top, { area: 4 })], 30, 3).q < 2 * r.q, 'agrandir la seule coupole aide peu : l\'entonnoir le plus étroit commande');

// 3. sans coupole : aération simple, bien plus faible
const s = V.airflow([low], 30, 3);
check(s.mode === 'simple' && s.q > 0 && s.q < r.q / 2, 'sans coupole : aération simple, moins de la moitié (' + s.ach.toFixed(1) + '/h)');
check(V.airflow([], 30, 3).mode === 'aucune', 'rien d\'ouvrable : pas d\'aération');

// 4. dimensionnement : la surface trouvée donne bien l'objectif
const z = V.sizing([Object.assign({}, low, { area: 0.05 }), top], 30, 5);
check(z.ok && z.needLow > 0, 'objectif 5/h : il faut ' + z.needLow.toFixed(3) + ' m² en bas');
const back = V.airflow([Object.assign({}, low, { area: z.needLow }), top], 30, 3);
check(near(back.ach, 5, 1e-6), 'vérification : avec cette surface, 5,0 renouvellements/h en été');
const zTop = V.sizing([low, Object.assign({}, top, { area: 0.02 })], 30, 5);
check(zTop.ok && zTop.highTooSmall && zTop.minHigh > 0.02, 'coupole trop petite : surface minimale au sommet ' + zTop.minHigh.toFixed(3) + ' m²');
check(!V.sizing([low], 30, 5).ok && !V.sizing([top], 30, 5).ok, 'dimensionner demande une entrée basse ET une coupole ouvrables');

// 5. alerte d'équilibre
check(V.balance(V.airflow([Object.assign({}, low, { area: 0.5 }), top], 30, 3)).level === 'warn', 'entrées basses à 50 % de la coupole : alerte');
check(V.balance(r).level === 'ok' && V.balance(V.airflow([Object.assign({}, low, { area: 4 }), top], 30, 3)).level === 'info', 'égales : équilibré ; coupole 4 fois plus petite : information');

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ')'));
process.exit(fails.length ? 1 : 0);
