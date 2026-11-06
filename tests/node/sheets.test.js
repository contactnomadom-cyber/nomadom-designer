// Plan de coupe des panneaux de plancher (sheets.js) — atelier, étape 1
// Usage : node tests/node/sheets.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const S = require(path.join(SRC, 'sheets.js'));
const E = require(path.join(SRC, 'dome-engine.js')), Z = require(path.join(SRC, 'design.js')), F = require(path.join(SRC, 'floor.js'));
global.Lumber = require(path.join(SRC, 'lumber.js'));
const M = require(path.join(SRC, 'mezz-frame.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= t;

// 1. catalogue et écart admis (Premier Guarantee : OSB 15 mm → 450 mm, 18 mm et plus → 600 mm)
check(S.SHEETS['osb22-rl'].l === 2.5 && S.SHEETS['osb22-rl'].w === 0.675 && S.SHEETS['osb22-rl'].tg, 'OSB 22 mm rainuré-languetté 2500 × 675 (Bourguignon)');
check(S.spanMax(S.SHEETS['osb15-rl']) === 0.45 && S.spanMax(S.SHEETS['osb18-rl']) === 0.6 && S.spanMax(S.SHEETS['osb22-rl']) === 0.6, 'écart admis : 450 mm en 15 mm, 600 mm en 18 et 22 mm');

// 2. un carré de 4 × 2 m, solives tous les 0,5 m (calcul à la main)
const sq = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 0, z: 2 }];
const joists = []; for (let x = 0; x <= 4 + 1e-9; x += 0.5) joists.push({ a: { x, z: 0 }, b: { x, z: 2 } });
const r = S.rows(sq, joists, 'osb22-rl');
check(r.ok && r.rows.length === 3 && near(r.rows[2].width, 2 - 2 * 0.675, 1e-9) && !r.rows[2].full, '2 m / 675 mm : 3 rangées, la dernière refendue à 650 mm');
const joints = r.rows.flatMap(rw => rw.pieces.slice(0, -1).map(p => p.s1));
check(joints.every(s => r.joistsAt.some(j => near(j, s, 1e-6))), 'chaque joint en bout tombe sur une solive');
check(r.rows.every(rw => rw.pieces.every(p => p.len <= 2.5 + 1e-9)), 'aucun morceau plus long qu\'un panneau');
check(near(r.rows[0].pieces[0].len, 2.5, 1e-9) && near(r.rows[1].pieces[0].len, 1.0, 1e-9), 'joints décalés : rangée 1 commence par 2,50 m, rangée 2 par un demi-panneau (1,00 m sur solive)');
check(r.sheets === 6 && near(r.net, 8, 1e-9) && near(r.waste, 1 - 8 / (6 * 2.5 * 0.675), 1e-9), '8 m² → 6 panneaux (chute ' + Math.round(r.waste * 100) + ' %)');
check(near(r.cost, 6 * 2.5 * 0.675 * 14.67, 1e-9), 'prix ≈ ' + Math.round(r.cost) + ' € (14,67 €/m²)');
const wide = []; for (let x = 0; x <= 4 + 1e-9; x += 0.8) wide.push({ a: { x, z: 0 }, b: { x, z: 2 } });
check(!S.rows(sq, wide, 'osb22-rl').ok && S.rows(sq, wide, 'osb22-rl').errors[0].indexOf('800 mm > 600 mm') > 0, 'solives à 800 mm : 🔴, écart trop grand pour le panneau');
check(S.rows(sq, joists, 'osb18-bd').warnings.length > 0 && S.rows(sq, joists, 'osb18-bd').noggings > 0, 'bords droits : entretoises sous les joints longs');
check(S.packStrips([2, 0.4], 2.5).length === 1 && S.packStrips([2, 0.4, 0.4], 2.5).length === 2, 'chute réutilisée : 2 m + 0,4 m dans un panneau ; un 3e morceau de 0,4 m n\'y tient plus (2,808 m > 2,50 m)');

// 3. dôme de référence (3V Kruschke 7/12 Ø 5 m)
const dome = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 });
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');
const rp = F.layout(dome, { support: 'pentagone', deck: 'plein' }), sp = S.rows(rp.panels[0].pts, rp.joists, 'osb22-rl');
check(sp.ok && sp.sheets >= Math.ceil(sp.net / (2.5 * 0.675)) && sp.waste < 0.3, 'plancher plein : ' + sp.sheets + ' panneaux OSB 22, chute ' + Math.round(sp.waste * 100) + ' %');
const re = F.layout(dome, { support: 'pentagone', deck: 'etoile' }), se = S.pieces(re.panels, 'osb18-bd');
check(!se.ok && se.errors.some(x => x.indexOf('1054 mm > 600 mm') >= 0), 'plancher en étoile : écart de 1054 mm au bord extérieur > 600 mm → 🔴');
check(!S.pieces(re.panels, 'osb22-rl').ok && S.pieces(re.panels, 'osb22-rl').errors.some(x => x.indexOf('trop grand') >= 0), 'étoile en OSB 675 : secteurs trop larges');
check(se.groups.reduce((t, g) => t + g.n, 0) === re.panels.length, 'étoile : tous les morceaux comptés');
const model = Z.domeModel(dome), mezz = Object.assign({}, Z.defaultState().mezz, { on: true, thick: 0.23 });
const mf = M.layout(Z.mezzPolygon(model, mezz), Z.section(model, mezz.h), mezz, {}, F, Z.section(model, 0));
const sm = S.rows(mf.poly, mf.joists.filter(j => !j.rim), mf.options.sheet);
check(sm.ok && mf.options.sheet === 'osb22-rl' && sm.gapMax <= 0.5 + 1e-9, 'mezzanine : OSB 22 par défaut, ' + sm.sheets + ' panneaux, écart ' + Math.round(sm.gapMax * 1000) + ' mm');
check(S.planSvg(sm, mf.poly).indexOf('<svg') === 0 && S.html(sm, mf.poly).indexOf('panneaux') > 0, 'plan de pose dessiné');

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ')'));
process.exit(fails.length ? 1 : 0);
