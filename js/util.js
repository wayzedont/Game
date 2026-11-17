// ---------- Утилиты ----------
const R = {
  f: (a, b) => a + Math.random() * (b - a),
  i: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  shuffle: (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  digits: (n) => Array.from({ length: n }, () => R.i(0, 9)).join(''),
  weighted: (pairs) => {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
    return pairs[pairs.length - 1][0];
  },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const money = (n) => '$' + Math.round(n).toLocaleString('ru-RU');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let _uid = 0;
const uid = (p = 'u') => p + (++_uid) + '_' + Math.floor(Math.random() * 1e6);

function el(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  if (html) e.innerHTML = html;
  return e;
}

// ---------- Звук (WebAudio, без файлов) ----------
const Sfx = {
  ctx: null,
  muted: false,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  tone(freq, dur = 0.1, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur = 0.08, vol = 0.08, hp = 1500) {
    if (this.muted || !this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.ctx.destination);
    s.start();
  },
  click() { this.tone(900, 0.04, 'square', 0.05); },
  tick() { this.tone(1400, 0.025, 'square', 0.035); },
  boot() { [196, 262, 392, 523, 784].forEach((f, i) => this.tone(f, 1.6 - i * 0.2, 'sine', 0.07, 0, i * 0.12)); this.tone(98, 2, 'triangle', 0.08); },
  coin() { this.tone(1320, 0.08, 'square', 0.07); this.tone(1760, 0.18, 'square', 0.07, 0, 0.07); },
  cash() { this.noise(0.12, 0.1, 3000); this.coin(); },
  bad() { this.tone(220, 0.25, 'sawtooth', 0.09, -80); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.1, 0, i * 0.08)); },
  bell() { this.tone(1568, 0.6, 'sine', 0.12); this.tone(2093, 0.5, 'sine', 0.06, 0, 0.02); },
  scrub() { this.noise(0.05, 0.03, 2500); },
  screw() { this.tone(300, 0.05, 'square', 0.04, 200); },
  pop() { this.tone(500, 0.08, 'sine', 0.1, 400); },
  siren() { for (let i = 0; i < 4; i++) { this.tone(700, 0.25, 'sawtooth', 0.05, 300, i * 0.5); this.tone(1000, 0.25, 'sawtooth', 0.05, -300, i * 0.5 + 0.25); } },
  zap() { this.tone(80, 0.3, 'sawtooth', 0.05, 40); },
  thud() { this.tone(120, 0.15, 'sine', 0.2, -60); },
};
