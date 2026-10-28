// 案子清單。每個案子的 topics 由各站與事件的題池自動合併；每一題都要落在某一個案子裡（main.js 開機時會檢查）。
import job1 from './job1.js';
import job2 from './job2.js';
import job3 from './job3.js';
import job4 from './job4.js';
export const JOBS = [job1, job2, job3, job4].filter(j => j && j.stations && j.stations.length);
for (const j of JOBS) j.topics = [...new Set([...j.stations.flatMap(s => s.topics), ...(j.events || []).flatMap(e => e.topics)])];
