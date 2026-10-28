// 合成音效（Web Audio），不用任何音檔。紙上小島的翻頁、彈出、紙團聲，加上工地的敲擊、電鑽、錯誤音。
import { rand } from './core.js';

const AU = { ctx: null, master: null, noise: null, rev: null, on: true };
export function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); AU.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(ctx.destination);
    AU.master = ctx.createGain(); AU.master.gain.value = AU.on ? .9 : 0; AU.master.connect(comp);
    const len = ctx.sampleRate * 2; const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
    const dl = ctx.createDelay(1); dl.delayTime.value = .23; const fb = ctx.createGain(); fb.gain.value = .33;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; const rin = ctx.createGain(); rin.gain.value = .5;
    rin.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(AU.master); AU.rev = rin;
  } catch (e) { AU.ctx = null; }
}
export function setSound(on) { AU.on = on; if (AU.master) AU.master.gain.setTargetAtTime(on ? .9 : 0, AU.ctx.currentTime, .05); }
const now = () => AU.ctx.currentTime;
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noiseSrc(dur, t) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.start(t, Math.random() * 1.5, dur + .05); return s; }
function tone(type, f0, f1, t, a, peak, dec, dest) { const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + dec); env(g, t, a, peak, dec); o.connect(g); g.connect(dest || AU.master); o.start(t); o.stop(t + a + dec + .05); return g; }

export const SFX = {
  flip(v = 1) { if (!AU.ctx) return; const t = now(), s = noiseSrc(.45, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + .22); f.frequency.exponentialRampToValueAtTime(900, t + .4); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32 * v, t + .08); g.gain.exponentialRampToValueAtTime(.12 * v, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + .42); s.connect(f); f.connect(g); g.connect(AU.master); },
  pop(p = 1) { if (!AU.ctx) return; const t = now(); const s = noiseSrc(.05, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'highpass'; f.frequency.value = 1800; env(g, t, .002, .45, .045); s.connect(f); f.connect(g); g.connect(AU.master); tone('triangle', 260 * p, 80 * p, t, .004, .38, .13); },
  pick() { if (!AU.ctx) return; const t = now(), s = noiseSrc(.15, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.5; env(g, t, .02, .16, .12); s.connect(f); f.connect(g); g.connect(AU.master); },
  crumple() { if (!AU.ctx) return; const t0 = now(); for (let k = 0; k < 7; k++) { const t = t0 + rand(0, .28), s = noiseSrc(.04, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'bandpass'; f.frequency.value = rand(900, 3500); f.Q.value = 2; env(g, t, .002, rand(.08, .2), .035); s.connect(f); f.connect(g); g.connect(AU.master); } },
  thud(v = 1) { if (!AU.ctx) return; const t = now(), s = noiseSrc(.25, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 380; env(g, t, .005, .6 * v, .22); s.connect(f); f.connect(g); g.connect(AU.master); tone('sine', 110, 45, t, .004, .4 * v, .2); },
  tick() { if (!AU.ctx) return; tone('sine', 900, 500, now(), .002, .12, .07); },
  bad() { if (!AU.ctx) return; const t = now(); tone('triangle', 330, 0, t, .01, .18, .25); tone('triangle', 247, 0, t + .12, .01, .18, .25); },
  good() { if (!AU.ctx) return; const t = now(); tone('triangle', 784, 0, t, .005, .14, .25); tone('triangle', 1175, 0, t + .08, .005, .12, .35); },
  chime() { if (!AU.ctx) return; const notes = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093]; const t0 = now(); notes.slice().sort(() => Math.random() - .5).slice(0, 5).forEach((f, k) => { const t = t0 + k * .11; for (const [m, a] of [[1, .14], [2.76, .045]]) { const g = tone('sine', f * m, 0, t, .004, a, m === 1 ? 2.2 : 1); g.connect(AU.rev); } }); },
  creak() { if (!AU.ctx) return; const t = now(), o = AU.ctx.createOscillator(), g = AU.ctx.createGain(), f = AU.ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(70, t + .6); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 8; env(g, t, .05, .2, .6); o.connect(f); f.connect(g); g.connect(AU.master); o.start(t); o.stop(t + .8); },
  drill() { if (!AU.ctx) return; const t = now(), o = AU.ctx.createOscillator(), g = AU.ctx.createGain(), f = AU.ctx.createBiquadFilter(); o.type = 'square'; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(190, t + .5); f.type = 'lowpass'; f.frequency.value = 1400; env(g, t, .03, .12, .5); o.connect(f); f.connect(g); g.connect(AU.master); o.start(t); o.stop(t + .6); },
  splash() { if (!AU.ctx) return; const t = now(), s = noiseSrc(.5, t), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(400, t + .4); env(g, t, .01, .25, .4); s.connect(f); f.connect(g); g.connect(AU.master); },
  coin() { if (!AU.ctx) return; const t = now(); tone('square', 988, 0, t, .002, .06, .08); tone('square', 1319, 0, t + .07, .002, .06, .2); },
  whistle() { if (!AU.ctx) return; const t = now(), o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(2200, t); for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(k % 2 ? 2200 : 2500, t + k * .05); env(g, t, .01, .12, .4); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + .5); },
};
