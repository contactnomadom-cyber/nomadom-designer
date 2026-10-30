# Étape 5 : statut 🟢🟡🟠🔴 affiché ; 🔴 bloque patrons et exports
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
    def base(V, m, sym, part, align=False, D='5.00'):
        pg.click('#tabBase'); pg.select_option('#paramDetail', V); pg.wait_for_timeout(200)
        pg.select_option('#paramMethod', m); pg.wait_for_timeout(150)
        pg.select_option('#paramSymmetry', sym); pg.wait_for_timeout(150)
        pg.select_option('#paramPartial', part); pg.wait_for_timeout(150)
        if pg.is_checked('#paramAlign') != align: pg.click('#paramAlign'); pg.wait_for_timeout(500)
        pg.fill('#paramDiameter', D); pg.click('#btnRegenerate'); pg.wait_for_timeout(1200)
    base('3', 'Kruschke', 'Pentad', '7/12')
    h = T('#headStatus'); s = T('#domeStatus')
    check('🟢' in h and '🟠' in h, 'référence 3V 7/12 : 🟢 géométrie, 🟠 toile (' + h + ')')
    check('3V 5/9' in s, 'raison affichée : référence Domerama 3V 5/9')
    base('3', 'Kruschke', 'Pentad', '7/12', align=True)
    check('🟢' in T('#headStatus') and 'aucun nœud déplacé' in T('#domeStatus'), '3V 7/12 + aligner : reste 🟢 (aucun nœud déplacé)')
    base('3', 'Kruschke', 'Pentad', '3/4', align=True)
    check('🟡' in T('#headStatus') and 'nœuds du bord déplacés' in T('#domeStatus'), '3V Kruschke 3/4 aligné : 🟡')
    base('4', 'Arcs', 'Pentad', '1/2')
    check('🟡' in T('#headStatus') and 'Antiprism' in T('#domeStatus'), '4V Arcs : 🟡 (écart Antiprism)')
    base('2', 'Chords', 'Pentad', '1/2', D='5.30')
    check('🟢' in T('#headStatus') and 'identique à Domerama' in T('#domeStatus'), '2V Chords 1/2 : 🟢 (comptage comparé)')
    base('1', 'Chords', 'Triad', '3/4')
    check('🔴' in T('#headStatus'), '1V Triad 3/4 : 🔴')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    check('refusé' in i and pg.locator('#btnPrintAll, #btnPrintAll2').count() == 0, '🔴 : patrons et exports bloqués')
    base('4', 'Chords', 'Pentad', '1/1')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    hs = T('#headStatus')
    check(('refusé' in i and '🔴' in hs) or ('refusé' not in i and '🟠' in hs), '4V sphère entière : soit bloquée en 🔴 (vagues), soit 🟠 (' + i + ' / ' + hs + ')')
    base('3', 'Kruschke', 'Pentad', '7/12')
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); i = wait_info()
    check(i.startswith('18 morceaux') and pg.locator('#btnPrintAll').count() == 1, 'retour à la référence : 18 morceaux, export disponible')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
