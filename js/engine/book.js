// 立體書：封面、書頁、翻頁。書頁印施工圖的方格紙，案子的房間就立在攤開的兩頁上。
import { THREE, scene, gsap, rand, clamp, FONT, wait } from './core.js';
import { paperCanvas, canvasTex, mk } from './paper.js';
import { SFX } from './audio.js';

export const COVER_T = .16, PAGES_T = .6, PAGE_Y = COVER_T + PAGES_T, PAGE_W = 7.8, PAGE_D = 11;

const edgeC = document.createElement('canvas'); edgeC.width = 64; edgeC.height = 64;
{ const x = edgeC.getContext('2d'); x.fillStyle = '#f7efdf'; x.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 3) { x.fillStyle = `rgba(150,125,95,${rand(.12, .3)})`; x.fillRect(0, y, 64, 1); } }
const edgeTex = canvasTex(edgeC); edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping; edgeTex.repeat.set(4, 4);
const clothC = document.createElement('canvas'); clothC.width = clothC.height = 128;
{ const x = clothC.getContext('2d'); x.fillStyle = '#c96a56'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(255,255,255,${rand(.02, .06)})`; x.fillRect(0, i, 128, 1); x.fillStyle = `rgba(0,0,0,${rand(.03, .07)})`; x.fillRect(i, 0, 1, 128); } }
const clothTex = canvasTex(clothC); clothTex.wrapS = clothTex.wrapT = THREE.RepeatWrapping; clothTex.repeat.set(3, 3);
const clothMat = new THREE.MeshLambertMaterial({ map: clothTex });
const pageMat = new THREE.MeshLambertMaterial({ color: 0xfbf4e6, map: canvasTex(paperCanvas) });
const pageEdgeMat = new THREE.MeshLambertMaterial({ map: edgeTex });

const coverC = document.createElement('canvas'); coverC.width = 720; coverC.height = 1030;
const coverTex = canvasTex(coverC); coverTex.center.set(.5, .5); coverTex.rotation = Math.PI;
export function drawCover() {
  const x = coverC.getContext('2d'), W = 720, H = 1030; x.drawImage(clothC, 0, 0, W, H); x.fillStyle = 'rgba(80,30,20,.18)'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#f6dcae'; x.lineWidth = 4; x.strokeRect(34, 34, W - 68, H - 68); x.lineWidth = 1.5; x.strokeRect(48, 48, W - 96, H - 96);
  x.fillStyle = '#fff3dc'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `128px ${FONT}`; x.fillText('開工！', W / 2, 210);
  x.font = `30px ${FONT}`; x.fillStyle = '#f6dcae'; x.fillText('— 一本會蓋房子的立體書 —', W / 2, 320);
  x.save(); x.translate(W / 2, 640); x.fillStyle = '#fbf6ec'; x.beginPath(); x.moveTo(-170, 120); x.lineTo(-170, -40); x.lineTo(0, -170); x.lineTo(170, -40); x.lineTo(170, 120); x.closePath(); x.fill();
  x.fillStyle = '#ffc96b'; x.fillRect(-60, 0, 120, 120); x.fillStyle = '#3e6c70'; x.fillRect(-150, 120, 300, 18); x.restore();
  x.fillStyle = '#f6dcae'; x.font = `30px ${FONT}`; x.fillText('乙級 · 室內裝修工程管理', W / 2, 935); coverTex.needsUpdate = true;
}
const coverMat = new THREE.MeshLambertMaterial({ map: coverTex });

// 書頁：方格施工圖紙
const planC = document.createElement('canvas'); planC.width = 1024; planC.height = 720;
{
  const x = planC.getContext('2d'); x.fillStyle = '#f6f1e6'; x.fillRect(0, 0, 1024, 720); x.globalAlpha = .55;
  for (let i = 0; i < 4; i++) x.drawImage(paperCanvas, (i % 2) * 512, (i >> 1) * 512, 512, 512); x.globalAlpha = 1;
  x.strokeStyle = 'rgba(62,108,112,.16)'; x.lineWidth = 1;
  for (let k = 0; k <= 1024; k += 32) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 720); x.stroke(); }
  for (let k = 0; k <= 720; k += 32) { x.beginPath(); x.moveTo(0, k); x.lineTo(1024, k); x.stroke(); }
  x.strokeStyle = 'rgba(62,108,112,.28)'; x.lineWidth = 2;
  for (let k = 0; k <= 1024; k += 160) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 720); x.stroke(); }
  for (let k = 0; k <= 720; k += 160) { x.beginPath(); x.moveTo(0, k); x.lineTo(1024, k); x.stroke(); }
}
function planTex(rx, ox) { const t = canvasTex(planC); t.repeat.set(rx, 1); t.offset.set(ox, 0); return t; }
const gutC = document.createElement('canvas'); gutC.width = 64; gutC.height = 4;
{ const x = gutC.getContext('2d'); const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(30,40,60,.3)'); g.addColorStop(1, 'rgba(30,40,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 4); }
const gutTex = canvasTex(gutC);

const book = new THREE.Group(); scene.add(book);
const rightHalf = new THREE.Group(); book.add(rightHalf);
{
  const cv = mk(new THREE.BoxGeometry(PAGE_W + .3, COVER_T, PAGE_D + .5), clothMat); cv.position.set((PAGE_W + .3) / 2, COVER_T / 2, 0); rightHalf.add(cv);
  const pg = mk(new THREE.BoxGeometry(PAGE_W, PAGES_T, PAGE_D), [pageEdgeMat, pageEdgeMat, pageMat, pageMat, pageEdgeMat, pageEdgeMat]); pg.position.set(PAGE_W / 2 + .02, COVER_T + PAGES_T / 2, 0); rightHalf.add(pg);
  const pl = mk(new THREE.PlaneGeometry(PAGE_W, PAGE_D), new THREE.MeshLambertMaterial({ map: planTex(.5, .5) }), false, true); pl.rotation.x = -Math.PI / 2; pl.position.set(PAGE_W / 2 + .02, PAGE_Y + .004, 0); rightHalf.add(pl);
  const gt = mk(new THREE.PlaneGeometry(1.1, PAGE_D), new THREE.MeshBasicMaterial({ map: gutTex, transparent: true, depthWrite: false }), false, false); gt.rotation.x = -Math.PI / 2; gt.position.set(.57, PAGE_Y + .016, 0); rightHalf.add(gt);
  const sp = mk(new THREE.BoxGeometry(.7, COVER_T * .9, PAGE_D + .5), clothMat); sp.position.set(0, COVER_T * .45, 0); book.add(sp);
}
const leftHalf = new THREE.Group(); leftHalf.position.set(0, PAGE_Y, 0); book.add(leftHalf);
{
  const pg = mk(new THREE.BoxGeometry(PAGE_W, PAGES_T, PAGE_D), [pageEdgeMat, pageEdgeMat, pageMat, pageMat, pageEdgeMat, pageEdgeMat]); pg.position.set(-PAGE_W / 2 - .02, -PAGES_T / 2, 0); leftHalf.add(pg);
  const cv = mk(new THREE.BoxGeometry(PAGE_W + .3, COVER_T, PAGE_D + .5), [clothMat, clothMat, clothMat, coverMat, clothMat, clothMat]); cv.position.set(-(PAGE_W + .3) / 2, -PAGES_T - COVER_T / 2, 0); leftHalf.add(cv);
  const pl = mk(new THREE.PlaneGeometry(PAGE_W, PAGE_D), new THREE.MeshLambertMaterial({ map: planTex(.5, 0) }), false, true); pl.rotation.x = -Math.PI / 2; pl.position.set(-PAGE_W / 2 - .02, .004, 0); leftHalf.add(pl);
  const gt = mk(new THREE.PlaneGeometry(1.1, PAGE_D), new THREE.MeshBasicMaterial({ map: gutTex, transparent: true, depthWrite: false }), false, false); gt.rotation.x = -Math.PI / 2; gt.rotation.z = Math.PI; gt.position.set(-.57, .016, 0); leftHalf.add(gt);
}
leftHalf.rotation.z = -Math.PI;

// 扉頁：翻書時第一張紙寫書名
const titleC = document.createElement('canvas'); titleC.width = 512; titleC.height = 720;
const sheetTitleTex = canvasTex(titleC);
export function drawTitlePage() {
  const x = titleC.getContext('2d'); x.fillStyle = '#fbf4e6'; x.fillRect(0, 0, 512, 720); x.globalAlpha = .6; x.drawImage(paperCanvas, 0, 0, 512, 512); x.drawImage(paperCanvas, 0, 400, 512, 512); x.globalAlpha = 1;
  x.fillStyle = '#4b3f37'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `72px ${FONT}`; x.fillText('開工！', 256, 250);
  x.font = `22px ${FONT}`; x.fillStyle = '#85705f'; x.fillText('翻開之後，房子會自己站起來', 256, 320);
  x.strokeStyle = '#d9c7aa'; x.lineWidth = 2; x.strokeRect(30, 30, 452, 660); sheetTitleTex.needsUpdate = true;
}

const SHEET_N = 18;
function makeSheet(front) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array((SHEET_N + 1) * 2 * 3), uv = new Float32Array((SHEET_N + 1) * 2 * 2), idx = [];
  for (let i = 0; i <= SHEET_N; i++) { const s = i / SHEET_N; uv.set([s, 1, s, 0], i * 4); if (i < SHEET_N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const g = new THREE.Group();
  g.add(mk(geo, front ? new THREE.MeshLambertMaterial({ map: sheetTitleTex }) : pageMat, true, true), mk(geo, new THREE.MeshLambertMaterial({ map: planTex(-.5, .5), side: THREE.BackSide }), false, true));
  g.userData.geo = geo; g.visible = false; scene.add(g); return g;
}
const sheets = [makeSheet(true), makeSheet(false), makeSheet(false)];
// p：0＝平放在右頁，1＝翻到左頁；dir=-1 時從左翻回右
function setSheet(sh, p, k) {
  const geo = sh.userData.geo, pos = geo.attributes.position.array; const th0 = p * Math.PI, bend = Math.sin(p * Math.PI) * 1.1, ds = PAGE_W / SHEET_N; let x = 0, y = 0;
  for (let i = 0; i <= SHEET_N; i++) {
    const s = i / SHEET_N; if (i > 0) { const ang = clamp(th0 - bend * s, 0, Math.PI); x += Math.cos(ang) * ds; y += Math.sin(ang) * ds; }
    const yy = PAGE_Y + .012 + (2 - k) * .004 + y; pos.set([x, yy, -PAGE_D / 2 + .05, x, yy, PAGE_D / 2 - .05], i * 6);
  }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}
sheets.forEach((s, k) => setSheet(s, 0, k));

export const bookState = { open: false };
export async function openBook() {
  sheets.forEach((s, k) => { s.visible = true; setSheet(s, 0, k); });
  SFX.flip(1);
  await new Promise(r => gsap.to(leftHalf.rotation, { z: 0, duration: 1.3, ease: 'power2.inOut', onComplete: r }));
  SFX.pop(.6);
  await flipPages(3, 1);
  bookState.open = true;
}
// 翻 n 張紙（dir 1：往左翻，換到下一個案子）
export async function flipPages(n = 2, dir = 1) {
  const list = sheets.slice(0, n);
  list.forEach((s, k) => { s.visible = true; setSheet(s, dir > 0 ? 0 : 1, k); });
  for (let k = 0; k < list.length; k++) {
    const sh = list[k], o = { p: dir > 0 ? 0 : 1 };
    setTimeout(() => SFX.flip(.8), k * 230);
    gsap.to(o, { p: dir > 0 ? 1 : 0, duration: .62, delay: k * .23, ease: 'power1.inOut', onUpdate: () => setSheet(sh, o.p, k), onComplete: () => { sh.visible = false; } });
  }
  await wait(.23 * (list.length - 1) + .66);
}
