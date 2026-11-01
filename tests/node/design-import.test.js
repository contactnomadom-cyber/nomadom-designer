// M1 — contrôle des aménagements Design (design-import.js) : imports JSON, sauvegardes, GLB, échappement
// Usage : node tests/node/design-import.test.js <dossier des modules>
'use strict';
const path = require('path');
const SRC = path.resolve(process.argv[2] || 'src');
const Z = require(path.join(SRC, 'design.js'));
const DI = require(path.join(SRC, 'design-import.js'));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; if (!ok) fails.push(msg); };
const J = JSON.stringify, clone = o => JSON.parse(J(o));
const V = raw => DI.validateState(raw, Z.defaultState(), Z.LIBRARY);
const deepFreeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
const item = (over) => Object.assign({ id: 'iabc1', type: 'lit1', name: 'Lit 1 place', x: 0.5, z: -1, rot: 90, w: 0.9, d: 1.9, h: 0.5, level: 0 }, over || {});
const st = (over) => Object.assign(Z.defaultState(), { items: [item()] }, over || {});
const refused = (raw, what, needle) => { const r = V(raw); check(!r.ok && r.errors.length > 0 && (!needle || r.errors.join(' ').includes(needle)), what + ' : refusé (' + J(r.errors || r.ok) + ')'); };

// 1. échappement
check(DI.escapeHtml('<b a="1">&\'') === '&lt;b a=&quot;1&quot;&gt;&amp;&#39;', 'escapeHtml : < > & " \' échappés');
check(DI.escapeHtml(null) === '' && DI.escapeHtml(12) === '12', 'escapeHtml : null et nombres');

// 2. aménagements valides, dont un export réel de la 0.9.13 (clé « dome » en plus, ouvertures, modèle 3D)
const def = V(Z.defaultState());
check(def.ok && J(def.state) === J(Z.defaultState()), 'état par défaut accepté tel quel');
const exp0913 = Object.assign({ dome: '3V Kruschke 7/12 (Domerama 3V 5/9 Kruschke) Ø5,00 m' }, st({
  items: [item(), item({ id: 'iabc2', type: 'canape', name: 'Canapé', w: 2, d: 0.9, h: 0.85, model: 'mk1' })],
  openings: [{ id: 'o1', type: 'porte', edge: 0, w: 0.9, h: 2, sill: 0 }],
  mezz: { on: true, h: 2.2, thick: 0.15, shape: 'secteur', depth: 2, angle: 140, width: 3, orient: 90 }, style: 'color',
  models: [{ id: 'mk1', name: 'canapé scandinave', data: 'Z2xURgIAAAA=' }] }));
const r1 = V(deepFreeze(clone(exp0913)));
check(r1.ok, 'export 0.9.13 accepté (' + J(r1.errors) + ')');
if (r1.ok) {
  check(J(r1.state.items) === J(exp0913.items), 'export 0.9.13 : éléments identiques');
  check(J(r1.state.mezz) === J(exp0913.mezz) && r1.state.style === 'color' && J(r1.state.models) === J(exp0913.models), 'export 0.9.13 : mezzanine, style, modèles identiques');
  check(!('dome' in r1.state) && r1.state.openings.length === 0, 'export 0.9.13 : libellé du dôme ignoré, ouvertures Design non reprises (comme en 0.9.13)');
}
const frozen = deepFreeze(st({ items: [item({ id: undefined, name: undefined, w: undefined })] }));
check(V(frozen).ok, 'entrée figée : jamais modifiée');

// 3. champs absents → valeurs par défaut ou de la bibliothèque
const r2 = V({ version: 1, items: [{ type: 'canape' }] });
check(r2.ok && r2.state.items[0].name === 'Canapé' && r2.state.items[0].w === 2 && r2.state.items[0].d === 0.9 && r2.state.items[0].h === 0.85
  && r2.state.items[0].level === 0 && r2.state.items[0].x === 0 && /^[A-Za-z0-9_-]+$/.test(r2.state.items[0].id), 'élément incomplet complété depuis la bibliothèque');
check(V({ version: 1 }).ok && V({ version: 1 }).state.items.length === 0, 'aménagement sans élément accepté');

// 4. ce que l'appli elle-même peut écrire reste accepté
check(V(st({ items: [item({ w: 0 })] })).ok, 'largeur 0 (saisie clavier) acceptée');
check(V(st({ items: [item({ x: -3.2, rot: -45 })] })).ok, 'position et rotation négatives acceptées');
const dup = V(st({ items: [item(), item()] }));
check(dup.ok && dup.state.items.length === 2 && dup.state.items[0].id !== dup.state.items[1].id, 'identifiants en double : les deux éléments gardés, le second renommé');
const TAG = 'Lit <img src=x onerror="alert(1)"><b>';
const r3 = V(st({ items: [item({ name: TAG })] }));
check(r3.ok && r3.state.items[0].name === TAG, 'nom balisé conservé tel quel (l\'affichage l\'échappe)');
check(V(st({ items: [item({ type: 'meuble-futur' })] })).ok, 'type inconnu de la bibliothèque accepté (forme par défaut, comme en 0.9.13)');

// 5. refus : structure, types, valeurs impossibles
refused(null, 'null'); refused([], 'liste au lieu d\'objet'); refused('texte', 'texte');
refused(st({ version: 2 }), 'version 2', 'version'); refused(Object.assign(st(), { version: undefined }), 'sans version', 'version');
refused(st({ items: 'pas une liste' }), 'items texte', 'items'); refused(st({ items: [42] }), 'élément nombre');
refused(st({ items: [item({ w: '0.9' })] }), 'largeur en texte', '« w »'); refused(st({ items: [item({ x: NaN })] }), 'position NaN', '« x »');
refused(st({ items: [item({ h: 1e9 })] }), 'hauteur absurde', '« h »'); refused(st({ items: [item({ rot: null })] }), 'rotation null', '« rot »');
refused(st({ items: [item({ level: 2 })] }), 'niveau 2', 'niveau'); refused(st({ items: [item({ type: '<b>' })] }), 'type balisé', 'type');
refused(st({ items: [item({ id: 'i1"><b>' })] }), 'identifiant balisé', 'identifiant'); refused(st({ items: [item({ name: 12 })] }), 'nom nombre', 'nom');
refused(st({ items: [item({ name: 'x'.repeat(501) })] }), 'nom de 501 caractères', 'nom'); refused(st({ items: [item({ model: 'm1"><b>' })] }), 'modèle balisé', 'modèle');
refused(st({ items: [item({ shape: 'triangle' })] }), 'forme inconnue', 'forme');
refused(st({ items: Array.from({ length: 2001 }, (_, i) => item({ id: 'i' + i })) }), '2 001 éléments', 'trop');
refused(st({ mezz: 'oui' }), 'mezzanine texte', 'mezz'); refused(st({ mezz: { on: 'oui' } }), 'mezzanine « on » texte', 'mezzanine');
refused(st({ mezz: { h: '2.2' } }), 'hauteur de mezzanine texte', 'mezzanine'); refused(st({ mezz: { shape: '<b>' } }), 'forme de mezzanine inconnue', 'mezzanine');
refused(st({ style: 'rose' }), 'style inconnu', 'style');
refused(st({ models: 'x' }), 'modèles texte', 'models'); refused(st({ models: [{ id: 'm1', name: 'a', data: '<script>' }] }), 'modèle non base64', 'contenu');
refused(st({ models: [{ id: 'm1', name: 'a', data: 'A'.repeat(21 * 1024 * 1024) }] }), 'modèle de plus de 15 Mo', 'contenu');
const many = V(st({ items: Array.from({ length: 30 }, (_, i) => item({ id: 'i' + i, w: 'x' })) }));
check(!many.ok && many.errors.length === 8, 'au plus 8 raisons affichées');

// 6. références aux modèles 3D
const r4 = V(st({ items: [item({ model: 'absent' })], models: [] }));
check(r4.ok && !('model' in r4.state.items[0]), 'élément qui pointe vers un modèle absent : lien retiré, élément gardé');
const r5 = V(st({ items: [item({ model: 'mk1' })] }));
check(r5.ok && !('model' in r5.state.items[0]), 'sans liste de modèles : lien retiré');

// 7. lecture d'un texte JSON
const p1 = DI.parseImport('{ "version": 1, "items": [', Z.defaultState(), Z.LIBRARY);
check(!p1.ok && p1.errors[0].includes('illisible'), 'JSON cassé : refusé, « illisible »');
check(DI.parseImport(J(exp0913), Z.defaultState(), Z.LIBRARY).ok, 'JSON d\'un export 0.9.13 : accepté');
check(!DI.parseImport(42, Z.defaultState(), Z.LIBRARY).ok, 'entrée non texte : refusée');

// 8. contrôle rapide d'un .glb
const hdr = magic => { const b = new ArrayBuffer(12); new DataView(b).setUint32(0, magic, true); return b; };
check(DI.checkGlb(0, null) && DI.checkGlb(16 * 1024 * 1024, null).includes('trop lourd'), 'GLB vide ou de plus de 15 Mo : refusé');
check(DI.checkGlb(1000, hdr(0x12345678)).includes('glTF') && DI.checkGlb(1000, new ArrayBuffer(4)).includes('glTF'), 'GLB sans signature ou trop court : refusé');
check(DI.checkGlb(1000, hdr(0x46546C67)) === null && DI.checkGlb(15 * 1024 * 1024, null) === null, 'GLB valide de 15 Mo : accepté');

if (fails.length) { console.log('ÉCHEC ' + fails.length + '/' + n); fails.slice(0, 25).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('OK ' + n + '/' + n);
