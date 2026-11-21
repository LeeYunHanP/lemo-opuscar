// "The Real Stories Behind GTA 6" (long form): spliced camcorder tapes. Scenes are drawn in Canvas 2D at tape resolution (720×540), the OSD on its own canvas,
// then a VHS camcorder pass (ported from the style's demo) outputs the 4:3 picture full-width in a 1080×1920 vertical frame,
// with CEA-608-style captions in the black below it.
import { drawOSD, text as osdText, width as osdWidth } from './osd.js';

const W = 1920, H = 1080, SW = 720, SH = 540, LEFT = 240, OW = 1440, OH = 1080;
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
document.body.style.cssText = 'margin:0;background:#000;overflow:hidden;width:1920px;height:1080px';
const glc = mk(OW, OH); glc.style.cssText = `position:absolute;left:${LEFT}px;top:0`; document.body.appendChild(glc);
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

// timings of the Everglades reel's tapes, which these scene functions were written against
const OLD = { smoke: [19.8, 26.6], dive: [28.9, 29.8], birds: 30.2, glance: [39.8, 40.9], scenes: [['notice', 47.5, 55.0]] };
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
  const [s0, s1] = OLD.smoke, k = ss(seg(t, s0, s1));
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
  const [d0, d1] = OLD.dive;
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
  const b = t - OLD.birds;
  if (b > 0) for (let i = 0; i < 11; i++) { const bx = 380 + hash(i) * 100 + b * (hash(i + 5) - .3) * 40, by = 280 - b * (30 + hash(i + 9) * 40), fl = Math.sin(t * 18 + i) * 3;
    lx.strokeStyle = '#2b2b2b'; lx.lineWidth = 1.6; lx.beginPath(); lx.moveTo(bx - 4, by - fl); lx.lineTo(bx, by); lx.lineTo(bx + 4, by - fl); lx.stroke(); }
  return zk > .02 ? Math.abs(Math.sin((t - 28.7) * 3.3)) * 2.2 * (1 - seg(t, 31, 31.8)) : 0;
}
// sawgrass blades along a channel, airboat moving forward
const BL = Array.from({ length: 1400 }, (_, i) => ({ side: i % 2 ? 1 : -1, x: 14 + hash(i * 3) * 220, z: hash(i * 7) * 120, h: 1.4 + hash(i * 11) * 1.6, lean: (hash(i * 13) - .5) * .5, c: hash(i * 17) }));
function searchShot(t, h) {
  const [g0, g1] = OLD.glance, p = ss(seg(t, g0, g1));
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
