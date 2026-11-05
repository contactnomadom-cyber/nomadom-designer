# Ossature de la mezzanine (onglet Design) : barre de choix, solidité, épaisseur conseillée, liste de débits.
# Usage : python3 tests/browser/t_mezz_frame.py dist/nomadom-designer.html [dossier_images]
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
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(not pg.is_visible('#dsMezzFrameBar'), 'sans mezzanine : pas de barre « Ossature mezzanine »')
    pg.check('#dsMezzOn'); pg.wait_for_timeout(1500)
    check(pg.is_visible('#dsMezzFrameBar'), 'mezzanine cochée : barre « Ossature mezzanine » visible')
    check(pg.input_value('#dsMfJoist') == 'cls-38x184' and pg.input_value('#dsMfSpacing') == '0.5' and pg.input_value('#dsMfPost') == 'kvh-100x100', 'par défaut : solives CLS 38 × 184 à 50 cm, poteaux KVH 100 × 100')
    t = pg.inner_text('#dsMezzFrame')
    check('tout passe' in t and 'Solives' in t and 'Poutre de rive' in t and '🟡 calculé' in t, 'solidité affichée : tout passe')
    check('Épaisseur réglée 150 mm' in t and pg.is_visible('#dsMfThick'), 'épaisseur 150 mm trop faible : alerte et bouton')
    check(pg.input_value('#dsMfWall') == 'poteaux' and 'la paroi ne porte rien' in t and 'Poutre côté paroi' in t, 'par défaut : mezzanine indépendante (poutre côté paroi sur poteaux)')
    pg.select_option('#dsMfWall', 'paroi'); pg.wait_for_timeout(1200)
    t2 = pg.inner_text('#dsMezzFrame')
    check('🟠' in t2 and 'montants du dôme' in t2 and 'Poutre côté paroi' not in t2, 'appui sur les montants : charge sur le dôme signalée 🟠')
    check(pg.evaluate('CoverDesign.state().mezz.frame.wallSupport') == 'paroi', 'appui gardé dans l\'aménagement')
    pg.select_option('#dsMfWall', 'poteaux'); pg.wait_for_timeout(1200)
    pg.click('#dsMfThick'); pg.wait_for_timeout(1200)
    check(pg.input_value('#dsMezzT') == '0.23' and 'Épaisseur réglée' not in pg.inner_text('#dsMezzFrame') and not pg.is_visible('#dsMfThick'), 'bouton : épaisseur réglée à 0,23 m, alerte levée')
    pg.click('#dsMezzCuts > summary'); pg.wait_for_timeout(300)
    t = pg.inner_text('#dsMezzCuts')
    check('Solives CLS 38 × 184' in t and 'Poutres KVH 80 × 200' in t and 'poutre côté paroi' in t and 'À commander' in t and 'panneaux de 2,44 m × 1,22 m' in t, 'liste de débits : solives, poutre de rive, panneaux')
    if OUT:
        os.makedirs(OUT, exist_ok=True); pg.locator('#dsMezzFrameBar').screenshot(path=os.path.join(OUT, 'mezz-ossature.png'))
    # côtés droits : poteaux
    pg.select_option('#dsMezzShape', 'droit'); pg.wait_for_timeout(1500)
    t = pg.inner_text('#dsMezzFrame')
    check('Poteaux (' in t and 'compression' in t, 'côtés droits : poteaux contrôlés en compression')
    # section trop faible
    pg.select_option('#dsMfJoist', 'cls-38x89'); pg.wait_for_timeout(1200)
    t = pg.inner_text('#dsMezzFrame')
    check('🔴' in t and 'il faut au moins CLS 38 × 140' in t and 'masquée' in t, 'solives CLS 38 × 89 : 🔴, conseil CLS 38 × 140, débits masqués')
    check(pg.evaluate('CoverDesign.state().mezz.frame.joistSection') == 'cls-38x89', 'choix gardé dans l\'aménagement')
    pg.select_option('#dsMfSpacing', '0.3'); pg.wait_for_timeout(1200)
    r = pg.evaluate('(() => { const r = CoverDesign._mezzFrame(); return { sp: r.spacing, n: r.joists.length }; })()')
    check(r['sp'] == 0.3, 'entraxe 30 cm pris en compte (' + str(r['n']) + ' solives)')
    pg.select_option('#dsMfJoist', 'cls-38x184'); pg.select_option('#dsMfSpacing', '0.5'); pg.select_option('#dsMezzShape', 'demi'); pg.wait_for_timeout(1000)
    pg.uncheck('#dsMezzOn'); pg.wait_for_timeout(1000)
    check(not pg.is_visible('#dsMezzFrameBar'), 'mezzanine décochée : barre cachée')
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
