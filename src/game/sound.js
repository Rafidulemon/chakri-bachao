// Synthesized sound effects (Web Audio), so there are no audio files to download or license.
// The browser only allows audio after a tap/click, so call sfx.unlock() from a user gesture.
let V = 1;                 // volume scale for the sound being played (distance, impact strength)
const last = {};           // last play time per sound, to stop fast repeats from stacking
let ctx = null, master = null, muted = false, ambOn = false, ambTimer = 0, noiseBuf = null;
try { muted = localStorage.getItem('cb-muted') === '1'; } catch (e) {}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.7;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (!muted) ctx.resume();
  });
  return ctx;
}

// one oscillator note with a quick attack and exponential decay
function tone(freq, dur, { type = 'sine', vol = 0.25, at = 0, to = null } = {}) {
  if (!ensure() || muted) return;
  vol *= V;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

// filtered noise burst (footsteps, door slide, key clacks)
function noise(dur, { freq = 800, q = 1, type = 'lowpass', vol = 0.3, at = 0, to = null, pan = 0 } = {}) {
  if (!ensure() || muted) return;
  vol *= V;
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

// very short broadband click: the contact itself
function click(vol) { noise(0.012, { freq: 2500, type: 'highpass', vol }); }
// a fixed-pitch resonance that decays in `dec` seconds
function ring(freq, dec, vol, at = 0) { tone(freq, dec, { type: 'sine', vol, at }); }
// low body of an impact
function thud(freq, dec, vol, at = 0) { tone(freq, dec, { type: 'sine', vol, at }); noise(dec, { freq: freq * 3, vol: vol * 0.5, at }); }

// Real recordings. A sound listed here uses its file(s) instead of the synthesized version (several files = random variant).
// Any file named public/sounds/<soundName>.mp3/.wav/.ogg is also picked up automatically.
const FILES = {
  poolBreak: { gain: 0.85, files: ['break_sound.mp3'] },
  poolPocket: { gain: 0.75, files: ['one_ball.mp3'] },
  carromStrike: { gain: 0.9, files: ['carrom/strike1.wav', 'carrom/strike2.wav', 'carrom/strike3.wav', 'carrom/strike4.wav'] },
  carromHit: { gain: 0.55, files: ['carrom/hit1.wav', 'carrom/hit2.wav', 'carrom/hit3.wav', 'carrom/hit4.wav'] }
};
const samples = {};   // name -> { gain, bufs: AudioBuffer[] }
let samplesLoading = false;
async function fetchBuf(path) {
  try {
    const r = await fetch('/sounds/' + path);
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('audio')) return null;
    return await ctx.decodeAudioData(await r.arrayBuffer());
  } catch (e) { return null; }   // missing or undecodable: keep the synthesized sound
}
async function loadSamples() {
  if (samplesLoading || !ensure()) return;
  samplesLoading = true;
  const names = new Set([...Object.keys(SOUNDS), ...Object.keys(FILES)]);
  for (const name of names) {
    const f = FILES[name];
    const paths = f ? f.files : ['mp3', 'wav', 'ogg'].map(x => `${name}.${x}`);
    const bufs = [];
    for (const path of paths) { const b = await fetchBuf(path); if (b) { bufs.push(b); if (!f) break; } }
    if (bufs.length) samples[name] = { gain: f ? f.gain : 0.9, bufs };
  }
}
function playSample(smp) {
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = smp.bufs[Math.floor(Math.random() * smp.bufs.length)];
  s.playbackRate.value = 0.96 + Math.random() * 0.08; g.gain.value = V * smp.gain;
  s.connect(g); g.connect(master); s.start();
}

// one vehicle driving past: engine (sawtooth + optional sub-octave) falling in pitch, road/tyre noise, loudness swelling then fading
function pass({ dur, f0, f1, lp, vol, hiss, amp, sub = false, rattle = false, buzz = false }) {
  if (!ensure() || muted) return;
  vol *= V; hiss *= V; amp *= V;
  const t = ctx.currentTime, pk = dur * 0.42;
  const out = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(1, t + pk);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (pan) { const side = Math.random() < 0.5 ? -1 : 1; pan.pan.setValueAtTime(0.7 * side, t); pan.pan.linearRampToValueAtTime(-0.7 * side, t + dur); out.connect(pan); pan.connect(master); }
  else out.connect(master);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(out);
  const eng = (hz0, hz1, v, type) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(hz0, t); o.frequency.exponentialRampToValueAtTime(hz1, t + dur);
    g.gain.value = v; o.connect(g); g.connect(f); o.start(t); o.stop(t + dur + 0.05);
    if (buzz) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 38; lg.gain.value = v * 0.6; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + dur + 0.05); }
  };
  eng(f0, f1, amp * 0.5, 'sawtooth');
  if (sub) eng(f0 / 2, f1 / 2, amp * 0.6, 'sine');
  const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf; n.loop = true; nf.type = 'bandpass'; nf.frequency.setValueAtTime(500, t); nf.frequency.exponentialRampToValueAtTime(1400, t + pk); nf.frequency.exponentialRampToValueAtTime(400, t + dur); nf.Q.value = 0.8;
  ng.gain.value = vol * 1.2; n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(t + dur + 0.05);
  if (hiss) { const h = ctx.createBufferSource(), hf = ctx.createBiquadFilter(), hg = ctx.createGain(); h.buffer = noiseBuf; h.loop = true; hf.type = 'highpass'; hf.frequency.value = 4000; hg.gain.value = hiss; h.connect(hf); hf.connect(hg); hg.connect(out); h.start(t, Math.random()); h.stop(t + dur + 0.05); }
  if (rattle) { const r = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rg = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); r.buffer = noiseBuf; r.loop = true; rf.type = 'bandpass'; rf.frequency.value = 220; rf.Q.value = 2; rg.gain.value = 0; lfo.frequency.value = 17; lg.gain.value = vol * 0.9; lfo.connect(lg); lg.connect(rg.gain); r.connect(rf); rf.connect(rg); rg.connect(out); r.start(t, Math.random()); r.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05); }
}

const SOUNDS = {
  click: () => tone(880, 0.06, { type: 'triangle', vol: 0.12 }),
  step: () => noise(0.09, { freq: 260 + Math.random() * 120, vol: 0.28 }),
  run: () => noise(0.07, { freq: 340 + Math.random() * 140, vol: 0.34 }),
  fail: () => { tone(220, 0.22, { type: 'sawtooth', vol: 0.16, to: 150 }); tone(165, 0.32, { type: 'sawtooth', vol: 0.16, at: 0.2, to: 100 }); },
  ok: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.2, at: i * 0.1 })),
  scan: () => { for (let i = 0; i < 5; i++) tone(700 + i * 90, 0.08, { type: 'square', vol: 0.06, at: i * 0.25 }); },
  beep: () => { tone(1320, 0.12, { type: 'sine', vol: 0.22 }); tone(1760, 0.2, { type: 'sine', vol: 0.22, at: 0.14 }); },
  btn: () => { tone(1000, 0.08, { type: 'square', vol: 0.1 }); tone(1000, 0.08, { type: 'square', vol: 0.1, at: 0.12 }); },
  door: () => { noise(0.7, { freq: 300, to: 1400, q: 2, type: 'bandpass', vol: 0.35 }); tone(110, 0.5, { type: 'sine', vol: 0.12, to: 70 }); },
  pop: () => tone(520, 0.1, { type: 'sine', vol: 0.15, to: 900 }),

  // Impact sounds are modelled the way real ones work: a very short click, then a few
  // fixed-pitch resonances that die away quickly (no pitch glide, which is what sounds like a beep).
  // pool: hard resin balls, felt cushions, leather pockets
  poolHit: () => { const k = 0.96 + Math.random() * 0.08, br = 0.55 + 0.45 * V;
    click(0.5 * br); ring(2650 * k, 0.05, 0.3 * br); ring(4400 * k, 0.03, 0.2 * br); ring(6500 * k, 0.015, 0.1 * br);
    ring(1250 * k, 0.04, 0.16); thud(240, 0.03, 0.2); },
  // vehicles passing the road below the balcony; pitch drops as they go by (Doppler)
  carPass: () => pass({ dur: 1.7, f0: 150, f1: 100, lp: 700, vol: 0.2, hiss: 0.07, amp: 0.34 }),
  busPass: () => { pass({ dur: 3.0, f0: 78, f1: 56, lp: 480, vol: 0.3, hiss: 0.05, amp: 0.4, sub: true });
    noise(0.7, { freq: 4200, type: 'highpass', vol: 0.12, at: 2.1 }); },   // air brake
  truckPass: () => pass({ dur: 3.6, f0: 62, f1: 44, lp: 380, vol: 0.38, hiss: 0.06, amp: 0.5, sub: true, rattle: true }),
  autoPass: () => pass({ dur: 1.5, f0: 230, f1: 170, lp: 1100, vol: 0.18, hiss: 0.04, amp: 0.3, buzz: true }),   // CNG / motorbike
  // horns
  horn: () => { const f = 380 + Math.random() * 120, n = Math.random() < 0.4 ? 2 : 1;      // car
    for (let i = 0; i < n; i++) { tone(f, 0.28, { type: 'sawtooth', vol: 0.05, at: i * 0.4 }); tone(f * 1.26, 0.28, { type: 'sawtooth', vol: 0.04, at: i * 0.4 }); } },
  hornTruck: () => { const f = 150 + Math.random() * 20; [1, 1.26, 1.5].forEach(m => tone(f * m, 1.1, { type: 'sawtooth', vol: 0.055 })); noise(1.0, { freq: 900, vol: 0.05 }); },
  hornBus: () => { const f = 300 + Math.random() * 30; tone(f, 0.7, { type: 'sawtooth', vol: 0.06 }); tone(f * 1.25, 0.7, { type: 'sawtooth', vol: 0.05 });
    if (Math.random() < 0.5) { tone(f, 0.5, { type: 'sawtooth', vol: 0.06, at: 0.9 }); tone(f * 1.25, 0.5, { type: 'sawtooth', vol: 0.05, at: 0.9 }); } },
  bell: () => { for (let i = 0; i < 3; i++) { ring(2500, 0.25, 0.07, i * 0.16); ring(3350, 0.18, 0.04, i * 0.16); } },   // rickshaw
  poolBreak: () => SOUNDS.poolCue(),
  poolCue: () => { click(0.55); ring(1900, 0.03, 0.22); ring(3300, 0.02, 0.15); thud(180, 0.07, 0.4); ring(900, 0.05, 0.12); },
  poolWall: () => { thud(110 + Math.random() * 20, 0.09, 0.5); noise(0.06, { freq: 700, vol: 0.18 }); ring(380, 0.05, 0.1); },
  poolPocket: () => { thud(140, 0.08, 0.4); ring(1500, 0.03, 0.1); noise(0.7, { freq: 900, to: 220, q: 0.7, vol: 0.16, at: 0.08 }); thud(90, 0.06, 0.18, 0.5); },

  // carrom: light wooden coins and striker on a powdered board
  carromHit: () => { const k = 0.93 + Math.random() * 0.14, br = 0.55 + 0.45 * V;
    click(0.3 * br); ring(2100 * k, 0.035, 0.28 * br); ring(3600 * k, 0.018, 0.12 * br); ring(820 * k, 0.045, 0.2); },
  carromStrike: () => { const k = 0.95 + Math.random() * 0.1;
    click(0.4); ring(1650 * k, 0.045, 0.32); ring(2900 * k, 0.025, 0.2); ring(650 * k, 0.06, 0.24); thud(230, 0.03, 0.12); },
  carromFlick: () => { click(0.18); thud(300, 0.03, 0.18); noise(0.3, { freq: 3800, q: 0.8, type: 'highpass', vol: 0.05, at: 0.03 }); },
  carromWall: () => { thud(330 + Math.random() * 40, 0.05, 0.4); ring(950, 0.04, 0.18); click(0.14); },
  carromPocket: () => { thud(210, 0.06, 0.32); noise(0.2, { freq: 1500, q: 0.6, type: 'bandpass', vol: 0.1, at: 0.02 }); thud(150, 0.05, 0.14, 0.12); }
};

// quiet office background: AC hum plus now and then a keyboard clatter or a distant clack
function ambienceTick() {
  if (!ambOn) return;
  if (!muted && ctx) {
    const r = Math.random();
    if (r < 0.5) { const n = 4 + Math.floor(Math.random() * 8); for (let i = 0; i < n; i++) noise(0.025, { freq: 2200 + Math.random() * 1500, type: 'highpass', vol: 0.025, at: i * (0.07 + Math.random() * 0.07) }); }
    else if (r < 0.7) { noise(0.05, { freq: 1400, type: 'bandpass', q: 3, vol: 0.05 }); tone(1900, 0.05, { type: 'sine', vol: 0.025 }); }
  }
  ambTimer = setTimeout(ambienceTick, 1800 + Math.random() * 3200);
}

let hum = null;
function startHum() {
  if (hum || !ensure()) return;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = 'lowpass'; f.frequency.value = 180;
  g.gain.value = 0.07;
  s.connect(f); f.connect(g); g.connect(master);
  s.start(); hum = s;
}

// steady road noise heard on the balcony, with an occasional distant horn
let road = null, roadOn = false, hornTimer = 0;
function startRoad() {
  if (road || !ensure()) return;
  const s = ctx.createBufferSource(), lo = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = 0.8;
  lo.type = 'lowpass'; lo.frequency.value = 650;
  bp.type = 'peaking'; bp.frequency.value = 220; bp.gain.value = 6;
  g.gain.value = 0;
  s.connect(lo); lo.connect(bp); bp.connect(g); g.connect(master);
  s.start(); road = { g };
}
function hornTick() {
  if (!roadOn) return;
  if (!muted) { const r = Math.random(), h = r < 0.5 ? 'horn' : r < 0.7 ? 'hornTruck' : r < 0.9 ? 'hornBus' : 'bell'; V = h === 'bell' ? 0.5 : 0.7; SOUNDS[h](); V = 1;
    if (Math.random() < 0.35) setTimeout(() => { if (roadOn && !muted) { V = 0.55; SOUNDS.horn(); V = 1; } }, 700 + Math.random() * 900); }   // a second driver answers
  hornTimer = setTimeout(hornTick, 2500 + Math.random() * 6500);
}

export const sfx = {
  // the vehicle that just drove past plays its own sound (rickshaw bell, CNG buzz, bus, truck, car), sometimes honking
  vehicle(vol = 1, kind = 'car') {
    if (!ensure() || ctx.state !== 'running' || muted) return;
    const now = performance.now(); if (now - (last.vehicle || 0) < 250) return; last.vehicle = now;
    const r = Math.random();
    const name = kind === 'r' ? 'bell' : kind === 'cng' ? 'autoPass' : kind === 'bus' ? (r < 0.3 ? 'truckPass' : 'busPass') : (r < 0.2 ? 'truckPass' : 'carPass');
    V = vol * (kind === 'r' ? 0.7 : 1); SOUNDS[name](); V = 1;
    if (name === 'bell') return;
    if (Math.random() < 0.18) setTimeout(() => { if (!muted) { V = 0.8 * vol; SOUNDS[name === 'truckPass' ? 'hornTruck' : name === 'busPass' ? 'hornBus' : 'horn'](); V = 1; } }, 200 + Math.random() * 500);
  },
  // level 0..1: how much of the street you can hear (1 on the balcony)
  traffic(level) {
    if (!ensure()) return;
    startRoad();
    road.g.gain.setTargetAtTime(level * 0.26, ctx.currentTime, 0.6);
    const on = level > 0.5;
    if (on && !roadOn) { roadOn = true; clearTimeout(hornTimer); hornTimer = setTimeout(hornTick, 2500 + Math.random() * 4000); }
    else if (!on && roadOn) { roadOn = false; clearTimeout(hornTimer); }
  },
  unlock() { if (ensure() && ctx.state === 'suspended' && !muted) ctx.resume(); loadSamples(); },
  // vol: 0..1 scale (how loud the event is where the listener stands)
  play(name, vol = 1) {
    const fn = SOUNDS[name];
    if (!fn || !ensure() || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (last[name] || 0) < 35) return;
    last[name] = now;
    V = vol;
    if (samples[name]) playSample(samples[name]); else fn();
    V = 1;
  },
  ambience(on) {
    if (on && !ambOn) { ambOn = true; startHum(); ambienceTick(); }
    else if (!on && ambOn) { ambOn = false; clearTimeout(ambTimer); }
  },
  has(name) { return !!samples[name]; },
  get muted() { return muted; },
  setMuted(m) {
    muted = !!m;
    try { localStorage.setItem('cb-muted', muted ? '1' : '0'); } catch (e) {}
    if (!ensure()) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.02);
    if (!muted) ctx.resume();
  }
};
