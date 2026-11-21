// "Broad Daylight": every shot repainted from knife strokes each frame. One timeline (timeline.json) drives picture and sound.
import { Impasto, Strokes, KNIFE, BRUSH, DAB, LINE, hex, shade, mixc } from './engine/impasto.js';
import { strokePath } from './engine/plate.js';
import * as S from './scenes.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const ei = t => clamp(t) ** 3;
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const hash = S.hash;
const TR = (x, y, s = 1) => [s, 0, 0, s, x, y];
const key = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [t0, v0, e] = ks[i], [t1, v1] = ks[i + 1]; if (t < t1) { const k = (e || eio)((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); } } return ks[ks.length - 1][1]; };
const camOf = v => ({ x: v[0], y: v[1], zoom: v[2], rot: 0 });
const SCREEN = { x: W / 2, y: H / 2, zoom: 1, rot: 0 };

let E, TL, Pl = {}, dyn, subEl, subTxt;

export async function setup(canvas) {
  TL = await (await fetch('timeline.json')).json();
  await document.fonts.load('700 100px "Cormorant Garamond"'); await document.fonts.load('italic 600 50px "Cormorant Garamond"'); await document.fonts.load('500 50px "Cormorant Garamond"');
  E = new Impasto(canvas, { W, H, ss: 2 }); dyn = new Strokes(8192);
  const up = (built, w, h) => ({ b: E.batch(built.strokes.data()), tex: E.texture(built.ref.ctx.canvas), w, h });
  Pl.lot = up(S.buildLot(), S.LW, S.LH);
  Pl.front = up(S.buildFront(), S.FW, S.FH);
  Pl.sign = up(S.buildSign(), S.SIGN[2], S.SIGN[3]);
  Pl.broken = up(S.buildBroken(), S.FW, S.FH);
  Pl.van = up(S.buildVan(), S.VW, S.VH);
  Pl.title = up(S.buildTitle('JULY 11, 1979', 1000, 200, 150, '#231b18'), 1000, 200);
  Pl.paper = up(S.buildPaper(), S.PW, S.PH);
  Pl.coc = up(S.buildWord('COCAINE', 960, 240, 200), 960, 240);
  Pl.cow = up(S.buildWord('COWBOYS', 960, 240, 200), 960, 240);
  Pl.sky = up(S.buildSky(), S.SW, S.SH);
  // subtitles: crisp serif DOM text on a calm dark plane, low in frame
  subEl = document.createElement('div');
  subEl.style.cssText = 'position:fixed;left:60px;right:60px;top:1440px;display:flex;justify-content:center;pointer-events:none';
  subTxt = document.createElement('div');
  subTxt.style.cssText = 'font-family:"Cormorant Garamond",serif;font-weight:600;font-size:54px;line-height:1.18;color:#f4ede0;text-align:center;padding:16px 30px 20px;border-radius:14px;background:rgba(14,11,14,.58);box-shadow:0 0 40px 18px rgba(14,11,14,.45);text-shadow:0 2px 6px rgba(0,0,0,.6);max-width:900px;text-wrap:balance';
  subEl.appendChild(subTxt); document.body.appendChild(subEl);
  window.DUR = TL.dur;
  window.TEXTS = texts;
  return frame;
}

function plate(pl, o) {
  const ua = o.under ?? 1;
  if (o.grey > 0 && o.reveal === undefined) o = { ...o, reveal: 1e6 };   // grey only holds until a reveal time
  if (ua > 0) E.under(pl.tex, pl.w, pl.h, { ...o, alpha: (o.alpha ?? 1) * ua });
  E.draw(pl.b, o);
}
const flush = o => { if (dyn.n) E.drawNow(dyn.data(), o); dyn.clear(); };

// ---------------- figures: knife-stroke silhouettes, no faces ----------------
function bone(a, b, w, c, seed, alpha, taper = 0) {
  dyn.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.15 + w * .3, wid: w, c, c2: shade(c, .85), seed, type: KNIFE, alpha, taper, hgt: 1.1 });
}
function person(x, y, Hh, { phase = 0, f = 1, run = 0, coat = '#3a3a44', legs = '#25242a', skin = '#6e5446', hair = '#1c181a', seed = 1, alpha = 1, lean = 0, bag = null } = {}) {
  const amp = lerp(.34, .8, run);
  const bob = -Math.abs(Math.cos(phase)) * Hh * lerp(.012, .045, run);
  const L = (lean + run * .25) * f;
  const hip = [x, y - Hh * .49 + bob];
  const sh = [hip[0] + Math.sin(L) * Hh * .3, hip[1] - Math.cos(L) * Hh * .3];
  const C = hex(coat), Lg = hex(legs);
  const limbs = s => {
    const a = Math.sin(phase) * amp * s;
    const knee = [hip[0] + Math.sin(a) * Hh * .25 * f, hip[1] + Math.cos(a) * Hh * .25];
    const back = Math.max(0, -Math.sin(phase) * s);
    const a2 = a - (lerp(.15, 1.4, run) * back + .05);
    const foot = [knee[0] + Math.sin(a2) * Hh * .25 * f, knee[1] + Math.cos(a2) * Hh * .25];
    const col = shade(Lg, s > 0 ? 1.15 : .78);
    bone(hip, knee, Hh * .085, col, seed + s * 3, alpha); bone(knee, foot, Hh * .07, col, seed + s * 5, alpha);
    dyn.push({ x: foot[0] + f * Hh * .03, y: foot[1], ang: 0, len: Hh * .085, wid: Hh * .035, c: hex('#141214'), seed: seed + s * 7, type: DAB, alpha });
  };
  const arm = s => {
    const a = -Math.sin(phase) * amp * 1.1 * s + L;
    const elbow = [sh[0] + Math.sin(a) * Hh * .17 * f, sh[1] + Math.cos(a) * Hh * .17];
    const a2 = a + lerp(.1, 1.3, run) * f * (f > 0 ? 1 : 1);
    const hand = [elbow[0] + Math.sin(a2) * Hh * .16 * f, elbow[1] + Math.cos(a2) * Hh * .16];
    const col = shade(C, s > 0 ? 1.1 : .72);
    bone(sh, elbow, Hh * .07, col, seed + s * 11, alpha); bone(elbow, hand, Hh * .06, col, seed + s * 13, alpha);
    if (bag && s > 0) dyn.push({ x: hand[0], y: hand[1] + Hh * .07, ang: Math.PI / 2, len: Hh * .16, wid: Hh * .12, c: hex(bag), seed: seed + 99, type: KNIFE, alpha });
    return hand;
  };
  limbs(-1); arm(-1);
  bone([hip[0], hip[1] + Hh * .03], sh, Hh * .2, C, seed + 1, alpha, -.35);
  dyn.push({ x: sh[0] - f * Hh * .03, y: (sh[1] + hip[1]) / 2, ang: Math.PI / 2 + L, len: Hh * .26, wid: Hh * .045, c: shade(C, 1.45), seed: seed + 2, type: KNIFE, alpha: alpha * .8 });   // lit edge
  limbs(1); arm(1);
  const hd = [sh[0] + Math.sin(L) * Hh * .1 + f * Hh * .01, sh[1] - Math.cos(L) * Hh * .1];
  dyn.push({ x: hd[0], y: hd[1], ang: 0, len: Hh * .085, wid: Hh * .105, c: hex(skin), c2: shade(hex(skin), .75), seed: seed + 4, type: DAB, alpha });
  dyn.push({ x: hd[0] - f * Hh * .016, y: hd[1] - Hh * .026, ang: 0, len: Hh * .09, wid: Hh * .07, c: hex(hair), seed: seed + 6, type: DAB, alpha });
}
const SHIRTS = [['#7a6a58', '#2c2a2e'], ['#5f6f6a', '#3a342e'], ['#8a6e58', '#2a2c34'], ['#6a5a6e', '#3a3a3a'], ['#a89a80', '#4a3e34'], ['#4f5f74', '#2a2826']];

// ---------------- shots ----------------
const POST = {
  noon: { light: [-.45, -.7, .62], amb: .8, dif: .3, spec: .14, sat: .8, contrast: 1.06, vig: .38, expo: 1, lift: [.02, .025, .03], gain: [.97, .98, 1], ground: [.25, .23, .22] },
  grey: { light: [-.45, -.7, .62], amb: .8, dif: .28, spec: .18, sat: .9, contrast: 1.08, vig: .45, expo: .9, lift: [.02, .025, .035], gain: [.92, .95, 1], ground: [.2, .2, .21] },
  paper: { light: [.5, -.6, .55], amb: .78, dif: .34, spec: .2, sat: .85, contrast: 1.08, vig: .5, expo: .98, lift: [.02, .015, .015], ground: [.12, .1, .09] },
  night: { light: [-.3, -.6, .7], amb: .92, dif: .2, spec: .28, sat: 1.1, contrast: 1.05, vig: .42, expo: 1, lift: [.0, .0, .01], ground: [.03, .03, .05] },
};

function shotLot(t, extra) {
  const c = camOf(key(t, [[0, [700, 430, 2.3]], [2.2, [700, 640, 1.75], ss], [7.2, [700, 2150, 1.0]]]));
  const cam = extra?.cam || c;
  E.begin(POST.noon.ground);
  plate(Pl.lot, { cam, t, grey: 0, run: 1 });
  // a few small shoppers crossing between the car rows (depth by row)
  const rows = [[2340, 88, 0], [2340, 92, 1], [2710, 132, 2], [2720, 128, 3], [3220, 200, 4]];
  for (const [y, h, i] of rows) {
    const f = i % 2 ? -1 : 1, x = (hash(i * 7) * 1400 + f * t * h * .8) % 1600 - 100;
    person(x, y, h, { phase: t * 7.5 + i, f, coat: SHIRTS[i % 6][0], legs: SHIRTS[i % 6][1], seed: 100 + i * 20, bag: i % 2 ? '#b49b74' : null });
  }
  flush({ cam, t, grey: 0 });
  // the date, laid in by the knife
  if (t >= TL.shots.title) {
    E.draw(Pl.title.b, { cam, M: TR(200, 1390), t, grey: 0, appear: TL.shots.title, appDur: .16, run: .4 });
  }
  E.finish({ ...POST.noon, expo: lerp(1.18, 1, seg(t, 0, 4)) });
}

// shoppers strolling the frontage
const STROLL = [[700, -1, 0], [980, 1, 1], [1180, -1, 2], [520, 1, 3], [1420, -1, 4], [1900, -1, 5]];
function strollers(t, { from = 0, flee = 1e9 } = {}) {
  STROLL.forEach(([x0, f, i]) => {
    const tf = t - flee;
    let x = x0 + f * (t - from) * 120, run = 0, ff = f, ph = t * 6.5 + i;
    if (tf > 0) { ff = x > 1400 ? 1 : -1; run = clamp(tf / .25); x = x + ff * (tf * 520 + 0); ph = t * 12 + i; }
    const y = 1330 + (i % 3) * 28;
    person(x, y, 300, { phase: ph, f: ff, run, coat: SHIRTS[i][0], legs: SHIRTS[i][1], seed: 300 + i * 20, bag: i % 2 ? '#b49b74' : null });
  });
}
const vanM = (x, rock = 0) => [1.5, 0, rock * 1.5, 1.5, x, 1690 - 300 * 1.5];
function vanX(t) {
  const [a, b] = TL.van_in, [c, d] = TL.van_out;
  if (t < a) return 3000;
  if (t < b) return lerp(2600, 1660, eo(seg(t, a, b)));
  if (t < c) return 1660;
  return lerp(1660, -900, ei(seg(t, c, d)));
}
function signGlow(t, on) {
  if (on <= 0) return;
  const [x, y, w, h] = S.SIGN, pink = hex(S.PINK);
  for (let i = 0; i < 7; i++) dyn.push({ x: x + 40 + i * (w - 80) / 6, y: y + h / 2, ang: 0, len: 110, wid: 120, c: pink, type: DAB, seed: 900 + i, alpha: .07 * on, hgt: 0 });
  // reflection on the sidewalk: broken horizontal dabs
  for (let i = 0; i < 9; i++) dyn.push({ x: x + w / 2 + (hash(i + 3) - .5) * 260, y: S.FACE + 20 + i * 18, ang: 0, len: 150 - i * 10, wid: 12, c: shade(pink, .8), type: KNIFE, seed: 920 + i, alpha: .32 * on * (1 - i / 10), hgt: .3 });
}
function signOn(t) {
  const [a, b] = TL.sign_die;
  if (t < a) return 1;
  if (t > b) return 0;
  return hash(Math.floor(t * 24) * 1.7) > .45 ? .8 : 0;
}

function shotFront(t, cam, { grey = 0, post = POST.noon, after = false, broken = false } = {}) {
  E.begin(post.ground);
  plate(Pl.front, { cam, t, grey, run: 1 });
  if (after) plate(Pl.broken, { cam, t, grey: 1, run: .5 });
  else if (broken) plate(Pl.broken, { cam, t, grey: 0, run: .5 });
  const on = after ? 0 : signOn(t);
  plate(Pl.sign, { cam, M: TR(S.SIGN[0], S.SIGN[1]), t, grey: on > 0 ? 0 : 1, alpha: on > 0 ? 1 : .55, under: 1 });
  signGlow(t, on); flush({ cam, t, grey: 0 });
  return on;
}

function shotFrontage(t) {   // truck along the mall front
  const cam = camOf(key(t, [[12.9, [700, 960, 1]], [17.0, [1300, 960, 1]]]));
  shotFront(t, cam);
  strollers(t, { from: 12.9 }); flush({ cam, t, grey: 0 });
  E.finish(POST.noon);
}

function shotVan(t) {   // the van pulls up (low, slight push)
  const cam = camOf(key(t, [[17.0, [1700, 1250, 1.0]], [20.6, [1700, 1230, 1.06]]]));
  shotFront(t, cam);
  strollers(t, { from: 12.9 }); flush({ cam, t, grey: 0 });
  const vx = vanX(t), [a, b] = TL.van_in;
  const rock = t > b - .15 ? Math.sin((t - b + .15) * 14) * Math.exp(-(t - b + .15) * 4) * .035 : 0;
  plate(Pl.van, { cam, M: vanM(vx, rock), t, grey: 0 });
  E.finish(POST.noon);
}

function gunFlash(t) {
  for (const g of TL.gun) if (t >= g && t < g + .045) return g;
  return null;
}
function shards(t, cam) {
  const t0 = TL.glass; if (t < t0) return;
  const [x, y, w, h] = S.WIN;
  for (let i = 0; i < 90; i++) {
    const ox = x + hash(i) * w, oy = y + hash(i + 200) * h, dt = t - t0 - hash(i + 400) * .08;
    if (dt < 0) continue;
    const vx = (hash(i + 600) - .5) * 700, vy = -150 + hash(i + 800) * 300;
    let px = ox + vx * dt, py = oy + vy * dt + 1500 * dt * dt;
    const gy = S.FACE + 30 + hash(i + 1000) * 150;
    const landed = py > gy; if (landed) { py = gy; px = ox + vx * Math.sqrt(Math.max(0, (gy - oy) / 1500)) * .9; }
    const sz = 8 + hash(i + 1200) * 16;
    dyn.push({ x: px, y: py, ang: landed ? hash(i) * 3 : dt * (6 + hash(i) * 10), len: sz, wid: sz * .45, c: hex('#d9e6e2'), c2: hex('#9fc7c2'), type: KNIFE, seed: 1500 + i, alpha: .9, hgt: 1.4 });
  }
}
function flashAt(g) {
  const k = Math.floor(g * 100), [x, y, w, h] = S.WIN;
  const fx = x + 40 + hash(k) * (w - 80), fy = y + 130 + hash(k + 1) * 140;
  dyn.push({ x: fx, y: fy, ang: hash(k + 3) * 3, len: 170, wid: 120, c: hex('#e6fbf6'), c2: hex(S.TEAL), type: KNIFE, seed: k, alpha: .2, hgt: 0 });   // glow on the glass
  for (let s = 0; s < 6; s++) { const a = hash(k + s * 7) * 6.28; dyn.push({ x: fx + Math.cos(a) * 26, y: fy + Math.sin(a) * 26, ang: a, len: 50 + hash(k + s) * 50, wid: 16, c: hex('#fff6d6'), c2: hex(S.TEAL), type: KNIFE, taper: .9, seed: k + s, alpha: .95, hgt: .2 }); }
  dyn.push({ x: fx, y: fy, ang: 0, len: 34, wid: 34, c: hex('#ffffff'), type: DAB, seed: k + 50, alpha: 1, hgt: .2 });
}

function shotDoor(t) {   // two men walk in, silence, gunfire, glass
  const [w0, w1] = TL.men_walk, gun0 = TL.gun[0];
  let c = key(t, [[20.6, [1700, 1230, 1.06]], [24.1, [1565, 1050, 1.55]], [24.5, [1565, 1050, 1.55]], [27.0, [1500, 1050, 1.28]]]);
  let shake = 0;
  for (const g of TL.gun) if (t >= g && t < g + .2) shake = Math.max(shake, 1 - (t - g) / .2);
  if (t > TL.glass && t < TL.glass + .4) shake = Math.max(shake, 1.6 * (1 - (t - TL.glass) / .4));
  const sx = (hash(Math.floor(t * 24)) - .5) * 18 * shake, sy = (hash(Math.floor(t * 24) + 9) - .5) * 14 * shake;
  // whip-pan out at the end
  const wp = seg(t, TL.whip - .18, TL.whip);
  const cam = camOf([c[0] + sx + ei(wp) * 600, c[1] + sy, c[2]]);
  shotFront(t, cam, { broken: t >= TL.glass });
  strollers(t, { from: 12.9, flee: TL.glass + .15 });
  // the two men: from behind the van's tail to the shop door, then gone inside
  for (const k of [0, 1]) {
    const tt = t - k * .35; if (tt < w0) continue;
    const u = seg(tt, w0, w1), x = lerp(2260, 1600, u);
    const inside = seg(tt, w1, w1 + .35);
    if (inside >= 1) continue;
    person(x - inside * 20, 1352 - inside * 10, 300, { phase: tt * 6.2 + k * 1.3, f: -1, coat: '#232227', legs: '#18171b', skin: '#5a4438', seed: 700 + k * 30, alpha: 1 - inside });
  }
  flush({ cam, t, grey: 0 });
  const vx = vanX(t); plate(Pl.van, { cam, M: vanM(vx), t, grey: 0 });
  shards(t, cam);
  const g = gunFlash(t); if (g !== null) flashAt(g);
  flush({ cam, t, grey: 0 });
  streaks(wp);
  E.finish({ ...POST.noon, expo: g !== null ? 1.12 : 1 });
}
function streaks(k) {
  if (k <= 0) return;
  for (let i = 0; i < 40; i++) dyn.push({ x: hash(i) * W, y: hash(i + 50) * H, ang: 0, len: 300 + hash(i + 9) * 500, wid: 10 + hash(i + 3) * 30, c: hex(hash(i + 5) > .5 ? '#8b8578' : '#4a484a'), type: KNIFE, seed: 2000 + i, alpha: .8 * k });
  flush({ cam: SCREEN, t: 0, grey: 0 });
}

function shotFlee(t) {   // the lot: shoppers sprint away
  const t0 = TL.shots.flee[0];
  const settle = 1 - eo(seg(t, t0, t0 + .28));
  let shake = (hash(Math.floor(t * 24) * 3) - .5) * 10 * (1 - seg(t, t0, t0 + 2.5));
  const c = key(t, [[t0, [700, 2600, 1.3]], [30.6, [720, 2640, 1.36]]]);
  const cam = camOf([c[0] - settle * 280 + shake, c[1], c[2]]);
  E.begin(POST.noon.ground);
  plate(Pl.lot, { cam, t, grey: 0, run: 1 });
  const R = [[480, 2350, 120, 1, .1], [900, 2380, 125, -1, .0], [300, 2650, 170, 1, .3], [1050, 2700, 175, -1, .15], [620, 2930, 240, -1, .05], [820, 3160, 320, 1, .2], [420, 3220, 340, -1, .45]];
  R.forEach(([x0, y, h, f, d], i) => {
    const tt = t - t0 + .6 - d;
    person(x0 + f * tt * h * 2.2, y, h, { phase: tt * 13 + i, f, run: 1, coat: SHIRTS[i % 6][0], legs: SHIRTS[i % 6][1], seed: 500 + i * 20 });
  });
  // a dropped shopping bag tumbling, then still
  const bt = clamp(t - t0 - .3, 0, .7);
  dyn.push({ x: 760 + bt * 120, y: 3230 - Math.sin(bt / .7 * Math.PI) * 60, ang: bt * 7, len: 60, wid: 44, c: hex('#b49b74'), c2: hex('#8e7656'), type: KNIFE, seed: 2500, alpha: 1 });
  flush({ cam, t, grey: 0 });
  streaks(settle);
  E.finish(POST.noon);
}

function shotGrey(t, o = {}) {   // the same storefront, after: grey, still
  const cam = camOf([1300, 960, 1]);
  E.begin(POST.grey.ground);
  plate(Pl.front, { cam, t, grey: 1, run: 1 });
  plate(Pl.broken, { cam, t, grey: 1, run: .5 });
  plate(Pl.sign, { cam, M: TR(S.SIGN[0], S.SIGN[1]), t, grey: 1, alpha: .5 });
  plate(Pl.van, { cam, M: vanM(vanX(t)), t, grey: 1 });
  if (!o.noFinish) E.finish(POST.grey);
  return cam;
}

function shotPaper(t) {
  const [p0] = TL.shots.paper, po = TL.paint_over;
  const c = key(t, [[p0, [520, 1290, 1.5]], [41.6, [540, 1240, 1.56]], [44.3, [600, 880, 1.12]], [48.2, [600, 860, 1.2]]]);
  const cam = camOf(c);
  const sweep = seg(t, po, po + 1.4);
  E.begin(POST.paper.ground);
  if (sweep < 1) {   // the grey storefront underneath, being painted over
    const gc = camOf([1300, 960, 1]);
    plate(Pl.front, { cam: gc, t, grey: 1, run: 1 }); plate(Pl.broken, { cam: gc, t, grey: 1 });
  }
  // paint-over: the paper's strokes are laid top to bottom (stroke app offsets ~ y)
  plate(Pl.paper, { cam, t, grey: 0, appear: po, appDur: .16, under: seg(t, po + .9, po + 1.4), run: 1 });
  if (t >= TL.cocaine) E.draw(Pl.coc.b, { cam, M: TR(120, 450), t, grey: 0, appear: TL.cocaine, appDur: .12, run: .3 });
  if (t >= TL.cowboys) E.draw(Pl.cow.b, { cam, M: TR(120, 640), t, grey: 0, appear: TL.cowboys, appDur: .12, run: .3 });
  // neon-pink knife underline swept under the name
  const ul = seg(t, TL.cowboys + .45, TL.cowboys + 1.0);
  if (ul > 0) {
    const n = 10;
    for (let i = 0; i < Math.ceil(n * ul); i++) dyn.push({ x: 230 + (i + .5) * 74, y: 905 + Math.sin(i * 1.3) * 3, ang: -.01, len: 92, wid: 26, c: hex(S.PINK), c2: hex('#d92d72'), type: KNIFE, seed: 3000 + i, alpha: 1, hgt: 1.3 });
    flush({ cam, t, grey: 0 });
  }
  E.finish(POST.paper);
}

// neon outlines on the towers: [x0,y0,x1,y1,colour, on-time]
let NEON = null;
function neonList() {
  if (NEON) return NEON;
  NEON = [];
  S.TOWERS.forEach(([x, top, w], i) => {
    const col = i % 3 === 1 ? S.TEAL : S.PINK, on = 48.5 + i * .22;
    NEON.push([x + 4, top + 6, x + w - 4, top + 6, col, on]);
    if (i % 2 === 0) NEON.push([x + 6, top + 6, x + 6, top + 260, col, on + .1]);
    if (i % 3 === 0) NEON.push([x + w - 6, top + 6, x + w - 6, top + 180, i % 2 ? S.PINK : S.TEAL, on + .15]);
    if (i === 3) NEON.push([x + 20, top + 90, x + w - 20, top + 90, S.TEAL, on + .3]);
  });
  // a long teal causeway line on the water's edge
  NEON.push([0, S.WATER - 8, S.SW, S.WATER - 8, S.TEAL, 49.6]);
  return NEON;
}
function shotSky(t) {
  const [s0] = TL.shots.sky, [lo0, lo1] = TL.light_out;
  const c = key(t, [[s0, [600, 2030, 1]], [50.4, [600, 1200, 1]], [lo0, [600, 1160, 1.07]]]);
  const cam = camOf(c);
  const out = seg(t, lo0, lo1);
  E.begin(POST.night.ground);
  plate(Pl.sky, { cam, t, grey: 0, run: 1 });
  const wob = t * 1.3;
  for (const [x0, y0, x1, y1, col, on] of neonList()) {
    const flick = t < on ? 0 : t < on + .25 ? (hash(Math.floor(t * 24) + x0) > .4 ? 1 : .2) : 1;
    const a = flick * (1 - ei(out));
    if (a <= 0) continue;
    const C = hex(col), L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 40));
    strokePath(dyn, [[x0, y0], [x1, y1]], { wid: 7, c: mixc(C, [1, 1, 1], .35), type: LINE, step: 40, alpha: a, hgt: .4, seed: x0 + y0 });
    for (let k = 0; k < n; k++) {   // glow
      const u = (k + .5) / n; dyn.push({ x: lerp(x0, x1, u), y: lerp(y0, y1, u), ang: Math.atan2(y1 - y0, x1 - x0), len: L / n * 1.6, wid: 46, c: C, type: DAB, seed: k + x0, alpha: .16 * a, hgt: 0 });
    }
    // reflection in the water: broken horizontal dabs, wobbling
    const ym = S.WATER + (S.WATER - (y0 + y1) / 2) * .55;
    for (let k = 0; k < 6; k++) {
      const yy = ym + k * 26 + (hash(k + x0) - .5) * 20;
      if (yy < S.WATER + 6) continue;
      const xx = lerp(x0, x1, hash(k * 3 + y0)) + Math.sin(wob + k * 1.7 + x0) * 14;
      dyn.push({ x: xx, y: yy, ang: 0, len: Math.max(30, Math.abs(x1 - x0) * .5) * (1 - k * .1), wid: 9, c: shade(C, .85), type: KNIFE, seed: 4000 + k + x0, alpha: a * (.6 - k * .08), hgt: .4 });
    }
  }
  flush({ cam, t, grey: 0 });
  const p = POST.night;
  E.finish({ ...p, expo: p.expo * (1 - ss(out) * .97), amb: p.amb * (1 - ss(seg(t, lo0, lo0 + .6)) * .5), spec: p.spec + out * .4 });
}

function frame(t) {
  const sh = TL.shots;
  if (t < sh.lot[1]) shotLot(t);
  else if (t < sh.front[1]) shotFrontage(t);
  else if (t < sh.van[1]) shotVan(t);
  else if (t < sh.door[1]) shotDoor(t);
  else if (t < sh.flee[1]) shotFlee(t);
  else if (t < sh.grey[1]) shotGrey(t);
  else if (t < sh.paper[1]) shotPaper(t);
  else if (t < TL.light_out[1] + .05) shotSky(t);
  else { E.begin([0, 0, 0]); E.finish({ ...POST.night, expo: 0, ground: [0, 0, 0] }); }
  // subtitles
  const v = TL.voice.find(v => t >= v.t && t < v.t1);
  subEl.style.opacity = v && !location.search.includes('nosub') ? 1 : 0; if (v && subTxt.textContent !== v.sub) subTxt.textContent = v.sub;
}

// every on-screen text, for the reading-time check (subtitles are checked by their .srt)
function texts(t) {
  const out = [];
  const box = (cam, x0, y0, x1, y1) => ({ x0: (x0 - cam.x) * cam.zoom + W / 2, y0: (y0 - cam.y) * cam.zoom + H / 2, x1: (x1 - cam.x) * cam.zoom + W / 2, y1: (y1 - cam.y) * cam.zoom + H / 2 });
  if (t >= TL.shots.title && t < TL.shots.lot[1]) out.push({ id: 'date', text: 'JULY 11, 1979', ...box({ x: 700, y: 2150, zoom: 1 }, 200, 1390, 1200, 1590) });
  if (t >= TL.shots.front[0] && t < TL.shots.door[1]) out.push({ id: 'sign', text: 'LIQUORS', pass: true, x0: 0, y0: 0, x1: 10, y1: 10 });
  if (t >= TL.paint_over && t < TL.shots.paper[1]) {
    out.push({ id: 'mast', text: 'THE EVENING COURIER', pass: true, x0: 0, y0: 0, x1: 10, y1: 10 });
    out.push({ id: 'deck', text: 'Gunmen open fire in mall liquor store', pass: true, x0: 0, y0: 0, x1: 10, y1: 10 });
    if (t >= TL.cocaine) { const c = key(t, [[44.3, [600, 880, 1.12]], [48.2, [600, 860, 1.2]]]); out.push({ id: 'head', text: 'COCAINE COWBOYS', ...box(camOf(c), 120 + 60, 450 + 40, 120 + 900, 640 + 230) }); }
  }
  return out;
}
