// Ossature de la mezzanine (mezz-frame.js) — idée n° 8, aménagement, étape 2
// Usage : node tests/node/mezz-frame.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const E = require(path.join(SRC, 'dome-engine.js')), Z = require(path.join(SRC, 'design.js')), F = require(path.join(SRC, 'floor.js'));
global.Lumber = require(path.join(SRC, 'lumber.js'));
const M = require(path.join(SRC, 'mezz-frame.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };
const near = (a, b, t) => Math.abs(a - b) <= t;

const dome = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 });
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');
const model = Z.domeModel(dome);
const run = (shape, frame, extra) => { const mezz = Object.assign({}, Z.defaultState().mezz, { on: true, shape }, extra || {});
  return M.layout(Z.mezzPolygon(model, mezz), Z.section(model, mezz.h), mezz, frame, F); };

// 1. calcul d'une pièce et d'un poteau (vérifiés à la main)
const c = F.checkPiece({ w: 0.038, d: 0.184, grade: 'C16' }, 2.0, 0.25, 1.0);
const g = 0.25 + 370 * 9.81e-3 * 0.038 * 0.184, qd = 1.35 * g + 1.5;
check(near(c.bending, qd * 2000 * 2000 / 8 / (38 * 184 * 184 / 6) / (0.8 * 16 / 1.3), 1e-9), 'flexion CLS 38 × 184 C16 sur 2 m : ' + Math.round(c.bending * 100) + ' % (calcul à la main)');
const p = F.checkPost({ w: 0.1, d: 0.1, grade: 'C24' }, 2.0, 10);
const lam = 2000 / (100 / Math.sqrt(12)), lr = lam / Math.PI * Math.sqrt(21 / 7400), k = 0.5 * (1 + 0.2 * (lr - 0.3) + lr * lr), kc = 1 / (k + Math.sqrt(k * k - lr * lr));
check(near(p.kc, kc, 1e-12) && near(p.compression, 10000 / 10000 / (kc * 0.8 * 21 / 1.3), 1e-9), 'poteau 100 × 100 C24, 2 m, 10 kN : flambement kc = ' + kc.toFixed(3));

// 2. demi-cercle (par défaut)
const d = run('demi');
check(d.ok && d.joists.length >= 5 && d.joists.every(j => j.ends.indexOf('paroi') >= 0 && j.ends.indexOf('poutre') >= 0), 'demi-cercle : ' + d.joists.length + ' solives, chacune de la poutre de rive à la paroi');
check(d.beams.length === 1 && d.joists.every(j => near(j.span, j.a && j.b ? Math.hypot(j.b.x - j.a.x, j.b.z - j.a.z) : 0, 1e-9)), 'une poutre de rive droite');
check(d.check.joist.ok && d.check.beams.every(b => b.ok), 'solives CLS 38 × 184 et poutre KVH 80 × 200 : tout passe');
check(d.warnings.some(w => w.indexOf('Épaisseur réglée 150 mm') === 0) && near(d.thickNeed, 0.022 + 0.2, 1e-9), 'épaisseur 150 mm trop faible : 222 mm conseillés');
check(d.warnings.some(w => w.indexOf('paroi') >= 0 && w.indexOf('🟠') >= 0), 'appui sur la paroi signalé 🟠');
check(!run('demi', {}, { thick: 0.23 }).warnings.some(w => w.indexOf('Épaisseur') === 0), 'épaisseur 0,23 m : plus d\'alerte');

// 3. côtés droits : solives de rive + 2 poteaux aux angles
const r = run('droit');
check(r.joists.filter(j => j.rim).length === 2 && r.posts.length === 2 && r.ok, 'côtés droits : 2 solives de rive, 2 poteaux aux angles libres');
check(r.check.post.ok && r.check.post.compression < 0.2, 'poteaux KVH 100 × 100 : ' + Math.round(r.check.post.compression * 100) + ' %');

// 4. secteur : bord intérieur en arc remplacé par des cordes
const s = run('secteur');
check(s.ok && s.beams.length >= 1 && s.beams.length <= 4 && s.posts.length >= 1, 'secteur : ' + s.beams.length + ' poutres (cordes), ' + s.posts.length + ' poteau(x)');

// 5. sections trop faibles → conseil ; poteaux intermédiaires ajoutés quand la poutre est faible
const w = run('demi', { joistSection: 'cls-38x89' });
check(!w.ok && !w.check.joist.ok && w.check.joist.suggest === 'cls-38x140', 'solives CLS 38 × 89 trop faibles → au moins CLS 38 × 140');
const b = run('droit', { beamSection: 'cls-38x89' });
check(b.beams[0].inner > 0 && b.posts.length > 2 && b.check.beams[0].ok, 'poutre CLS 38 × 89 : ' + b.beams[0].inner + ' poteau(x) intermédiaire(s) ajouté(s)');
const e6 = run('demi', { spacing: 0.6 }), e3 = run('demi', { spacing: 0.3 });
check(e3.joists.length > e6.joists.length && e3.check.joist.max < e6.check.joist.max, 'entraxe 30 cm : plus de solives, moins chargées qu\'à 60 cm');

// 6. pièces à couper
check(d.pieces.joists.length === d.joists.length && d.pieces.joists.every(pc => pc.len < pc.axis && pc.len > 0.2), 'solives : raccourcies (sabot côté poutre, jeu côté paroi)');
check(r.pieces.beams.length === r.beams.length && r.pieces.posts.length === 2 && near(r.pieces.posts[0].len, r.postHeight, 1e-12), 'poutres et poteaux listés');
check(run('demi', { joistSection: 'zzz-1x1', joint: 'colle' }).options.joistSection === 'cls-38x184', 'choix inconnu (ancien projet) : valeurs par défaut');

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ')'));
process.exit(fails.length ? 1 : 0);
