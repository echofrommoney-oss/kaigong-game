// 紙：紙紋貼圖、卡紙材質、形狀工具、Kit（把很多片卡紙合併成一個網格，切面自動變淺）。
import { THREE, rand } from './core.js';

export function makePaperCanvas(size = 256, base = 255, grain = 16) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const id = x.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const n = base - Math.random() * grain; id.data[i * 4] = n; id.data[i * 4 + 1] = n - 1; id.data[i * 4 + 2] = n - 4; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  const wrapDraw = fn => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * size, py = Math.random() * size, r = rand(20, 70), a = rand(.02, .05);
    wrapDraw(() => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(150,125,95,${a})`); g.addColorStop(1, 'rgba(150,125,95,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); });
  }
  x.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const px = Math.random() * size, py = Math.random() * size, a = Math.random() * 6.28, l = rand(4, 16); const dark = Math.random() < .6;
    wrapDraw(() => { x.strokeStyle = dark ? 'rgba(120,95,70,.10)' : 'rgba(255,255,255,.5)'; x.lineWidth = rand(.4, 1); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l * .5, py + Math.sin(a + 1) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); });
  }
  return c;
}
export const paperCanvas = makePaperCanvas();

// DOM 用的細紙紋（介面的紙卡都疊這層）
try {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const id = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const d = Math.random() < .5; id.data[i * 4] = d ? 90 : 255; id.data[i * 4 + 1] = d ? 70 : 255; id.data[i * 4 + 2] = d ? 50 : 250; id.data[i * 4 + 3] = Math.random() * 14; }
  x.putImageData(id, 0, 0); document.documentElement.style.setProperty('--paperTex', `url(${c.toDataURL()})`);
} catch (e) { /* 沒有紙紋也能玩 */ }

export function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const paperTex = canvasTex(paperCanvas); paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;

export const CREAM = new THREE.Color(0xfffaf0);
const matCache = new Map();
export function mats(hex) {
  if (matCache.has(hex)) return matCache.get(hex);
  const c = new THREE.Color(hex);
  const m = [new THREE.MeshLambertMaterial({ color: c, map: paperTex }), new THREE.MeshLambertMaterial({ color: c.clone().lerp(CREAM, .6), map: paperTex })];
  matCache.set(hex, m); return m;
}
export const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: paperTex });

export const SH = {
  poly(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; },
  rect(w, h, x = 0, y = 0) { return SH.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x - w / 2, y + h]]); },
  rectC(w, h, x = 0, y = 0) { return SH.rect(w, h, x, y - h / 2); },
  round(w, h, r, x = 0, y = 0) { const s = new THREE.Shape(); const x0 = x - w / 2, y0 = y; s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s; },
  circle(r, x = 0, y = 0) { const s = new THREE.Shape(); s.absarc(x, y, r, 0, Math.PI * 2, false); return s; },
  ring(r, r2, x = 0, y = 0) { const s = SH.circle(r, x, y); const h = new THREE.Path(); h.absarc(x, y, r2, 0, Math.PI * 2, true); s.holes.push(h); return s; },
  blob(r, n = 7, seed = 0, cx = 0, cy = 0, sy = 1, flat = -9) { const pts = []; for (let k = 0; k < 56; k++) { const a = k / 56 * Math.PI * 2; const rr = r * (.86 + .14 * Math.abs(Math.sin(a * n / 2 + seed))); pts.push([cx + Math.cos(a) * rr, Math.max(cy + flat * r, cy + Math.sin(a) * rr * sy)]); } return SH.poly(pts); },
  withHoles(shape, holes) { for (const [w, h, x, y] of holes) { const p = new THREE.Path(); p.moveTo(x - w / 2, y); p.lineTo(x + w / 2, y); p.lineTo(x + w / 2, y + h); p.lineTo(x - w / 2, y + h); p.closePath(); shape.holes.push(p); } return shape; },
};
export function exGeo(shape, depth, seg = 10) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -depth / 2); return g; }
export function mk(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export class Kit {
  constructor() { this.list = []; }
  // 把形狀擠出 depth（沿 z），放到 pos，旋轉 rot（YXZ 順序）
  add(shape, depth, hex, pos = [0, 0, 0], rot = [0, 0, 0], scl = 1) {
    const g = exGeo(shape, depth, 8);
    _m4.compose(_v.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2], 'YXZ')), typeof scl === 'number' ? _s.set(scl, scl, scl) : _s.set(scl[0], scl[1], scl[2]));
    g.applyMatrix4(_m4); this.list.push([g, hex]); return this;
  }
  // 底部對齊的方塊：寬 w（x）、高 h（y）、深 d（z），pos 是底面中心
  box(w, h, d, hex, pos = [0, 0, 0], ry = 0) { return this.add(SH.rect(w, h), d, hex, pos, [0, ry, 0]); }
  // 平放在地上的形狀（形狀的 y 變成 -z）
  flat(shape, depth, hex, pos = [0, 0, 0], ry = 0) { return this.add(shape, depth, hex, pos, [-Math.PI / 2, ry, 0]); }
  // 直立圓柱（半徑 r、高 h），pos 是底面中心
  cyl(r, h, hex, pos = [0, 0, 0]) { return this.add(SH.circle(r), h, hex, [pos[0], pos[1] + h / 2, pos[2]], [Math.PI / 2, 0, 0]); }
  // 水平管：從 a 到 b（只支援沿 x 或 z）
  pipe(r, a, b, hex) {
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || .01; const mid = [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2];
    const ry = Math.atan2(dx, dz); return this.add(SH.circle(r), len, hex, mid, [0, ry, 0]);
  }
  geometry() {
    let n = 0; for (const [g] of this.list) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = new Float32Array(n * 3); let o = 0; const c = new THREE.Color(), cl = new THREE.Color();
    for (const [g, hex] of this.list) {
      const p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv; c.set(hex); cl.copy(c).lerp(CREAM, .6);
      const sideStart = g.groups.length > 1 ? g.groups[1].start : 1e9;
      P.set(p.array, o * 3); N.set(nn.array, o * 3); U.set(u.array, o * 2);
      for (let i = 0; i < p.count; i++) { const cc = i >= sideStart ? cl : c; C[(o + i) * 3] = cc.r; C[(o + i) * 3 + 1] = cc.g; C[(o + i) * 3 + 2] = cc.b; }
      o += p.count; g.dispose();
    }
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    G.setAttribute('uv', new THREE.BufferAttribute(U, 2)); G.setAttribute('color', new THREE.BufferAttribute(C, 3));
    G.computeBoundingSphere(); return G;
  }
  mesh(cast = true) { const m = mk(this.geometry(), vcMat, cast, true); return m; }
}

// 釋放整棵物件的幾何（材質共用，不釋放）
export function disposeTree(obj) { obj.traverse(m => { if (m.geometry) m.geometry.dispose(); }); if (obj.parent) obj.parent.remove(obj); }
