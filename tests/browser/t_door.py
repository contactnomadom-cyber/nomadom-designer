# NOMAD-2026-005 — Porte d'aplomb dans l'onglet Base : ajouter une porte sur une ouverture fermée par le sol,
# lire son calcul (passe / ne passe pas, potelets, fermeture), régler le recul, la retirer.
# Usage : python3 tests/browser/t_door.py dist/nomadom-designer.html
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
# contour de 9 triangles autour du nœud N40 (référence 3V Ø 5 m), même tracé que tests/node/door.test.js
SECTOR = """() => {
  const dome = CoverApp.dome(), L = CoverApp.labels(), id = [...L].find(([, l]) => l === 'N40')[0];
  const P = i => dome.pointById.get(i), yB = Math.min(...dome.points.map(p => p.y)), a0 = Math.atan2(P(id).z, P(id).x);
  const set = dome.faces.filter(f => { const q = f.pointIds.map(P), c = [0, 1, 2].map(() => 0);
    const cx = (q[0].x + q[1].x + q[2].x) / 3, cy = (q[0].y + q[1].y + q[2].y) / 3, cz = (q[0].z + q[1].z + q[2].z) / 3;
    const d = Math.atan2(cz, cx) - a0; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.35 && cy - yB < 2.3; });
  const cnt = new Map(), ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
  set.forEach(f => [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => { const k = ek(f.pointIds[i], f.pointIds[j]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
  const ground = k => k.split('-').every(i => Math.abs(P(+i).y - yB) < 1e-6);
  return [...cnt].filter(([k, c]) => c === 1 && !ground(k)).map(([k]) => k.split('-').map(i => L.get(+i)));
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabBase'); pg.wait_for_timeout(800)
    pairs = pg.evaluate(SECTOR)
    pg.evaluate('pairs => CoverApp.setOpenings(pairs)', pairs); pg.wait_for_timeout(800)
    txt = lambda: pg.inner_text('#baseOpenings')
    check('1 ouverture' in txt() and '9 triangles retirés' in txt() and 'fermée par le sol' in txt(), 'ouverture de 9 triangles fermée par le sol (' + str(len(pairs)) + ' montants)')
    add = pg.query_selector('[data-door-add]')
    check(add is not None, 'bouton « Ajouter une porte d\'aplomb »')
    add.click(); pg.wait_for_timeout(400)
    t = txt()
    check('La porte passe' in t and '🟡' in t, 'porte 0,90 × 2,00 : elle passe (🟡)')
    check('Potelet gauche' in t and 'Potelet du milieu' in t and 'Potelet droit' in t and 'recule de' in t, 'potelets : montée puis retrait vers le dôme')
    check('2 montants de 2000 mm' in t and 'linteau et seuil de 900 mm' in t, 'huisserie : 2 × 2000 mm, linteau et seuil 900 mm')
    check('🟠' in t and 'avant-corps' in t and 'sas intérieur' in t, 'explication didactique et réserve 🟠')
    # trop haute → refusée, avec les maxima
    pg.fill('[data-door-f="height"]', '2.45'); pg.dispatch_event('[data-door-f="height"]', 'change'); pg.wait_for_timeout(400)
    t = txt()
    check('🔴' in t and 'ne passe pas' in t and 'Maxi' in t, 'porte de 2,45 m : refusée, maxima donnés')
    pg.fill('[data-door-f="height"]', '2'); pg.dispatch_event('[data-door-f="height"]', 'change'); pg.wait_for_timeout(400)
    # recul : le retrait du potelet diminue
    mid = lambda: int(pg.inner_text('#baseOpenings').split('Potelet du milieu')[1].split('recule de ')[1].split(' mm')[0])
    r0 = mid()
    pg.eval_on_selector('[data-door-f="setback"]', 'e => { e.value = "0.5"; e.dispatchEvent(new Event("change", { bubbles: true })); }'); pg.wait_for_timeout(400)
    check(r0 - mid() == 500 or abs(r0 - mid() - 500) <= 1, 'recul de 500 mm : le potelet du milieu recule de 500 mm de moins (' + str(r0) + ' → ' + str(mid()) + ')')
    # autre diamètre : même ouverture, la porte reste
    pg.eval_on_selector('#paramDiameter', 'e => { e.value = "6.20"; e.dispatchEvent(new Event("change")); }'); pg.wait_for_timeout(1200)
    check(pg.query_selector('[data-door-del]') is not None, 'Ø 6,20 m : la porte est gardée')
    pg.click('[data-door-del]'); pg.wait_for_timeout(400)
    check(pg.query_selector('[data-door-add]') is not None and 'Potelet' not in txt(), 'porte retirée')
    pg.click('#opClear'); pg.wait_for_timeout(600)
    check('Aucune' in txt() or 'Tracer les ouvertures' in txt() or 'Cliquez' in txt(), 'ouvertures effacées')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
