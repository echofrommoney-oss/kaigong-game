// 介面：底部工作紙、對話、吐司、全畫面紙卡、圖示。
import { gsap, view, FONT } from '../engine/core.js';
import { D, rulesOf } from './data.js';
import { S, learnRule } from './save.js';
import { SFX } from '../engine/audio.js';

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmt = n => 'NT$' + Math.round(n).toLocaleString('en-US');

export const CASTINFO = {
  boss: ['周', '工地主任老周'], worker: ['阿', '師傅阿勇'], inspector: ['檢', '勞動檢查員'], reviewer: ['審', '室內裝修審查人員'], owner: ['屋', '屋主'],
  plumber: ['水', '水電師傅大頭'], eco: ['環', '環保局稽查員'], energy: ['節', '節能顧問小綠'], steel: ['鋼', '輕鋼架師傅阿鋼'], painter: ['漆', '油漆師傅阿美'],
  mason: ['泥', '泥作師傅土豆'], carpenter: ['木', '木作師傅阿樹'], glazier: ['玻', '玻璃師傅晶晶'], accountant: ['會', '會計小方'], fire: ['消', '消防局人員'], hr: ['人', '人資阿芬'],
  designer: ['設', '設計師小圖'], manager: ['店', '店長'], clerk: ['承', '承辦人員'],
};
export function sayHtml(who, text, name) { const [av, nm] = CASTINFO[who] || ['？', who]; return `<div class="say"><div class="av">${esc(av)}</div><div><div class="who">${esc(name || nm)}</div><div class="txt">${text}</div></div></div>`; }

/* ---------- 吐司 ---------- */
let toastT = 0;
export function toast(html, dur = 3.4) { const t = $('#toast'); t.innerHTML = html; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), dur * 1000); }

/* ---------- 底部工作紙 ---------- */
const panel = $('#panel');
export function panelOffset() { if (!panel.classList.contains('on') || innerWidth >= 900) return 0; return (panel.offsetHeight + 16) * .5; }
function offs() { view.offT = panelOffset(); view.offXT = panel.classList.contains('on') && innerWidth >= 900 ? (panel.offsetWidth + 24) * .5 : 0; }
window.addEventListener('resize', () => offs());
export function showPanel(html) { panel.innerHTML = html; panel.classList.add('on'); panel.scrollTop = 0; requestAnimationFrame(offs); return panel; }
export function appendPanel(html) { panel.insertAdjacentHTML('beforeend', html); requestAnimationFrame(() => { panel.scrollTop = panel.scrollHeight; offs(); }); }
export function hidePanel() { panel.classList.remove('on'); panel.innerHTML = ''; view.offT = 0; view.offXT = 0; }
export function relayout() { requestAnimationFrame(offs); }
export { panel };
// 等某個按鈕被按
export function clickOnce(sel, root = document) { return new Promise(r => { const b = root.querySelector(sel); b.addEventListener('click', () => { SFX.tick(); r(); }, { once: true }); }); }
export async function next(label = '繼續', extra = '') { appendPanel(`<div class="row">${extra}<button class="btn primary" id="nx">${esc(label)}</button></div>`); await clickOnce('#nx', panel); }

/* ---------- 工法卡 ---------- */
let ruleChipCb = null; export function onRuleLearned(cb) { ruleChipCb = cb; }
export function ruleCards(qids, learn = true) {
  const seen = new Set(); let html = '';
  for (const r of qids.flatMap(id => rulesOf(id).slice(0, 3))) { if (!r || seen.has(r.key)) continue; seen.add(r.key); if (learn && learnRule(r.key) && ruleChipCb) ruleChipCb(); html += `<div class="rule"><span class="rl">工法</span>${esc(r.text)}<small>［題庫 ${r.ids.slice(0, 4).join('、')}${r.ids.length > 4 ? '…' : ''}］</small></div>`; }
  return html;
}

/* ---------- 頂部 ---------- */
export function setSteps(title, steps, idx) {
  $('#title').innerHTML = `<span class="tt">${esc(title)}</span>` + (steps ? `<span class="steps">${steps.map((s, k) => `<span class="${k < idx ? 'done' : k === idx ? 'now' : ''}">${esc(s)}</span>`).join('')}</span>` : '');
  const now = $('#title .steps .now'); if (now) now.scrollIntoView({ inline: 'center', block: 'nearest' });
}
export function bump(el) { gsap.fromTo(el, { scale: 1.25, rotate: -4 }, { scale: 1, rotate: 0, duration: .6, ease: 'elastic.out(1,0.4)' }); }

/* ---------- 全畫面紙卡 ---------- */
export function openSheet(html, cls = '') { const o = $('#sheet'); o.innerHTML = `<div class="sheet ${cls}" role="dialog">${html}</div>`; o.classList.remove('hidden'); o.scrollTop = 0; return o.firstElementChild; }
export function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheet').innerHTML = ''; }

/* ---------- 抽屜圖示 ---------- */
const ICON = {
  pipe: (x, R) => { x.strokeStyle = '#e08a4f'; x.lineWidth = 12; x.beginPath(); x.moveTo(-38, -14); x.lineTo(14, -14); x.lineTo(14, 30); x.stroke(); x.fillStyle = '#fbf6ec'; x.beginPath(); x.arc(14, 30, 9, 0, 7); x.fill(); },
  conduit: (x, R) => { x.strokeStyle = '#f0ad3e'; x.lineWidth = 9; x.beginPath(); x.moveTo(-38, 20); x.bezierCurveTo(-10, 20, -10, -20, 38, -20); x.stroke(); R(28, -30, 18, 22, '#fffdf7', 3); },
  edge: (x, R) => { R(-40, -6, 80, 10, '#fbf6ec'); R(-40, -6, 10, 30, '#efe5d3'); },
  ink: (x, R) => { R(-26, -20, 44, 34, '#8a5a44', 10); x.fillStyle = '#4b3f37'; x.beginPath(); x.arc(-4, -3, 10, 0, 7); x.fill(); x.strokeStyle = '#4b3f37'; x.lineWidth = 2; x.beginPath(); x.moveTo(18, -3); x.lineTo(42, -3); x.stroke(); },
  hanger: (x, R) => { for (const dx of [-16, 0, 16]) { x.strokeStyle = '#85705f'; x.lineWidth = 4; x.beginPath(); x.moveTo(dx, -36); x.lineTo(dx, 26); x.stroke(); R(dx - 6, 18, 12, 9, '#ffc96b', 3); } },
  grid: (x, R) => { R(-42, -8, 84, 8, '#fbf6ec', 3); for (const dx of [-28, -4, 20]) R(dx, -2, 6, 30, '#efe5d3', 2); },
  level: (x, R) => { R(-40, -10, 80, 20, '#3e6c70', 8); R(-12, -6, 24, 12, '#d8f0c8', 6); x.fillStyle = '#fff'; x.beginPath(); x.arc(-2, 0, 4, 0, 7); x.fill(); },
  board: (x, R) => { for (let i = 0; i < 3; i++) R(-34 + i * 6, -26 + i * 8, 52, 40, i === 2 ? '#fffdf7' : '#efe8da', 3); },
  stone: (x, R) => { for (let i = 0; i < 3; i++) R(-34 + i * 6, -26 + i * 8, 52, 40, i === 2 ? '#9a948b' : '#7f7a72', 3); },
  putty: (x, R) => { R(-30, -10, 40, 34, '#cfd8dc', 6); R(4, -30, 34, 14, '#85705f', 4); x.fillStyle = '#fffdf7'; x.beginPath(); x.ellipse(-10, -12, 20, 7, 0, 0, 7); x.fill(); },
  primer: (x, R) => { R(-26, -24, 52, 54, '#f2efe6', 8); R(-26, -10, 52, 16, '#9fd3df', 0); },
  paint: (x, R) => { R(-26, -24, 52, 54, '#f2efe6', 8); R(-26, -10, 52, 16, '#f2c0a4', 0); },
  roller: (x, R) => { R(-36, -30, 56, 18, '#f2c0a4', 8); x.strokeStyle = '#85705f'; x.lineWidth = 4; x.beginPath(); x.moveTo(20, -21); x.lineTo(30, -21); x.lineTo(30, 0); x.lineTo(0, 0); x.lineTo(0, 34); x.stroke(); },
  sand: (x, R) => { R(-34, -16, 68, 32, '#d9b77a', 6); for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(80,60,40,.35)'; x.fillRect(-30 + Math.random() * 60, -12 + Math.random() * 24, 2, 2); } },
  brick: (x, R) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) R(-36 + c * 38 + (r % 2) * 10, -24 + r * 17, 34, 14, '#e4846f', 2); },
  mortar: (x, R) => { R(-30, -6, 60, 30, '#9a948b', 8); x.fillStyle = '#cfc6b6'; x.beginPath(); x.ellipse(0, -6, 30, 10, 0, 0, 7); x.fill(); },
  water: (x, R) => { x.fillStyle = '#7fb6d6'; x.beginPath(); x.moveTo(0, -36); x.bezierCurveTo(24, -6, 24, 30, 0, 30); x.bezierCurveTo(-24, 30, -24, -6, 0, -36); x.fill(); },
  membrane: (x, R) => { R(-34, -28, 68, 56, '#7fb6d6', 6); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; for (let i = -30; i < 34; i += 12) { x.beginPath(); x.moveTo(i, -26); x.lineTo(i + 10, 26); x.stroke(); } },
  tile: (x, R) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) R(-30 + c * 31, -30 + r * 31, 29, 29, r === c ? '#ffffff' : '#cfe7ee', 3); },
  trowel: (x, R) => { x.fillStyle = '#c9ccd0'; x.beginPath(); x.moveTo(-36, 10); x.lineTo(20, -24); x.lineTo(28, -10); x.closePath(); x.fill(); R(22, -6, 8, 30, '#8a5a44', 3); },
  grout: (x, R) => { R(-20, -34, 40, 64, '#efe5d3', 8); R(-20, -10, 40, 18, '#e4846f', 0); },
  toilet: (x, R) => { R(-22, -30, 44, 24, '#fffdf7', 6); R(-26, -4, 52, 18, '#fffdf7', 9); R(-16, 14, 32, 18, '#f3efe6', 4); },
  helmet: (x, R) => { x.fillStyle = '#ffc96b'; x.beginPath(); x.arc(0, 8, 30, Math.PI, 0); x.fill(); R(-40, 4, 80, 8, '#f0ad3e', 4); },
  stud: (x, R) => { for (const dx of [-24, -4, 16]) R(dx, -34, 8, 66, '#c9ccd0', 2); R(-34, -38, 68, 6, '#b5b9bd', 2); R(-34, 30, 68, 6, '#b5b9bd', 2); },
  wool: (x, R) => { R(-34, -24, 68, 48, '#f7d774', 12); x.strokeStyle = 'rgba(160,120,40,.4)'; x.lineWidth = 2; for (let i = -20; i < 24; i += 8) { x.beginPath(); x.moveTo(-30, i); x.quadraticCurveTo(0, i + 6, 30, i); x.stroke(); } },
  screw: (x, R) => { R(-4, -30, 8, 46, '#9a948b', 2); R(-14, -34, 28, 8, '#85705f', 3); },
  glass: (x, R) => { x.fillStyle = 'rgba(127,182,214,.55)'; x.fillRect(-30, -36, 60, 72); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-18, -20); x.lineTo(-4, -32); x.moveTo(-18, -6); x.lineTo(8, -30); x.stroke(); },
  silicone: (x, R) => { R(-36, -8, 56, 18, '#f3efe6', 6); R(18, -4, 20, 10, '#c9ccd0', 3); x.fillStyle = '#fffdf7'; x.beginPath(); x.moveTo(38, 0); x.lineTo(46, -3); x.lineTo(46, 3); x.fill(); },
  wood: (x, R) => { R(-36, -14, 72, 28, '#d6b88c', 4); x.strokeStyle = 'rgba(120,80,40,.35)'; x.lineWidth = 2; for (let i = -10; i < 14; i += 6) { x.beginPath(); x.moveTo(-34, i); x.quadraticCurveTo(0, i + 4, 34, i); x.stroke(); } },
  saw: (x, R) => { x.fillStyle = '#c9ccd0'; x.beginPath(); x.arc(0, 0, 28, 0, 7); x.fill(); x.fillStyle = '#4b3f37'; x.beginPath(); x.arc(0, 0, 6, 0, 7); x.fill(); for (let a = 0; a < 16; a++) { x.save(); x.rotate(a / 16 * Math.PI * 2); x.fillStyle = '#9a948b'; x.beginPath(); x.moveTo(26, -4); x.lineTo(34, 0); x.lineTo(26, 4); x.fill(); x.restore(); } },
  drill: (x, R) => { R(-30, -20, 44, 22, '#3e6c70', 8); R(-14, 0, 16, 32, '#3e6c70', 5); R(14, -14, 22, 6, '#c9ccd0', 2); },
  sprinkler: (x, R) => { R(-4, -36, 8, 30, '#c9ccd0', 2); x.fillStyle = '#c9ccd0'; x.beginPath(); x.ellipse(0, -2, 22, 6, 0, 0, 7); x.fill(); x.fillStyle = '#cf5a43'; x.beginPath(); x.arc(0, 10, 6, 0, 7); x.fill(); },
  smoke: (x, R) => { x.fillStyle = '#fffdf7'; x.beginPath(); x.ellipse(0, 0, 32, 12, 0, 0, 7); x.fill(); x.fillStyle = '#cf5a43'; x.beginPath(); x.arc(0, 0, 4, 0, 7); x.fill(); },
  extinguisher: (x, R) => { R(-14, -20, 28, 54, '#cf5a43', 10); R(-6, -32, 12, 12, '#4b3f37', 2); R(4, -34, 22, 5, '#4b3f37', 2); },
  exit: (x, R) => { R(-36, -16, 72, 32, '#3fa36b', 4); R(-26, -8, 52, 16, '#e3f6e9', 2); },
  curtain: (x, R) => { R(-36, -36, 72, 6, '#85705f', 2); for (let i = 0; i < 6; i++) R(-34 + i * 12, -30, 11, 62, i % 2 ? '#f2c0a4' : '#efb59a', 2); },
  carpet: (x, R) => { R(-36, -20, 72, 40, '#b7c3c6', 6); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.strokeRect(-30, -14, 60, 28); },
  wallpaper: (x, R) => { R(-30, -36, 50, 72, '#f6dcae', 3); x.fillStyle = '#e4846f'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(-18 + (i % 2) * 22, -24 + Math.floor(i / 2) * 22, 4, 0, 7); x.fill(); } R(18, -36, 14, 72, '#efe5d3', 3); },
  glue: (x, R) => { R(-20, -20, 40, 50, '#9fd3df', 8); R(-10, -32, 20, 14, '#3e6c70', 4); },
  desk: (x, R) => { R(-38, -12, 76, 8, '#fbf6ec', 2); R(-34, -4, 6, 34, '#85705f', 1); R(28, -4, 6, 34, '#85705f', 1); R(-14, -36, 30, 22, '#4b3f37', 2); },
  aircon: (x, R) => { R(-38, -16, 76, 30, '#fffdf7', 8); R(-30, 4, 60, 3, '#85705f', 1); },
  sign: (x, R) => { R(-30, -30, 60, 40, '#ffc96b', 4); R(-3, 10, 6, 26, '#85705f', 1); },
  rope: (x, R) => { x.strokeStyle = '#e4846f'; x.lineWidth = 5; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(-38, 0); x.lineTo(38, 0); x.stroke(); x.setLineDash([]); R(-40, -12, 6, 30, '#ffc96b', 2); R(34, -12, 6, 30, '#ffc96b', 2); },
  cut: (x, R) => { x.strokeStyle = '#cf5a43'; x.lineWidth = 6; x.beginPath(); x.moveTo(-24, -24); x.lineTo(24, 24); x.moveTo(24, -24); x.lineTo(-24, 24); x.stroke(); },
  plug: (x, R) => { R(-16, -10, 32, 30, '#fffdf7', 6); R(-8, -26, 4, 16, '#c9ccd0', 1); R(4, -26, 4, 16, '#c9ccd0', 1); x.strokeStyle = '#4b3f37'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 20); x.quadraticCurveTo(0, 36, 30, 34); x.stroke(); },
  ladder: (x, R) => { R(-26, -36, 6, 72, '#3e6c70', 2); R(20, -36, 6, 72, '#3e6c70', 2); for (let i = 0; i < 4; i++) R(-20, -26 + i * 18, 40, 4, '#fbf6ec', 1); },
  mask: (x, R) => { x.fillStyle = '#fffdf7'; x.beginPath(); x.ellipse(0, 4, 30, 20, 0, 0, 7); x.fill(); x.strokeStyle = '#85705f'; x.lineWidth = 3; x.beginPath(); x.moveTo(-30, 0); x.lineTo(-40, -14); x.moveTo(30, 0); x.lineTo(40, -14); x.stroke(); },
  goggles: (x, R) => { R(-36, -10, 72, 22, '#3e6c70', 10); R(-30, -6, 26, 14, '#bfe0ea', 6); R(4, -6, 26, 14, '#bfe0ea', 6); },
  gloves: (x, R) => { R(-24, -18, 48, 40, '#f7d774', 12); for (let i = 0; i < 4; i++) R(-22 + i * 12, -36, 9, 22, '#f7d774', 4); },
  earmuff: (x, R) => { x.strokeStyle = '#4b3f37'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 26, Math.PI, 0); x.stroke(); R(-36, -4, 18, 28, '#cf5a43', 8); R(18, -4, 18, 28, '#cf5a43', 8); },
  doc: (x, R) => { R(-26, -34, 52, 68, '#fffdf7', 3); for (let i = 0; i < 5; i++) R(-18, -24 + i * 11, 36 - (i % 2) * 10, 3, '#c9b89c', 1); },
  stamp: (x, R) => { R(-20, -34, 40, 24, '#85705f', 6); R(-8, -10, 16, 20, '#85705f', 2); R(-26, 10, 52, 16, '#cf5a43', 3); },
  money: (x, R) => { R(-36, -20, 72, 40, '#a9d39b', 4); x.fillStyle = '#5e9a6b'; x.beginPath(); x.arc(0, 0, 12, 0, 7); x.fill(); },
  bag: (x, R) => { R(-26, -20, 52, 50, '#85705f', 10); R(-14, -34, 28, 18, '#6b5a4b', 6); },
  truck: (x, R) => { R(-38, -18, 46, 30, '#5e9a6b', 4); R(8, -6, 28, 18, '#3e6c70', 4); x.fillStyle = '#4b3f37'; x.beginPath(); x.arc(-24, 16, 8, 0, 7); x.arc(22, 16, 8, 0, 7); x.fill(); },
  lamp: (x, R) => { x.fillStyle = '#ffe39a'; x.beginPath(); x.arc(0, 6, 22, 0, 7); x.fill(); R(-6, -36, 12, 22, '#85705f', 2); },
  shield: (x, R) => { x.fillStyle = '#3e6c70'; x.beginPath(); x.moveTo(0, -36); x.lineTo(30, -24); x.lineTo(26, 10); x.lineTo(0, 34); x.lineTo(-26, 10); x.lineTo(-30, -24); x.closePath(); x.fill(); },
};
export function drawIcon(c, name, size = 88, label = '') {
  const x = c.getContext('2d'); x.clearRect(0, 0, size, size); x.save(); x.translate(size / 2, size / 2); x.scale(size / 112, size / 112);
  x.shadowColor = 'rgba(80,60,40,.28)'; x.shadowBlur = 3; x.shadowOffsetY = 2; x.lineCap = 'round'; x.lineJoin = 'round';
  const R = (a, b, w, h, f, r = 4) => { x.fillStyle = f; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); };
  if (typeof name === 'function') name(x, R);
  else if (ICON[name]) ICON[name](x, R);
  else { R(-34, -34, 68, 68, '#efe5d3', 12); x.shadowColor = 'transparent'; x.fillStyle = '#4b3f37'; x.font = `40px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((label || '?').slice(0, 1), 0, 2); }
  x.restore();
}
export const hasIcon = n => !!ICON[n];
