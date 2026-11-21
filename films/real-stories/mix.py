"""The Real Stories Behind GTA 6 (long form): no score. Each tape's own sound, tape events, voice-over -> out/mix.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, limit, compress, noise, lp, hp, bp, brown, norm, t_, env_exp, thump, step, crash, whoosh
from scipy.ndimage import maximum_filter1d, uniform_filter1d

rng = np.random.default_rng(31)
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['dur']; N = int(DUR * SR) + SR
bed = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32)
def fade(x, a=.05, r=.05):
    n = len(x); e = np.ones(n); ka, kr = min(n // 2, int(a * SR)), min(n // 2, int(r * SR))
    if ka: e[:ka] = np.linspace(0, 1, ka)
    if kr: e[-kr:] = np.linspace(1, 0, kr)
    return x * e
def hum(d, f=120, buzz=.15):
    tt = t_(d); x = np.sin(2 * np.pi * f * tt) + .5 * np.sin(4 * np.pi * f * tt) + .25 * np.sin(6 * np.pi * f * tt)
    return norm(x + buzz * bp(noise(d), 2500, 6000))
def swell(d, period, lo=.5): tt = t_(d); return lo + (1 - lo) * np.sin(np.pi * tt / period) ** 2
def engine(d, f0, cut=1200):
    tt = t_(d); x = np.sin(2 * np.pi * f0 * tt) + .6 * np.sin(4 * np.pi * f0 * tt) + .3 * np.sin(6 * np.pi * f0 * tt) + .5 * lp(noise(d), 500)
    return norm(lp(x, cut))
def surf(d): return norm(lp(noise(d), 800) * swell(d, 5.5))
def wind(d): return norm(lp(brown(d), 500))
def room(d): return norm(lp(brown(d), 250))
def crowd(d, n=4): tt = t_(d); return norm(sum(bp(noise(d), f * .7, f * 1.4) * (1 + .5 * np.sin(2 * np.pi * (.3 + k * .17) * tt + k)) for k, f in enumerate([300, 520, 800, 1300][:n])))
def insects(d): return norm(bp(noise(d), 4200, 6800) * (1 + .8 * np.sin(2 * np.pi * 29 * t_(d))))
def traffic(d): return norm(lp(noise(d), 700) * swell(d, 3.7, .6))
def siren(d, lvl=1):
    tt = t_(d); f = 900 + 380 * np.sin(2 * np.pi * tt / 3.6); return norm(lp(np.sin(2 * np.pi * np.cumsum(f) / SR), 1800)) * lvl
def prop(d): tt = t_(d); return norm(engine(d, 92, 1500) * (1 + .08 * np.sin(2 * np.pi * 2.3 * tt)))

# each scene: list of (generator, gain, pan)
AMB = {
  'causeway': [(lambda d: engine(d, 38, 600), .14, 0), (lambda d: norm(bp(noise(d), 300, 1500)), .05, 0)],
  'neonnight': [(traffic, .06, -.3), (lambda d: hum(d, 120, .3), .02, .3)],
  'harbor': [(surf, .08, 0), (wind, .05, 0)], 'dock': [(surf, .08, 0), (crowd, .03, 0)],
  'highway': [(lambda d: engine(d, 42, 700), .12, 0), (wind, .1, 0)], 'jam': [(lambda d: engine(d, 30, 400), .08, 0), (traffic, .05, 0)],
  'mall': [(wind, .06, 0), (traffic, .04, 0), (insects, .012, .4)], 'van': [(wind, .06, 0), (traffic, .04, 0)], 'shopfar': [(wind, .06, 0), (crowd, .02, 0)],
  'vanaway': [(wind, .06, 0)], 'vanparked': [(wind, .05, 0), (insects, .015, .3)], 'newsstand': [(traffic, .06, 0)], 'truck': [(lambda d: hum(d, 60, .4), .03, .3), (room, .05, 0)],
  'magazine': [(room, .05, 0)], 'embassy': [(crowd, .05, 0), (wind, .04, 0)], 'boat': [(surf, .12, 0), (lambda d: engine(d, 55, 600), .08, 0), (wind, .08, 0)],
  'tents': [(crowd, .03, 0), (traffic, .05, 0)], 'riots': [(lambda d: siren(d), .03, -.5), (wind, .05, 0)], 'marquee': [(traffic, .04, 0), (crowd, .03, 0)],
  'street': [(traffic, .05, 0), (crowd, .03, 0)], 'plane': [(prop, .14, 0)], 'swampdusk': [(prop, .12, 0)],
  'terminal': [(lambda d: hum(d), .025, 0), (room, .08, 0)], 'terminaldusk': [(lambda d: hum(d), .025, 0), (room, .08, 0)],
  'cockpit': [(lambda d: hum(d, 120, .25), .03, 0), (room, .07, 0)], 'shore': [(wind, .09, 0), (insects, .012, .4)],
  'search': [(lambda d: engine(d, 70, 700), .1, 0), (lambda d: norm(lp(noise(d), 300) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 5.5 * t_(d))))), .04, .5)],
  'sheen': [(lambda d: norm(bp(noise(d), 300, 1500) * swell(d, 1.4)), .05, 0), (insects, .012, .3)], 'recovery': [(wind, .08, 0), (lambda d: norm(lp(noise(d), 300) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 5.5 * t_(d))))), .05, .5)],
  'notice': [(lambda d: hum(d, 120, .1), .02, 0), (room, .06, 0)], 'tv': [(lambda d: norm(bp(noise(d), 1500, 9000)), .006, 0), (room, .05, 0), (lambda d: np.sin(2 * np.pi * 15734 * t_(d)), .004, 0)],
  'square': [(crowd, .06, 0), (surf, .04, 0)], 'sunset': [(surf, .08, 0), (wind, .05, 0)],
  'glimpse': [(wind, .05, 0)],
}
AMB['causeway2'] = AMB['causeway3'] = AMB['causeway']
for name, a, b in TL['scenes']:
    d = b - a
    if name.startswith('card'):
        add(bed, fade(norm(bp(noise(d), 1500, 7000)), .02, .02), a, .008); continue
    if name == 'silence': continue
    for gen, g, pan in AMB.get(name, []): add(bed, fade(gen(d)), a, g, pan)
# camcorder motor under every recording
add(bed, norm(bp(noise(DUR), 400, 1200)) * .25, 0, .015)

# events
g0 = TL['gunfire']
for k in range(14):   # far, flat gunfire across the lot
    s = norm(lp(hp(noise(.3), 300) * env_exp(.3, .02), 2500)); add(fx, s, g0 + k * .09 + rng.random() * .03, .12, .1)
for k in range(6): add(fx, norm(bp(noise(.4), 2000, 6000)) * env_exp(.4, .08), g0 + .2 + rng.random() * .6, .03, -.2)   # distant glass
v = TL['voice']; byid = {x['id']: x for x in v}
add(fx, engine(3.0, 48, 900) * np.linspace(.2, 1, int(3 * SR)), byid['c1d']['t'] - .4, .12, .4)   # van pulls in
add(fx, engine(3.2, 60, 900) * np.linspace(1, .1, int(3.2 * SR)), byid['c1j']['t'], .12, -.3)       # van pulls away
for k in range(3): add(fx, norm(bp(noise(.6), 2000, 3500)) * env_exp(.6, .2), byid['c1k']['t'] + 1 + k * 2.5, .015, .4)   # radio chirps
add(fx, crash(.6), TL['bus'], .2, 0)                                                                      # the bus through the gate
d = 4; add(fx, siren(d) * np.sin(np.pi * t_(d) / d), byid['c2k']['t'], .025, -.4)
# cockpit: master-warning chime at 1 Hz
ca = [s for s in TL['scenes'] if s[0] == 'cockpit'][0]
for k in range(int(ca[2] - ca[1] - .6)):
    tt = t_(.45); add(fx, norm(np.sin(2 * np.pi * 1050 * tt) + .5 * np.sin(2 * np.pi * 1575 * tt)) * env_exp(.45, .12), ca[1] + .6 + k, .04, .1)
# shore: the far, dull thud
sh = [s for s in TL['scenes'] if s[0] == 'shore'][0]
add(fx, lp(thump(1, 45), 200), sh[1] + 2.4, .4); add(fx, lp(noise(1.5), 150) * env_exp(1.5, .4), sh[1] + 2.4, .12)
# terminal: PA chime, jet roar through glass
te = [s for s in TL['scenes'] if s[0] == 'terminal'][0]
for k, f in enumerate([784, 659]): tt = t_(1.4); add(fx, norm(np.sin(2 * np.pi * f * tt)) * env_exp(1.4, .5), te[1] + .7 + k * .55, .04, -.3)
d = te[2] - te[1] - 1; tt = t_(d); add(bed, fade(norm(lp(noise(d) + .5 * bp(noise(d), 2000, 4000), 1800)) * np.clip(tt / 2.5, 0, 1)), te[1] + 1, .1, .2)
# tape events: power-on, tracking noise + clack at every splice, battery beeps, power-off
add(fx, norm(hp(noise(.03), 1500)) * env_exp(.03, .006), .05, .2)
for tr in TL['tears'] + [TL['glimpse'][0] + k * (TL['glimpse'][1] - TL['glimpse'][0]) / 4 for k in (1, 2, 3)]:
    d = .45; tt = t_(d)
    add(fx, norm(bp(noise(d), 800, 7000) * (1 + .8 * np.sin(2 * np.pi * 60 * tt))) * np.sin(np.pi * tt / d), tr - .15, .07)
    add(fx, norm(hp(noise(.02), 1500)) * env_exp(.02, .004), tr, .16)
for k in range(3): add(fx, np.sin(2 * np.pi * 3100 * t_(.09)), TL['bat_blink'] + .5 + k * .6, .035)
add(fx, norm(hp(noise(.03), 1000)) * env_exp(.03, .006), TL['off'][0], .22)

# voice-over
vo = np.zeros((N, 2), np.float32)
for x in v:
    w, sr = sf.read(os.path.join(HERE, 'voice', x['id'] + '.wav'), dtype='float32')
    if sr != SR:
        import soxr; w = soxr.resample(w, sr, SR)
    add(vo, w, x['t'], 1.0)
vm = compress(vo[:, 0], thr=.18, ratio=3.0); vo = np.stack([vm, vm], 1)
def rms(x): return float(np.sqrt(np.mean(x[np.abs(x).sum(1) > 1e-4] ** 2)))
vo *= .3 / rms(vo)
act = uniform_filter1d(maximum_filter1d((np.abs(vo[:, 0]) > .02).astype(np.float32), int(.25 * SR)), int(.2 * SR))
duck = 1 - act * (1 - 10 ** (-9 / 20)); fxduck = 1 - act * (1 - 10 ** (-8 / 20))
bed *= .3 / 10 ** (13 / 20) / max(rms(bed), 1e-6)
mix = vo + bed * duck[:, None] + fx * 1.1 * fxduck[:, None]
s0, s1 = TL['silence']; mix[int((s0 + .15) * SR):int(s1 * SR)] = 0
mix[int(TL['off'][1] * SR):] = 0
mix = mix[:int(DUR * SR)]
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix', len(mix) / SR)
