# Étape 3 : une laize trop étroite bloque le plan de coupe et tous ses exports
import sys, os, time
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(cond, msg):
    print(('OK   ' if cond else 'ÉCHEC ') + msg)
    if not cond: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    T = lambda s: pg.inner_text(s)
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 120:
            i = T('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT'
    def setW(v):
        pg.fill('#paramFabricW', str(v)); pg.dispatch_event('#paramFabricW', 'change'); pg.wait_for_timeout(600)
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); wait_info()
    check(pg.locator('#btnPrintAll').count() == 1, 'laize 1500 : export disponible en Étages')
    setW(600)
    for strat in ['pieces', 'gabarits', 'triangles', 'toile']:
        pg.select_option('#paramCutStrategy', strat); pg.wait_for_timeout(400)
        for btn, nom in [('#btnDevelopEtages', 'Étages'), ('#btnRoll', 'Plan de coupe'), ('#btnFlat', 'Vue aplatie')]:
            pg.click(btn); i = wait_info(); r = T('#panelsReadout')
            check('refusé' in i and 'Plan de coupe refusé' in r and pg.locator('#btnPrintAll, #btnPrintAll2, #btnSheetPrint, #btnSheetCsv').count() == 0,
                  'laize 600, ' + strat + ', ' + nom + ' : refusé, aucun bouton d\'export')
    check('laize minimale' in T('#panelsReadout').lower(), 'le refus donne la laize minimale')
    pg.select_option('#paramCutStrategy', 'pieces'); setW(1500); pg.click('#btnDevelopEtages'); i = wait_info()
    check('refusé' not in i and pg.locator('#btnPrintAll').count() == 1, 'retour à 1500 : plan et export revenus (' + i + ')')
    pg.click('#btnRoll')
    try: pg.wait_for_selector('#btnPrintAll2', timeout=60000)
    except Exception: pass
    check(pg.locator('#btnPrintAll2').count() == 1, 'retour à 1500 : plan de coupe et export revenus')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
