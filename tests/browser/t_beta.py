# Non-régression Nomad'Om Designer Beta : python3 t_beta.py <app.html> <dossier_sortie>
import sys, json, os, time
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1]); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
REF = {'3V': {'detail': '3', 'method': 'Kruschke', 'D': '5.00', 'stats': 'sommets 61 · arêtes 165 · faces 105 · bord 15',
              'struts': ['824.27', '955.73', '1053.72', '1102.64'], 'counts': ['30', '35', '80', '20']},
       '2V': {'detail': '2', 'method': 'Chords', 'D': '5.30', 'stats': 'sommets 26 · arêtes 65 · faces 40 · bord 10',
              'struts': ['1448.31', '1637.79'], 'counts': ['30', '35']}}
res = {'checks': []}
def ok(name, cond, info=''): res['checks'].append({'test': name, 'ok': bool(cond), 'info': info})
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1100}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    T = lambda s: pg.inner_text(s) if pg.query_selector(s) else ''
    ok('titre', pg.title() == "Nomad'Om Designer Beta", pg.title())
    for k, r in REF.items():
        pg.click('#tabBase'); pg.wait_for_timeout(300)
        pg.select_option('#paramDetail', r['detail']); pg.wait_for_timeout(400)
        meths = pg.eval_on_selector_all('#paramMethod option', 'o=>o.map(x=>x.value)')
        if r['method'] in meths: pg.select_option('#paramMethod', r['method'])
        pg.wait_for_timeout(300)
        parts = pg.eval_on_selector_all('#paramPartial option', 'o=>o.map(x=>x.value+"|"+x.textContent)')
        res[k + '_partials'] = parts
        pg.fill('#paramDiameter', r['D']); pg.click('#btnRegenerate'); pg.wait_for_timeout(1200)
        st = T('#statPoints') + '/' + T('#statLines') + '/' + T('#statFaces') + '/' + T('#statSelvage')
        struts = T('#baseStruts'); res[k + '_struts'] = struts[:800]; res[k + '_partial'] = pg.input_value('#paramPartial')
        ok(k + ' topologie', st == '/'.join(x.split(' ')[-1] for x in r['stats'].split(' · ')), st)
        ok(k + ' longueurs', all(s in struts for s in r['struts']), struts[:300])
        pg.click('#tabCover'); pg.wait_for_timeout(600)
        for bid in ['modeTriangle', 'btnDevelopEtages', 'btnRoll', 'btnFlat']:
            n0 = len(errs); pg.click('#' + bid); pg.wait_for_timeout(900)
            info = T('#dev2dInfo'); res[k + '_' + bid] = info
            ok(k + ' ' + bid, len(errs) == n0 and info.strip() not in ('', '\xa0'), info)
        pg.screenshot(path=f'{OUT}/{k}_cover.png')
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    ok('Design ouvre sans erreur', not errs, '; '.join(errs[-3:]))
    res['design_kpis'] = T('#dsList')[:400]
    pg.screenshot(path=f'{OUT}/design.png')
    res['errors'] = errs; b.close()
json.dump(res, open(f'{OUT}/beta.json', 'w'), ensure_ascii=False, indent=1)
for c in res['checks']: print(('OK  ' if c['ok'] else 'ÉCHEC ') + c['test'] + ('' if c['ok'] else '  → ' + c['info']))
