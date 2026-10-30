# Étape 3 bis : marges propres à la rangée du bas — 2V Ø5,30 m, laize 1500
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
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 120:
            i = T('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT'
    pg.click('#tabBase'); pg.select_option('#paramDetail', '2'); pg.wait_for_timeout(300)
    pg.select_option('#paramMethod', 'Chords'); pg.select_option('#paramPartial', '1/2')
    pg.fill('#paramDiameter', '5.30'); pg.click('#btnRegenerate'); pg.wait_for_timeout(1000)
    pg.click('#tabCover'); pg.select_option('#paramCutStrategy', 'triangles'); pg.wait_for_timeout(300)
    pg.click('#btnDevelopEtages'); i = wait_info(); r = T('#panelsReadout')
    check('refusé' in i, '2V Ø5,30, laize 1500, marges standard : refusé')
    check('rangée du bas' in r and 'ourlet de 21 mm' in r, 'le refus propose un ourlet de 21 mm au plus (marges 20/20)')
    check(pg.locator('#paramBotHem').is_disabled(), 'champs rangée du bas inactifs tant que la case est décochée')
    pg.check('#paramBottomOn'); pg.dispatch_event('#paramBottomOn', 'change'); pg.wait_for_timeout(800)
    i = wait_info()
    check('refusé' not in i and pg.locator('#btnPrintAll').count() == 1, 'case cochée (15/15, ourlet 30) : plan accepté (' + i + ')')
    pg.click('#btnRoll')
    try: pg.wait_for_selector('#btnPrintAll2', timeout=60000)
    except Exception: pass
    check(pg.locator('#btnPrintAll2').count() == 1, 'plan de coupe et export disponibles')
    pg.click('#btnDevelopEtages'); wait_info()
    chip = pg.locator('.piece-chip', has_text='E2-4').first; chip.click(); pg.wait_for_timeout(800)
    r = T('#panelsReadout')
    check('30' in r and 'Fiche de traçage' in r, 'fiche du morceau E2-4 ouverte (ourlet 30)')
    pg.fill('#paramBotHem', '50'); pg.dispatch_event('#paramBotHem', 'change'); pg.wait_for_timeout(800); i = wait_info()
    check('refusé' in i, 'ourlet du bas à 50 mm : de nouveau refusé')
    pg.uncheck('#paramBottomOn'); pg.dispatch_event('#paramBottomOn', 'change'); pg.wait_for_timeout(800)
    pg.click('#tabBase'); pg.select_option('#paramDetail', '3'); pg.wait_for_timeout(300)
    pg.select_option('#paramMethod', 'Kruschke'); pg.select_option('#paramPartial', '7/12'); pg.fill('#paramDiameter', '5.00'); pg.click('#btnRegenerate'); pg.wait_for_timeout(1000)
    pg.click('#tabCover'); pg.select_option('#paramCutStrategy', 'pieces'); pg.click('#btnDevelopEtages'); i = wait_info()
    check(i.startswith('18 morceaux'), 'référence 3V Ø5 inchangée sans la case (' + i + ')')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
