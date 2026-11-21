"""Broad Daylight: score, sound design and voice, all placed from timeline.json -> out/mix.wav"""
import os, sys, json
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, limit, compress, noise, lp, hp, bp, brown, norm, t_, env_exp, step, thump, crash, whoosh, creak, ding, clack

rng = np.random.default_rng(11)
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['dur']; N = int(DUR * SR) + SR
def buf(): return np.zeros((N, 2), np.float32)
def seg(t, a, b): return np.clip((t - a) / (b - a), 0, 1)
TT = np.arange(N) / SR

# ---------------- score (80 BPM, D minor) ----------------
S.seed(3)
B = .75
ev = []
# A · heat: cello pedal, slow harp, a high violin line
ev.append(dict(t=0.0, inst='cellos', pitch='D2', dur=12.6, vel=.42, pan=-.1, attack=1.5))
ev.append(dict(t=1.6, inst='violins', pitch='A5', dur=10.5, vel=.22, pan=.3, attack=2.5))
arp = ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3']
for i in range(16):
    ev.append((1.5 + i * B, 'harp', arp[i % 8], 1.4, .38 + .08 * (i % 4 == 0), -.3 + .6 * (i % 2)))
# B · approach: bass pizz pulse, cello stepping down, tremolo rising
for i in range(int((24.1 - 12.9) / B)):
    t = 12.9 + i * B
    ev.append((t, 'contrabass_pizz', 'D2' if i % 4 != 3 else 'A1', .7, .55 + .1 * (i % 4 == 0), 0))
for k, p in enumerate(['D3', 'C3', 'A#2', 'A2']):
    ev.append(dict(t=12.9 + k * 3, inst='cellos', pitch=p, dur=3.1 if k < 3 else 2.2, vel=.48 + k * .05, pan=-.15, attack=.3))
for i in range(8):
    ev.append((13.2 + i * 1.5, 'harp', ['A4', 'F4', 'E4', 'D4'][i % 4], 1.2, .3, .35))
ev.append(dict(t=20.7, inst='violins_trem', pitch='A4', dur=3.4, vel=.35, pan=.25, attack=2.0))
ev.append(dict(t=22.2, inst='violins_trem', pitch='A#4', dur=1.9, vel=.42, pan=-.25, attack=1.0))
# C · aftermath: one low cello swelling and fading
ev.append(dict(t=30.6, inst='cellos', pitch='D3', dur=5.4, vel=.38, pan=0, attack=2.2))
ev.append(dict(t=32.4, inst='contrabass', pitch='D2', dur=3.8, vel=.3, pan=0, attack=1.5))
# D · headline: timpani on bars, pizz pulse, rising tremolo, glockenspiel on the name
for k in range(4):
    ev.append((36.6 + k * 3, 'timpani', 'A2' if k % 2 else 'D3', 1.5, .45 + k * .08, 0))
for i in range(int((48.2 - 36.6) / B)):
    ev.append((36.6 + i * B, 'contrabass_pizz', ['D2', 'D2', 'F2', 'A1'][i % 4], .6, .5, 0))
for k, p in enumerate(['D4', 'F4', 'A4']):
    ev.append(dict(t=38.0 + k * 3, inst='violins_trem', pitch=p, dur=3.2 if k < 2 else 3.4, vel=.3 + k * .08, pan=.2, attack=1.2))
ev.append(dict(t=38.0, inst='cellos', pitch='D3', dur=10.0, vel=.42, pan=-.2, attack=1.5))
ev.append((TL['cocaine'], 'glockenspiel', 'D6', 2.0, .6, -.2))
ev.append((TL['cowboys'], 'glockenspiel', 'F6', 2.5, .65, .2))
ev.append((TL['cowboys'] + .02, 'timpani', 'D3', 2.0, .7, 0))
# E · neon: bowed vibraphone chords, soft mallet sparkles on each neon, last cello note dies with the light
for t0, ch in [(48.2, ['D4', 'F4', 'A4']), (51.2, ['A#3', 'D4', 'F4']), (54.2, ['D4', 'F4', 'A4'])]:
    for j, p in enumerate(ch): ev.append(dict(t=t0, inst='vibraphone_bowed', pitch=p, dur=3.1 if t0 < 54 else 2.2, vel=.42, pan=-.4 + .4 * j, attack=.6))
ev.append(dict(t=48.2, inst='cellos', pitch='D2', dur=7.4, vel=.4, pan=0, attack=.8))
spark = ['A4', 'D5', 'F5', 'A5', 'D5', 'F5', 'C5', 'A4', 'D5']
for i in range(9):
    ev.append((48.5 + i * .22, 'vibraphone', spark[i], 1.5, .35, -.5 + i / 8))
ev.append(dict(t=55.6, inst='vibraphone', pitch='D4', dur=1.6, vel=.4, pan=0))
mus = S.render(ev, dur=N / SR)
mus = S.room(mus, size=.55, mix=.22)
# hard silence before the gunfire; music stays out through the attack
g = np.ones(N); g[int(24.08 * SR):int(30.6 * SR)] = 0
g[int(24.0 * SR):int(24.08 * SR)] = np.linspace(1, 0, int(.08 * SR))
mus *= g[:, None]

# ---------------- sound design ----------------
amb = buf(); fx = buf()
def bed(d, lo, hi, mod=.3, rate=.2):
    x = bp(noise(d), lo, hi); m = 1 + mod * np.sin(2 * np.pi * rate * t_(d) + rng.random() * 6)
    return norm(x * m)
def env_in_out(d, a, r):
    tt = t_(d); return np.minimum(1, tt / max(a, 1e-3)) * np.minimum(1, (d - tt) / max(r, 1e-3))
# heat: wind, distant traffic, insect hiss
d = 12.9
add(amb, norm(lp(brown(d), 500)) * env_in_out(d, 1, .3), 0, .12)
add(amb, bed(d, 4200, 6800, .8, 31) * env_in_out(d, 1.5, .3), 0, .025, .3)
add(amb, norm(lp(brown(d), 180)) * env_in_out(d, 1, .3), 0, .1)
# mall frontage: crowd murmur, footsteps (12.9 .. 24.1)
d = 24.1 - 12.9
walla = sum(bp(noise(d), f * .7, f * 1.4) * (1 + .5 * np.sin(2 * np.pi * (.3 + k * .17) * t_(d) + k)) for k, f in enumerate([300, 520, 800, 1300]))
add(amb, norm(walla) * env_in_out(d, .3, .05), 12.9, .05)
for i in range(60):
    add(fx, step(.5 + rng.random() * .3), 12.9 + rng.random() * (24.0 - 12.9), .07, rng.uniform(-.6, .6))
# neon sign hum while it lives
d = TL['sign_die'][0] - 12.9
hum = np.sin(2 * np.pi * 120 * t_(d)) * .6 + np.sin(2 * np.pi * 240 * t_(d)) * .3 + bp(noise(d), 2000, 5000) * .05
add(fx, norm(hum) * env_in_out(d, .2, .02), 12.9, .025, .25)
# the van: approach, brake squeal, spring creak, idle, doors
vi0, vi1 = TL['van_in']; d = vi1 - vi0 + .4
tt = t_(d); f0 = 48 * (1 - .15 * np.clip(tt / (vi1 - vi0), 0, 1))
eng = np.sin(2 * np.pi * np.cumsum(f0) / SR) + .5 * np.sin(4 * np.pi * np.cumsum(f0) / SR) + .3 * lp(noise(d), 300)
add(fx, norm(lp(eng, 900)) * np.minimum(1, tt / .8) * np.exp(-np.maximum(0, tt - (vi1 - vi0)) * 3), vi0 - .4, .3, .5)
d = .55; tt = t_(d)
sq = np.sin(2 * np.pi * np.cumsum(2700 + 120 * np.sin(2 * np.pi * 13 * tt)) / SR) * np.sin(np.pi * tt / d) ** 1.5
add(fx, sq, vi1 - .45, .06, .4)
add(fx, creak(.8), vi1 + .02, .12, .4)
d = 34.2 - (vi1 + .2); tt = t_(d)
idle = np.sin(2 * np.pi * 34 * tt) + .4 * np.sin(2 * np.pi * 68 * tt) + .3 * lp(noise(d), 200)
add(fx, norm(lp(idle, 400)) * env_in_out(d, .3, .1), vi1 + .2, .08, .45)
for t in (TL['men_walk'][0] - .05, TL['men_walk'][0] + .25):
    add(fx, thump(.9, 85) * .8 + np.pad(clack(.6, .5), (0, len(thump()) - len(clack())))[:len(thump())], t, .32, .5)
for k in (0, 1):
    for i in range(7):
        add(fx, step(.8), TL['men_walk'][0] + .3 + k * .35 + i * .34, .16, .35 - i * .08)
add(fx, ding(1.0) * env_exp(1.6, .5), TL['door_close'], .05, .05)
# gunfire: muffled behind the glass until it breaks, then raw
def shot(raw):
    d = .7; tt = t_(d)
    crack = hp(noise(d), 900) * env_exp(d, .012)
    body = np.sin(2 * np.pi * 105 * tt * (1 - .4 * tt)) * env_exp(d, .045)
    tail = lp(noise(d), 2500) * env_exp(d, .14) * .35
    x = norm(crack + body * .9 + tail)
    return x if raw else norm(lp(x, 1600)) * .8
for t in TL['gun']:
    add(fx, shot(t > TL['glass']), t, .85 * (.85 + .3 * rng.random()), rng.uniform(-.25, .1))
add(fx, crash(1.0), TL['glass'], .7, -.1)
for i in range(40):
    d = .25; tt = t_(d); f = rng.uniform(3000, 8000)
    add(fx, np.sin(2 * np.pi * f * tt) * env_exp(d, .03 + rng.random() * .05), TL['glass'] + .05 + rng.random() * 1.4, .05 + .05 * rng.random(), rng.uniform(-.7, .7))
# the sign shorts out: crackle
a0, a1 = TL['sign_die']
for i in range(14):
    add(fx, hp(noise(.03), 2500) * env_exp(.03, .006), a0 + rng.random() * (a1 - a0), .25, .3)
# panic: crowd rising, distant shouts (formant-filtered glides), running feet
d = 30.6 - 24.6; tt = t_(d)
panic = sum(bp(noise(d), f * .7, f * 1.3) * (1 + .7 * np.sin(2 * np.pi * (1.1 + k * .4) * tt + k)) for k, f in enumerate([450, 900, 1600]))
add(amb, norm(panic) * np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .8), 24.6, .14)
for i in range(7):
    d = .9; tt = t_(d); f = rng.uniform(380, 620) * (1 + .35 * np.sin(np.pi * tt / d))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    v = bp(saw, 700, 1300) + .6 * bp(saw, 2200, 3000)
    add(amb, norm(lp(v, 3000)) * np.sin(np.pi * tt / d) ** 2, 25.0 + i * .72 + rng.random() * .3, .04, rng.uniform(-.8, .8))
for i in range(40):
    add(fx, step(1), 27.4 + i * .08 + rng.random() * .03, .1, rng.uniform(-.6, .6))
add(fx, whoosh(.32, 1), TL['whip'] - .2, .35, .6)
add(fx, thump(.6, 120), 27.95, .15, .1)
# aftermath: low wind; a distant siren J-cuts in under the grey wide
d = 36.6 - 30.0; tt = t_(d)
add(amb, norm(lp(brown(d), 300)) * env_in_out(d, 1, .6), 30.0, .1)
sf_ = 900 + 380 * np.sin(2 * np.pi * tt / 3.6)
siren = np.sin(2 * np.pi * np.cumsum(sf_) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(sf_) / SR)
add(amb, norm(lp(siren, 1800)) * np.minimum(1, tt / 3) ** 2 * np.minimum(1, (d - tt) / .8), 30.0, .035, -.4)
# the van leaves: engine rev, tyre squeal
o0, o1 = TL['van_out']; d = o1 - o0 + .8; tt = t_(d); f0 = 40 + 70 * np.clip(tt / (o1 - o0), 0, 1)
rev = np.sin(2 * np.pi * np.cumsum(f0) / SR) + .5 * np.sin(4 * np.pi * np.cumsum(f0) / SR) + .4 * lp(noise(d), 500)
add(fx, norm(lp(rev, 1200)) * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .8), o0, .28, -.2)
d = .7; tt = t_(d)
add(fx, norm(bp(noise(d), 1400, 3200) * (1 + .5 * np.sin(2 * np.pi * 37 * tt))) * np.sin(np.pi * tt / d), o0 + .05, .07, .3)
# knife scrapes: the date, the paint-over, the headline words and the underline
def scrape(d=.6, v=1.0):
    tt = t_(d); g = np.abs(np.sin(2 * np.pi * 60 * tt + 3 * np.sin(2 * np.pi * 7 * tt)))
    return norm(bp(noise(d), 900, 4200) * (.5 + g) * np.sin(np.pi * tt / d) ** .7) * v
add(fx, scrape(.9), TL['shots']['title'], .12, -.1)
add(fx, scrape(1.3), TL['paint_over'], .16, .2)
add(fx, norm(bp(noise(1.2), 300, 5000)) * env_in_out(1.2, .05, .9), TL['paint_over'] + .1, .05, -.2)   # paper rustle
add(fx, scrape(.5), TL['cocaine'], .14, -.2)
add(fx, scrape(.5), TL['cowboys'], .14, .2)
add(fx, scrape(.55), TL['cowboys'] + .45, .1, 0)
d = 48.2 - 36.3
add(amb, norm(lp(brown(d), 250)) * env_in_out(d, .4, .3), 36.3, .04)   # room tone
# press thump carries over the cut to the skyline (L-cut)
press = S.room(np.stack([thump(1, 60)] * 2, 1).astype(np.float32), size=.8, mix=.5)[:, 0]
add(fx, press, 48.0, .35)
# neon: night surf, tube buzz on each light, hum that dies with the light
s0 = TL['shots']['sky'][0]; lo0, lo1 = TL['light_out']; d = lo1 - s0 + .4; tt = t_(d)
surf = lp(noise(d), 700) * (.6 + .4 * np.sin(2 * np.pi * tt / 5.5) ** 2)
add(amb, norm(surf) * env_in_out(d, .6, 1.0), s0, .1)
for i in range(9):
    d = .25; tt = t_(d)
    add(fx, norm(np.sign(np.sin(2 * np.pi * 120 * tt)) * .3 + hp(noise(d), 3000) * .2) * env_exp(d, .07), 48.5 + i * .22, .03, -.6 + i * .15)
d = lo1 - 49.0; tt = t_(d)
nh = (np.sin(2 * np.pi * 120 * tt) + .4 * np.sin(2 * np.pi * 240 * tt)) * np.minimum(1, tt / 1) * np.clip((lo1 - 49.0 - tt) / (lo1 - lo0), 0, 1)
add(fx, nh, 49.0, .02)

# ---------------- voice ----------------
vo = buf()
for v in TL['voice']:
    x, sr = sf.read(os.path.join(HERE, 'voice', v['id'] + '.wav'), dtype='float32')
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    add(vo, x, v['t'], 1.0)
vm = compress(vo[:, 0], thr=.18, ratio=3.0); vo = np.stack([vm, vm], 1)

def rms(x): return float(np.sqrt(np.mean(x[np.abs(x).sum(1) > 1e-4] ** 2)))
vo *= .3 / rms(vo)
# duck music and ambience ~8 dB under the voice
vkey = np.abs(vo[:, 0])
from scipy.ndimage import maximum_filter1d, uniform_filter1d
act = uniform_filter1d(maximum_filter1d((vkey > .02).astype(np.float32), int(.25 * SR)), int(.2 * SR))
duck = 1 - act * (1 - 10 ** (-11 / 20))
fxduck = 1 - act * (1 - 10 ** (-12 / 20))   # the gunfire and foley give way to the words
mus *= .3 / 10 ** (10 / 20) / max(rms(mus), 1e-6)
mix = vo + mus * duck[:, None] + amb * (.6 + .4 * duck)[:, None] * 1.4 + fx * 1.2 * fxduck[:, None]
# hard silence: digital zero before the first shot
mix[int(24.1 * SR):int(TL['gun'][0] * SR)] = 0
mix = mix[:int(DUR * SR)]
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
print('mix', mix.shape[0] / SR, 's; voice rms', rms(vo), 'music rms', rms(mus))
