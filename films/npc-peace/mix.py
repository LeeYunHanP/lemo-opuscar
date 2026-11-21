"""Last Days of Peace: score + foley from timeline.json -> out/mix.wav (12 s, wrapped so the loop is seamless)"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, limit, noise, lp, hp, bp, brown, norm, t_, env_exp, step, thump, whoosh, pop

rng = np.random.default_rng(5)
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['dur']; EXT = 2.0; N = int((DUR + EXT) * SR)
def buf(): return np.zeros((N, 2), np.float32)
B, E8, E16 = .5, .25, .125
S.seed(9)
ev = []
# ---- peace (0-5): C major, marimba tune, pizz bass, shaker, glockenspiel sparkle
tune = ['C5', 'E5', 'G5', 'E5', 'A5', 'G5', 'E5', 'G5', 'F5', 'A5', 'C6', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'E5', 'G5', 'C6']
for i, p in enumerate(tune):
    ev.append((i * E8, 'marimba', p, .35, .62 + .12 * (i % 4 == 0), .15))
bass = ['C2', 'G2', 'C2', 'G2', 'F2', 'C3', 'G2', 'D2', 'C2', 'G2']
for i, p in enumerate(bass): ev.append((i * B, 'contrabass_pizz', p, .45, .62, -.1))
for i in range(20): ev.append((i * E8, 'shaker', 'down' if i % 2 == 0 else 'up', None, .28 + .12 * (i % 2 == 0), .35))
for t, p in [(0, 'C6'), (2.0, 'F6'), (3.0, 'G6'), (4.0, 'E6')]: ev.append((t, 'glockenspiel', p, 1.0, .4, .4))
for t, ch in [(0, ['C4', 'E4', 'G4']), (2.0, ['F3', 'A3', 'C4']), (3.0, ['G3', 'B3', 'D4']), (4.0, ['C4', 'E4', 'G4'])]:
    for p in ch: ev.append((t, 'vibraphone', p, .9, .3, -.3))
# ---- card (5-6): silence, one soft low hit
ev.append((5.0, 'gran_cassa', 'hit', None, .55, 0))
# ---- chaos (6-10.6): C minor, double time
ev.append((6.0, 'clash', 'crash', None, .55, 0))
ctune = ['C5', 'Eb5', 'G5', 'Eb5', 'Ab5', 'G5', 'Eb5', 'G5', 'F5', 'Ab5', 'C6', 'Ab5', 'G5', 'F5', 'Eb5', 'D5']
for i in range(int(4.6 / E16)):
    ev.append((6.0 + i * E16, 'xylophone', ctune[i % 16], .2, .55 + .15 * (i % 4 == 0), .2 - .4 * (i % 2)))
cb = ['C2', 'C2', 'Eb2', 'C2', 'G2', 'C2', 'Ab2', 'G2']
for i in range(int(4.6 / E8)): ev.append((6.0 + i * E8, 'contrabass_pizz', cb[i % 8], .22, .7, -.1))
for i in range(int(4.6 / E8)): ev.append((6.0 + i * E8, 'toms', 'high' if i % 2 else 'low', None, .5 + .2 * (i % 4 == 0), .1))
for t in np.arange(6.0, 10.6, 1.0): ev.append((t, 'snare2', 'on', None, .5, 0))
for k in range(12): ev.append((TL['fire'] + k * .03, 'harp', ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'B4', 'C5', 'D5', 'Eb5', 'G5', 'C6'][k], .8, .55, .3))
for t in (8.0, 9.0): ev.append((t, 'clash', 'short', None, .4, 0))
# ---- last panel (10.6-12): marimba alone, the bites on kalimba, pickup into bar 1
for i, p in enumerate(['C5', 'E5', 'G5']): ev.append((10.6 + i * B, 'marimba', p, .4, .5, 0))
for t, p in zip(TL['bites'], ['E4', 'G4', 'C5']): ev.append((t, 'kalimba', p, .6, .6, -.2))
for t, p in [(11.5, 'G4'), (11.75, 'B4')]: ev.append((t, 'marimba', p, .3, .58, .15))
for t, p in [(10.6, 'C2'), (11.1, 'G2'), (11.6, 'G2')]: ev.append((t, 'contrabass_pizz', p, .45, .55, -.1))
mus = S.render(ev, dur=N / SR)
mus = S.room(mus, size=.3, mix=.12)
# the card is silent apart from its one hit: cut the tails of bar 3 at 5.0
c0 = int(5.0 * SR); mus[c0 - 240:c0] *= np.linspace(1, 0, 240)[:, None]
hit = S.render([(0, 'gran_cassa', 'hit', None, .55, 0)], dur=1.0)
mus[c0:int(6.0 * SR)] = 0; mus[c0:c0 + len(hit)] += hit[:int(6.0 * SR) - c0]

# ---- foley
fx = buf()
def env_io(d, a, r): tt = t_(d); return np.minimum(1, tt / max(a, 1e-3)) * np.minimum(1, (d - tt) / max(r, 1e-3))
surf = lp(noise(DUR + EXT), 900) * (.6 + .4 * np.sin(2 * np.pi * t_(DUR + EXT) / 4) ** 2)
s = norm(surf); s[int(5.0 * SR):int(6.0 * SR)] = 0
add(fx, s, 0, .05)
for i in range(16): add(fx, step(.6), .2 + i * .3, .05, -.4)                       # strolling steps
for t in (1.0, 2.6, 4.1): add(fx, pop(.7), t, .08, .1)                              # scoops
for t in (1.4, 3.6):                                                               # gull-ish chirps
    d = .22; tt = t_(d); f = 2200 - 900 * tt / d
    add(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d), t, .03, .5)
F = TL['flip']
for k, t in enumerate([F['walker'], F['seller'], F['waver']]): add(fx, pop(1), t, .14, -.5 + .5 * k)   # ripple blips
add(fx, whoosh(.5, 1), TL['fire'] - .1, .35, .2)
d = DUR - TL['fire']; tt = t_(d)
crk = hp(noise(d), 2500) * (rng.random(len(tt)) > .996) * 4
fire = norm(lp(brown(d), 500) + lp(crk, 7000) * .5) * np.minimum(1, tt / .4)
add(fx, fire, TL['fire'], .12, .2)
for i in range(70): add(fx, step(1), 6.0 + i * .062 + rng.random() * .02, .07, rng.uniform(-.7, .7))   # running feet
def scream(d, f0):
    tt = t_(d); f = f0 * (1 + .18 * np.sin(np.pi * tt / d)) * (1 + .03 * np.sin(2 * np.pi * 7 * tt))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    v = bp(saw, 750, 1250) + .7 * bp(saw, 1900, 2700) + .3 * bp(saw, 3000, 3800)
    return norm(v) * np.sin(np.pi * tt / d) ** .6
for t, f0, pan in [(6.25, 520, -.5), (6.55, 600, .3), (6.85, 470, .6), (7.35, 640, -.6), (7.95, 560, .5), (8.45, 610, .2), (8.95, 500, -.4), (9.55, 580, .4), (10.05, 540, -.5)]:
    add(fx, scream(.75, f0), t, .07, pan)
add(fx, thump(.7, 180), TL['cone_fly'][1], .12, 0)                                 # cone lands
for t in TL['bites']:
    d = .12; tt = t_(d)
    add(fx, norm(bp(noise(d), 1200, 5000) * (rng.random(len(tt)) > .7)) * env_exp(d, .03), t, .25, -.2)   # crunch
mix = mus * .9 + fx
# wrap: what rings past 12 s continues at the start, so the loop has no seam
n = int(DUR * SR); tail = mix[n:]; mix = mix[:n].copy(); mix[:len(tail)] += tail
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix', len(mix) / SR)
