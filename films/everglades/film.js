// "The Swamp": spliced camcorder tapes. Scenes are drawn in Canvas 2D at tape resolution (720×540), the OSD on its own canvas,
// then a VHS camcorder pass (ported from the style's demo) outputs the 4:3 picture full-width in a 1080×1920 vertical frame,
// with CEA-608-style captions in the black below it.
import { drawOSD, text as osdText, width as osdWidth } from './osd.js';

const W = 1080, H = 1920, SW = 720, SH = 540, TOP = 400, OW = 1080, OH = 810;
const TL = await (await fetch('timeline.json')).json();
await document.fonts.load('600 42px "IBM Plex Mono"'); await document.fonts.load('700 34px "Plex Cond"'); await document.fonts.load('400 24px "Plex Cond"');

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
function h2i(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y) { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h2i(ix, iy), b = h2i(ix + 1, iy), c = h2i(ix, iy + 1), d = h2i(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
const fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += vn(x * f, y * f) * a; f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, o)); };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

// ---------------- canvases ----------------
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const scene = mk(SW, SH), sx = scene.getContext('2d');
const layer = mk(SW, SH), lx = layer.getContext('2d');          // pre-blur layer (autofocus)
const osd = mk(SW, SH);
const gb = mk(240, 180), gx = gb.getContext('2d');                // low-res buffer for per-pixel ground / sheen
const gimg = gx.createImageData(240, 180);
document.body.style.cssText = 'margin:0;background:#000;overflow:hidden;width:1080px;height:1920px';
const glc = mk(OW, OH); glc.style.cssText = `position:absolute;left:0;top:${TOP}px`; document.body.appendChild(glc);
const capc = mk(W, H); capc.style.cssText = 'position:absolute;left:0;top:0'; document.body.appendChild(capc);
const cx2 = capc.getContext('2d');

// ---------------- VHS pass (WebGL) ----------------
const gl = glc.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
const FS = `precision highp float;
uniform sampler2D tDiffuse, tOSD; uniform vec2 res, src; uniform vec3 tint;
uniform float frame, expo, gain, sharp, lumaW, chromaW, chromaShift, sat, jitter, track, roll, barrel, vig, black, dropout, off, smear;
float h1(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vn1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h1(i), h1(i+1.), f); }
const mat3 toYIQ = mat3(.299, .596, .211, .587, -.274, -.523, .114, -.322, .312);
const mat3 toRGB = mat3(1., 1., 1., .956, -.272, -1.106, .621, -.647, 1.703);
vec2 lens(vec2 q){ vec2 p = q - .5; vec2 pa = p * vec2(1.333, 1.); float r2 = dot(pa, pa); p *= 1. + barrel * r2; p *= 1. - barrel * .3; return p + .5; }
vec3 sig(vec2 q){ vec2 ql = lens(q); vec3 c = texture2D(tDiffuse, ql).rgb; if (ql.x < 0. || ql.x > 1. || ql.y < 0. || ql.y > 1.) c = vec3(0.); vec4 o = texture2D(tOSD, q); return mix(c, o.rgb, o.a); }
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 uv = fc / res; float F = floor(frame);
  uv.y = fract(uv.y + roll);
  float line = floor((1. - uv.y) * src.y); float dx = 1. / src.x;
  float off1 = (h1(line * .37 + F * 1.13) - .5) * jitter * dx + (vn1(line * .012 + F * .7) - .5) * jitter * .8 * dx;
  float hsw = smoothstep(src.y - 10., src.y - 3., line); off1 += hsw * (.012 + .025 * h1(line + F * 3.1));
  float band = 0.;
  if (track > 0.) { float by = fract(h1(F * .31) * .6 + F * .037); band = smoothstep(.09 * track + .02, 0., abs(uv.y - by));
    off1 += (h1(line * .13 + F * 7.1) - .5) * .05 * track * (1. + band * 4.); off1 += band * track * .06 * sin(F * 2.3 + line * .02); uv.y += (h1(F * 1.9) - .5) * .02 * track; }
  vec2 q = vec2(uv.x + off1, uv.y);
  float Y = 0., Yw = 0., ws = 0., wws = 0.;
  for (int i = -3; i <= 3; i++) { float fi = float(i); float w = exp(-fi * fi / (2. * lumaW * lumaW)); Y += dot(sig(q + vec2(fi * dx, 0.)), vec3(.299, .587, .114)) * w; ws += w; }
  for (int i = -4; i <= 4; i++) { float fi = float(i) * 1.8; float w = exp(-fi * fi / 24.); Yw += dot(sig(q + vec2(fi * dx, 0.)), vec3(.299, .587, .114)) * w; wws += w; }
  Y /= ws; Yw /= wws; Y = Y + sharp * (Y - Yw);
  vec2 IQ = vec2(0.); float cw = 0.;
  for (int i = -5; i <= 5; i++) { float fi = float(i) * chromaW * .4; float w = exp(-float(i * i) / 12.); IQ += (toYIQ * sig(q + vec2((fi - chromaShift) * dx, 0.))).yz * w; cw += w; }
  IQ /= cw;
  float tail = 0.;
  for (int i = 1; i <= 6; i++) { float yy = dot(sig(q - vec2(float(i) * 2.5 * dx, 0.)), vec3(.299, .587, .114)); tail += max(yy - .82, 0.) * (1. - float(i) / 7.); }
  Y += tail * smear;
  float px = floor(uv.x * src.x / 1.5);
  float nY = (h2(vec2(px, line) + F * 7.3) - .5) + (h2(vec2(floor(px / 3.), line) + F * 3.1) - .5) * .6;
  Y += nY * gain * (1.3 - Y * .8);
  IQ += (vec2(vn1(uv.x * 38. + line * 3.1 + F * 17.), vn1(uv.x * 31. + line * 1.7 + F * 11.)) - .5) * gain * .5;
  IQ *= sat;
  vec3 c = toRGB * vec3(Y, IQ);
  if (track > 0.) { float sn = h2(vec2(floor(fc.x / 3.), line) + F * 31.); c = mix(c, vec3(sn), band * .8 * track); c = mix(c, vec3(dot(c, vec3(.33))), band * track); }
  if (hsw > 0.) c = mix(c, vec3(h2(vec2(px, line + F))), hsw * .35);
  if (dropout > 0.) for (int k = 0; k < 3; k++) { float fk = float(k); float hk = h1(F * 3.7 + fk * 11.3); if (hk > .55) continue;
    float dl = floor(h1(F * 1.3 + fk * 5.1) * src.y), dxs = h1(F * 2.9 + fk * 7.7), dlen = .02 + .1 * h1(F * 4.1 + fk);
    if (abs(line - dl) < .6 && uv.x > dxs && uv.x < dxs + dlen) c = mix(c, vec3(.95), dropout * (1. - (uv.x - dxs) / dlen)); }
  c *= tint * expo; c = c * (1. - black) + black;
  c = mix(c, (1. - exp(-c * 1.6)) / (1. - exp(-1.6)), smoothstep(.55, 1.2, c));
  vec2 d = (uv - .5) * vec2(1.25, 1.); c *= 1. - vig * smoothstep(.2, .85, length(d));
  c = mix(c, vec3(0.), off);
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;
const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const shd = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
const prog = gl.createProgram(); gl.attachShader(prog, shd(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shd(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const pl = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
const mkTex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
const tScene = mkTex(0), tOsd = mkTex(1);
gl.uniform1i(U('tDiffuse'), 0); gl.uniform1i(U('tOSD'), 1);
gl.uniform2f(U('res'), OW, OH); gl.uniform2f(U('src'), SW, SH);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
function vhs(o) {
  gl.viewport(0, 0, OW, OH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tScene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tOsd); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, osd);
  const d = { frame: 0, expo: 1, gain: .035, sharp: .9, lumaW: 1.25, chromaW: 5, chromaShift: 1.6, sat: .95, jitter: .3, track: 0, roll: 0, barrel: .07, vig: .42, black: .045, dropout: 1, off: 0, smear: .35, ...o };
  for (const k of ['frame', 'expo', 'gain', 'sharp', 'lumaW', 'chromaW', 'chromaShift', 'sat', 'jitter', 'track', 'roll', 'barrel', 'vig', 'black', 'dropout', 'off', 'smear']) gl.uniform1f(U(k), d[k]);
  gl.uniform3fv(U('tint'), d.tint || [1, 1, 1]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ---------------- handheld camera ----------------
function hand(t, amp, { gait = 0, vib = 0, bob = 0 } = {}) {
  const n = (f, p) => Math.sin(t * f * 6.283 + p);
  return {
    x: amp * (2.2 * n(.31, 1) + 1.3 * n(.73, 2) + .6 * n(1.9, .3)) + vib * (hash(Math.floor(t * 30)) - .5) * 3 + gait * 2.5 * n(1.8, 0),
    y: amp * (1.8 * n(.27, 4) + 1.1 * n(.61, 5) + .5 * n(2.3, 1)) + vib * (hash(Math.floor(t * 30) + 9) - .5) * 3 + gait * 4 * Math.abs(n(.9, 0)) + bob * 9 * n(.22, 0),
    r: amp * .004 * (n(.19, 7) + .6 * n(.53, 8)) + bob * .02 * n(.17, 1),
  };
}
function camXf(ctx, h, zoom = 1, fx = SW / 2, fy = SH / 2) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(SW / 2 + h.x, SH / 2 + h.y); ctx.rotate(h.r); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
}

// ---------------- aerial swamp (per pixel, low res) ----------------
function aerial(t, pal) {
  const GW = 240, GH = 180, yh = 52, f = 190, Hc = 320, camX = t * 55, camZ = t * 40;
  const d = gimg.data, sky = hex(pal.haze), g1 = hex(pal.g1), g2 = hex(pal.g2), wt = hex(pal.water), tr = hex(pal.tree);
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
    const i = (py * GW + px) * 4;
    if (py <= yh) { d[i + 3] = 0; continue; }
    const dz = Hc * f / (py - yh), wx = (px - GW / 2) * dz / f + camX, wz = dz + camZ;
    const n = fbm(wx / 210 + 3.1, wz / 520, 4);
    const ch = Math.abs(n - .5), water = 1 - clamp((ch - .018) / .012);
    const tree = clamp((fbm(wx / 95 + 9, wz / 95 + 4, 3) - .7) / .06);
    let c = mix3(g1, g2, fbm(wx / 60, wz / 60, 2));
    const near = Math.exp(-dz / 900);
    c = mix3(c, mix3(c, [0, 0, 0], .35), (vn(wx / 4, wz / 9) - .5) * near * 1.2 + .1);
    c = mix3(c, tr, tree * .9);
    c = mix3(c, mix3(wt, sky, .35), water);
    c = mix3(c, sky, 1 - Math.exp(-dz / 2600));
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  gx.putImageData(gimg, 0, 0);
}
function planeShot(t, dusk, h) {
  const pal = dusk ? { sky0: '#6e6a74', sky1: '#c48a62', haze: '#b8866a', g1: '#5a5434', g2: '#4a4a30', water: '#c08060', tree: '#2a2a22' }
                   : { sky0: '#8fa0aa', sky1: '#d8d6c8', haze: '#cfcdbf', g1: '#9c9258', g2: '#7f8148', water: '#4c5c5c', tree: '#3a4630' };
  camXf(sx, h, 1.06);
  const gr = sx.createLinearGradient(0, -60, 0, 160); gr.addColorStop(0, pal.sky0); gr.addColorStop(1, pal.sky1);
  sx.fillStyle = gr; sx.fillRect(-100, -100, SW + 200, SH + 200);
  aerial(t, pal);
  sx.imageSmoothingEnabled = true; sx.drawImage(gb, -30, -30, SW + 60, SH * (SW + 60) / SW);
  // the cabin: window corner, wing strut, wing underside
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.translate(h.x * 1.6, h.y * 1.6);
  sx.fillStyle = '#24211e';
  sx.beginPath(); sx.rect(-60, -60, SW + 120, SH + 120); sx.roundRect(34, 26, SW - 68, SH - 52, 80); sx.fill('evenodd');
  sx.fillStyle = '#3a3530'; sx.beginPath(); sx.moveTo(SW - 60, SH + 40); sx.lineTo(SW + 40, SH - 10); sx.lineTo(560, -40); sx.lineTo(515, -40); sx.closePath(); sx.fill();   // strut
  sx.fillStyle = 'rgba(30,28,26,.95)'; sx.beginPath(); sx.moveTo(-40, -40); sx.lineTo(SW + 40, -40); sx.lineTo(SW + 40, 18); sx.quadraticCurveTo(SW / 2, 46, -40, 22); sx.fill();   // wing underside
  sx.fillStyle = 'rgba(255,255,255,.05)'; sx.beginPath(); sx.roundRect(60, 50, 260, 40, 20); sx.fill();   // glare on the plexiglass
}

// ---------------- the twin-jet silhouette (no livery) ----------------
function jet(ctx, x, y, s, ang, col = '#dcdcd6') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-64, -6, -54, -7); ctx.lineTo(48, -7); ctx.quadraticCurveTo(58, -6, 60, -2); ctx.lineTo(60, 3); ctx.lineTo(-54, 5); ctx.closePath(); ctx.fill();   // fuselage
  ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(18, 2); ctx.lineTo(-14, 22); ctx.lineTo(-24, 22); ctx.closePath(); ctx.fill();   // near wing
  ctx.beginPath(); ctx.moveTo(-50, -6); ctx.lineTo(-40, -6); ctx.lineTo(-52, -30); ctx.lineTo(-60, -30); ctx.closePath(); ctx.fill();   // fin
  ctx.fillRect(-66, -32, 22, 4);   // T-tail
  ctx.fillStyle = '#9a9a96'; ctx.beginPath(); ctx.ellipse(-36, -9, 9, 3.6, 0, 0, 7); ctx.fill();   // rear engine
  ctx.fillStyle = '#7d7f80'; ctx.fillRect(-54, 1, 104, 3);   // belly shade
  ctx.fillStyle = '#26292c'; ctx.fillRect(46, -5, 6, 2);   // cockpit glass
  ctx.restore();
}
function terminalShot(t, h) {
  const t0 = 9.4, tl = 12.6, t1 = 19.6;
  let jx, jy, js, ja;
  if (t < tl) { const u = seg(t, t0, tl); jx = lerp(-80, 230, u * u); jy = 352; js = 1.15; ja = -.02; }
  else { const u = seg(t, tl, t1); jx = lerp(230, 600, u); jy = lerp(352, 120, Math.pow(u, .85)); js = lerp(1.15, .22, Math.pow(u, .7)); ja = -.2; }
  const z = lerp(1, 3.4, ss(seg(t, 13.2, 18.4)));
  const k = ss(seg(t, 12.8, 14.2)), fx = lerp(SW / 2, jx, k), fy = lerp(SH / 2, jy, k);
  camXf(lx, h, z, fx, fy);
  const gr = lx.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, '#aab4b6'); gr.addColorStop(1, '#d9d6c6');
  lx.fillStyle = gr; lx.fillRect(-400, -400, SW + 800, 760);
  lx.fillStyle = '#5c6450'; lx.fillRect(-400, 338, SW + 800, 16);   // far tree line
  lx.fillStyle = '#8a8c78'; lx.fillRect(-400, 354, SW + 800, 600);   // airfield
  lx.fillStyle = '#a7a79c'; lx.beginPath(); lx.moveTo(-400, 360); lx.lineTo(SW + 400, 356); lx.lineTo(SW + 400, 372); lx.lineTo(-400, 382); lx.fill();   // runway
  lx.strokeStyle = 'rgba(255,255,255,.12)'; lx.lineWidth = 3;   // heat shimmer streaks
  jet(lx, jx, jy, js, ja);
  // terminal window: mullions, sill, fluorescent reflections on the glass
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.translate(h.x, h.y);
  const zz = Math.min(z, 1.8);
  lx.fillStyle = '#2a2c2a'; lx.fillRect(SW / 2 - (SW / 2 + 14) * zz, -40, 30 * zz, SH + 80); lx.fillRect(SW / 2 + (SW / 2 - 16) * zz, -40, 30 * zz, SH + 80);
  lx.fillRect(-40, SH / 2 + (SH / 2 - 30) * zz, SW + 80, 80);
  lx.fillStyle = 'rgba(235,245,230,.07)'; for (let i = 0; i < 3; i++) lx.fillRect(80 + i * 220, 30, 140, 10);
  // autofocus: hunts while the zoom moves
  const hunt = Math.abs(Math.sin((t - 13) * 2.1)) * seg(t, 13.0, 13.6) * (1 - seg(t, 17.6, 18.6)) * 2.6 + (t > 18.6 ? Math.abs(Math.sin(t * 3)) * .8 : 0);
  return hunt;
}
function cockpitShot(t, h) {
  const z = lerp(1, 1.22, ss(seg(t, 19.6, 26.6)));
  camXf(lx, h, z, 360, 250);
  // windshield: the hangar outside (dim wall, rows of tubes)
  lx.fillStyle = '#3f474c'; lx.fillRect(0, 0, SW, 260);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { lx.fillStyle = '#e8ecdc'; lx.fillRect(40 + i * 120 + r * 30, 30 + r * 46, 70 - r * 12, 7 - r * 2); }
  lx.fillStyle = '#5a5e5c'; lx.fillRect(0, 170, SW, 90);
  lx.fillStyle = '#141416';   // frames between panes
  lx.beginPath(); lx.moveTo(0, 0); lx.lineTo(70, 0); lx.lineTo(120, 230); lx.lineTo(0, 260); lx.fill();
  lx.beginPath(); lx.moveTo(SW, 0); lx.lineTo(SW - 70, 0); lx.lineTo(SW - 120, 230); lx.lineTo(SW, 260); lx.fill();
  lx.fillRect(348, 0, 24, 240); lx.fillRect(0, 0, SW, 18);
  // glareshield and panel
  lx.fillStyle = '#121214'; lx.beginPath(); lx.moveTo(0, 230); lx.quadraticCurveTo(SW / 2, 206, SW, 230); lx.lineTo(SW, 276); lx.lineTo(0, 276); lx.fill();
  lx.fillStyle = '#2b2e30'; lx.fillRect(0, 276, SW, SH);
  const G = [[150, 330], [230, 330], [310, 330], [150, 410], [230, 410], [310, 410], [430, 330], [510, 330], [590, 330], [430, 410], [510, 410], [590, 410], [370, 470]];
  G.forEach(([x, y], i) => {
    lx.fillStyle = '#0f1011'; lx.beginPath(); lx.arc(x, y, 31, 0, 7); lx.fill();
    lx.strokeStyle = '#c9cbc4'; lx.lineWidth = 2; lx.beginPath(); lx.arc(x, y, 25, 0, 7); lx.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; lx.beginPath(); lx.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); lx.lineTo(x + Math.cos(a) * 25, y + Math.sin(a) * 25); lx.stroke(); }
    const a = hash(i) * 6 + (i === 4 ? (t - 19.6) * .4 : 0);
    lx.strokeStyle = '#eeeee6'; lx.lineWidth = 2.5; lx.beginPath(); lx.moveTo(x, y); lx.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); lx.stroke();
  });
  for (let i = 0; i < 14; i++) { lx.fillStyle = '#5b5e5f'; lx.fillRect(60 + i * 44, 290, 10, 16); }
  // empty seats (backs and headrests), lower corners
  lx.fillStyle = '#2f2622';
  lx.beginPath(); lx.roundRect(-40, 420, 170, 200, 30); lx.fill(); lx.beginPath(); lx.roundRect(10, 360, 90, 80, 20); lx.fill();
  lx.beginPath(); lx.roundRect(SW - 130, 420, 170, 200, 30); lx.fill(); lx.beginPath(); lx.roundRect(SW - 100, 360, 90, 80, 20); lx.fill();
  // master warning lamp: the one saturated colour; blinks at 1 Hz and blooms
  const on = t > 20.2 && Math.floor((t - 20.2) * 2) % 2 === 0;
  lx.fillStyle = on ? '#ff2a14' : '#4a1510'; lx.fillRect(338, 236, 44, 14);
  if (on) { lx.save(); lx.globalCompositeOperation = 'lighter'; const rg = lx.createRadialGradient(360, 243, 2, 360, 243, 90); rg.addColorStop(0, 'rgba(255,60,30,.9)'); rg.addColorStop(.3, 'rgba(255,40,20,.35)'); rg.addColorStop(1, 'rgba(255,20,10,0)'); lx.fillStyle = rg; lx.fillRect(250, 150, 220, 190); lx.restore(); }
  // test smoke rising from below the panel, thickening into a white-out
  const [s0, s1] = TL.smoke, k = ss(seg(t, s0, s1));
  lx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 26; i++) {
    const life = ((t - s0) * .09 + hash(i)) % 1, x = hash(i * 3) * SW + Math.sin(t * .4 + i) * 40, y = SH + 80 - life * (SH + 260), r = 120 + hash(i * 7) * 160;
    const a = k * .32 * Math.sin(life * Math.PI);
    if (a <= .005) continue;
    const rg = lx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(196,198,190,${a})`); rg.addColorStop(1, 'rgba(196,198,190,0)');
    lx.fillStyle = rg; lx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  lx.fillStyle = `rgba(200,202,194,${ss(seg(t, s0 + 1.5, s1)) * .82})`; lx.fillRect(0, 0, SW, SH);
  return 0;
}
function shoreShot(t, h) {
  const [d0, d1] = TL.dive;
  const ju = seg(t, d0, d1), jx = lerp(180, 420, ju), jy = lerp(40, 300, ju * ju);
  let z = 1, fx = SW / 2, fy = SH / 2;
  const zk = ss(seg(t, 28.7, 29.4)) * (1 - ss(seg(t, 30.4, 31.4)) * .45);
  z = 1 + 1.3 * zk; fx = lerp(SW / 2, t < d1 ? jx : 420, zk); fy = lerp(SH / 2, t < d1 ? Math.min(jy, 290) : 285, zk);
  camXf(lx, h, z, fx, fy);
  const gr = lx.createLinearGradient(0, 0, 0, 290); gr.addColorStop(0, '#b7bdbb'); gr.addColorStop(1, '#d6d2c2');
  lx.fillStyle = gr; lx.fillRect(-300, -300, SW + 600, 600);
  if (t >= d0 && t < d1 + .05) jet(lx, jx, jy, .2, 1.05, '#55575a');
  lx.fillStyle = '#6f6c46'; lx.beginPath(); lx.moveTo(-300, 300);
  for (let x = -300; x <= SW + 300; x += 12) lx.lineTo(x, 284 - fbm(x / 60, 3.3, 3) * 26 - (x > 520 && x < 640 ? 18 * Math.sin((x - 520) / 120 * Math.PI) : 0));
  lx.lineTo(SW + 300, 330); lx.lineTo(-300, 330); lx.fill();
  lx.fillStyle = '#2d3434'; lx.fillRect(-300, 326, SW + 600, 500);   // water
  for (let i = 0; i < 40; i++) { const y = 334 + i * 6 + i * i * .12, x = (hash(i) * SW + t * (8 + i)) % (SW + 200) - 100; lx.fillStyle = `rgba(190,196,186,${.12 + .1 * hash(i + 3)})`; lx.fillRect(x, y, 40 + i * 3, 1.5 + i * .05); }
  // birds lift from the grass where it went down
  const b = t - TL.birds;
  if (b > 0) for (let i = 0; i < 11; i++) { const bx = 380 + hash(i) * 100 + b * (hash(i + 5) - .3) * 40, by = 280 - b * (30 + hash(i + 9) * 40), fl = Math.sin(t * 18 + i) * 3;
    lx.strokeStyle = '#2b2b2b'; lx.lineWidth = 1.6; lx.beginPath(); lx.moveTo(bx - 4, by - fl); lx.lineTo(bx, by); lx.lineTo(bx + 4, by - fl); lx.stroke(); }
  return zk > .02 ? Math.abs(Math.sin((t - 28.7) * 3.3)) * 2.2 * (1 - seg(t, 31, 31.8)) : 0;
}
// sawgrass blades along a channel, airboat moving forward
const BL = Array.from({ length: 1400 }, (_, i) => ({ side: i % 2 ? 1 : -1, x: 14 + hash(i * 3) * 220, z: hash(i * 7) * 120, h: 1.4 + hash(i * 11) * 1.6, lean: (hash(i * 13) - .5) * .5, c: hash(i * 17) }));
function searchShot(t, h) {
  const [g0, g1] = TL.glance, p = ss(seg(t, g0, g1));
  camXf(lx, h, 1);
  if (p < 1) {
    lx.save(); lx.translate(0, -p * 620);
    const yh = 250, gr = lx.createLinearGradient(0, -100, 0, yh); gr.addColorStop(0, '#a9b2b3'); gr.addColorStop(1, '#d4d0c0');
    lx.fillStyle = gr; lx.fillRect(-100, -200, SW + 200, yh + 200);
    lx.fillStyle = '#6a6544'; lx.fillRect(-100, yh - 12, SW + 200, SH + 600);   // grass ground everywhere below the horizon
    lx.fillStyle = '#20282a'; lx.beginPath(); lx.moveTo(340, yh + 8); lx.lineTo(380, yh + 8); lx.lineTo(SW - 40, SH + 300); lx.lineTo(40, SH + 300); lx.fill();   // the channel
    // helicopter speck far off
    lx.fillStyle = '#3a3a3a'; lx.fillRect(560 + Math.sin(t * .3) * 20, 120, 7, 3);
    const camZ = (t - 32.2) * 6 * (1 - p), f = 300, Hc = 2.2;
    // dense rows of short blades in perspective (the grass mass), moving with the boat
    for (let k = 0; k < 140; k++) {
      const zr = ((k * .85 - camZ) % 119 + 119) % 119 + 1.2, y = yh + 10 + Hc * f / zr, hh0 = 1.1 * f / zr;
      if (y > SH + 60) continue;
      const half = 20 + (y - yh) * .17, kk = Math.floor(k * .85 / 119 + (k * .85 - camZ) / 119);
      lx.lineWidth = Math.max(1, 9 / zr);
      for (let q = 0; q < 34; q++) {
        const r = hash(k * 31 + q + kk * 7), side = q % 2 ? 1 : -1, X = 360 + side * (half + r * 420), hh = hh0 * (.6 + hash(q * 3 + k) * .8);
        const sh = 55 + hash(q + k * 5) * 45 + Math.min(30, 300 / zr);
        lx.strokeStyle = `rgb(${sh + 14},${sh + 10},${sh * .55})`;
        lx.beginPath(); lx.moveTo(X, y); lx.lineTo(X + (r - .5) * hh * .5, y - hh); lx.stroke();
      }
    }
    const list = BL.map(b => { const z = ((b.z - camZ) % 120 + 120) % 120 + 2; return { b, z }; }).sort((a, c) => c.z - a.z);
    for (const { b, z } of list) {
      const X = 360 + b.side * b.x * f / z / 12, Y = yh + 10 + Hc * f / z, hh = b.h * f / z;
      if (X < -60 || X > SW + 60) continue;
      const shade = 55 + b.c * 45 + Math.min(40, 300 / z);
      lx.strokeStyle = `rgb(${shade + 18},${shade + 12},${shade * .5})`; lx.lineWidth = Math.max(1.2, 22 / z);
      lx.beginPath(); lx.moveTo(X, Y); lx.quadraticCurveTo(X + b.lean * hh * .5, Y - hh * .6, X + b.lean * hh, Y - hh); lx.stroke();
    }
    lx.restore();
  }
  if (p > 0) {   // looking down: black water, a slow iridescent fuel sheen between the blades
    const GW = 240, GH = 180, d = gimg.data, tt = t * .05;
    for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++) {
      const i = (py * GW + px) * 4, u = px / 60, v = py / 60;
      const m = clamp((fbm(u * .8 + 4, v * .8 + tt, 3) - .42) / .2);
      const n = fbm(u * 1.4 + tt * 2, v * 1.4 - tt, 3);
      const hue = (n * 3.2 + t * .03) % 1, s = .35 * m;
      const r = .5 + .5 * Math.cos(6.283 * (hue + 0)), g = .5 + .5 * Math.cos(6.283 * (hue + .33)), bb = .5 + .5 * Math.cos(6.283 * (hue + .67));
      const base = 12 + vn(u * 9, v * 9 + tt) * 8;
      d[i] = base + (r * 120) * s; d[i + 1] = base + 2 + (g * 120) * s; d[i + 2] = base + 4 + (bb * 120) * s; d[i + 3] = 255;
    }
    gx.putImageData(gimg, 0, 0);
    lx.save(); lx.translate(0, (1 - p) * 620);
    lx.drawImage(gb, -20, -20, SW + 40, SH + 40);
    for (let i = 0; i < 22; i++) {   // tufts of blades standing out of the water, seen from above, with their reflections
      const x = (hash(i * 5) * .8 + .1) * SW, y = hash(i * 9) * SH, a = -1.6 + hash(i * 2) * 1.2, L = 30 + hash(i) * 60;
      for (let k = 0; k < 5; k++) { const b = a + (k - 2) * .32, LL = L * (.7 + hash(i * 7 + k) * .5);
        lx.strokeStyle = 'rgba(30,28,20,.5)'; lx.lineWidth = 7; lx.beginPath(); lx.moveTo(x + 4, y + 5); lx.quadraticCurveTo(x + 4 + Math.cos(b) * LL * .5, y + 5 + Math.sin(b) * LL * .4, x + 4 + Math.cos(b) * LL, y + 5 + Math.sin(b) * LL); lx.stroke();
        lx.strokeStyle = 'rgba(118,108,66,.97)'; lx.lineWidth = 5; lx.beginPath(); lx.moveTo(x, y); lx.quadraticCurveTo(x + Math.cos(b) * LL * .5, y + Math.sin(b) * LL * .4, x + Math.cos(b) * LL, y + Math.sin(b) * LL); lx.stroke(); }
    }
    lx.restore();
  }
  return 0;
}
const NOTICE = [
  ['h', 'NOTICE TO CARGO HANDLERS'], ['s', 'FORM CH-12  ·  REV. 3'],
  ['i', '1.  Oxygen generators are hazardous materials.'],
  ['i', '2.  Expired generators must have safety caps fitted.'],
  ['i', "3.  Never load oxygen generators into a passenger aircraft's cargo hold."],
  ['i', '4.  "Empty" on a label does not mean empty.'],
  ['c', 'Thank you for your attention.  — Management'],
];
let noticeBoxes = [];
function noticeShot(t, h) {
  const crouch = ss(seg(t, 47.5, 48.4));
  const fy = lerp(200, 270, crouch);
  camXf(lx, h, 1.0, SW / 2, fy);
  lx.fillStyle = '#93a084'; lx.fillRect(-100, -100, SW + 200, SH + 300);
  for (let i = 0; i < 60; i++) { lx.fillStyle = `rgba(60,70,50,${.04 + hash(i) * .05})`; lx.beginPath(); lx.arc(hash(i * 3) * SW, hash(i * 5) * (SH + 200) - 100, 20 + hash(i * 7) * 60, 0, 7); lx.fill(); }
  lx.save(); lx.translate(360, 280); lx.rotate(-.008);
  lx.fillStyle = '#e8ddb6'; lx.fillRect(-300, -250, 600, 520);
  lx.fillStyle = 'rgba(150,120,60,.12)'; lx.fillRect(-300, 200, 600, 70);   // yellowed foot
  lx.fillStyle = 'rgba(225,220,200,.75)'; for (const [x, y] of [[-300, -250], [300, -250], [-300, 270], [300, 270]]) { lx.save(); lx.translate(x, y); lx.rotate(.6); lx.fillRect(-34, -11, 68, 22); lx.restore(); }   // tape
  lx.fillStyle = '#1e1c18'; lx.textBaseline = 'alphabetic';
  let y = -196; const boxes = [];
  const wrapDraw = (str, font, lh, maxW) => { lx.font = font; const words = str.split(' '); let ln = '', lines = [];
    for (const w of words) { const tt = ln ? ln + ' ' + w : w; if (lx.measureText(tt).width > maxW && ln) { lines.push(ln); ln = w; } else ln = tt; } lines.push(ln);
    const y0 = y; lines.forEach((l, k) => lx.fillText(l, -262 + (k ? 34 : 0), y + k * lh)); y += lines.length * lh; return [y0, y]; };
  for (const [k, s] of NOTICE) {
    if (k === 'h') { lx.font = '700 38px "Plex Cond"'; lx.fillText(s, -262, y); boxes.push([s, y - 34, y + 6]); y += 30; }
    else if (k === 's') { lx.font = '400 17px "Plex Cond"'; lx.fillText(s, -262, y); y += 14; lx.fillRect(-262, y, 524, 3); y += 44; }
    else if (k === 'i') { const [a, b] = wrapDraw(s, '400 26px "Plex Cond"', 31, 520); boxes.push([s, a - 24, b - 24]); y += 14; }
    else { y += 16; lx.font = '400 19px "Plex Cond"'; lx.fillText(s, -262, y); }
  }
  lx.restore();
  noticeBoxes = boxes;
  return Math.max(0, 2.6 * (1 - seg(t, 47.6, 48.5)) + Math.abs(Math.sin((t - 47.6) * 6)) * (1 - seg(t, 48.3, 48.9)) * 1.2);
}

// ---------------- OSD per tape ----------------
const TAPE = {
  plane: { date: 'APR 27 1996', clock: [10, 41, 12, 'AM'], bat: 3 },
  terminal: { date: 'MAY 11 1996', clock: [2, 3, 51, 'PM'], bat: 3 },
  cockpit: { date: 'JUN  3 1996', clock: [9, 12, 30, 'AM'], bat: 2 },
  shore: { date: 'MAY 11 1996', clock: [2, 13, 20, 'PM'], bat: 2 },
  search: { date: 'MAY 12 1996', clock: [7, 30, 4, 'AM'], bat: 2 },
  notice: { date: 'NOV 19 1996', clock: [3, 47, 10, 'PM'], bat: 1 },
  dusk: { date: 'APR 27 1996', clock: [6, 58, 40, 'PM'], bat: 1 },
};
const pad = n => String(n).padStart(2, '0');
function clockStr([h, m, s, ap], dt) { let S = s + Math.floor(dt), M = m + Math.floor(S / 60); S %= 60; return `${h}:${pad(M % 60)}:${pad(S)} ${ap}`; }

// ---------------- captions (CEA-608 style) ----------------
const COLS = 32;
function wrap(s) { const out = []; let cur = ''; for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (t.length > COLS && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
TL.caps.forEach(c => c.rows = wrap(c.text));
function drawCaps(t) {
  cx2.clearRect(0, 0, W, H);
  const c = TL.caps.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const fs = 40, cw = fs * .6, rh = 52; cx2.font = `600 ${fs}px "IBM Plex Mono"`; cx2.textBaseline = 'middle';
  c.rows.forEach((r, i) => { const y = TOP + OH + 70 + i * rh, w = (r.length + 2) * cw, x0 = Math.round(W / 2 - w / 2);
    cx2.fillStyle = '#000'; cx2.fillRect(x0, y - rh / 2, w, rh); cx2.fillStyle = '#f2f2f2'; cx2.fillText(r, x0 + cw, y + 2); });
}

// ---------------- frame ----------------
const sceneAt = t => TL.scenes.find(s => t >= s[1] && t < s[2]) || TL.scenes[TL.scenes.length - 1];
function render(T) {
  let t = Math.min(T, TL.freeze);   // the battery dies: the last frame freezes
  const [name, a] = sceneAt(t);
  const dt = t - a;
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.filter = 'none'; sx.fillStyle = '#000'; sx.fillRect(0, 0, SW, SH);
  let blur = 0, tint = [1, 1, 1], expo = 1, gain = .035, off = 0;
  const useLayer = ['terminal', 'cockpit', 'shore', 'search', 'notice'].includes(name);
  if (useLayer) { lx.setTransform(1, 0, 0, 1, 0, 0); lx.filter = 'none'; lx.fillStyle = '#000'; lx.fillRect(0, 0, SW, SH); }
  if (name === 'plane' || name === 'dusk') { planeShot(t, name === 'dusk', hand(t, .6, { vib: 1.2 })); tint = name === 'dusk' ? [1.06, .98, .9] : [1.02, 1, .95]; if (name === 'dusk') { gain = .05; expo = .95; } }
  else if (name === 'terminal') { blur = terminalShot(t, hand(t, 1)); tint = [.95, 1.03, .93]; }
  else if (name === 'cockpit') { blur = cockpitShot(t, hand(t, .5)); expo = 1 - ss(seg(t, 24, 26.6)) * .15; gain = .04 + ss(seg(t, 22, 26.6)) * .03; }
  else if (name === 'shore') { blur = shoreShot(t, hand(t, .9, { bob: 1 })); tint = [1, 1, .96]; }
  else if (name === 'search') { blur = searchShot(t, hand(t, .8, { vib: 1.6 })); tint = [1.02, 1, .94]; }
  else if (name === 'notice') { blur = noticeShot(t, hand(t, .45)); tint = [1, 1.02, .92]; }
  else if (name === 'silence') { off = 1; }
  if (useLayer) { sx.setTransform(1, 0, 0, 1, 0, 0); sx.filter = blur > .15 ? `blur(${blur.toFixed(2)}px)` : 'none'; sx.drawImage(layer, 0, 0); sx.filter = 'none'; }
  // OSD
  const tp = TAPE[name];
  if (tp) {
    const ttl = name === 'plane' ? ['EVERGLADES'] : null, [ti0, ti1] = TL.title;
    drawOSD(osd, { rec: true, clock: clockStr(tp.clock, dt), date: tp.date, bat: tp.bat, batBlink: name === 'dusk' && T > TL.bat_blink, t: T,
      title: ttl && t >= ti0 && t < ti1 ? ttl : null, titleN: Math.floor((t - ti0) * 12) });
  } else drawOSD(osd, { hide: true });
  // tape events: tracking tears around every splice; the power-off at the end
  let track = 0, roll = 0;
  for (const tr of TL.tears) { const u = (T - tr); if (u > -.18 && u < .32) { track = Math.max(track, 1 - Math.abs(u - .05) / .3); roll = Math.max(roll, u > 0 && u < .12 ? (.12 - u) * 1.2 : 0); } }
  if (name === 'silence' && T < 27.1) { off = 0; track = 1; }
  const [o0, o1] = TL.off; if (T > o0) { off = Math.max(off, seg(T, o0, o1)); track = Math.max(track, .6 * (1 - seg(T, o0, o1))); }
  vhs({ frame: Math.floor(T * 30), tint, expo, gain, track, roll, off });
  drawCaps(T);
}
window.DUR = TL.dur;
window.render = render;
window.TEXTS = t => {
  const out = [];
  const [ti0, ti1] = TL.title;
  if (t >= ti0 + .9 && t < ti1) out.push({ id: 'title', text: 'EVERGLADES', x0: 300, y0: TOP + 250, x1: 780, y1: TOP + 330 });
  const [, n0, n1] = TL.scenes.find(s => s[0] === 'notice');
  if (t >= n0 + .5 && t < n1) noticeBoxes.forEach(([s, y0, y1], i) => out.push({ id: 'n' + i, text: s, x0: 80, y0: TOP + (y0 + 280 - 270) * 1.5 + 405 - 405, x1: 1000, y1: TOP + (y1 + 280 - 270) * 1.5 + 30 }));
  return out;
};
render(0); window.READY = true;
