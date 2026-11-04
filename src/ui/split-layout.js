// NOMAD-2026-008 Lot 1 — Cadres réglables : vue 3D fixe + colonne de réglages qui défile.
// Affichage seulement : aucun calcul, aucun réglage du dôme n'est touché.
// Structure attendue :
//   <div class="split" data-split="base">
//     <div class="split-view">…vue…</div>
//     <div class="split-handle"></div>
//     <div class="split-opts">…réglages…</div>
//   </div>
// La taille (part de la vue, en %) et l'état replié sont mémorisés sur cet ordinateur (localStorage).
// Après chaque changement, l'événement « nomadom:layout » (detail = nom du cadre) est émis
// pour que l'application redessine la vue à sa nouvelle taille.
(function (global) {
  'use strict';
  const MIN = 25, MAX = 80, DEF = 58;           // part de la vue 3D, en % de la largeur
  const KEY = n => 'nomadom.ui.split.' + n;

  function load(name) {
    try {
      const v = JSON.parse(global.localStorage.getItem(KEY(name)) || 'null');
      if (v && typeof v.ratio === 'number') return { ratio: clamp(v.ratio), fold: v.fold === 'view' || v.fold === 'opts' ? v.fold : '' };
    } catch (e) { /* stockage indisponible : réglages par défaut */ }
    return { ratio: DEF, fold: '' };
  }
  function save(name, st) {
    try { global.localStorage.setItem(KEY(name), JSON.stringify(st)); } catch (e) { /* sans mémoire */ }
  }
  function clamp(r) { return Math.max(MIN, Math.min(MAX, Math.round(r * 10) / 10)); }

  function mount(root) {
    const name = root.getAttribute('data-split') || 'main';
    const view = root.querySelector(':scope > .split-view');
    const opts = root.querySelector(':scope > .split-opts');
    const handle = root.querySelector(':scope > .split-handle');
    if (!view || !opts || !handle) return null;
    let st = load(name), raf = 0;

    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('tabindex', '0');
    handle.title = 'Glisser pour agrandir ou réduire les cadres · double-clic = taille par défaut · flèches ← → au clavier';
    handle.innerHTML =
      '<button type="button" class="split-fold" data-fold="view" title="Replier la vue 3D">◀</button>' +
      '<span class="split-grip" aria-hidden="true"></span>' +
      '<button type="button" class="split-fold" data-fold="opts" title="Replier les réglages">▶</button>';

    function notify() {
      if (raf) return;
      raf = (global.requestAnimationFrame || (f => setTimeout(f, 16)))(() => {
        raf = 0;
        global.dispatchEvent(new CustomEvent('nomadom:layout', { detail: name }));
      });
    }
    function apply(persist) {
      root.classList.toggle('fold-view', st.fold === 'view');
      root.classList.toggle('fold-opts', st.fold === 'opts');
      root.style.setProperty('--split-view', st.ratio + '%');
      handle.setAttribute('aria-valuenow', String(st.ratio));
      const bv = handle.querySelector('[data-fold="view"]'), bo = handle.querySelector('[data-fold="opts"]');
      // Un cadre replié : le bouton qui le replie sert à le rouvrir.
      bv.textContent = st.fold === 'opts' ? '◀' : st.fold === 'view' ? '▶' : '◀';
      bv.title = st.fold === 'view' ? 'Rouvrir la vue 3D' : st.fold === 'opts' ? 'Rouvrir les réglages' : 'Replier la vue 3D';
      bo.textContent = st.fold === 'view' ? '▶' : st.fold === 'opts' ? '◀' : '▶';
      bo.title = st.fold === 'opts' ? 'Rouvrir les réglages' : st.fold === 'view' ? 'Rouvrir la vue 3D' : 'Replier les réglages';
      bv.hidden = st.fold === 'opts'; bo.hidden = st.fold === 'view';
      if (persist) save(name, st);
      notify();
    }

    handle.addEventListener('click', e => {
      const b = e.target.closest('.split-fold'); if (!b) return;
      const f = b.getAttribute('data-fold');
      st.fold = st.fold ? '' : f;          // replié → on rouvre ; ouvert → on replie ce cadre
      apply(true);
    });
    handle.addEventListener('dblclick', e => {
      if (e.target.closest('.split-fold')) return;
      st = { ratio: DEF, fold: '' }; apply(true);
    });
    handle.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); st.fold = '';
      st.ratio = clamp(st.ratio + (e.key === 'ArrowLeft' ? -2 : 2)); apply(true);
    });
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('.split-fold') || st.fold) return;
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (_) { /* ancien navigateur */ }
      root.classList.add('dragging');
      const move = ev => {
        const r = root.getBoundingClientRect(); if (!r.width) return;
        st.ratio = clamp((ev.clientX - r.left) / r.width * 100); apply(false);
      };
      const up = () => {
        root.classList.remove('dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        save(name, st); notify();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });

    apply(false);
    return {
      root,
      get state() { return { ratio: st.ratio, fold: st.fold }; },
      set(next) { st = { ratio: clamp(next.ratio ?? st.ratio), fold: next.fold ?? st.fold }; apply(true); }
    };
  }

  const api = { mount, instances: {}, DEFAULT_RATIO: DEF };
  function mountAll() {
    document.querySelectorAll('.split[data-split]').forEach(el => {
      const n = el.getAttribute('data-split');
      if (!api.instances[n] || api.instances[n].root !== el) api.instances[n] = mount(el); // vue reconstruite : on remonte
    });
  }
  api.mountAll = mountAll;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
  }
  global.SplitLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
