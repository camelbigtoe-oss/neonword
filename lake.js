// NEONLINK backdrop: a pixel lake under a turning sky. Scenes unlock with level.
// Drawn by bg.js at low resolution (same SCALE as the city) when mode is "grid".
const Lake = (() => {
  // lvl = level needed. Kept off the theme levels (1,3,5,8,12,16) so each level-up unlocks one thing.
  const SCENES = [
    { id: "night", name: "NIGHT LAKE", lvl: 1, sky: ["#020a0d", "#0a3a3c", "#ff8a1f"], sun: "set", sunCol: ["#ffe14a", "#ff8a1f"],
      mtn: ["#0b2a2c", "#06171a"], cap: "#2dffd2", water: "#04110f", stars: true, glint: ["#ff8a1f", "#ffe14a"], line: "#ff8a1f" },
    { id: "day", name: "DAYBREAK", lvl: 2, sky: ["#2a7fd4", "#79c6f0", "#d8f3ff"], sun: "high", sunCol: ["#fffbe0", "#ffe98a"],
      mtn: ["#4f8fa8", "#2f6a73"], cap: "#e8fbff", water: "#0f4a5c", clouds: "#ffffff", glint: ["#ffffff", "#fffbe0"], dim: 0.32 },
    { id: "autumn", name: "AUTUMN", lvl: 4, sky: ["#3b1530", "#b8452a", "#ffb347"], sun: "set", sunCol: ["#ffe08a", "#ff6a2a"],
      mtn: ["#5a2a2a", "#3a1a1e"], cap: "#ff9f4a", water: "#1e0f12", trees: ["#ff7a1f", "#d9411e", "#ffb000"], clouds: "#ffb38a",
      weather: "leaves", glint: ["#ff6a2a", "#ffe08a"] },
    { id: "rain", name: "RAINSTORM", lvl: 6, sky: ["#1a262e", "#3a4b55", "#6a7d88"], sun: null, dim: 0.24,
      mtn: ["#2a3840", "#1c262c"], cap: "#7d93a0", water: "#0f171b", clouds: "#55656e", weather: "rain", lightning: true },
    { id: "winter", name: "WINTER", lvl: 10, sky: ["#040818", "#0f2340", "#2c5378"], sun: "moon", sunCol: ["#f4f8ff", "#c9d8ec"],
      mtn: ["#2a3c58", "#1a2740"], cap: "#ffffff", capH: 4, water: "#060c1a", stars: true, aurora: true, weather: "snow", glint: ["#c9d8ec", "#ffffff"] },
    { id: "blossom", name: "BLOSSOM", lvl: 14, sky: ["#2a1a4a", "#c85a9a", "#ffc4a8"], sun: "set", sunCol: ["#fff0c8", "#ff7aa8"],
      mtn: ["#5a3a6a", "#3a2550"], cap: "#ffc4e0", water: "#1a1028", trees: ["#ff9ec8", "#ffc4e0", "#ff7ab0"], weather: "petals", glint: ["#ff7aa8", "#fff0c8"] },
  ];

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, hz = 0, S = SCENES[0];
  let skyG = null, front = null, lake = null;
  let stars = [], pole = { x: 0, y: 0 }, shooters = [], sat = null, clouds = [], cloudImg = null, parts = [], ripples = [];
  let sun = null, flash = 0, bolt = null, nextShoot = 0, nextSat = 0;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---------- colour helpers (accept #hex or rgb()) ----------
  function rgb(c) {
    if (c.startsWith("rgb")) return c.match(/\d+/g).slice(0, 3).map(Number);
    let h = c.replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  // ---------- build ----------
  function build(w, h, id) {
    W = w; H = h; hz = Math.floor(H * 0.62);
    S = SCENES.find((s) => s.id === id) || SCENES[0];
    buildSky();
    buildFront();
    buildLake();
    buildStars();
    buildClouds();
    buildWeather();
    shooters = []; sat = null; ripples = []; flash = 0; bolt = null;
    nextShoot = 0; nextSat = 0;
  }

  function buildSky() {
    skyG = canvas(W, H);
    const s = skyG.getContext("2d");
    const [a, b, c] = S.sky;
    const bands = 14;
    const col = (t) => (t < 0.6 ? mix(a, b, t / 0.6) : mix(b, c, (t - 0.6) / 0.4));
    for (let i = 0; i < bands; i++) {
      s.fillStyle = col(i / (bands - 1));
      s.fillRect(0, Math.floor((hz * i) / bands), W, Math.ceil(hz / bands) + 1);
    }
    for (let i = 1; i < bands; i++) {
      const y = Math.floor((hz * i) / bands);
      s.fillStyle = col((i - 1) / (bands - 1));
      for (let x = i % 2; x < W; x += 2) s.fillRect(x, y, 1, 1);
    }
    s.fillStyle = c;
    s.fillRect(0, hz, W, H - hz);
  }

  // sun or moon, mountains and shoreline trees on a transparent layer
  function buildFront() {
    front = canvas(W, H);
    const s = front.getContext("2d");
    const r = Math.floor(Math.min(W, H) * 0.2);
    // far range, then the sun, then the near range in front of it.
    // Height follows the narrower side so tall phone screens don't bury the sun.
    const M = Math.min(H, W * 1.2);
    seed = 99 + W;
    const range = (col, amp, k) => {
      let y = hz - M * amp * 0.5;
      for (let x = 0; x < W; x++) {
        y += (rnd() - 0.5) * 3 + ((hz - M * amp * (0.4 + 0.6 * Math.abs(Math.sin(x / (W * (0.11 + k * 0.07)))))) - y) * 0.08;
        const top = Math.floor(y);
        s.fillStyle = col;
        s.fillRect(x, top, 1, hz - top);
        if (k === 0) {
          s.fillStyle = S.cap;
          s.globalAlpha = S.capH ? 0.9 : 0.5;
          s.fillRect(x, top, 1, S.capH ? Math.max(1, Math.floor(S.capH * (0.5 + rnd()))) : (x % 2 ? 0 : 1));
          s.globalAlpha = 1;
        }
      }
    };
    range(S.mtn[0], 0.22, 0);
    sun = null;
    if (S.sun === "set") {
      const cx = Math.floor(W * 0.68), cy = hz - Math.floor(r * 0.35);
      for (let y = -r; y <= r; y++) {
        const w = Math.floor(Math.sqrt(r * r - y * y));
        const gap = y > -r * 0.1 && ((y + r) % 5 < Math.min(3, 1 + Math.floor((y + r * 0.1) / (r * 0.3))));
        if (gap) continue;
        s.fillStyle = mix(S.sunCol[0], S.sunCol[1], (y + r) / (2 * r));
        s.fillRect(cx - w, cy + y, w * 2, 1);
      }
      sun = { x: cx, r };
    } else if (S.sun === "high" || S.sun === "moon") {
      const rr = Math.max(4, Math.floor(r * (S.sun === "moon" ? 0.38 : 0.45)));
      const cx = Math.floor(W * (S.sun === "moon" ? 0.24 : 0.7)), cy = Math.floor(hz * 0.26);
      // soft halo
      for (let k = 3; k >= 1; k--) {
        s.globalAlpha = 0.08 * k;
        s.fillStyle = S.sunCol[1];
        const R = rr + (4 - k) * 3;
        for (let y = -R; y <= R; y++) { const w = Math.floor(Math.sqrt(R * R - y * y)); s.fillRect(cx - w, cy + y, w * 2, 1); }
      }
      s.globalAlpha = 1;
      for (let y = -rr; y <= rr; y++) {
        const w = Math.floor(Math.sqrt(rr * rr - y * y));
        s.fillStyle = mix(S.sunCol[0], S.sunCol[1], (y + rr) / (2 * rr));
        s.fillRect(cx - w, cy + y, w * 2, 1);
      }
      if (S.sun === "moon") {
        seed = 31;
        s.fillStyle = S.sunCol[1];
        for (let i = 0; i < 5; i++) {
          const a = rnd() * 6.28, d = rnd() * rr * 0.6;
          s.fillRect(Math.floor(cx + Math.cos(a) * d), Math.floor(cy + Math.sin(a) * d), 1 + (i % 2), 1 + (i % 2));
        }
      }
      sun = { x: cx, r: rr };
    }
    range(S.mtn[1], 0.13, 1);
    // shoreline trees
    if (S.trees) {
      seed = 7 + W;
      for (let x = -2; x < W; x += 2 + Math.floor(rnd() * 4)) {
        const th = 3 + Math.floor(rnd() * 5), tw = 3 + Math.floor(rnd() * 3);
        s.fillStyle = mix(S.mtn[1], "#000000", 0.3);
        s.fillRect(x + (tw >> 1), hz - 2, 1, 2);
        s.fillStyle = S.trees[Math.floor(rnd() * S.trees.length)];
        for (let yy = 0; yy < th; yy++) {
          const ww = yy === 0 || yy === th - 1 ? tw - 2 : tw;
          s.fillRect(x + ((tw - ww) >> 1), hz - 2 - th + yy, ww, 1);
        }
      }
    }
  }

  // the lake mirrors sky + sun + mountains, darkened toward the viewer
  function buildLake() {
    const both = canvas(W, hz);
    const b = both.getContext("2d");
    b.drawImage(skyG, 0, 0);
    b.drawImage(front, 0, 0);
    lake = canvas(W, H - hz);
    const f = lake.getContext("2d");
    const fh = lake.height;
    for (let y = 0; y < fh; y++) {
      f.drawImage(both, 0, Math.max(0, hz - 1 - Math.floor(y * 1.3)), W, 1, 0, y, W, 1);
      f.fillStyle = S.water;
      f.globalAlpha = Math.min(0.92, 0.35 + (y / fh) * 0.6);
      f.fillRect(0, y, W, 1);
      f.globalAlpha = 1;
    }
    f.fillStyle = S.water;
    f.globalAlpha = 0.35;
    for (let y = 2; y < fh; y += 3 + Math.floor(y / 12)) f.fillRect(0, y, W, 1);
    f.globalAlpha = 1;
  }

  // stars sit on circles around a sky pole, so turning them looks like the earth spinning
  function buildStars() {
    stars = [];
    if (!S.stars) return;
    pole = { x: Math.floor(W * 0.78), y: Math.floor(hz * 0.14) };
    const maxR = Math.hypot(W, H);
    seed = 4242;
    const n = Math.floor((W * hz) / 22);
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(rnd()) * maxR;
      stars.push({ r, a: rnd() * Math.PI * 2, ph: rnd() * 6.28, b: rnd(), c: rnd() > 0.88 ? (rnd() > 0.5 ? "#ffd8a8" : "#a8e8ff") : "#ffffff" });
    }
  }

  function buildClouds() {
    clouds = [];
    cloudImg = null;
    if (!S.clouds) return;
    const many = S.weather === "rain";
    seed = 555;
    const n = many ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const w = Math.floor(18 + rnd() * (many ? 46 : 30));
      const c = canvas(w, 10);
      const g = c.getContext("2d");
      // lumpy pixel cloud: a flat base with a few bumps on top
      g.fillStyle = S.clouds;
      g.fillRect(0, 6, w, 4);
      for (let k = 0; k < 4; k++) {
        const bx = Math.floor(rnd() * (w - 8)), bw = 6 + Math.floor(rnd() * 10), bh = 2 + Math.floor(rnd() * 4);
        g.fillRect(bx, 6 - bh, Math.min(bw, w - bx), bh);
      }
      g.fillStyle = mix(S.clouds, S.sky[0], 0.3);
      g.fillRect(0, 9, w, 1);
      clouds.push({ img: c, x: rnd() * (W + 60) - 30, y: Math.floor((many ? 0.02 : 0.08) * hz + rnd() * hz * (many ? 0.35 : 0.45)), v: (0.03 + rnd() * 0.05) * (many ? 2 : 1), a: many ? 0.9 : 0.75 });
    }
  }

  function buildWeather() {
    parts = [];
    const w = S.weather;
    if (!w) return;
    const n = w === "rain" ? Math.floor(W * 0.7) : w === "snow" ? Math.floor(W * 0.5) : 26;
    for (let i = 0; i < n; i++) parts.push(newPart(true));
  }

  function newPart(anywhere) {
    const w = S.weather;
    const y = anywhere ? Math.random() * H : -4;
    if (w === "rain") return { x: Math.random() * (W + 30), y, v: 2.2 + Math.random() * 1.5, l: 2 + Math.floor(Math.random() * 3) };
    if (w === "snow") return { x: Math.random() * W, y, v: 0.12 + Math.random() * 0.25, ph: Math.random() * 6.28, s: Math.random() > 0.8 ? 2 : 1 };
    const cols = w === "leaves" ? ["#ff7a1f", "#d9411e", "#ffb000", "#a8401a"] : ["#ff9ec8", "#ffc4e0", "#ffffff"];
    return { x: Math.random() * W, y, v: 0.18 + Math.random() * 0.25, ph: Math.random() * 6.28, col: cols[Math.floor(Math.random() * cols.length)], spin: Math.random() * 6.28 };
  }

  // ---------- draw ----------
  function draw(ctx, t) {
    const T = reduced ? 0 : t;
    ctx.drawImage(skyG, 0, 0);
    if (S.stars) drawStars(ctx, T);
    if (S.aurora) drawAurora(ctx, T);
    if (S.stars && !reduced) drawSpace(ctx, t);
    ctx.drawImage(front, 0, 0);
    drawClouds(ctx);
    ctx.drawImage(lake, 0, hz);
    // horizon line
    ctx.fillStyle = S.line || S.sky[2];
    ctx.globalAlpha = S.line ? 1 : 0.6;
    ctx.fillRect(0, hz, W, 1);
    ctx.globalAlpha *= 0.3;
    ctx.fillRect(0, hz - 1, W, 1);
    ctx.fillRect(0, hz + 1, W, 1);
    ctx.globalAlpha = 1;
    if (sun && S.glint) drawGlints(ctx, T);
    if (!reduced) drawWeather(ctx);
    if (S.lightning && !reduced) drawLightning(ctx);
    ctx.fillStyle = `rgba(0,0,0,${S.dim ?? 0.3})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(ctx, t) {
    const turn = (t / 480000) * Math.PI * 2; // one full turn every 8 minutes
    for (const s of stars) {
      const a = s.a + turn;
      const x = Math.floor(pole.x + Math.cos(a) * s.r), y = Math.floor(pole.y + Math.sin(a) * s.r);
      if (x < 0 || x >= W || y < 0 || y >= hz - 3) continue;
      const tw = 0.45 + 0.4 * s.b + 0.15 * Math.sin(t / 700 + s.ph);
      ctx.globalAlpha = tw * Math.min(1, (hz - y) / (hz * 0.35));
      ctx.fillStyle = s.c;
      ctx.fillRect(x, y, 1, 1);
    }
    // the pole star stays put
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pole.x, pole.y, 1, 1);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(pole.x - 1, pole.y, 3, 1);
    ctx.fillRect(pole.x, pole.y - 1, 1, 3);
    ctx.globalAlpha = 1;
  }

  // shooting stars and a blinking satellite
  function drawSpace(ctx, t) {
    if (!nextShoot) nextShoot = t + 2000 + Math.random() * 3000;
    if (t > nextShoot) {
      nextShoot = t + 3500 + Math.random() * 6500;
      const dir = Math.random() > 0.5 ? 1 : -1;
      shooters.push({ x: Math.random() * W, y: Math.random() * hz * 0.35, vx: dir * (1.4 + Math.random()), vy: 0.6 + Math.random() * 0.5, life: 34 + Math.random() * 16, max: 50 });
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx; s.y += s.vy; s.life--;
      if (s.life <= 0 || s.y > hz - 4) { shooters.splice(i, 1); continue; }
      const fade = Math.min(1, s.life / 12);
      for (let k = 0; k < 12; k++) {
        ctx.globalAlpha = fade * (1 - k / 12) * 0.9;
        ctx.fillStyle = k < 2 ? "#ffffff" : "#bfe9ff";
        ctx.fillRect(Math.floor(s.x - s.vx * k * 0.7), Math.floor(s.y - s.vy * k * 0.7), 1, 1);
      }
    }
    if (!nextSat) nextSat = t + 6000;
    if (!sat && t > nextSat) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      sat = { x: dir > 0 ? -2 : W + 2, y: hz * (0.08 + Math.random() * 0.3), vx: dir * 0.09, vy: 0.01 };
    }
    if (sat) {
      sat.x += sat.vx; sat.y += sat.vy;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#e8f4ff";
      ctx.fillRect(Math.floor(sat.x), Math.floor(sat.y), 1, 1);
      if (Math.floor(t / 600) % 3 === 0) { ctx.fillStyle = "#ff4d6d"; ctx.fillRect(Math.floor(sat.x) + 1, Math.floor(sat.y), 1, 1); }
      ctx.globalAlpha = 1;
      if (sat.x < -4 || sat.x > W + 4) { sat = null; nextSat = t + 15000 + Math.random() * 20000; }
    }
    ctx.globalAlpha = 1;
  }

  function drawAurora(ctx, t) {
    const cols = ["#3dff9a", "#2dffd2", "#7a8bff"];
    for (let x = 0; x < W; x++) {
      const y0 = Math.floor(hz * 0.3 + Math.sin(x / 17 + t / 3200) * 6 + Math.sin(x / 6 + t / 1900) * 2);
      const len = 10 + Math.floor(6 * (1 + Math.sin(x / 11 - t / 2500)));
      const a = 0.1 + 0.12 * (1 + Math.sin(x / 9 + t / 1400));
      ctx.fillStyle = cols[Math.floor((x / 40 + t / 9000) % 3 + 3) % 3];
      for (let k = 0; k < len; k++) {
        ctx.globalAlpha = a * (1 - k / len);
        ctx.fillRect(x, y0 + k, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(ctx) {
    for (const c of clouds) {
      if (!reduced) c.x += c.v;
      if (c.x > W + 4) c.x = -c.img.width - 4;
      ctx.globalAlpha = c.a;
      ctx.drawImage(c.img, Math.floor(c.x), c.y);
    }
    ctx.globalAlpha = 1;
  }

  // sun or moon glints on the water: dashes that gently widen and shrink in place
  function drawGlints(ctx, t) {
    const base = S.sun === "set" ? sun.r : sun.r * 1.6;
    for (let i = 0; i < 14; i++) {
      const y = hz + 2 + Math.floor(i * i * 0.35 + i * 2);
      if (y >= H) break;
      const wob = Math.sin(t / 1600 + i * 1.7);
      const w = Math.max(2, Math.floor(base * (0.9 - i * 0.04) * (0.75 + 0.25 * wob)));
      const off = Math.round(Math.sin(t / 2300 + i) * 2);
      ctx.fillStyle = i % 3 === 0 ? S.glint[0] : S.glint[1];
      ctx.globalAlpha = 0.55 - i * 0.03;
      ctx.fillRect(sun.x - (w >> 1) + off, y, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawWeather(ctx) {
    const w = S.weather;
    if (!w) return;
    for (const p of parts) {
      if (w === "rain") {
        p.y += p.v; p.x -= p.v * 0.3;
        if (p.y > H) Object.assign(p, newPart(false));
        else if (p.y > hz + 2 && Math.random() < 0.02) {
          if (ripples.length < 40) ripples.push({ x: Math.floor(p.x), y: Math.floor(p.y), r: 0 });
          Object.assign(p, newPart(false));
        }
        ctx.fillStyle = "#a8c4d4";
        ctx.globalAlpha = 0.45;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, p.l);
      } else if (w === "snow") {
        p.y += p.v; p.x += Math.sin(p.y / 9 + p.ph) * 0.15;
        if (p.y > H) Object.assign(p, newPart(false));
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = p.y > hz ? 0.55 : 0.85;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.s, p.s);
      } else {
        // leaves and petals sway and flutter down
        p.y += p.v; p.x += Math.sin(p.y / 12 + p.ph) * 0.35 + 0.08; p.spin += 0.08;
        if (p.y > H || p.x > W + 3) Object.assign(p, newPart(false));
        ctx.fillStyle = p.col;
        ctx.globalAlpha = p.y > hz ? 0.6 : 0.95;
        const flat = Math.sin(p.spin) > 0;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), flat ? 2 : 1, flat ? 1 : 2);
      }
    }
    ctx.globalAlpha = 1;
    // little rings where raindrops hit the lake
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 0.25;
      if (r.r > 4) { ripples.splice(i, 1); continue; }
      ctx.fillStyle = "#a8c4d4";
      ctx.globalAlpha = 0.5 * (1 - r.r / 4);
      const rr = Math.floor(r.r);
      ctx.fillRect(r.x - rr * 2, r.y, 1, 1);
      ctx.fillRect(r.x + rr * 2, r.y, 1, 1);
      ctx.fillRect(r.x - rr, r.y - 1, rr * 2 + 1, 1);
      ctx.fillRect(r.x - rr, r.y + 1, rr * 2 + 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawLightning(ctx) {
    if (!flash && Math.random() < 1 / 700) {
      flash = 14;
      const pts = [];
      let x = Math.floor(W * (0.15 + Math.random() * 0.7)), y = 0;
      while (y < hz - 10) { pts.push([x, y]); y += 2 + Math.floor(Math.random() * 4); x += Math.floor(Math.random() * 5) - 2; }
      bolt = pts;
    }
    if (!flash) return;
    flash--;
    const on = flash > 10 || (flash > 4 && flash < 7);
    if (on) {
      ctx.fillStyle = "#e8f4ff";
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      for (let i = 1; i < bolt.length; i++) {
        const [x0, y0] = bolt[i - 1], [x1, y1] = bolt[i];
        for (let yy = y0; yy < y1; yy++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * (yy - y0)) / (y1 - y0)), yy, 1, 1);
      }
    }
    if (!flash) bolt = null;
  }

  return { SCENES, build, draw };
})();
