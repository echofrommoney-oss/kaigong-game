// 紙片粒子：彩紙、灰塵、碎屑。共用一個 InstancedMesh。
import { THREE, scene, rand, pick, RM, TOUCH, onUpdate } from './core.js';
import { paperTex } from './paper.js';

const _m4 = new THREE.Matrix4();
class Pool {
  constructor(n, mat, geo) {
    this.n = n; this.m = new THREE.InstancedMesh(geo, mat, n); this.m.frustumCulled = false; this.ps = [];
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { this.ps.push({ life: 0 }); this.m.setMatrixAt(i, z); this.m.setColorAt(i, new THREE.Color(1, 1, 1)); }
    this.cur = 0; this.zero = z; scene.add(this.m);
  }
  emit(o) {
    let i = -1; for (let k = 0; k < this.n; k++) { const t = (this.cur + k) % this.n; if (this.ps[t].life <= 0) { i = t; break; } }
    if (i < 0) i = this.cur; this.cur = (i + 1) % this.n; const p = this.ps[i];
    Object.assign(p, { pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : new THREE.Vector3(), life: o.life || 1, max: o.life || 1, size: o.size || .1, sx: o.sx || 1, grav: o.grav || 0, drag: o.drag || 0, rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(o.spin ?? 4) });
    this.m.setColorAt(i, new THREE.Color(o.color ?? 0xffffff)); this.m.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let any = false; const q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < this.n; i++) {
      const p = this.ps[i]; if (p.life <= 0) continue; any = true; p.life -= dt;
      if (p.life <= 0) { this.m.setMatrixAt(i, this.zero); continue; }
      p.vel.y += p.grav * dt; p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.pos.addScaledVector(p.vel, dt);
      const k = 1 - p.life / p.max; const sc = p.size * Math.min(1, k * 10) * Math.min(1, p.life / .5);
      p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt; q.setFromEuler(p.rot);
      _m4.compose(p.pos, q, s.set(sc * p.sx, sc, sc)); this.m.setMatrixAt(i, _m4);
    }
    if (any || this.dirty) { this.m.instanceMatrix.needsUpdate = true; this.dirty = any; }
  }
}
export const paperPool = new Pool(TOUCH ? 150 : 240, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: paperTex }), new THREE.CircleGeometry(.5, 9));
onUpdate(dt => paperPool.update(dt));
const PMUL = RM ? .5 : 1;
export function confetti(pos, n = 12, cols = ['#f4a7b9', '#f7d774', '#9fd3df', '#a9d39b', '#fffaf0']) {
  for (let k = 0; k < n * PMUL; k++) paperPool.emit({ pos: pos.clone().add(new THREE.Vector3(rand(-.2, .2), .2, rand(-.2, .2))), vel: new THREE.Vector3(rand(-1.6, 1.6), rand(1.8, 3.4), rand(-1.6, 1.6)), grav: -7, drag: 1.2, life: rand(.7, 1.1), size: rand(.06, .1), sx: .6, color: pick(cols), spin: 9 });
}
export function dust(pos, n = 10, col = '#e9a08e', spread = .5) {
  for (let k = 0; k < n * PMUL; k++) paperPool.emit({ pos: pos.clone().add(new THREE.Vector3(rand(-.1, .1) * spread * 2, rand(-.1, .1), rand(-spread, spread))), vel: new THREE.Vector3(rand(-.8, 1.2), rand(.2, 1.4), rand(-.6, .6)), grav: -6, drag: 1.5, life: rand(.5, .9), size: rand(.05, .09), color: pick([col, '#fffaf0', '#d6cab4']), spin: 8 });
}
export function sparks(pos, n = 10) {
  for (let k = 0; k < n * PMUL; k++) paperPool.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-1.5, 1.5), rand(.5, 2.5), rand(-1.5, 1.5)), grav: -9, drag: .5, life: rand(.3, .6), size: rand(.03, .05), color: pick(['#ffc96b', '#ffe39a', '#f0ad3e']), spin: 12 });
}
