// 自動測試：用 Playwright 把每個案子從頭玩到結算。
// 用法：先在專案根目錄開 http 伺服器（例如 python3 -m http.server 8765），再執行
//   node tools/autoplay.mjs [網址] [案子編號 0 起算，可多個以逗號分隔] [mode: good|bad] [裝置: phone|desktop]
import { createRequire } from 'module';
const require = createRequire(process.env.NR ? process.env.NR + '/' : import.meta.url);
const { chromium } = require('playwright');

const url = process.argv[2] || 'http://localhost:8765/';
const jobs = (process.argv[3] || '0').split(',').map(Number);
const mode = process.argv[4] || 'good';
const dev = process.argv[5] || 'phone';
const shotDir = process.env.SHOTS || '.';

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(dev === 'phone' ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await p.goto(url + (url.includes('?') ? '&' : '?') + 'q=low&all=1' + (process.env.ST ? '&st=' + process.env.ST : '')); await p.waitForTimeout(2500);
let n = 0; const shot = async name => { await p.waitForTimeout(300); try { await p.screenshot({ path: `${shotDir}/${dev}-${mode}-${String(n++).padStart(3, '0')}-${name}.png`, timeout: 180000 }); } catch (e) { /* 機器太忙時跳過這張 */ } };
await shot('cover');
await p.click('#startBtn');
await p.waitForSelector('.job', { timeout: 60000 }); await p.waitForTimeout(800); await shot('toc');

const clickEl = async el => { const bb = await el.boundingBox(); if (!bb) { await el.click({ force: true }); return; } await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(40); await p.mouse.up(); };
const bad = mode === 'bad';
let lastStep = null; let stepShots = 0;

let same = 0, prevSt = '';
async function tick() {
  // 回傳 'done' 代表這一案結束（目錄出現）
  const st = await p.evaluate(() => {
    const s = window.__kgStep; const q = window.__kgQ; const pan = document.querySelector('#panel');
    return {
      toc: !!document.querySelector('#sheet:not(.hidden) .job'), back: !!document.querySelector('#back'), back2: !!document.querySelector('#back2'),
      type: s ? s.type : null, text: s ? (s.text || '') : '', qnext: !!pan.querySelector('#qnext'), nx: !!pan.querySelector('#nx'), opts: pan.querySelectorAll('.opt:not([disabled])').length,
      qid: q ? q.id : null, ans: q ? q.ans : null, multi: q ? q.multi : false, done: !!pan.querySelector('#done'), qok: !!pan.querySelector('#qok'), go: !!pan.querySelector('#go:not([disabled])'),
    };
  });
  const js = JSON.stringify(st); if (js === prevSt) { if (++same === 60 && process.env.DEBUG) { console.log('STUCK', js); await shot('stuck'); } } else { same = 0; prevSt = js; }
  if (st.back) { await shot('result'); await p.click('#back'); return 'back'; }
  if (st.toc) return 'toc';
  if (st.qnext) { await p.click('#qnext'); return; }
  if (st.done) { await p.click(bad ? '#ot' : '#done'); return; }
  if (st.opts && st.qid) {
    const pick = bad && Math.random() < .4 ? [((st.ans[0]) % 4) + 1] : st.ans;
    for (const a of pick) await p.click(`#panel .opt[data-i="${a}"]`);
    if (st.qok) await p.click('#qok');
    return;
  }
  if (st.nx) { if (stepShots < 400 && st.text !== lastStep) { lastStep = st.text; await shot(st.type || 'next'); stepShots++; } await p.click('#nx'); return; }
  const t = st.type;
  if (t === 'checklist' && !(await p.$('#panel .tool.right'))) {
    const correct = await p.evaluate(() => window.__kgStep.options.filter(o => o[1]).map(o => o[0]));
    const tools = await p.$$('#panel #tl .tool');
    for (const el of tools) { const tx = await el.innerText(); if (correct.includes(tx) !== (bad && tools.indexOf(el) === 0)) await el.click(); }
    if (await p.$('#go:not([disabled])')) await p.click('#go'); return;
  }
  if (t === 'choose') {
    const opts = await p.evaluate(() => window.__kgStep.options.map(o => [o.t, !!o.ok]));
    const want = bad ? (opts.find(o => !o[1]) || opts[0]) : opts.find(o => o[1]);
    const els = await p.$$('#panel #tl .tool:not([disabled])');
    for (const el of els) { if ((await el.innerText()).trim() === want[0]) { await el.click(); return; } }
    if (els[0]) await els[0].click(); return;
  }
  if (t === 'order') {
    const order = await p.evaluate(() => window.__kgStep.order); const decoy = await p.evaluate(() => Object.keys(window.__kgStep.decoy || {}));
    if (bad && decoy.length && !(await p.$('#panel .result.ng'))) { const el = await p.$(`#panel .item[data-id="${decoy[0]}"]`); if (el) { await clickEl(el); await p.waitForTimeout(2600); await shot('decoy'); } }
    for (const id of order) { const el = await p.$(`#panel .item[data-id="${id}"]:not(.used)`); if (el) { await clickEl(el); await p.waitForTimeout(900); return; } }
    return;
  }
  if (t === 'slider') { await p.evaluate(b => { const el = document.querySelector('#sl'); el.value = b ? el.max : (window.__kgStep.good ?? 120); el.dispatchEvent(new Event('input')); }, bad && !(await p.$('#panel .result.ng'))); await p.click('#sok'); await p.waitForTimeout(1500); if (bad) await shot('slider-bad'); return; }
  if (t === 'calc') { const a = await p.evaluate(() => window.__kgStep.answer); await p.fill('#ci', String(bad && !(await p.$('#panel .result.ng')) ? a + 7 : a)); await p.click('#cok'); return; }
  if (t === 'match') {
    const pairs = await p.evaluate(() => window.__kgStep.pairs);
    for (const [l, r] of pairs) { const L = await p.$(`#ml .mt:not([disabled]):text-is("${l}")`); const R = await p.$(`#mr .mt:not([disabled]):text-is("${r}")`); if (L && R) { await L.click(); await R.click(); } }
    return;
  }
  if (t === 'tap' || t === 'do') {
    // 找出目前可以點的目標，直接呼叫點擊處理（避免被底部工作紙擋住）
    const did = await p.evaluate(async b => {
      const s = window.__kgStep, c = window.__kgCtx; const I = window.__kg.input; if (!I.onTap) return false;
      const scr = o => { const t = window.__kg.toScreen(o); return t; };
      if (s.type === 'tap') { const list = s.__list || (s.__list = s.targets(c)); const t = (b && !s.__bad ? (s.__bad = list.find(z => !z.ok)) : null) || list.find(z => z.ok && !z.tried); if (!t) return false; t.tried = true; const q = scr(t.obj); I.onTap(q.x, q.y); return true; }
      if (c.tapTargets) { const list = c.tapTargets(b); if (!list.length) return false; const q = scr(list[0]); I.onTap(q.x, q.y); return true; }
      return false;
    }, bad);
    await p.waitForTimeout(did ? 700 : 300); return;
  }
  await p.waitForTimeout(300);
}

for (const ji of jobs) {
  await p.evaluate(i => document.querySelectorAll('.job')[i].click(), ji);
  const t0 = Date.now();
  while (Date.now() - t0 < 3600000) { let r; try { r = await tick(); } catch (e) { if (process.env.DEBUG) console.log('retry', String(e).slice(0, 80)); await p.waitForTimeout(500); continue; } if (r === 'back') break; await p.waitForTimeout(120); }
  await p.waitForSelector('.job', { timeout: 60000 }); await p.waitForTimeout(600); await shot('toc-after');
}
const info = await p.evaluate(() => ({ seen: Object.keys(window.__kg.S().qs).length, rules: Object.keys(window.__kg.S().rules).length, jobs: window.__kg.S().jobs, missing: window.__kg.missing.length, overflow: document.documentElement.scrollWidth > innerWidth }));
console.log(JSON.stringify({ dev, mode, jobs, info, errors: errs.slice(0, 20), nErr: errs.length }));
await b.close();
