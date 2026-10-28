// 題庫原題：勞檢、審查、屋主、師傅的提問都走這裡。答完一定會看到這題的工法。
import { D, GNAME, poolOf, topicName } from './data.js';
import { S, record, pickFrom, save } from './save.js';
import { esc, showPanel, appendPanel, sayHtml, ruleCards, clickOnce, panel, relayout } from './ui.js';
import { SFX } from '../engine/audio.js';

const K = '①②③④';
export function cardHtml(q, i, n) {
  return `<div class="qcard" id="qc"><div class="meta"><span>${esc(GNAME[q.c] || '')} · ${esc(topicName(q.t))}</span><span>${q.id}${q.multi ? ' 複選' : ''}${n > 1 ? `　${i + 1}/${n}` : ''}</span></div>
    <p class="stem">${esc(q.s)}</p>${q.img ? `<div class="fig"><img alt="題目附圖" src="${q.img}"></div><div class="figcap">圖太小可以左右滑動看</div>` : ''}</div>
    ${q.multi ? '<div class="task">複選：把所有正確的都選起來，再按「確認」。</div>' : ''}
    <div class="opts">${q.o.map((o, k) => `<button class="opt" data-i="${k + 1}"><span class="box"></span><span class="k">${K[k]}</span><span>${o ? esc(o) : '（見上圖）'}</span></button>`).join('')}</div>`;
}
// 問一題，回傳是否答對
export function askOne(q, i = 0, n = 1, head = '', hooks = {}) {
  window.__kgQ = q;
  return new Promise(resolve => {
    showPanel(head + cardHtml(q, i, n) + '<div id="qres"></div>');
    const btns = [...panel.querySelectorAll('.opt')]; let fin = false;
    if (!q.multi) btns.forEach(b => b.querySelector('.box').remove());
    const finish = chosen => {
      if (fin) return; fin = true;
      const ok = chosen.length === q.ans.length && chosen.every(c => q.ans.includes(c)); record(q, ok);
      btns.forEach(b => { const k = +b.dataset.i; b.disabled = true; if (q.ans.includes(k)) b.classList.add('right'); else if (chosen.includes(k)) b.classList.add('wrong'); });
      const s = document.createElement('div'); s.className = 'stamp ' + (ok ? 'ok' : 'ng'); s.textContent = ok ? '合格' : '不合格'; panel.querySelector('#qc').appendChild(s);
      ok ? SFX.good() : SFX.bad();
      const right = q.ans.map(a => K[a - 1] + (q.o[a - 1] ? ' ' + esc(q.o[a - 1]) : '')).join('、');
      panel.querySelector('#qres').innerHTML = `<div class="result ${ok ? 'ok' : 'ng'}"><b>${ok ? '答對' : '答錯'}</b>${ok ? '' : `<span>正解：${right}</span>`}</div>${ruleCards([q.id])}${q.f ? `<div class="flag">這題可能過時或有疑義：${esc(q.f)}（考試仍照題庫答案）</div>` : ''}`;
      if (hooks.onAnswer) hooks.onAnswer(q, ok);
      appendPanel(`<div class="row"><button class="btn primary" id="qnext">${i + 1 < n ? '下一題' : '好'}</button></div>`);
      clickOnce('#qnext', panel).then(() => resolve(ok));
    };
    if (!q.multi) btns.forEach(b => b.onclick = () => finish([+b.dataset.i]));
    else {
      const sel = new Set();
      btns.forEach(b => b.onclick = () => { const k = +b.dataset.i; sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('sel'); SFX.tick(); });
      panel.insertAdjacentHTML('beforeend', '<div class="row" id="qokrow"><button class="btn primary" id="qok">確認</button></div>');
      panel.querySelector('#qok').onclick = () => { if (sel.size) { panel.querySelector('#qokrow').remove(); finish([...sel].sort()); } };
    }
    relayout();
  });
}

// 一次事件：某人來問 n 題；overtime=true 時答完可以選「加班再問 3 題」
export async function event({ who, name, line, title, topics, n = 2, overtime = true, run, tag = '題庫原題' }) {
  const pool = poolOf(topics); const asked = new Set(); let right = 0, total = 0, more = true, round = n;
  while (more) {
    const qs = pickFrom(pool, round, asked); if (!qs.length) break;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]; asked.add(q.id);
      const head = `<div class="alert"><span>${esc(title)}</span><span>${esc(tag)}</span></div>${i === 0 && total === 0 ? sayHtml(who, esc(line), name) : ''}`;
      const ok = await askOne(q, i, qs.length, head, { onAnswer: (q, ok) => { if (run) { run.quiz[1]++; if (ok) { run.quiz[0]++; run.money += 300; } else { run.fine(2, 1000, '答錯 ' + q.id); } } } });
      total++; if (ok) right++;
    }
    if (!overtime || asked.size >= pool.length) break;
    const st = pool.filter(q => S.qs[q.id]).length;
    showPanel(`${sayHtml(who, `這一區的題目你已經見過 ${st}／${pool.length} 題。要不要加班，再多問你幾題？`, name)}
      <div class="row"><button class="btn" id="ot">加班再問 3 題</button><button class="btn primary" id="done">收工，繼續施工</button></div>`);
    more = await new Promise(r => { panel.querySelector('#ot').onclick = () => { SFX.tick(); r(true); }; panel.querySelector('#done').onclick = () => { SFX.tick(); r(false); }; });
    round = 3;
  }
  save(); return { right, total };
}
