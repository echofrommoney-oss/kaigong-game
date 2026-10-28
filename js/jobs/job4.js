// 第四案：新創辦公室。看圖 → 排進度 → 輕隔間 → 木作 → 玻璃與金屬 → 高處與吊掛。
import { THREE, gsap, rand, shake, wait, camT, EASE_POP } from '../engine/core.js';
import { Kit, SH, mk } from '../engine/paper.js';
import { PAGE_Y } from '../engine/book.js';
import { C, P, CAST, person, place, popIn, dropIn, popOut, tileGrid, revealTiles } from '../engine/props.js';
import { dust, confetti, sparks } from '../engine/fx.js';
import { SFX } from '../engine/audio.js';
import { panel } from '../game/ui.js';

const PX = .9;          // 隔間牆的位置（x）
const PLEN = 2.2;       // 輕隔間長度（從後牆往前）
const GLASS = [.2, 1.0]; // 固定玻璃（z 範圍）；門在 1.0～1.8
const wp = o => o.getWorldPosition(new THREE.Vector3());

function setup(ctx) {
  const { R } = ctx; const L = R.layer('base');
  // 一疊石膏板靠在右前方，等著封板
  { const k = new Kit(); for (let i = 0; i < 5; i++) k.box(1.2, .015, .6, i % 2 ? '#f3efe6' : '#e9e3d6', [0, .08 + i * .016, 0]); k.box(1.1, .08, .55, '#b48b5e'); ctx.pallet = place(L, k.mesh(), 1.9, 0, 1.2, .2); }
  ctx.boss = place(R.inside, CAST.boss(), 2.4, 0, .4);
  ctx.ceo = place(R.inside, person({ body: '#3b4250', pants: C.ink, hair: C.ink }), -2.0, 0, 1.6);
}

/* ---------- 看圖：貼在後牆的圖例卡 ---------- */
const TL = new THREE.TextureLoader();
const IMG = { '01-60': [840, 188], '01-65': [840, 96], '01-69': [840, 85], '01-12': [840, 105], '01-32': [840, 145] };
// 從題目圖片裁出一個符號，做成一張卡
function symCard(file, [x0, y0, x1, y1], hgt = .32) {
  const [W, H] = IMG[file]; const t = TL.load(`img/q/${file}.png`); t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set((x1 - x0) / W, (y1 - y0) / H); t.offset.set(x0 / W, 1 - y1 / H);
  const w = hgt * (x1 - x0) / (y1 - y0); const g = new THREE.Group();
  const k = new Kit(); k.box(w + .06, hgt + .06, .02, C.white, [0, -(hgt + .06) / 2, 0]); g.add(k.mesh(false));
  const m = mk(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: t }), false, false); m.position.z = .012; g.add(m); return g;
}
function textCard(text, w = .5) { const g = new THREE.Group(); const k = new Kit(); k.box(w + .06, .26, .02, C.white, [0, -.13, 0]); g.add(k.mesh(false)); const s = P.sign(text, '#fffdf7', C.ink, w, .2); s.position.z = .012; g.add(s); return g; }
function pinCards(ctx, list, cols) {
  const L = ctx.R.layer('cards'); const z = ctx.R.Z0 + .03;
  return list.map((it, i) => { const [x, y] = cols[i]; const g = place(L, it.card, x, y, z); popIn(g, i * .06); it.obj = g; return it; });
}
const CARDCAM = ctx => ({ theta: .1, phi: 1.2, r: ctx.fit() * .55, tx: .85, ty: PAGE_Y + 1.75, tz: -.6 });
const GRID = [[0, 2.15], [.85, 2.15], [1.7, 2.15], [0, 1.6], [.85, 1.6], [1.7, 1.6], [0, 1.05], [.85, 1.05], [1.7, 1.05]];
function board(ctx) { const k = new Kit(); k.box(2.6, 1.75, .02, '#e8dcc4'); k.box(2.7, .05, .04, '#b48b5e', [0, 1.75, 0]); k.box(2.7, .05, .04, '#b48b5e', [0, -.05, 0]); ctx.cork = place(ctx.R.layer('base'), popIn(k.mesh(false)), .85, .72, ctx.R.Z0 + .01); }
function clearCards(ctx) { ctx.R.layer('cards').children.forEach((m, i) => popOut(m, i * .03)); }

/* ---------- 排進度：左牆的進度白板 ---------- */
const ACT = [['A', '放樣', 0, 2], ['B', '輕隔間', 2, 5], ['C', '空調配管', 2, 3], ['D', '木作櫃', 7, 4], ['E', '玻璃隔間', 7, 2], ['F', '清潔交屋', 11, 1]];
const CRIT = ['A', 'B', 'D', 'F'];
function gantt(ctx) {
  const { R } = ctx; const L = R.layer('gantt'); const x = R.X0 + .03; const k0 = .13; const zOf = d => .7 - d * k0;
  { const k = new Kit(); k.box(.03, 1.3, 2.3, C.white); k.box(.05, .04, 2.36, C.ink2, [0, 1.3, 0]); place(L, popIn(k.mesh(false)), x, .95, 0); }
  const t = P.sign('工程進度表（天）', C.white, C.ink, .9, .14); t.rotation.y = Math.PI / 2; place(L, popIn(t), x + .025, 2.12, 0);
  ctx.bars = {};
  ACT.forEach(([id, nm, es, du], i) => {
    const y = 1.85 - i * .17;
    const s = P.sign(`${id} ${nm}`, C.white, C.ink, .36, .12); s.rotation.y = Math.PI / 2; place(L, popIn(s, .2 + i * .1), x + .025, y + .06, .93);
    const k = new Kit(); k.box(.02, .1, du * k0 - .02, C.teal2); const m = place(L, k.mesh(false), x + .02, y, zOf(es + du / 2));
    m.scale.z = .001; gsap.to(m.scale, { z: 1, duration: .5, delay: .4 + i * .18, ease: 'power2.out', onStart: () => SFX.pop(1.2) }); ctx.bars[id] = m;
  });
  for (let d = 0; d <= 12; d += 2) { const k = new Kit(); k.box(.015, .9, .006, '#d8cfc0'); place(L, k.mesh(false), x + .016, .88, zOf(d)); }
}
function critical(ctx) {
  const L = ctx.R.layer('gantt');
  CRIT.forEach((id, i) => { const b = ctx.bars[id]; const k = new Kit(); const len = ACT.find(a => a[0] === id)[3] * .13 - .02; k.box(.012, .1, len, C.coral); const m = place(L, k.mesh(false), b.position.x + .012, b.position.y, b.position.z); popIn(m, i * .15, 'z'); });
  SFX.chime();
}

/* ---------- 輕隔間 ---------- */
function partition(ctx) {
  const { R } = ctx; const L = R.layer('wall'); const cz = R.Z0 + PLEN / 2; const H = R.h;
  const f = {
    ink() { const k = new Kit(); k.flat(SH.rectC(.03, PLEN), .006, C.ink, [PX, .004, cz]); k.flat(SH.rectC(.03, PLEN), .006, C.red, [PX, H - .01, cz]); popIn(place(L, k.mesh(false)), 0, 'z'); SFX.thud(.4); dust(new THREE.Vector3(PX, PAGE_Y + .2, cz), 8, '#4b3f37', 1.2); },
    track() { const k = new Kit(); k.box(.075, .04, PLEN, C.steel, [PX, 0, cz]); k.box(.075, .04, PLEN, C.steel, [PX, H - .04, cz]); const m = place(L, k.mesh()); popIn(m); SFX.drill(); for (let i = 0; i < 4; i++) setTimeout(() => { SFX.thud(.7); sparks(new THREE.Vector3(PX, PAGE_Y + .15, R.Z0 + .3 + i * .6), 5); }, 300 + i * 220); },
    studs(sp) { if (ctx.studs) { ctx.studs.geometry.dispose(); L.remove(ctx.studs); } const m = P.studs(PLEN, H, sp); place(L, m, PX, 0, cz); ctx.studs = m; ctx.sp = sp; return m; },
    wobble() { const m = ctx.studs; SFX.creak(); gsap.fromTo(m.rotation, { x: 0 }, { x: .05, duration: .18, yoyo: true, repeat: 5, ease: 'sine.inOut', onComplete: () => { m.rotation.x = 0; } }); },
    braces() { const k = new Kit(); for (const y of [1.2, 2.4]) k.box(.07, .04, PLEN - .04, '#aeb3b8', [PX, y, cz]); k.box(.07, .04, .5, '#aeb3b8', [PX, .45, R.Z0 + 1.1]); k.box(.075, H - .08, .04, '#aeb3b8', [PX, .04, R.Z0 + PLEN - .04]); k.box(.075, H - .08, .04, '#aeb3b8', [PX, .04, R.Z0 + .04]); popIn(place(L, k.mesh()), .1); },
    board1() { const m = P.board(PLEN, H - .02, .012, '#e9e3d6'); popIn(place(L, m, PX - .045, 0, cz)); SFX.drill(); },
    fill() {
      const k = new Kit(); const sp = ctx.sp || .45; const n = Math.floor(PLEN / sp);
      for (let i = 0; i < n; i++) { const z0 = R.Z0 + i * sp + .03, z1 = Math.min(R.Z0 + PLEN - .03, R.Z0 + (i + 1) * sp - .03); if (z1 - z0 > .05) k.box(.05, H - .3, z1 - z0, '#f3d27a', [PX - .01, .15, (z0 + z1) / 2]); }
      k.box(.03, .5, .03, C.orange, [PX + .01, .3, R.Z0 + 1.1]); k.box(.03, .03, PLEN * .5, C.orange, [PX + .01, .8, R.Z0 + .6]); k.box(.04, .1, .07, C.white, [PX + .02, .3, R.Z0 + 1.1]);
      popIn(place(L, k.mesh())); SFX.pop(.8);
    },
    board2() { const m = P.board(PLEN, H - .02, .012, C.white); popIn(place(L, m, PX + .045, 0, cz)); SFX.drill(); popOut(ctx.pallet, .5); },
    putty() { const k = new Kit(); for (let z = R.Z0 + .91; z < R.Z0 + PLEN; z += .91) k.box(.004, H - .04, .07, '#f3efe6', [PX + .053, .02, z]); for (let y = .3; y < H; y += .6) for (let z = R.Z0 + .2; z < R.Z0 + PLEN; z += .45) k.box(.004, .02, .02, '#d8d2c6', [PX + .053, y, z]); popIn(place(L, k.mesh(false))); SFX.chime(); const o = P.outlet(); o.rotation.y = Math.PI / 2; place(L, popIn(o, .3), PX + .06, .26, R.Z0 + 1.1); },
  };
  return f;
}

/* ---------- 木作：圓盤鋸 ---------- */
function makeSaw(ctx) {
  const g = new THREE.Group(); const parts = {};
  const add = (name, fn) => { const k = new Kit(); fn(k); const m = k.mesh(); g.add(m); parts[name] = m; };
  add('base', k => { k.box(.6, .75, .5, '#7a8a8f'); k.box(.8, .04, .7, C.steel, [0, .75, 0]); });
  add('blade', k => k.add(SH.circle(.13), .01, '#dfe3e6', [0, .74, 0], [0, Math.PI / 2, 0]));
  add('guard', k => k.box(.1, .12, .34, C.yellow, [0, .84, .02]));
  add('knife', k => k.add(SH.poly([[0, 0], [.1, 0], [.1, .12], [.02, .2]]), .02, '#5b6770', [0, .76, -.14], [0, Math.PI / 2, 0]));
  add('belt', k => k.box(.16, .34, .3, C.coral, [.38, .2, 0]));
  add('push', k => k.box(.05, .04, .32, C.wood, [.28, .79, .16]));
  const plate = P.sign('220V 1.5kW', '#fffdf7', C.ink, .26, .11); plate.position.set(0, .45, .255); g.add(plate); parts.plate = plate;
  place(ctx.R.layer('wood'), popIn(g), -1.5, 0, 1.05, .25); ctx.saw = g; return parts;
}
function ladder(deg, tied) {
  const k = new Kit(); const Lg = 2.0, a = deg * Math.PI / 180, d = Lg * Math.cos(a), h = Lg * Math.sin(a), tilt = Math.PI / 2 - a;
  for (const s of [-1, 1]) for (const z of [-.22, .22]) k.add(SH.rect(.05, Lg), .05, C.teal, [s * d, 0, z], [0, 0, s * tilt]);
  for (const s of [-1, 1]) for (let i = 1; i < 5; i++) { const f = i / 5; k.box(.05, .04, .44, C.cream, [s * d * (1 - f), f * h, 0]); }
  k.box(.12, .06, .5, C.ink2, [0, h - .03, 0]);
  if (tied) k.box(2 * d * .7, .03, .03, C.red, [0, h * .3, 0]);
  return k.mesh();
}

/* ---------- 高處：施工架 ---------- */
function scaffold(ctx) {
  const L = ctx.R.layer('height'); const H = 2.0; const g = new THREE.Group();
  g.add(P.scaffold(1.2, H));
  const k = new Kit(); for (const x of [-.6, .6]) for (const z of [-.3, .3]) k.box(.04, .98, .04, C.teal, [x, H, z]);
  for (const z of [-.3, .3]) { k.box(1.24, .04, .04, C.yellow, [0, H + .9, z]); k.box(1.24, .04, .04, C.yellow, [0, H + .45, z]); k.box(1.2, .1, .02, C.yellow, [0, H + .04, z]); }
  for (let i = 0; i < 3; i++) k.box(1.3, .035, .19, i % 2 ? C.wood : C.wood2, [0, H + .045, -.2 + i * .2]);
  g.add(k.mesh());
  ctx.scaf = place(L, g, -1.0, 0, -.85); popIn(g);
}
function hazards(ctx) {
  const L = ctx.R.layer('hazard'); const { R } = ctx; const list = [];
  // 吊掛物下面站了人
  { const k = new Kit(); k.box(.015, .55, .015, C.ink, [-.3, R.h - .55, 1.0]); k.box(.42, .32, .42, C.orange, [-.3, R.h - .9, 1.0]); k.box(.08, .06, .06, C.ink2, [-.3, R.h - .58, 1.0]); const m = place(L, k.mesh(), 0, 0, 0); popIn(m); }
  const under = place(L, CAST.worker(), -.3, 0, 1.0); popIn(under, .1);
  list.push({ obj: under, ok: true, msg: '吊運中，吊掛物下方嚴禁人員進入', label: '吊掛物下方有人' });
  // 扭結的鋼索
  { const k = new Kit(); k.cyl(.26, .22, '#85705f'); k.cyl(.08, .26, C.ink2); for (let i = 0; i < 6; i++) k.box(.18, .03, .03, C.steel, [.3 + (i % 2) * .05, .23, -.18 + i * .07], (i % 2 ? .9 : -.9)); const m = place(L, k.mesh(), -1.2, 0, 1.65); popIn(m, .15); list.push({ obj: m, ok: true, msg: '鋼索已經扭結，不得當吊掛用具', label: '鋼索扭結' }); }
  // 袋裝水泥疊 12 層
  { const k = new Kit(); for (let i = 0; i < 12; i++) k.box(.5, .1, .34, i % 2 ? '#d8cdb8' : '#cbbfa8', [0, i * .105, 0], (i % 2) * .08); const m = place(L, k.mesh(), 2.1, 0, 1.55); popIn(m, .2); list.push({ obj: m, ok: true, msg: '袋裝材料堆了 12 層，不得超過 10 層', label: '袋裝材料堆太高' }); }
  // 沒戴安全帽
  { const m = place(L, person({ body: C.coral, pants: C.teal, hair: C.ink }), -2.0, 0, .9); popIn(m, .25); list.push({ obj: m, ok: true, msg: '進入工作場所要正確戴用安全帽', label: '沒戴安全帽' }); }
  // 沒問題的：綠色緊急出口標示、正三角形警告標示
  { const m = P.exitSign(); m.rotation.y = Math.PI / 2; place(L, popIn(m, .3), R.X0 + .04, 2.35, 1.4); list.push({ obj: m, ok: false, msg: '緊急出口用綠色，這個沒問題' }); }
  { const k = new Kit(); k.add(SH.poly([[-.2, 0], [.2, 0], [0, .35]]), .01, C.ink, [0, 0, 0]); k.add(SH.poly([[-.16, .03], [.16, .03], [0, .3]]), .01, C.yellow, [0, 0, .006]); const m = k.mesh(false); m.rotation.y = Math.PI / 2; place(L, popIn(m, .35), PX + .07, 1.45, R.Z0 + .6); list.push({ obj: m, ok: false, msg: '警告標示是尖端向上的正三角形，這個沒問題' }); }
  return list;
}

/* ---------- 共同科目的訪客 ---------- */
function guest(c, key, make, x = -.5, z = 1.8) {
  if (c.guestKey === key) return; if (c.guest) popOut(c.guest);
  c.guestKey = key; c.guest = place(c.R.inside, make(), x, 0, z); popIn(c.guest); SFX.whistle();
}
const HR = () => person({ body: '#f4a7b9', pants: '#6b5a4b', hair: '#5d5047', clip: true });

const blockIcon = (x, R) => { R(-34, -6, 30, 18, '#5b6770', 4); R(4, -6, 30, 18, '#5b6770', 4); R(-40, 12, 80, 6, '#c9ccd0', 2); };

export default {
  id: 'j4', title: '新創辦公室', short: '辦公室', sub: '辦公室裝修：輕隔間、玻璃會議室、木作櫃、高處作業與排程', color: '#82b2b6', pay: 260000, doneLine: '新創團隊搬進來了',
  room: { w: 5.4, d: 4.0, h: 3.0, floor: 'concrete', window: true, wall: '#e3dccf' },
  setup,
  stations: [
    {
      id: 'draw', name: '看圖', asker: 'designer', quizTitle: '設計師小圖的設備圖考題', camera: { theta: .12, phi: 1.12 },
      topics: ['01/設備圖例：電信、電鈴、電視', '01/設備圖例：空調及機械'],
      steps: ctx => [
        { type: 'say', who: 'manager', name: '新創執行長', text: '我們公司要搬進這層樓。右邊隔一間會議室（一半輕隔間、一半玻璃），左邊放收納櫃和辦公桌，還要裝空調。設備圖在設計師那邊。', act: async c => board(c) },
        { type: 'tap', who: 'designer', text: '設備圖上的管線代號我貼在牆上了。點出屬於<b>空調及機械設備</b>的圖例。', camera: CARDCAM(ctx),
          targets: c => c.cardsA || (c.cardsA = pinCards(c, [
            { card: textCard('— CHS —'), ok: true, msg: 'CHS：空調及機械設備圖例', label: 'CHS' }, { card: textCard('— DWR —'), ok: false, msg: 'DWR 不是空調及機械設備圖例' },
            { card: textCard('— CWR —'), ok: true, msg: 'CWR：空調及機械設備圖例', label: 'CWR' }, { card: textCard('— SW —'), ok: false, msg: 'SW 不是空調及機械設備圖例' },
            { card: textCard('— RD —'), ok: true, msg: 'RD：空調及機械設備圖例', label: 'RD' }, { card: textCard('M', .22), ok: false, msg: '框起來的 M 不是空調及機械設備圖例' },
            { card: textCard('— CHR —'), ok: true, msg: 'CHR：空調及機械設備圖例', label: 'CHR' }], GRID)),
          after: async c => { clearCards(c); c.frame(); c.focus({ theta: .12, phi: 1.12 }); }, rules: ['01-59', '01-62', '01-67'] },
        { type: 'tap', who: 'designer', text: '弱電圖也看一下。點出所有<b>電信、電鈴、電視</b>設備符號。', camera: CARDCAM(ctx),
          targets: c => c.cardsB || (c.cardsB = pinCards(c, [
            { card: symCard('01-60', [480, 40, 552, 98]), ok: true, msg: '這是電信、電鈴、電視設備符號', label: '蝴蝶結形符號' },
            { card: symCard('01-60', [678, 42, 746, 110]), ok: false, msg: '圓圈裡的 E 不是電信、電鈴、電視設備符號' },
            { card: symCard('01-65', [296, 36, 352, 92]), ok: true, msg: '這是電信、電鈴、電視設備符號', label: '圓圈 PT' },
            { card: symCard('01-69', [172, 35, 240, 82]), ok: false, msg: '這個不是電信、電鈴、電視設備符號' },
            { card: symCard('01-60', [584, 40, 648, 104]), ok: true, msg: '這是電信、電鈴、電視設備符號', label: '圓圈兩點' },
            { card: symCard('01-65', [378, 32, 458, 96]), ok: true, msg: '這是電信、電鈴、電視設備符號', label: '上白下黑的方框' },
            { card: symCard('01-60', [30, 115, 110, 188]), ok: false, msg: '這個不是電信、電鈴、電視設備符號' },
            { card: symCard('01-69', [108, 32, 150, 85]), ok: true, msg: '這是電信、電鈴、電視設備符號', label: '圓圈加斜箭頭' },
            { card: symCard('01-69', [346, 32, 378, 80]), ok: false, msg: '這個不是電信、電鈴、電視設備符號' }], GRID)),
          after: async c => { clearCards(c); c.frame(); c.focus({ theta: .12, phi: 1.12 }); }, rules: ['01-60', '01-65', '01-69'] },
        { type: 'tap', who: 'designer', text: '網路線要從這層<b>往樓下</b>拉到機房。點出「電信管線下行」的符號。', need: 1, camera: CARDCAM(ctx),
          targets: c => c.cardsC || (c.cardsC = pinCards(c, [
            { card: symCard('01-32', [358, 0, 410, 82], .4), ok: false, msg: '兩頭都有箭頭：電信管線上下行' },
            { card: symCard('01-12', [575, 10, 650, 72], .4), ok: true, msg: '對：電信管線下行', label: '電信管線下行' },
            { card: textCard('—— TV ——'), ok: false, msg: '—TV— 是電視天線用管線' }], [[.1, 1.7], [.9, 1.7], [1.75, 1.7]])),
          after: async c => { clearCards(c); popOut(c.cork, .3); c.frame(); }, rules: ['01-12', '01-32', '01-11'] },
      ],
    },
    {
      id: 'plan', name: '排進度', asker: 'boss', quizTitle: '老周的進度管理考題', camera: { theta: 1.1, phi: 1.05 },
      topics: ['07/進度管理（CPM、直線圖）', '07/工地安全衛生'],
      steps: ctx => [
        { type: 'say', who: 'boss', text: '開工前先排進度。我把各項作業和先後關係列出來，畫在左邊白板上：<br>A 放樣 2 天（開工就做）<br>B 輕隔間 5 天（A 做完）<br>C 空調配管 3 天（A 做完）<br>D 木作櫃 4 天（B 做完）<br>E 玻璃隔間 2 天（B、C 都做完）<br>F 清潔交屋 1 天（D、E 都做完）', act: async c => gantt(c) },
        { type: 'calc', who: 'boss', text: '用 CPM 網狀圖的想法算：這個工程<b>最快幾天</b>可以完工？', hint: '每條路線的工期加起來，最長的那條（要徑）就是總工期。', answer: 12, tol: .001, unit: '天', explain: '要徑 A→B→D→F：2＋5＋4＋1＝12 天', rules: ['07-35'] },
        { type: 'do', fn: async c => critical(c) },
        { type: 'calc', who: 'boss', text: 'E 玻璃隔間的 <b>LF</b> 是第幾天？', hint: 'LF 是最晚完成時間：F 的最晚開始時間 LS＝總工期 12 －F 工期 1。', answer: 11, tol: .001, unit: '天', explain: '總工期 12 天，F 要 1 天，F 最晚要在第 11 天結束時開始（LS＝11），所以 E 最晚要在第 11 天做完（LF＝11）', rules: ['07-37'] },
        { type: 'choose', who: 'manager', name: '新創執行長', text: '這張網狀圖我看不太懂。進度表給我哪一種就好？', cols: 1, options: [
          { t: '兩種都給：直線圖看工期，CPM 網狀圖看要徑', ok: true, msg: '直線圖看得出每項工期和總工期，但看不出要徑作業' },
          { t: '只給傳統直線圖', msg: '傳統直線圖看不出要徑作業，延誤會影響完工的是哪幾項，你就看不出來' },
          { t: '網狀圖兩個結合點之間多畫幾條箭線，比較清楚', msg: 'CPM 網狀圖兩個結合點之間只能有一個箭線' }], rules: ['07-38', '07-39', '07-40'] },
      ],
    },
    {
      id: 'partition', name: '輕隔間', asker: 'steel', quizTitle: '阿鋼的輕隔間考題', camera: { theta: .8, phi: .98 },
      topics: ['06/輕隔間（輕鋼架隔間牆）'],
      steps: ctx => { const f = partition(ctx); return [
        { type: 'order', who: 'steel', text: '會議室的輕隔間牆先放樣、固定上下槽鐵。照順序拖進房間。', seq: true,
          items: [{ id: 'ink', label: '放樣彈線', icon: 'ink' }, { id: 'track', label: '上下槽鐵', icon: 'edge' }, { id: 'pipe', label: '牆內管線', icon: 'conduit' }],
          order: ['ink', 'track'], decoy: { pipe: { msg: '牆內管線不是在骨架之前配，要等立好骨架、封好第一面板再埋', fine: [3, 0], mistake: '輕隔間管線太早配' } },
          why: { track: '還沒放樣，槽鐵要釘在哪？' },
          act: { ink: async () => f.ink(), track: async () => f.track() },
          say: { ink: '地板彈下座板的線，天花用雷射對準，上下在同一個垂直面', track: '上下槽鐵用火藥擊釘固定好了' }, done: '可以立立柱了', rules: ['06-104', '06-231', '06-106'] },
        { type: 'slider', who: 'steel', text: '立柱要多密？拉滑桿調間距，房間裡的立柱會跟著排。', min: 20, max: 100, step: 5, value: 90, unit: '公分', label: '立柱間距', good: 45,
          preview: (c, v) => f.studs(v / 100),
          check: v => v > 60 ? { ok: false, msg: `間距 ${v} 公分太大，一推就晃`, act: async () => f.wobble() } : v < 30 ? { ok: false, msg: `間距 ${v} 公分太密了，一般是 30～60 公分` } : { ok: true, msg: `立柱間距 ${v} 公分，套進上下槽鐵固定好了` },
          rules: ['06-180'], mistake: '立柱間距不對' },
        { type: 'checklist', who: 'steel', text: '封板之前要補強骨架。哪些做法是對的？全部選起來。', options: [['從下座板起每 120 公分加一支橫支撐', 1], ['插座、開關位置在立柱之間補橫向支架', 1], ['門框兩側補強立柱', 1], ['轉角、隔間相交處加立柱', 1], ['收邊立柱的 C 型開口朝外', 0], ['加強橫料可有可無，省下來', 0]],
          after: async c => f.braces(), rules: ['06-105', '06-49', '06-50', '06-236'], fine: [6, 2000], okMsg: '骨架補強好了', ngMsg: '收邊立柱的 C 型開口要朝內；加強橫料不能省' },
        { type: 'order', who: 'steel', text: '封板。照順序拖進房間。', seq: true,
          items: [{ id: 'b1', label: '第一面封板', icon: 'board' }, { id: 'fill', label: '管線＋隔音棉', icon: 'wool' }, { id: 'b2', label: '第二面封板', icon: 'board' }, { id: 'putty', label: '接縫紙＋批土', icon: 'putty' }],
          order: ['b1', 'fill', 'b2', 'putty'], why: { fill: '要先封好第一面板，才埋管線、塞隔音棉', b2: '牆裡的管線和隔音棉還沒放，封起來就來不及了', putty: '面板還沒封完' },
          act: { b1: async () => f.board1(), fill: async () => f.fill(), b2: async () => f.board2(), putty: async () => f.putty() },
          say: { b1: '第一面板封好了，每根立柱都鎖螺絲', fill: '管線埋好，隔音棉塞滿', b2: '第二面封板完成', putty: '接縫貼紙修飾接縫，膠泥分次塗，避免乾縮' }, done: '輕隔間牆完成', rules: ['06-179', '06-110', '06-111'] },
      ]; },
    },
    {
      id: 'wood', name: '木作', asker: 'carpenter', quizTitle: '阿樹的木作考題', camera: { theta: .45, phi: 1.0 },
      topics: ['06/木作：施工、五金、釘槍', '06/木材與板材材料學', '05/木作工具', '05/手推刨床', '05/圓盤鋸', '05/木材加工機械管理'],
      steps: ctx => [
        { type: 'tap', who: 'carpenter', text: '開鋸之前先檢查圓盤鋸。點出規定要有的安全裝置和標示。', time: 60,
          camera: { theta: .3, phi: .95, r: ctx.fit() * .5, tx: -1.5, tz: 1.05, ty: PAGE_Y + .9 },
          targets: c => c.sawT || (c.sawT = (p => [
            { obj: p.guard, ok: true, msg: '鋸齒接觸預防裝置', label: '鋸齒接觸預防裝置' },
            { obj: p.knife, ok: true, msg: '撐縫片（反撥預防裝置），和鋸片在同一個平面', label: '撐縫片' },
            { obj: p.belt, ok: true, msg: '皮帶旋轉有接觸危險，要加覆蓋', label: '皮帶覆蓋' },
            { obj: p.plate, ok: true, msg: '銘牌要標額定電壓、額定功率或額定電流', label: '銘牌' },
            { obj: p.push, ok: false, msg: '推板不是規定要加覆蓋的部位' }])(makeSaw(c))),
          after: async c => c.frame(), rules: ['05-36', '05-38', '05-40'] },
        { type: 'slider', who: 'carpenter', text: '做櫃子的角材進場了。含水率要在幾 % 以內才收？', min: 8, max: 30, step: 1, value: 26, unit: '%', label: '含水率上限', good: 18,
          check: v => v > 18 ? { ok: false, msg: `含水率 ${v}% 太高，角材乾了會收縮變形`, act: async c => { const k = new Kit(); k.box(1.4, .05, .05, '#c9a878'); const m = place(c.R.layer('wood'), k.mesh(), -.4, .05, 1.5); popIn(m); gsap.to(m.rotation, { z: .12, x: .2, duration: .8, delay: .5, ease: 'elastic.out(1,.4)', onStart: () => SFX.creak() }); popOut(m, 1.4); } }
            : v < 18 ? { ok: false, msg: `${v}% 太嚴了，這樣大部分角材都不能收。理想的角材含水率是 18% 以內` }
            : { ok: true, msg: '含水率 18% 以內才收：理想的角材含水率在 18% 以內', act: async c => { const k = new Kit(); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) k.box(1.4, .05, .05, j % 2 ? '#d9b98a' : '#e6cfa8', [0, i * .052, -.06 + j * .06]); dropIn(place(c.R.layer('wood'), k.mesh(), -.4, 0, 1.5)); } },
          rules: ['06-22'], mistake: '角材含水率太高' },
        { type: 'match', who: 'carpenter', text: '氣動釘槍要配對的釘子。把用途和釘型配起來。', pairs: [['塑膠天花板釘在木骨架', 'J 型釘'], ['1 分夾板釘在木骨架', 'ㄇ型釘'], ['角材釘在水泥地板', 'T 型鋼釘'], ['踢腳板釘在水泥牆', '中 T 釘槍（小鋼炮）']], rules: ['06-146', '06-147', '06-148', '06-150'] },
        { type: 'checklist', who: 'carpenter', text: '做收納櫃和抽屜。哪些做法是對的？全部選起來。', options: [['抽屜前板與側板用鳩尾榫接合', 1], ['抽屜側板裝滑軌', 1], ['用線板做美化收邊', 1], ['硬木鎖木螺釘前先鑽引孔', 1], ['櫃體接合用焊接', 0], ['平頭木螺釘鎖到和板面齊平', 0]],
          after: async c => { popOut(c.saw); c.R.layer('wood').children.forEach(m => m !== c.saw && popOut(m)); const L = c.R.layer('furn');
            const a = place(L, P.cabinet(1.2, .85, .45), -1.2, 0, c.R.Z0 + .24); const b = place(L, P.cabinet(.8, 2.1, .45), -2.25, 0, c.R.Z0 + .24); popIn(a, .3); popIn(b, .5); c.cabs = [a, b]; },
          rules: ['06-27', '06-156', '06-140', '06-153', '06-240', '06-155'], fine: [5, 2000], okMsg: '收納櫃做好了', ngMsg: '木作不用焊接；平頭木螺釘要比板面凹下 2 mm' },
      ],
    },
    {
      id: 'glass', name: '玻璃與金屬', asker: 'glazier', quizTitle: '晶晶的玻璃金屬考題', camera: { theta: .75, phi: 1.0 },
      topics: ['06/玻璃', '06/金屬'],
      steps: ctx => [
        { type: 'choose', who: 'glazier', text: '會議室的強化玻璃送到了，量了一下寬了 2 公分。怎麼辦？', cols: 1, options: [
          { t: '請工廠照正確尺寸重做', ok: true, msg: '強化玻璃強化後不能再裁切，只能重做' },
          { t: '現場鋸掉 2 公分', msg: '強化玻璃強化後不能再裁切，整片碎掉了', fine: [8, 6000], act: async c => { const g = place(c.R.layer('glass'), P.glass(.8, 2.6), PX, 0, .6); popIn(g); gsap.delayedCall(.6, () => { SFX.crumple(); shake(.6); dust(wp(g).add(new THREE.Vector3(0, 1.2, 0)), 24, '#bfe0ea', 1.2); popOut(g); }); } },
          { t: '用磨邊機磨掉 2 公分', msg: '現場可以裁切、磨修的只有平板玻璃' }], rules: ['06-172', '06-43'] },
        { type: 'order', who: 'glazier', text: '裝固定玻璃。照順序拖進房間。', seq: true,
          items: [{ id: 'block', label: 'PVC 墊塊', icon: blockIcon }, { id: 'glass', label: '整片強化玻璃', icon: 'glass' }, { id: 'seal', label: '填縫劑', icon: 'silicone' }, { id: 'mark', label: '警示標記', icon: 'sign' }, { id: 'two', label: '兩片小玻璃拼接', icon: 'cut' }],
          order: ['block', 'glass', 'seal', 'mark'], decoy: { two: { msg: '除另有規定外，玻璃要整塊安裝，不得拼接', fine: [4, 2000], mistake: '玻璃拼接' } },
          why: { glass: '先放 PVC 墊塊', seal: '玻璃還沒裝上去，要填哪裡？', mark: '還沒填縫，貼什麼警示？' },
          act: {
            block: async c => { const k = new Kit(); for (const z of [GLASS[0] + .15, GLASS[1] - .15]) k.box(.06, .03, .1, '#5b6770', [PX, 0, z]); popIn(place(c.R.layer('glass'), k.mesh())); },
            glass: async c => { const g = place(c.R.layer('glass'), P.glass(GLASS[1] - GLASS[0], c.R.h - .04), PX, .03, (GLASS[0] + GLASS[1]) / 2); popIn(g); c.fixed = g; },
            seal: async c => { const k = new Kit(); for (const z of GLASS) k.box(.03, c.R.h, .02, '#e8eef0', [PX, 0, z]); popIn(place(c.R.layer('glass'), k.mesh(false))); SFX.pop(.7); },
            mark: async c => { const s = P.sign('未乾', C.yellow, C.ink, .3, .14); s.rotation.y = Math.PI / 2; c.wet = place(c.R.layer('glass'), popIn(s), PX + .03, 1.4, .6); },
          }, say: { block: '墊塊放好了', glass: '整片玻璃立進框裡', seal: '填縫完成，清掉多餘的填縫料', mark: '在還沒乾的接縫貼警示標記，免得被撞' }, done: '固定玻璃裝好了', rules: ['06-171', '06-45'] },
        { type: 'checklist', who: 'glazier', text: '會議室的玻璃門要裝地鉸鍊。安裝時要注意哪些？', options: [['地鉸鍊是否水平', 1], ['開關方向', 1], ['玻璃門的重量', 1], ['玻璃的透明度', 0]],
          after: async c => { const L = c.R.layer('glass'); const k = new Kit(); k.box(.06, 2.1, .05, C.steel, [PX, 0, 1.8]); k.box(.06, .06, .85, C.steel, [PX, 2.1, 1.4]); popIn(place(L, k.mesh())); place(L, popIn(P.glass(.8, c.R.h - 2.16)), PX, 2.16, 1.4);
            const pv = new THREE.Group(); const d = P.glass(.78, 2.08); d.position.z = .4; pv.add(d); place(L, pv, PX, .01, 1.0); popIn(pv, .2); c.door = pv; gsap.to(pv.rotation, { y: -1.1, duration: 1, delay: 1, yoyo: true, repeat: 1, ease: 'power2.inOut', onStart: () => SFX.creak() }); if (c.wet) popOut(c.wet, 1.5); },
          rules: ['06-138'], fine: [4, 0], okMsg: '玻璃門裝好了，開關順暢', ngMsg: '玻璃透明度跟地鉸鍊安裝無關' },
        { type: 'match', who: 'glazier', text: '門框和收邊用金屬料。把項目和做法配起來。', pairs: [['不銹鋼門框銲接', '氬銲'], ['最常見的氣銲', '氧乙炔氣銲'], ['鋁門框表面處理', '陽極處理'], ['CNS 字母 L', '角鋼']], rules: ['06-137', '06-15', '06-73', '06-77'] },
      ],
    },
    {
      id: 'height', name: '高處與吊掛', asker: 'boss', quizTitle: '老周的高處作業考題', camera: { theta: .55, phi: 1.0 },
      topics: ['04/梯子', '04/墜落防止、護欄與高處作業', '04/施工架工作臺（高度 2 公尺以上）', '04/高架作業休息時間', '04/營造工地一般規定', '04/材料堆放', '04/通道與人行道', '04/安全顏色與標示', '05/吊掛用具與捲揚機', '05/電氣與吊掛一般安全'],
      steps: ctx => [
        { type: 'say', who: 'boss', text: '最後是空調和天花上的設備，要爬高。梯子、施工架都要照規定來。', act: async c => { if (c.guest) { popOut(c.guest); c.guest = null; c.guestKey = null; } } },
        { type: 'slider', who: 'boss', text: '會議室裡架一座合梯裝空調。拉滑桿調梯腳和地面的角度。', min: 55, max: 88, step: 1, value: 84, unit: '度', label: '梯腳角度', good: 70,
          preview: (c, v) => { const L = c.R.layer('height'); if (c.lad) { c.lad.geometry.dispose(); L.remove(c.lad); } c.lad = place(L, ladder(v, false), 1.8, 0, -1.25); },
          check: v => v > 75 ? { ok: false, msg: `${v} 度太陡，合梯差點翻倒`, act: async c => { SFX.creak(); gsap.fromTo(c.lad.rotation, { z: 0 }, { z: .12, duration: .25, yoyo: true, repeat: 3, ease: 'sine.inOut', onComplete: () => { c.lad.rotation.z = 0; } }); } }
            : { ok: true, msg: `梯腳和地面 ${v} 度（75 度以內），兩梯腳用繫材扣牢`, act: async (c, val) => { const L = c.R.layer('height'); c.lad.geometry.dispose(); L.remove(c.lad); c.lad = place(L, ladder(val, true), 1.8, 0, -1.25); SFX.pop(1); } },
          rules: ['04-26', '07-44'], mistake: '合梯角度太陡' },
        { type: 'checklist', who: 'boss', text: '開放辦公區要搭 2 公尺高的施工架做天花板。工作臺要怎麼做？全部選起來。', options: [['工作臺寬 40 公分以上，舖滿密接踏板', 1], ['工作臺低於立柱頂點 1 公尺以上', 1], ['踏板厚度 3.5 公分以上', 1], ['活動式木踏板寬度 20 公分以上', 1], ['踏板重疊 10 公分就夠', 0], ['工作臺周邊設護欄（上欄杆 90 公分以上、中欄杆、腳趾板）', 1], ['工作臺寬 30 公分就夠', 0], ['踏板厚 2.5 公分就夠', 0]],
          after: async c => scaffold(c), rules: ['04-32', '04-25', '04-33', '04-12', '07-60'], fine: [8, 4000], okMsg: '施工架搭好了', ngMsg: '工作臺寬要 40 公分以上，踏板厚要 3.5 公分以上' },
        { type: 'tap', who: 'inspector', text: '吊料的時候我來巡一圈。點出現場所有的危險。', time: 60, missFine: [2, 0],
          targets: c => c.hz || (c.hz = hazards(c)),
          after: async c => { c.R.layer('hazard').children.forEach((m, i) => popOut(m, i * .05)); const a = place(c.R.layer('furn'), P.aircon(), 1.8, 2.5, c.R.Z0 + .12); popIn(a, .4); c.ac = a; },
          rules: ['05-46', '05-43', '04-24', '04-22', '04-2', '04-8'] },
        { type: 'calc', who: 'boss', text: '阿勇在作業高度 3 公尺的施工架上，從 8 點連續做到 12 點，共 4 小時。這段時間<b>至少要休息幾分鐘</b>？', hint: '作業高度 2～5 公尺：每連續作業 2 小時，至少休息 20 分鐘。', answer: 40, tol: .001, unit: '分鐘', explain: '4 小時是 2 個「連續 2 小時」，20 × 2 ＝ 40 分鐘', rules: ['04-21'] },
      ],
    },
  ],
  events: [
    { after: 'draw', who: 'manager', name: '新創執行長', title: '執行長的智財問題', line: '我們是做軟體的，客戶資料、程式碼、商標都很重要。這些規定你懂嗎？', topics: ['90007/個人資料保護法', '90007/著作權', '90007/專利與商標', '90007/營業秘密'], n: 2,
      before: async c => { if (c.guestKey !== 'ceo') { c.guestKey = 'ceo'; c.guest = c.ceo; } } },
    { after: 'plan', who: 'hr', title: '人資問勞動條件', line: '工班要排加班，我先確認一下勞基法的規定。', topics: ['90006/勞基法：工資、平均工資、職災補償', '90006/勞基法：工時、假日、契約、工作規則、終止契約', '90006/勞基法：申訴、勞資會議、勞動檢查', '90006/職災保險', '90006/母性健康保護'], n: 3,
      before: async c => guest(c, 'hr1', HR) },
    { after: 'partition', who: 'inspector', title: '勞檢員來了', line: '勞動檢查。雇主責任和健康管理，我抽問幾題。', topics: ['90006/職安法：雇主責任、通報、承攬、驗證、教育扶助', '90006/健康檢查與特別危害健康作業', '90006/職業病預防與災害原因分類', '90006/過勞與職場不法侵害'], n: 3,
      before: async c => guest(c, 'insp', CAST.inspector) },
    { after: 'wood', who: 'hr', title: '人資的性平宣導', line: '公司要訂性騷擾防治的辦法，順便考考你。', topics: ['90007/性別平等：CEDAW', '90007/性別平等工作法與性騷擾防治法'], n: 2,
      before: async c => guest(c, 'hr2', HR) },
    { after: 'glass', who: 'energy', title: '節能顧問來看設備', line: '辦公室的空調、電腦都很耗電。用電、能源和氣候的觀念考你幾題。', topics: ['90009/家電、電梯與辦公設備', '90009/能源管理與能源效率指標', '90009/用電安全', '90009/能源概況與再生能源', '90009/氣候變遷因應法與溫室氣體', '90008/國際公約、環境日與環境政策', '90008/全球暖化、氣候與大氣'], n: 3,
      before: async c => guest(c, 'energy', CAST.energy) },
  ],
  async finale(ctx) {
    const { R } = ctx; const L = R.layer('furn');
    panel.innerHTML = ''; // 收掉最後一題的按鈕，避免殘留在隱藏的工作紙裡
    if (ctx.scaf) popOut(ctx.scaf); if (ctx.lad) popOut(ctx.lad); if (ctx.guest) popOut(ctx.guest); popOut(ctx.ceo);
    const g = tileGrid(R.w, R.d, .45, ['#b7c3c6', '#a9b8bc'], .008, .012); g.position.y = .002; R.layer('carpet').add(g); await wait(revealTiles(g.children, .006) * .6);
    const items = [[P.desk(1.2), -1.7, 0, .15, 0], [P.desk(1.2), -.3, 0, .15, 0], [P.chair(C.teal), -1.7, 0, .7, Math.PI], [P.chair(C.teal), -.3, 0, .7, Math.PI],
      [P.desk(1.2), -1.7, 0, 1.55, Math.PI], [P.chair(C.coral), -1.7, 0, 1.0, 0], [P.table(1.3, .75, .74, C.cream), 1.8, 0, -.5, Math.PI / 2], [P.chair(C.coral), 1.35, 0, -.5, -Math.PI / 2], [P.chair(C.coral), 2.25, 0, -.5, Math.PI / 2], [P.plant(), 2.4, 0, 1.7, 0], [P.plant(), -.3, 0, 1.6, 0]];
    items.forEach(([m, x, y, z, ry], i) => { place(L, m, x, y, z, ry); popIn(m, .1 + i * .1); });
    ctx.ceo = place(R.inside, person({ body: '#3b4250', pants: C.ink, hair: C.ink }), .3, 0, 1.6); popIn(ctx.ceo, 1);
    if (ctx.ac) confetti(wp(ctx.ac), 10);
    gsap.to(R.slabMat, { opacity: .12, duration: 1 });
    await wait(1.6);
  },
};
