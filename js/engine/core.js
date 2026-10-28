// 核心：renderer、場景、相機、畫質分級、主迴圈與計時器。
// 底子是〈十五局 07 紙上小島〉的引擎：五級畫質、軟體算圖自動降級、慢就自動降一級。
import * as THREE from 'three';
export { THREE };
export const gsap = window.gsap;
gsap.ticker.lagSmoothing(0);

export const Qs = new URLSearchParams(location.search);
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const TOUCH = matchMedia('(pointer: coarse)').matches;
export const FONT = '"Huninn","jf open 粉圓","PingFang TC","Noto Sans CJK TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
export const EASE_POP = RM ? 'power2.out' : 'elastic.out(1.05,0.42)';
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[(Math.random() * a.length) | 0];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };

export const canvas = document.getElementById('c');

function detectSoftware() {
  try {
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return false;
    const e = gl.getExtension('WEBGL_debug_renderer_info'); const r = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '';
    const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(String(r));
  } catch (e) { return false; }
}
export const SOFT = detectSoftware();

export let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !SOFT, powerPreference: 'high-performance' }); }
catch (e) { document.getElementById('err').style.display = 'grid'; throw e; }

const DPR_MAX = TOUCH ? 1.75 : 2;
export const TIERS = [
  { dpr: Math.min(window.devicePixelRatio || 1, DPR_MAX), sm: TOUCH ? 1024 : 2048, type: THREE.PCFSoftShadowMap, name: '高' },
  { dpr: Math.min(window.devicePixelRatio || 1, 1.25), sm: 1024, type: THREE.PCFShadowMap, name: '中高' },
  { dpr: .85, sm: 1024, type: THREE.PCFShadowMap, name: '中' },
  { dpr: .7, sm: 1024, type: THREE.BasicShadowMap, name: '低' },
  { dpr: .5, sm: 512, type: THREE.BasicShadowMap, name: '最低' },
];
export const quality = { tier: Qs.get('q') === 'high' ? 0 : Qs.get('q') === 'low' ? 4 : SOFT ? 4 : 0, lock: Qs.has('q') };
renderer.setPixelRatio(TIERS[quality.tier].dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = TIERS[quality.tier].type;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e1d3);
scene.fog = new THREE.Fog(0xe9e1d3, 45, 110);
export const camera = new THREE.PerspectiveCamera(35, 1, 0.3, 220);

const LIGHT_K = 2.0;
export const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd9c4a8, 1.0 * LIGHT_K); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff3e0, 1.55 * LIGHT_K);
sun.castShadow = true; sun.shadow.mapSize.set(TIERS[quality.tier].sm, TIERS[quality.tier].sm);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = .03;
sun.position.set(6, 12, 8); scene.add(sun, sun.target); sun.target.position.set(0, 1, 0);

/* ---------- 計時器（跟著遊戲時間走，分頁切走會暫停） ---------- */
export const clock = { t: 0 };
const timers = [];
export function wait(s) { return new Promise(r => timers.push({ t: clock.t + s, r })); }
const updaters = new Set();
export function onUpdate(fn) { updaters.add(fn); return () => updaters.delete(fn); }

/* ---------- 相機：紙上小島的軌道相機 ---------- */
export const cam = { theta: .38, phi: .62, r: 30, tx: 3.9, ty: .6, tz: 1.6 };
export const camT = { ...cam };
export const view = { off: 0, offT: 0, offX: 0, offXT: 0, zoom: 1, zoomT: 1, shake: 0, limits: { th: [-.35, 1.35], ph: [.55, 1.32] } };
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 6);
  for (const key in cam) cam[key] += (camT[key] - cam[key]) * k;
  view.zoom += (view.zoomT - view.zoom) * k; view.off += (view.offT - view.off) * k; view.offX += (view.offXT - view.offX) * k;
  const r = cam.r * view.zoom;
  camera.position.set(cam.tx + r * Math.sin(cam.phi) * Math.sin(cam.theta), cam.ty + r * Math.cos(cam.phi), cam.tz + r * Math.sin(cam.phi) * Math.cos(cam.theta));
  camera.lookAt(cam.tx, cam.ty, cam.tz);
  if (view.shake > 0) { camera.position.x += rand(-1, 1) * view.shake * .12; camera.position.y += rand(-1, 1) * view.shake * .08; }
  const W = innerWidth, H = innerHeight;
  if (Math.abs(view.off) > .5 || Math.abs(view.offX) > .5) camera.setViewOffset(W, H, view.offX, view.off, W, H); else camera.clearViewOffset();
}
export function shake(v) { view.shake = Math.max(view.shake, v); }

const resizers = new Set();
export function onResize(fn) { resizers.add(fn); }
export function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  resizers.forEach(f => f(W, H));
}
window.addEventListener('resize', resize);

/* ---------- 畫質自動降級 ---------- */
let perfAcc = 0, perfN = 0;
export function applyTier(k) {
  quality.tier = k; const T = TIERS[k]; renderer.setPixelRatio(T.dpr); resize();
  if (renderer.shadowMap.type !== T.type || sun.shadow.mapSize.x !== T.sm) {
    renderer.shadowMap.type = T.type; sun.shadow.mapSize.set(T.sm, T.sm);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    scene.traverse(m => { if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.needsUpdate = true); });
  }
}
function perfWatch(ms) {
  if (quality.lock || quality.tier >= TIERS.length - 1 || document.hidden) return;
  perfAcc += ms; perfN++;
  if (perfN >= 45) { const avg = perfAcc / perfN; perfAcc = perfN = 0; if (avg > 38) applyTier(quality.tier + 1); }
}

/* ---------- 射線 ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
export function raycast(cx, cy, objects, recursive = true) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(objects, recursive);
}
export function toScreen(obj) {
  const b = new THREE.Box3().setFromObject(obj); const p = new THREE.Vector3(); b.getCenter(p); p.project(camera);
  return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
}

/* ---------- 主迴圈 ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - last; const dt = Math.min(.25, raw / 1000); last = now;
  perfWatch(raw);
  clock.t += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (clock.t >= timers[i].t) { const tm = timers.splice(i, 1)[0]; tm.r(); }
  view.shake = Math.max(0, view.shake - dt * 2.5);
  updaters.forEach(f => f(dt, clock.t));
  updateCamera(dt);
  renderer.render(scene, camera);
}
export function start() { resize(); requestAnimationFrame(t => { last = t; frame(t); }); }
