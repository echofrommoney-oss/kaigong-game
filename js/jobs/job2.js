// 第二案：浴室翻新。看圖 → 砌磚 → 水電 → 粉刷防水 → 貼磚 → 工程日報。
import { THREE, gsap, wait } from '../engine/core.js';
import { Kit, SH } from '../engine/paper.js';
import { C, P, CAST, place, popIn, dropIn, growX, popOut, tileGrid, revealTiles } from '../engine/props.js';
import { dust, confetti } from '../engine/fx.js';
import { SFX } from '../engine/audio.js';

const PX = -.5;          // 淋浴間隔間磚牆的位置（x）
const PLEN = 1.0;        // 隔間牆長度（從後牆往前）
const PT = .095;         // 半 B 磚牆厚
const PH = 1.1;          // 隔間牆高度

const sticker = (t, w = .5, h = .18, bg = '#fffdf7', fg = C.ink) => P.sign(t, bg, fg, w, h);
function bag(hex, lumpy) { const k = new Kit(); k.add(SH.round(.45, .12, .04), .3, hex); if (lumpy) { k.add(SH.circle(.06, -.1, .12), .12, hex, [0, 0, .02]); k.add(SH.circle(.05, .12, .11), .1, hex, [0, 0, -.06]); } return k.mesh(); }
function bagStack(n, hex, label) {
  const g = new THREE.Group(); for (let i = 0; i < n; i++) { const m = bag(hex); m.position.set((i % 2) * .02, i * .12, 0); m.rotation.y = (i % 2) * .08; g.add(m); }
  if (label) { const s = sticker(label, .42, .14, C.yellow); s.position.set(0, n * .12 + .12, .02); g.add(s); }
  return g;
}

function setup(ctx) {
  const { R } = ctx; const L = R.layer('base');
  // 舊浴室已經打掉，只剩粗胚；角落放水泥和紅磚
  const cem = new THREE.Group(); place(L, cem, -1.0, 0, .72);
  ctx.goodBags = []; ctx.badBags = [];
  for (let i = 0; i < 4; i++) { const m = bag('#e8dfcc'); m.position.set((i % 2) * .5 - .25, Math.floor(i / 2) * .12, 0); cem.add(m); ctx.goodBags.push(m); }
  for (let i = 0; i < 2; i++) { const m = bag('#8f8a80', true); m.position.set(i * .5 - .25, .24, 0); m.rotation.y = (i ? -.2 : .25); cem.add(m); ctx.badBags.push(m); }
  ctx.cement = cem;
  const bk = new Kit(); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) bk.box(.2, .053, .095, r % 2 ? C.coral : C.coral2, [(i - 1) * .21, r * .056, 0]);
  bk.box(.7, .06, .5, C.wood, [0, -.06, 0]); ctx.brickPile = place(L, bk.mesh(), .95, .06, -.15);
  ctx.mason = place(R.inside, CAST.worker(), 1.15, 0, .85);
}

/* ---------- 看圖：結構平面圖的平切面 ---------- */
function cutPlane(ctx, y) {
  const { R } = ctx;
  if (!ctx.cut) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R.w, R.d), new THREE.MeshBasicMaterial({ color: 0x7fb6d6, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; g.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(R.w, R.d)), new THREE.LineBasicMaterial({ color: 0x3e6c70 })); e.rotation.x = -Math.PI / 2; g.add(e);
    const s = sticker('平切', .3, .14, C.teal, '#ffffff'); s.position.set(R.X1 - .3, .09, R.Z0 + .2); g.add(s);
    R.layer('mark').add(g); ctx.cut = g;
  }
  ctx.cut.position.y = y;
}
function dwrMark(ctx) {
  const { R } = ctx; const L = R.layer('mark'); const k = new Kit();
  for (let x = R.X0 + .1; x < R.X1 - .1; x += .16) k.box(.1, .025, .01, C.teal, [x + .05, .45, R.Z0 + .006]);
  const m = place(L, k.mesh(false), 0, 0, 0); growX(m);
  const s = sticker('－DWR－', .4, .14, '#ffffff', C.teal); place(L, popIn(s, .3), R.X0 + .45, .62, R.Z0 + .01);
}

/* ---------- 砌磚 ---------- */
function polePreview(ctx, mm) {
  const { R } = ctx; const L = R.layer('brick');
  if (ctx.pole) { L.remove(ctx.pole); ctx.pole.geometry.dispose(); }
  const rh = (53 + mm) / 1000; const k = new Kit(); k.box(.05, 1.25, .05, C.wood);
  for (let y = rh, i = 1; y < 1.22; y += rh, i++) k.box(i % 5 ? .07 : .09, .006, .062, C.ink, [0, y, 0]);
  ctx.pole = place(L, k.mesh(), PX, 0, R.Z0 + PLEN + .12);
}
function buildWall(ctx) {
  if (ctx.rows) return ctx.rows;
  const { R } = ctx; const L = R.layer('brick');
  const j = (ctx.joint || 10) / 1000, rh = .053 + j; const n = Math.round(PH / rh); const bl = .2; const rows = [];
  for (let r = 0; r < n; r++) {
    const k = new Kit(); const off = r % 2 ? bl / 2 : 0;
    k.box(PT - .014, rh, PLEN - .01, '#cfc6b6', [0, r * rh, 0]);
    for (let i = -1; i <= PLEN / bl; i++) {
      const z0 = Math.max(-PLEN / 2, -PLEN / 2 + i * bl + off + j / 2), z1 = Math.min(PLEN / 2, -PLEN / 2 + (i + 1) * bl + off - j / 2); if (z1 - z0 < .04) continue;
      k.add(SH.rect(PT, rh - j, 0, r * rh + j / 2), z1 - z0, (i + r) % 3 ? C.coral : C.coral2, [0, 0, (z0 + z1) / 2]);
    }
    const m = place(L, k.mesh(), PX, 0, R.Z0 + PLEN / 2); m.visible = false; rows.push(m);
  }
  ctx.rows = rows; ctx.wallH = n * rh; return rows;
}
function raiseRows(ctx, part) {
  const rows = buildWall(ctx); const per = Math.ceil(rows.length / 4);
  rows.slice(part * per, (part + 1) * per).forEach((m, k) => { m.visible = true; dropIn(m, k * .07, .35); });
  SFX.thud(.6);
}

/* ---------- 水電 ---------- */
function supplyPipe(ctx) {
  const { R } = ctx; const L = R.layer('pipeWall'); const k = new Kit(); const z = R.Z0 + .04, cold = '#7fb6d6';
  k.pipe(.022, [R.X0 + .15, .55, z], [R.X1 - .25, .55, z], cold);
  k.cyl(.022, .65, cold, [R.X0 + .3, .55, z]); k.cyl(.022, .3, cold, [1.1, .55, z]); k.cyl(.022, .1, cold, [.15, .45, z]);
  const m = place(L, k.mesh(), 0, 0, 0); growX(m); SFX.pop(1.1); ctx.supply = m;
}
function drainPipe(ctx) {
  const { R } = ctx; const L = R.layer('pipeFloor');
  if (!ctx.drain) {
    const g = new THREE.Group(); const k = new Kit(); k.pipe(.04, [-1.15, 0, 0], [1.15, 0, 0], C.grey); g.add(k.mesh()); g.position.set(.15, .22, -.3); L.add(g); ctx.drain = g;
    const s = new Kit(); s.cyl(.05, R.h - .05, C.grey, [0, 0, 0]); ctx.stack = place(L, s.mesh(), 1.35, 0, -.3); popIn(ctx.stack); growX(g);
  }
  return ctx.drain;
}
function wiring(ctx) {
  const { R } = ctx; const L = R.layer('pipeWall'); const z = R.Z0 + .03; const k = new Kit();
  k.box(.03, R.h - 1.25, .02, C.yellow, [.7, 1.25, z]);                // 導線管
  k.box(.012, R.h - 1.25, .022, '#3fa36b', [.74, 1.25, z]);            // 綠色接地線
  k.box(.16, .16, .06, '#9fb4bd', [.72, R.h - .4, z + .01]);           // 防水型接線盒
  const m = place(L, k.mesh(), 0, 0, 0); popIn(m); ctx.wires = m;
  ctx.outlet = place(R.layer('fix'), popIn(P.outlet(), .3), .7, 1.15, R.Z0 + .036);
}

/* ---------- 粉刷防水：一層一層蓋上去 ---------- */
function coat(ctx, hex, lift) {
  const { R } = ctx; const L = R.layer('coat'); const k = new Kit(); const t = .004;
  k.flat(SH.rect(R.w, R.d, 0, -R.d / 2), t, hex, [0, .002 + lift, 0]);
  k.box(R.w, .3, t, hex, [0, 0, R.Z0 + .003 + lift]); k.box(t, .3, R.d, hex, [R.X0 + .003 + lift, 0, 0]);
  k.box(PX - R.X0, 1.8, t, hex, [(R.X0 + PX) / 2, 0, R.Z0 + .003 + lift]); k.box(t, 1.8, PLEN, hex, [R.X0 + .003 + lift, 0, R.Z0 + PLEN / 2]);
  if (ctx.rows) k.box(PT + .02 + lift * 2, ctx.wallH + .01, PLEN + .01, hex, [PX, 0, R.Z0 + PLEN / 2]);
  const m = place(L, k.mesh(false), 0, 0, 0); m.scale.y = .001; gsap.to(m.scale, { y: 1, duration: .7, ease: 'power2.out' });
  if (ctx.coatNow) { const old = ctx.coatNow; setTimeout(() => { old.visible = false; }, 700); }
  ctx.coatNow = m; SFX.flip(.6); return m;
}
function tub(ctx) {
  if (ctx.tub) return ctx.tub;
  const g = new THREE.Group(); const k = new Kit(); k.cyl(.22, .2, C.ink2); g.add(k.mesh());
  const top = new THREE.Mesh(new THREE.CircleGeometry(.2, 20), new THREE.MeshLambertMaterial({ color: 0xb9b2a6 })); top.rotation.x = -Math.PI / 2; top.position.y = .205; g.add(top);
  g.userData.top = top; ctx.tub = place(ctx.R.layer('coatTools'), g, .6, 0, .35); popIn(g); return g;
}

/* ---------- 貼磚 ---------- */
function floorTiles(ctx, size, hex) {
  const { R } = ctx; const g = tileGrid(R.w, R.d, size, hex, .008, .015); g.position.y = .008; R.layer('tile').add(g); return g;
}
function wallTiles(ctx) {
  const { R } = ctx; const L = R.layer('tile'); const H = 2.1; const hex = ['#e3f1f4', '#ffffff', '#ffffff'];
  const b = tileGrid(R.w, H, .3, hex, .01, .012); b.rotation.x = Math.PI / 2; const bo = new THREE.Group(); bo.add(b); bo.position.set(0, H / 2, R.Z0 + .012); L.add(bo);
  const l = tileGrid(R.d, H, .3, hex, .01, .012); l.rotation.x = Math.PI / 2; const lo = new THREE.Group(); lo.add(l); lo.rotation.y = Math.PI / 2; lo.position.set(R.X0 + .012, H / 2, 0); L.add(lo);
  return [...b.children, ...l.children].sort((p, q) => p.getWorldPosition(new THREE.Vector3()).y - q.getWorldPosition(new THREE.Vector3()).y);
}

/* ---------- 工程日報：工地巡一圈 ---------- */
function siteProps(ctx) {
  if (ctx.site) return ctx.site;
  const { R } = ctx; const L = R.layer('site'); const s = {};
  const pn = P.panel(); pn.rotation.y = Math.PI / 2; place(L, popIn(pn), R.X0 + .1, 1.1, .75);
  s.paper = new THREE.Group(); { const k = new Kit(); k.box(.4, .25, .3, '#c9a27a', [0, 0, 0]); k.box(.32, .2, .26, '#d8b48c', [.02, .25, 0], .3); k.box(.5, .03, .12, C.wood, [0, .45, 0], -.4); s.paper.add(k.mesh()); const t = sticker('紙箱、木屑', .5, .15); t.position.set(0, .7, .1); s.paper.add(t); }
  place(L, popIn(s.paper, .1), R.X0 + .35, 0, .75);
  s.boxes = new THREE.Group(); { const k = new Kit(); k.box(.45, .5, .45, '#f0e6d2'); k.box(.4, .3, .35, '#f0e6d2', [0, .5, 0]); s.boxes.add(k.mesh()); const t = sticker('衛浴器材', .45, .15); t.position.set(0, .95, .1); s.boxes.add(t); }
  place(L, popIn(s.boxes, .2), 1.05, 0, -.1);
  s.sand = new THREE.Group(); { const k = new Kit(); k.add(SH.round(.5, .16, .06), .35, '#d9c08f'); k.add(SH.round(.5, .16, .06), .35, '#d2b884', [.05, .16, 0]); s.sand.add(k.mesh()); const t = sticker('泥作材料', .45, .15); t.position.set(0, .5, .1); s.sand.add(t); }
  place(L, popIn(s.sand, .3), .25, 0, .85);
  s.old = place(L, popIn(bagStack(4, '#e8dfcc', '10/02 進場'), .35), -.85, 0, .25);
  s.new = place(L, popIn(bagStack(4, '#efe7d6', '10/16 進場'), .45), -.2, 0, .5);
  ctx.site = s; return s;
}

const EV = {
  inspector: { type: 'quiz', who: 'inspector', title: '勞檢員來了', line: '切磚粉塵大、浴室又窄。勞動檢查，我抽問幾題。', topics: ['90006/有害物、噪音、熱危害與防護具', '90006/火災爆炸、局限空間、通風換氣', '90006/急救'], n: 3,
    before: async c => { c.insp = place(c.R.inside, CAST.inspector(), .2, 0, .95); popIn(c.insp); SFX.whistle(); }, after: async c => popOut(c.insp) },
  energy: { type: 'quiz', who: 'energy', title: '節能顧問小綠', line: '浴室最會用水、用熱水。我來考你省水和節能。', topics: ['90009/省水與水資源', '90009/空調、熱水與建築節能'], n: 2,
    before: async c => { c.eng = place(c.R.inside, CAST.energy(), -.2, 0, .95); popIn(c.eng); }, after: async c => popOut(c.eng) },
  eco: { type: 'quiz', who: 'eco', title: '環保局稽查', line: '我來看看你們工地的廢水和環境衛生。順便考幾題。', topics: ['90008/水質與水污染防治', '90008/毒化物、持久性污染物、土壤及地下水', '90008/病媒防治與環境衛生用藥'], n: 3,
    before: async c => { c.eco = place(c.R.inside, CAST.eco(), .2, 0, .95); popIn(c.eco); }, after: async c => popOut(c.eco) },
};

export default {
  id: 'j2', title: '浴室翻新', short: '浴室', sub: '老浴室重做：砌隔間、配管、防水、貼磚', color: '#7fb6d6', pay: 160000, doneLine: '浴室亮晶晶，不漏水',
  room: { w: 3.0, d: 2.4, h: 2.8, floor: 'concrete', window: false, wall: '#d9d2c4' },
  setup,
  stations: [
    {
      id: 'plan', name: '看圖', asker: 'designer', quizTitle: '設計師小圖考你看圖', camera: { theta: .45, phi: 1.05 },
      topics: ['01/設備圖例：給排水及衛生', '01/結構圖符號'],
      steps: ctx => [
        { type: 'say', who: 'owner', text: '浴室舊東西都打掉了。我想隔一間淋浴間，重新配管、做防水、貼磁磚。拜託你們了！' },
        { type: 'match', who: 'designer', text: '先看結構圖。圖上的代號你要看得懂，把代號和意思配起來。', pairs: [['C', '柱'], ['WB', '牆樑'], ['SRC', '鋼骨鋼筋混凝土造'], ['B', '磚構造'], ['W', '木構造']], rules: ['01-26', '01-25', '01-27', '01-75'] },
        { type: 'slider', who: 'designer', text: '結構平面圖是在多高的地方「平切」往下看畫出來的？拉滑桿，把切面移到正確高度。', min: .6, max: 2.4, step: .1, value: 2.2, unit: '公尺', label: '平切高度', fmt: v => (+v).toFixed(1), good: 1.5,
          preview: (c, v) => cutPlane(c, v),
          check: v => Math.abs(v - 1.5) < .01 ? { ok: true, msg: '對，由各層地板面以上 1.5 公尺平切下視' } : { ok: false, msg: `${(+v).toFixed(1)} 公尺不對，結構平面圖不是從這個高度切的` },
          rules: ['01-38'], mistake: '平切高度錯' },
        { type: 'choose', who: 'designer', text: '設備圖上有一條管線標著「－DWR－」，要從浴室牆裡經過。它是什麼管？', options: [
          { t: '飲水用的回水管', ok: true, msg: '對，－DWR－ 是飲水用的回水管。先在牆上標出來，水電師傅才不會打到', act: async c => { if (c.cut) popOut(c.cut); dwrMark(c); } },
          { t: '飲水管', msg: '飲水管是另一個符號，DWR 的 R 是回水' }, { t: '排水管', msg: '不是排水管' }, { t: '給水管', msg: '不是一般給水管' }], rules: ['01-35'] },
      ],
    },
    {
      id: 'brick', name: '砌磚', asker: 'mason', quizTitle: '土豆師傅的泥作考題', camera: { theta: .55, phi: 1.0 },
      topics: ['06/泥作：砌磚', '06/混凝土與水泥', '05/泥作工具'],
      steps: ctx => [
        { type: 'choose', who: 'mason', text: '要拌砂漿了。角落那堆水泥裡，上面兩包已經結塊。怎麼處理？', cols: 1, options: [
          { t: '結塊的不能用，整批運離工地', ok: true, msg: '對，已結塊或變質的水泥不得使用，要整批運離工地', act: async c => { c.badBags.forEach((m, i) => popOut(m, i * .1)); SFX.whistle(); } },
          { t: '敲碎過篩，照樣拿來拌', msg: '結塊的水泥已經變質，不能用', fine: [6, 2000] },
          { t: '跟新水泥混在一起拌，看不出來', msg: '混進去一樣是用了變質的水泥', fine: [6, 2000] }], rules: ['06-268'] },
        { type: 'checklist', who: 'mason', text: '要砌淋浴間的半 B 磚牆。砌磚要帶哪些工具？全部選起來。', options: [['墨斗', 1], ['水線', 1], ['垂球', 1], ['桃形鏝刀', 1], ['填縫鏝刀', 1], ['氣泡水平尺', 1], ['磚鑿', 1], ['內外角鏝刀', 0], ['木槌', 0]],
          rules: ['05-6', '05-20', '05-22'], fine: [4, 0], okMsg: '工具帶齊了', ngMsg: '有漏掉或多帶的', note: '「金屬鏝刀、內外角鏝刀、木槌」那一組不是砌磚工具；磚鑿是用來切磚的。' },
        { type: 'slider', who: 'mason', text: '先做皮數桿，每一格＝一皮磚的厚度＋灰縫。紅磚厚 53 公釐，灰縫要留多寬？', min: 2, max: 20, step: 1, value: 4, unit: '公釐', label: '灰縫寬度', good: 10,
          preview: (c, v) => { c.joint = v; polePreview(c, v); },
          check: v => v >= 8 && v <= 10 ? { ok: true, msg: `灰縫 ${v} 公釐，皮數桿每格 53＋${v}＝${53 + v} 公釐` } : { ok: false, msg: `灰縫 ${v} 公釐不對，一般採 8～10 公釐` },
          rules: ['06-5', '06-59', '06-57', '06-163'], mistake: '灰縫寬度不對' },
        { type: 'order', who: 'mason', text: '開始砌磚。照順序把步驟拖進房間，牆會一皮一皮長高。', seq: true,
          items: [{ id: 'wet', label: '磚澆水', icon: 'water' }, { id: 'throw', label: '摔漿', icon: 'trowel' }, { id: 'spread', label: '撥漿', icon: 'mortar' }, { id: 'scrape', label: '刮漿', icon: 'putty' }, { id: 'head', label: '砌頭', icon: 'brick' },
            { id: 'dry', label: '磚曬乾', icon: (x, R) => { x.fillStyle = '#ffc96b'; x.beginPath(); x.arc(0, -6, 22, 0, 7); x.fill(); R(-30, 22, 60, 12, '#e4846f', 2); } }],
          order: ['wet', 'throw', 'spread', 'scrape', 'head'],
          decoy: { dry: { msg: '「磚塊保持乾燥」是錯的，砌磚前要讓磚充分吸水', fine: [4, 0], mistake: '乾磚直接砌', rules: ['06-2'] } },
          why: { throw: '磚還沒澆水。砌磚前要先讓磚充分吸水', spread: '要先摔漿，才有砂漿可以撥', scrape: '順序是摔漿 → 撥漿 → 刮漿', head: '漿還沒刮好，不能砌頭' },
          act: {
            wet: async c => { dust(c.brickPile.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .3, 0)), 14, '#7fb6d6', .8); SFX.splash(); if (c.pole) popOut(c.pole); },
            throw: async c => raiseRows(c, 0), spread: async c => raiseRows(c, 1), scrape: async c => raiseRows(c, 2),
            head: async c => { raiseRows(c, 3); popOut(c.brickPile, .6); popOut(c.cement, .8); await wait(.9); SFX.chime(); confetti(c.R.inside.localToWorld(new THREE.Vector3(PX, 1.6, c.R.Z0 + .5)), 12); },
          },
          say: { wet: '磚充分吸水了', throw: '摔漿：用桃形鏝刀把砂漿摔上去', spread: '撥漿：把砂漿撥開', scrape: '刮漿：多的刮掉', head: '砌頭：半 B 磚牆砌好了，上下皮錯縫' },
          done: '淋浴間隔間牆砌好了', rules: ['06-2', '06-4', '06-166'] },
      ],
    },
    {
      id: 'pipe', name: '水電', asker: 'plumber', quizTitle: '大頭師傅的水電考題', camera: { theta: .4, phi: 1.02 },
      topics: ['06/水電：給排水', '06/水電：用戶用電設備裝置規則（舊稱屋內線路裝置規則）'],
      steps: ctx => [
        EV.inspector,
        { type: 'do', fn: async c => { c.plumber = place(c.R.inside, CAST.plumber(), .45, 0, .95); popIn(c.plumber); await wait(.5); } },
        { type: 'choose', who: 'plumber', text: '先拉給水進水管。管徑最小可以用到多少？', options: [
          { t: '19 公厘', ok: true, msg: '對，給水進水管管徑不得小於 19 公厘', act: async c => supplyPipe(c) }, { t: '13 公厘', msg: '太細了，給水進水管不得小於 19 公厘' }, { t: '10 公厘', msg: '太細了，給水進水管不得小於 19 公厘' }], rules: ['06-117'] },
        { type: 'slider', who: 'plumber', text: '淋浴間和馬桶的排水橫管，管徑 75 公厘。坡度要多少？拉滑桿，看管子斜下去。', min: 20, max: 200, step: 10, value: 150, label: '排水坡度', fmt: v => '1/' + v, good: 50,
          preview: (c, v) => { const d = drainPipe(c); d.rotation.z = -Math.atan(1 / v) * 3; },
          check: v => v <= 50 ? { ok: true, msg: `坡度 1/${v}，不小於 1/50，水排得掉` } : { ok: false, msg: `坡度 1/${v} 太平了。管徑 75 公厘以下，坡度不得小於 1/50` },
          rules: ['06-118'], mistake: '排水坡度太小' },
        { type: 'checklist', who: 'plumber', text: '鏡子旁邊要裝插座。浴室很潮濕，配線要怎麼做？全部選起來。', options: [['接線盒用防水型', 1], ['接地線用綠色', 1], ['電線和水管無法隔離時，間隔 150 公厘', 1], ['用絕緣軟銅線配線', 1], ['接線盒用開放型', 0], ['接地線用紅色', 0], ['用鐵線配線', 0]],
          rules: ['06-194', '06-187', '06-114', '06-183'], fine: [6, 2000], okMsg: '配線做對了', ngMsg: '配線有問題',
          after: async c => wiring(c) },
      ],
    },
    {
      id: 'plaster', name: '粉刷防水', asker: 'mason', quizTitle: '土豆師傅的粉刷考題', camera: { theta: .5, phi: 1.08 },
      topics: ['06/泥作：粉刷、粉光、磨石子'],
      steps: ctx => [
        EV.energy,
        { type: 'do', fn: async c => { if (c.plumber) popOut(c.plumber); tub(c); await wait(.4); } },
        { type: 'slider', who: 'mason', text: '浴室地面和牆腳要做防水粉刷。水泥和砂要怎麼配？', min: 1, max: 5, step: 1, value: 4, label: '砂的比例', fmt: v => `水泥 1：砂 ${v}`, good: 2,
          preview: (c, v) => { const t = tub(c).userData.top; t.material.color.set(['#8f8a80', '#a29c91', '#b5ad9f', '#c6bba7', '#d4c6aa'][v - 1]); },
          check: v => v === 2 ? { ok: true, msg: '對，一般防水粉刷用水泥 1：砂 2' } : { ok: false, msg: `水泥 1：砂 ${v} 不是防水粉刷的比例` },
          rules: ['06-3'], mistake: '防水砂漿比例錯' },
        { type: 'order', who: 'mason', text: '開始粉刷。照順序拖進房間，看地板和牆腳一層一層蓋上去。', seq: true,
          items: [{ id: 'wet', label: '牆面灑水', icon: 'water' }, { id: 'slurry', label: '純水泥漿', icon: 'primer' }, { id: 'base', label: '防水砂漿', icon: 'mortar' }, { id: 'finish', label: '粉光', icon: 'trowel' },
            { id: 'both', label: '打底粉光一起做', icon: 'cut' }],
          order: ['wet', 'slurry', 'base', 'finish'],
          decoy: { both: { msg: '打粗底和粉光「不可」同時進行', fine: [4, 0], mistake: '打底和粉光同時做', rules: ['06-168'] } },
          why: { slurry: '牆面還是乾的，先用水濕潤', base: '抹砂漿之前，要先塗一層純水泥漿', finish: '底還沒打好，不能粉光' },
          act: {
            wet: async c => { coat(c, '#b4ab9c', 0); dust(c.R.inside.localToWorld(new THREE.Vector3(-.8, .4, c.R.Z0 + .3)), 12, '#7fb6d6', .9); SFX.splash(); },
            slurry: async c => coat(c, '#9a948b', .002),
            base: async c => { coat(c, '#7f9fb0', .004); if (c.drain) { popOut(c.drain); popOut(c.stack); } c.grate = place(c.R.layer('fix'), popIn(P.drain(), .4), -1.0, .02, -.8); },
            finish: async c => { coat(c, '#a9c3cf', .006); if (c.tub) popOut(c.tub); SFX.chime(); },
          },
          say: { wet: '牆面先用水濕潤', slurry: '先刷一層純水泥漿，砂漿才咬得住', base: '防水砂漿抹好了：地面、牆腳、淋浴間都包起來', finish: '粉光完成，表面又平又光' },
          done: '防水粉刷完成', rules: ['06-168'] },
        { type: 'choose', who: 'mason', text: '桶子裡還剩半桶砂漿，是 70 分鐘前拌的。要怎麼辦？', cols: 1, options: [
          { t: '倒掉不用，要用再重拌', ok: true, msg: '對，水泥砂漿拌合後超過 60 分鐘就不得使用' },
          { t: '加點水拌一拌再用', msg: '超過 60 分鐘的砂漿不得使用，加水也一樣', fine: [5, 1500] },
          { t: '趕快抹完就好', msg: '超過 60 分鐘的砂漿不得使用', fine: [5, 1500] }], rules: ['06-9'] },
        { type: 'match', who: 'mason', text: '泥作的配比和時機要記清楚。把左右配起來。', pairs: [['防水粉刷', '水泥 1：砂 2'], ['灰誌', '水泥 1：砂 3'], ['整體粉光', '水泥終凝前完成'], ['海菜粉', '用在磁磚鋪貼']], rules: ['06-3', '06-8', '06-53', '06-7'] },
      ],
    },
    {
      id: 'tile', name: '貼磚', asker: 'mason', quizTitle: '土豆師傅的貼磚考題', camera: { theta: .5, phi: 1.05 },
      topics: ['06/泥作：磁磚與石材', '05/其他材料的專用工具'],
      steps: ctx => [
        EV.eco,
        { type: 'checklist', who: 'mason', text: '要貼磁磚了。貼磚要準備哪些工具？全部選起來。', options: [['切割機', 1], ['齒型鏝刀', 1], ['海綿鏝刀', 1], ['磁磚鉗', 1], ['灰縫杓', 1], ['調縫刀', 1], ['鋁製押板', 0], ['蹬緊器', 0], ['佈膠機', 0]],
          rules: ['06-271', '05-8'], fine: [4, 0], okMsg: '工具帶齊了', ngMsg: '有漏掉或多帶的', note: '鋁製押板不在答案內；蹬緊器是鋪地毯的，佈膠機是貼壁紙的。' },
        { type: 'choose', who: 'owner', text: '地坪要用硬底工法貼。我想挑地磚，哪一種可以？', cols: 1, options: [
          { t: '20 × 20 公分瓷磚', ok: true, msg: '對，20 × 20 公分瓷磚可以用硬底工法', act: async c => { const g = floorTiles(c, .2, ['#f4f1ea', '#e7e1d5', '#f4f1ea']); await wait(revealTiles(g.userData.tiles, .006)); await wait(revealTiles(wallTiles(c), .01)); c.R.layer('pipeWall').children.forEach(m => popOut(m)); c.R.layer('mark').children.forEach(m => popOut(m)); } },
          { t: '60 × 60 公分大地磚', msg: '60 × 60 公分的大尺寸地磚不適用硬底工法', fine: [6, 3000], act: async c => { const g = floorTiles(c, .6, '#cfc9be'); await wait(revealTiles(g.userData.tiles, .03)); await wait(.5); g.userData.tiles.forEach((t, i) => popOut(t, i * .02)); await wait(1); c.R.layer('tile').remove(g); } }], rules: ['06-167'] },
        { type: 'tap', who: 'boss', text: '上一間浴室的磁磚掉下來，我在牆上貼了檢討單。點出會讓磁磚剝落的原因。', camera: { theta: .3, phi: 1.12 }, time: 60,
          targets: c => {
            if (!c.notes) { const L = c.R.layer('notes'); const z = c.R.Z0 + .03; const mk = (t, x, y) => place(L, popIn(sticker(t, .56, .2), Math.random() * .3), x, y, z);
              c.notes = [mk('膠泥塗得太薄', -1.0, 1.75), mk('沒留伸縮縫', .1, 1.95), mk('磁磚本身有裂痕', .1, 1.55), mk('用齒型鏝刀梳膠', 1.0, 1.75)]; }
            return [{ obj: c.notes[0], ok: true, msg: '膠泥塗佈厚度不足，會剝落', label: '膠泥太薄' }, { obj: c.notes[1], ok: true, msg: '伸縮縫沒有妥善預留，會剝落', label: '沒留伸縮縫' },
              { obj: c.notes[2], ok: true, msg: '磁磚品質不良或龜裂，會剝落', label: '磁磚有裂' }, { obj: c.notes[3], ok: false, msg: '齒型鏝刀是貼磚的正常工具，不是剝落原因' }];
          },
          after: async c => { c.notes.forEach((m, i) => popOut(m, i * .08)); SFX.crumple(); }, rules: ['06-274', '06-271'] },
        { type: 'match', who: 'mason', text: '收尾要裝鏡子、打矽力康。這些工具各做什麼？配起來。', pairs: [['填縫槍', '打矽力康'], ['玻璃切割刀', '現場切薄玻璃'], ['排筆', '大面積刷塗'], ['滾壓輪', '鋪塑膠地磚']], rules: ['05-4', '05-1', '05-13', '05-8'] },
      ],
    },
    {
      id: 'report', name: '工程日報', asker: 'boss', quizTitle: '老周的工地管理考題', camera: { theta: .55, phi: 1.0 },
      topics: ['07/工程日報表', '07/管理分類與工地管理'],
      steps: ctx => [
        { type: 'tap', who: 'boss', text: '收工前巡一圈。電箱旁邊堆了不該堆的東西，點出來。', camera: { theta: .75, phi: 1.02 }, time: 60,
          targets: c => { const s = siteProps(c); return [{ obj: s.paper, ok: true, msg: '紙箱、木屑是易燃物，不能堆在電源旁邊', label: '易燃物' }, { obj: s.boxes, ok: false, msg: '衛浴器材不是易燃物' }, { obj: s.sand, ok: false, msg: '泥作材料不是易燃物' }]; },
          after: async c => popOut(c.site.paper), rules: ['07-14'] },
        { type: 'tap', who: 'boss', text: '明天要補縫，要發一批袋裝水泥給師傅。點要先發的那一批。', camera: { theta: .3, phi: 1.02 }, time: 60,
          targets: c => { const s = siteProps(c); return [{ obj: s.old, ok: true, msg: '先到先用：先發 10/02 進場的', label: '10/02 那批' }, { obj: s.new, ok: false, msg: '這批比較晚到，先到的要先用' }]; },
          after: async c => popOut(c.site.old), rules: ['07-18'] },
        { type: 'checklist', who: 'boss', text: '寫今天的工程日報表。哪些要填？全部選起來。', options: [['氣候', 1], ['出工人數與工種', 1], ['出勤重要機具', 1], ['供給材料使用數量', 1], ['重要事項紀錄', 1], ['施工取樣試驗', 1], ['當日出工薪資', 0], ['施工人員的情緒', 0], ['車輛駕駛員性別', 0]],
          rules: ['07-72', '07-73', '07-93', '07-94', '07-95', '07-96'], fine: [5, 0], okMsg: '日報表填好了', ngMsg: '日報表填得不對', note: '薪資、情緒、駕駛員性別都不是日報表要記的。' },
        { type: 'match', who: 'boss', text: '工地管理分很多種。把要做的事和管理類別配起來。', pairs: [['對照預定與實際進度', '工程管理'], ['掌握材料種類與數量', '物料管理'], ['工作分配表', '控制勞務費分配'], ['工地照明與通風', '作業環境']], rules: ['07-11', '07-13', '07-12', '07-15'] },
      ],
    },
  ],
  // 共同科目的事件。main.js 目前把事件物件整個展開給 STEP.quiz，裡面的 after（站名字串）會被當成函式呼叫而卡住，
  // 所以這裡的事件改成在下一站開頭用 quiz 步驟出題（EV.*）；events 只用來登記題池，after 指向不存在的站，不會重複出題。
  events: Object.values(EV).map(e => ({ after: '_inStep', who: e.who, title: e.title, line: e.line, topics: e.topics, n: e.n })),
  async finale(ctx) {
    const { R } = ctx; const L = R.layer('fix');
    R.layer('site').children.forEach(m => popOut(m));
    const fan = (() => { const k = new Kit(); k.box(.3, .3, .05, C.white); for (let i = 0; i < 4; i++) k.box(.22, .02, .06, '#c9ccd0', [0, .06 + i * .05, 0]); return k.mesh(); })();
    const items = [[P.shower(), R.X0 + .05, .02, R.Z0 + .05, 0], [P.toilet(), .15, .02, -.85, 0], [P.basin(), 1.1, .02, R.Z0 + .27, 0], [fan, .15, 2.3, R.Z0 + .03, 0]];
    items.forEach(([m, x, y, z, ry], i) => { place(L, m, x, y, z, ry); popIn(m, .1 + i * .18); });
    if (ctx.mason) gsap.to(ctx.mason.position, { x: 1.25, z: 1.0, duration: .6 });
    gsap.to(R.slabMat, { opacity: .12, duration: 1 });
    await wait(1.4);
  },
};
