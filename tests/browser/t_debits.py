# Liste de débits du plancher (onglet Base) : pièces repérées, onglets, barres à commander, panneaux.
# Usage : python3 tests/browser/t_debits.py dist/nomadom-designer.html [dossier_images]
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
OUT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    check(pg.query_selector('#floorCuts') is None, 'sans plancher : pas de liste de débits')
    pg.click('[data-floor-on]'); pg.wait_for_timeout(1500)
    check(pg.query_selector('#floorCuts') is not None, 'plancher ajouté : liste de débits présente')
    summ = pg.inner_text('#floorCuts summary')
    check('38 pièces' in summ and '7 panneaux' in summ, 'résumé : ' + summ)
    pg.click('#floorCuts > summary'); pg.wait_for_timeout(300)
    t = pg.inner_text('#floorCuts')
    check('Poutres 75 × 195' in t and 'Solives 45 × 145' in t, 'deux sections : poutres et solives')
    check('2887 mm' in t and '36°' in t and '1039 mm' in t and '60°' in t, 'pentagone 2887 mm à 36°, triangle 1039 mm à 60°')
    check('équerre / équerre' in t, 'solives coupées d\'équerre')
    check(t.count('À commander :') == 2 and 'chute' in t and ' m pour ' in t, 'barres à commander et chute, par section')
    check('7 panneaux de 2,44 m × 1,22 m' in t and '🟠' in t and 'Bourguignon Bois' in t, 'panneaux de plancher et réserves 🟠 (formats à confirmer)')
    pg.click('#floorCuts details summary'); pg.wait_for_timeout(200)
    check(pg.locator('#floorCuts details ol li').first.is_visible(), 'plan de coupe des barres dépliable')
    if OUT: os.makedirs(OUT, exist_ok=True); pg.locator('#floorCuts').screenshot(path=os.path.join(OUT, 'debits.png'))
    # choix du bois : sections et assemblage
    check(pg.input_value('[data-floor-f="beamSection"]') == 'prov-75x195' and pg.input_value('[data-floor-f="joint"]') == 'onglet', 'par défaut : sections d\'origine, cadres en onglet')
    pg.select_option('[data-floor-f="joint"]', 'about'); pg.wait_for_timeout(1200)
    pg.click('#floorCuts > summary'); pg.wait_for_timeout(300); t = pg.inner_text('#floorCuts')
    check('en about' in t and 'jour à l\'extérieur' in t and '36°' not in t and 'coupes' in t, 'cadres en about : coupes d\'équerre, jour signalé')
    pg.select_option('[data-floor-f="beamSection"]', 'kvh-80x200'); pg.select_option('[data-floor-f="joistSection"]', 'cls-38x140'); pg.wait_for_timeout(1200)
    pg.click('#floorCuts > summary'); pg.wait_for_timeout(300); t = pg.inner_text('#floorCuts')
    check('Poutres KVH 80 × 200' in t and 'Solives CLS 38 × 140' in t and 'poutres 80 × 200, solives 38 × 140' in pg.inner_text('#baseFloor'), 'poutres KVH 80 × 200 et solives CLS 38 × 140 : liste et quantités suivent')
    ch = pg.evaluate('CoverApp.floorScene().boxes.length')
    check(ch > 0, 'la 3D du plancher suit les nouvelles sections')
    pg.select_option('[data-floor-f="beamSection"]', 'prov-75x195'); pg.select_option('[data-floor-f="joistSection"]', 'prov-45x145'); pg.select_option('[data-floor-f="joint"]', 'onglet'); pg.wait_for_timeout(1200)
    # plancher plein : la liste suit le choix
    pg.select_option('[data-floor-f="deck"]', 'plein'); pg.wait_for_timeout(1200)
    s2 = pg.inner_text('#floorCuts summary')
    check(s2 != summ and 'pièces' in s2, 'plancher plein : liste recalculée (' + s2 + ')')
    pg.select_option('[data-floor-f="deck"]', 'etoile'); pg.wait_for_timeout(800)
    pg.click('[data-floor-off]'); pg.wait_for_timeout(1000)
    check(pg.query_selector('#floorCuts') is None, 'plancher retiré : liste retirée')
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
