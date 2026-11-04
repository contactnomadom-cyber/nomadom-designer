// Course du soleil et ensoleillement des faces (sun.js) — idée n° 8, étape 2
// Usage : node tests/node/sun.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const S = require(path.join(SRC, 'sun.js'));
const E = require(path.join(SRC, 'dome-engine.js'));
const Z = require(path.join(SRC, 'design.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'OK   ' : 'ÉCHEC ') + msg); if (!ok) fails.push(msg); };
const deg = r => r * 180 / Math.PI;

// 1. heure légale belge
check(S.belgianToUtc(2026, 6, 21, 14) === Date.UTC(2026, 5, 21, 12), 'été : 14 h en Belgique = 12 h UTC');
check(S.belgianToUtc(2026, 12, 21, 13) === Date.UTC(2026, 11, 21, 12), 'hiver : 13 h en Belgique = 12 h UTC');
check(S.belgianToUtc(2026, 3, 29, 4) === Date.UTC(2026, 2, 29, 2) && S.belgianToUtc(2026, 3, 28, 4) === Date.UTC(2026, 2, 28, 3), 'passage à l\'heure d\'été le dernier dimanche de mars (29/03/2026)');

// 2. hauteur maximale du soleil à Bruxelles (théorie : 90 − 50,85 ± 23,44)
const bxl = { city: 'bruxelles', north: 0 };
const maxEl = (mo, d) => Math.max(...S.dayPath(bxl, 2026, mo, d, 2).map(p => deg(p.elevation)));
const juin = maxEl(6, 21), dec = maxEl(12, 21);
check(Math.abs(juin - 62.6) < 0.4, 'Bruxelles, 21 juin : soleil au plus haut à ' + juin.toFixed(1) + '° (attendu ≈ 62,6°)');
check(Math.abs(dec - 15.7) < 0.4, 'Bruxelles, 21 décembre : soleil au plus haut à ' + dec.toFixed(1) + '° (attendu ≈ 15,7°)');
const noon = S.dayPath(bxl, 2026, 6, 21, 2).reduce((a, b) => (b.elevation > a.elevation ? b : a));
check(Math.abs(deg(noon.azimuth) - 180) < 2 && Math.abs(noon.hour - 13.72) < 0.15, 'midi solaire au sud vers 13 h 43 (heure d\'été) : ' + deg(noon.azimuth).toFixed(1) + '° à ' + noon.hour.toFixed(2) + ' h');
const mar = S.dayPath(bxl, 2026, 12, 21, 2);
check(deg(mar[0].azimuth) > 125 && deg(mar[0].azimuth) < 132, 'hiver : lever au sud-est (' + deg(mar[0].azimuth).toFixed(0) + '°)');

// 3. repère du plan : nord en haut (−z), est à droite (+x) ; nord tourné de 90° → nord à droite
const v = S.compass(0, 0), e = S.compass(90, 0), r = S.compass(0, 90);
check(Math.abs(v.x) < 1e-9 && Math.abs(v.z + 1) < 1e-9 && Math.abs(e.x - 1) < 1e-9, 'nord vers le haut du plan, est vers la droite');
check(Math.abs(r.x - 1) < 1e-9 && Math.abs(r.z) < 1e-9 && Math.abs(S.azimuthOf({ x: 0, z: 1 }, 0) - 180) < 1e-9, 'nord à 90° = vers la droite ; bas du plan = sud');

// 4. ensoleillement des faces du dôme de référence (3V Kruschke 7/12 Ø 5 m)
const dome = E.generateDome({ base: 'Icosahedron', subdivClass: 'I', detail: 3, subdivMethod: 'Kruschke', symmetry: 'Pentad', partial: '7/12', radius: 2.5 });
check(dome.points.length === 61 && dome.lines.length === 165, 'dôme de référence inchangé (61 nœuds, 165 montants)');
const model = Z.domeModel(dome);
const site = { city: 'beauraing', north: 0 }, ex = S.faceExposure(model.skinTris, model.height, site);
check(ex.length === model.skinTris.length && ex.every(f => isFinite(f.hiver) && isFinite(f.ete) && f.hiver >= 0), 'une valeur par triangle (' + ex.length + ')');
check(ex.every((f, i) => { const t = model.skinTris[i], c = { x: (t[0].x + t[1].x + t[2].x) / 3, z: (t[0].z + t[1].z + t[2].z) / 3 }; return f.normal.x * c.x + f.normal.z * c.z >= -1e-9 || f.normal.y > 0.9; }), 'normales tournées vers l\'extérieur');
const centre = i => { const t = model.skinTris[i]; return { x: (t[0].x + t[1].x + t[2].x) / 3, y: (t[0].y + t[1].y + t[2].y) / 3, z: (t[0].z + t[1].z + t[2].z) / 3 }; };
const low = ex.map((f, i) => ({ f, c: centre(i) })).filter(o => o.c.y < 0.8);
const south = low.filter(o => S.azimuthOf(o.c, 0) > 150 && S.azimuthOf(o.c, 0) < 210), north = low.filter(o => S.azimuthOf(o.c, 0) < 30 || S.azimuthOf(o.c, 0) > 330);
const avg = (a, k) => a.reduce((s, o) => s + o.f[k], 0) / a.length;
check(south.length && north.length && avg(south, 'hiver') > 3 * avg(north, 'hiver'), 'hiver : les faces basses au sud reçoivent bien plus que celles au nord (' + avg(south, 'hiver').toFixed(2) + ' contre ' + avg(north, 'hiver').toFixed(2) + ' kWh/m²)');
const top = ex.reduce((a, f) => (f.normal.y > a.normal.y ? f : a));
check(top.ete > 2 * top.hiver && top.verdict === 'proteger', 'sommet : bien plus de soleil en été qu\'en hiver → à protéger');
check(south.every(o => o.f.verdict === 'conseille'), 'faces basses au sud : fenêtre conseillée');
const best = ex.map((f, i) => ({ f, c: centre(i) })).reduce((a, b) => (b.f.balance > a.f.balance ? b : a));
check(['SSE', 'S', 'SSO'].includes(S.cardinal(S.azimuthOf(best.c, 0))), 'meilleur côté pour les fenêtres : ' + S.cardinal(S.azimuthOf(best.c, 0)));
const turned = S.faceExposure(model.skinTris, model.height, { city: 'beauraing', north: 90 }), bestT = turned.map((f, i) => ({ f, c: centre(i) })).reduce((a, b) => (b.f.balance > a.f.balance ? b : a));
check(['SSE', 'S', 'SSO'].includes(S.cardinal(S.azimuthOf(bestT.c, 90))) && bestT.c.x < -1, 'nord tourné de 90° : le meilleur côté suit le sud (à gauche du plan)');

console.log('\n' + (fails.length ? fails.length + ' échec(s) sur ' + n : 'TOUT PASSE (' + n + ')'));
process.exit(fails.length ? 1 : 0);
