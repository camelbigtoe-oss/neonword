// Procedural pixel-art cyberpunk city: parallax skyline, neon signs,
// rain and flying cars. Rendered at low resolution and scaled up.
const BG = (() => {
  const SCALE = 3;
  const cvs = document.getElementById("bg");
  const ctx = cvs.getContext("2d");
  const fxc = document.getElementById("fx");
  const fx = fxc.getContext("2d");
  let W = 0, H = 0, sky = null, layers = [], drops = [], cars = [], parts = [];
  let C = {};
  // "city" (NEONWORD), "grid" (NEONLINK lake, lake.js), "space" (NEONTRACE, space.js),
  // "cave" (NEONRARE, cave.js) or "terrain" (NEONSCALE, terrain.js)
  let mode = "city";
  let scene = "night";   // NEONLINK lake scene
  let sector = "deep";   // NEONTRACE space sector
  let cavern = "amethyst";   // NEONRARE crystal cavern (cave.js)
  let zone = "dusk";         // NEONSCALE terrain zone (terrain.js)
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function readColors() {
    const s = getComputedStyle(document.body);
    const g = (n) => s.getPropertyValue(n).trim();
    C = { sky1: g("--sky1"), sky2: g("--sky2"), sky3: g("--sky3"), c1: g("--c1"), c2: g("--c2"), near: g("--near"), hit: g("--hit"), bg: g("--bg") };
  }

  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };

  function buildSky() {
    sky = document.createElement("canvas");
    sky.width = W; sky.height = H;
    const s = sky.getContext("2d");
    // banded gradient: hard steps for that pixel look
    const bands = 14;
    const horizon = Math.floor(H * 0.62);
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      s.fillStyle = t < 0.6 ? mix(C.sky1, C.sky2, t / 0.6) : mix(C.sky2, C.sky3, (t - 0.6) / 0.4);
      const y0 = Math.floor((horizon * i) / bands);
      s.fillRect(0, y0, W, Math.ceil(horizon / bands) + 1);
    }
    s.fillStyle = C.sky3;
    s.fillRect(0, horizon, W, H - horizon);
    // dither between bands
    for (let i = 1; i < bands; i++) {
      const y = Math.floor((horizon * i) / bands);
      const t = (i - 1) / (bands - 1);
      s.fillStyle = t < 0.6 ? mix(C.sky1, C.sky2, t / 0.6) : mix(C.sky2, C.sky3, (t - 0.6) / 0.4);
      for (let x = (i % 2); x < W; x += 2) s.fillRect(x, y, 1, 1);
    }
    // giant striped sun
    const r = Math.floor(Math.min(W, H) * 0.2);
    const cx = Math.floor(W * 0.68), cy = horizon - Math.floor(r * 0.35);
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      const gap = y > -r * 0.1 && ((y + r) % 5 < Math.min(3, 1 + Math.floor((y + r * 0.1) / (r * 0.3))));
      if (gap) continue;
      s.fillStyle = mix(C.near, C.c1, (y + r) / (2 * r));
      s.fillRect(cx - w, cy + y, w * 2, 1);
    }
    // stars
    seed = 7;
    for (let i = 0; i < W * 0.6; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * horizon * 0.6);
      s.fillStyle = rnd() > 0.85 ? C.c2 : "rgba(255,255,255,0.7)";
      s.fillRect(x, y, 1, 1);
    }
  }

  function buildLayer(depth) {
    // depth 0 = far, 2 = near
    const LW = Math.max(W * 2, 480);
    const c = document.createElement("canvas");
    c.width = LW; c.height = H;
    const g = c.getContext("2d");
    const signs = [], beacons = [];
    const base = [mix(C.sky2, C.bg, 0.55), mix(C.sky1, C.bg, 0.55), C.bg][depth];
    const winCols = [C.c2, C.near, C.c1, "#ffffff"];
    const minH = [0.25, 0.35, 0.18][depth], maxH = [0.55, 0.7, 0.42][depth];
    seed = 1000 + depth * 77 + W;
    let x = 0;
    while (x < LW) {
      const bw = Math.floor(10 + rnd() * [22, 30, 40][depth]);
      const bh = Math.floor(H * (minH + rnd() * (maxH - minH)));
      const top = H - bh;
      g.fillStyle = base;
      g.fillRect(x, top, bw, bh);
      // stepped roof
      if (rnd() > 0.5) g.fillRect(x + 2, top - 3, bw - 4, 3);
      if (rnd() > 0.6) {
        const ax = x + Math.floor(bw / 2);
        const ah = Math.floor(4 + rnd() * 12);
        g.fillRect(ax, top - ah, 1, ah);
        beacons.push({ x: ax, y: top - ah - 1, ph: rnd() * 6 });
      }
      // edge highlight from the sun
      g.fillStyle = mix(base, C.sky3, 0.25);
      g.fillRect(x + bw - 1, top, 1, bh);
      // windows
      const step = depth === 0 ? 3 : 3;
      for (let wy = top + 3; wy < H - 2; wy += step) {
        for (let wx = x + 2; wx < x + bw - 2; wx += step) {
          if (rnd() < [0.18, 0.26, 0.2][depth]) {
            g.fillStyle = winCols[Math.floor(rnd() * winCols.length)];
            g.globalAlpha = depth === 0 ? 0.35 : 0.6 + rnd() * 0.4;
            g.fillRect(wx, wy, depth === 2 ? 2 : 1, 1);
            g.globalAlpha = 1;
          }
        }
      }
      // neon signs on mid/near layers
      if (depth >= 1 && rnd() > 0.45) {
        const vertical = rnd() > 0.5;
        const sw = vertical ? 3 + Math.floor(rnd() * 2) : Math.min(bw - 4, 8 + Math.floor(rnd() * 10));
        const sh = vertical ? 10 + Math.floor(rnd() * 16) : 4 + Math.floor(rnd() * 3);
        const sx = vertical ? (rnd() > 0.5 ? x - 1 : x + bw - sw + 1) : x + 2;
        const sy = top + 4 + Math.floor(rnd() * Math.max(1, bh * 0.4));
        signs.push({ x: sx, y: sy, w: sw, h: sh, col: [C.c1, C.c2, C.near, C.hit][Math.floor(rnd() * 4)], ph: rnd() * 10, pat: Math.floor(rnd() * 1e6) });
      }
      x += bw + Math.floor(rnd() * [2, 4, 8][depth]);
    }
    return { c, LW, signs, beacons, speed: [2, 5, 11][depth], depth };
  }

  function resize() {
    W = Math.max(16, Math.ceil(innerWidth / SCALE));
    H = Math.max(16, Math.ceil(innerHeight / SCALE));
    cvs.width = W; cvs.height = H;
    fxc.width = W; fxc.height = H;
    rebuild();
  }

  function rebuild() {
    readColors();
    buildSky();
    layers = [buildLayer(0), buildLayer(1), buildLayer(2)];
    drops = Array.from({ length: Math.floor(W * 0.5) }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 2, l: 2 + Math.floor(Math.random() * 3) }));
    cars = Array.from({ length: 5 }, () => newCar(true));
    if (mode === "grid") Lake.build(W, H, scene);
    if (mode === "space") Space.build(W, H, sector);
    if (mode === "cave") Cave.build(W, H, cavern);
    if (mode === "terrain") Terrain.build(W, H, zone);
  }

  // s = scene id for "grid", sector for "space", cavern for "cave", zone for "terrain"
  function setMode(m, s) {
    mode = m;
    if (s && m === "grid") scene = s;
    if (s && m === "space") sector = s;
    if (s && m === "cave") cavern = s;
    if (s && m === "terrain") zone = s;
    rebuild();
  }

  function newCar(anywhere) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    return { x: anywhere ? Math.random() * W : dir > 0 ? -10 : W + 10, y: H * (0.15 + Math.random() * 0.4), v: (0.3 + Math.random() * 0.6) * dir, col: Math.random() > 0.5 ? C.c1 : C.c2 };
  }

  function drawLayer(L, t) {
    const off = Math.floor(reduced ? 0 : (t * L.speed / 1000) % L.LW);
    for (const k of [0, 1]) {
      const ox = -off + k * L.LW;
      if (ox > W || ox + L.LW < 0) continue;
      ctx.drawImage(L.c, ox, 0);
      for (const s of L.signs) {
        const sx = s.x + ox;
        if (sx > W || sx + s.w < 0) continue;
        // flicker: occasional dropouts
        const f = Math.sin(t / 900 + s.ph) + Math.sin(t / 130 + s.ph * 3) * 0.3;
        if (f < -1.05) continue;
        ctx.fillStyle = s.col;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(sx - 1, s.y - 1, s.w + 2, s.h + 2);
        ctx.globalAlpha = 1;
        ctx.fillRect(sx, s.y, s.w, s.h);
        // fake glyphs: dark pixels in a pattern
        ctx.fillStyle = C.bg;
        let p = s.pat;
        for (let yy = 1; yy < s.h - 1; yy++) for (let xx = 1; xx < s.w - 1; xx++) {
          p = (p * 1103515245 + 12345) & 0x7fffffff;
          if (p % 3 === 0) ctx.fillRect(sx + xx, s.y + yy, 1, 1);
        }
      }
      for (const b of L.beacons) {
        if (Math.sin(t / 400 + b.ph) > 0.4) {
          ctx.fillStyle = "#ff2040";
          ctx.fillRect(b.x + ox, b.y, 1, 1);
        }
      }
    }
  }

  function frame(t) {
    if (mode === "grid") { Lake.draw(ctx, t); drawParts(); requestAnimationFrame(frame); return; }
    if (mode === "space") { Space.draw(ctx, t); drawParts(); requestAnimationFrame(frame); return; }
    if (mode === "cave") { Cave.draw(ctx, t); drawParts(); requestAnimationFrame(frame); return; }
    if (mode === "terrain") { Terrain.draw(ctx, t); drawParts(); requestAnimationFrame(frame); return; }
    ctx.drawImage(sky, 0, 0);
    drawLayer(layers[0], t);
    // cars between far and mid
    for (const car of cars) {
      if (!reduced) car.x += car.v;
      ctx.fillStyle = car.col;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(Math.floor(car.x - car.v * 10), Math.floor(car.y), Math.abs(car.v * 10), 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.fillRect(Math.floor(car.x), Math.floor(car.y), 2, 1);
      if (car.x < -20 || car.x > W + 20) Object.assign(car, newCar(false));
    }
    drawLayer(layers[1], t);
    // fog band
    ctx.fillStyle = C.c1;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0, Math.floor(H * 0.72), W, Math.floor(H * 0.28));
    ctx.globalAlpha = 1;
    drawLayer(layers[2], t);
    // rain
    if (!reduced) {
      ctx.fillStyle = C.c2;
      ctx.globalAlpha = 0.35;
      for (const d of drops) {
        d.y += d.v; d.x -= d.v * 0.25;
        if (d.y > H) { d.y = -4; d.x = Math.random() * (W + 20); }
        ctx.fillRect(Math.floor(d.x), Math.floor(d.y), 1, d.l);
      }
      ctx.globalAlpha = 1;
    }
    // dim the whole scene so the UI pops
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);

    drawParts();
    requestAnimationFrame(frame);
  }

  // particles on fx canvas
  function drawParts() {
    fx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      fx.fillStyle = p.col;
      fx.fillRect(Math.floor(p.x), Math.floor(p.y), p.s, p.s);
    }
  }

  function burst(px, py, colors, n = 60) {
    const x = px / SCALE, y = py / SCALE;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.2;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 50 + Math.random() * 50, col: colors[i % colors.length], s: Math.random() > 0.7 ? 2 : 1 });
    }
  }

  function confetti(colors) {
    for (let i = 0; i < 6; i++) setTimeout(() => burst(Math.random() * innerWidth, innerHeight * (0.2 + Math.random() * 0.4), colors, 40), i * 140);
  }

  addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  resize();
  requestAnimationFrame(frame);
  return { rebuild, setMode, burst, confetti, SCENES: Lake.SCENES, SECTORS: Space.SECTORS, CAVERNS: Cave.SCENES, ZONES: Terrain.SCENES };
})();
