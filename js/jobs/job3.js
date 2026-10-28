// 第三案：巷口咖啡店（供公眾使用）。看圖 → 送審 → 防火 → 消防設備 → 軟裝 → 開幕。
import { THREE, gsap, wait, raycast } from '../engine/core.js';
import { Kit, SH } from '../engine/paper.js';
import { C, P, CAST, person, place, popIn, dropIn, growX, popOut, tileGrid, revealTiles } from '../engine/props.js';
import { dust, confetti } from '../engine/fx.js';
import { SFX } from '../engine/audio.js';
import { input } from '../engine/input.js';
import { showPanel, sayHtml, appendPanel, ruleCards, next, panel } from '../game/ui.js';

const CH = 2.7;          // 天花板完成面高度
const WX = -1.1;         // 後牆窗戶中心
const SILL = 1.0;        // 窗台高度
const DOORZ = -.95;      // 左牆門的位置（z）
const HALF = Math.PI / 2;

const box = (w, h, d, hex, pos, ry) => { const k = new Kit(); k.box(w, h, d, hex, pos, ry); return k.mesh(); };
// 牆上的小標籤（貼在後牆：面向 +z；貼在左牆：轉 90 度）
let TAGS = [];
function tag(L, text, x, y, z, ry = 0, bg = '#fffdf7', w = .5, h = .15, delay = 0) { const s = P.sign(text, bg, C.ink, w, h); place(L, s, x, y, z, ry); TAGS.push(s); return popIn(s, delay); }

/* ---------- 現況：空店面＋既有的設備 ---------- */
function setup(ctx) {
  const { R } = ctx; const L = R.layer('base'); TAGS = [];
  // 設備（看圖那一站要一個一個點）
  ctx.mainPanel = place(L, (() => { const k = new Kit(); k.box(.42, .56, .14, '#c8cfd4', [0, -.28, 0]); k.add(SH.rect(.36, .48, 0, -.26), .15, '#dfe4e7'); k.add(SH.rect(.05, .05, .13, 0), .16, C.red, [0, -.2, 0]); return k.mesh(); })(), R.X0 + .08, 1.6, -1.66, HALF);
  ctx.subPanel = place(L, (() => { const k = new Kit(); k.box(.3, .4, .12, '#d5dadd', [0, -.2, 0]); k.add(SH.rect(.24, .32, 0, -.18), .13, '#eef1f2'); return k.mesh(); })(), .55, 1.45, R.Z0 + .07);
  ctx.lamp = place(L, (() => { const k = new Kit(); k.box(.06, .2, .04, C.ink2, [0, -.1, 0]); k.box(.03, .03, .18, C.ink2, [0, -.015, .09]); k.add(SH.circle(.08), .1, '#ffe39a', [0, -.08, .2]); return k.mesh(); })(), -2.05, 2.0, R.Z0 + .02);
  ctx.outlet = place(L, (() => { const k = new Kit(); k.flat(SH.rectC(.2, .2), .025, C.steel); k.flat(SH.circle(.06), .03, C.white, [0, 0, 0]); k.flat(SH.rectC(.1, .012), .035, C.ink, [0, 0, 0]); return k.mesh(false); })(), .9, .002, .55);
  ctx.firePipe = place(L, (() => { const k = new Kit(); k.pipe(.05, [R.X0 + .1, 0, 0], [R.X1 - .1, 0, 0], C.red); k.add(SH.circle(.07), .06, '#a8402e', [-.8, 0, 0], [0, HALF, 0]); k.add(SH.circle(.07), .06, '#a8402e', [.9, 0, 0], [0, HALF, 0]); return k.mesh(); })(), 0, 2.86, -.35);
  ctx.alarm = place(L, (() => { const k = new Kit(); k.add(SH.circle(.11), .06, C.red, [0, 0, 0]); k.add(SH.circle(.045), .07, C.white, [0, 0, 0]); k.add(SH.poly([[-.08, -.13], [.08, -.13], [0, -.25]]), .05, C.red, [0, 0, 0]); return k.mesh(); })(), R.X0 + .06, 1.45, 1.45, HALF);
  ctx.aircon = place(L, P.aircon(), 1.8, 2.25, R.Z0 + .12);
  // 舊店留下的雜物
  ctx.junk = [place(L, P.debris(5, ['#b9a98f', '#a49680', '#c9bba3']), 1.6, 0, .6), place(L, P.debris(3, ['#b9a98f', '#a49680']), -1.8, 0, -1.2)];
  // 工作桌（放圖說、送審文件）
  ctx.desk = place(L, P.table(1.0, .55, .75, C.wood), -.9, 0, .75);
  // 人物
  ctx.boss = place(R.inside, CAST.boss(), 1.95, 0, 1.3);
  ctx.manager = place(R.inside, person({ body: '#8a5a44', pants: C.ink, hair: C.ink, vest: C.cream }), -1.9, 0, 1.45);
}

/* ---------- 看圖：設備符號（照國家標準圖例自己畫） ---------- */
function symbol(kind) {
  const c = document.createElement('canvas'); c.width = 240; c.height = 120; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 240, 120); x.strokeStyle = '#111'; x.fillStyle = '#111'; x.lineWidth = 4; x.lineCap = 'round';
  const line = (a, b, c2, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); };
  if (kind === 'main' || kind === 'sub') { x.strokeRect(50, 35, 140, 50); if (kind === 'main') { x.beginPath(); x.moveTo(50, 85); x.lineTo(190, 35); x.lineTo(190, 85); x.closePath(); x.fill(); } else line(50, 85, 190, 35); }
  else if (kind === 'lamp') { line(60, 30, 60, 90); line(60, 60, 150, 60); x.beginPath(); x.arc(166, 60, 16, 0, 7); x.stroke(); }
  else if (kind === 'outlet') { x.beginPath(); x.roundRect(85, 25, 70, 70, 10); x.stroke(); x.beginPath(); x.arc(120, 60, 22, 0, 7); x.stroke(); line(98, 60, 142, 60); }
  else if (kind === 'fire') { line(30, 60, 95, 60); line(145, 60, 210, 60); x.font = 'bold 40px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('F', 120, 62); }
  else if (kind === 'alarm') { x.beginPath(); x.arc(120, 38, 20, 0, 7); x.stroke(); x.font = 'bold 26px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('S', 120, 40); x.beginPath(); x.moveTo(120, 58); x.lineTo(98, 100); x.lineTo(142, 100); x.closePath(); x.stroke(); }
  return c.toDataURL();
}

// 自己寫的點擊玩法：看符號，點出店裡對應的設備
async function findSymbols(ctx) {
  const { R, run } = ctx; const L = R.layer('draw');
  const rounds = [
    { k: 'main', obj: ctx.mainPanel, name: '電燈總配電盤', q: '01-20', lab: [R.X0 + .1, 1.78, -1.66, HALF] },
    { k: 'lamp', obj: ctx.lamp, name: '壁式白熾燈', q: '01-14', lab: [-2.05, 2.2, R.Z0 + .04, 0] },
    { k: 'fire', obj: ctx.firePipe, name: '消防水管', q: '01-19', lab: [-1.4, 2.6, -.33, 0] },
    { k: 'sub', obj: ctx.subPanel, name: '電燈分電盤', q: '01-8', lab: [.55, 1.6, R.Z0 + .04, 0] },
    { k: 'outlet', obj: ctx.outlet, name: '單地板插座', q: '01-15', lab: [.9, .25, .55, 0] },
    { k: 'alarm', obj: ctx.alarm, name: '警報發信器', q: '01-31', lab: [R.X0 + .1, 1.75, 1.45, HALF] },
  ];
  const all = rounds.map(r => r.obj); let miss = 0;
  ctx.focus({ theta: .55, phi: 1.02 });
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i]; let missed = false;
    showPanel(`${sayHtml('plumber', `設備圖上有這個符號（${i + 1}／${rounds.length}）。它是店裡的哪一個設備？直接點它。`)}<div style="text-align:center;margin:6px 0"><img alt="設備圖例符號" src="${symbol(r.k)}" style="width:160px;height:80px;background:#fff;border-radius:8px;border:1px solid #d9cbb3"></div><div class="task">點房間裡的設備（配電盤、燈、插座、水管…）。拖曳空白處可以轉角度。</div><div id="res"></div>`);
    ctx.tapTargets = bad => [bad && !missed ? all.find(o => o !== r.obj) : r.obj];
    await new Promise(resolve => {
      input.onTap = (x, y) => {
        const hits = raycast(x, y, all, true); if (!hits.length) return;
        // 細的水管可能擋在前面：只要射線碰到正確的設備就算
        const owner = h => { let o = h.object; while (o && !all.includes(o)) o = o.parent; return o; };
        const o = hits.map(owner).find(x => x === r.obj) || owner(hits[0]); if (!o) return;
        if (o === r.obj) { input.onTap = null; resolve(); return; }
        SFX.bad(); gsap.fromTo(o.scale, { x: 1.2, y: 1.2, z: 1.2 }, { x: 1, y: 1, z: 1, duration: .4 });
        if (!missed) { missed = true; miss++; run.fine(3, 0, '看錯符號：' + r.name); }
        panel.querySelector('#res').innerHTML = `<div class="result ng"><b>不是這個</b><span>這個符號是「${r.name}」，再找找看。</span></div>`;
      };
    });
    ctx.tapTargets = () => [];
    SFX.good(); gsap.fromTo(r.obj.scale, { x: 1.25, y: 1.25, z: 1.25 }, { x: 1, y: 1, z: 1, duration: .6, ease: 'elastic.out(1,0.4)' });
    const [lx, ly, lz, lr] = r.lab; tag(L, r.name, lx, ly, lz, lr, '#ffe9a8', .62, .15);
    panel.querySelector('#res').innerHTML = `<div class="result ok"><b>對，這是「${r.name}」</b></div>`;
    await wait(1.1);
  }
  ctx.tapTargets = null;
  showPanel(`${sayHtml('plumber', '設備圖看懂了，哪裡有電、哪裡有消防管線，施工時就不會打到。')}<div class="result ${miss ? 'ng' : 'ok'}"><b>${miss ? `認錯了 ${miss} 個符號` : '六個符號全部認對'}</b></div>${ruleCards(['01-20', '01-8', '01-14', '01-15', '01-19', '01-31'])}`);
  await next();
}

/* ---------- 送審：進度看板 ---------- */
function board(ctx) {
  const { R } = ctx; const L = R.layer('permit');
  if (!ctx.board) { const k = new Kit(); k.box(1.1, .9, .04, C.cream, [0, .9, 0]); k.box(1.18, .05, .06, C.ink2, [0, 1.8, 0]); k.box(1.18, .05, .06, C.ink2, [0, .88, 0]); k.box(.05, 1.8, .05, C.ink2, [-.5, 0, -.05]); k.box(.05, 1.8, .05, C.ink2, [.5, 0, -.05]); ctx.board = place(L, popIn(k.mesh()), .35, 0, .95, -.25); ctx.cards = 0; }
  return (text, bg = '#fffdf7') => { const s = P.sign(text, bg, C.ink, .95, .14); s.position.set(0, 1.68 - ctx.cards * .16, .035); ctx.board.add(s); ctx.cards++; popIn(s); SFX.flip(.8); };
}
function paperStack(ctx, label, x, hex = C.white) {
  const L = ctx.R.layer('permit'); const k = new Kit(); for (let i = 0; i < 4; i++) k.box(.3, .012, .22, i % 2 ? hex : '#f3efe6', [0, i * .012, 0], (i - 1.5) * .05);
  const m = place(L, k.mesh(), x, .75, .75); dropIn(m, 0, .8); const s = P.sign(label, '#fffdf7', C.ink, .34, .1); s.rotation.x = -HALF; s.position.set(0, .06, 0); m.add(s); return m;
}

/* ---------- 防火：輕隔間、天花板、牆面板、隔屏 ---------- */
function fireBuild(ctx) {
  const { R } = ctx; const L = R.layer('fire');
  return {
    studs() { ctx.studs = place(L, P.studs(.9, CH), 1.2, 0, -1.45); popIn(ctx.studs); },
    wool() { const m = place(L, box(.06, CH - .1, .86, '#f7d774', [0, .05, 0]), 1.2, 0, -1.45); popIn(m); SFX.pop(.9); },
    close() { for (const dx of [-.045, .045]) { const m = place(L, P.board(.92, CH, .012, '#efe8da'), 1.2 + dx, 0, -1.45); popIn(m, .2); } },
    shell() {
      ctx.ceil = tileGrid(R.w, R.d, .6, '#f4efe6', .015, .02); ctx.ceil.position.y = CH; L.add(ctx.ceil); revealTiles(ctx.ceil.children, .012);
      ctx.clad = place(L, box(.025, CH, 2.25, '#e9dfcf', [0, -CH / 2, 0]), R.X0 + .014, CH / 2, .72); popIn(ctx.clad, .3);
      ctx.screen = place(L, (() => { const k = new Kit(); k.box(.06, 1.5, 1.0, '#d6b88c', [0, -.75, 0]); k.box(.08, .04, 1.02, C.ink2, [0, .73, 0]); return k.mesh(); })(), -.25, .75, -1.4); popIn(ctx.screen, .5);
      ctx.trim = place(L, box(R.w - .1, .05, .05, C.cream, [0, -.025, 0]), 0, CH - .02, R.Z1 - .04); growX(ctx.trim, .7);
      ctx.fdoor = place(L, (() => { const k = new Kit(); k.box(.9, 2.1, .05, '#b9c3c8'); k.box(.04, .04, .1, C.ink, [.34, 1.0, .03]); return k.mesh(); })(), 1.85, 0, R.Z0 + .03); popIn(ctx.fdoor, .6);
      SFX.pop(1);
    },
    mark() { for (const [o, t, p, ry] of [[ctx.ceil, '天花板：耐燃', [-.6, CH - .1, .3], 0], [ctx.clad, '牆面：耐燃', [R.X0 + .05, 2.0, .72], HALF], [ctx.screen, '隔屏：耐燃', [-.2, 1.62, -1.4], 0]]) tag(L, t, ...p, ry, '#ffd9c9', .62, .15); },
    closer() { const k = new Kit(); k.box(.3, .06, .08, C.ink2); k.box(.22, .03, .03, C.steel, [.12, .02, .07], .5); place(L, popIn(k.mesh()), 1.75, 2.12, R.Z0 + .08); tag(L, '自動關閉', 1.85, 1.55, R.Z0 + .07, 0, '#e3f6e9', .42, .12); },
  };
}

/* ---------- 消防設備 ---------- */
function fireEquip(ctx) {
  const { R } = ctx; const L = R.layer('equip');
  return {
    sprinklers() { [[-1.5, -1.0], [.3, -1.0], [-1.5, .7], [.3, .7], [1.8, .7]].forEach(([x, z], i) => place(L, popIn(P.sprinkler(), i * .1), x, CH, z)); },
    smoke() { [[-.6, -.2], [1.2, -.2]].forEach(([x, z], i) => { const m = place(L, P.smoke(), x, CH - .02, z); popIn(m, .3 + i * .1); }); },
    alarmBtn() { tag(L, '手動報警', R.X0 + .06, 1.1, 1.45, HALF, '#ffd9c9', .4, .12); },
    exit() { ctx.exitSign = place(L, P.exitSign(), R.X0 + .05, 2.25, DOORZ, HALF); popIn(ctx.exitSign); },
    light() { const k = new Kit(); k.box(.34, .1, .08, '#fffdf7'); k.add(SH.circle(.035, -.09, .05), .1, '#ffe39a'); k.add(SH.circle(.035, .09, .05), .1, '#ffe39a'); place(L, popIn(k.mesh()), .1, 2.35, R.Z0 + .05); tag(L, '緊急照明', .1, 2.55, R.Z0 + .03, 0, '#fffdf7', .4, .11); },
    ext() { ctx.ext = place(L, P.extinguisher(), R.X0 + .25, 0, -.25); dropIn(ctx.ext, 0, 1.2); },
    fresh() { if (!ctx.ext) return; gsap.fromTo(ctx.ext.scale, { x: 1.3, y: 1.3, z: 1.3 }, { x: 1, y: 1, z: 1, duration: .6, ease: 'elastic.out(1,0.4)' }); tag(L, '已換新', R.X0 + .25, .75, -.25, HALF, '#e3f6e9', .32, .1); },
  };
}

/* ---------- 軟裝 ---------- */
function soft(ctx) {
  const { R } = ctx; const L = R.layer('soft'); const TOP = 2.3;
  return {
    curtain(cm) {
      if (ctx.curt) { ctx.curt.traverse(o => o.geometry && o.geometry.dispose()); L.remove(ctx.curt); }
      const bottom = SILL - cm / 100; const g = new THREE.Group(); const c = P.curtain(1.5, TOP - bottom, '#c9d8c5'); g.add(c); g.position.set(WX, bottom, R.Z0 + .1); L.add(g); ctx.curt = g;
    },
    curtainTag() { tag(L, '防焰', WX + .55, 1.5, R.Z0 + .2, 0, '#ffc96b', .22, .1); },
    carpet() { const g = tileGrid(2.0, 1.5, .5, ['#b7c3c6', '#a9b7ba'], .01, .02); g.position.set(-1.35, .005, -1.1); L.add(g); revealTiles(g.children, .05); const s = P.sign('防焰', '#ffc96b', C.ink, .22, .1); s.rotation.x = -HALF; place(L, s, -2.1, .04, -.45); popIn(s, .6); ctx.carpet = g; },
    prep() { const k = new Kit(); k.flat(SH.rectC(2.0, 1.5), .006, '#d8d0c2'); const m = place(L, k.mesh(false), -1.35, .003, -1.1); growX(m); SFX.crumple(); dust(new THREE.Vector3(-1.35, .3, -1.1).add(R.inside.getWorldPosition(new THREE.Vector3())), 10, '#efe9de', 1.2); },
    check() { if (ctx.carpet) ctx.carpet.children.forEach((t, i) => gsap.fromTo(t.position, { y: .03 }, { y: .01, duration: .3, delay: i * .02 })); SFX.chime(); },
    paper() { ctx.wp = place(L, (() => { const k = new Kit(); k.box(.012, 2.4, 1.6, '#f6dcae', [0, -1.2, 0]); for (let i = 0; i < 12; i++) k.add(SH.circle(.04), .016, C.coral, [0, (i % 4) * .5 - .8, (Math.floor(i / 4) - 1) * .45], [0, HALF, 0]); return k.mesh(); })(), R.X0 + .035, 1.4, .95); gsap.from(ctx.wp.scale, { y: .001, duration: .8, ease: 'power2.out' }); SFX.flip(.8);
      ctx.bubble = place(L, (() => { const k = new Kit(); k.add(SH.circle(.13), .06, '#fbe6c2', [0, 0, 0], [0, HALF, 0]); return k.mesh(); })(), R.X0 + .05, 1.35, .6); popIn(ctx.bubble, .9); },
    flat() { if (ctx.bubble) popOut(ctx.bubble); SFX.chime(); },
  };
}

export default {
  id: 'j3', title: '巷口咖啡店', short: '咖啡店', sub: '供公眾使用：送審、防火、消防設備、軟裝', color: '#8a5a44', pay: 260000, doneLine: '咖啡店開幕了',
  room: { w: 5.0, d: 3.8, h: 3.0, floor: 'checker', window: true, winX: WX, door: true, wall: '#e3d6c0' },
  setup,
  stations: [
    {
      id: 'draw', name: '看圖', asker: 'plumber', quizTitle: '大頭考你設備圖', camera: { theta: .55, phi: 1.02 },
      topics: ['01/設備圖例：消防', '01/設備圖例：電氣', '01/圖號英文代號'],
      steps: ctx => [
        { type: 'say', who: 'manager', text: '這間老店面我要改成咖啡店：座位區、吧台、窗簾地毯都要。開幕前一定要合法，消防也要過。', act: async c => { const L = c.R.layer('draw'); const k = new Kit(); for (let i = 0; i < 5; i++) k.box(.5, .01, .36, i % 2 ? '#dfeef2' : C.white, [0, i * .01, 0], (i - 2) * .06); place(L, dropIn(k.mesh(), 0, .8), -.9, .75, .75); } },
        { type: 'match', who: 'plumber', text: '整套圖說用英文代號分冊。先把代號和圖面配起來，等一下才找得到設備圖。', pairs: [['A', '建築圖'], ['G', '瓦斯設備圖'], ['P', '給水、排水及衛生設備圖'], ['W', '污水處理設施圖']], rules: ['01-9', '01-28', '01-29', '01-73'] },
        { type: 'do', fn: findSymbols },
      ],
    },
    {
      id: 'permit', name: '送審', asker: 'reviewer', quizTitle: '審查人員的追問', camera: { theta: .35, phi: 1.05 },
      topics: ['03/建築法', '03/建築物室內裝修管理辦法', '03/其他相關法規'],
      steps: ctx => { const add = () => board(ctx); return [
        { type: 'say', who: 'reviewer', text: '咖啡店是供公眾使用的建築物，室內裝修要先送審。我是室內裝修審查人員，圖說和文件都要給我看。', act: async c => { c.rev = place(c.R.inside, CAST.reviewer(), .9, 0, 1.4); popIn(c.rev); popOut(c.junk[0]); popOut(c.junk[1]); SFX.whistle(); } },
        { type: 'checklist', who: 'reviewer', text: '這次的工程，哪些項目算「室內裝修」、要先申請審查許可？全部選起來。', options: [['固著在構造體的天花板', 1], ['內部牆面', 1], ['高度超過 1.2 公尺的固定隔屏', 1], ['拆除室內分間牆', 1], ['鋪地毯', 0], ['牆面油漆', 0], ['活動隔屏', 0], ['張貼壁布', 0]], rules: ['03-55', '03-81', '03-113', '03-118'], fine: [6, 0], okMsg: '範圍判斷正確', ngMsg: '地毯、油漆、活動隔屏、壁布都不算室內裝修', after: async c => { add()('室內裝修範圍：天花板、牆面、隔屏'); } },
        { type: 'choose', who: 'reviewer', text: '店面是店長向房東租的，房子不是申請人的。申請審核圖說時要多附什麼？', cols: 1, options: [{ t: '建築物使用權同意書', ok: true, msg: '對，建築物不是申請人所有，要附建築物使用權同意書', act: async c => { paperStack(c, '使用權同意書', -1.2); } }, { t: '土地權利證明文件', msg: '土地權利證明文件不是審查的必審項目' }, { t: '修繕執照', msg: '沒有「修繕執照」這種建築執照' }], rules: ['03-90', '03-9', '03-2'] },
        { type: 'match', who: 'reviewer', text: '送審圖說的比例尺有下限。把圖和「比例尺不得小於」配起來。', pairs: [['裝修平面圖', '1/100'], ['裝修詳細圖', '1/30'], ['建築師簽證的替代現況圖', '1/200']], rules: ['03-8', '03-94', '03-89'] },
        { type: 'order', who: 'reviewer', text: '排出這個案子從送審到完工的流程，照順序拖進房間，看板上會排好。', seq: true,
          items: [{ id: 'plan', label: '送審圖說', icon: 'doc' }, { id: 'permit', label: '領許可文件', icon: 'stamp' }, { id: 'build', label: '施工', icon: 'helmet' }, { id: 'fire', label: '消防竣工查驗', icon: 'extinguisher' }, { id: 'cert', label: '核發合格證明', icon: 'shield' }, { id: 'fix', label: '修繕執照', icon: 'sign' }],
          order: ['plan', 'permit', 'build', 'fire', 'cert'],
          decoy: { fix: { msg: '建築執照只有建造、雜項、使用、拆除四種，沒有修繕執照', fine: [3, 0], rules: ['03-2'] } },
          why: { permit: '圖說還沒送審，哪來的許可？', build: '圖說審核合格、領到許可文件，才能施工', fire: '還沒施工完，查驗什麼？', cert: '涉及消防設備，要先過消防竣工查驗，才發合格證明' },
          act: { plan: async c => { add()('① 送審圖說'); paperStack(c, '裝修圖說', -.6, '#dfeef2'); }, permit: async c => { add()('② 領許可文件（消防審核合格）', '#e3f6e9'); const s = P.sign('許可', C.red, '#fffdf7', .16, .16); s.rotation.x = -HALF; place(c.R.layer('permit'), popIn(s), -.6, .83, .75); SFX.thud(.5); }, build: async () => add()('③ 施工'), fire: async () => add()('④ 消防竣工查驗'), cert: async () => add()('⑤ 核發合格證明', '#ffe9a8') },
          say: { plan: '圖說送去審查', permit: '涉及消防設備，施工前也要拿到消防主管機關審核合格的文件', build: '領到許可文件後才開工', fire: '消防主管機關在核發合格證明前完成消防竣工查驗', cert: '竣工查驗合格，核發合格證明' }, done: '流程排好了', rules: ['03-84', '03-41', '03-47', '03-85'] },
      ]; },
    },
    {
      id: 'fire', name: '防火', asker: 'carpenter', quizTitle: '阿樹的防火考題', camera: { theta: .5, phi: 1.0 },
      topics: ['03/建築技術規則', '04/防火材料與防火構造', '06/工地安全與防火法規'],
      steps: ctx => { const f = fireBuild(ctx); return [
        { type: 'say', who: 'carpenter', text: '吧台後面要隔出後場。輕隔間的骨架我先立起來了。', act: async c => { if (c.rev) popOut(c.rev); f.studs(); } },
        { type: 'choose', who: 'carpenter', text: '骨架中間要塞岩綿再封板。輕隔間牆填岩綿，主要是為了什麼？', options: [{ t: '防火', ok: true, msg: '對，岩綿填充主要是防火', act: async () => { f.wool(); await wait(.6); f.close(); } }, { t: '加強結構', msg: '岩綿不是結構材' }, { t: '增加柔軟度', msg: '不是為了柔軟度' }, { t: '增加價值感', msg: '不是為了價值感' }], rules: ['06-109'] },
        { type: 'do', fn: async () => { f.shell(); await wait(1.4); } },
        { type: 'tap', who: 'carpenter', text: '咖啡店是供公眾使用的商業建築，裝修材料有限制。點出「材料受限制、要用耐燃材料」的部位。', task: '天花板、牆面板、隔屏、天花板前緣的壓條，哪些受限？點它們。',
          targets: c => [{ obj: c.ceil, ok: true, msg: '天花板：受限制', label: '天花板' }, { obj: c.clad, ok: true, msg: '內部牆面：受限制', label: '內部牆面' }, { obj: c.screen, ok: true, msg: '高度超過 1.2 公尺固定在地板的隔屏：受限制', label: '固定隔屏' }, { obj: c.trim, ok: false, msg: '天花板周圍的壓條「不受」材料限制' }],
          after: async () => f.mark(), rules: ['03-22'], camera: { theta: .55, phi: 1.2 } },
        { type: 'match', who: 'carpenter', text: '板材要看耐燃等級。把材料和等級配起來。', pairs: [['玻璃、磚、混凝土', '耐燃一級（不燃材料）'], ['耐燃石膏板、木絲水泥板', '耐燃二級（耐火板）'], ['耐燃合板、耐燃纖維板', '耐燃三級（耐燃材料）']], rules: ['03-12', '04-35', '03-96', '03-13'] },
        { type: 'checklist', who: 'boss', text: '後場那扇是常時關閉式防火門，牆上還有電線管穿過防火區劃。要做到哪些？', options: [['防火門要有自行關閉的裝置', 1], ['防火門不得裝設門止', 1], ['穿牆的電力管線和貫穿部位合成的構造，要有 1 小時以上防火時效', 1], ['裝個門止讓門一直開著，方便送餐', 0], ['防火門換成一般木門比較好看', 0]], rules: ['04-37', '04-38', '03-20'], fine: [8, 4000], okMsg: '防火門和貫穿部位都合格', ngMsg: '防火門要能自己關上、不能裝門止', after: async () => f.closer() },
      ]; },
    },
    {
      id: 'equip', name: '消防設備', asker: 'fire', quizTitle: '消防局的抽問', camera: { theta: .45, phi: 1.12 },
      topics: ['03/消防法與各類場所消防安全設備設置標準'],
      steps: ctx => { const f = fireEquip(ctx); return [
        { type: 'say', who: 'fire', text: '我是消防局的。咖啡店天天有客人進出，消防安全設備要照「各類場所消防安全設備設置標準」來。', act: async c => { c.fireman = place(c.R.inside, person({ body: '#cf5a43', pants: C.ink, cap: '#cf5a43', clip: true }), .9, 0, 1.4); popIn(c.fireman); SFX.whistle(); } },
        { type: 'match', who: 'fire', text: '設置標準把消防安全設備分成幾類。把設備和類別配起來，配好就裝上去。', pairs: [['滅火器、自動撒水設備', '滅火設備'], ['手動報警設備', '警報設備'], ['出口標示燈', '避難逃生設備'], ['排煙設備', '消防搶救上之必要設備']], rules: ['03-64', '03-121', '03-122', '03-123', '03-124'] },
        { type: 'do', fn: async () => { f.sprinklers(); await wait(.5); f.smoke(); f.alarmBtn(); await wait(1.0); } },
        { type: 'checklist', who: 'fire', text: '再確認一次：下面哪些屬於「避難逃生設備」？全部選起來。', options: [['出口標示燈', 1], ['緊急照明設備', 1], ['緩降機', 1], ['滑竿', 1], ['排煙設備', 0], ['特別安全梯', 0], ['昇降機', 0]], rules: ['03-67', '03-123', '03-109', '03-126'], fine: [5, 0], okMsg: '分類正確，出口標示燈和緊急照明裝上了', ngMsg: '排煙設備是搶救設備，特別安全梯是建築構造，昇降機不是避難設備', after: async () => { f.exit(); f.light(); } },
        { type: 'choose', who: 'manager', text: '店長想把滅火器收到二樓倉庫，從店裡最遠的座位要走 25 公尺才拿得到。可以嗎？', cols: 1, options: [{ t: '不行，步行距離 20 公尺以內就要配置一具', ok: true, msg: '對，滅火器放在門邊，店裡每個位置都走得到', act: async () => f.ext() }, { t: '可以，有買就好', msg: '滅火器要在步行距離 20 公尺以內', fine: [6, 3000] }, { t: '可以，因為有裝撒水頭', msg: '有撒水頭也一樣，滅火器要在步行距離 20 公尺以內' }], rules: ['03-114'] },
        { type: 'choose', who: 'manager', text: '店長又說：「滅火器過期就算了，等消防局來查再換。」你怎麼回？', cols: 1, options: [{ t: '現在就換新。限期改善還不改，管理權人要罰 6 千到 3 萬元', ok: true, msg: '對，管理權人要設置並維護消防安全設備', act: async () => f.fresh() }, { t: '好，等通知再說', msg: '逾期不改善會罰管理權人 6 千～3 萬元；萬一火災致人於死，處 1～7 年有期徒刑', fine: [6, 3000] }, { t: '跟我們裝修的沒關係', msg: '設備沒維護，管理權人會被處罰；你應該提醒店長' }], rules: ['03-35', '03-34'] },
      ]; },
    },
    {
      id: 'soft', name: '軟裝', asker: 'designer', quizTitle: '設計師小圖的軟裝考題', camera: { theta: .35, phi: 1.1 },
      topics: ['06/窗簾與百葉', '06/地毯', '06/壁紙、壁布、地磚'],
      steps: ctx => { const f = soft(ctx); return [
        { type: 'checklist', who: 'designer', text: '要進場的布料有這些。依規定，哪些要用附「防焰標示」（防焰證明標籤）的產品？', options: [['窗簾', 1], ['地毯', 1], ['吊掛布幕', 1], ['桌布', 0]], rules: ['06-93', '03-63', '03-125'], fine: [6, 3000], okMsg: '窗簾、地毯、布幕都要防焰', ngMsg: '桌布不用防焰標示', note: '要看的是「防焰」標示，不是耐燃等級。', after: async c => { if (c.fireman) popOut(c.fireman); } },
        { type: 'slider', who: 'designer', text: '窗戶有窗台。窗簾要做多長？拉滑桿看窗簾的下緣。', min: 0, max: 40, step: 1, value: 0, unit: '公分', label: '窗簾超過窗台', fmt: v => '窗台下 ' + v, good: 12,
          preview: (c, v) => f.curtain(v),
          check: v => (v < 10 || v > 15) ? { ok: false, msg: `窗下 ${v} 公分不對，有窗台的窗戶，窗簾長度以窗下 10～15 公分為準` } : { ok: true, msg: `窗下 ${v} 公分，剛好`, act: async () => f.curtainTag() },
          rules: ['06-216'], mistake: '窗簾長度不對' },
        { type: 'order', who: 'designer', text: '座位區要鋪地毯。照順序拖進房間。', seq: true,
          items: [{ id: 'prep', label: '整平地面', icon: 'trowel' }, { id: 'lay', label: '鋪地毯', icon: 'carpet' }, { id: 'check', label: '全面檢查', icon: 'level' }, { id: 'cut', label: '四邊少鋪 3～6 公分', icon: 'cut' }],
          order: ['prep', 'lay', 'check'], decoy: { cut: { msg: '邊上少鋪 3～6 公分是錯的做法', fine: [3, 0], rules: ['06-214'] } },
          why: { lay: '地面的裂縫、凹凸要先處理平整，水電管線也要先檢驗完成', check: '還沒鋪，要檢查什麼？' },
          act: { prep: async () => f.prep(), lay: async () => f.carpet(), check: async () => f.check() },
          say: { prep: '裂縫、凹凸處理平整，地板下的水電管線也檢驗完了', lay: '防焰地毯鋪好了', check: '鋪完立刻全面檢查' }, done: '地毯完成', rules: ['06-211', '06-214'] },
        { type: 'do', fn: async () => { f.paper(); await wait(1.4); } },
        { type: 'choose', who: 'designer', text: '左牆的壁紙貼好了，可是有一塊鼓起來（氣泡）。怎麼處理？', cols: 1, options: [{ t: '用針刺孔或割刀割開，注入黏劑壓平', ok: true, msg: '對，氣泡壓平了', act: async () => f.flat() }, { t: '注射稀釋劑', msg: '稀釋劑不能讓壁紙黏回去' }, { t: '用鐵鎚敲平', msg: '鐵鎚會把壁紙敲壞' }, { t: '用熨斗燙平', msg: '不是用熨斗燙' }], rules: ['06-95'] },
      ]; },
    },
  ],
  events: [
    { after: 'permit', who: 'clerk', title: '承辦人員的提醒', line: '送件歸送件。跟公務員往來、廠商之間的規矩，我考你幾題。', topics: ['90007/公務往來、反貪腐與檢舉', '90007/職場犯罪、利益衝突與誠信經營'], n: 2 },
    { after: 'fire', who: 'manager', title: '店長想設吸菸區', line: '門口想放個菸灰缸給客人抽菸，這樣可以嗎？先回答我幾個問題。', topics: ['90007/菸害防制'], n: 2 },
    { after: 'equip', who: 'energy', title: '節能顧問來了', line: '咖啡機、冰箱、燈全天開，電費很可觀。我考你幾題節能的觀念。', topics: ['90009/照明', '90009/標章與能源效率分級', '90009/電價與用電時段'], n: 2,
      before: async c => { if (c.fireman) popOut(c.fireman); c.energy = place(c.R.inside, CAST.energy(), .9, 0, 1.4); popIn(c.energy); } },
    { after: 'soft', who: 'eco', title: '環保局訪查', line: '新裝潢、燒烤、外帶杯，都跟環境有關。我抽問幾題。', topics: ['90008/空氣污染', '90008/綠色生活與綠色消費', '90008/環境基本法、環境教育、環保標章', '90008/環境影響評估'], n: 2,
      before: async c => { if (c.energy) popOut(c.energy); c.eco = place(c.R.inside, CAST.eco(), .9, 0, 1.4); popIn(c.eco); } },
  ],
  async finale(ctx) {
    const { R } = ctx; if (ctx.eco) popOut(ctx.eco); popOut(ctx.desk);
    for (const n of ['draw', 'permit']) R.layer(n).children.forEach(m => popOut(m));
    TAGS.forEach(m => popOut(m));
    const L = R.layer('furn');
    const items = [
      [P.counter(1.6, C.teal), 1.0, 0, -.45, 0], [P.espresso(), .6, .94, -.5, 0],
      [P.table(.6, .6, .75, C.wood), -1.3, 0, -1.15, 0], [P.chair(C.coral), -1.75, 0, -1.15, HALF], [P.chair(C.coral), -.85, 0, -1.15, -HALF],
      [P.table(.6, .6, .75, C.wood), -.9, 0, .85, 0], [P.chair('#e0a458'), -.9, 0, .4, 0], [P.chair('#e0a458'), -.9, 0, 1.3, Math.PI],
      [P.plant(), -2.2, 0, .2, 0], [P.sign('巷口咖啡', C.teal, '#fffdf7', .9, .26), 1.0, 1.25, -.13, 0],
    ];
    items.forEach(([m, x, y, z, ry], i) => { place(L, m, x, y, z, ry); popIn(m, .1 + i * .12); });
    gsap.to(R.slabMat, { opacity: .12, duration: 1 });
    await wait(1.8);
  },
};
