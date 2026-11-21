// Reference illustrations for "Broad Daylight": value-planned flat drawings, converted to knife strokes by paintRef.
import { KNIFE, BRUSH, DAB } from './engine/impasto.js';
import { Ref, paintRef } from './engine/plate.js';

export const P = pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const EL = (x, y, rx, ry, rot = 0) => c => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
export const RR = (x, y, w, h, r = 0) => c => c.roundRect(x, y, w, h, r);
export const lin = (x0, y0, x1, y1, stops) => c => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
export const rad = (x, y, r0, r1, stops) => c => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
export const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export const PINK = '#ff3d8b', TEAL = '#22d3c5';
const CAR_COLS = ['#8f7a44', '#5a4334', '#4c665e', '#a9a08a', '#5a3030', '#6b6e70', '#7a5a3a', '#3e4c5a'];

// a 1970s sedan, side view, standing on baseline y, centre x, scale s
function car(r, x, y, s, col, seed) {
  const L = 300 * s, hb = 52 * s, wr = 21 * s, by = y - wr * .9;
  r.fill(EL(x, y + 3 * s, L * .56, 9 * s), '#1c1b1d', { dir: 0, maxR: 8 });
  r.fill(c => { c.moveTo(x - L / 2, by); c.lineTo(x - L / 2, by - hb * .55); c.lineTo(x - L * .47, by - hb); c.lineTo(x + L * .47, by - hb); c.lineTo(x + L / 2, by - hb * .5); c.lineTo(x + L / 2, by); c.closePath(); }, col, { dir: 0, maxR: 10 * s + 3 });
  // cabin (boxy greenhouse, long roof)
  const cy0 = by - hb, ch = 44 * s, f = hash(seed) > .5 ? 1 : -1;
  r.fill(P([[x - L * .3 * f, cy0], [x - L * .2 * f, cy0 - ch], [x + L * .2 * f, cy0 - ch], [x + L * .27 * f, cy0]]), col, { dir: 0, maxR: 8 * s + 2 });
  r.fill(P([[x - L * .27 * f, cy0 - 3 * s], [x - L * .19 * f, cy0 - ch + 6 * s], [x + L * .19 * f, cy0 - ch + 6 * s], [x + L * .24 * f, cy0 - 3 * s]]), '#262a2d', { dir: 0, maxR: 6 * s + 2 });
  r.fill(RR(x - 2 * s, cy0 - ch + 5 * s, 6 * s, ch - 7 * s), col, { maxR: 3 });
  r.fill(RR(x - L * .5, by - hb * .52, L, 5 * s), '#c9c6bc', { dir: 0, maxR: 3 });   // chrome line
  for (const k of [-1, 1]) { r.fill(EL(x + k * L * .31, by, wr, wr), '#18171a', { maxR: 6 }); r.fill(EL(x + k * L * .31, by, wr * .45, wr * .45), '#6d6b68', { maxR: 3 }); }
  r.fill(RR(x - L * .17 * f, cy0 - ch + 9 * s, L * .14, 4 * s), '#d4dcda', { dir: 0, maxR: 3 });   // glint
}

function palm(r, x, y, h, lean, seed) {
  const top = [x + lean * h, y - h];
  for (let i = 0; i < 12; i++) {
    const a = i / 12, b = (i + 1) / 12;
    const p0 = [x + lean * h * a * a, y - h * a], p1 = [x + lean * h * b * b, y - h * b];
    r.line(c => { c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); }, '#4d453c', 16 - a * 6, { dir: 90, maxR: 6, group: 9000 + seed });
  }
  for (let k = 0; k < 9; k++) {
    const ang = -Math.PI / 2 + (k - 4) * .38 + (hash(seed + k) - .5) * .2, L = h * (.32 + hash(seed * 3 + k) * .12);
    const mid = [top[0] + Math.cos(ang) * L * .55, top[1] + Math.sin(ang) * L * .55 - L * .12];
    const end = [top[0] + Math.cos(ang) * L, top[1] + Math.sin(ang) * L + L * .35 * Math.abs(Math.cos(ang))];
    r.line(c => { c.moveTo(top[0], top[1]); c.quadraticCurveTo(mid[0], mid[1], end[0], end[1]); }, k % 2 ? '#34402f' : '#2c3628', 14, { maxR: 6, group: 9100 + seed });
  }
}

// ---------------- the parking lot, noon (tilt-down from the sun) ----------------
export const LW = 1400, LH = 3400, HOR = 2060;
export function buildLot() {
  const r = new Ref(LW, LH, .5);
  r.fill(c => c.rect(0, 0, LW, 1760), lin(0, 0, 0, 1760, [[0, '#6f7c7c'], [.35, '#8b9590'], [.8, '#b0ad9b'], [1, '#bcb6a2']]), { dir: 0, maxR: 70, fallback: 0 });
  r.fill(EL(700, 420, 330, 330), rad(700, 420, 150, 330, [[0, '#e9e4d2'], [1, '#a8ad9f']]), { maxR: 30, dir: { radial: [700, 420], off: 90 }, group: 2 });
  r.fill(EL(700, 420, 150, 150), '#fffcf2', { maxR: 14, dir: { radial: [700, 420], off: 90 }, hgt: 1.4 });
  // distant towers in haze
  for (let i = 0; i < 6; i++) { const x = 80 + i * 230 + hash(i) * 60, w = 70 + hash(i + 3) * 60, h = 120 + hash(i + 7) * 180; r.fill(RR(x, 1760 - h, w, h + 10), '#949a92', { dir: 90, maxR: 14, group: 30 }); }
  // the mall: long low block
  r.fill(c => c.rect(0, 1700, LW, 90), '#b4a991', { dir: 0, maxR: 24 });
  r.fill(c => c.rect(0, 1790, LW, 170), '#958b78', { dir: 90, maxR: 24 });
  r.fill(c => c.rect(520, 1655, 360, 70), '#5f7774', { dir: 0, maxR: 14 });               // entrance sign band (blank)
  r.fill(c => c.rect(0, 1960, LW, 100), '#38363a', { dir: 0, maxR: 16 });                // canopy shadow
  for (let i = 0; i < 9; i++) r.fill(c => c.rect(30 + i * 156, 1978, 110, 72), i === 6 ? '#5c4a52' : '#4a5052', { dir: 90, maxR: 8 });
  for (let i = 0; i < 12; i++) r.fill(c => c.rect(i * 120 + 20, 1790, 14, 170), '#7a705f', { dir: 90, maxR: 5 });
  // asphalt
  r.fill(c => c.rect(0, HOR, LW, LH - HOR), lin(0, HOR, 0, LH, [[0, '#4a484a'], [1, '#2c2b2e']]), { dir: 0, maxR: 40, fallback: 0 });
  // parking lines in perspective
  for (let i = -6; i < 16; i++) {
    const x0 = 700 + (i - 5) * 70, x1 = 700 + (i - 5) * 210;
    r.line(c => { c.moveTo(x0, HOR + 40); c.lineTo(x1, LH); }, '#9b978c', 6 + (i % 2), { maxR: 4, group: 60 });
  }
  r.fill(c => c.rect(0, 2330, LW, 8), '#8c887e', { dir: 0, maxR: 4, group: 60 });
  r.fill(c => c.rect(0, 2700, LW, 12), '#8c887e', { dir: 0, maxR: 4, group: 60 });
  palm(r, 140, 2120, 520, -.12, 1); palm(r, 1250, 2110, 560, .1, 2); palm(r, 420, 2090, 330, .05, 3); palm(r, 960, 2085, 300, -.06, 4);
  let s = 0;
  for (let i = 0; i < 6; i++) car(r, 120 + i * 240, 2200, .5, CAR_COLS[s++ % 8], s);
  for (let i = 0; i < 5; i++) car(r, 60 + i * 330 + (i % 2) * 40, 2530, .85, CAR_COLS[s++ % 8], s);
  for (let i = 0; i < 4; i++) car(r, -40 + i * 470, 3000, 1.3, CAR_COLS[s++ % 8], s);
  const st = paintRef(r, { R: [34, 17, 8, 4, 2.2], T: 14, seed: 11 });
  return { strokes: st, ref: r };
}

// ---------------- the mall frontage with the liquor store ----------------
export const FW = 2300, FH = 1920, FACE = 1260, CURB = 1430;
export const WIN = [1250, 820, 260, 380], DOOR = [1535, 840, 120, 400];   // x y w h
export const SIGN = [1265, 650, 400, 120];
export function buildFront() {
  const r = new Ref(FW, FH, .5);
  r.fill(c => c.rect(0, 0, FW, 420), lin(0, 0, 0, 420, [[0, '#7b8683'], [1, '#a9a796']]), { dir: 0, maxR: 60 });
  for (let i = 0; i < 4; i++) palm(r, 200 + i * 640, 430, 260 + hash(i) * 80, (hash(i + 9) - .5) * .2, 10 + i);
  r.fill(c => c.rect(0, 400, FW, 140), '#b3a890', { dir: 0, maxR: 26 });          // parapet
  r.fill(c => c.rect(0, 540, FW, 60), '#3b393c', { dir: 0, maxR: 14 });           // canopy shadow line
  r.fill(c => c.rect(0, 600, FW, FACE - 600), '#8f8573', { dir: 90, maxR: 26 });  // wall
  // storefront bays: windows reflect the hazy sky (mid teal-grey), not black
  const bays = [[60, 'A'], [420, 'B'], [780, 'C'], [1850, 'D']];
  for (const [x] of bays) {
    r.fill(c => c.rect(x, 660, 300, 110), '#6f675a', { dir: 0, maxR: 12 });       // blank sign plates
    r.fill(c => c.rect(x, 820, 300, 400), lin(x, 820, x + 300, 1220, [[0, '#6e8180'], [.5, '#556665'], [1, '#3f4a4b']]), { dir: 70, maxR: 14 });
    r.fill(c => c.rect(x + 146, 820, 8, 400), '#2e2c2e', { maxR: 3 });
  }
  // liquor store
  r.fill(c => c.rect(SIGN[0] - 20, SIGN[1] - 15, SIGN[2] + 40, SIGN[3] + 30), '#3a3436', { dir: 0, maxR: 12 });
  r.fill(c => c.rect(WIN[0], WIN[1], WIN[2], WIN[3]), lin(WIN[0], WIN[1], WIN[0] + WIN[2], WIN[1] + WIN[3], [[0, '#748684'], [.45, '#566968'], [1, '#384446']]), { dir: 65, maxR: 12 });
  for (let i = 0; i < 4; i++) r.fill(c => c.rect(WIN[0] + 20, WIN[1] + 90 + i * 80, WIN[2] - 40, 10), '#4b4440', { dir: 0, maxR: 4, group: 77 });   // shelves inside
  r.fill(c => c.rect(DOOR[0] - 10, DOOR[1] - 10, DOOR[2] + 20, DOOR[3] + 10), '#2b292c', { maxR: 6 });
  r.fill(c => c.rect(DOOR[0], DOOR[1], DOOR[2], DOOR[3]), lin(DOOR[0], DOOR[1], DOOR[0], DOOR[1] + DOOR[3], [[0, '#647675'], [1, '#3a4547']]), { dir: 90, maxR: 10 });
  r.fill(c => c.rect(DOOR[0] + DOOR[2] - 26, DOOR[1] + 190, 14, 50), '#b9b4a6', { maxR: 3 });
  // columns
  for (const x of [380, 740, 1100, 1220, 1690, 1810, 2170]) r.fill(c => c.rect(x, 600, 26, FACE - 600), '#a2977f', { dir: 90, maxR: 6 });
  // sidewalk, curb, road
  r.fill(c => c.rect(0, FACE, FW, CURB - FACE), lin(0, FACE, 0, CURB, [[0, '#8e877a'], [1, '#a29a89']]), { dir: 0, maxR: 26 });
  r.fill(c => c.rect(0, CURB, FW, 22), '#c0b8a4', { dir: 0, maxR: 6 });
  r.fill(c => c.rect(0, CURB + 22, FW, FH - CURB - 22), lin(0, CURB, 0, FH, [[0, '#3c3b3e'], [1, '#262528']]), { dir: 0, maxR: 36 });
  for (let i = 0; i < 9; i++) r.fill(c => c.rect(i * 290 + 40, 1700, 150, 10), '#8a867c', { dir: 0, maxR: 4, group: 88 });
  // two parked car roofs in the near foreground (bottom edge), dark
  car(r, 300, 2010, 1.9, '#4a3a30', 5); car(r, 900, 2030, 1.9, '#3c4a4a', 6);
  const st = paintRef(r, { R: [30, 15, 7, 3.6, 2], T: 14, seed: 21 });
  return { strokes: st, ref: r };
}

// the neon sign: built separately so it can buzz, die and go grey
export function buildSign() {
  const r = new Ref(SIGN[2], SIGN[3], 1);
  r.fill(RR(4, 6, SIGN[2] - 8, SIGN[3] - 12, 10), '#2a1f26', { dir: 0, maxR: 10 });
  r.text('LIQUORS', SIGN[2] / 2, SIGN[3] * .74, '700 84px "Cormorant Garamond"', PINK, { maxR: 3, hgt: 1.3 });
  return { strokes: paintRef(r, { R: [8, 4, 2.2, 1.4], T: 10, seed: 31 }), ref: r };
}

// broken window overlay (aftermath)
export function buildBroken() {
  const r = new Ref(FW, FH, .5);
  const [x, y, w, h] = WIN;
  r.fill(P([[x + 10, y + 12], [x + 120, y + 6], [x + 160, y + 60], [x + 250, y + 30], [x + 252, y + 200], [x + 210, y + 260], [x + 248, y + 370], [x + 90, y + 374], [x + 40, y + 300], [x + 8, y + 330], [x + 12, y + 160], [x + 50, y + 110]]), '#1e1f22', { dir: 0, maxR: 10 });
  for (let i = 0; i < 26; i++) { const gx = x - 60 + hash(i) * (w + 200), gy = FACE + 20 + hash(i + 40) * 140; r.fill(EL(gx, gy, 6 + hash(i + 3) * 10, 3 + hash(i + 5) * 4, hash(i + 7) * 3), '#c9d2cf', { maxR: 3, hgt: 1.3 }); }
  r.fill(c => c.rect(DOOR[0], DOOR[1] + 20, DOOR[2], 140), '#26282a', { maxR: 6 });
  // a dropped shopping bag on the sidewalk
  r.fill(P([[880, 1330], [940, 1322], [950, 1392], [872, 1400]]), '#b49b74', { dir: 90, maxR: 6 });
  return { strokes: paintRef(r, { R: [10, 5, 2.5], T: 10, seed: 41 }), ref: r };
}

// ---------------- the delivery van (moves as a whole) ----------------
export const VW = 420, VH = 320;   // local; wheels' baseline at y = 300, facing left
export function buildVan() {
  const r = new Ref(VW, VH, 1);
  r.fill(EL(210, 304, 200, 12), '#1b1a1c', { dir: 0, maxR: 8 });
  r.fill(c => { c.moveTo(130, 40); c.lineTo(405, 40); c.lineTo(410, 270); c.lineTo(130, 270); c.closePath(); }, '#bfb8a4', { dir: 90, maxR: 14 });      // box
  r.fill(c => c.rect(132, 150, 276, 26), '#5f7b78', { dir: 0, maxR: 6 });   // faded stripe
  r.fill(c => { c.moveTo(20, 270); c.lineTo(18, 190); c.lineTo(40, 170); c.lineTo(70, 100); c.lineTo(130, 96); c.lineTo(130, 270); c.closePath(); }, '#aaa38e', { dir: 0, maxR: 10 });   // cab
  r.fill(P([[48, 170], [76, 112], [122, 110], [122, 170]]), '#24282b', { dir: 0, maxR: 6 });   // cab window
  r.fill(c => c.rect(16, 236, 20, 18), '#d8d2bc', { maxR: 3 });
  r.fill(c => c.rect(10, 258, 130, 12), '#77736a', { dir: 0, maxR: 4 });
  r.line(c => { c.moveTo(250, 60); c.lineTo(250, 262); }, '#8f8876', 4, { maxR: 3 });   // side door seam
  for (const x of [80, 340]) { r.fill(EL(x, 274, 30, 30), '#151417', { maxR: 6 }); r.fill(EL(x, 274, 12, 12), '#5d5b58', { maxR: 3 }); }
  return { strokes: paintRef(r, { R: [12, 6, 3, 1.6], T: 10, seed: 51 }), ref: r };
}

// ---------------- the date title (laid in over the sky) ----------------
export function buildTitle(text, w, h, px, col) {
  const r = new Ref(w, h, 1);
  r.text(text, w / 2, h * .76, `700 ${px}px "Cormorant Garamond"`, col, { maxR: 5, hgt: 1.25 });
  return { strokes: paintRef(r, { R: [8, 4, 2.2, 1.4], T: 10, seed: 61, app: (x) => x / w * .9 }), ref: r };
}

// ---------------- the newspaper ----------------
export const PW = 1200, PH = 2400;
export const PAPER = [80, 110, 1040, 2200];
export function buildPaper() {
  const r = new Ref(PW, PH, .5);
  r.fill(c => c.rect(0, 0, PW, PH), lin(0, 0, PW, PH, [[0, '#2b221d'], [1, '#1b1613']]), { dir: 20, maxR: 50 });
  const [x, y, w, h] = PAPER;
  r.fill(c => c.rect(x, y, w, h), lin(x, y, x + w, y + h, [[0, '#d6ccb4'], [1, '#b9ae95']]), { dir: 90, maxR: 30 });
  r.text('THE EVENING COURIER', 600, 270, '700 84px "Cormorant Garamond"', '#1d1a18', { maxR: 4 });
  r.fill(c => c.rect(x + 40, 305, w - 80, 7), TEAL, { dir: 0, maxR: 3, group: 401 });
  r.fill(c => c.rect(x + 40, 318, w - 80, 3), '#1d1a18', { dir: 0, maxR: 2, group: 402 });
  r.text('MIAMI  ·  THURSDAY, JULY 12, 1979  ·  FINAL', 600, 370, '600 30px "Cormorant Garamond"', '#2a2522', { maxR: 2 });
  r.fill(c => c.rect(x + 40, 395, w - 80, 3), '#1d1a18', { dir: 0, maxR: 2, group: 402 });
  r.text('Gunmen open fire in mall liquor store', 600, 1000, 'italic 600 52px "Cormorant Garamond"', '#2a2522', { maxR: 3 });
  // photo block: the storefront, in greys
  const ph = [140, 1060, 560, 420];
  r.fill(c => c.rect(...ph), '#7a766e', { dir: 0, maxR: 16 });
  r.fill(c => c.rect(ph[0], ph[1], ph[2], 150), '#9a958a', { dir: 0, maxR: 12 });
  r.fill(c => c.rect(ph[0] + 60, ph[1] + 170, 200, 170), '#2e2d2e', { dir: 0, maxR: 8 });
  r.fill(c => c.rect(ph[0] + 290, ph[1] + 180, 70, 160), '#3c3b3c', { maxR: 6 });
  r.fill(c => c.rect(ph[0] + 60, ph[1] + 120, 330, 36), '#4a4748', { dir: 0, maxR: 6 });
  r.fill(c => c.rect(ph[0], ph[1] + 350, ph[2], 70), '#5f5c57', { dir: 0, maxR: 10 });
  for (let i = 0; i < 3; i++) r.fill(c => c.rect(ph[0], ph[1] + ph[3] + 24 + i * 22, ph[2] * (i === 2 ? .6 : 1), 8), '#6b645a', { dir: 0, maxR: 3, group: 500 });
  // body columns: unreadable grey bars
  const cols = [[740, 1060, 320], [140, 1580, 280], [460, 1580, 280], [780, 1580, 280]];
  let g = 0;
  for (const [cx, cy, cw] of cols) for (let i = 0; i < (cy > 1500 ? 28 : 18); i++) { const L = cw * (i % 7 === 6 ? .55 : .92 + hash(g++) * .08); r.fill(c => c.rect(cx, cy + i * 24, L, 9), '#5c564e', { dir: 0, maxR: 3, group: 600 }); }
  const st = paintRef(r, { R: [28, 14, 7, 3.4, 1.8], T: 12, seed: 71, app: (ux, uy) => uy / PH * .85 });
  return { strokes: st, ref: r };
}
export function buildWord(word, w, h, px) {
  const r = new Ref(w, h, 1);
  r.text(word, w / 2, h * .8, `700 ${px}px "Cormorant Garamond"`, '#17130f', { maxR: 5, hgt: 1.35 });
  return { strokes: paintRef(r, { R: [10, 5, 2.6, 1.5], T: 10, seed: 81, app: (x) => x / w * .55 }), ref: r };
}

// ---------------- the neon skyline at night ----------------
export const SW = 1200, SH = 3000, WATER = 1520;
export const TOWERS = [[30, 1050, 150], [190, 820, 130], [330, 980, 110], [450, 640, 170], [630, 900, 120], [760, 760, 150], [920, 1010, 110], [1040, 880, 140]];   // x, top, w
export function buildSky() {
  const r = new Ref(SW, SH, .5);
  r.fill(c => c.rect(0, 0, SW, WATER), lin(0, 0, 0, WATER, [[0, '#0b0a12'], [.6, '#1d1528'], [.92, '#3a2140'], [1, '#2a1b32']]), { dir: 0, maxR: 70 });
  // far skyline layer
  for (let i = 0; i < 14; i++) { const x = i * 90 - 20, h = 140 + hash(i + 50) * 260; r.fill(c => c.rect(x, WATER - h, 80, h), '#1c1a26', { dir: 90, maxR: 14, group: 700 }); }
  TOWERS.forEach(([x, top, w], i) => {
    r.fill(c => c.rect(x, top, w, WATER - top), i % 2 ? '#12131b' : '#171621', { dir: 90, maxR: 18 });
    for (let yy = top + 40; yy < WATER - 40; yy += 46) for (let xx = x + 16; xx < x + w - 16; xx += 30) {
      const hv = hash(i * 1000 + yy * 3 + xx); if (hv > .3) continue;
      r.fill(c => c.rect(xx, yy, 14, 18), hv < .06 ? '#2fa59c' : hv < .1 ? '#b23e72' : '#7d6a52', { maxR: 4, group: 800 + i });
    }
  });
  // shore palms
  palm(r, 70, WATER + 20, 420, .15, 21); palm(r, 1130, WATER + 10, 480, -.12, 22);
  r.fill(c => c.rect(0, WATER, SW, SH - WATER), lin(0, WATER, 0, SH, [[0, '#121521'], [1, '#07080d']]), { dir: 0, maxR: 50 });
  return { strokes: paintRef(r, { R: [32, 16, 8, 4, 2.2], T: 12, seed: 91 }), ref: r };
}
