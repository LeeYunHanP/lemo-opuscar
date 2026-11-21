
// ======================= new tapes for the long film =======================
const gr = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
function palmS(c, x, y, h, lean = .1, col = '#1a1c18') {
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round';
  c.lineWidth = Math.max(2, h * .035); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * h * .3, y - h * .5, x + lean * h, y - h); c.stroke();
  const tx = x + lean * h, ty = y - h; c.lineWidth = Math.max(1.5, h * .025);
  for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * .5, L = h * .32; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - L * .2, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * .35 * Math.abs(Math.cos(a))); c.stroke(); }
}
function person(c, x, y, h, col, ph = 0, run = 0, f = 1) {   // small silhouette, no face
  c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round';
  const sw = Math.sin(ph) * (run ? .5 : .25);
  c.lineWidth = h * .12;
  c.beginPath(); c.moveTo(x, y - h * .45); c.lineTo(x + Math.sin(sw) * h * .3, y); c.moveTo(x, y - h * .45); c.lineTo(x - Math.sin(sw) * h * .3, y); c.stroke();
  c.beginPath(); c.roundRect(x - h * .1 + f * run * h * .05, y - h * .82, h * .2, h * .42, h * .06); c.fill();
  c.beginPath(); c.arc(x + f * run * h * .08, y - h * .9, h * .085, 0, 7); c.fill();
}
function car70(c, x, y, s, col, f = 1, lights = 0) {
  const L = 150 * s, hb = 26 * s;
  c.fillStyle = col; c.beginPath(); c.roundRect(x - L / 2, y - hb - 10 * s, L, hb, 4 * s); c.fill();
  c.beginPath(); c.moveTo(x - L * .28 * f, y - hb - 10 * s); c.lineTo(x - L * .18 * f, y - hb - 30 * s); c.lineTo(x + L * .2 * f, y - hb - 30 * s); c.lineTo(x + L * .28 * f, y - hb - 10 * s); c.fill();
  c.fillStyle = 'rgba(30,34,38,.85)'; c.beginPath(); c.moveTo(x - L * .25 * f, y - hb - 11 * s); c.lineTo(x - L * .17 * f, y - hb - 27 * s); c.lineTo(x + L * .18 * f, y - hb - 27 * s); c.lineTo(x + L * .25 * f, y - hb - 11 * s); c.fill();
  c.fillStyle = '#141416'; for (const k of [-1, 1]) { c.beginPath(); c.arc(x + k * L * .32, y - 9 * s, 10 * s, 0, 7); c.fill(); }
  if (lights) { c.fillStyle = '#ff3020'; c.fillRect(x + L / 2 * f - 6 * s * f - (f > 0 ? 0 : 0), y - hb - 4 * s, 6 * s, 6 * s); }
}
function boxVan(c, x, y, s, col = '#d8d2c0', sign = true) {   // facing left; (x,y) = rear wheel ground point
  c.fillStyle = '#1b1a1c'; c.beginPath(); c.ellipse(x - 90 * s, y, 120 * s, 8 * s, 0, 0, 7); c.fill();
  c.fillStyle = col; c.fillRect(x - 150 * s, y - 150 * s, 200 * s, 125 * s);
  c.fillStyle = '#b9b2a0'; c.beginPath(); c.moveTo(x - 150 * s, y - 25 * s); c.lineTo(x - 150 * s, y - 100 * s); c.lineTo(x - 185 * s, y - 100 * s); c.lineTo(x - 215 * s, y - 60 * s); c.lineTo(x - 215 * s, y - 25 * s); c.fill();
  c.fillStyle = '#23272a'; c.beginPath(); c.moveTo(x - 155 * s, y - 62 * s); c.lineTo(x - 155 * s, y - 95 * s); c.lineTo(x - 182 * s, y - 95 * s); c.lineTo(x - 205 * s, y - 62 * s); c.fill();
  c.fillStyle = '#121214'; for (const wx of [x - 175 * s, x + 10 * s]) { c.beginPath(); c.arc(wx, y - 14 * s, 15 * s, 0, 7); c.fill(); }
  if (sign) {
    c.fillStyle = '#b8402e'; c.font = `700 ${22 * s}px "Plex Cond"`; c.textAlign = 'center'; c.fillText('HAPPY TIME', x - 50 * s, y - 110 * s);
    c.fillStyle = '#3a4c7a'; c.font = `400 ${14 * s}px "Plex Cond"`; c.fillText('COMPLETE PARTY SUPPLY', x - 50 * s, y - 88 * s); c.textAlign = 'left';
  }
}
function skyline(c, y, seed, n, x0, x1, col, lit = 0, t = 0) {
  for (let i = 0; i < n; i++) {
    const w = 20 + hash(seed + i) * 40, x = x0 + (x1 - x0) * i / n + hash(seed + i * 3) * 10, h = 30 + hash(seed + i * 7) * 120;
    c.fillStyle = col; c.fillRect(x, y - h, w, h);
    if (lit) for (let yy = y - h + 6; yy < y - 4; yy += 8) for (let xx = x + 3; xx < x + w - 3; xx += 6) { const r = hash(seed * 7 + i * 131 + yy * 3 + xx); if (r < lit) { c.fillStyle = r < lit * .12 ? '#e0508a' : r < lit * .22 ? '#40d0c4' : '#e8d49a'; c.fillRect(xx, yy, 3, 3); } }
  }
}
function water(c, y0, y1, top, bot, t, glint = 'rgba(220,225,215,.18)', n = 60) {
  c.fillStyle = gr(c, y0, y1, [[0, top], [1, bot]]); c.fillRect(-200, y0, SW + 400, y1 - y0 + 300);
  for (let i = 0; i < n; i++) { const yy = y0 + (i / n) ** 1.6 * (y1 - y0), w = 10 + (yy - y0) * .4, x = (hash(i) * (SW + 300) + t * (6 + hash(i + 2) * 10)) % (SW + 300) - 150; c.fillStyle = glint; c.fillRect(x, yy, w, 1 + (yy - y0) * .01); }
}
// ---- the scenes. Each draws into lx (pre-focus layer) and returns an autofocus blur amount ----
function causewayShot(u, h, k = 0) {   // night drive across the bay
  camXf(lx, h, 1);
  lx.fillStyle = gr(lx, 0, 300, [[0, '#05060c'], [1, '#121626']]); lx.fillRect(-100, -100, SW + 200, 420);
  skyline(lx, 290, 11, 22, 60, 660, '#0b0d16', .32, u);
  for (let i = 0; i < 30; i++) { const x = 60 + hash(i * 5) * 600, col = hash(i) < .2 ? 'rgba(230,80,140,' : hash(i) < .35 ? 'rgba(60,210,200,' : 'rgba(230,210,150,';   // reflections
    for (let k2 = 0; k2 < 6; k2++) { lx.fillStyle = col + (.35 - k2 * .05) + ')'; lx.fillRect(x + Math.sin(u * 2 + i + k2) * 3, 300 + k2 * 14, 3, 8); } }
  lx.fillStyle = '#04050a'; lx.fillRect(-100, 296, SW + 200, 2);
  water(lx, 298, 420, '#070910', '#05060a', u, 'rgba(120,130,160,.08)', 30);
  // the causeway: lamps passing right to left, guard rail
  const sp = 260;
  for (let i = -2; i < 8; i++) { const x = ((i * 160 - u * sp) % 1120 + 1120) % 1120 - 200;
    lx.fillStyle = '#0d0d10'; lx.fillRect(x, 170, 5, 260); lx.fillRect(x - 30, 170, 34, 5);
    const g2 = lx.createRadialGradient(x - 26, 176, 1, x - 26, 176, 30); g2.addColorStop(0, 'rgba(255,214,150,.75)'); g2.addColorStop(1, 'rgba(255,190,120,0)'); lx.fillStyle = g2; lx.fillRect(x - 60, 146, 70, 70); }
  lx.fillStyle = '#2a2a2c'; lx.fillRect(-100, 420, SW + 200, 30); lx.fillStyle = '#16161a'; lx.fillRect(-100, 450, SW + 200, 200);
  for (let i = 0; i < 12; i++) { const x = ((i * 90 - u * sp * 1.6) % 1080 + 1080) % 1080 - 180; lx.fillStyle = '#3a3a3c'; lx.fillRect(x, 415, 6, 40); }
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.fillStyle = '#060607'; lx.beginPath(); lx.moveTo(-10, 480); lx.quadraticCurveTo(360, 440, 730, 480); lx.lineTo(730, 560); lx.lineTo(-10, 560); lx.fill();   // dashboard
  return 0;
}
function neonShot(u, h) {
  camXf(lx, h, 1.05, 360 + u * 6, 270);
  lx.fillStyle = '#07070c'; lx.fillRect(-200, -200, SW + 400, SH + 400);
  const F = [[30, '#1a1620'], [200, '#16141c'], [370, '#1b1822'], [540, '#14131a']];
  F.forEach(([x, col]) => { lx.fillStyle = col; lx.fillRect(x, 60, 165, 290); lx.fillStyle = '#0c0c10'; lx.fillRect(x + 20, 210, 125, 140); });
  const neon = (txt, x, y, col, size, flick = 1) => { lx.save(); lx.font = `700 ${size}px "Plex Cond"`; lx.shadowColor = col; lx.shadowBlur = 18; lx.fillStyle = flick ? col : '#3a2230'; lx.fillText(txt, x, y); lx.shadowBlur = 0; lx.fillStyle = flick ? '#fff4fa' : '#3a2230'; lx.globalAlpha = .55; lx.fillText(txt, x, y); lx.restore(); };
  neon('MOTEL', 50, 140, '#ff4a9a', 44); neon('BAR', 240, 170, '#3ae0d0', 52, hash(Math.floor(u * 8)) > .1); neon('OPEN', 400, 160, '#ff4a9a', 40); neon('LIQUOR', 560, 130, '#3ae0d0', 30);
  // wet street with smeared reflections
  lx.fillStyle = '#0a0a0e'; lx.fillRect(-200, 350, SW + 400, 300);
  for (const [x, col] of [[90, '255,74,154'], [270, '58,224,208'], [430, '255,74,154'], [600, '58,224,208']]) for (let k2 = 0; k2 < 10; k2++) { lx.fillStyle = `rgba(${col},${.22 - k2 * .02})`; lx.fillRect(x + Math.sin(u * 3 + k2) * 4, 360 + k2 * 16, 60 - k2 * 3, 6); }
  car70(lx, 520 - u * 4, 420, 1.3, '#1c1c22', -1);
  return 0;
}
function harborShot(u, h, dusk = true) {
  camXf(lx, h, 1.05, 340 + u * 5, 270);
  lx.fillStyle = gr(lx, 0, 250, [[0, '#3a3450'], [.6, '#c0705a'], [1, '#e0a070']]); lx.fillRect(-200, -200, SW + 400, 460);
  lx.fillStyle = '#e8b880'; lx.beginPath(); lx.arc(470, 232, 26, 0, 7); lx.fill();
  water(lx, 250, 560, '#7a5a5a', '#2a2430', u, 'rgba(240,190,130,.25)', 50);
  lx.fillStyle = '#1e1a22'; lx.fillRect(-200, 236, SW + 400, 16);   // far shore
  for (let i = 0; i < 16; i++) { const x = -40 + i * 52 + hash(i) * 20, y = 300 + (i % 3) * 30, s = .5 + (i % 3) * .25, bob = Math.sin(u * 1.3 + i) * 2;
    lx.fillStyle = '#18151c'; lx.beginPath(); lx.moveTo(x - 30 * s, y + bob); lx.lineTo(x + 30 * s, y + bob); lx.lineTo(x + 22 * s, y + 12 * s + bob); lx.lineTo(x - 24 * s, y + 12 * s + bob); lx.fill();
    lx.fillRect(x - 10 * s, y - 14 * s + bob, 18 * s, 14 * s); lx.fillRect(x - 1, y - 60 * s + bob, 2, 60 * s); }
  lx.fillStyle = '#121014'; lx.fillRect(-200, 470, SW + 400, 120); for (let i = 0; i < 12; i++) lx.fillRect(i * 70, 440, 8, 40);   // the dock in front
  return 0;
}
function highwayShot(u, h, jam = false) {
  camXf(lx, h, 1);
  lx.fillStyle = gr(lx, 0, 230, [[0, '#7fb0d0'], [1, '#cfe0e4']]); lx.fillRect(-100, -100, SW + 200, 340);
  for (let i = 0; i < 6; i++) { lx.fillStyle = 'rgba(255,255,255,.7)'; lx.beginPath(); lx.ellipse(80 + i * 130 + u * 3, 70 + (i % 2) * 40, 50, 14, 0, 0, 7); lx.fill(); }
  water(lx, 230, 560, '#59b8b8', '#2f8c98', u, 'rgba(255,255,255,.25)', 70);
  // the old bridge alongside, with gaps
  for (let i = 0; i < 14; i++) { const x = 420 + i * 30 - u * 2, w = 26; if (i % 5 === 3) continue; lx.fillStyle = '#b7b1a2'; lx.fillRect(x, 222 + i * 1.5, w, 4); lx.fillRect(x + 10, 226 + i * 1.5, 3, 12); }
  // the road: converging to the horizon
  lx.fillStyle = '#5c5b58'; lx.beginPath(); lx.moveTo(340, 230); lx.lineTo(380, 230); lx.lineTo(640, 560); lx.lineTo(40, 560); lx.fill();
  lx.strokeStyle = '#d8d0b8'; lx.lineWidth = 3; lx.beginPath(); lx.moveTo(338, 230); lx.lineTo(30, 560); lx.moveTo(382, 230); lx.lineTo(650, 560); lx.stroke();
  if (!jam) for (let i = 0; i < 10; i++) { const z = ((i / 10 + u * .45) % 1), y = 232 + z * z * 330, w = 1 + z * 4, L = 2 + z * z * 40; lx.fillStyle = '#e8d27a'; lx.fillRect(360 - w / 2, y, w, L); }
  else for (let i = 0; i < 26; i++) { const z = 1 - i / 26, y = 232 + z * z * 300, s = .08 + z * z * 1.4, x = 330 + (i % 2) * 30 * (.2 + z) + z * 40;
    car70(lx, x, y + 12 * s, s, ['#8a3a32', '#3a5a6a', '#d0c8b0', '#6a6a30'][i % 4], 1); lx.fillStyle = `rgba(255,40,30,${.6 + .4 * (Math.floor(u * 2 + i) % 3 === 0)})`; lx.fillRect(x - 72 * s, y - 22 * s, 8 * s + 1, 5 * s + 1); lx.fillRect(x + 64 * s, y - 22 * s, 8 * s + 1, 5 * s + 1); }
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.fillStyle = '#121212'; lx.beginPath(); lx.moveTo(-10, 500); lx.quadraticCurveTo(360, 470, 730, 500); lx.lineTo(730, 560); lx.lineTo(-10, 560); lx.fill();
  return 0;
}
function lotScene(u, h, o = {}) {   // a 1970s mall parking lot at noon
  const z = o.zoom || 1, fx = o.fx ?? 360, fy = o.fy ?? 270;
  camXf(lx, h, z, fx, fy);
  lx.fillStyle = gr(lx, -200, 200, [[0, '#9fb3bc'], [1, '#e6e0cc']]); lx.fillRect(-400, -400, SW + 800, 600);
  palmS(lx, 40, 200, 160, .1, '#4a4c3c'); palmS(lx, 680, 196, 150, -.1, '#4a4c3c');
  lx.fillStyle = '#b5aa90'; lx.fillRect(-400, 120, SW + 800, 80); lx.fillStyle = '#7a7262'; lx.fillRect(-400, 186, SW + 800, 16);
  lx.fillStyle = '#5d7a78'; lx.fillRect(250, 132, 220, 26);   // blank sign band
  for (let i = 0; i < 10; i++) { lx.fillStyle = '#3c3e40'; lx.fillRect(-60 + i * 90, 160, 60, 26); }
  if (o.shop) {   // the liquor store, far across the lot
    lx.fillStyle = '#4a3e38'; lx.fillRect(310, 138, 100, 16); lx.fillStyle = '#d8c8a8'; lx.font = '700 12px "Plex Cond"'; lx.fillText('LIQUORS', 336, 151);
    lx.fillStyle = o.broken ? '#151618' : '#56686a'; lx.fillRect(312, 160, 60, 26);
    if (o.flash) { const g2 = lx.createRadialGradient(340, 172, 1, 340, 172, 40); g2.addColorStop(0, 'rgba(255,250,220,1)'); g2.addColorStop(1, 'rgba(255,240,200,0)'); lx.fillStyle = g2; lx.fillRect(300, 130, 80, 80); }
  }
  lx.fillStyle = '#4a4848'; lx.fillRect(-400, 202, SW + 800, 600);
  for (let i = -6; i < 16; i++) { lx.strokeStyle = 'rgba(220,215,200,.6)'; lx.lineWidth = 2; lx.beginPath(); lx.moveTo(360 + (i - 5) * 40, 210); lx.lineTo(360 + (i - 5) * 120, 560); lx.stroke(); }
  const cols = ['#8f7a44', '#5a4334', '#4c665e', '#a9a08a', '#6a3030', '#6b6e70', '#3e4c5a'];
  for (let i = 0; i < 7; i++) if (!(o.gap && i === 3)) car70(lx, -20 + i * 120, 236, .5, cols[i % 7], i % 2 ? 1 : -1);
  for (let i = 0; i < 5; i++) car70(lx, -60 + i * 190, 330, .9, cols[(i + 3) % 7], i % 2 ? -1 : 1);
  (o.people || []).forEach(p => person(lx, p[0], p[1], p[2], p[3] || '#2a2a2e', p[4] || 0, p[5] || 0, p[6] || 1));
  if (o.after) o.after();
  return o.blur || 0;
}
function vanShot(u, h, phase) {   // phase 0: pulls in; 1: close on the sign
  const z = phase ? lerp(1.4, 2.2, ss(u / 4)) : 1.15;
  return lotScene(u, h, { zoom: z, fx: phase ? 330 : 360, fy: phase ? 360 : 300, after: () => { const x = phase ? 420 : lerp(900, 420, 1 - Math.pow(1 - clamp(u / 3.2), 3)); boxVan(lx, x, 430, .9); }, blur: phase ? Math.max(0, 2.2 - u * 1.6) : 0 });
}
function shopFarShot(u, h, a) {   // from across the lot, far: gunfire, people running, the broken window
  const T = a + u, g = TL.gunfire, flash = T > g && T < g + 1.4 && hash(Math.floor(T * 24)) > .55;
  const run = T > g + .3;
  const ppl = [];
  for (let i = 0; i < 7; i++) { const st = 360 + (i - 3) * 30, d = run ? (T - g - .3) * (40 + i * 6) * (i % 2 ? 1 : -1) : Math.sin(T + i) * 4; ppl.push([st + d, 196 + (i % 3) * 3, 18, '#2a2a2e', T * (run ? 14 : 6) + i, run ? 1 : 0, i % 2 ? 1 : -1]); }
  return lotScene(u, h, { zoom: lerp(2.3, 2.6, u / 14), fx: 345, fy: 210, shop: true, flash, broken: T > g + .15, people: ppl, blur: Math.abs(Math.sin(u * 1.3)) * .6 });
}
function vanAwayShot(u, h) { return lotScene(u, h, { zoom: 1.3, fx: 380, fy: 260, after: () => boxVan(lx, lerp(560, -260, Math.pow(clamp(u / 3.2), 1.6)), 290, .55, '#d8d2c0') }); }
function vanParkedShot(u, h) {   // dusk, the far end of the lot: the van, a patrol car, tape
  camXf(lx, h, 1.1, 360, 290);
  lx.fillStyle = gr(lx, -100, 240, [[0, '#2c3248'], [1, '#c07a5a']]); lx.fillRect(-300, -300, SW + 600, 560);
  palmS(lx, 600, 250, 200, -.1, '#121214'); palmS(lx, 90, 248, 170, .12, '#121214');
  lx.fillStyle = '#2a2828'; lx.fillRect(-300, 246, SW + 600, 600);
  boxVan(lx, 330, 400, 1.1, '#9a948a');
  car70(lx, 600, 420, 1.1, '#20242a', -1);
  const on = Math.floor(u * 4) % 2; lx.fillStyle = on ? '#ff2a2a' : '#2a6aff'; lx.fillRect(570, 372, 24, 6);
  lx.globalCompositeOperation = 'lighter'; const g2 = lx.createRadialGradient(582, 375, 2, 582, 375, 120); g2.addColorStop(0, on ? 'rgba(255,40,40,.5)' : 'rgba(40,100,255,.5)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g2; lx.fillRect(460, 255, 240, 240); lx.globalCompositeOperation = 'source-over';
  lx.strokeStyle = '#d8c030'; lx.lineWidth = 3; lx.beginPath(); lx.moveTo(-50, 430); lx.quadraticCurveTo(200, 446, 470, 436); lx.stroke();
  return 0;
}
function paperRack(u, h) {   // a newspaper box on the sidewalk: invented mastheads
  const z = lerp(1, 1.5, ss(u / 18)), fy = lerp(270, 250, ss(u / 18));
  camXf(lx, h, z, 360, fy);
  lx.fillStyle = '#9a9384'; lx.fillRect(-300, -300, SW + 600, SH + 600);
  lx.fillStyle = '#3a5a4a'; lx.fillRect(110, 40, 500, 500); lx.fillStyle = '#1a2a22'; lx.fillRect(130, 60, 460, 300);
  const P = [['THE EVENING COURIER', 'BLOODIEST SUMMER', 150, 80, -.02], ['BAY CITY POST', 'COCAINE COWBOYS', 370, 90, .015]];
  P.forEach(([m, hl, x, y, r]) => { lx.save(); lx.translate(x + 100, y + 130); lx.rotate(r); lx.fillStyle = '#ddd6c2'; lx.fillRect(-100, -130, 200, 260);
    lx.fillStyle = '#1c1a18'; lx.font = '700 15px "Plex Cond"'; lx.textAlign = 'center'; lx.fillText(m, 0, -108); lx.fillRect(-90, -100, 180, 2);
    lx.font = '700 30px "Plex Cond"'; const wds = hl.split(' '); wds.forEach((w, i) => lx.fillText(w, 0, -64 + i * 32));
    lx.fillStyle = '#6a645a'; lx.fillRect(-88, -20, 100, 70); for (let i = 0; i < 9; i++) lx.fillRect(20, -18 + i * 8, 68, 3); for (let i = 0; i < 6; i++) lx.fillRect(-88, 60 + i * 9, 176, 3); lx.restore(); });
  lx.textAlign = 'left';
  lx.fillStyle = 'rgba(255,255,255,.08)'; lx.fillRect(130, 60, 460, 40);   // glass
  return u < 1 ? (1 - u) * 2.5 : 0;
}
function truckShot(u, h) {   // night, a loading dock under a sodium lamp, a refrigerated trailer
  camXf(lx, h, 1.05, 360 + u * 3, 270);
  lx.fillStyle = '#0a0a0c'; lx.fillRect(-200, -200, SW + 400, SH + 400);
  lx.fillStyle = '#2a2622'; lx.fillRect(-200, 60, SW + 400, 300); for (let i = 0; i < 4; i++) { lx.fillStyle = '#16140f'; lx.fillRect(40 + i * 170, 200, 120, 160); }
  const g2 = lx.createRadialGradient(360, 70, 4, 360, 70, 380); g2.addColorStop(0, 'rgba(255,170,70,.55)'); g2.addColorStop(1, 'rgba(255,150,60,0)'); lx.fillStyle = g2; lx.fillRect(-200, -200, SW + 400, SH + 400);
  lx.fillStyle = '#ffd28a'; lx.fillRect(350, 64, 20, 8);
  lx.fillStyle = '#1e1c1a'; lx.fillRect(-200, 360, SW + 400, 300);
  lx.fillStyle = '#c8c2b4'; lx.fillRect(140, 210, 440, 160); lx.fillStyle = '#8a857a'; lx.fillRect(140, 210, 440, 8); lx.fillRect(560, 190, 60, 50);   // trailer + reefer unit
  for (let i = 0; i < 10; i++) { lx.fillStyle = 'rgba(80,76,68,.5)'; lx.fillRect(150 + i * 43, 220, 2, 140); }
  lx.fillStyle = '#121214'; for (const x of [200, 250, 480, 530]) { lx.beginPath(); lx.arc(x, 378, 18, 0, 7); lx.fill(); }
  lx.fillStyle = 'rgba(200,210,220,.06)'; for (let i = 0; i < 5; i++) { const yy = 200 - ((u * 20 + i * 30) % 120); lx.beginPath(); lx.arc(590 + Math.sin(u + i) * 8, yy, 14 + i * 3, 0, 7); lx.fill(); }   // the unit's breath
  return 0;
}
function magazineShot(u, h) {   // top-down: a coffee table; a magazine (no real masthead), PARADISE LOST? legible
  camXf(lx, h, lerp(1, 1.3, ss(u / 6)), 360, 270);
  lx.fillStyle = '#4a3a2c'; lx.fillRect(-300, -300, SW + 600, SH + 600);
  for (let i = 0; i < 20; i++) { lx.fillStyle = `rgba(30,20,12,${.1 + hash(i) * .1})`; lx.fillRect(-300, i * 34 - 100, SW + 600, 3); }
  lx.save(); lx.translate(370, 270); lx.rotate(-.08);
  lx.fillStyle = '#e8e4da'; lx.fillRect(-150, -200, 300, 400);
  lx.fillStyle = '#20303a'; lx.fillRect(-138, -188, 276, 376);
  lx.fillStyle = gr(lx, -100, 160, [[0, '#d07048'], [1, '#30203a']]); lx.fillRect(-138, -110, 276, 298);
  for (let i = 0; i < 9; i++) { lx.fillStyle = '#120e16'; const w = 18 + hash(i) * 22, hh = 40 + hash(i + 3) * 120; lx.fillRect(-130 + i * 30, 188 - hh, w, hh); }
  palmS(lx, -100, 188, 150, .1, '#0c0a10'); palmS(lx, 110, 188, 120, -.12, '#0c0a10');
  lx.fillStyle = 'rgba(230,228,220,.35)'; lx.fillRect(-120, -176, 240, 50);   // a masthead block, unreadable
  lx.fillStyle = '#f4f0e6'; lx.font = '700 40px "Plex Cond"'; lx.textAlign = 'center'; lx.fillText('PARADISE', 0, -50); lx.fillText('LOST?', 0, -8); lx.textAlign = 'left';
  lx.restore();
  lx.fillStyle = '#9a9488'; lx.beginPath(); lx.arc(120, 420, 40, 0, 7); lx.fill(); lx.fillStyle = '#5a5248'; lx.beginPath(); lx.arc(120, 420, 26, 0, 7); lx.fill();   // ashtray
  return u < 1.2 ? (1.2 - u) * 2 : 0;
}
function embassyShot(u, h, a) {   // a white wall and iron fence, palms, the garden filling with people
  const T = a + u;
  camXf(lx, h, 1.1, 360 + u * 3, 270);
  lx.fillStyle = gr(lx, -100, 200, [[0, '#8aa8c0'], [1, '#dcd8c8']]); lx.fillRect(-300, -300, SW + 600, 520);
  palmS(lx, 140, 260, 220, .08, '#2e3a28'); palmS(lx, 520, 262, 240, -.1, '#2e3a28'); palmS(lx, 330, 250, 180, .02, '#2e3a28');
  lx.fillStyle = '#6a7a52'; lx.fillRect(-300, 250, SW + 600, 120);   // garden
  const n = Math.floor(lerp(12, 150, seg(T, TL.crowd[0], TL.crowd[1])));
  for (let i = 0; i < n; i++) person(lx, (hash(i * 3) * 900 - 90), 270 + hash(i * 7) * 90, 30 + hash(i) * 10, i % 3 ? '#2a2826' : '#3a3430', T * 2 + i);
  lx.fillStyle = '#e6e0d0'; lx.fillRect(-300, 360, 260, 120); lx.fillRect(460, 360, 600, 120);   // wall either side of the gate
  lx.strokeStyle = '#1a1a1a'; lx.lineWidth = 4; for (let x = -300; x < SW + 300; x += 18) { lx.beginPath(); lx.moveTo(x, 250); lx.lineTo(x, 360); lx.stroke(); }
  lx.fillRect(-300, 256, SW + 600, 4);
  if (T > TL.bus) {   // a bus nosed through the gate
    lx.save(); lx.translate(330, 400); lx.rotate(-.12); lx.fillStyle = '#c8b070'; lx.fillRect(-150, -60, 300, 70); lx.fillStyle = '#2a2c2e'; for (let i = 0; i < 6; i++) lx.fillRect(-135 + i * 46, -50, 36, 24); lx.fillStyle = '#121212'; lx.beginPath(); lx.arc(-100, 12, 16, 0, 7); lx.arc(100, 12, 16, 0, 7); lx.fill(); lx.restore();
  }
  lx.fillStyle = '#5a5850'; lx.fillRect(-300, 480, SW + 600, 200);
  return 0;
}
function boatShot(u, h) {   // from a crowded deck: the straits, a line of small boats
  const bob = Math.sin(u * 1.1) * 14, roll = Math.sin(u * .8) * .05;
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.translate(360 + h.x, 270 + h.y + bob); lx.rotate(roll + h.r); lx.translate(-360, -270);
  lx.fillStyle = gr(lx, -100, 230, [[0, '#8aa6c4'], [1, '#e8e6dc']]); lx.fillRect(-300, -300, SW + 600, 530);
  water(lx, 228, 600, '#3c6a88', '#1e3a50', u, 'rgba(255,255,255,.3)', 80);
  for (let i = 0; i < 9; i++) { const x = 60 + i * 80 + Math.sin(u * .5 + i) * 6 - u * 2, y = 232 + (i % 3) * 6, s = .22 + (i % 3) * .06;
    lx.fillStyle = i % 2 ? '#e8e4dc' : '#5a5a5a'; lx.beginPath(); lx.moveTo(x - 40 * s, y); lx.lineTo(x + 40 * s, y); lx.lineTo(x + 30 * s, y + 10 * s); lx.lineTo(x - 32 * s, y + 10 * s); lx.fill(); lx.fillRect(x - 10 * s, y - 14 * s, 20 * s, 14 * s); }
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.fillStyle = '#d8d4c8'; lx.fillRect(-20, 470 - bob * .3, 760, 14); for (let i = 0; i < 9; i++) lx.fillRect(i * 90, 470 - bob * .3, 8, 120);   // deck rail
  for (let i = 0; i < 5; i++) { lx.fillStyle = '#1c1a1a'; lx.beginPath(); lx.ellipse(40 + i * 160 + Math.sin(u + i) * 6, 560, 46, 70, 0, 0, 7); lx.fill(); lx.beginPath(); lx.arc(40 + i * 160 + Math.sin(u + i) * 6, 486, 26, 0, 7); lx.fill(); }   // backs of heads and shoulders
  return 0;
}
function dockShot(u, h) {   // morning: boats tied up, families walking up the dock
  camXf(lx, h, 1.05, 360, 270);
  lx.fillStyle = gr(lx, -100, 220, [[0, '#a8c0d0'], [1, '#f0e8d4']]); lx.fillRect(-300, -300, SW + 600, 520);
  water(lx, 220, 600, '#5a8090', '#2a4a58', u, 'rgba(255,255,255,.25)', 50);
  for (let i = 0; i < 5; i++) { const x = 40 + i * 150, y = 270 + (i % 2) * 14; lx.fillStyle = i % 2 ? '#e4e0d4' : '#7a6a58'; lx.beginPath(); lx.moveTo(x - 60, y); lx.lineTo(x + 60, y); lx.lineTo(x + 46, y + 22); lx.lineTo(x - 50, y + 22); lx.fill(); lx.fillRect(x - 20, y - 26, 40, 26); }
  lx.fillStyle = '#8a7a62'; lx.beginPath(); lx.moveTo(-100, 520); lx.lineTo(820, 520); lx.lineTo(820, 340); lx.lineTo(-100, 400); lx.fill();   // the dock
  for (let i = 0; i < 14; i++) { const k = (i * .13 + u * .06) % 1, x = lerp(80, 680, k), y = lerp(400, 352, k), s = lerp(1.1, .7, k) * (i % 4 === 3 ? .6 : 1); person(lx, x, y, 90 * s, '#2a2624', u * 6 + i, 0, 1); }
  return 0;
}
function tentsShot(u, h) {   // rows of tents under an elevated highway, laundry, cots; no faces
  camXf(lx, h, 1.05, 360 + u * 4, 270);
  lx.fillStyle = '#b0aa98'; lx.fillRect(-300, -300, SW + 600, SH + 600);
  lx.fillStyle = '#7a756a'; lx.fillRect(-300, 40, SW + 600, 60); lx.fillStyle = '#5a5650'; lx.fillRect(-300, 100, SW + 600, 14);   // highway deck
  for (let i = 0; i < 7; i++) { lx.fillStyle = '#8a8478'; lx.fillRect(-40 + i * 130, 114, 30, 260); }
  lx.fillStyle = '#9a9282'; lx.fillRect(-300, 370, SW + 600, 300);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const x = -60 + i * 100 + r * 30, y = 300 + r * 70, s = .7 + r * .25;
    lx.fillStyle = r % 2 ? '#8a8a6a' : '#6e7a62'; lx.beginPath(); lx.moveTo(x - 45 * s, y); lx.lineTo(x, y - 46 * s); lx.lineTo(x + 45 * s, y); lx.fill(); lx.fillStyle = '#2a2a24'; lx.beginPath(); lx.moveTo(x - 8 * s, y); lx.lineTo(x, y - 30 * s); lx.lineTo(x + 8 * s, y); lx.fill(); }
  lx.strokeStyle = '#3a3a36'; lx.lineWidth = 1.5; lx.beginPath(); lx.moveTo(-40, 200); lx.quadraticCurveTo(200, 220, 450, 196); lx.stroke();
  for (let i = 0; i < 8; i++) { lx.fillStyle = ['#c8c0a8', '#8a5a4a', '#5a6a8a', '#e0dcd0'][i % 4]; lx.fillRect(10 + i * 52, 204 + Math.sin(i) * 4, 24, 30 + Math.sin(u * 2 + i) * 2); }
  person(lx, 520, 360, 70, '#2a2826', u * 5, 0); person(lx, 200, 430, 80, '#2e2a28', u * 5 + 2, 0, -1);
  return 0;
}
function riotsShot(u, h) {   // dusk, low skyline, columns of smoke
  camXf(lx, h, 1.05, 360, 270);
  lx.fillStyle = gr(lx, -100, 330, [[0, '#2a2a3a'], [.7, '#8a5040'], [1, '#d08040']]); lx.fillRect(-300, -300, SW + 600, 640);
  for (const [x, w] of [[180, 60], [420, 80], [560, 50]]) for (let k = 0; k < 18; k++) { const life = (u * .12 + k / 18) % 1, yy = 320 - life * 360, r = w * (.5 + life * 1.6), xx = x + Math.sin(life * 4 + k) * 30 + life * 80;
    lx.fillStyle = `rgba(30,26,26,${.32 * (1 - life)})`; lx.beginPath(); lx.arc(xx, yy, r, 0, 7); lx.fill(); }
  const g2 = lx.createRadialGradient(420, 330, 5, 420, 330, 160); g2.addColorStop(0, 'rgba(255,140,50,.6)'); g2.addColorStop(1, 'rgba(255,120,40,0)'); lx.fillStyle = g2; lx.fillRect(200, 170, 440, 320);
  skyline(lx, 340, 31, 18, -40, 760, '#141216', .05); palmS(lx, 90, 346, 160, .08, '#0e0c10'); palmS(lx, 640, 344, 140, -.1, '#0e0c10');
  lx.fillStyle = '#0e0c10'; lx.fillRect(-300, 340, SW + 600, 300);
  return 0;
}
function marqueeShot(u, h) {   // a cinema at night: chasing bulbs, NOW SHOWING, the title out of focus
  camXf(lx, h, lerp(1, 1.25, ss(u / 12)), 360, 230);
  lx.fillStyle = '#08080c'; lx.fillRect(-300, -300, SW + 600, SH + 600);
  lx.fillStyle = '#2a1e22'; lx.fillRect(60, 60, 600, 200);
  for (let i = 0; i < 60; i++) { const x = 70 + i * 10; for (const y of [68, 252]) { lx.fillStyle = (i + Math.floor(u * 8)) % 3 === 0 ? '#ffe8a0' : '#6a5030'; lx.beginPath(); lx.arc(x, y, 3, 0, 7); lx.fill(); } }
  lx.fillStyle = '#f0e8d8'; lx.fillRect(90, 90, 540, 140);
  lx.fillStyle = '#1a1414'; lx.font = '700 34px "Plex Cond"'; lx.textAlign = 'center'; lx.fillText('NOW SHOWING', 360, 130);
  lx.save(); lx.filter = 'blur(4px)'; lx.font = '700 54px "Plex Cond"'; lx.fillText('▇▇▇▇ ▇▇▇▇▇▇', 360, 205); lx.restore(); lx.textAlign = 'left';
  lx.fillStyle = '#16121a'; lx.fillRect(60, 260, 600, 300); lx.fillStyle = '#e8c070'; lx.fillRect(300, 330, 120, 160);
  for (let i = 0; i < 6; i++) person(lx, 120 + i * 60, 520, 120, '#08080a', u * 3 + i);
  return 0;
}
function streetShot(u, h) {   // a morning street of small shops with hand-painted Spanish signs
  camXf(lx, h, 1.05, 330 + u * 9, 270);
  lx.fillStyle = gr(lx, -100, 120, [[0, '#9ec0d8'], [1, '#f4ead2']]); lx.fillRect(-300, -300, SW + 600, 430);
  const shops = [['CAFÉ', '#e8b84a', '#7a3a2a'], ['PANADERÍA', '#e6dcc4', '#2a5a7a'], ['FARMACIA', '#8ac0b0', '#1a3a3a'], ['BODEGA', '#e8a07a', '#2a2a6a'], ['CAFÉ', '#d0d8a0', '#6a2a2a'], ['SASTRERÍA', '#c8b8e0', '#3a2a5a']];
  shops.forEach(([n, wall, sign], i) => { const x = -60 + i * 190; lx.fillStyle = wall; lx.fillRect(x, 90, 180, 300); lx.fillStyle = '#2a2a2c'; lx.fillRect(x + 20, 210, 140, 180);
    lx.fillStyle = sign; lx.font = '700 30px "Plex Cond"'; lx.fillText(n, x + 14, 160); lx.fillStyle = 'rgba(255,255,255,.12)'; lx.fillRect(x + 20, 210, 140, 30); });
  lx.fillStyle = '#c8c0b0'; lx.fillRect(-300, 390, SW + 600, 60); lx.fillStyle = '#5a5654'; lx.fillRect(-300, 450, SW + 600, 300);
  palmS(lx, 220, 450, 260, .06, '#3a4a30');
  for (let i = 0; i < 6; i++) { const x = (i * 150 + u * (20 + i * 4) * (i % 2 ? 1 : -1)) % 900 - 100; person(lx, x, 420 + (i % 2) * 14, 90 + (i % 3) * 8, ['#3a2a2a', '#2a3a4a', '#4a3a2a'][i % 3], u * 6 + i, 0, i % 2 ? 1 : -1); }
  return 0;
}
function recoveryShot(u, h) {   // the swamp from a distance: orange markers, small boats, a helicopter
  camXf(lx, h, 1.1, 360, 270);
  lx.fillStyle = gr(lx, -100, 280, [[0, '#a8b4b8'], [1, '#dcd8c8']]); lx.fillRect(-300, -300, SW + 600, 580);
  lx.fillStyle = '#7a744c'; lx.fillRect(-300, 270, SW + 600, 30);
  lx.fillStyle = '#3a4040'; lx.fillRect(-300, 296, SW + 600, 400);
  for (let i = 0; i < 26; i++) { const x = hash(i) * 900 - 90, y = 300 + hash(i + 4) * 200; lx.fillStyle = '#e8702a'; lx.fillRect(x, y - 6 - (y - 300) * .03, 3 + (y - 300) * .02, 6 + (y - 300) * .04); }
  for (let i = 0; i < 3; i++) { const x = 150 + i * 190 + Math.sin(u * .3 + i) * 10, y = 300 + i * 18; lx.fillStyle = '#d8d4c8'; lx.fillRect(x - 20, y, 40, 6); lx.fillStyle = '#2a2a2a'; lx.fillRect(x - 4, y - 8, 8, 8); }
  for (let i = 0; i < 6; i++) { lx.fillStyle = '#1e2020'; const x = 240 + i * 26, y = 330 + (i % 2) * 6; lx.fillRect(x, y - 16, 4, 12); lx.beginPath(); lx.arc(x + 2, y - 18, 2.5, 0, 7); lx.fill(); }
  const hx = 520 + Math.sin(u * .4) * 30, hy = 110; lx.fillStyle = '#303436'; lx.fillRect(hx - 12, hy - 4, 24, 8); lx.fillRect(hx + 10, hy - 2, 18, 3); lx.fillRect(hx - 20 + Math.sin(u * 40) * 2, hy - 7, 40, 1.5);
  return 0;
}
function terminalDuskShot(u, h) {   // the terminal window at dusk: parked jets at gates, no flight
  camXf(lx, h, 1, 360, 270);
  lx.fillStyle = gr(lx, 0, 340, [[0, '#3a3a52'], [1, '#d4906a']]); lx.fillRect(-300, -300, SW + 600, 660);
  lx.fillStyle = '#3a3c36'; lx.fillRect(-300, 338, SW + 600, 16); lx.fillStyle = '#4a4a46'; lx.fillRect(-300, 354, SW + 600, 300);
  for (let i = 0; i < 3; i++) jet(lx, 140 + i * 230, 380 + i * 6, 1.4 - i * .2, 0, '#b8b4ac');
  for (let i = 0; i < 12; i++) { lx.fillStyle = i % 3 ? '#e8d27a' : '#5ad0ff'; lx.fillRect(i * 64 + 10, 360, 3, 3); }
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.translate(h.x, h.y);
  lx.fillStyle = '#1e201e'; lx.fillRect(-20, -40, 34, SH + 80); lx.fillRect(SW - 14, -40, 34, SH + 80); lx.fillRect(-40, SH - 30, SW + 80, 80);
  lx.fillStyle = 'rgba(235,245,230,.06)'; for (let i = 0; i < 3; i++) lx.fillRect(80 + i * 220, 30, 140, 10);
  return 0;
}
function tvShot(u, h) {   // a dim motel room; the TV shows a local-news screen: FLORIDA MAN, the rest unreadable
  camXf(lx, h, lerp(1, 1.35, ss(u / 26)), 360, 250);
  lx.fillStyle = '#16141a'; lx.fillRect(-300, -300, SW + 600, SH + 600);
  const fl = .5 + .5 * hash(Math.floor(u * 6));
  const g2 = lx.createRadialGradient(360, 240, 10, 360, 240, 420); g2.addColorStop(0, `rgba(90,120,200,${.25 + .1 * fl})`); g2.addColorStop(1, 'rgba(40,60,120,0)'); lx.fillStyle = g2; lx.fillRect(-300, -300, SW + 600, SH + 600);
  lx.fillStyle = '#2a2420'; lx.fillRect(80, 380, 560, 200);   // dresser
  lx.fillStyle = '#1a1816'; lx.beginPath(); lx.roundRect(180, 100, 360, 280, 20); lx.fill();
  lx.save(); lx.beginPath(); lx.roundRect(206, 124, 290, 220, 26); lx.clip();
  lx.fillStyle = '#1c3e8a'; lx.fillRect(200, 120, 300, 230);
  lx.fillStyle = '#f2f2f2'; lx.font = '700 40px "Plex Cond"'; lx.fillText('FLORIDA MAN', 224, 190);
  lx.save(); lx.filter = 'blur(3px)'; for (let i = 0; i < 4; i++) { lx.fillStyle = 'rgba(240,240,240,.7)'; lx.fillRect(224, 214 + i * 26, 250 - (i % 2) * 70, 12); } lx.restore();
  lx.fillStyle = '#c03028'; lx.fillRect(206, 312, 290, 24); lx.fillStyle = '#f2f2f2'; lx.font = '700 15px "Plex Cond"'; lx.fillText('LOCAL NEWS', 214, 330);
  for (let y = 124; y < 344; y += 3) { lx.fillStyle = 'rgba(0,0,0,.18)'; lx.fillRect(206, y, 290, 1); }
  lx.restore();
  lx.fillStyle = '#3a3026'; lx.fillRect(580, 300, 40, 80); lx.fillStyle = '#e8c890'; lx.beginPath(); lx.moveTo(560, 300); lx.lineTo(640, 300); lx.lineTo(620, 250); lx.lineTo(580, 250); lx.fill();   // lamp
  return u < 1 ? (1 - u) * 2.2 : 0;
}
function squareShot(u, h, a) {   // a sunny waterfront square; a crowd from behind; a small blue flag
  const T = a + u;
  camXf(lx, h, lerp(1, 1.12, ss(u / 25)), 360, 270);
  lx.fillStyle = gr(lx, -100, 230, [[0, '#6aa8d8'], [1, '#e0eef0']]); lx.fillRect(-300, -300, SW + 600, 530);
  water(lx, 226, 300, '#4ab0b8', '#3a9aa8', u, 'rgba(255,255,255,.35)', 30);
  lx.fillStyle = '#d8ccb0'; lx.fillRect(-300, 296, SW + 600, 400);
  palmS(lx, 60, 330, 230, .1, '#3a5030'); palmS(lx, 660, 326, 210, -.1, '#3a5030');
  lx.fillStyle = '#8a7a62'; lx.fillRect(300, 270, 120, 40);   // a small stage
  lx.fillStyle = '#c8c4bc'; lx.fillRect(470, 120, 4, 190);   // flagpole
  if (T > TL.flag) { const w = 90; lx.fillStyle = '#2a5ab8'; lx.beginPath(); lx.moveTo(474, 124); for (let k = 0; k <= 10; k++) lx.lineTo(474 + k * w / 10, 124 + Math.sin(u * 4 + k * .7) * 4); for (let k = 10; k >= 0; k--) lx.lineTo(474 + k * w / 10, 180 + Math.sin(u * 4 + k * .7) * 4); lx.fill(); lx.fillStyle = '#f0e8c0'; lx.beginPath(); lx.arc(474 + w / 2, 152 + Math.sin(u * 4 + 3.5) * 4, 13, 0, 7); lx.fill(); }
  const n = Math.floor(lerp(6, 60, seg(T, TL.square_fill[0], TL.square_fill[1])));
  for (let i = 0; i < n; i++) person(lx, hash(i * 5) * 760 - 20, 330 + hash(i * 9) * 110, 34 + hash(i * 9) * 46, i % 4 ? '#2a2a2e' : '#4a3a32', u * 2 + i);
  return 0;
}
function sunsetShot(u, h) {   // the end of the road: sunset over the water, a MILE 0 sign
  camXf(lx, h, 1.05, 360, 270);
  lx.fillStyle = gr(lx, -100, 270, [[0, '#3a2a4a'], [.6, '#d0603a'], [1, '#f0b060']]); lx.fillRect(-300, -300, SW + 600, 570);
  lx.fillStyle = '#ffd890'; lx.beginPath(); lx.arc(360, 262 - u * 1.5, 34, Math.PI, 0); lx.fill();
  water(lx, 266, 600, '#c06a48', '#2a1a2a', u, 'rgba(255,210,140,.35)', 60);
  palmS(lx, 90, 440, 300, .12, '#0e0a10'); lx.fillStyle = '#0e0a10'; lx.fillRect(-300, 440, SW + 600, 200);
  lx.fillStyle = '#1e5a2e'; lx.fillRect(560, 330, 70, 50); lx.fillStyle = '#e8e8e0'; lx.font = '700 14px "Plex Cond"'; lx.fillText('MILE', 576, 350); lx.font = '700 22px "Plex Cond"'; lx.fillText('0', 588, 374); lx.fillStyle = '#5a5a5a'; lx.fillRect(592, 380, 6, 60);
  return 0;
}
function cardShot(n, title, u) {   // camcorder blue screen with the title generator
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.fillStyle = '#1b2ea8'; sx.fillRect(0, 0, SW, SH);
  return { title: [n ? n : '', ...title.split('/')].filter(Boolean), n };
}

// ---------------- tapes: which OSD each scene records with ----------------
const PLAY = 'play';   // events before consumer camcorders: tape transfers (PLAY + counter, no date)
const TAPE = {
  causeway: { date: 'AUG  2 1994', clock: [11, 48, 10, 'PM'], bat: 3 }, causeway2: { date: 'AUG  2 1994', clock: [11, 51, 2, 'PM'], bat: 3 }, causeway3: { date: 'AUG  2 1994', clock: [11, 58, 40, 'PM'], bat: 1 },
  neonnight: { date: 'MAR 14 1986', clock: [1, 12, 3, 'AM'], bat: 2 }, mall: PLAY, van: PLAY, shopfar: PLAY, vanaway: PLAY, vanparked: PLAY, newsstand: PLAY, truck: PLAY, magazine: PLAY,
  embassy: PLAY, harbor: PLAY, boat: PLAY, dock: PLAY, tents: PLAY, riots: PLAY, marquee: { date: 'DEC 10 1983', clock: [8, 2, 15, 'PM'], bat: 2 }, street: { date: 'OCT  4 1995', clock: [9, 14, 30, 'AM'], bat: 3 },
  plane: { date: 'APR 27 1996', clock: [10, 41, 12, 'AM'], bat: 3 }, terminal: { date: 'MAY 11 1996', clock: [2, 3, 51, 'PM'], bat: 3 }, cockpit: { date: 'JUN  3 1996', clock: [9, 12, 30, 'AM'], bat: 2 },
  shore: { date: 'MAY 11 1996', clock: [2, 13, 20, 'PM'], bat: 2 }, search: { date: 'MAY 12 1996', clock: [7, 30, 4, 'AM'], bat: 2 }, sheen: { date: 'MAY 12 1996', clock: [7, 41, 50, 'AM'], bat: 2 },
  recovery: { date: 'MAY 13 1996', clock: [8, 5, 12, 'AM'], bat: 2 }, notice: { date: 'NOV 19 1996', clock: [3, 47, 10, 'PM'], bat: 1 }, terminaldusk: { date: 'FEB 17 1998', clock: [6, 21, 0, 'PM'], bat: 2 },
  swampdusk: { date: 'APR 27 1996', clock: [6, 58, 40, 'PM'], bat: 1 }, tv: { date: 'JUL  9 2013', clock: [11, 2, 44, 'PM'], bat: 3 },
  highway: PLAY, jam: PLAY, square: PLAY, sunset: PLAY,
};
const pad = n => String(n).padStart(2, '0');
function clockStr([h, m, s, ap], dt) { let S2 = s + Math.floor(dt), M = m + Math.floor(S2 / 60); S2 %= 60; return `${h}:${pad(M % 60)}:${pad(S2)} ${ap}`; }
function counterStr(T) { const s = Math.floor(T * 1.0 + 1800); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }

// ---------------- captions (CEA-608 style, inside the 4:3 frame) ----------------
const COLS = 32;
function wrap(s) { const out = []; let cur = ''; for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (t.length > COLS && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
TL.caps.forEach(c => c.rows = wrap(c.text));
function drawCaps(t) {
  cx2.clearRect(0, 0, W, H);
  if (location.search.includes('nocap')) return;
  const c = TL.caps.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const fs = 42, cw = fs * .6, rh = 54; cx2.font = `600 ${fs}px "IBM Plex Mono"`; cx2.textBaseline = 'middle';
  const n = c.rows.length, yb = H - 236;
  c.rows.forEach((r, i) => { const y = yb - (n - 1 - i) * rh, w = (r.length + 2) * cw, x0 = Math.round(W / 2 - w / 2);
    cx2.fillStyle = '#000'; cx2.fillRect(x0, y - rh / 2, w, rh); cx2.fillStyle = '#f2f2f2'; cx2.fillText(r, x0 + cw, y + 2); });
}

// ---------------- frame ----------------
const SC = TL.scenes;
const sceneAt = t => SC.find(s => t >= s[1] && t < s[2]) || SC[SC.length - 1];
const warp = (u, d, a, b) => a + clamp(u / d) * (b - a);   // map a scene's local time onto the reel's original span
const GL_ORDER = ['mall', 'harbor', 'plane', 'highway'];
function drawScene(name, t, a, b) {
  const u = t - a, d = b - a;
  let blur = 0, tint = [1, 1, 1], expo = 1, gain = .035, title = null;
  if (name === 'glimpse') { const k = Math.min(3, Math.floor(u / (d / 4))); return drawScene(GL_ORDER[k] === 'plane' ? 'plane' : GL_ORDER[k], t, a + k * d / 4, a + (k + 1) * d / 4); }
  const H0 = hand(t, .8);
  switch (name) {
    case 'causeway': case 'causeway2': case 'causeway3': blur = causewayShot(u, hand(t, .5, { vib: 1.4 })); tint = [.95, .98, 1.05]; gain = .06; break;
    case 'neonnight': blur = neonShot(u, H0); gain = .06; break;
    case 'harbor': blur = harborShot(u, hand(t, .7, { bob: .6 })); tint = [1.04, .98, .94]; break;
    case 'highway': blur = highwayShot(u, hand(t, .4, { vib: 1.2 })); tint = [1.02, 1, .96]; break;
    case 'jam': blur = highwayShot(u, hand(t, .4), true); tint = [1.03, 1, .95]; break;
    case 'mall': blur = lotScene(u, H0, { zoom: lerp(1, 1.12, u / d), people: [[200 + u * 8, 216, 22, '#3a3030', u * 6], [520 - u * 10, 214, 22, '#2a3038', u * 6 + 1, 0, -1], [640 - u * 6, 300, 40, '#3a2a2a', u * 6 + 2, 0, -1]] }); tint = [1.03, 1, .94]; break;
    case 'van': blur = vanShot(u, H0, t >= TL.vansign ? 1 : 0); tint = [1.03, 1, .94]; break;
    case 'shopfar': blur = shopFarShot(u, hand(t, 1.2), a); tint = [1.03, 1, .94]; break;
    case 'vanaway': blur = vanAwayShot(u, H0); tint = [1.03, 1, .94]; break;
    case 'vanparked': blur = vanParkedShot(u, H0); gain = .05; break;
    case 'newsstand': blur = paperRack(u, H0); break;
    case 'truck': blur = truckShot(u, H0); gain = .06; break;
    case 'magazine': blur = magazineShot(u, hand(t, .4)); break;
    case 'embassy': blur = embassyShot(u, H0, a); tint = [1.02, 1, .95]; break;
    case 'boat': blur = boatShot(u, hand(t, .6)); break;
    case 'dock': blur = dockShot(u, H0); break;
    case 'tents': blur = tentsShot(u, H0); tint = [1.02, 1, .94]; break;
    case 'riots': blur = riotsShot(u, H0); gain = .05; break;
    case 'marquee': blur = marqueeShot(u, H0); gain = .06; break;
    case 'street': blur = streetShot(u, H0); break;
    case 'plane': case 'swampdusk': planeShot(warp(u, d, .5, 8.4), name === 'swampdusk', hand(t, .6, { vib: 1.2 })); tint = name === 'swampdusk' ? [1.06, .98, .9] : [1.02, 1, .95]; return { direct: true, tint, expo, gain };
    case 'terminal': blur = terminalShot(warp(u, d, 9.2, 19.4), H0); tint = [.95, 1.03, .93]; break;
    case 'cockpit': { const tt = warp(u, d, 19.7, 26.6); blur = cockpitShot(tt, hand(t, .5)); expo = 1 - ss(seg(tt, 24, 26.6)) * .15; break; }
    case 'shore': blur = shoreShot(warp(u, d, 28.4, 32.1), hand(t, .9, { bob: 1 })); tint = [1, 1, .96]; break;
    case 'search': blur = searchShot(warp(u, d, 32.2, 39.7), hand(t, .8, { vib: 1.6 })); tint = [1.02, 1, .94]; break;
    case 'sheen': blur = searchShot(warp(u, d, 41.0, 47.4), hand(t, .8)); tint = [1.02, 1, .94]; break;
    case 'recovery': blur = recoveryShot(u, hand(t, .9, { bob: .5 })); break;
    case 'notice': blur = noticeShot(warp(u, d, 47.5, 54.9), hand(t, .45)); tint = [1, 1.02, .92]; break;
    case 'terminaldusk': blur = terminalDuskShot(u, H0); tint = [.98, 1.02, .95]; break;
    case 'tv': blur = tvShot(u, hand(t, .45)); gain = .06; break;
    case 'square': blur = squareShot(u, H0, a); tint = [1.02, 1, .96]; break;
    case 'sunset': blur = sunsetShot(u, H0); tint = [1.04, .98, .92]; break;
  }
  return { blur, tint, expo, gain };
}
function render(T) {
  const t = Math.min(T, TL.freeze);
  const [name, a, b] = sceneAt(t);
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.filter = 'none'; sx.fillStyle = '#000'; sx.fillRect(0, 0, SW, SH);
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.filter = 'none'; lx.fillStyle = '#000'; lx.fillRect(0, 0, SW, SH);
  let off = 0, look = { tint: [1, 1, 1], expo: 1, gain: .035, blur: 0 }, card = null;
  if (name === 'silence') off = 1;
  else if (name.startsWith('card')) { const c = TL.cards.find(c => 'card' + c.n === name); card = cardShot(c.n, c.title, t - a); }
  else {
    look = { ...look, ...drawScene(name, t, a, b) };
    if (!look.direct) { sx.setTransform(1, 0, 0, 1, 0, 0); sx.filter = look.blur > .15 ? `blur(${look.blur.toFixed(2)}px)` : 'none';
      if (name === 'notice') { sx.fillStyle = '#8a9a7c'; sx.fillRect(0, 0, SW, SH); sx.drawImage(layer, SW * .15, 6, SW * .7, SH * .7); }   // the notice sits high, clear of the captions
      else sx.drawImage(layer, 0, 0); sx.filter = 'none'; }
  }
  // OSD
  const base = name === 'glimpse' ? GL_ORDER[Math.min(3, Math.floor((t - a) / ((b - a) / 4)))] : name;
  const tp = TAPE[base];
  const [ti0, ti1] = TL.title;
  if (card) {
    const n = Math.floor((t - a - .3) * 14);
    drawOSD(osd, { title: card.title, titleN: n, t: T });
  } else if (tp === PLAY) {
    drawOSD(osd, { counter: counterStr(T), t: T });
    const x = osd.getContext('2d'); osdText(x, 'PLAY', 52, 45, 3); x.fillStyle = '#f4f4ee'; x.beginPath(); x.moveTo(140, 46); x.lineTo(158, 55); x.lineTo(140, 64); x.fill();
  } else if (tp) {
    drawOSD(osd, { rec: true, clock: clockStr(tp.clock, t - a), date: tp.date, bat: tp.bat, batBlink: T > TL.bat_blink, t: T,
      title: name === 'causeway2' && t >= ti0 && t < ti1 ? ['THE REAL STORIES', 'BEHIND GTA 6'] : null, titleN: Math.floor((t - ti0) * 14) });
  } else drawOSD(osd, { hide: true });
  // tape events
  let track = 0, roll = 0;
  for (const tr of TL.tears) { const u2 = T - tr; if (u2 > -.18 && u2 < .32) { track = Math.max(track, 1 - Math.abs(u2 - .05) / .3); roll = Math.max(roll, u2 > 0 && u2 < .12 ? (.12 - u2) * 1.2 : 0); } }
  if (name === 'glimpse') { const q = (b - a) / 4; for (let k = 1; k < 4; k++) { const u2 = t - (a + k * q); if (u2 > -.1 && u2 < .2) track = Math.max(track, 1 - Math.abs(u2 - .05) / .2); } }
  if (T < .9) { track = Math.max(track, 1 - T / .9); roll = Math.max(roll, (1 - T / .9) * .3); }   // power-on roll-in
  if (name === 'silence' && t < a + .2) { off = 0; track = 1; }
  const [o0, o1] = TL.off; if (T > o0) { off = Math.max(off, seg(T, o0, o1)); track = Math.max(track, .6 * (1 - seg(T, o0, o1))); }
  vhs({ frame: Math.floor(T * 30), tint: look.tint, expo: look.expo, gain: card ? .02 : look.gain, track, roll, off, sat: card ? 1 : .95 });
  drawCaps(T);
}
window.DUR = TL.dur;
window.render = render;
window.TEXTS = t => {
  const out = [];
  const [name, a] = sceneAt(Math.min(t, TL.freeze));
  if (name.startsWith('card')) { const c = TL.cards.find(c => 'card' + c.n === name); if (t >= a + 1.2) out.push({ id: name, text: c.title.replace('/', ' '), x0: 400, y0: 260, x1: 1520, y1: 560 }); }
  const [ti0, ti1] = TL.title; if (t >= ti0 + 2.4 && t < ti1) out.push({ id: 'title', text: 'THE REAL STORIES BEHIND GTA 6', x0: 400, y0: 260, x1: 1520, y1: 560 });
  if (name === 'notice' && t >= a + 1) noticeBoxes.forEach(([s], i) => out.push({ id: 'n' + i, text: s, x0: 300, y0: 100 + i * 60, x1: 1600, y1: 150 + i * 60 }));
  return out;
};
render(0); window.READY = true;
