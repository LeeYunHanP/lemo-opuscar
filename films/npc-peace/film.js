// "Last Days of Peace": stick people on warm paper, one accent (= chaos). 12 s loop. Deterministic: everything is a function of t.
const W = 1080, H = 1920;
const C = { paper: '#F3F0EA', ink: '#24242C', mute: '#9C978C', tint: '#E2DDD2', sig: '#EB4A2A', soft: '#F4C3B4' };
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');
const TL = await (await fetch('timeline.json')).json();
await document.fonts.load('600 70px Jost'); await document.fonts.load('70px EmojiSub', '😇');

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const back = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

// paper: flat warm off-white with a very fine matte grain, drawn once
const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
{ const p = paper.getContext('2d'); p.fillStyle = C.paper; p.fillRect(0, 0, W, H); const id = p.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (hash(i * .37) - .5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; } p.putImageData(id, 0, 0); }

// ---------------- the rig (even-hose stick figure) ----------------
const GEO = { thigh: .215, shin: .215, hipH: .42, spine: .285, sh: .065, upper: .18, fore: .155, headR: .112, stance: .09 };
const dirv = a => [Math.sin(a), Math.cos(a)];
function ik(Hp, F, L1, L2, side) {
  let dx = F[0] - Hp[0], dy = F[1] - Hp[1], d = Math.hypot(dx, dy); const m = (L1 + L2) * .9995;
  if (d > m) { F = [Hp[0] + dx / d * m, Hp[1] + dy / d * m]; dx = F[0] - Hp[0]; dy = F[1] - Hp[1]; d = m; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const px = Hp[0] + a * dx / d, py = Hp[1] + a * dy / d; let nx = -dy / d, ny = dx / d;
  if (nx * side < 0) { nx = -nx; ny = -ny; }
  return [[px + nx * h, py + ny * h], F];
}
const rest = () => ({ hx: 0, hy: 0, lean: 0, bend: 0, head: 0, la: -.5, lb: .2, ra: .5, rb: -.2, lfx: 0, lfy: 0, rfx: 0, rfy: 0 });
function joints(f, p) {
  const S = f.S, bx = f.x, gy = f.gy, prof = !!f.prof, face = f.face || 1;
  const Hp = [bx + p.hx * S, gy - (GEO.hipH - p.hy) * S];
  const sd = dirv(Math.PI - p.lean);
  const N = [Hp[0] + sd[0] * GEO.spine * S, Hp[1] + sd[1] * GEO.spine * S];
  const mid = [(Hp[0] + N[0]) / 2, (Hp[1] + N[1]) / 2], perp = [-sd[1], sd[0]];
  const Cc = [mid[0] + perp[0] * p.bend * S, mid[1] + perp[1] * p.bend * S];
  const u = 1 - GEO.sh / GEO.spine;
  const Sh = [(1 - u) ** 2 * Hp[0] + 2 * (1 - u) * u * Cc[0] + u * u * N[0], (1 - u) ** 2 * Hp[1] + 2 * (1 - u) * u * Cc[1] + u * u * N[1]];
  const hd = dirv(Math.PI - (p.lean + p.head)), hr = GEO.headR * S;
  const Hd = [N[0] + hd[0] * hr, N[1] + hd[1] * hr];
  const arm = (a, b) => { const e = dirv(a), E = [Sh[0] + e[0] * GEO.upper * S, Sh[1] + e[1] * GEO.upper * S]; const w = dirv(a + b); return [E, [E[0] + w[0] * GEO.fore * S, E[1] + w[1] * GEO.fore * S]]; };
  const st = prof ? 0 : GEO.stance;
  const fL = [bx + (-st + p.lfx) * S, gy - p.lfy * S], fR = [bx + (st + p.rfx) * S, gy - p.rfy * S];
  return { Hp, N, Cc, Sh, Hd, aL: arm(p.la, p.lb), aR: arm(p.ra, p.rb), lL: ik(Hp, fL, GEO.thigh * S, GEO.shin * S, prof ? face : -1), lR: ik(Hp, fR, GEO.thigh * S, GEO.shin * S, prof ? face : 1) };
}
function ctrl(A, B, E, k) { const m = [(A[0] + E[0]) / 2, (A[1] + E[1]) / 2]; return [B[0] + (B[0] - m[0]) * k, B[1] + (B[1] - m[1]) * k]; }
function figure(f, p) {
  const S = f.S, j = joints(f, p), w = 8 * clamp(Math.sqrt(S / 380), .6, 1.05);
  g.save(); g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w; g.beginPath();
  for (const [K, F] of [j.lL, j.lR]) { const Q = ctrl(j.Hp, K, F, .8); g.moveTo(j.Hp[0], j.Hp[1]); g.quadraticCurveTo(Q[0], Q[1], F[0], F[1]); }
  g.moveTo(j.Hp[0], j.Hp[1]); g.quadraticCurveTo(j.Cc[0], j.Cc[1], j.N[0], j.N[1]);
  for (const [El, Hn] of [j.aL, j.aR]) { const Q = ctrl(j.Sh, El, Hn, .8); g.moveTo(j.Sh[0], j.Sh[1]); g.quadraticCurveTo(Q[0], Q[1], Hn[0], Hn[1]); }
  g.stroke();
  g.beginPath(); g.arc(j.Hd[0], j.Hd[1], GEO.headR * S, 0, Math.PI * 2); g.fillStyle = f.accent ? C.sig : C.paper; g.fill();
  g.lineWidth = w * .94; g.strokeStyle = f.accent ? C.sig : C.ink; g.stroke();
  g.restore();
  return j;
}
// poses
function walkPose(ph, amp = .12) { const p = rest(); p.lfx = Math.sin(ph) * amp; p.rfx = -Math.sin(ph) * amp; p.lfy = Math.max(0, Math.cos(ph)) * .03; p.rfy = Math.max(0, -Math.cos(ph)) * .03; p.hy = -Math.abs(Math.cos(ph)) * .01; p.la = -.25 - Math.sin(ph) * .25; p.ra = .25 + Math.sin(ph) * .25 * -1; return p; }
function runPose(ph, dir, panic = 1) {
  const p = rest(); const a = .28;
  p.lfx = Math.sin(ph) * a * dir; p.rfx = -Math.sin(ph) * a * dir; p.lfy = Math.max(0, Math.cos(ph)) * .12; p.rfy = Math.max(0, -Math.cos(ph)) * .12;
  p.hy = -Math.abs(Math.cos(ph)) * .03 + .015; p.lean = .22 * dir * (1 - panic * .6);
  // arms up, flailing (panic) or pumping (sprint)
  if (panic) { p.la = -2.7 + Math.sin(ph * 1.7) * .35; p.lb = .5 + Math.sin(ph * 2.3) * .4; p.ra = 2.7 + Math.sin(ph * 1.9 + 1) * .35; p.rb = -.5 - Math.sin(ph * 2.1) * .4; }
  else { p.la = dir * (.9 * Math.sin(ph)) ; p.lb = dir * 1.4; p.ra = -dir * (.9 * Math.sin(ph)); p.rb = dir * 1.4; }
  return p;
}
function mix(a, b, k) { const o = {}; for (const key in a) o[key] = lerp(a[key], b[key], k); return o; }

// ---------------- the dog (same hose line), facing d ----------------
function dog(x, y, s, { d = 1, ph = 0, trot = 0, tail = 0, head = 0, eat = 0 } = {}) {
  const w = 7;
  g.save(); g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w;
  const hip = [x - 48 * s * d, y - 62 * s], sh = [x + 40 * s * d, y - 66 * s - Math.sin(ph) * 3 * trot];
  g.beginPath(); g.moveTo(hip[0], hip[1]); g.quadraticCurveTo(x, y - 80 * s, sh[0], sh[1]);
  for (const [P, o] of [[hip, 0], [hip, Math.PI], [sh, Math.PI * .5], [sh, Math.PI * 1.5]]) {
    const sw = Math.sin(ph + o) * 14 * s * trot, lift = Math.max(0, Math.cos(ph + o)) * 8 * s * trot;
    const F = [P[0] + sw * d, y - lift], K = [(P[0] + F[0]) / 2 + 8 * s * d * (P === hip ? -1 : 1), (P[1] + F[1]) / 2];
    g.moveTo(P[0], P[1]); g.quadraticCurveTo(K[0], K[1], F[0], F[1]);
  }
  const ta = -1.1 + Math.sin(tail) * .5;   // tail wag
  g.moveTo(hip[0], hip[1]); g.quadraticCurveTo(hip[0] - 18 * s * d, hip[1] - 10 * s, hip[0] - (22 + 18 * Math.cos(ta)) * s * d, hip[1] + 26 * s * Math.sin(ta));
  // neck and head (head drops to eat)
  const hd = [sh[0] + 30 * s * d, sh[1] - lerp(34, -18, eat) * s + head];
  g.moveTo(sh[0], sh[1]); g.quadraticCurveTo(sh[0] + 6 * s * d, hd[1] + 10 * s, hd[0], hd[1]);
  g.stroke();
  g.beginPath(); g.arc(hd[0], hd[1], 20 * s, 0, Math.PI * 2); g.fillStyle = C.paper; g.fill(); g.lineWidth = w * .94; g.stroke();
  g.beginPath(); g.moveTo(hd[0] + 14 * s * d, hd[1] + 4 * s); g.quadraticCurveTo(hd[0] + 34 * s * d, hd[1] + 2 * s, hd[0] + 36 * s * d, hd[1] + 14 * s); g.stroke();   // snout
  g.beginPath(); g.moveTo(hd[0] - 8 * s * d, hd[1] - 14 * s); g.quadraticCurveTo(hd[0] - 22 * s * d, hd[1] - 4 * s, hd[0] - 18 * s * d, hd[1] + 14 * s); g.stroke();   // ear
  g.restore();
  return { mouth: [hd[0] + 36 * s * d, hd[1] + 14 * s], neck: sh };
}

// ---------------- props and town (grey line art) ----------------
const GY = 1440;   // the ground line
function town(t) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = C.mute; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 1150); g.lineTo(W, 1150); g.stroke();                       // horizon
  for (let i = 0; i < 7; i++) { const x = 60 + i * 150 + Math.sin(t * 1.2 + i) * 10, y = 1210 + (i % 2) * 50;   // little waves
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 14, x + 44, y); g.quadraticCurveTo(x + 66, y - 14, x + 88, y); g.stroke(); }
  // sun
  g.beginPath(); g.arc(870, 900, 66, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t * .15; g.beginPath(); g.moveTo(870 + Math.cos(a) * 86, 900 + Math.sin(a) * 86); g.lineTo(870 + Math.cos(a) * 110, 900 + Math.sin(a) * 110); g.stroke(); }
  // gulls
  for (let i = 0; i < 2; i++) { const x = 480 + i * 130 + Math.sin(t * .7 + i) * 30, y = 930 + i * 46, fl = Math.sin(t * 6 + i) * 8;
    g.beginPath(); g.moveTo(x - 24, y - 6 + fl); g.quadraticCurveTo(x - 10, y - 14, x, y); g.quadraticCurveTo(x + 10, y - 14, x + 24, y - 6 + fl); g.stroke(); }
  // two palms
  for (const [x, lean] of [[70, .18], [1020, -.15]]) {
    const top = [x + lean * 420, GY - 600];
    g.lineWidth = 6; g.beginPath(); g.moveTo(x, GY); g.quadraticCurveTo(x + lean * 120, GY - 260, top[0], top[1]); g.stroke();
    g.lineWidth = 5;
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .55 + Math.sin(t * 1.3 + k) * .04, L = 120;
      g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(top[0] + Math.cos(a) * L * .6, top[1] + Math.sin(a) * L * .6 - 30, top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L + 40 * Math.abs(Math.cos(a))); g.stroke(); }
  }
  g.strokeStyle = C.tint; g.lineWidth = 6; g.beginPath(); g.moveTo(0, GY + 4); g.lineTo(W, GY + 4); g.stroke();   // ground line
  g.restore();
}
const CART = { x: 655, w: 250, top: 1240 };
function cart(t, burn) {
  const { x, w, top } = CART, x0 = x - w / 2, y1 = GY - 52;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.lineWidth = 6;
  g.fillStyle = C.tint; g.beginPath(); g.roundRect(x0, top, w, y1 - top, 10); g.fill(); g.stroke();
  for (const wx of [x0 + 42, x0 + w - 42]) { g.beginPath(); g.arc(wx, GY - 26, 26, 0, Math.PI * 2); g.fillStyle = C.paper; g.fill(); g.stroke(); }
  g.beginPath(); g.moveTo(x0 + w - 30, top); g.lineTo(x0 + w - 30, top - 230); g.stroke();   // umbrella pole
  const ux = x0 + w - 30, uy = top - 230;
  g.beginPath(); g.moveTo(ux - 130, uy); g.quadraticCurveTo(ux, uy - 120, ux + 130, uy);
  for (let k = 0; k < 5; k++) { const a = ux + 130 - k * 52; g.quadraticCurveTo(a - 26, uy + 22, a - 52, uy); }
  g.fillStyle = C.paper; g.fill(); g.stroke();
  g.fillStyle = C.mute; g.font = '600 26px Jost'; g.textAlign = 'center'; g.fillText('ICE CREAM', x, top + 52);
  g.restore();
  if (burn > 0) flames(t, burn);
}
function flames(t, k) {
  const { x, w, top } = CART, step = Math.floor(t * 12);   // flames animate on twos
  g.save(); g.lineCap = 'round'; g.strokeStyle = C.sig;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + 20 + i * (w - 40) / (n - 1), hh = (90 + hash(i * 7 + step) * 120) * k * (i % 2 ? .8 : 1.1), sway = (hash(i + step * 3) - .5) * 40;
    g.lineWidth = 7; g.beginPath(); g.moveTo(fx - 16, top + 4);
    g.quadraticCurveTo(fx - 26 + sway * .3, top - hh * .5, fx + sway, top - hh);
    g.quadraticCurveTo(fx + 20 + sway * .2, top - hh * .45, fx + 16, top + 4); g.stroke();
  }
  // umbrella catches
  const ux = x + w / 2 - 30, uy = top - 230;
  for (let i = 0; i < 4; i++) { const fx = ux - 100 + i * 66, hh = (50 + hash(i * 13 + step) * 70) * seg(k, .3, 1), sway = (hash(i + step * 5) - .5) * 26;
    if (hh < 2) continue; g.lineWidth = 6; g.beginPath(); g.moveTo(fx - 12, uy - 30); g.quadraticCurveTo(fx - 18, uy - 30 - hh * .5, fx + sway, uy - 30 - hh); g.quadraticCurveTo(fx + 16, uy - 30 - hh * .45, fx + 12, uy - 30); g.stroke(); }
  // embers
  g.fillStyle = C.sig;
  for (let i = 0; i < 10; i++) { const life = (t * .8 + hash(i)) % 1, ex = x - 90 + hash(i * 3) * 180 + Math.sin(life * 6 + i) * 20, ey = top - 60 - life * 400; g.globalAlpha = (1 - life) * k; g.beginPath(); g.arc(ex, ey, 5, 0, 7); g.fill(); }
  g.restore();
}
function cone(x, y, ang = 0, bitten = 0) {
  g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.lineWidth = 5;
  const sc = 1 - bitten;
  if (sc > .02) { g.beginPath(); g.arc(0, -22, 20 * Math.max(sc, .3), Math.PI * (1 - sc), Math.PI * 2 + Math.PI * (1 - sc) * 0); g.fillStyle = C.paper; g.fill(); g.stroke(); }
  if (bitten < .9) { g.beginPath(); g.moveTo(-18, -18); g.lineTo(0, 30 * (1 - bitten * .6)); g.lineTo(18, -18); g.closePath(); g.fillStyle = C.tint; g.fill(); g.stroke(); }
  g.restore();
}
function shout(j, t, seed) {   // emanata: three short strokes around a screaming head
  g.save(); g.strokeStyle = C.ink; g.lineWidth = 4; g.lineCap = 'round';
  const k = Math.floor(t * 12);
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * .6 + (hash(seed + k + i) - .5) * .2, r0 = 52, r1 = 74;
    g.beginPath(); g.moveTo(j.Hd[0] + Math.cos(a) * r0, j.Hd[1] + Math.sin(a) * r0); g.lineTo(j.Hd[0] + Math.cos(a) * r1, j.Hd[1] + Math.sin(a) * r1); g.stroke(); }
  g.restore();
}

// ---------------- the film ----------------
const S0 = 400;
const CAPTION = ['GTA 6 NPCs enjoying', 'their last days', 'of peace 😇'];
function caption() {
  g.save(); g.fillStyle = C.ink; g.font = '600 76px Jost, EmojiSub'; g.textBaseline = 'alphabetic';
  if (g.letterSpacing !== undefined) g.letterSpacing = '-2px';
  CAPTION.forEach((l, i) => g.fillText(l, 90, 300 + i * 92));
  g.restore();
}
function peace(t) {
  // walker + dog stroll right, slowly
  const wx = 130 + t * 14, ph = t * 5.2;
  dog(wx + 190, GY, 1.15, { d: 1, ph: t * 10.4, trot: .6, tail: t * 9 });
  const j = figure({ x: wx, gy: GY, S: S0 }, (() => { const p = walkPose(ph); p.ra = 1.0; p.rb = -.4; return p; })());
  // leash: from the walker's right hand to the dog's neck
  const hand = j.aR[1], dn = [wx + 190 + 46, GY - 76];
  g.save(); g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(hand[0], hand[1]); g.quadraticCurveTo((hand[0] + dn[0]) / 2, Math.max(hand[1], dn[1]) + 30, dn[0], dn[1]); g.stroke(); g.restore();
  // seller behind the cart, scooping and holding out a cone
  const sp = rest(); sp.la = -1.3 + Math.sin(t * 4) * .35; sp.lb = .9 + Math.sin(t * 4) * .3; sp.ra = 1.35; sp.rb = -.2; sp.head = Math.sin(t * 1.3) * .08;
  const sj = figure({ x: CART.x - 10, gy: GY, S: S0 }, sp);
  cart(t, 0);
  cone(sj.aR[1][0] + 6, sj.aR[1][1] - 4, 0);
  // the waver waves at us
  const vp = rest(); vp.ra = 2.6 + Math.sin(t * 7) * .32; vp.rb = -.35 + Math.sin(t * 7 + .6) * .3; vp.head = Math.sin(t * 2) * .06; vp.lean = Math.sin(t * 3.5) * .03;
  figure({ x: 965, gy: GY, S: S0 }, vp);
}
function chaos(t) {
  const [s0, s1] = TL.sprint, F = TL.flip;
  // dog: sits calmly, then trots to the cone and eats
  const [tr0, tr1] = TL.trot, dx = lerp(130 + 5 * 14 + 190, 420, ss(seg(t, tr0, tr1)));
  const bites = TL.bites.filter(b => t >= b).length;
  const eating = seg(t, TL.bites[0] - .15, TL.bites[0]);
  const chew = bites > 0 ? Math.abs(Math.sin((t - TL.bites[0]) * 10)) * .15 : 0;
  const D = dog(dx, GY, 1.15, { d: 1, ph: t * 12, trot: t > tr0 && t < tr1 ? 1 : 0, tail: t * (t > tr0 ? 14 : 6), eat: clamp(eating - chew) });
  // the cone: knocked out of the seller's hand, lands on the ground
  const [c0, c1] = TL.cone_fly;
  if (t < c1) { const u = seg(t, c0, c1); cone(lerp(CART.x + 60, 500, u), lerp(1170, GY - 8, u) - Math.sin(u * Math.PI) * 300, u * 7); }
  else cone(500, GY - 8, Math.PI * 2 * 7 / 7 + .3, Math.min(1, bites / 3));
  // walker: flips at F.walker, runs left off screen (leash dropped)
  const wx0 = 130 + 5 * 14;
  if (t < F.walker) figure({ x: wx0, gy: GY, S: S0 }, walkPose(t * 5.2));
  else { const u = t - F.walker, x = wx0 - u * 520 * clamp(u / .25), j = figure({ x, gy: GY, S: S0, prof: 1, face: -1 }, runPose(t * 16, -1)); shout(j, t, 1); }
  // seller: flips, runs right
  if (t < F.seller) { const sp = rest(); sp.ra = 1.35; figure({ x: CART.x - 10, gy: GY, S: S0 }, sp); }
  else { const u = t - F.seller, x = CART.x - 10 + u * 600 * clamp(u / .25), j = figure({ x, gy: GY, S: S0, prof: 1, face: 1 }, runPose(t * 16 + 1, 1)); shout(j, t, 2); }
  cart(t, seg(t, TL.fire, TL.fire + .5));
  // waver: flips, spins round in panic, then runs off right
  if (t < F.waver) { const vp = rest(); vp.ra = 2.6; figure({ x: 965, gy: GY, S: S0 }, vp); }
  else if (t < 10.2) { const u = t - F.waver, x = 900 + Math.sin(u * 3.2) * 110 + Math.max(0, u - 2.6) * 520, dir = Math.cos(u * 3.2) > 0 || u > 2.6 ? 1 : -1;
    const j = figure({ x, gy: GY, S: S0, prof: 1, face: dir }, runPose(t * 15 + 2, dir)); shout(j, t, 3); }
  // the sprinter (the source of chaos: accent head) crosses left to right
  if (t >= s0 - .05 && t < s1) { const x = lerp(-140, 1240, seg(t, s0, s1)); figure({ x, gy: GY, S: S0, prof: 1, face: 1, accent: 1 }, runPose(t * 22, 1, 0)); }
  if (t >= 9.0 && t < 9.95) { const x = lerp(1240, -140, seg(t, 9.0, 9.9)); figure({ x, gy: GY, S: S0, prof: 1, face: -1, accent: 1 }, runPose(t * 22, -1, 0)); }   // and back again
  // more of the town running and screaming, crossing in both directions
  for (const [t0, dir, v, sz, seed] of [[7.3, -1, 520, .92, 11], [7.9, 1, 470, .88, 12], [8.4, 1, 560, 1, 13], [8.9, -1, 600, .95, 14], [9.5, 1, 500, .9, 15], [10.0, -1, 540, .93, 16]]) {
    if (t < t0) continue; const x = dir > 0 ? -120 + (t - t0) * v : 1200 - (t - t0) * v; if (x < -160 || x > 1240) continue;
    const j = figure({ x, gy: GY + (seed % 2) * 6, S: S0 * sz, prof: 1, face: dir }, runPose(t * 15 + seed, dir)); shout(j, t, seed);
  }
  return D;
}
function camera(t) {
  const [p0, p1] = TL.push;
  const k = ss(seg(t, p0, p1));
  // end framing: the dog's head sits where it walks at t = 0
  let z = lerp(1, 1.6, k), cx = lerp(540, 560, k), cy = lerp(960, 1140, k);
  if (t < TL.card[0]) { z = 1 + .03 * seg(t, 0, 5); }
  let sx = 0, sy = 0;
  if (t > TL.fire && t < TL.fire + .45) { const a = 1 - (t - TL.fire) / .45; sx = (hash(Math.floor(t * 24)) - .5) * 22 * a; sy = (hash(Math.floor(t * 24) + 7) - .5) * 16 * a; }
  return { z, cx: cx + sx, cy: cy + sy };
}
function render(t) {
  t = ((t % TL.dur) + TL.dur) % TL.dur;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (t >= TL.card[0] && t < TL.card[1]) {
    g.fillStyle = '#121216'; g.fillRect(0, 0, W, H);
    g.fillStyle = C.paper; g.font = '600 150px Jost'; g.fillText('day 1:', 90, 1010);
    return;
  }
  g.drawImage(paper, 0, 0);
  const cam = camera(t);
  g.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);
  town(t);
  if (t < TL.card[0]) peace(t); else chaos(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < TL.card[0]) caption();
}
window.DUR = TL.dur;
window.render = render;
window.TEXTS = t => {
  const out = [];
  if (t < TL.card[0]) out.push({ id: 'cap', text: CAPTION.join(' '), x0: 90, y0: 230, x1: 900, y1: 500 });
  if (t >= TL.card[0] && t < TL.card[1]) out.push({ id: 'day1', text: 'day 1:', x0: 90, y0: 880, x1: 560, y1: 1040 });
  if (t < TL.card[0] + 6.6 && !(t >= TL.card[0] && t < TL.card[1])) out.push({ id: 'cart', text: 'ICE CREAM', pass: true, x0: 0, y0: 0, x1: 1, y1: 1 });
  return out;
};
render(0); window.READY = true;
