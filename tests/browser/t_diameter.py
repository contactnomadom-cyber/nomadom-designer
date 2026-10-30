# Ø affiché = Ø du dôme réellement calculé (case vide → le calcul prend 5 m, jamais « NaN »)
import sys, os
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
    for val, want in [('5.30', 'Ø5,30 m'), ('', 'Ø5,00 m')]:
        pg.eval_on_selector('#paramDiameter', '(e, v) => { e.value = v; e.dispatchEvent(new Event("change")); }', val); pg.wait_for_timeout(800)
        head = pg.inner_text('#headDome')
        check(want in head and 'NaN' not in head, 'case Ø « ' + val + ' » : en-tête ' + head)
        pg.click('#modeTriangle'); pg.wait_for_timeout(500)
        tri = pg.inner_text('#panelsReadout')
        check('NaN' not in tri and want.replace('Ø', '').replace(',', '.').replace(' m', '') in tri, 'case Ø « ' + val + ' » : tableau des triangles de base')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
