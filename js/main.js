// 主流程：開書 → 目錄 → 案子（一站一站做） → 結算 → 回目錄。另有題庫圖鑑、工法手冊、考前衝刺、設定。
import { THREE, gsap, cam, camT, view, camera, start, onResize, wait, TIERS, quality, Qs, toScreen } from './engine/core.js';
import { openBook, flipPages, drawCover, drawTitlePage, PAGE_Y } from './engine/book.js';
import { initAudio, setSound, SFX } from './engine/audio.js';
import { input } from './engine/input.js';
import { buildRoom } from './engine/props.js';
import { confetti } from './engine/fx.js';
import { loadData, D, GROUPS, GNAME, topicName, poolOf } from './game/data.js';
import { S, save, stat, groupPool, readiness, exportCode, importCode, reset, pickFrom } from './game/save.js';
import { $, esc, fmt, showPanel, hidePanel, setSteps, openSheet, closeSheet, onRuleLearned, bump, toast, sayHtml, appendPanel, panel } from './game/ui.js';
import { runSteps, STEP } from './game/steps.js';
import { askOne, event } from './game/quiz.js';
import { JOBS } from './jobs/index.js';

const T = Math.tan(THREE.MathUtils.degToRad(35 / 2));
function closedFrame() {
  const asp = innerWidth / Math.max(1, innerHeight), portrait = asp < .9;
  const r = portrait ? Math.max(5.6 / (T * asp), 8 / T) : Math.max(9.5 / (T * asp), 8.6 / T);
  return { theta: portrait ? .16 : .38, phi: .62, r, tx: portrait ? 3.7 : 3.9 - Math.min(6.5, r * T * asp * .4), ty: .6, tz: portrait ? r * .17 : 1.6 };
}
function bookFrame() { const asp = innerWidth / Math.max(1, innerHeight); const r = Math.max(9 / (T * asp), 7 / T); return { theta: .2, phi: .55, r, tx: 0, ty: PAGE_Y, tz: .5 }; }
let roomSize = { w: 4.5, d: 3.6, h: 3 };
export function fitRadius() { const asp = innerWidth / Math.max(1, innerHeight), portrait = asp < .9, k = Math.max(roomSize.w / 4.5, roomSize.d / 3.6); return k * Math.max((portrait ? 3.6 : 4.4) / (T * asp), (portrait ? 3.3 : 3.0) / T); }
function playFrame() { return { theta: .5, phi: 1.0, r: fitRadius(), tx: 0, ty: PAGE_Y + roomSize.h * .45, tz: 0 }; }
let mode = 'start';
onResize(() => { if (mode === 'start') Object.assign(camT, closedFrame()); else if (mode === 'toc') Object.assign(camT, bookFrame()); else if (mode === 'job') camT.r = fitRadius(); });

/* ---------- HUD ---------- */
function ruleCount() { $('#ruleN').textContent = Object.keys(S.rules).length; }
onRuleLearned(() => { ruleCount(); bump($('#ruleChip')); });
function soundUI() { $('#sndOn').style.display = S.sound ? '' : 'none'; $('#sndOff').style.display = S.sound ? 'none' : ''; }
$('#soundBtn').onclick = () => { initAudio(); S.sound = !S.sound; setSound(S.sound); soundUI(); save(); };
$('#ruleChip').onclick = () => manual();

/* ---------- 目錄 ---------- */
function jobStat(job) { return stat(poolOf(job.topics)); }
async function toc() {
  mode = 'toc'; hidePanel(); input.enabled = false; input.onTap = null; setSteps('目錄'); $('#tocBtn').classList.add('hidden');
  Object.assign(camT, bookFrame()); view.zoomT = 1;
  const anyDone = Object.values(S.jobs).some(j => j.done);
  const all = stat(D.Q);
  const el = openSheet(`<div class="kicker">開工室內裝修工程行</div><h2>這本書裡的案子</h2>
    <div class="stats"><div><b>${fmt(S.money).replace('NT$', '')}</b>資金（元）</div><div><b>${all.seen}</b>見過的題目／${all.n}</div><div><b>${anyDone ? readiness() : '—'}</b>${anyDone ? '預估學科分數' : '完成一案後估分'}</div></div>
    <div class="jobs">${JOBS.map((j, i) => { const st = jobStat(j); const rec = S.jobs[j.id] || {}; const locked = i > 0 && !Object.values(S.jobs).some(x => x.done) && !Qs.has('all');
      return `<button class="job" data-i="${i}" ${locked ? 'disabled' : ''}><div class="no" style="background:${j.color}">${i + 1}</div><div><div class="nm">${esc(j.title)}</div><div class="sb">${esc(j.sub)}${locked ? '　完成第一案後開放' : ''}</div><div class="sb">題目 ${st.seen}／${st.n}　熟練 ${st.good}</div><div class="bar"><i style="width:${st.good / st.n * 100}%"></i><i class="s" style="width:${(st.seen - st.good) / st.n * 100}%"></i></div></div><div class="gd">${rec.best || ''}</div></button>`; }).join('')}</div>
    <div class="menu"><button class="btn" id="mCodex">題庫圖鑑</button><button class="btn" id="mManual">工法手冊</button><button class="btn teal" id="mSprint">考前衝刺 20 題</button><button class="btn" id="mSet">設定與進度碼</button></div>
    <p class="fine">深色條是熟練（連續答對 3 次以上），淺色是見過還不熟。</p>`);
  el.querySelectorAll('.job').forEach(b => b.onclick = () => { if (!b.disabled) { closeSheet(); playJob(JOBS[+b.dataset.i]); } });
  $('#mCodex').onclick = codex; $('#mManual').onclick = manual; $('#mSprint').onclick = sprint; $('#mSet').onclick = settings;
}

/* ---------- 案子 ---------- */
function newRun() {
  const run = { quality: 100, money: 0, fines: 0, quiz: [0, 0], mistakes: [] };
  run.fine = (q = 0, amount = 0, desc = '') => { run.quality = Math.max(0, run.quality - q); run.fines += amount; if (desc && (q || amount)) run.mistakes.push(desc); };
  return run;
}
async function playJob(job) {
  mode = 'job'; $('#hud').classList.add('on'); $('#tocBtn').classList.remove('hidden');
  roomSize = { w: job.room.w ?? 4.5, d: job.room.d ?? 3.6, h: job.room.h ?? 3 };
  await flipPages(2, 1);
  const R = buildRoom(job.room); const run = newRun();
  const ctx = { R, run, job, focus: (o) => Object.assign(camT, o), frame: () => Object.assign(camT, playFrame()), fit: fitRadius };
  if (job.setup) await job.setup(ctx);
  Object.assign(camT, playFrame()); camT.r *= 1.12; camT.phi = .85;
  await R.popUp(); Object.assign(camT, playFrame());
  input.enabled = true;
  const names = job.stations.map(s => s.name);
  // 測試用：網址加 ?st=站的id 可以從那一站開始
  const from = Math.max(0, job.stations.findIndex(s => s.id === Qs.get('st')));
  for (let i = from; i < job.stations.length; i++) {
    const st = job.stations[i]; setSteps(job.short || job.title, names, i);
    ctx.frame(); if (st.camera) ctx.focus(st.camera);
    await runSteps(ctx, st.steps(ctx));
    // 這一站的追問：題庫原題，從這一站的題池挑
    await STEP.quiz(ctx, { who: st.asker || 'boss', title: st.quizTitle || `${st.name}・追問`, line: st.quizLine || '做完了？那我考你幾題，答對才算這一站過關。', topics: st.topics, n: st.n ?? 2 });
    for (const ev of (job.events || []).filter(e => e.after === st.id)) {
      const { after, ...q } = ev; await STEP.quiz(ctx, { ...q, n: ev.n ?? 2 }); // before() 由 STEP.quiz 呼叫；after 是站的 id，不能傳進去
      if (ev.after2) await ev.after2(ctx);
    }
  }
  setSteps(job.short || job.title, names, names.length);
  hidePanel(); input.onTap = null;
  if (job.finale) await job.finale(ctx);
  Object.assign(camT, playFrame()); camT.phi = 1.25; camT.theta = .3; camT.r *= .92;
  SFX.chime(); confetti(new THREE.Vector3(0, PAGE_Y + 1.6, 0), 30);
  await wait(2.2);
  finishJob(job, ctx);
}
function grade(q) { return q >= 90 ? 'A' : q >= 75 ? 'B' : q >= 60 ? 'C' : 'D'; }
function finishJob(job, ctx) {
  const { run } = ctx; const g = grade(run.quality);
  const pay = Math.round(job.pay * (.6 + .4 * run.quality / 100)); const net = pay + run.money - run.fines;
  S.money += net; S.rep = Math.max(0, Math.min(100, S.rep + (g === 'A' ? 4 : g === 'B' ? 2 : g === 'C' ? 0 : -3)));
  const rec = S.jobs[job.id] || { done: 0, best: null }; rec.done++; if (!rec.best || 'ABCD'.indexOf(g) < 'ABCD'.indexOf(rec.best)) rec.best = g; S.jobs[job.id] = rec;
  S.run++; S.first = false; save();
  const st = jobStat(job);
  const el = openSheet(`<div class="kicker">${esc(job.title)}・完工</div><h2>${esc(job.doneLine || '交屋了！')}</h2>
    <div style="display:flex;gap:16px;align-items:center"><span class="grade">${g}</span><div class="stats" style="flex:1"><div><b>${run.quality}</b>品質</div><div><b>${run.quiz[0]}/${run.quiz[1]}</b>原題答對</div><div><b>${(net / 1000).toFixed(1)}k</b>淨收入</div></div></div>
    <p class="small">工程款 ${fmt(pay)}　答題獎金 ${fmt(run.money)}　罰款 ${fmt(run.fines)}</p>
    ${run.mistakes.length ? `<h3>這次出過的錯</h3><p class="small">${run.mistakes.slice(0, 12).map(esc).join('、')}${run.mistakes.length > 12 ? '…' : ''}</p>` : '<p class="small">這次沒有出錯。</p>'}
    <h3>這個案子的題庫</h3><p class="small">見過 ${st.seen}／${st.n} 題，熟練 ${st.good} 題。每次重玩會優先出沒見過和該複習的題目。</p>
    <div class="row" style="margin-top:12px"><button class="btn" id="look">再看一下房間</button><button class="btn primary" id="back">回目錄</button></div>`);
  el.querySelector('#look').onclick = () => { closeSheet(); showPanel(`<div class="row"><button class="btn primary" id="back2">看完了，回目錄</button></div>`); $('#back2').onclick = () => leave(ctx); };
  el.querySelector('#back').onclick = () => { closeSheet(); leave(ctx); };
}
async function leave(ctx) { hidePanel(); input.enabled = false; await ctx.R.foldDown(); await flipPages(2, -1); toc(); }
$('#tocBtn').onclick = () => {
  if (mode !== 'job') { toc(); return; }
  const el = openSheet(`<h2>先離開這個案子？</h2><p class="lead">這一案的進度不會保留，下次要從頭做。已經答過的題目和學到的工法都會保留。</p><div class="row"><button class="btn" id="stay">繼續做</button><button class="btn primary" id="go">回目錄</button></div>`);
  el.querySelector('#stay').onclick = closeSheet; el.querySelector('#go').onclick = () => { location.hash = 'toc'; location.reload(); };
};

/* ---------- 題庫圖鑑 ---------- */
function codex() {
  const el = openSheet(`<button class="iconBtn close" id="x" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="kicker">題庫圖鑑</div><h2>1,113 題收集進度</h2><p class="small">每一題都分在某個案子的某一站；點主題右邊的「特訓」可以直接練那一區。</p>
    ${GROUPS.map(([g, nm]) => { const pool = groupPool(g); const s = stat(pool); const topics = Object.keys(D.topics).filter(k => k.split('/')[0] === g);
      return `<details class="grp"><summary><span>${g.length > 2 ? g : '工作項目 ' + g} ${esc(nm)}</span><span class="n">${s.seen}／${s.n}</span><div class="bar"><i style="width:${s.good / s.n * 100}%"></i><i class="s" style="width:${(s.seen - s.good) / s.n * 100}%"></i></div></summary>
      ${topics.map(k => { const ts = stat(D.byTopic[k]); const job = JOBS.find(j => j.topics.includes(k)); return `<div class="tp"><span>${esc(topicName(k))}<br><span class="n">${job ? esc(job.short || job.title) : ''}</span></span><span class="n">${ts.seen}/${ts.n}</span><button class="btn" data-k="${esc(k)}">特訓</button></div>`; }).join('')}</details>`; }).join('')}`);
  el.querySelector('#x').onclick = () => { closeSheet(); if (mode === 'toc') toc(); };
  el.querySelectorAll('.tp .btn').forEach(b => b.onclick = () => drill(b.dataset.k));
}
async function drill(key) {
  closeSheet(); const back = mode; mode = 'drill';
  await event({ who: 'boss', title: '特訓：' + topicName(key), line: '這一區我出 5 題，答完可以選要不要繼續。', topics: [key], n: 5, overtime: true });
  hidePanel(); mode = back; if (back === 'toc') toc();
}

/* ---------- 工法手冊 ---------- */
function manual() {
  const learned = Object.keys(S.rules).length, total = Object.keys(D.rules).length;
  const el = openSheet(`<button class="iconBtn close" id="x" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="kicker">工法手冊</div><h2>收進 ${learned}／${total} 條</h2><p class="small">做對動作、答完題目，都會把那一條工法收進來。每條後面是對應的題號。</p>
    ${GROUPS.map(([g, nm]) => { const keys = Object.keys(D.topics).filter(k => k.split('/')[0] === g); const rs = keys.flatMap(k => D.topics[k].rules.map((_, i) => k + '#' + i)); const n = rs.filter(k => S.rules[k]).length;
      return `<details class="grp"><summary><span>${g.length > 2 ? g : '工作項目 ' + g} ${esc(nm)}</span><span class="n">${n}／${rs.length}</span></summary>${keys.map(k => { const list = D.topics[k].rules.map((r, i) => [r, k + '#' + i]); const got = list.filter(([, rk]) => S.rules[rk]);
        return `<div class="tp"><span>${esc(topicName(k))}</span><span class="n">${got.length}/${list.length}</span><span></span></div><div class="rl-list">${got.map(([r]) => `<div class="rule"><span class="rl">工法</span>${esc(r[0])}<small>［${r[1].slice(0, 4).join('、')}］</small></div>`).join('')}${got.length < list.length ? `<div class="lk">還有 ${list.length - got.length} 條沒收集</div>` : ''}</div>`; }).join('')}</details>`; }).join('')}`);
  el.querySelector('#x').onclick = () => { closeSheet(); if (mode === 'toc') toc(); };
}

/* ---------- 考前衝刺 ---------- */
async function sprint() {
  closeSheet(); mode = 'sprint';
  // 依學科配分抽題：12600 七項依題數比例共 80%，共同科目各 5%
  const own = GROUPS.slice(0, 7).map(([g]) => [g, groupPool(g).length]); const tot = own.reduce((s, [, n]) => s + n, 0);
  const weights = [...own.map(([g, n]) => [g, .8 * n / tot]), ...GROUPS.slice(7).map(([g]) => [g, .05])];
  const qs = []; const used = new Set();
  for (let i = 0; i < 20; i++) { let r = Math.random(), g = weights[0][0]; for (const [gg, w] of weights) { if ((r -= w) <= 0) { g = gg; break; } } const q = pickFrom(groupPool(g), 1, used)[0]; if (q) { used.add(q.id); qs.push(q); } }
  let right = 0;
  for (let i = 0; i < qs.length; i++) { const ok = await askOne(qs[i], i, qs.length, `<div class="alert"><span>考前衝刺</span><span>${i + 1}／${qs.length}</span></div>`); if (ok) right++; }
  S.sprints++; S.run++; save(); hidePanel();
  const el = openSheet(`<div class="kicker">考前衝刺</div><h2>答對 ${right}／${qs.length}</h2><p class="lead">換算成學科分數約 ${Math.round(right / qs.length * 100)} 分（真正的考試 80 題，60 分及格）。答錯的題目會在之後的案子和衝刺裡優先出現。</p><div class="row"><button class="btn" id="again">再來 20 題</button><button class="btn primary" id="back">回目錄</button></div>`);
  el.querySelector('#again').onclick = sprint; el.querySelector('#back').onclick = () => { closeSheet(); toc(); };
}

/* ---------- 設定 ---------- */
function settings() {
  const el = openSheet(`<button class="iconBtn close" id="x" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="kicker">設定</div><h2>聲音、畫質、進度碼</h2>
    <div class="row"><button class="btn" id="snd">聲音：${S.sound ? '開' : '關'}</button></div>
    <p class="small">畫質：目前「${TIERS[quality.tier].name}」。手機太慢時會自動降一級；網址加 <code>?q=low</code> 可以固定用最低畫質。</p>
    <h3>換手機或換瀏覽器</h3><p class="small">進度存在這個瀏覽器裡。要搬到別的裝置，複製下面這段進度碼，到新裝置貼上載入。</p>
    <textarea id="code" readonly>${exportCode()}</textarea>
    <div class="row" style="margin:8px 0"><button class="btn" id="copy">複製進度碼</button></div>
    <textarea id="codeIn" placeholder="貼上進度碼（KG1. 開頭）"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn" id="load">載入這組進度</button></div>
    <h3>重新開始</h3><div class="row"><button class="btn" id="reset">清除所有進度</button></div>`);
  el.querySelector('#x').onclick = () => { closeSheet(); toc(); };
  el.querySelector('#snd').onclick = e => { S.sound = !S.sound; setSound(S.sound); soundUI(); save(); e.target.textContent = '聲音：' + (S.sound ? '開' : '關'); };
  el.querySelector('#copy').onclick = () => { const t = el.querySelector('#code'); t.select(); try { navigator.clipboard.writeText(t.value); toast('已複製'); } catch (e) { document.execCommand('copy'); toast('已複製'); } };
  el.querySelector('#load').onclick = () => { try { importCode(el.querySelector('#codeIn').value); ruleCount(); toast('已載入'); closeSheet(); toc(); } catch (e) { toast('這組進度碼讀不出來，請確認整段都有貼上'); } };
  el.querySelector('#reset').onclick = () => { const s2 = openSheet(`<h2>確定清除？</h2><p class="lead">所有題目熟練度、工法、資金都會歸零，不能復原。</p><div class="row"><button class="btn" id="no">不要</button><button class="btn primary" id="yes">清除</button></div>`); s2.querySelector('#no').onclick = settings; s2.querySelector('#yes').onclick = () => { reset(); location.hash = ''; location.reload(); }; };
}

/* ---------- 開機 ---------- */
(async () => {
  drawCover(); drawTitlePage();
  Object.assign(cam, closedFrame()); Object.assign(camT, cam); start();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawCover(); drawTitlePage(); });
  let idle = 0; const stopIdle = setInterval(() => { if (mode !== 'start') return clearInterval(stopIdle); idle += .05; camT.theta = closedFrame().theta + Math.sin(idle * .25) * .12; }, 50);
  await loadData();
  // 檢查：每一題都要分到某個案子
  const covered = new Set(JOBS.flatMap(j => j.topics)); const missing = Object.keys(D.topics).filter(k => !covered.has(k));
  if (missing.length) console.warn('沒有分配到案子的主題', missing);
  window.__kg = { D, S: () => S, JOBS, missing, mode: () => mode, toc, playJob, input, toScreen };
  setSound(S.sound); soundUI(); ruleCount();
  $('#loading').classList.add('hidden');
  const go = async () => { $('#start').classList.add('hidden'); initAudio(); mode = 'opening'; Object.assign(camT, bookFrame()); camT.r *= 1.1; await openBook(); $('#hud').classList.add('on'); toc(); };
  if (location.hash === '#toc') { history.replaceState(null, '', location.pathname + location.search); go(); }
  else $('#startBtn').onclick = go;
})();
