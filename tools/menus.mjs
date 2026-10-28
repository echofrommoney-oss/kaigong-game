// 自動測試：目錄裡的題庫圖鑑、特訓、工法手冊、考前衝刺、設定與進度碼。
// 用法：node tools/menus.mjs [網址] [phone|desktop]
import { createRequire } from 'module';
const require = createRequire(process.env.NR ? process.env.NR + '/' : import.meta.url);
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8765/'; const dev = process.argv[3] || 'phone'; const shotDir = process.env.SHOTS || '.';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext(dev === 'phone' ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.setDefaultTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
let n = 0; const shot = async name => { try { await p.screenshot({ path: `${shotDir}/menu-${dev}-${String(n++).padStart(2, '0')}-${name}.png`, timeout: 180000 }); } catch (e) { /* 忙就跳過 */ } };
await p.goto(url + '?q=low'); await p.waitForTimeout(2000); await p.click('#startBtn'); await p.waitForSelector('.job'); await p.waitForTimeout(800);
const answer = async () => { const q = await p.evaluate(() => window.__kgQ && { a: window.__kgQ.ans, m: window.__kgQ.multi }); for (const a of q.a) await p.click(`#panel .opt[data-i="${a}"]`); if (q.m) await p.click('#qok'); await p.click('#qnext'); };
// 圖鑑 → 展開 → 特訓
await p.click('#mCodex'); await p.waitForSelector('.grp'); await p.click('.grp summary'); await shot('codex');
await p.click('.grp .tp .btn'); for (let i = 0; i < 5; i++) { await p.waitForSelector('#panel .opt'); await answer(); }
await p.waitForSelector('#done'); await shot('drill-done'); await p.click('#done'); await p.waitForSelector('.job');
// 工法手冊
await p.click('#mManual'); await p.waitForSelector('.grp'); await p.click('.grp summary'); await shot('manual'); await p.click('#x'); await p.waitForSelector('.job');
// 考前衝刺 20 題
await p.click('#mSprint'); for (let i = 0; i < 20; i++) { await p.waitForSelector('#panel .opt'); await answer(); }
await p.waitForSelector('#back'); await shot('sprint'); await p.click('#back'); await p.waitForSelector('.job');
// 設定：匯出、清除、匯入
await p.click('#mSet'); await p.waitForSelector('#code'); const code = await p.$eval('#code', e => e.value); await shot('settings');
const before = await p.evaluate(() => Object.keys(window.__kg.S().qs).length);
await p.fill('#codeIn', code); await p.click('#load'); await p.waitForSelector('.job');
const after = await p.evaluate(() => Object.keys(window.__kg.S().qs).length);
console.log(JSON.stringify({ dev, codeLen: code.length, before, after, nErr: errs.length, errors: errs.slice(0, 10), overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) }));
await b.close();
