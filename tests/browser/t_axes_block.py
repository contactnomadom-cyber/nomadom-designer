# ADR-0002 : la découpe « axes » (coutures montantes alignées) affiche un avertissement
# et ne fournit aucune fiche de traçage ni CSV ; les autres découpes les gardent.
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
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 120:
            i = pg.inner_text('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT'
    pg.click('#tabCover')
    check(not pg.is_visible('#cutWarnAxes'), 'Moins de morceaux : pas d\'avertissement')
    pg.select_option('#paramCutStrategy', 'gabarits'); pg.click('#btnDevelopEtages'); wait_info()
    check(pg.locator('#btnPrintAll').count() == 1, 'Moins de gabarits : « Tout exporter » disponible')
    pg.select_option('#paramCutStrategy', 'axes'); pg.wait_for_timeout(300); pg.click('#btnDevelopEtages'); wait_info()
    check(pg.is_visible('#cutWarnAxes') and 'DÉCONSEILLÉ' in pg.inner_text('#cutWarnAxes'), 'axes : avertissement visible')
    check(pg.locator('#btnPrintAll').count() == 0 and pg.locator('.axes-block').count() >= 1, 'axes : pas de « Tout exporter », message de blocage')
    pg.click('#btnRoll'); wait_info()
    check(pg.locator('#btnPrintAll2').count() == 0, 'axes : plan de coupe sans export des fiches')
    pg.click('#btnFlat'); wait_info()
    check(pg.eval_on_selector('#paramPeelType', 'e => e.value') == 'edges5', 'axes : pelure ouverte en 5 fentes axe des arêtes')
    check(not errs, 'aucune erreur console ' + ' | '.join(errs[:3]))
    b.close()
sys.exit(1 if fails else 0)
