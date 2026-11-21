"""The Swamp: no score. Tape sound per scene, tape events, voice-over -> out/mix.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, limit, compress, noise, lp, hp, bp, brown, norm, t_, env_exp, thump, step
from scipy.ndimage import maximum_filter1d, uniform_filter1d

rng = np.random.default_rng(21)
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['dur']; N = int(DUR * SR) + SR
bed = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32)
SC = {s[0]: (s[1], s[2]) for s in TL['scenes']}
def span(name): a, b = SC[name]; return a, b - a
def fade(x, a=.03, r=.03):
    n = len(x); e = np.ones(n); ka, kr = int(a * SR), int(r * SR)
    if ka: e[:ka] = np.linspace(0, 1, ka)
    if kr: e[-kr:] = np.linspace(1, 0, kr)
    return x * e
def hum(d, f=120, buzz=.15):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .5 * np.sin(4 * np.pi * f * tt) + .25 * np.sin(6 * np.pi * f * tt)
    return norm(x + buzz * bp(noise(d), 2500, 6000) + .05 * np.sin(2 * np.pi * 15600 * tt))
# camcorder motor under everything that records
add(bed, norm(bp(noise(DUR), 400, 1200)) * .2 + norm(lp(brown(DUR), 120)) * .3, 0, .02)
# 1 / 7: small-plane cabin drone, wind on the window
for nm in ('plane', 'dusk'):
    a, d = span(nm); tt = t_(d)
    eng = np.sin(2 * np.pi * 92 * tt) + .6 * np.sin(2 * np.pi * 184 * tt) + .3 * np.sin(2 * np.pi * 276 * tt) + .5 * lp(noise(d), 600)
    add(bed, fade(norm(lp(eng, 1500)) * (1 + .08 * np.sin(2 * np.pi * 2.3 * tt))), a, .16)
    add(bed, fade(norm(bp(noise(d), 1500, 5000))), a, .03)
# title generator beeps
for k in range(10): add(fx, np.sin(2 * np.pi * 2400 * t_(.03)) * env_exp(.03, .01), TL['title'][0] + k / 12, .05)
# 2: terminal: fluorescent hum, room tone, PA chime, jet roar through glass
a, d = span('terminal')
add(bed, fade(hum(d)), a, .025); add(bed, fade(norm(lp(brown(d), 300))), a, .1)
for k, f in enumerate([784, 659]):
    tt = t_(1.4); add(fx, norm(np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * env_exp(1.4, .5), TL['chime'] + k * .55, .05, -.3)
d2 = 19.6 - 10.0; tt = t_(d2)
roar = lp(noise(d2), 900) + .5 * bp(noise(d2), 2000, 4000) * np.clip((tt - 2.5) / 2, 0, 1)
env = np.clip(tt / 2.5, 0, 1) * np.clip(1 - (tt - 5) / 5, .15, 1)
add(bed, fade(norm(lp(roar, 1800)) * env), 10.0, .14, .2)
for t in (13.2, 15.0, 16.8):   # zoom servo
    tt = t_(.6); add(fx, norm(np.sin(2 * np.pi * (330 + 60 * tt) * tt) + .2 * noise(.6)) * np.sin(np.pi * tt / .6), t, .03)
for k in range(14): add(fx, hp(noise(.008), 3000) * env_exp(.008, .002), 13.0 + k * .34 + rng.random() * .1, .05)   # AF ticks
# 3: hangar: big-room hum, smoke-machine hiss, master-warning chime at 1 Hz
a, d = span('cockpit')
add(bed, fade(hum(d, buzz=.25)), a, .03)
add(bed, fade(norm(lp(brown(d), 200))), a, .08)
s0, s1 = TL['smoke']; tt = t_(s1 - s0)
add(bed, fade(norm(bp(noise(s1 - s0), 1200, 7000)) * np.clip(tt / 2, 0, 1)), s0, .05)
for k in range(int((26.8 - 20.2) / 1.0)):
    tt = t_(.45); c = np.sin(2 * np.pi * 1050 * tt) + .5 * np.sin(2 * np.pi * 1575 * tt)
    add(fx, norm(c) * env_exp(.45, .12), 20.2 + k * 1.0, .045, .1)
# silence: digital zero (applied to the whole mix below)
# 4: shore: wind over water, insects, a far dull thud, birds' wings
a, d = span('shore')
add(bed, fade(norm(lp(brown(d), 500))), a, .1); add(bed, fade(norm(bp(noise(d), 4500, 7000)) * (1 + .5 * np.sin(2 * np.pi * 27 * t_(d)))), a, .012, .4)
d0, d1 = TL['dive']; tt = t_(d1 - d0 + .3)
add(bed, fade(norm(bp(noise(d1 - d0 + .3), 500, 1400) * np.clip(tt / (d1 - d0), 0, 1)), .1, .05), d0, .03, -.3)   # far jet whine
th = lp(thump(1, 45), 200); add(fx, th, TL['thud'], .4); add(fx, lp(noise(1.5), 150) * env_exp(1.5, .4), TL['thud'], .12)
for k in range(16): tt = t_(.06); add(fx, bp(noise(.06), 300, 1500) * np.sin(np.pi * tt / .06), TL['birds'] + .1 + k * .09 + rng.random() * .05, .05, .2)
for t in (28.7, 30.4): tt = t_(.6); add(fx, norm(np.sin(2 * np.pi * (330 + 60 * tt) * tt) + .2 * noise(.6)) * np.sin(np.pi * tt / .6), t, .03)
# 5: search: airboat fan off, a distant helicopter, water lapping, grass on the hull
a, d = span('search'); tt = t_(d)
fan = np.sin(2 * np.pi * 70 * tt) + .5 * lp(noise(d), 400)
add(bed, fade(norm(lp(fan, 700)) * (1 - .6 * np.clip((tt - 7.6) / 1.5, 0, 1))), a, .1)
heli = lp(noise(d), 300) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 5.5 * tt))) * .7
add(bed, fade(norm(heli)), a, .04, .5)
add(bed, fade(norm(bp(noise(d), 300, 1500) * (1 + .6 * np.sin(2 * np.pi * .7 * tt)))), a, .04)
for k in range(30): add(fx, norm(bp(noise(.25), 2000, 6000)) * np.sin(np.pi * t_(.25) / .25), a + rng.random() * 7.4, .03, rng.uniform(-.8, .8))
# 6: notice: office room tone, fluorescent hum, paper flutter
a, d = span('notice')
add(bed, fade(hum(d, f=120, buzz=.1)), a, .02); add(bed, fade(norm(lp(brown(d), 250))), a, .06)
add(fx, norm(bp(noise(.5), 800, 5000)) * np.sin(np.pi * t_(.5) / .5), a + .6, .05)
# 7 end: battery beeps, tape stop
for k in range(3): add(fx, np.sin(2 * np.pi * 3100 * t_(.09)), TL['bat_blink'] + .3 + k * .5, .04)
# tape events: tracking noise + clack on every splice
for tr in TL['tears']:
    d = .45; tt = t_(d)
    add(fx, norm(bp(noise(d), 800, 7000) * (1 + .8 * np.sin(2 * np.pi * 60 * tt))) * np.sin(np.pi * tt / d), tr - .15, .09)
    add(fx, norm(hp(noise(.02), 1500)) * env_exp(.02, .004), tr, .2)
o0, o1 = TL['off']; add(fx, norm(hp(noise(.03), 1000)) * env_exp(.03, .006), o0, .25)

# voice-over
vo = np.zeros((N, 2), np.float32)
for v in TL['voice']:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav'), dtype='float32')
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    add(vo, x, v['t'], 1.0)
vm = compress(vo[:, 0], thr=.18, ratio=3.0); vo = np.stack([vm, vm], 1)
def rms(x): return float(np.sqrt(np.mean(x[np.abs(x).sum(1) > 1e-4] ** 2)))
vo *= .3 / rms(vo)
act = uniform_filter1d(maximum_filter1d((np.abs(vo[:, 0]) > .02).astype(np.float32), int(.25 * SR)), int(.2 * SR))
duck = 1 - act * (1 - 10 ** (-8 / 20))
bed *= .3 / 10 ** (12 / 20) / max(rms(bed), 1e-6)
mix = vo + bed * duck[:, None] + fx * 1.1
# the silence: digital zero, then the shore's sound returns
a, b = SC['silence']; mix[int((a + .12) * SR):int(b * SR)] = 0
mix[int(TL['off'][1] * SR):] = 0
mix = mix[:int(DUR * SR)]
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix', len(mix) / SR)
