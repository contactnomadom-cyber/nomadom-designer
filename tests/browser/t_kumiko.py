# NOMAD-2026-003 — Kumiko dans l'onglet Design (aperçu) : poser / retirer un panneau en cliquant le
# rendu 3D, tableau et plan du panneau, sauvegarde, export / import, autre dôme, aucune erreur.
# Usage : python3 tests/browser/t_kumiko.py dist/nomadom-designer.html
import sys, os, json
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1100}, accept_downloads=True)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(3000)
    panels = lambda: pg.evaluate("(window.CoverDesign.state().kumiko || { panels: [] }).panels")
    shot = lambda: pg.eval_on_selector('#ds3d', 'c => c.toDataURL()')
    box = pg.query_selector('#ds3d').bounding_box(); cx, cy = box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.45

    opts = pg.eval_on_selector_all('#dsKmPattern option', 'o => o.map(x => x.value)')
    check(opts == ['mitsukude', 'asanoha'], 'motifs proposés : seulement les motifs validés (' + str(opts) + ')')
    check(panels() == [], 'au départ : aucun panneau')
    img0 = shot()

    # sans le mode « poser », un clic ne pose rien
    pg.mouse.click(cx, cy); pg.wait_for_timeout(600)
    check(panels() == [], 'clic hors mode « poser » : rien')
    pg.click('#dsKmPick'); pg.wait_for_timeout(300)
    check(pg.inner_text('#dsKmPick').strip() == 'Terminer', 'mode « poser » activé')
    pg.mouse.click(cx, cy); pg.wait_for_timeout(1500)
    p1 = panels()
    check(len(p1) == 1 and p1[0]['pattern'] == 'asanoha' and p1[0]['density'] == 2, 'clic : un panneau asa-no-ha densité 2 posé (' + str(p1) + ')')
    check(shot() != img0, 'le panneau apparaît dans le rendu 3D')
    txt = pg.inner_text('#dsKumiko')
    check('1 panneau' in txt and '🟠' in txt and 'pas de liste de débit' in txt, 'tableau Kumiko : 1 panneau, statut aperçu 🟠')
    check(pg.query_selector('#dsKumiko svg') is not None and pg.eval_on_selector('#dsKumiko svg', 's => s.querySelectorAll("line").length') == 3 + 3 + 12,
          'plan du panneau : 3 côtés de cadre, 3 lattes, 12 tsukeko')
    check(any(v in txt for v in ['824,3', '955,7', '1053,7', '1102,6']), 'cotes du cadre = longueurs de montants de la référence')

    pg.mouse.click(cx, cy); pg.wait_for_timeout(1200)
    check(panels() == [], 'second clic au même endroit : panneau retiré')
    pg.select_option('#dsKmPattern', 'mitsukude'); pg.select_option('#dsKmDensity', '3')
    pg.mouse.click(cx, cy); pg.wait_for_timeout(1200)
    pg.mouse.click(cx + box['width'] * 0.12, cy - box['height'] * 0.12); pg.wait_for_timeout(1200)
    p2 = panels()
    check(len(p2) == 2 and all(x['pattern'] == 'mitsukude' and x['density'] == 3 for x in p2) and p2[0]['face'] != p2[1]['face'],
          'deux triangles différents : 2 panneaux mitsukude densité 3')
    pg.click('#dsKmPick'); pg.wait_for_timeout(300)

    # sauvegarde automatique, export puis réimport
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(panels() == p2, 'après rechargement : les 2 panneaux sont gardés')
    with pg.expect_download() as dl:
        pg.click('#dsExport')
    exported = json.load(open(dl.value.path()))
    check(exported.get('kumiko', {}).get('panels') == p2, 'export .json : panneaux Kumiko inclus')
    pg.evaluate("window.CoverDesign.state().kumiko = { panels: [] }")
    pg.set_input_files('#dsImport', dl.value.path()); pg.wait_for_timeout(1500)
    check(panels() == p2, 'réimport : panneaux identiques')

    # autre diamètre : mêmes triangles ; autre fréquence : panneaux signalés absents mais gardés
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    pg.eval_on_selector('#paramDiameter', 'e => { e.value = "6.20"; e.dispatchEvent(new Event("change")); }'); pg.wait_for_timeout(1200)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check('2 panneaux' in pg.inner_text('#dsKumiko') and 'absent' not in pg.inner_text('#dsKumiko'), 'Ø 6,20 m : les 2 panneaux suivent le dôme')
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    pg.select_option('#paramDetail', '2'); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    t2 = pg.inner_text('#dsKumiko')
    check(len(panels()) == 2 and ('absent de ce dôme' in t2 or '0 panneau' in t2 or '1 panneau' in t2), '2V : panneaux gardés, ceux sans triangle signalés « absent de ce dôme »')

    # tout retirer : confirmation en deux clics
    pg.click('#dsKmClear'); pg.wait_for_timeout(200)
    check(len(panels()) == 2, '« Tout retirer » : un premier clic ne retire rien')
    pg.click('#dsKmClear'); pg.wait_for_timeout(800)
    check(panels() == [], '« Tout retirer » confirmé : plus de panneau')

    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
