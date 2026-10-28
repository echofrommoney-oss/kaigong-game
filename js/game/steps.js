// 工地動作的通用玩法。每個案子的每一站，都是由這些步驟組成。
// 每種步驟都回傳 Promise，做完才往下。犯錯一律呼叫 run.fine()，學到的工法一律用 ruleCards(題號)。
import { gsap, raycast, view, camT, shuffle, clamp, toScreen } from '../engine/core.js';
import { input, startGhost } from '../engine/input.js';
import { SFX, initAudio } from '../engine/audio.js';
import { esc, showPanel, appendPanel, sayHtml, ruleCards, next, panel, drawIcon, toast, relayout, fmt } from './ui.js';
import { event } from './quiz.js';

export const STEP = {};

// 對話：{who, text, btn}
STEP.say = async (ctx, s) => { showPanel(sayHtml(s.who, s.text, s.name) + (s.task ? `<div class="task">${s.task}</div>` : '')); if (s.act) await s.act(ctx); await next(s.btn || '繼續'); };

// 3D 動作（沒有介面）：{fn}
STEP.do = async (ctx, s) => { await s.fn(ctx); };

// 勾選全部正確：{who,text, options:[[文字, 對錯]], rules:[題號], fine:[品質,罰款], okMsg, ngMsg}
STEP.checklist = async (ctx, s) => {
  const opts = s.keep ? s.options : shuffle(s.options); const sel = new Set();
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="tools" id="tl">${opts.map((o, i) => `<button class="tool" data-i="${i}">${esc(o[0])}</button>`).join('')}</div><div class="row"><button class="btn primary" id="go" disabled>${esc(s.btn || '確認')}</button></div>`);
  panel.querySelectorAll('#tl .tool').forEach(b => b.onclick = () => { const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('on'); SFX.tick(); panel.querySelector('#go').disabled = !sel.size; });
  await new Promise(r => panel.querySelector('#go').onclick = r);
  let ok = true; panel.querySelectorAll('#tl .tool').forEach(b => { const i = +b.dataset.i; b.disabled = true; if (opts[i][1]) b.classList.add('right'); else if (sel.has(i)) b.classList.add('wrong'); if (!!opts[i][1] !== sel.has(i)) ok = false; });
  panel.querySelector('#go').closest('.row').remove();
  if (ok) SFX.good(); else ctx.run.fine(...(s.fine || [8, 3000]), s.mistake || s.text);
  if (s.after) await s.after(ctx, ok);
  appendPanel(`<div class="result ${ok ? 'ok' : 'ng'}"><b>${esc(ok ? (s.okMsg || '全對') : (s.ngMsg || '有漏掉或選錯的'))}</b>${s.note ? `<span>${esc(s.note)}</span>` : ''}</div>${ruleCards(s.rules || [])}`);
  await next();
  return ok;
};

// 單選一個：{who,text, options:[{t, ok, msg, act}], rules, retry}
STEP.choose = async (ctx, s) => {
  const opts = s.keep ? s.options : shuffle(s.options);
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="tools ${s.cols === 1 ? 'one' : ''}" id="tl">${opts.map((o, i) => `<button class="tool" data-i="${i}">${o.icon ? `<canvas width="88" height="88" data-icon="${o.icon}"></canvas>` : ''}<span>${esc(o.t)}</span></button>`).join('')}</div><div id="res"></div>`);
  panel.querySelectorAll('canvas[data-icon]').forEach(c => drawIcon(c, c.dataset.icon, 88));
  let firstOk = null;
  while (true) {
    const i = await new Promise(r => panel.querySelectorAll('#tl .tool:not([disabled])').forEach(b => b.onclick = () => r(+b.dataset.i)));
    const o = opts[i]; const b = panel.querySelector(`#tl .tool[data-i="${i}"]`);
    if (firstOk === null) firstOk = !!o.ok;
    if (o.act) await o.act(ctx);
    if (o.ok) { b.classList.add('right'); SFX.good(); panel.querySelectorAll('#tl .tool').forEach(x => x.disabled = true); panel.querySelector('#res').innerHTML = `<div class="result ok"><b>${esc(o.msg || '對')}</b></div>${ruleCards(s.rules || [])}`; break; }
    b.classList.add('wrong'); b.disabled = true; ctx.run.fine(...(o.fine || s.fine || [5, 2000]), o.mistake || o.t);
    panel.querySelector('#res').innerHTML = `<div class="result ng"><b>${esc(o.msg || '不對')}</b>${s.retry === false ? '' : '<span>再選一次。</span>'}</div>`;
    if (s.retry === false) { panel.querySelectorAll('#tl .tool').forEach(x => x.disabled = true); appendPanel(ruleCards(s.rules || [])); break; }
    relayout();
  }
  await next(); return firstOk;
};

// 排順序：從抽屜把東西拖進房間（或點一下）。{who,text, items:[{id,label,icon}], order:[id], why:{id:為什麼還不行}, decoy:{id:{msg,fine,act}}, act:{id: async fn}, rules, done}
STEP.order = async (ctx, s) => {
  const items = s.keep ? s.items : shuffle(s.items); let k = 0; let wrongs = 0;
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="task" id="otask">${esc(s.task || '照順序把抽屜裡的東西拖進房間（也可以直接點）。')}</div>
    <div id="tray" class="${items.length > 8 ? 'many' : ''}">${items.map(it => `<button class="item" data-id="${it.id}" aria-label="${esc(it.label)}"><canvas width="88" height="88"></canvas><span>${esc(it.label)}</span></button>`).join('')}</div><div id="res"></div>`);
  panel.querySelectorAll('#tray .item').forEach(b => { const it = items.find(x => x.id === b.dataset.id); drawIcon(b.querySelector('canvas'), it.icon || it.id, 88, it.label); });
  if (s.seq) { panel.insertAdjacentHTML('beforeend', `<div class="seq" id="seq">${s.order.map(() => '<span class="ph">？</span>').join('')}</div>`); }
  relayout();
  await new Promise(resolve => {
    const use = async (id, btn) => {
      if (k >= s.order.length) return;
      const want = s.order[k]; const it = items.find(x => x.id === id);
      if (s.decoy && s.decoy[id] && id !== want) { const d = s.decoy[id]; ctx.run.fine(...(d.fine || [4, 1500]), d.mistake || it.label); if (d.act) await d.act(ctx); flash(`<div class="result ng"><b>${esc(d.msg)}</b></div>${ruleCards(d.rules || [])}`); return; }
      if (id !== want) { wrongs++; ctx.run.fine(...(s.wrongFine || [3, 0]), '工序錯：' + it.label); SFX.bad(); flash(`<div class="result ng"><b>${esc(it.label)}？還不行</b>${s.why && s.why[id] ? `<span>${esc(s.why[id])}</span>` : ''}</div>`); if (s.onWrong) await s.onWrong(ctx, id); return; }
      btn && btn.classList.add('used'); k++;
      if (s.seq) { const ph = panel.querySelectorAll('#seq span')[k - 1]; ph.className = ''; ph.textContent = it.label; }
      if (s.act && s.act[id]) await s.act[id](ctx); else SFX.pop(1.1);
      flash(s.say && s.say[id] ? `<div class="result ok"><b>${esc(s.say[id])}</b></div>` : '');
      if (k >= s.order.length) resolve();
    };
    panel.querySelectorAll('#tray .item').forEach(b => {
      b.addEventListener('pointerdown', e => { if (b.classList.contains('used')) return; e.preventDefault(); initAudio(); startGhost(e, b, (c, sz) => drawIcon(c, items.find(x => x.id === b.dataset.id).icon || b.dataset.id, sz, b.textContent), () => use(b.dataset.id, b), panel); });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); use(b.dataset.id, b); } });
      b.addEventListener('click', e => { if (e.detail === 0) return; /* 點一下也算：pointerup 在抽屜裡就當作點選 */ });
    });
    // 在抽屜上「點一下」（沒拖出去）也算放進去
    panel.querySelectorAll('#tray .item').forEach(b => { let t0 = 0, x0 = 0, y0 = 0; b.addEventListener('pointerdown', e => { t0 = performance.now(); x0 = e.clientX; y0 = e.clientY; }); b.addEventListener('pointerup', e => { if (performance.now() - t0 < 350 && Math.hypot(e.clientX - x0, e.clientY - y0) < 8 && !b.classList.contains('used')) use(b.dataset.id, b); }); });
  });
  const tray = panel.querySelector('#tray'); if (tray) tray.remove(); const ot = panel.querySelector('#otask'); if (ot) ot.remove();
  appendPanel(`${s.done ? `<div class="result ${wrongs ? 'ng' : 'ok'}"><b>${esc(s.done)}</b>${wrongs ? `<span>順序錯了 ${wrongs} 次。</span>` : ''}</div>` : ''}${ruleCards(s.rules || [])}`);
  await next(); return wrongs === 0;
  function flash(html) { const r = panel.querySelector('#res'); if (r) { r.innerHTML = html; panel.scrollTop = panel.scrollHeight; relayout(); } }
};

// 點場景裡的東西：{who,text, targets:(ctx)=>[{obj,id,ok,msg}], need, time, onHit, rules, camera}
STEP.tap = async (ctx, s) => {
  const list = s.targets(ctx); let found = 0; const need = s.need ?? list.filter(t => t.ok).length; let misses = 0; let timeUp = false;
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="task">${esc(s.task || '直接點房間裡的東西。拖曳空白處可以轉視角。')}</div><div class="tapbar"><span>找到 <b id="tf">0</b>／${need}</span>${s.time ? '<span>剩 <b id="tt"></b> 秒</span>' : ''}</div><div id="res"></div>`);
  if (s.camera) Object.assign(camT, s.camera);
  let timer = null; const t0 = performance.now();
  await new Promise(resolve => {
    if (s.time) timer = setInterval(() => { const left = Math.max(0, s.time - (performance.now() - t0) / 1000); const el = panel.querySelector('#tt'); if (el) el.textContent = Math.ceil(left); if (left <= 0) { timeUp = true; clearInterval(timer); resolve(); } }, 200);
    input.onTap = async (x, y) => {
      const objs = list.filter(t => !t.done).map(t => t.obj);
      const hits = raycast(x, y, objs, true); if (!hits.length) return;
      // 前面有細的東西擋住也沒關係：從最近的命中往後找第一個是目標的
      let t = null; for (const h of hits) { let o = h.object; while (o && !(t = list.find(z => z.obj === o && !z.done))) o = o.parent; if (t) break; } if (!t) return;
      if (s.onHit) { const r = await s.onHit(ctx, t, list); if (r === 'skip') return; }
      if (t.ok) { t.done = true; found++; SFX.good(); const el = panel.querySelector('#tf'); el.textContent = found; flash(`<div class="result ok"><b>${esc(t.msg || '找到了')}</b></div>`); if (s.markFound !== false) markFound(t.obj); }
      else { misses++; SFX.bad(); if (s.missFine) ctx.run.fine(...s.missFine, t.msg || '點錯'); flash(`<div class="result ng"><b>${esc(t.msg || '這個沒問題')}</b></div>`); }
      if (found >= need) { clearInterval(timer); resolve(); }
    };
  });
  input.onTap = null;
  const left = list.filter(t => t.ok && !t.done);
  if (left.length) { ctx.run.fine(...(s.fine || [4, 2000]), s.mistake || '沒找完'); left.forEach(t => markFound(t.obj, true)); }
  if (s.after) await s.after(ctx, left.length === 0);
  appendPanel(`<div class="result ${left.length ? 'ng' : 'ok'}"><b>${esc(left.length ? (timeUp ? '時間到，' : '') + `還有 ${left.length} 個沒找到` : (s.okMsg || '全部找到'))}</b>${left.length ? `<span>${left.map(t => esc(t.label || t.msg)).join('、')}</span>` : ''}</div>${ruleCards(s.rules || [])}`);
  await next(); return left.length === 0;
  function flash(html) { const r = panel.querySelector('#res'); if (r) { r.innerHTML = html; relayout(); } }
};
function markFound(obj, miss) { obj.traverse(m => { if (m.isMesh && !m.userData.mark) { m.userData.mark = 1; } }); gsap.fromTo(obj.scale, { x: obj.scale.x * 1.15, y: obj.scale.y * 1.15, z: obj.scale.z * 1.15 }, { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z, duration: .5, ease: 'elastic.out(1,0.4)' }); }

// 滑桿：{who,text,min,max,step,value,unit, preview(ctx,v), check(v)->{ok,msg,retry}, rules, fmt}
STEP.slider = async (ctx, s) => {
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="slider"><input id="sl" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}" aria-label="${esc(s.label || '數值')}"><span class="v" id="sv"></span></div><div id="res"></div><div class="row"><button class="btn primary" id="sok">${esc(s.btn || '就這樣')}</button></div>`);
  const el = panel.querySelector('#sl'); const show = () => { const v = +el.value; panel.querySelector('#sv').textContent = (s.fmt ? s.fmt(v) : v) + (s.unit ? ' ' + s.unit : ''); if (s.preview) s.preview(ctx, v); };
  el.oninput = () => { show(); SFX.tick(); }; show(); relayout();
  let first = true, okFirst = false;
  while (true) {
    await new Promise(r => panel.querySelector('#sok').onclick = r);
    const v = +el.value; const c = s.check(v); if (first) { okFirst = c.ok; first = false; }
    if (c.act) await c.act(ctx, v);
    if (c.ok) { SFX.good(); panel.querySelector('#res').innerHTML = `<div class="result ok"><b>${esc(c.msg)}</b></div>`; break; }
    ctx.run.fine(...(c.fine || s.fine || [5, 0]), s.mistake || c.msg); SFX.bad();
    panel.querySelector('#res').innerHTML = `<div class="result ng"><b>${esc(c.msg)}</b><span>調整一下再試。</span></div>${ruleCards(s.rules || [])}`; relayout();
  }
  panel.querySelector('#sok').closest('.row').remove(); el.disabled = true;
  appendPanel(okFirst ? ruleCards(s.rules || []) : ''); await next(); return okFirst;
};

// 計算：{who,text, answer, tol, unit, hint, explain, rules}
STEP.calc = async (ctx, s) => {
  showPanel(`${sayHtml(s.who, s.text, s.name)}${s.hint ? `<div class="task">${esc(s.hint)}</div>` : ''}<div class="calc"><input id="ci" inputmode="decimal" autocomplete="off" placeholder="輸入答案"><span>${esc(s.unit || '')}</span></div><div id="res"></div><div class="row"><button class="btn primary" id="cok">算好了</button></div>`);
  relayout(); let tries = 0, okFirst = false;
  while (true) {
    await new Promise(r => { panel.querySelector('#cok').onclick = r; panel.querySelector('#ci').onkeydown = e => { if (e.key === 'Enter') r(); }; });
    const v = parseFloat(panel.querySelector('#ci').value); if (isNaN(v)) { toast('先輸入一個數字'); continue; }
    tries++; const ok = Math.abs(v - s.answer) <= (s.tol ?? .01) * Math.max(1, Math.abs(s.answer)); if (tries === 1) okFirst = ok;
    if (ok || tries >= 2) {
      if (ok) SFX.good(); else { SFX.bad(); ctx.run.fine(...(s.fine || [5, 2000]), s.mistake || '算錯'); }
      panel.querySelector('#res').innerHTML = `<div class="result ${ok ? 'ok' : 'ng'}"><b>${ok ? '算對了' : `正確答案是 ${s.answer}${s.unit ? ' ' + esc(s.unit) : ''}`}</b><span>${esc(s.explain || '')}</span></div>${ruleCards(s.rules || [])}`;
      break;
    }
    SFX.bad(); panel.querySelector('#res').innerHTML = `<div class="result ng"><b>不太對</b><span>再算一次。</span></div>`; relayout();
  }
  panel.querySelector('#cok').closest('.row').remove(); panel.querySelector('#ci').disabled = true;
  await next(); return okFirst;
};

// 配對：先點左邊再點右邊。{who,text, pairs:[[左,右]], rules}
STEP.match = async (ctx, s) => {
  const L = s.pairs.map((p, i) => ({ t: p[0], i })), Rr = shuffle(s.pairs.map((p, i) => ({ t: p[1], i }))); const lefts = shuffle(L);
  showPanel(`${sayHtml(s.who, s.text, s.name)}<div class="task">${esc(s.task || '先點左邊一張，再點右邊對應的那張。')}</div><div class="match"><div class="col" id="ml">${lefts.map(x => `<button class="mt" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div><div class="col" id="mr">${Rr.map(x => `<button class="mt" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div><div id="res"></div>`);
  relayout(); let cur = null, done = 0, miss = 0;
  await new Promise(resolve => {
    panel.querySelectorAll('#ml .mt').forEach(b => b.onclick = () => { if (b.disabled) return; panel.querySelectorAll('#ml .mt').forEach(x => x.classList.remove('on')); b.classList.add('on'); cur = b; SFX.tick(); });
    panel.querySelectorAll('#mr .mt').forEach(b => b.onclick = () => {
      if (!cur || b.disabled) { if (!cur) toast('先點左邊一張'); return; }
      if (cur.dataset.i === b.dataset.i) { cur.disabled = b.disabled = true; cur.classList.remove('on'); cur.classList.add('right'); b.classList.add('right'); cur = null; done++; SFX.good(); if (done === s.pairs.length) resolve(); }
      else { miss++; SFX.bad(); b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); ctx.run.fine(...(s.fine || [2, 0]), '配錯：' + cur.textContent); }
    });
  });
  appendPanel(`<div class="result ${miss ? 'ng' : 'ok'}"><b>${miss ? `配對完成，錯了 ${miss} 次` : '全部配對正確'}</b></div>${ruleCards(s.rules || [])}`);
  await next(); return miss === 0;
};

// 題庫原題事件：{who,name,line,title,topics,n,overtime}
STEP.quiz = async (ctx, s) => { if (typeof s.before === 'function') await s.before(ctx); const r = await event({ ...s, run: ctx.run }); if (typeof s.after === 'function') await s.after(ctx, r); return r; };

// window.__kgStep 給自動測試用：讓測試知道目前這一步的正解
export async function runSteps(ctx, steps) { window.__kgCtx = ctx; for (const s of steps) { if (ctx.abort) return; window.__kgStep = s; await STEP[s.type](ctx, s); window.__kgStep = null; } }
