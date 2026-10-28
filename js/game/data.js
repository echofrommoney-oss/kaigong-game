// 題庫與工法：讀 data/questions.json、data/topics.json。
// 每題都有一條「工法」（筆記裡的一個重點），答完題、做完動作都會收進工法手冊。
export const GROUPS = [
  ['01', '圖說判讀'], ['02', '丈量及放樣'], ['03', '相關法規'], ['04', '安全維護'], ['05', '施工機具'], ['06', '相關施工作業'], ['07', '裝修工程管理'],
  ['90006', '職業安全衛生'], ['90007', '工作倫理與職業道德'], ['90008', '環境保護'], ['90009', '節能減碳'],
];
export const GNAME = Object.fromEntries(GROUPS);
export const D = { Q: [], byId: {}, topics: {}, byTopic: {}, ruleKeyOf: {}, rulesOfQ: {}, rules: {} };

export async function loadData() {
  const [q, t] = await Promise.all([fetch('data/questions.json').then(r => r.json()), fetch('data/topics.json').then(r => r.json())]);
  D.Q = q.map(x => ({ ...x, ans: x.a.split('').map(Number), multi: x.a.length > 1 }));
  for (const x of D.Q) { D.byId[x.id] = x; (D.byTopic[x.t] = D.byTopic[x.t] || []).push(x); }
  D.topics = t;
  for (const [key, tp] of Object.entries(t)) tp.rules.forEach(([text, ids], i) => {
    const rk = key + '#' + i; D.rules[rk] = { key: rk, topic: key, text, ids };
    for (const id of ids) { if (!D.ruleKeyOf[id]) D.ruleKeyOf[id] = rk; (D.rulesOfQ[id] = D.rulesOfQ[id] || []).push(rk); }
  });
  return D;
}
// 一題對應的工法（筆記重點）
export function ruleOf(qid) { return D.rules[D.ruleKeyOf[qid]]; }
// 一題可能出現在好幾條重點裡：全部列出（題號也可以直接寫成「主題#第幾條」指定某一條）
export function rulesOf(ref) { if (ref.includes('#')) return D.rules[ref] ? [D.rules[ref]] : []; return (D.rulesOfQ[ref] || []).map(k => D.rules[k]); }
export function poolOf(topicKeys) { const out = []; for (const k of topicKeys) out.push(...(D.byTopic[k] || [])); return out; }
export function topicName(key) { const t = D.topics[key]; return t ? t.name : key; }
export function groupOfTopic(key) { return key.split('/')[0]; }
