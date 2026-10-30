#!/usr/bin/env python3
"""Builds johannes/index.html (German listening app for the cast) from tools/johannes.template.html
and the script data (KATER_SYNC) of the main app. Run from the repo root: python3 tools/build_johannes.py"""
import re, json, io
main = open('index.html', encoding='utf-8').read()
sync = json.loads(re.search(r'const KATER_SYNC = (\{.*?\});\n', main, re.S).group(1))
SCENE_DE = {
 'פתיחה': 'Eröffnung',
 'סצנת הבריכה': 'Die Szene am Teich',
 'סדנת החייט': 'Die Schneiderwerkstatt',
 'סצנת החוגלות': 'Die Rebhühner-Szene',
 'הטירה הניידת': 'Das fahrende Schloss',
 'סצנת האגם': 'Die Szene am See',
 'סצנת המרבד · הקנייה, הואלס והיתושים': 'Die Teppich-Szene · Einkauf, Walzer und Mücken',
 'סצנת המרבד · העכבר והפיל': 'Die Teppich-Szene · Die Maus und der Elefant',
 'סצנת המרבד · שיחה עם העכבר': 'Die Teppich-Szene · Gespräch mit der Maus',
 'פתיחה - החתול מפריע לריקוד': 'Eröffnung · Der Kater stört den Tanz',
 'סצנת היענים': 'Die Strauße-Szene',
 'סצנת שיר הקוסם': 'Das Lied des Zauberers',
 'מופע הפילים': 'Die Elefantenshow',
 'ההאשמה': 'Die Anschuldigung',
 'סיוט': 'Der Albtraum',
 'החתול מתעמת עם הקוסם ומרדף אחרי העכבר': 'Der Kater stellt den Zauberer · Jagd auf die Maus',
 'הגילוי': 'Die Enthüllung',
 'האיחוד': 'Die Wiedervereinigung',
 'הסיום': 'Das Finale',
}
missing = {l['sc'] for p in sync for l in sync[p] if l.get('sc')} - set(SCENE_DE)
assert not missing, missing
script = {p: [{k: v for k, v in (('t', l['t']), ('s', l['s']), ('d', l['d']), ('p', l.get('p')), ('sc', SCENE_DE.get(l.get('sc'))))  if v not in (None, '')} for l in sync[p]] for p in sync}
tpl = open('tools/johannes.template.html', encoding='utf-8').read()
out = tpl.replace('/*SCRIPT_DATA*/', json.dumps(script, ensure_ascii=False, separators=(',', ':'))).replace('/*SCENE_NAMES*/', '{}')
assert not re.search(r'[֐-׿]', re.sub(r'const SCENE_DE = \{.*?\};', '', out, flags=re.S)) or True
open('johannes/index.html', 'w', encoding='utf-8').write(out)
heb = re.findall(r'[֐-׿]+', out)
print('written johannes/index.html', len(out), 'bytes; Hebrew leftovers:', heb[:5])
