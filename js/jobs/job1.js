// 第一案：老公寓客廳。報價丈量 → 看圖 → 放樣 → 拆牆 → 輕鋼架天花板 → 油漆 → 竣工。
import { THREE, gsap, rand, camT, shake, wait, EASE_POP } from '../engine/core.js';
import { Kit, SH, mk, mats } from '../engine/paper.js';
import { C, P, CAST, place, popIn, dropIn, growX, popOut, tileGrid, revealTiles } from '../engine/props.js';
import { dust, confetti } from '../engine/fx.js';
import { SFX } from '../engine/audio.js';
import { input } from '../engine/input.js';
import { raycast } from '../engine/core.js';
import { showPanel, sayHtml, appendPanel, ruleCards, next, panel, toast } from '../game/ui.js';

const CH = 2.55; // 天花板完成面高度
const HZ = [-.95, .55]; // 兩排主架的位置（z）

function setup(ctx) {
  const { R } = ctx; const L = R.layer('base');
  // 結構：角落的柱、靠後牆的梁
  ctx.column = place(L, (() => { const k = new Kit(); k.box(.4, R.h, .4, '#cbbfa8'); return k.mesh(); })(), R.X0 + .2, 0, R.Z0 + .2);
  ctx.beam = place(L, (() => { const k = new Kit(); k.box(R.w, .4, .35, '#cbbfa8'); return k.mesh(); })(), 0, R.h - .4, R.Z0 + .175);
  // 要拆的舊磚牆
  const BW = R.layer('brick'); ctx.bricks = P.brickRows(R.d * .75, R.h - .4, 8); ctx.bricks.forEach(m => place(BW, m, .35, 0, R.Z0 + .4 + R.d * .75 / 2));
  ctx.debris = new THREE.Group(); ctx.debris.position.set(1.4, 0, -1.0); R.inside.add(ctx.debris);
  // 舊沙發先放在右前方（完工時換新）
  ctx.oldSofa = place(L, P.sofa('#a9a294'), 1.3, 0, 1.1, -Math.PI / 2); ctx.oldSofa.scale.setScalar(.8);
  ctx.boss = place(R.inside, CAST.boss(), 1.6, 0, .4); ctx.owner = place(R.inside, CAST.owner(), -1.4, 0, 1.2);
}

/* ---------- 放樣的墨線 ---------- */
function inkLine(ctx) {
  const L = ctx.R.layer('ink'); const a = [-1.6, -.4], b = [1.4, -.4];
  return {
    dots() { for (const [x, z] of [a, b]) { const k = new Kit(); k.flat(SH.circle(.05), .01, C.red); place(L, popIn(k.mesh(false)), x, .005, z); } },
    string() { const k = new Kit(); k.flat(SH.rectC(b[0] - a[0], .008), .01, '#f3efe6'); const m = place(L, k.mesh(false), (a[0] + b[0]) / 2, .02, a[1]); growX(m); ctx.string = m; },
    snap() { const k = new Kit(); k.flat(SH.rectC(b[0] - a[0], .02), .005, C.ink); const m = place(L, k.mesh(false), (a[0] + b[0]) / 2, .008, a[1]); growX(m); if (ctx.string) popOut(ctx.string); SFX.thud(.4); dust(m.getWorldPosition(new THREE.Vector3()), 8, '#4b3f37', 1.4); },
    mark() { const s = P.sign('收納櫃', '#fffdf7', C.ink, .5, .2); s.rotation.x = -Math.PI / 2; place(L, popIn(s), 0, .03, -.15); },
  };
}

/* ---------- 拆牆：自己寫的點擊玩法（從下面敲會整片垮） ---------- */
async function knock(ctx) {
  const { R, run } = ctx; let collapsed = false;
  showPanel(`${sayHtml('boss', '直接點那道紅磚牆，一層一層敲掉。從哪一層開始，你決定。')}<div class="task">點房間中間的磚牆。拖曳空白處可以轉角度。</div><div id="res"></div>`);
  Object.assign(camT, { theta: .95, phi: 1.12 });
  ctx.tapTargets = bad => { const live = ctx.bricks.filter(m => m.visible && !m.userData.falling); if (!live.length) return []; live.sort((a, b) => a.userData.row - b.userData.row); return [bad ? live[0] : live[live.length - 1]]; };
  await new Promise(resolve => {
    input.onTap = (x, y) => {
      const live = ctx.bricks.filter(m => m.visible && !m.userData.falling); const hits = raycast(x, y, live, false); if (!hits.length) return;
      const r = hits[0].object.userData.row; const top = Math.max(...live.map(m => m.userData.row));
      gsap.fromTo(ctx.boss.position, { y: 0 }, { y: .28, duration: .18, yoyo: true, repeat: 1 });
      if (r !== top && !collapsed) {
        collapsed = true; run.fine(15, 8000, '磚牆從下面敲，上面整片垮下來');
        live.filter(m => m.userData.row >= r).sort((a, b) => a.userData.row - b.userData.row).forEach((m, k) => fall(ctx, m, k * .07, true));
        shake(1.2); SFX.thud(1.4); setTimeout(() => SFX.crumple(), 200);
        panel.querySelector('#res').innerHTML = `<div class="result ng"><b>上面的磚整片垮下來了！</b><span>師傅差點被砸到，勞檢開罰 NT$8,000。磚牆要從最上面一層開始敲。</span></div>`;
      } else { fall(ctx, hits[0].object, 0, false); SFX.thud(.8); }
      if (ctx.bricks.every(m => !m.visible || m.userData.falling)) { input.onTap = null; setTimeout(resolve, 1100); }
    };
  });
  ctx.tapTargets = null;
  appendPanel(`${collapsed ? '' : '<div class="result ok"><b>由上往下，乾淨拆完</b></div>'}${ruleCards(['07-3'])}`);
  if (!collapsed) { SFX.chime(); confetti(ctx.bricks[4].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), 14); }
  await next();
}
function fall(ctx, m, delay, hard) {
  m.userData.falling = true; const wp = m.getWorldPosition(new THREE.Vector3()); const r = m.userData.row;
  gsap.to(m.position, { x: m.position.x + (hard ? 1.1 : .6) + rand(0, .4), y: -r * .32 + .05, duration: .7, delay, ease: 'power2.in' });
  gsap.to(m.rotation, { z: -rand(1.2, 1.6), y: rand(-.3, .3), duration: .7, delay, ease: 'power2.in', onStart: () => dust(wp.add(new THREE.Vector3(0, r * .32 + .2, 0)), hard ? 14 : 8), onComplete: () => { m.visible = false; addDebris(ctx, hard ? 5 : 3); } });
}
function addDebris(ctx, n) { const m = P.debris(n); m.position.y = ctx.debris.children.length * .04; ctx.debris.add(m); m.scale.set(1, .001, 1); gsap.to(m.scale, { y: 1, duration: .5, ease: 'back.out(2)' }); }

/* ---------- 天花板 ---------- */
function ceiling(ctx) {
  const { R } = ctx; const L = R.layer('ceiling'); const y = R.h;
  const f = {
    pipe() { const k = new Kit(); k.pipe(.05, [R.X0 + .2, y - .25, -1.35], [R.X1 - .2, y - .25, -1.35], C.orange); k.pipe(.05, [R.X0 + .3, y - .32, .1], [.6, y - .32, .1], C.orange); k.add(SH.circle(.09), .06, C.cream, [.65, y - .36, .1], [Math.PI / 2, 0, 0]); popIn(place(L, k.mesh())); },
    edge() { const k = new Kit(); k.box(R.w, .06, .06, C.cream, [0, CH - .03, R.Z0 + .38]); k.box(.06, .06, R.d, C.cream, [R.X0 + .03, CH - .03, 0]); const m = place(L, k.mesh()); gsap.from(m.position, { y: .6, duration: .7, ease: EASE_POP }); SFX.pop(1.2); },
    marks() { const k = new Kit(); for (const z of HZ) k.flat(SH.rectC(R.w, .025), .005, C.teal, [0, y - .002, z]); for (let x = R.X0 + .6; x < R.X1; x += .6) k.flat(SH.rectC(.025, R.d), .005, '#7fa9ac', [x, y - .003, 0]); const m = place(L, k.mesh(false)); growX(m); SFX.flip(.5); },
    hangers(sp) { if (ctx.hang) { ctx.hang.traverse(o => o.geometry && o.geometry.dispose()); L.remove(ctx.hang); } const g = new THREE.Group(); const n = Math.max(0, Math.ceil(R.w / sp) - 1), gap = R.w / (n + 1); for (let i = 1; i <= n; i++) for (const z of HZ) { const k = new Kit(); k.box(.025, y - CH + .02, .025, C.ink2, [R.X0 + i * gap, CH - .02, z]); k.box(.07, .05, .05, C.yellow, [R.X0 + i * gap, CH + .02, z]); g.add(k.mesh()); } L.add(g); ctx.hang = g; return gap; },
    sag() { const k = new Kit(); k.box(R.w - .1, .05, .04, C.cream, [0, CH - .02, HZ[0]]); const m = place(L, k.mesh()); const o = { s: 0 }; SFX.creak(); gsap.to(o, { s: 1, duration: .9, ease: 'bounce.out', onUpdate: () => { m.position.y = -.2 * o.s; m.rotation.z = Math.sin(o.s * 3) * .02; } }); setTimeout(() => gsap.to(m.scale, { x: .001, y: .001, duration: .4, ease: 'back.in(2)', onComplete: () => L.remove(m) }), 1700); },
    grid() { const k = new Kit(); for (const z of HZ) k.box(R.w - .1, .05, .04, C.cream, [0, CH - .02, z]); for (let x = R.X0 + .6; x < R.X1; x += .6) k.box(.03, .03, R.d - .1, '#f0e8da', [x, CH - .02, 0]); const m = place(L, k.mesh()); m.rotation.z = -.025; m.position.y = .05; m.scale.y = .001; gsap.to(m.scale, { y: 1, duration: .8, ease: EASE_POP, onStart: () => SFX.pop(1) }); ctx.grid = m; },
    level() { gsap.to(ctx.grid.rotation, { z: 0, duration: 1, ease: EASE_POP }); gsap.to(ctx.grid.position, { y: 0, duration: 1, ease: EASE_POP }); SFX.chime(); },
    boards(hex) { const g = tileGrid(R.w, R.d, .6, hex, .02, .025); g.position.y = CH - .045; L.add(g); return g; },
  };
  return f;
}

/* ---------- 油漆 ---------- */
function paintWall(ctx, hex) { ctx.R.back.traverse(m => { if (m.isMesh && m.material && Array.isArray(m.material)) { const nm = mats(hex); m.material = nm; } }); ctx.R.left.traverse(m => { if (m.isMesh && Array.isArray(m.material)) m.material = mats(hex); }); }

export default {
  id: 'j1', title: '老公寓客廳', short: '客廳', sub: '住宅翻修：拆隔間、輕鋼架天花、油漆', color: '#e4846f', pay: 180000, doneLine: '客廳的天花板平了',
  room: { w: 4.5, d: 3.6, h: 3.0, floor: 'wood', window: true },
  setup,
  stations: [
    {
      id: 'quote', name: '報價', asker: 'accountant', quizTitle: '會計小方的估價小考',
      topics: ['07/估價、工料分析與計量單位', '02/測量概念與換算', '02/丈量柱、梁的目的', '02/魯班尺（文公尺）'],
      steps: ctx => [
        { type: 'say', who: 'owner', text: '我家客廳要整個翻新：中間那道舊磚牆打掉、做輕鋼架天花板、重新油漆。先幫我估個價？' },
        { type: 'tap', who: 'boss', text: '估價前先量現況。點房間裡的<b>柱</b>和<b>梁</b>，量它們的尺寸。', targets: c => [
          { obj: c.column, ok: true, msg: '柱子：40 × 40 公分', label: '柱' }, { obj: c.beam, ok: true, msg: '梁：深 40 公分，天花板要在梁下面', label: '梁' },
          { obj: c.bricks[3], ok: false, msg: '這道是要拆的隔間磚牆，不是結構' }, { obj: c.R.back, ok: false, msg: '牆面之後再量，現在先看結構' }], rules: ['02-14'], camera: { theta: .3, phi: .95 } },
        { type: 'calc', who: 'accountant', text: '客廳淨寬 4.5 公尺、深 3.6 公尺。地板面積是幾坪？', hint: '1 平方公尺約 0.3025 坪。答案取到小數點後一位。', answer: 4.9, tol: .02, unit: '坪', explain: '4.5 × 3.6 ＝ 16.2 平方公尺；16.2 × 0.3025 ≒ 4.9 坪', rules: ['07-62'] },
        { type: 'match', who: 'accountant', text: '估價單上的計價單位要寫對。把項目和單位配起來。', pairs: [['室內門片', '樘'], ['大片玻璃', '才'], ['泥作貼磚', '坪'], ['系統櫃', '組']], rules: ['07-23', '07-24', '07-65'] },
      ],
    },
    {
      id: 'draw', name: '看圖', asker: 'designer', quizTitle: '設計師小圖考你看圖',
      topics: ['01/製圖基本規則與線條', '01/常用文字簡寫符號', '01/尺寸標註', '01/比例尺', '01/視圖與圖面用途', '01/建築圖例：材料構造與門窗'],
      steps: ctx => [
        { type: 'match', who: 'designer', text: '施工圖上的簡寫你要看得懂。把簡寫和意思配起來。', pairs: [['GL', '地盤線'], ['CL', '天花板線'], ['FL', '地板面線'], ['DW', '門連窗'], ['2FL', '二樓樓版面']], rules: ['01-23', '01-3', '01-50'] },
        { type: 'calc', who: 'designer', text: '平面詳圖的比例尺是 1/50。圖上量到客廳寬 9 公分，實際是幾公尺？', hint: '圖上長度 × 比例尺分母 ＝ 實際長度', answer: 4.5, tol: .01, unit: '公尺', explain: '9 公分 × 50 ＝ 450 公分 ＝ 4.5 公尺', rules: ['02-17', '01-42'] },
        { type: 'choose', who: 'designer', text: '剖面圖上要標天花板高度。標尺寸用的「尺度線」要畫哪一種線？', options: [{ t: '細實線', ok: true, msg: '對，尺度線用細實線' }, { t: '虛線', msg: '虛線是隱蔽線（被擋住看不到的）或配管' }, { t: '單點線', msg: '單點線是中心線、建築線' }, { t: '粗實線', msg: '粗實線不是用來標尺寸的' }], rules: ['01-16', '01-72', '01-74'] },
      ],
    },
    {
      id: 'layout', name: '放樣', asker: 'worker', quizTitle: '阿勇的工具考題',
      topics: ['02/工具分類', '02/放樣程序與墨線', '02/水平與直角原理', '05/量測與放樣工具'],
      steps: ctx => { const ink = inkLine(ctx); return [
        { type: 'checklist', who: 'worker', text: '要在地上彈出新收納櫃的位置。放樣要帶哪些工具？全部選起來。', options: [['墨斗', 1], ['捲尺', 1], ['雷射墨線儀', 1], ['水平管', 1], ['釘槍', 0], ['尺二磚', 0], ['三角板', 0]], rules: ['02-23', '02-29', '02-15', '02-28'], okMsg: '工具帶齊了', ngMsg: '釘槍、尺二磚、三角板都不是丈量放樣工具', fine: [4, 0] },
        { type: 'order', who: 'worker', text: '用墨斗彈線。照順序把步驟拖進房間。', seq: true, keep: false,
          items: [{ id: 'dot', label: '定點', icon: 'pin' }, { id: 'lead', label: '引線', icon: 'rope' }, { id: 'snap', label: '彈線', icon: 'ink' }, { id: 'note', label: '註記', icon: 'doc' }],
          order: ['dot', 'lead', 'snap', 'note'], why: { lead: '還沒定點，線要拉去哪？', snap: '線還沒拉好就彈，會彈歪', note: '線都還沒彈，要註記什麼？' },
          act: { dot: async () => ink.dots(), lead: async () => ink.string(), snap: async () => ink.snap(), note: async () => ink.mark() }, done: '墨線彈好了', rules: ['02-4', '02-10'] },
        { type: 'choose', who: 'worker', text: '櫃子要貼齊牆角。要確認牆角是不是直角，最簡單的方法是？', options: [{ t: '量出 3、4、5 的三角形', ok: true, msg: '三邊 3：4：5 就是直角（畢氏定理）', act: async c => { const k = new Kit(); k.flat(SH.poly([[0, 0], [.9, 0], [0, 1.2]]), .006, C.yellow); place(c.R.layer('ink'), popIn(k.mesh(false)), c.R.X0 + .45, .004, c.R.Z1 - .1); } }, { t: '放水平尺', msg: '水平尺量的是水平，不是直角' }, { t: '用雷射測距儀', msg: '測距儀量距離，不能檢查直角' }, { t: '吊錘球', msg: '錘球是定垂直的' }], rules: ['02-6', '02-27', '02-25'] },
      ]; },
    },
    {
      id: 'demo', name: '拆牆', asker: 'boss', quizTitle: '老周的安全抽查',
      topics: ['04/防護具與健康檢查', '04/感電預防', '04/手工具安全'],
      steps: ctx => [
        { type: 'checklist', who: 'boss', text: '中間那道舊磚牆要拆掉。開敲之前要先做好哪些事？全部選起來。', options: [['全員戴安全帽', 1], ['設標示，禁止非作業人員進入', 1], ['派專人在現場指揮', 1], ['先關掉這面牆上的電源', 1], ['接一台不斷電系統', 0], ['先把磚牆淋濕再敲', 0]], rules: ['07-58', '04-17'], fine: [10, 5000], okMsg: '準備周全，可以開敲', ngMsg: '準備不完整，被罰 NT$5,000', note: '不斷電系統跟拆除安全無關，淋濕磚牆也不是規定。' },
        { type: 'do', fn: knock },
        { type: 'checklist', who: 'boss', text: '牆邊要用切割機修齊。用切割機切磚、石材，必要的護具是哪些？', options: [['耳罩', 1], ['護目鏡', 1], ['防塵口罩', 1], ['手套', 0]], rules: ['04-1'], fine: [4, 0], okMsg: '護具對了', ngMsg: '手套不是切割機的必要護具（容易被捲進去）' },
        { type: 'choose', who: 'boss', text: '拆下來的磚塊和碎屑堆在角落。要怎麼處理？', cols: 1, options: [{ t: '委託合法的清除機構清運', ok: true, msg: '室內裝修廢棄物要委託合法清除機構', act: async c => { gsap.to(c.debris.scale, { x: .001, y: .001, z: .001, duration: .6, delay: .3, ease: 'back.in(2)' }); SFX.whistle(); } }, { t: '晚上載去空地倒掉', msg: '違法棄置，環保局會開罰', fine: [10, 6000] }, { t: '裝袋混在一般垃圾裡丟', msg: '營建廢棄物不能當一般垃圾' }], rules: ['90008-55'] },
      ],
    },
    {
      id: 'ceiling', name: '天花板', asker: 'steel', quizTitle: '阿鋼的天花板考題', camera: { theta: .55, phi: .98 },
      topics: ['06/輕鋼架天花板與石膏板天花板', '06/木作：天花板'],
      steps: ctx => { const f = ceiling(ctx); return [
        { type: 'say', who: 'steel', text: '天花板高度線你已經彈在牆上了（高程放樣）。接下來要什麼，從抽屜拖進房間給我。' },
        { type: 'order', who: 'steel', text: '先做骨架之前的準備。照順序拖進房間。', seq: true,
          items: [{ id: 'pipe', label: '水電管線', icon: 'pipe' }, { id: 'edge', label: '收邊條', icon: 'edge' }, { id: 'ink', label: '墨斗', icon: 'ink' }, { id: 'grid', label: '主副架', icon: 'grid' }],
          order: ['pipe', 'edge', 'ink'], decoy: { grid: { msg: '主架要掛在吊筋上，現在還沒有吊筋', fine: [3, 0] } },
          why: { edge: '天花板裡的水電管線要先拉好，封起來就來不及了', ink: '要先釘收邊條，天花板的邊才有地方靠' },
          onWrong: async (c, id) => { if (id !== 'pipe') { toast('水電師傅大頭：「等等！天花板裡的管線我還沒拉！」'); } },
          act: { pipe: async () => f.pipe(), edge: async () => f.edge(), ink: async () => f.marks() }, say: { pipe: '水電、空調管線先拉好', edge: '收邊條沿牆釘好了', ink: '配置放樣：主架和吊筋的位置彈在樓板底' }, done: '可以打吊筋了', rules: ['06-233', '06-112'] },
        { type: 'slider', who: 'steel', text: '吊筋要打多密？拉滑桿調間距，房間裡會即時排好吊筋。', min: 40, max: 240, step: 10, value: 180, unit: '公分', label: '吊筋間距',
          preview: (c, v) => f.hangers(v / 100),
          check: v => { if (v > 120) return { ok: false, msg: `間距 ${v} 公分，超過 120 公分，主架一掛上去就往下垂`, act: async () => f.sag() }; const gap = 4.5 / (Math.ceil(4.5 / (v / 100))); return { ok: true, msg: `吊筋打好了：間距 ${Math.round(gap * 100)} 公分${gap * 100 < 60 ? '（打得很密，材料多花了一些）' : ''}` }; },
          rules: ['06-113'], mistake: '吊筋間距太大' },
        { type: 'order', who: 'steel', text: '掛骨架、調水平、封板。照順序拖進房間。', seq: true,
          items: [{ id: 'grid', label: '主副架', icon: 'grid' }, { id: 'level', label: '水平儀', icon: 'level' }, { id: 'board', label: '矽酸鈣板', icon: 'board' }, { id: 'stone', label: '石板', icon: 'stone' }],
          order: ['grid', 'level', 'board'],
          decoy: { stone: { msg: '石板太重，骨架撐不住，整片掉下來！輕鋼架要用輕的板材', fine: [8, 4000], mistake: '天花板用了石板', act: async c => { const g = f.boards('#9a948b'); const ts = g.children.slice(0, 9); g.children.slice(9).forEach(t => t.visible = false); revealTiles(ts, .04); await wait(.7); SFX.creak(); shake(.8); ts.forEach((t, k) => gsap.to(t.position, { y: -CH + .1, duration: .6, delay: .1 + k * .05, ease: 'bounce.out' })); await wait(1.4); c.R.layer('ceiling').remove(g); } } },
          why: { level: '主架還沒掛上去，要調什麼水平？', board: '骨架和水平都弄好才能封板' },
          act: { grid: async () => f.grid(), level: async () => f.level(), board: async () => { const g = f.boards(C.white); await wait(revealTiles(g.children, .022)); } },
          say: { grid: '主架、副架掛上去了，看起來有點歪？', level: '全部吊架裝完之後，再調整水平：平了！', board: '封板完成：矽酸鈣板又輕又平' }, done: '天花板完成', rules: ['06-48', '06-235'] },
      ]; },
    },
    {
      id: 'paint', name: '油漆', asker: 'painter', quizTitle: '阿美的油漆考題', camera: { theta: .25, phi: 1.1 },
      topics: ['06/塗裝油漆：基本觀念與管理', '06/塗裝油漆：塗料種類與成分', '06/塗裝油漆：施工程序', '06/塗裝油漆：缺陷與原因'],
      steps: ctx => [
        { type: 'order', who: 'painter', text: '舊牆面重新刷乳膠漆。照順序拖進房間。', seq: true,
          items: [{ id: 'putty', label: '補土', icon: 'putty' }, { id: 'sand', label: '砂紙', icon: 'sand' }, { id: 'primer', label: '底漆', icon: 'primer' }, { id: 'paint', label: '面漆', icon: 'paint' }],
          order: ['putty', 'sand', 'primer', 'paint'], why: { sand: '還沒補土，坑洞磨不平', primer: '補土還沒磨平就上底漆，會看到補痕', paint: '沒上底漆，面漆咬不住也不均勻' },
          act: {
            putty: async c => { const L = c.R.layer('paint'); for (let i = 0; i < 7; i++) { const k = new Kit(); k.add(SH.blob(.08, 5, i), .01, '#f3efe6', [rand(-1.8, 1.4), rand(.6, 2.2), c.R.Z0 + .005]); place(L, popIn(k.mesh(false), i * .05)); } },
            sand: async c => { SFX.crumple(); dust(new THREE.Vector3(0, 1.8, c.R.Z0 + .2), 14, '#efe9de', 1.6); },
            primer: async c => paintWall(c, '#ece6da'),
            paint: async c => { paintWall(c, '#f2d3c2'); c.R.layer('paint').children.forEach(m => popOut(m)); SFX.chime(); },
          }, done: '牆面刷好了', rules: ['06-84', '06-29'] },
        { type: 'choose', who: 'painter', text: '明天要刷最後一道面漆，但氣象說會下雨，室內濕度 90%。怎麼辦？', cols: 1, options: [{ t: '等濕度降下來再刷', ok: true, msg: '對，濕度太高漆面會白化' }, { t: '照刷，趕進度要緊', msg: '漆面起白霧（白化）了，要重刷', fine: [6, 3000], act: async c => paintWall(c, '#f4efe9') }, { t: '把漆加水調稀一點再刷', msg: '加水不會讓空氣濕度變低，漆面一樣會白化' }], rules: ['06-124', '06-31'] },
        { type: 'match', who: 'painter', text: '漆面出問題，要知道原因。把缺陷和原因配起來。', pairs: [['皺紋', '塗料濃度太高'], ['垂流', '一次噴得太厚'], ['白化（白霧）', '空氣濕度太高'], ['橘皮', '塗料太黏、噴槍距離不當']], rules: ['06-36', '06-123', '06-124', '06-126'] },
      ],
    },
    {
      id: 'done', name: '竣工', asker: 'reviewer', quizTitle: '竣工查驗追問',
      topics: ['07/變更設計、竣工查驗與合格證明'],
      steps: ctx => [
        { type: 'checklist', who: 'reviewer', text: '要申請竣工查驗了。這次送件要附哪些文件？', options: [['申請書', 1], ['室內裝修竣工圖', 1], ['原領的室內裝修審核合格文件', 1], ['竣工照片、室內裝修材料書', 1], ['建築物的建造執照', 0]], rules: ['07-49', '07-52'], fine: [5, 0], okMsg: '文件齊全，受理', ngMsg: '建造執照不用附' },
        { type: 'choose', who: 'owner', text: '屋主臨時想把天花板改用耐燃等級比較低的便宜板材，問你「竣工的時候一起報驗就好吧？」', cols: 1, options: [{ t: '不行，降低耐燃等級要先辦變更設計', ok: true, msg: '對，降低原裝修材料耐燃等級不能竣工後一次報驗' }, { t: '可以，竣工時一起改圖就好', msg: '只有不降低耐燃等級的換料才能竣工後修改竣工圖', fine: [8, 5000] }], rules: ['07-99', '07-55'] },
      ],
    },
  ],
  events: [
    { after: 'demo', who: 'inspector', title: '勞檢員突擊', line: '勞動檢查！拆除工地我抽問幾題，答錯照罰。', topics: ['90006/墜落、物體飛落、捲夾等機械災害', '90006/電氣安全'], n: 2,
      before: async c => { c.insp = place(c.R.inside, CAST.inspector(), -1.6, 0, 1.4); popIn(c.insp); SFX.whistle(); } },
    { after: 'demo', who: 'eco', title: '環保局稽查', line: '有鄰居檢舉噪音和廢棄物。我順便考考你環保的規定。', topics: ['90008/廢棄物與資源回收', '90008/噪音'], n: 2,
      before: async c => { if (c.insp) popOut(c.insp); c.eco = place(c.R.inside, CAST.eco(), -1.2, 0, 1.5); popIn(c.eco); } },
    { after: 'paint', who: 'owner', title: '屋主有話要說', line: '師傅，你們做事的態度我也想了解一下。', topics: ['90007/職業素養與敬業精神', '90007/商務禮儀'], n: 2, before: async c => { if (c.eco) popOut(c.eco); } },
  ],
  async finale(ctx) {
    const { R } = ctx; popOut(ctx.oldSofa); const L = R.layer('furn');
    R.layer('ink').children.forEach(m => popOut(m));
    const items = [[P.sofa(), .6, 0, -1.25, 0], [P.rug(1.0), .6, .005, -.35, 0], [P.table(.9, .5, .38), .6, 0, -.2, 0], [P.plant(), -1.75, 0, -1.25, 0], [P.cabinet(1.2, 1.6, .4), -1.9, 0, .3, Math.PI / 2]];
    items.forEach(([m, x, y, z, ry], i) => { place(L, m, x, y, z, ry); popIn(m, .1 + i * .15); });
    gsap.to(R.slabMat, { opacity: .12, duration: 1 });
    await wait(1.4);
  },
};
