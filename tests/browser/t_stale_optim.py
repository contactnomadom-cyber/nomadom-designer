# Vérifie que la stratégie « moins de toile » se recalcule quand la coupe change
import sys, os, time
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    pg.goto(APP); pg.wait_for_timeout(1500)
    T = lambda s: pg.inner_text(s)
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 90:
            i = T('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT ' + T('#dev2dInfo')
    def base(part, method='Kruschke'):
        pg.click('#tabBase'); pg.select_option('#paramDetail', '3'); pg.wait_for_timeout(300)
        pg.select_option('#paramMethod', method); pg.wait_for_timeout(200)
        pg.select_option('#paramPartial', part); pg.click('#btnRegenerate'); pg.wait_for_timeout(1000)
        return T('#statFaces')
    print('faces 7/12 :', base('7/12'))
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); pg.select_option('#paramCutStrategy', 'toile')
    print('moins de toile 7/12 :', wait_info())
    print('faces 5/12 :', base('5/12'))
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); pg.wait_for_timeout(800)
    r512 = wait_info(); print('moins de toile après passage en 5/12 :', r512)
    pg.select_option('#paramCutStrategy', 'pieces'); pg.wait_for_timeout(800)
    print('moins de morceaux 5/12 :', wait_info())
    print('faces Chords 7/12 :', base('7/12', 'Chords'))
    pg.click('#tabCover'); pg.click('#btnDevelopEtages'); pg.select_option('#paramCutStrategy', 'toile'); pg.wait_for_timeout(800)
    rch = wait_info(); print('moins de toile Chords 7/12 :', rch)
    b.close()
# valeurs attendues (recalculées sous Node avec optim.js, 30/10/2026)
ok = r512.startswith('29 morceaux') and rch.startswith('40 morceaux')
print('RÉSULTAT :', 'OK' if ok else 'ÉCHEC — résultat d\'un autre dôme réutilisé (attendu 29 puis 40 morceaux)')
sys.exit(0 if ok else 1)
