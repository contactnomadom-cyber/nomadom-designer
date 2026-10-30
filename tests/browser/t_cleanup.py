# Étape 11 : anciens modes et boutons inactifs retirés ; modes manuels intacts
import sys, os, time
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabCover'); pg.wait_for_timeout(500)
    labels = pg.eval_on_selector_all('.btnrow button', 'bs => bs.map(b => b.textContent.trim())')
    for gone in ['Dôme complet', 'Fleur', 'Bandes/Gores', 'Symétrie', 'Marge', 'Couture', 'Export SVG', 'Export PDF', 'Export DXF', 'Export CSV']:
        check(not any(gone in l for l in labels), 'bouton « ' + gone + ' » retiré')
    check(pg.locator('.btnrow button[disabled]').count() == 0, 'plus aucun bouton inactif dans la barre')
    for keep in ['Triangle', 'Créer panneau', 'Développer', 'Étages', 'Plan de coupe', 'Vue aplatie']:
        check(any(keep in l for l in labels), 'bouton « ' + keep + ' » présent')
    # mode manuel : clic sur une face du dôme 3D, puis Développer
    box = pg.query_selector('#viewer3d').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    pg.mouse.click(cx, cy); pg.wait_for_timeout(400)
    pg.keyboard.down('Shift'); pg.mouse.click(cx + 25, cy + 10); pg.keyboard.up('Shift'); pg.wait_for_timeout(400)
    sel = pg.inner_text('#selectionReadout')
    check('Aucun triangle' not in sel, 'mode Triangle : sélection dans la 3D')
    pg.click('#btnDevelop'); pg.wait_for_timeout(800)
    check(pg.inner_text('#dev2dInfo').strip() != '', 'Développer : groupe déplié (' + pg.inner_text('#dev2dInfo')[:60] + ')')
    pg.click('#btnFlat'); pg.wait_for_timeout(2500)
    check('refusé' not in pg.inner_text('#dev2dInfo'), 'Vue aplatie disponible sur la référence')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
