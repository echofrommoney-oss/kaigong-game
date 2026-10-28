// 存檔、間隔複習、涵蓋率、預估分數、進度碼。
import { D, GROUPS, poolOf } from './data.js';

const KEY = 'kaigong-full-v1';
// 版本：題庫換版時改這裡，對應題號的熟練度會清掉（例如 116 年共同科目換版）
export const BANK_VERSION = { '90006': 'V114101518', '90007': 'V114090117' };
function fresh() { return { v: 1, qs: {}, rules: {}, run: 0, money: 300000, rep: 50, jobs: {}, sound: true, sprints: 0, bank: { ...BANK_VERSION }, first: true }; }
export let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch (e) { /* 私密視窗等情況：不存也能玩 */ }
for (const [g, ver] of Object.entries(BANK_VERSION)) if (S.bank[g] !== ver) { for (const k of Object.keys(S.qs)) if (k.startsWith(g + '-')) delete S.qs[k]; S.bank[g] = ver; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 存不了就算了 */ } }
export function reset() { S = fresh(); save(); }

// 盒子 0–5，間隔以「完成幾個案子或衝刺」計
const INT = [1, 1, 2, 4, 8, 16];
export function record(q, ok) {
  const r = S.qs[q.id] || [-1, 0, 0, 0]; r[2]++;
  if (ok) { r[3]++; r[0] = Math.min(5, Math.max(0, r[0]) + 1); r[1] = S.run + INT[r[0]]; }
  else { r[0] = 0; r[1] = S.run + 1; }
  S.qs[q.id] = r; save();
}
export function learnRule(rk) { if (rk && !S.rules[rk]) { S.rules[rk] = 1; save(); return true; } return false; }

// 從題池挑 n 題：到期該複習的 → 沒見過的 → 還不熟的 → 其他；同級隨機
export function pickFrom(pool, n, exclude = new Set()) {
  const pr = q => { const r = S.qs[q.id]; if (r && r[0] >= 0 && r[1] <= S.run) return r[0]; if (!r) return 10; if (r[0] < 3) return 20 + r[0]; return 30 + r[0] + (r[1] - S.run); };
  const list = pool.filter(q => !exclude.has(q.id)).map(q => [pr(q) + Math.random() * .9, q]);
  list.sort((a, b) => a[0] - b[0]); return list.slice(0, n).map(x => x[1]);
}
export function stat(pool) { let seen = 0, good = 0; for (const q of pool) { const r = S.qs[q.id]; if (r) { seen++; if (r[0] >= 3) good++; } } return { n: pool.length, seen, good }; }
export function groupPool(code) { return D.Q.filter(q => q.c === code); }

// 預估學科分數：12600 七項依題庫題數比例分 80%，共同科目各 5%
const P = [.35, .55, .7, .85, .92, .97];
function pq(q) { const r = S.qs[q.id]; if (!r || r[0] < 0) return q.multi ? .07 : .25; return P[r[0]]; }
export function readiness() {
  const own = GROUPS.slice(0, 7).map(([g]) => groupPool(g)); const tot = own.reduce((s, a) => s + a.length, 0); let s = 0;
  own.forEach(a => { s += .8 * a.length / tot * a.reduce((t, q) => t + pq(q), 0) / a.length; });
  for (const [g] of GROUPS.slice(7)) { const a = groupPool(g); s += .05 * a.reduce((t, q) => t + pq(q), 0) / a.length; }
  return Math.round(s * 100);
}

// 進度碼：換手機時用。題目熟練度用 a–f（盒子）與 -（沒見過）的連續壓縮字串
export function exportCode() {
  let s = '', prev = null, c = 0;
  D.Q.forEach(q => { const r = S.qs[q.id]; const ch = r ? 'abcdef'[Math.max(0, r[0])] : '-'; if (ch === prev) c++; else { if (prev !== null) s += prev + (c > 1 ? c : ''); prev = ch; c = 1; } });
  s += prev + (c > 1 ? c : '');
  const o = { s, m: S.money, r: S.rep, j: S.jobs, u: Object.keys(S.rules), n: S.run, b: S.bank };
  return 'KG1.' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function importCode(code) {
  const o = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/^KG1\./, '')))));
  const n = fresh(); n.money = o.m; n.rep = o.r; n.jobs = o.j || {}; n.run = o.n || 0; n.first = false;
  const arr = []; o.s.replace(/([a-f-])(\d*)/g, (_, ch, k) => { for (let i = 0; i < (k ? +k : 1); i++) arr.push(ch); });
  arr.forEach((ch, i) => { const q = D.Q[i]; if (q && ch !== '-') { const b = 'abcdef'.indexOf(ch); n.qs[q.id] = [b, n.run + INT[b], 1, b]; } });
  (o.u || []).forEach(k => { if (D.rules[k]) n.rules[k] = 1; });
  const sameBank = o.b && Object.entries(BANK_VERSION).every(([g, v]) => o.b[g] === v);
  if (!sameBank) for (const g of Object.keys(BANK_VERSION)) for (const k of Object.keys(n.qs)) if (k.startsWith(g + '-')) delete n.qs[k];
  S = n; save(); return S;
}
export { poolOf };
