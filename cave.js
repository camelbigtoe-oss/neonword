// NEONRARE backdrop: a glowing crystal cavern. Rock walls with stalactites, pulsing crystal
// clusters, drifting motes, sparkles, drips, and a pool of water or lava in some caverns.
// Drawn by bg.js in "cave" mode. Caverns unlock with the NEONRARE level.
const Cave = (() => {
  // ui: CSS variables applied while NEONRARE is open
  const SCENES = [
    { id: "amethyst", name: "AMETHYST HOLLOW", lvl: 1, sky: ["#07020e", "#160626", "#22093a"], rock: ["#0c0614", "#1a0c2a", "#2a1640"],
      crystal: ["#b46bff", "#e3a8ff", "#ff5fd2"], glow: "#b46bff", mote: "#e3a8ff", pool: null,
      ui: { "--c1": "#ff5fd2", "--c2": "#c48cff", "--near": "#ffe066", "--bg": "#0a0412", "--bg2": "#1a0a2c", "--panel": "rgba(18, 6, 30, 0.86)", "--miss": "#2a1640", "--dim": "#8e70b4", "--hit": "#7dffb0" } },
    { id: "emerald", name: "EMERALD VEIN", lvl: 2, sky: ["#010806", "#04180f", "#082a1a"], rock: ["#030c08", "#0a1e14", "#123222"],
      crystal: ["#2dffa0", "#a8ffd6", "#19c97a"], glow: "#2dffa0", mote: "#a8ffd6", pool: "water",
      ui: { "--c1": "#2dffa0", "--c2": "#a8ffd6", "--near": "#ffd447", "--bg": "#020a06", "--bg2": "#08201a", "--panel": "rgba(2, 20, 12, 0.86)", "--miss": "#11301f", "--dim": "#5fa184", "--hit": "#2dffa0" } },
    { id: "ruby", name: "RUBY FORGE", lvl: 4, sky: ["#0a0102", "#220508", "#3a0a0c"], rock: ["#0e0304", "#200a0a", "#341212"],
      crystal: ["#ff2d4f", "#ff9a8a", "#ffb03a"], glow: "#ff3a2a", mote: "#ffb03a", pool: "lava",
      ui: { "--c1": "#ff2d4f", "--c2": "#ffb03a", "--near": "#ffe27a", "--bg": "#0e0304", "--bg2": "#260a0c", "--panel": "rgba(28, 6, 8, 0.86)", "--miss": "#3a1214", "--dim": "#b07070", "--hit": "#7affc8" } },
    { id: "sapphire", name: "SAPPHIRE DEEP", lvl: 6, sky: ["#01030c", "#04102a", "#081c44"], rock: ["#02060f", "#08142a", "#0e2140"],
      crystal: ["#3d8bff", "#9fd0ff", "#4dfff0"], glow: "#3d8bff", mote: "#9fd0ff", pool: "water",
      ui: { "--c1": "#3d8bff", "--c2": "#4dfff0", "--near": "#ffd166", "--bg": "#02050e", "--bg2": "#071634", "--panel": "rgba(3, 10, 30, 0.86)", "--miss": "#11223f", "--dim": "#6886b8", "--hit": "#4dfff0" } },
    { id: "opal", name: "OPAL HEART", lvl: 10, sky: ["#06040c", "#141026", "#221a3c"], rock: ["#0a0812", "#171426", "#24203a"],
      crystal: ["#ff7ad9", "#7afcff", "#fff47a", "#9a7aff", "#7aff9a"], glow: "#c9a8ff", mote: "#ffffff", pool: "water", rainbow: true,
      ui: { "--c1": "#ff7ad9", "--c2": "#7afcff", "--near": "#fff47a", "--bg": "#08060e", "--bg2": "#18142c", "--panel": "rgba(14, 10, 28, 0.86)", "--miss": "#262040", "--dim": "#9a8ec0", "--hit": "#7aff9a" } },
    { id: "void", name: "VOID GEODE", lvl: 14, sky: ["#000000", "#040406", "#0a0a10"], rock: ["#000000", "#08080c", "#121218"],
      crystal: ["#16161e", "#ffffff", "#8a5cff"], glow: "#8a5cff", mote: "#ffffff", pool: null, rims: true,
      ui: { "--c1": "#ffffff", "--c2": "#a77bff", "--near": "#ffe9a8", "--bg": "#020203", "--bg2": "#0e0e16", "--panel": "rgba(8, 8, 14, 0.9)", "--miss": "#1c1c28", "--dim": "#7e7a9a", "--hit": "#c9b6ff" } },
  ];
  let S = SCENES[0];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, back = null, glowC = null, front = null, poolY = 0;
  let clusters = [], motes = [], drips = [], tips = [], sparks = [];
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function rgb(c) {
    const n = parseInt(c.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
  const shade = (c, t) => (t < 0 ? mix(c, "#000000", -t) : mix(c, "#ffffff", t));
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  // crisp scanline fill for a convex polygon (no anti-aliasing, keeps the pixel look)
  function poly(g, pts, col) {
    g.fillStyle = col;
    const ys = pts.map((p) => p[1]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
          const x = ax + ((yc - ay) / (by - ay)) * (bx - ax);
          lo = Math.min(lo, x); hi = Math.max(hi, x);
        }
      }
      if (hi >= lo) g.fillRect(Math.round(lo), y, Math.max(1, Math.round(hi) - Math.round(lo)), 1);
    }
  }

  // ordered-dither glow blob
  function dither(g, cx, cy, R, col, a, dens) {
    for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.2) / R;
      if (d > 1) continue;
      if ((1 - d) * dens > ((x * 7 + y * 13) % 16) / 16) { g.fillStyle = col; g.globalAlpha = a; g.fillRect(x, y, 1, 1); }
    }
    g.globalAlpha = 1;
  }

  // ceiling and floor outlines, sampled per column
  function ridge(base, amp, n) {
    const out = new Float32Array(W + 1);
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    for (let x = 0; x <= W; x++) {
      out[x] = base + amp * (Math.sin(x / (W * 0.13) + ph[0]) * 0.5 + Math.sin(x / (W * 0.05) + ph[1]) * 0.3 + Math.sin(x / 7 + ph[2]) * 0.08 * n);
    }
    return out;
  }

  function rockLayer(g, col, top, bot, spikes, depth) {
    // ceiling mass
    for (let x = 0; x < W; x++) {
      g.fillStyle = col;
      g.fillRect(x, 0, 1, Math.max(0, Math.floor(top[x])));
      g.fillRect(x, Math.floor(bot[x]), 1, H - Math.floor(bot[x]));
    }
    // stalactites hang from the ceiling, stalagmites grow from the floor
    for (let i = 0; i < spikes; i++) {
      const x = Math.floor(rnd() * W), w = 2 + Math.floor(rnd() * (5 + depth * 4));
      const up = rnd() > 0.45;
      const len = (up ? H * 0.06 : H * 0.05) + rnd() * H * (up ? 0.2 : 0.12) * (depth ? 1 : 0.7);
      if (up) {
        const y = top[x] - 1;
        poly(g, [[x - w, y], [x + w, y], [x + 0.5, y + len]], col);
        if (depth) tips.push({ x, y: y + len });
      } else {
        const y = bot[x] + 1;
        poly(g, [[x - w, y], [x + w, y], [x + 0.5, y - len * 0.8]], col);
      }
    }
    // rocky speckle so walls are not flat
    for (let i = 0; i < W * H / 40; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      if (y > top[x] && y < bot[x]) continue;
      g.fillStyle = rnd() > 0.5 ? shade(col, 0.12) : shade(col, -0.3);
      g.fillRect(x, y, 1, 1);
    }
  }

  // one crystal: a pointed hexagonal column, light face on the left, dark on the right
  function crystal(g, bx, by, ang, len, w, col) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const P = (a, b) => [bx + dx * a + nx * b, by + dy * a + ny * b];
    const BL = P(0, -w), BR = P(0, w), SL = P(len * 0.72, -w), SR = P(len * 0.72, w), T = P(len, 0), B = P(0, 0), M = P(len * 0.72, 0);
    poly(g, [BL, SL, T, M, B], S.rims ? col : shade(col, 0.15));
    poly(g, [B, M, T, SR, BR], S.rims ? shade(col, -0.2) : shade(col, -0.35));
    // bright ridge line down the middle and a hot tip
    g.fillStyle = S.rims ? S.crystal[2] : shade(col, 0.6);
    const steps = Math.ceil(len);
    for (let k = 0; k < steps; k += 1) {
      const p = P(len * 0.72 * (k / steps) + (k / steps) * len * 0.28 * 0, 0);
      if (k % 2 === 0) g.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
    if (S.rims) {
      // void crystals: dark glass with white outlines
      g.fillStyle = S.crystal[1];
      for (const [a, b] of [[BL, SL], [SL, T], [T, SR], [SR, BR]]) {
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
        for (let k = 0; k <= n; k++) g.fillRect(Math.round(a[0] + ((b[0] - a[0]) * k) / n), Math.round(a[1] + ((b[1] - a[1]) * k) / n), 1, 1);
      }
    }
    g.fillStyle = "#ffffff";
    g.fillRect(Math.round(T[0]), Math.round(T[1]), 1, 1);
    return T;
  }

  // base: the direction the cluster grows (-PI/2 = up from the floor)
  function cluster(g, gg, x, y, base, size) {
    const n = 3 + Math.floor(rnd() * 4);
    const cols = S.crystal;
    const pts = [];
    // biggest in the middle, smaller ones fanned out
    const order = [...Array(n).keys()].sort((a, b) => Math.abs(a - n / 2) - Math.abs(b - n / 2));
    for (const k of order.reverse()) {
      const spread = (k / (n - 1 || 1) - 0.5) * 1.5;
      const ang = base + spread + (rnd() - 0.5) * 0.25;
      const len = size * (1 - Math.abs(spread) * 0.45) * (0.75 + rnd() * 0.4);
      const col = S.rainbow ? cols[Math.floor(rnd() * cols.length)] : cols[k % 2 ? 0 : (rnd() > 0.7 ? 2 : 0)];
      pts.push(crystal(g, x + spread * size * 0.25, y, ang, len, Math.max(1.5, len * 0.16), col));
    }
    // soft dithered glow on the glow layer
    const R = size * 2, cx = x + Math.cos(base) * size * 0.5, cy = y + Math.sin(base) * size * 0.5;
    for (let yy = Math.floor(cy - R); yy < cy + R; yy++) for (let xx = Math.floor(cx - R); xx < cx + R; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const d = Math.hypot(xx - cx, yy - cy) / R;
      if (d > 1) continue;
      const th = ((xx * 7 + yy * 13) % 16) / 16;
      if ((1 - d) * 0.85 > th) { gg.fillStyle = S.glow; gg.globalAlpha = 0.3 * (1 - d) + 0.05; gg.fillRect(xx, yy, 1, 1); }
    }
    gg.globalAlpha = 1;
    return { x: cx, y: cy, pts, ph: rnd() * 6.28, size };
  }

  function build(w, h, id) {
    W = w; H = h;
    S = SCENES.find((x) => x.id === id) || SCENES[0];
    seed = 4242;
    clusters = []; tips = []; drips = []; sparks = [];

    back = canvas(W, H);
    const g = back.getContext("2d");
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.fillStyle = t < 0.5 ? mix(S.sky[0], S.sky[1], t / 0.5) : mix(S.sky[1], S.sky[2], (t - 0.5) / 0.5);
      g.fillRect(0, Math.floor((H * i) / bands), W, Math.ceil(H / bands) + 1);
    }
    // soft light filling the middle of the cavern
    dither(g, W / 2, H * 0.45, Math.max(W, H) * 0.55, S.glow, 0.09, 0.6);
    // light shafts slanting down from cracks in the roof
    for (let k = 0; k < 3; k++) {
      const x0 = W * (0.2 + k * 0.3 + (rnd() - 0.5) * 0.1), wd = W * (0.04 + rnd() * 0.05);
      for (let y = 0; y < H * 0.85; y++) {
        const xs = x0 + y * 0.18, fade = 1 - y / (H * 0.85);
        for (let x = Math.floor(xs - wd); x < xs + wd; x++) {
          if (((x * 5 + y * 11) % 7) / 7 < fade * 0.6) { g.fillStyle = S.crystal[1]; g.globalAlpha = 0.05; g.fillRect(x, y, 1, 1); }
        }
      }
    }
    g.globalAlpha = 1;
    // far wall: lighter rock, wide opening
    const farTop = ridge(H * 0.16, H * 0.07, 1), farBot = ridge(H * 0.8, H * 0.05, 1);
    rockLayer(g, S.rock[2], farTop, farBot, Math.floor(W / 9), 0);

    glowC = canvas(W, H);
    const gg = glowC.getContext("2d");
    front = canvas(W, H);
    const f = front.getContext("2d");

    // near wall: darker, closer in, framing the edges
    const nearTop = ridge(H * 0.07, H * 0.06, 2), nearBot = ridge(H * 0.9, H * 0.05, 2);
    for (let x = 0; x < W; x++) {
      const edge = Math.max(0, 1 - Math.min(x, W - x) / (W * 0.18));
      nearTop[x] += edge * H * 0.25; nearBot[x] -= edge * H * 0.2;
    }
    rockLayer(f, S.rock[0], nearTop, nearBot, Math.floor(W / 6), 1);
    // side walls, ragged, so crystals can grow out of them at mid height
    const side = (y, ph) => W * (0.07 + 0.04 * Math.sin((y / H) * 7 + ph) + 0.015 * Math.sin(y / 4 + ph * 3));
    const ph1 = rnd() * 6, ph2 = rnd() * 6;
    for (let y = 0; y < H; y++) {
      f.fillStyle = S.rock[0];
      const l = Math.floor(side(y, ph1)), rr = Math.floor(side(y, ph2));
      f.fillRect(0, y, l, 1);
      f.fillRect(W - rr, y, rr, 1);
      f.fillStyle = shade(S.rock[0], 0.18);
      f.fillRect(l, y, 1, 1);
      f.fillRect(W - rr - 1, y, 1, 1);
    }
    poolY = S.pool ? Math.floor(H * 0.86) : H;

    // crystal clusters: far floor, walls (mid height, so they show around the game),
    // near floor and hanging from the roof
    const big = Math.max(W, H) * 0.075;
    const UP = -Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const x = W * (0.14 + i * 0.24 + (rnd() - 0.5) * 0.08);
      clusters.push(cluster(f, gg, x, Math.min(farBot[Math.floor(x)] + 2, poolY), UP, big * (0.45 + rnd() * 0.3)));
    }
    for (const fy of [0.3, 0.52, 0.7]) {
      const y = Math.floor(H * (fy + (rnd() - 0.5) * 0.06));
      clusters.push(cluster(f, gg, side(y, ph1) - 1, y, -0.35 - rnd() * 0.3, big * (0.6 + rnd() * 0.4)));
      const y2 = Math.floor(H * (fy + 0.08 + (rnd() - 0.5) * 0.06));
      clusters.push(cluster(f, gg, W - side(y2, ph2) + 1, y2, Math.PI + 0.35 + rnd() * 0.3, big * (0.6 + rnd() * 0.4)));
    }
    for (const fx of [0.1, 0.9, 0.34, 0.66]) {
      const x = Math.floor(W * fx);
      clusters.push(cluster(f, gg, x, Math.min(nearBot[x] + 2, poolY + 2), UP, big * (0.9 + rnd() * 0.6)));
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(W * (0.22 + i * 0.28 + (rnd() - 0.5) * 0.1));
      clusters.push(cluster(f, gg, x, nearTop[x] - 2, Math.PI / 2, big * (0.45 + rnd() * 0.3)));
    }

    motes = Array.from({ length: Math.floor(W * H / 900) + 12 }, () => ({
      x: rnd() * W, y: rnd() * H, v: 0.04 + rnd() * 0.12, ph: rnd() * 6.28, s: rnd() > 0.8 ? 2 : 1,
    }));
  }

  function drawPool(ctx, t) {
    if (!S.pool) return;
    const top = poolY, hgt = H - top;
    if (S.pool === "water") {
      // mirror the cavern above, rippling
      for (let y = 0; y < hgt; y++) {
        const src = top - 1 - y * 1.4;
        if (src < 0) break;
        const off = reduced ? 0 : Math.round(Math.sin(t / 700 + y * 0.9) * (1 + y * 0.08));
        ctx.globalAlpha = 0.55 - (y / hgt) * 0.35;
        ctx.drawImage(ctx.canvas, 0, Math.floor(src), W, 1, off, top + y, W, 1);
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = S.sky[2];
      ctx.fillRect(0, top, W, hgt);
      // glints on the surface
      ctx.fillStyle = S.mote;
      for (let i = 0; i < W / 10; i++) {
        const x = (i * 37 + Math.floor(t / 90)) % W, y = top + ((i * 13) % hgt);
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t / 400 + i);
        ctx.fillRect(x, y, 2, 1);
      }
      ctx.globalAlpha = 1;
    } else {
      // lava: glowing bands that slowly churn
      for (let y = 0; y < hgt; y++) {
        const k = y / hgt;
        ctx.fillStyle = mix("#ffcf4a", "#a8100c", Math.min(1, k * 1.4 + 0.1 * Math.sin(t / 900 + y)));
        ctx.fillRect(0, top + y, W, 1);
      }
      ctx.fillStyle = "#fff2a8";
      for (let i = 0; i < W / 8; i++) {
        const x = (i * 29 + Math.floor(t / 140) * (i % 2 ? 1 : -1) + W * 4) % W;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 300 + i * 2);
        ctx.fillRect(x, top + ((i * 7) % Math.max(1, hgt)), 3, 1);
      }
      // heat glow fading up the walls
      const glowH = Math.floor(H * 0.3), pulse = 0.22 + 0.06 * Math.sin(t / 800);
      ctx.fillStyle = "#ff5a1a";
      for (let y = 0; y < glowH; y += 2) {
        ctx.globalAlpha = pulse * Math.pow(1 - y / glowH, 2);
        ctx.fillRect(0, top - y - 2, W, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  function draw(ctx, t) {
    const T = reduced ? 0 : t;
    ctx.drawImage(back, 0, 0);
    // the whole cavern breathes: glow layer pulses slowly
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(T / 1800);
    ctx.drawImage(glowC, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(front, 0, 0);

    // motes drift up and sway
    ctx.fillStyle = S.mote;
    for (const m of motes) {
      if (!reduced) { m.y -= m.v; if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; } }
      ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(T / 500 + m.ph));
      ctx.fillRect(Math.floor(m.x + Math.sin(T / 1300 + m.ph) * 3), Math.floor(m.y), m.s, m.s);
    }
    ctx.globalAlpha = 1;

    if (!reduced) {
      // sparkle: a crystal tip flashes a 4-point star now and then
      if (Math.random() < 0.04 && clusters.length) {
        const c = clusters[Math.floor(Math.random() * clusters.length)];
        const p = c.pts[Math.floor(Math.random() * c.pts.length)];
        sparks.push({ x: Math.round(p[0]), y: Math.round(p[1]), life: 22 });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const r = s.life > 11 ? 22 - s.life : s.life;
        const len = Math.max(1, Math.floor(r / 3));
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = Math.min(1, r / 6);
        ctx.fillRect(s.x - len, s.y, len * 2 + 1, 1);
        ctx.fillRect(s.x, s.y - len, 1, len * 2 + 1);
        if (--s.life <= 0) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      // water drips from stalactite tips
      if (Math.random() < 0.02 && tips.length) {
        const tp = tips[Math.floor(Math.random() * tips.length)];
        drips.push({ x: tp.x, y: tp.y, v: 0 });
      }
      ctx.fillStyle = S.mote;
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.v += 0.06; d.y += d.v;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 2);
        if (d.y > poolY - 1 || d.y > H) {
          drips.splice(i, 1);
          sparks.push({ x: Math.floor(d.x), y: Math.min(H - 1, Math.floor(d.y)), life: 8 });
        }
      }
      ctx.globalAlpha = 1;
    }
    drawPool(ctx, T);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, W, H);
  }

  return { build, draw, SCENES };
})();
