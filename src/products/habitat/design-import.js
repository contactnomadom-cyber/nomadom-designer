
// ---------------------------------------------------------
// design-import.js — Données sûres pour l'aménagement Design (mission M1)
// Logique pure, sans DOM, testée sous Node (tests/node/design-import.test.js) :
//  - échappement du texte inséré dans du HTML ;
//  - contrôle complet d'un aménagement (fichier .json importé ou sauvegarde
//    du navigateur) AVANT de l'appliquer : structure, types, valeurs finies,
//    tailles ; un fichier refusé ne modifie rien ;
//  - contrôle rapide d'un fichier .glb avant lecture (taille, signature).
// Image : le contrôle de réception d'une livraison. On ouvre le carton, on
// vérifie la pièce ; si elle n'est pas conforme, elle ne rentre pas dans
// l'atelier, et l'établi reste comme il était.
// Les valeurs sont celles écrites par l'appli (mètres, degrés). Les bornes
// sont larges : elles écartent les données impossibles (texte à la place d'un
// nombre, infini), pas les choix de Nathan. Tout ce que l'appli elle-même peut
// écrire (largeur 0 saisie au clavier, doublon d'identifiant) reste accepté.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const LIMITS = Object.freeze({
    jsonBytes: 50 * 1024 * 1024,   // fichier .json importé (modèles 3D compris)
    glbBytes: 15 * 1024 * 1024,    // un fichier .glb
    items: 2000, models: 100, text: 500, id: 64,
    size: 1000,       // m : |largeur|, |profondeur|, |hauteur| d'un élément
    position: 10000,  // m : |x|, |z|
    angle: 36000      // degrés
  });
  const MEZZ_SHAPES = ['demi', 'secteur', 'droit'];
  const STYLES = ['nb', 'color'];

  // texte sûr dans du HTML (contenu ou valeur d'attribut entre guillemets)
  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  }

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isNum = v => typeof v === 'number' && isFinite(v);
  const safeId = v => typeof v === 'string' && v.length > 0 && v.length <= LIMITS.id && /^[A-Za-z0-9_-]+$/.test(v);

  // Contrôle d'un aménagement. defaults = Design.defaultState(), library = Design.LIBRARY.
  // Renvoie { ok: true, state } (nouvel objet, l'entrée n'est pas modifiée)
  //      ou { ok: false, errors: [texte] } (raisons en français, pour Nathan).
  // Règles : champ absent → valeur par défaut (ou de la bibliothèque) ; champ présent
  // mais du mauvais type ou impossible → refus du fichier entier.
  // Les ouvertures du Design ne sont pas reprises (comportement de la 0.9.13 :
  // elles se tracent dans l'onglet Base).
  function validateState(raw, defaults, library) {
    const errors = [], err = m => { if (errors.length < 8) errors.push(m); };
    if (!isObj(raw)) return { ok: false, errors: ['ce n\'est pas un aménagement (objet attendu)'] };
    if (raw.version !== 1) return { ok: false, errors: ['version de format ' + escapeText(raw.version) + ' inconnue (attendue : 1)'] };
    const lib = new Map((library || []).map(l => [l.type, l]));
    const out = { version: 1, items: [], openings: [], mezz: Object.assign({}, defaults.mezz), style: defaults.style };

    // éléments
    const items = raw.items === undefined ? [] : raw.items;
    if (!Array.isArray(items)) err('« items » doit être une liste d\'éléments');
    else if (items.length > LIMITS.items) err('trop d\'éléments (' + items.length + ', au plus ' + LIMITS.items + ')');
    else {
      const seen = new Set();
      items.forEach((it, i) => {
        const where = 'élément ' + (i + 1);
        if (!isObj(it)) { err(where + ' : objet attendu'); return; }
        if (typeof it.type !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(it.type)) { err(where + ' : type manquant ou invalide'); return; }
        const L = lib.get(it.type) || {};
        const o = { id: it.id, type: it.type, name: it.name, x: it.x, z: it.z, rot: it.rot, w: it.w, d: it.d, h: it.h, level: it.level };
        if (o.id === undefined || o.id === null) o.id = 'i' + i.toString(36) + 'm1';
        else if (!safeId(o.id)) { err(where + ' : identifiant invalide'); return; }
        while (seen.has(o.id)) o.id = (o.id + 'd').slice(-LIMITS.id);   // doublon (« Dupliquer » dans la même milliseconde) : nouvel identifiant
        seen.add(o.id);
        if (o.name === undefined) o.name = L.label || it.type;
        if (typeof o.name !== 'string' || o.name.length > LIMITS.text) { err(where + ' : nom invalide'); return; }
        for (const [k, def, max] of [['x', 0, LIMITS.position], ['z', 0, LIMITS.position], ['rot', 0, LIMITS.angle],
                                      ['w', L.w, LIMITS.size], ['d', L.d, LIMITS.size], ['h', L.h, LIMITS.size]]) {
          if (o[k] === undefined) o[k] = def === undefined ? 1 : def;
          if (!isNum(o[k]) || Math.abs(o[k]) > max) { err(where + ' (« ' + escapeText(o.name) + ' ») : valeur « ' + k + ' » impossible'); return; }
        }
        if (o.level === undefined) o.level = 0;
        if (o.level !== 0 && o.level !== 1) { err(where + ' : niveau invalide (0 = rez, 1 = mezzanine)'); return; }
        if (it.model !== undefined && it.model !== null && it.model !== '') {
          if (!safeId(it.model)) { err(where + ' : modèle 3D invalide'); return; }
          o.model = it.model;
        }
        if (it.shape !== undefined) {
          if (it.shape !== 'rect' && it.shape !== 'circle') { err(where + ' : forme invalide'); return; }
          o.shape = it.shape;
        }
        out.items.push(o);
      });
    }

    // mezzanine
    if (raw.mezz !== undefined) {
      if (!isObj(raw.mezz)) err('« mezz » doit être un objet');
      else {
        const m = raw.mezz;
        if (m.on !== undefined) { if (typeof m.on !== 'boolean') err('mezzanine : « on » doit valoir vrai ou faux'); else out.mezz.on = m.on; }
        ['h', 'thick', 'depth', 'angle', 'width', 'orient'].forEach(k => {
          if (m[k] === undefined) return;
          if (!isNum(m[k]) || Math.abs(m[k]) > (k === 'angle' || k === 'orient' ? LIMITS.angle : LIMITS.size)) err('mezzanine : valeur « ' + k + ' » impossible');
          else out.mezz[k] = m[k];
        });
        if (m.shape !== undefined) { if (MEZZ_SHAPES.indexOf(m.shape) < 0) err('mezzanine : forme inconnue'); else out.mezz.shape = m.shape; }
      }
    }
    if (raw.style !== undefined) { if (STYLES.indexOf(raw.style) < 0) err('style de plan inconnu'); else out.style = raw.style; }

    // modèles 3D intégrés (.glb en base64)
    if (raw.models !== undefined) {
      if (!Array.isArray(raw.models)) err('« models » doit être une liste');
      else if (raw.models.length > LIMITS.models) err('trop de modèles 3D (' + raw.models.length + ')');
      else {
        out.models = [];
        raw.models.forEach((m, i) => {
          const where = 'modèle 3D ' + (i + 1);
          if (!isObj(m) || !safeId(m.id)) { err(where + ' : identifiant invalide'); return; }
          if (typeof m.name !== 'string' || m.name.length > LIMITS.text) { err(where + ' : nom invalide'); return; }
          if (typeof m.data !== 'string' || m.data.length > Math.ceil(LIMITS.glbBytes * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(m.data)) { err(where + ' (« ' + escapeText(m.name) + ' ») : contenu invalide ou plus lourd que ' + Math.round(LIMITS.glbBytes / 1048576) + ' Mo'); return; }
          out.models.push({ id: m.id, name: m.name, data: m.data });
        });
        const ids = new Set(out.models.map(m => m.id));
        out.items.forEach(it => { if (it.model && !ids.has(it.model)) delete it.model; });
      }
    } else out.items.forEach(it => { delete it.model; });

    return errors.length ? { ok: false, errors } : { ok: true, state: out };
  }
  // valeur courte et lisible pour un message (jamais interprétée comme du HTML par l'appelant)
  function escapeText(v) { const s = typeof v === 'string' ? v : JSON.stringify(v); return String(s).slice(0, 40); }

  // Contrôle d'un texte JSON (fichier importé) : taille, lecture, puis validateState.
  function parseImport(text, defaults, library) {
    if (typeof text !== 'string') return { ok: false, errors: ['fichier illisible'] };
    if (text.length > LIMITS.jsonBytes) return { ok: false, errors: ['fichier trop lourd (plus de ' + Math.round(LIMITS.jsonBytes / 1048576) + ' Mo)'] };
    let raw;
    try { raw = JSON.parse(text); } catch (e) { return { ok: false, errors: ['fichier illisible : ce n\'est pas un aménagement Nomad\'Om Designer'] }; }
    return validateState(raw, defaults, library);
  }

  // Contrôle rapide d'un .glb avant lecture complète : taille et signature « glTF ».
  // byteLength = taille du fichier ; header = ses 12 premiers octets (ArrayBuffer ou null).
  function checkGlb(byteLength, header) {
    if (!(byteLength > 0)) return 'fichier vide';
    if (byteLength > LIMITS.glbBytes) return 'fichier trop lourd (' + (byteLength / 1048576).toFixed(1) + ' Mo, au plus ' + Math.round(LIMITS.glbBytes / 1048576) + ' Mo)';
    if (header) {
      if (header.byteLength < 12) return 'ce n\'est pas un fichier .glb (glTF binaire)';
      const dv = new DataView(header);
      if (dv.getUint32(0, true) !== 0x46546C67) return 'ce n\'est pas un fichier .glb (glTF binaire)';
    }
    return null;
  }

  const DesignImport = { LIMITS, escapeHtml, validateState, parseImport, checkGlb };
  if (typeof module !== 'undefined' && module.exports) module.exports = DesignImport;
  else global.DesignImport = DesignImport;
})(typeof window !== 'undefined' ? window : globalThis);
