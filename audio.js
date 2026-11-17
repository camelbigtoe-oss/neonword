// Tiny chiptune synth built on WebAudio. No audio files needed.
const SFX = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }

  function tone(freq, dur, { type = "square", at = 0, vol = 1, slide = 0 } = {}) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, { at = 0, vol = 0.6, from = 4000, to = 200 } = {}) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime + at;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi to Hz

  return {
    init,
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    key() { tone(N(84 + Math.floor(Math.random() * 3)), 0.04, { vol: 0.35 }); },
    del() { tone(N(60), 0.05, { vol: 0.35, slide: -80 }); },
    flip(kind, i) {
      const base = kind === "hit" ? 76 : kind === "near" ? 69 : 57;
      tone(N(base + i), 0.09, { type: kind === "miss" ? "triangle" : "square", vol: 0.45 });
    },
    error() { tone(110, 0.12, { type: "sawtooth", vol: 0.5 }); tone(98, 0.14, { type: "sawtooth", vol: 0.5, at: 0.1 }); },
    hint() { noise(0.35, { vol: 0.5, from: 600, to: 6000 }); tone(N(88), 0.08, { at: 0.2, vol: 0.4 }); tone(N(93), 0.12, { at: 0.28, vol: 0.4 }); },
    burn() { noise(0.5, { vol: 0.7, from: 5000, to: 150 }); tone(N(45), 0.3, { type: "sawtooth", vol: 0.4, slide: -40 }); },
    win() {
      [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(N(n), 0.12, { at: i * 0.09, vol: 0.5 }));
      tone(N(48), 0.6, { type: "triangle", at: 0, vol: 0.6 });
      tone(N(55), 0.6, { type: "triangle", at: 0.36, vol: 0.6 });
    },
    lose() { [67, 63, 60, 55].forEach((n, i) => tone(N(n), 0.22, { at: i * 0.2, vol: 0.45, type: "triangle" })); },
    coin() { tone(N(88), 0.06, { vol: 0.4 }); tone(N(95), 0.18, { at: 0.06, vol: 0.4 }); },
    levelUp() { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.1, { at: i * 0.06, vol: 0.45 })); tone(N(96), 0.5, { at: 0.45, vol: 0.4 }); },
    click() { tone(N(79), 0.03, { vol: 0.3 }); },
  };
})();
