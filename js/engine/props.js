// 房間與道具：全部是卡紙做的。單位 1＝1 公尺，道具的原點在底面中心。
import { THREE, gsap, camera, scene, EASE_POP, RM, rand, pick, onUpdate } from './core.js';
import { Kit, SH, mk, mats, exGeo, paperTex, disposeTree } from './paper.js';
import { PAGE_Y } from './book.js';
import { SFX } from './audio.js';

export const C = {
  wall: '#d6cab4', wallW: '#efe7d8', wood: '#e6cfa8', wood2: '#ead6b3', concrete: '#cfc6b6', coral: '#e4846f', coral2: '#d9735f', teal: '#3e6c70', teal2: '#82b2b6',
  cream: '#fbf6ec', white: '#fffdf7', ink: '#4b3f37', ink2: '#85705f', yellow: '#ffc96b', orange: '#e08a4f', blue: '#7fb6d6', sage: '#9cc995', green: '#5e9a6b', grey: '#9a948b', steel: '#c9ccd0', red: '#cf5a43',
};

/* ---------- 房間 ---------- */
// 前面和右邊開著讓你看進去；樓板是半透明描圖紙，看得到天花板上面
export function buildRoom(o = {}) {
  const w = o.w ?? 4.5, d = o.d ?? 3.6, h = o.h ?? 3.0;
  const X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  const root = new THREE.Group(); root.position.y = PAGE_Y + .02; scene.add(root);
  const floor = new THREE.Group(); root.add(floor);
  {
    const k = new Kit(); k.flat(SH.rect(w + .3, d + .3, 0, -(d + .3) / 2), .12, o.base ?? '#d9cbb3', [0, .06, 0]);
    const kind = o.floor ?? 'wood';
    if (kind === 'wood') for (let i = 0; i < Math.round(d / .4); i++) k.flat(SH.rect(w, .38, 0, -d / 2 + i * .4), .02, i % 2 ? C.wood : C.wood2, [0, .13, 0]);
    else if (kind === 'concrete') k.flat(SH.rect(w, d, 0, -d / 2), .02, C.concrete, [0, .13, 0]);
    else if (kind === 'checker') for (let i = 0; i < Math.round(w / .45); i++) for (let j = 0; j < Math.round(d / .45); j++) k.flat(SH.rect(.44, .44, X0 + .225 + i * .45, -(Z0 + .225 + j * .45) - .22), .02, (i + j) % 2 ? '#e9e2d4' : '#4b3f37', [0, .13, 0]);
    else if (kind === 'carpet') k.flat(SH.rect(w, d, 0, -d / 2), .03, '#b7c3c6', [0, .13, 0]);
    floor.add(k.mesh());
  }
  const wallHex = o.wall ?? C.wall;
  const back = new THREE.Group(); back.position.set(0, .12, Z0 - .07); root.add(back);
  {
    const s = SH.rect(w + .3, h); const holes = [];
    if (o.window !== false) holes.push([1.2, 1.1, o.winX ?? -w / 4.5, 1.0]);
    SH.withHoles(s, holes); back.add(mk(exGeo(s, .14), mats(wallHex)));
    if (o.window !== false) {
      const wx = o.winX ?? -w / 4.5; const k = new Kit();
      k.add(SH.rect(1.3, .08, wx, .96), .2, C.cream); k.add(SH.rect(.06, 1.1, wx, 1.0), .05, C.cream); k.add(SH.rect(1.3, .06, wx, 2.08), .16, C.cream);
      k.add(SH.blob(.22, 5, 1, wx - .25, 1.75, .6, -.3), .02, '#ffffff', [0, 0, -.1]); k.add(SH.circle(.11, wx + .35, 1.8), .02, C.yellow, [0, 0, -.11]);
      back.add(k.mesh());
      const sky = mk(new THREE.PlaneGeometry(1.3, 1.2), new THREE.MeshBasicMaterial({ color: 0xbfe5ea }), false, false); sky.position.set(wx, 1.55, -.12); back.add(sky);
    }
  }
  const left = new THREE.Group(); left.position.set(X0 - .07, .12, 0); root.add(left);
  {
    const s = SH.rect(d + .3, h); if (o.door) SH.withHoles(s, [[.9, 2.1, o.doorZ ?? d / 4, 0]]);
    const m = mk(exGeo(s, .14), mats(wallHex)); m.rotation.y = Math.PI / 2; left.add(m);
    if (o.door) { const dz = o.doorZ ?? d / 4; const k = new Kit(); k.add(SH.rect(1.0, .06, dz, 2.1), .18, C.cream); k.add(SH.rect(.06, 2.1, dz - .48, 0), .18, C.cream); k.add(SH.rect(.06, 2.1, dz + .48, 0), .18, C.cream); const f = k.mesh(); f.rotation.y = Math.PI / 2; left.add(f); }
  }
  const slabMat = new THREE.MeshLambertMaterial({ color: 0xf3ede2, map: paperTex, transparent: true, opacity: .42, depthWrite: false });
  const slab = new THREE.Group(); slab.position.y = .12 + h; root.add(slab);
  {
    const m = mk(new THREE.BoxGeometry(w + .3, .12, d + .3), slabMat, false, false); m.position.y = .06; slab.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + .3, .12, d + .3)), new THREE.LineBasicMaterial({ color: 0xb8a586 })); e.position.y = .06; slab.add(e);
    const k = new Kit(); for (const [x, z] of [[X1 + .1, Z1 + .1], [X1 + .1, Z0 - .05], [X0 - .05, Z1 + .1]]) k.add(SH.rect(.12, h), .02, '#f4ead6', [x, -h, z], [0, .7, 0]); slab.add(k.mesh());
  }
  const inside = new THREE.Group(); inside.position.y = .12; root.add(inside);   // 所有施工的東西放這裡（y=0 是地板面）
  const R = { root, floor, back, left, slab, slabMat, inside, w, d, h, X0, X1, Z0, Z1, layers: {} };
  R.layer = name => { if (!R.layers[name]) { const g = new THREE.Group(); g.name = name; inside.add(g); R.layers[name] = g; } return R.layers[name]; };
  R.folded = () => { back.rotation.x = -Math.PI / 2; left.rotation.z = Math.PI / 2; floor.scale.set(.6, .001, .6); inside.scale.set(1, .001, 1); slab.visible = false; root.visible = false; };
  R.popUp = async () => {
    root.visible = true; R.folded(); root.visible = true;
    gsap.to(floor.scale, { x: 1, y: 1, z: 1, duration: .8, ease: EASE_POP, onStart: () => SFX.pop(.9) });
    gsap.to(back.rotation, { x: 0, duration: 1.0, delay: .25, ease: EASE_POP, onStart: () => SFX.flip(.6) });
    gsap.to(left.rotation, { z: 0, duration: 1.0, delay: .42, ease: EASE_POP, onStart: () => SFX.flip(.6) });
    gsap.to(inside.scale, { y: 1, duration: .9, delay: .7, ease: EASE_POP, onStart: () => SFX.pop(1.1) });
    setTimeout(() => { slab.visible = true; slab.position.y = .12 + h + 2.5; gsap.to(slab.position, { y: .12 + h, duration: .9, ease: RM ? 'power2.out' : 'bounce.out', onStart: () => SFX.pop(.8) }); }, 1000);
    await new Promise(r => setTimeout(r, 1900));
  };
  R.foldDown = async () => {
    gsap.to(slab.position, { y: .12 + h + 3, duration: .5, ease: 'power2.in' }); gsap.to(slabMat, { opacity: 0, duration: .5 });
    gsap.to(inside.scale, { y: .001, duration: .5, ease: 'back.in(1.5)' });
    gsap.to(back.rotation, { x: -Math.PI / 2, duration: .6, delay: .2, ease: 'power2.in' });
    gsap.to(left.rotation, { z: Math.PI / 2, duration: .6, delay: .25, ease: 'power2.in' });
    gsap.to(floor.scale, { y: .001, duration: .4, delay: .6, ease: 'power2.in', onStart: () => SFX.flip(.7) });
    await new Promise(r => setTimeout(r, 1100)); disposeTree(root);
  };
  return R;
}

/* ---------- 動畫小工具 ---------- */
export function popIn(obj, delay = 0, axis = 'y') { obj.visible = true; const s = obj.scale.clone(); obj.scale[axis] = .001; gsap.to(obj.scale, { [axis]: s[axis] || 1, duration: .9, delay, ease: EASE_POP, onStart: () => SFX.pop(rand(.9, 1.2)) }); return obj; }
export function dropIn(obj, delay = 0, hgt = 1.4) { const y = obj.position.y; obj.position.y = y + hgt; obj.visible = true; gsap.to(obj.position, { y, duration: .8, delay, ease: RM ? 'power2.out' : 'bounce.out', onStart: () => SFX.pop(1.1) }); return obj; }
export function growX(obj, delay = 0) { obj.visible = true; obj.scale.x = .001; gsap.to(obj.scale, { x: 1, duration: .6, delay, ease: 'power2.out' }); return obj; }
export function popOut(obj, delay = 0) { gsap.to(obj.scale, { x: .001, y: .001, z: .001, duration: .4, delay, ease: 'back.in(2)', onComplete: () => { obj.visible = false; } }); }
export function place(layer, mesh, x = 0, y = 0, z = 0, ry = 0) { mesh.position.set(x, y, z); mesh.rotation.y = ry; layer.add(mesh); return mesh; }

/* ---------- 紙片人 ---------- */
const people = new Set();
onUpdate((dt, t) => { for (const p of people) { if (!p.g.parent) { people.delete(p); continue; } const wp = p.g.getWorldPosition(new THREE.Vector3()); p.g.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z); p.inner.position.y = Math.abs(Math.sin(t * 2.2 + p.ph)) * .02; } });
export function person(o = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const k = new Kit(); const s = 1.7;
  const body = o.body ?? C.coral, pants = o.pants ?? C.teal;
  k.add(SH.poly([[-.13, .12], [.13, .12], [.1, .35], [.06, .385], [-.06, .385], [-.1, .35]]), .04, body, [0, 0, 0], [0, 0, 0], s);
  if (o.vest) k.add(SH.poly([[-.11, .14], [-.04, .14], [-.05, .36], [-.09, .34]]), .045, o.vest, [0, 0, 0], [0, 0, 0], s), k.add(SH.poly([[.04, .14], [.11, .14], [.09, .34], [.05, .36]]), .045, o.vest, [0, 0, 0], [0, 0, 0], s);
  k.add(SH.rect(.2, .12, 0, .13), .045, pants, [0, 0, 0], [0, 0, 0], s);
  k.add(SH.circle(.088, 0, .475), .04, o.skin ?? '#f7d9bf', [0, 0, 0], [0, 0, 0], s);
  if (o.helmet) { const hs = new THREE.Shape(); hs.absarc(0, .5, .1, 0, Math.PI, false); hs.lineTo(-.12, .5); hs.lineTo(.12, .5); k.add(hs, .05, o.helmet, [0, 0, 0], [0, 0, 0], s); k.add(SH.rect(.26, .02, 0, .495), .055, '#f0ad3e', [0, 0, 0], [0, 0, 0], s); }
  else if (o.hair) { const hs = new THREE.Shape(); hs.absarc(0, .49, .095, -.2, Math.PI + .2, false); k.add(hs, .05, o.hair, [0, 0, 0], [0, 0, 0], s); }
  if (o.cap) { k.add(SH.rect(.2, .05, 0, .54), .05, o.cap, [0, 0, 0], [0, 0, 0], s); k.add(SH.rect(.1, .015, .1, .54), .055, o.cap, [0, 0, 0], [0, 0, 0], s); }
  if (o.clip) k.add(SH.rect(.09, .12, .14, .2), .05, C.cream, [0, 0, .02], [0, 0, .2], s);
  k.add(SH.circle(.012, -.03, .47), .05, C.ink, [0, 0, 0], [0, 0, 0], s); k.add(SH.circle(.012, .035, .47), .05, C.ink, [0, 0, 0], [0, 0, 0], s);
  k.add(SH.circle(.016, -.05, .44), .045, '#f4a7a0', [0, 0, 0], [0, 0, 0], s); k.add(SH.circle(.016, .06, .44), .045, '#f4a7a0', [0, 0, 0], [0, 0, 0], s);
  inner.add(k.mesh());
  for (const x of [-.05, .05]) { const m = mk(exGeo(SH.rect(.045, .13, 0, 0), .035), mats('#5d5047')); m.position.set(x * s, 0, 0); m.scale.setScalar(s); inner.add(m); }
  const p = { g, inner, ph: rand(0, 3) }; people.add(p); g.userData.person = p; return g;
}
export const CAST = {
  worker: () => person({ helmet: C.yellow }),
  boss: () => person({ body: C.teal2, pants: C.ink, helmet: '#ffffff' }),
  inspector: () => person({ body: '#5b7aa3', pants: C.ink, vest: '#ffc96b', helmet: '#ffffff', clip: true }),
  reviewer: () => person({ body: C.cream, pants: '#6b6b7a', hair: C.ink, clip: true }),
  owner: () => person({ body: C.sage, pants: '#6b5a4b', hair: '#5d5047' }),
  plumber: () => person({ body: C.blue, pants: C.ink, cap: C.blue }),
  eco: () => person({ body: C.green, pants: C.ink, cap: C.green, clip: true }),
  energy: () => person({ body: C.yellow, pants: C.teal, hair: C.ink }),
};

/* ---------- 共用道具 ---------- */
export const P = {
  brickRows(len, h, rows, t = .2, hex = [C.coral, C.coral2]) {
    const list = []; const rh = h / rows; const n = Math.max(2, Math.round(len / .55)); const bl = len / n;
    for (let r = 0; r < rows; r++) {
      const k = new Kit(); const off = r % 2 ? bl / 2 : 0;
      for (let i = -1; i <= n; i++) { const z0 = Math.max(-len / 2, -len / 2 + i * bl + off), z1 = Math.min(len / 2, -len / 2 + (i + 1) * bl + off - .02); if (z1 - z0 < .05) continue; k.add(SH.rect(t, rh - .025, 0, r * rh + .012), z1 - z0, (i + r) % 3 ? hex[0] : hex[1], [0, 0, (z0 + z1) / 2]); }
      const m = k.mesh(); m.userData.row = r; list.push(m);
    }
    return list;
  },
  debris(n = 4, cols = [C.coral, C.coral2, '#c96a56']) { const k = new Kit(); for (let i = 0; i < n; i++) k.add(SH.rect(.22, .1), .12, pick(cols), [rand(-.4, .4), rand(0, .15), rand(-.3, .3)], [rand(-.4, .4), rand(0, 3), rand(-.4, .4)]); return k.mesh(); },
  ladder(hgt = 1.6) { const k = new Kit(); const sp = .45; for (const s of [-1, 1]) { k.add(SH.rect(.05, hgt * 1.04), .05, C.teal, [-.25, 0, s * sp * .5], [0, 0, -.25]); k.add(SH.rect(.05, hgt * 1.04), .05, C.teal, [.25, 0, s * sp * .5], [0, 0, .25]); } for (let i = 1; i < 5; i++) { const y = i * hgt / 5; const dx = .25 - Math.tan(.25) * y; k.add(SH.rect(.04, .04, 0, y), sp, C.cream, [-dx, 0, 0]); } return k.mesh(); },
  extinguisher() { const k = new Kit(); k.cyl(.09, .45, C.red); k.add(SH.rect(.08, .08, 0, .45), .04, C.ink); k.add(SH.rect(.12, .02, .04, .53), .03, C.ink); return k.mesh(); },
  exitSign() { const k = new Kit(); k.box(.4, .16, .05, '#3fa36b'); k.add(SH.rect(.3, .08, 0, .04), .055, '#e3f6e9'); return k.mesh(); },
  smoke() { const k = new Kit(); k.add(SH.circle(.09), .04, C.white, [0, 0, 0], [Math.PI / 2, 0, 0]); k.add(SH.circle(.02), .05, C.red, [0, -.01, 0], [Math.PI / 2, 0, 0]); return k.mesh(); },
  sprinkler() { const k = new Kit(); k.cyl(.02, .12, C.steel, [0, -.12, 0]); k.add(SH.circle(.06), .015, C.steel, [0, -.13, 0], [Math.PI / 2, 0, 0]); return k.mesh(); },
  outlet() { const k = new Kit(); k.box(.09, .12, .02, C.white); k.add(SH.rect(.01, .03, -.02, .045), .03, C.ink); k.add(SH.rect(.01, .03, .02, .045), .03, C.ink); return k.mesh(); },
  panel() { const k = new Kit(); k.box(.45, .6, .14, '#c8cfd4'); k.add(SH.rect(.38, .52, 0, .04), .15, '#dfe4e7'); k.add(SH.rect(.05, .05, .14, .3), .16, C.red); return k.mesh(); },
  sofa(c = C.teal) { const k = new Kit(); k.box(2.0, .42, .85, c, [0, 0, 0]); k.box(2.0, .55, .18, c, [0, .42, -.36]); k.box(.7, .2, .5, C.teal2, [-.45, .42, .05]); k.box(.7, .2, .5, C.teal2, [.45, .42, .05]); return k.mesh(); },
  plant() { const k = new Kit(); k.box(.32, .38, .32, C.coral, [0, 0, 0]); for (let a = 0; a < 5; a++) k.add(SH.blob(.12, 4, a, 0, .45 + a * .07, 2.2, -1), .02, a % 2 ? '#7fbf86' : C.green, [0, .1, 0], [0, a * .7, 0]); return k.mesh(); },
  rug(r = 1, c = '#f2c0a4') { const k = new Kit(); k.flat(SH.circle(r), .015, c); return k.mesh(false); },
  table(w = .9, d = .5, hgt = .38, c = C.wood) { const k = new Kit(); k.box(w, .05, d, c, [0, hgt - .05, 0]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(.05, hgt - .05, .05, '#b48b5e', [sx * (w / 2 - .06), 0, sz * (d / 2 - .06)]); return k.mesh(); },
  chair(c = C.coral) { const k = new Kit(); k.box(.4, .05, .4, c, [0, .42, 0]); k.box(.4, .45, .05, c, [0, .45, -.18]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(.04, .42, .04, C.ink2, [sx * .16, 0, sz * .16]); return k.mesh(); },
  desk(w = 1.2, c = C.cream) { const k = new Kit(); k.box(w, .04, .6, c, [0, .72, 0]); k.box(.04, .72, .56, C.ink2, [-w / 2 + .04, 0, 0]); k.box(.04, .72, .56, C.ink2, [w / 2 - .04, 0, 0]); k.box(.42, .28, .03, C.ink, [0, .78, -.18]); k.box(.06, .06, .06, C.ink, [0, .74, -.18]); return k.mesh(); },
  cabinet(w = .9, hgt = 2.0, d = .45, c = C.wood) { const k = new Kit(); k.box(w, hgt, d, c); const n = Math.max(2, Math.round(w / .45)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n; k.box(w / n - .03, hgt - .1, .02, '#f0dcbc', [x, .05, d / 2]); k.box(.02, .14, .03, C.ink2, [x + w / n / 2 - .06, hgt * .5, d / 2 + .02]); } return k.mesh(); },
  toilet() { const k = new Kit(); k.box(.38, .4, .55, C.white, [0, 0, .05]); k.flat(SH.round(.36, .48, .16), .06, C.white, [0, .4, .3]); k.box(.4, .45, .18, C.white, [0, .4, -.2]); return k.mesh(); },
  basin() { const k = new Kit(); k.box(.7, .78, .45, C.wood); k.box(.72, .06, .48, C.white, [0, .78, 0]); k.flat(SH.round(.4, .3, .12), .02, '#dbe9ee', [0, .84, .15]); k.cyl(.015, .2, C.steel, [0, .84, -.15]); k.box(.5, .7, .03, '#cfe7ee', [0, 1.1, -.22]); return k.mesh(); },
  shower() { const k = new Kit(); k.cyl(.015, 1.9, C.steel); k.add(SH.circle(.1), .03, C.steel, [0, 1.92, .08], [Math.PI / 2 + .4, 0, 0]); k.flat(SH.rect(.9, .9, 0, -.45), .03, '#dbe9ee', [.4, .005, .4]); return k.mesh(); },
  drain() { const k = new Kit(); k.flat(SH.rect(.14, .14, 0, -.07), .01, C.steel); for (let i = -2; i <= 2; i++) k.flat(SH.rect(.1, .012, 0, -i * .025), .012, C.ink2); return k.mesh(false); },
  counter(w = 2, c = C.teal) { const k = new Kit(); k.box(w, .9, .6, c); k.box(w + .04, .04, .64, C.white, [0, .9, 0]); return k.mesh(); },
  espresso() { const k = new Kit(); k.box(.5, .4, .4, C.steel); k.box(.5, .06, .4, C.ink, [0, .4, 0]); k.box(.08, .05, .1, C.ink, [-.1, .18, .25]); k.box(.08, .05, .1, C.ink, [.1, .18, .25]); return k.mesh(); },
  curtain(w = 1.4, hgt = 2.2, c = '#f2c0a4') { const k = new Kit(); const n = 7; for (let i = 0; i < n; i++) k.box(w / n + .02, hgt, .04, i % 2 ? c : '#efb59a', [-w / 2 + (i + .5) * w / n, 0, (i % 2) * .05]); k.box(w + .1, .04, .04, C.ink2, [0, hgt, 0]); return k.mesh(); },
  studs(len, hgt, sp = .455, c = C.steel) { const k = new Kit(); const n = Math.floor(len / sp); k.box(.075, .04, len, c, [0, 0, 0]); k.box(.075, .04, len, c, [0, hgt - .04, 0]); for (let i = 0; i <= n; i++) k.box(.075, hgt - .08, .04, c, [0, .04, -len / 2 + Math.min(len - .02, i * sp)]); return k.mesh(); },
  board(w, hgt, t = .012, c = C.white) { const k = new Kit(); k.box(t, hgt, w, c); return k.mesh(); },
  glass(w, hgt) { const g = new THREE.Group(); const m = mk(new THREE.BoxGeometry(.02, hgt, w), new THREE.MeshLambertMaterial({ color: 0xbfe0ea, transparent: true, opacity: .45, depthWrite: false }), false, false); m.position.y = hgt / 2; g.add(m); const k = new Kit(); k.box(.06, .05, w, C.ink2); k.box(.06, .05, w, C.ink2, [0, hgt - .05, 0]); g.add(k.mesh()); return g; },
  aircon() { const k = new Kit(); k.box(.8, .28, .22, C.white); k.box(.7, .02, .02, C.ink2, [0, .04, .11]); return k.mesh(); },
  scaffold(w = 1.2, hgt = 1.6) { const k = new Kit(); for (const x of [-w / 2, w / 2]) for (const z of [-.3, .3]) k.box(.04, hgt, .04, C.teal, [x, 0, z]); k.box(w + .1, .04, .64, C.wood, [0, hgt, 0]); for (const x of [-w / 2, w / 2]) k.add(SH.rect(.03, hgt * 1.25), .03, C.teal, [x, 0, -.3], [0, 0, .5]); return k.mesh(); },
  sign(text, bg = '#ffc96b', fg = '#4b3f37', w = .5, hgt = .3) {
    const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * hgt / w); const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; x.font = `${Math.round(c.height * .38)}px Huninn, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = mk(new THREE.PlaneGeometry(w, hgt), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }), true, false); return m;
  },
};

// 磁磚、天花板板材這類「一格一格出現」的東西
export function tileGrid(w, d, size, hex, gap = .01, thick = .02) {
  const g = new THREE.Group(); const geo = new THREE.BoxGeometry(size - gap, thick, size - gap); const list = [];
  for (let x = -w / 2 + size / 2; x < w / 2 - .01; x += size) for (let z = -d / 2 + size / 2; z < d / 2 - .01; z += size) { const t = mk(geo, mats(Array.isArray(hex) ? pick(hex) : hex)[0]); t.position.set(x, thick / 2, z); g.add(t); list.push(t); }
  g.userData.tiles = list; return g;
}
export function revealTiles(list, step = .02, fx = 'pop') {
  list.forEach((t, k) => { t.visible = true; t.scale.set(.001, 1, .001); gsap.to(t.scale, { x: 1, z: 1, duration: .45, delay: k * step, ease: 'back.out(2)', onStart: () => { if (k % 5 === 0) SFX.pop(1.3); } }); });
  return list.length * step + .5;
}
