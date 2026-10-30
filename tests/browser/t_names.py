# Étapes 7 et 8 (+ décision 9) : double nom de coupe, Mexican retirée, toile 🔴 en Triad/Cross/sphère entière
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
    T = lambda s: pg.inner_text(s)
    opts = lambda s: pg.eval_on_selector(s, 'e => [...e.options].map(o => o.text)')
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 120:
            i = T('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT'
    def base(V, m, sym, part):
        pg.click('#tabBase'); pg.select_option('#paramDetail', V); pg.wait_for_timeout(200)
        pg.select_option('#paramMethod', m); pg.wait_for_timeout(150)
        pg.select_option('#paramSymmetry', sym); pg.wait_for_timeout(150)
        pg.select_option('#paramPartial', part); pg.wait_for_timeout(150)
        pg.fill('#paramDiameter', '5.00'); pg.click('#btnRegenerate'); pg.wait_for_timeout(1200)
    pg.click('#tabBase'); pg.wait_for_timeout(500)
    for V in ['3', '4', '6']:
        pg.select_option('#paramDetail', V); pg.wait_for_timeout(300)
        check(not any('Mexican' in o for o in opts('#paramMethod')), V + 'V : Mexican absente du menu ' + str(opts('#paramMethod')))
    base('3', 'Kruschke', 'Pentad', '7/12')
    po = opts('#paramPartial')
    check(any('7/12' in o and 'Domerama 3V 5/9' in o for o in po), 'menu : 7/12 · Domerama 3V 5/9 Kruschke')
    check('Domerama 3V 5/9' in T('#headDome'), 'en-tête : ' + T('#headDome'))
    base('3', 'Chords', 'Pentad', '7/12')
    check(any('Domerama 3V 5/8' in o for o in opts('#paramPartial')), 'Chords 7/12 = Domerama 3V 5/8')
    check(any('5/12' in o and 'Domerama 3V 3/8' in o for o in opts('#paramPartial')), 'Chords 5/12 = Domerama 3V 3/8')
    base('3', 'Kruschke', 'Pentad', '5/12')
    check('🟢' in T('#headStatus') and '3V 4/9' in T('#domeStatus'), 'Kruschke 3V 5/12 : 🟢 (Domerama 3V 4/9)')
    base('3', 'Arcs', 'Pentad', '7/12')
    check('🟢' in T('#headStatus') and 'Antiprism' in T('#domeStatus'), 'Arcs 3V : 🟢 (Antiprism)')
    base('4', 'Arcs', 'Pentad', '1/2')
    check('🟡' in T('#headStatus') and 'Antiprism' in T('#domeStatus'), 'Arcs 4V : 🟡 avec la raison')
    base('3', 'Kruschke', 'Triad', '7/12')
    check('🔴' in T('#headStatus') and 'Triad' in T('#domeStatus'), 'Triad : toile 🔴 avec raison')
    check(not any('Domerama' in o for o in opts('#paramPartial')), 'Triad : pas de nom Domerama (correspondance Pentad seulement)')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    check('refusé' in i and pg.locator('#btnPrintAll').count() == 0, 'Triad : patrons bloqués')
    base('2', 'Chords', 'Pentad', '1/1')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    check('refusé' in i and 'sphère entière' in T('#panelsReadout'), '2V sphère entière : patrons bloqués')
    pg.click('#tabInfo'); pg.wait_for_timeout(800)
    check('Noms de coupe' in T('#viewInfo'), 'aide : table des noms de coupe présente')
    base('3', 'Kruschke', 'Pentad', '7/12')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    check(i.startswith('18 morceaux') and pg.locator('#btnPrintAll').count() == 1, 'référence : 18 morceaux, export disponible')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
