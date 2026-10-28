// 輸入：拖曳空白處轉視角、兩指縮放、點擊場景、從抽屜拖東西進房間。
import { canvas, camT, view, clamp, gsap } from './core.js';
import { initAudio, SFX } from './audio.js';

export const input = { enabled: false, onTap: null };
let drag = null; const pointers = new Map();

canvas.addEventListener('pointerdown', e => {
  if (!input.enabled) return; initAudio();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* 舊瀏覽器 */ }
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: view.zoomT }; return; }
  drag = { type: 'press', x0: e.clientX, y0: e.clientY, th0: camT.theta, ph0: camT.phi, id: e.pointerId };
});
window.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ghost.on) moveGhost(e.clientX, e.clientY);
  if (!drag) return;
  if (drag.type === 'pinch') { if (pointers.size < 2) return; const [a, b] = [...pointers.values()]; view.zoomT = clamp(drag.z0 * drag.d0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), .55, 1.6); return; }
  if (e.pointerId !== drag.id) return;
  if (drag.type === 'press' && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 7) drag.type = 'orbit';
  if (drag.type === 'orbit') {
    camT.theta = clamp(drag.th0 - (e.clientX - drag.x0) * .0065, view.limits.th[0], view.limits.th[1]);
    camT.phi = clamp(drag.ph0 - (e.clientY - drag.y0) * .005, view.limits.ph[0], view.limits.ph[1]);
  }
});
function pointerEnd(e) {
  pointers.delete(e.pointerId); if (!drag) return;
  if (drag.type === 'pinch') { if (!pointers.size) drag = null; return; }
  if (e.pointerId !== drag.id) return;
  if (drag.type === 'press' && input.onTap) input.onTap(e.clientX, e.clientY);
  drag = null;
}
window.addEventListener('pointerup', e => { pointerEnd(e); if (ghost.on) dropGhost(e); });
window.addEventListener('pointercancel', e => { pointerEnd(e); if (ghost.on) cancelGhost(); });
canvas.addEventListener('wheel', e => { if (!input.enabled) return; e.preventDefault(); view.zoomT = clamp(view.zoomT * Math.exp(e.deltaY * .0012), .55, 1.6); }, { passive: false });

/* ---------- 從抽屜拖出來的紙片 ---------- */
const gEl = document.getElementById('ghost');
const ghost = { on: false, btn: null, onDrop: null, blockEl: null };
export function startGhost(e, btn, draw, onDrop, blockEl) {
  ghost.on = true; ghost.btn = btn; ghost.onDrop = onDrop; ghost.blockEl = blockEl;
  btn.classList.add('lift'); draw(gEl, 128); gEl.classList.remove('hidden'); moveGhost(e.clientX, e.clientY); SFX.pick();
  gsap.fromTo(gEl, { scale: .4 }, { scale: 1, duration: .35, ease: 'back.out(2)' });
}
function moveGhost(x, y) { gEl.style.left = x + 'px'; gEl.style.top = y + 'px'; }
function overEl(el, x, y) { if (!el) return false; const r = el.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; }
function dropGhost(e) { const fn = ghost.onDrop, blocked = overEl(ghost.blockEl, e.clientX, e.clientY); cancelGhost(); if (!blocked && fn) fn(e.clientX, e.clientY); }
function cancelGhost() { ghost.on = false; gEl.classList.add('hidden'); if (ghost.btn) ghost.btn.classList.remove('lift'); ghost.btn = null; ghost.onDrop = null; }
