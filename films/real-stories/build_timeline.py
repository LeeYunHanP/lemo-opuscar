"""lines_src.py + voice/dur.json -> timeline.json (all times for picture, captions and sound)"""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); os.chdir(HERE)
from lines_src import S
dur = json.load(open('voice/dur.json')); L = {l['id']: l for l in json.load(open('lines.json'))}
GAP, PARA, CARD, PRE = .85, 1.5, 4.6, 2.6
t = PRE; scenes = []; cards = []; prev = [None]
def scene(name, at):
    if scenes and scenes[-1][0] == name: return
    if scenes: scenes[-1][2] = round(at, 3)
    scenes.append([name, round(at, 3), None]); prev[0] = name
scene('causeway', 0)
V = []
for e in S:
    if e[0] == 'card':
        if not e[1]: continue
        t += .8; scene('card' + e[1], t); cards.append({'n': e[1], 'title': e[2], 't0': round(t, 3), 't1': round(t + CARD, 3)}); t += CARD + .7; continue
    if e[0] == 'pause': t += e[1]; continue
    if e[0] == 'para': t += PARA; continue
    i, sc = e[0], e[1]; d = dur[i]
    if sc != prev[0]: scene(sc, t - .4)
    V.append({'id': i, 't': round(t, 3), 'd': d, 'sub': L[i]['sub'], 'scene': sc})
    t += d + max(GAP, 1.85 - d)
byid = {v['id']: v for v in V}
freeze = round(V[-1]['t'] + V[-1]['d'] + 1.4, 3); DUR = round(freeze + 1.8, 3)
scenes[-1][2] = DUR
caps = []
for k, v in enumerate(V):
    t1 = max(v['t'] + v['d'] + .6, v['t'] + 1.8)
    if k + 1 < len(V): t1 = min(t1, V[k + 1]['t'] - .02)
    caps.append({'t0': v['t'], 't1': round(t1, 3), 'text': v['sub']})
s0 = round(byid['c3i']['t'] + byid['c3i']['d'] + .6, 3); s1 = round(byid['c3j']['t'] - .45, 3)
caps.append({'t0': s0, 't1': round(byid['c3j']['t'] - .02, 3), 'text': '[SILENCE]'}); caps.sort(key=lambda c: c['t0'])
for a, b in zip(caps, caps[1:]): a['t1'] = min(a['t1'], round(b['t0'] - .02, 3))
# the silence before the dive is its own black stretch of tape
for k, s in enumerate(scenes):
    if s[0] == 'shore': scenes.insert(k, ['silence', s0, s1]); scenes[k - 1][2] = s0; s[1] = s1; break
TL = {'dur': DUR, 'voice': V, 'caps': caps, 'scenes': scenes, 'cards': cards, 'tears': [s[1] for s in scenes[1:]],
      'title': [byid['i8']['t'] + .2, byid['i8']['t'] + 4.6], 'glimpse': [byid['o3']['t'] - .4, byid['o3']['t'] + byid['o3']['d'] + .3],
      'bat_blink': byid['o4']['t'], 'freeze': freeze, 'off': [freeze + .1, freeze + .5], 'silence': [s0, s1]}
TL.update({'gunfire': byid['c1g']['t'] + 1.3, 'vansign': byid['c1e']['t'] - .2, 'crowd': [byid['c2b']['t'], byid['c2c']['t'] + byid['c2c']['d']], 'bus': byid['c2b']['t'] + 1.6,
           'flag': byid['c4p']['t'] - .5, 'square_fill': [byid['c4n']['t'], byid['c4o']['t'] + 2]})
json.dump(TL, open('timeline.json', 'w'), indent=1)
print('DUR', DUR, '=', round(DUR / 60, 2), 'min;', len(scenes), 'scenes')
