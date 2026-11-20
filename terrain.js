// NEONSCALE backdrop: a retro wireframe flight over endless terrain. A flat valley floor runs
// down the middle with hills rising either side, mountains on the horizon and something big
// in the sky. Drawn by bg.js in "terrain" mode. Zones unlock with the NEONSCALE level.
const Terrain = (() => {
  // orb: what hangs over the horizon. ui: CSS variables applied while NEONSCALE is open.
  const SCENES = [
    { id: "dusk", name: "VECTOR DUSK", lvl: 1, sky: ["#0a0420", "#3a0a52", "#ff3d8b"], grid: "#ff3dd2", fill: "#0b0420", mount: "#22e4ff",
      orb: { type: "sun", c: ["#ffe14a", "#ff3d8b"] },
      ui: { "--c1": "#ff3dd2", "--c2": "#22e4ff", "--near": "#ffe14a", "--bg": "#0a0420", "--bg2": "#1e0a3a", "--panel": "rgba(14, 4, 34, 0.86)", "--miss": "#2a1650", "--dim": "#9478c0", "--hit": "#39ff88" } },
    { id: "phosphor", name: "GREEN PHOSPHOR", lvl: 2, sky: ["#000400", "#011205", "#03260c"], grid: "#33ff66", fill: "#000500", mount: "#1fae46",
      orb: { type: "moon", c: ["#c8ffd0", "#33ff66"] },
      ui: { "--c1": "#33ff66", "--c2": "#b6ffc4", "--near": "#e8ff6a", "--bg": "#010602", "--bg2": "#03160a", "--panel": "rgba(1, 12, 4, 0.88)", "--miss": "#0c2a14", "--dim": "#4f9a62", "--hit": "#b6ffc4", "--text": "#e2ffe6" } },
    { id: "aurora", name: "ARCTIC AURORA", lvl: 4, sky: ["#01040c", "#06183a", "#0e3a5c"], grid: "#6ff0ff", fill: "#020814", mount: "#e8fbff",
      orb: { type: "aurora", c: ["#5affb4", "#8a7bff"] },
      ui: { "--c1": "#5affb4", "--c2": "#6ff0ff", "--near": "#ffe9a0", "--bg": "#020812", "--bg2": "#071a34", "--panel": "rgba(2, 12, 28, 0.86)", "--miss": "#12304a", "--dim": "#6a96b8", "--hit": "#5affb4" } },
    { id: "mirage", name: "DESERT MIRAGE", lvl: 6, sky: ["#1a0806", "#6e2a10", "#ffb04a"], grid: "#ffb347", fill: "#160804", mount: "#ff7a3a",
      orb: { type: "twin", c: ["#fff3c0", "#ff9a3a"] },
      ui: { "--c1": "#ff7a3a", "--c2": "#ffd08a", "--near": "#fff3c0", "--bg": "#140704", "--bg2": "#301408", "--panel": "rgba(30, 12, 6, 0.86)", "--miss": "#3e1e10", "--dim": "#b8865e", "--hit": "#7affd2" } },
    { id: "eclipse", name: "TOTAL ECLIPSE", lvl: 10, sky: ["#000000", "#12020a", "#3a0618"], grid: "#ff2a4a", fill: "#030003", mount: "#ff2a4a",
      orb: { type: "eclipse", c: ["#ffffff", "#ff2a4a"] },
      ui: { "--c1": "#ff2a4a", "--c2": "#ffd6de", "--near": "#ffcf5a", "--bg": "#040002", "--bg2": "#1a040c", "--panel": "rgba(14, 2, 8, 0.9)", "--miss": "#2e0a16", "--dim": "#a0606e", "--hit": "#ffd6de" } },
    { id: "orbital", name: "RING RISE", lvl: 14, sky: ["#02010a", "#0e0a2e", "#2a1a5a"], grid: "#ffd36a", fill: "#05030e", mount: "#c9b6ff",
      orb: { type: "ring", c: ["#ffd36a", "#c9b6ff"] },
      ui: { "--c1": "#ffd36a", "--c2": "#c9b6ff", "--near": "#ffffff", "--bg": "#04030c", "--bg2": "#120e2e", "--panel": "rgba(8, 6, 24, 0.88)", "--miss": "#221a46", "--dim": "#8a80b8", "--hit": "#7affd8" } },
  ];
  let S = SCENES[0];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, sky = null, hz = 0, stars = [], shooters = [], nextShoot = 0;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const COLS = 13, ROWS = 22, CAM = 1.6;

  function rgb(c) {
    const n = parseInt(c.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  // smooth value noise on integer lattice, so hills keep their shape as rows scroll past
  const hash = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function hill(x, z) {
    const side = Math.max(0, Math.abs(x) - 1.6);
    if (!side) return 0;
    const n = 0.55 + hash(x * 2 | 0, z) * 0.8;
    return Math.pow(side, 1.35) * 0.55 * n;
  }

  function build(w, h, id) {
    W = w; H = h;
    S = SCENES.find((x) => x.id === id) || SCENES[0];
    seed = 909;
    hz = Math.floor(H * 0.5);
    sky = canvas(W, H);
    const g = sky.getContext("2d");
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.fillStyle = t < 0.65 ? mix(S.sky[0], S.sky[1], t / 0.65) : mix(S.sky[1], S.sky[2], (t - 0.65) / 0.35);
      g.fillRect(0, Math.floor((hz * i) / bands), W, Math.ceil(hz / bands) + 1);
    }
    g.fillStyle = S.fill;
    g.fillRect(0, hz, W, H - hz);
    drawOrb(g);
    drawMountains(g, 0.13, mix(S.fill, S.mount, 0.25), 0.55);
    drawMountains(g, 0.08, S.fill, 1);
    // horizon glow line
    g.fillStyle = S.grid;
    g.globalAlpha = 0.9;
    g.fillRect(0, hz, W, 1);
    g.globalAlpha = 0.25;
    g.fillRect(0, hz - 1, W, 1);
    g.fillRect(0, hz + 1, W, 1);
    g.globalAlpha = 1;

    stars = Array.from({ length: Math.floor(W * hz / 90) }, () => ({ x: rnd() * W, y: rnd() * hz * 0.85, ph: rnd() * 6.28, c: rnd() > 0.8 ? S.mount : "#ffffff" }));
    shooters = []; nextShoot = 0;
  }

  function drawOrb(g) {
    const o = S.orb, R = Math.floor(Math.max(W * 0.26, H * 0.09)), cx = Math.floor(W * 0.5), cy = hz - Math.floor(R * 0.85);
    const disc = (x0, y0, r, colA, colB, stripes) => {
      for (let y = -r; y <= r; y++) {
        if (y0 + y > hz) break;
        const w = Math.floor(Math.sqrt(r * r - y * y));
        if (stripes && y > -r * 0.1 && (y + r) % 6 < Math.min(4, 1 + Math.floor((y + r * 0.1) / (r * 0.22)))) continue;
        g.fillStyle = mix(colA, colB, (y + r) / (2 * r));
        g.fillRect(x0 - w, y0 + y, w * 2, 1);
      }
    };
    const halo = (x0, y0, r, col, a) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y) / r;
        if (d > 1 || y0 + y > hz) continue;
        if ((1 - d) * a > ((x * 7 + y * 13 + 64) % 16) / 16) { g.fillStyle = col; g.globalAlpha = 0.18; g.fillRect(x0 + x, y0 + y, 1, 1); }
      }
      g.globalAlpha = 1;
    };
    if (o.type === "sun") { halo(cx, cy, R * 2, o.c[1], 0.7); disc(cx, cy, R, o.c[0], o.c[1], true); }
    else if (o.type === "moon") {
      halo(cx, cy, Math.floor(R * 1.7), o.c[1], 0.5);
      disc(cx, cy, Math.floor(R * 0.8), o.c[0], o.c[0], false);
      // craters
      g.fillStyle = o.c[1]; g.globalAlpha = 0.35;
      for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, d = rnd() * R * 0.55, r = 1 + Math.floor(rnd() * R * 0.15); g.fillRect(Math.floor(cx + Math.cos(a) * d), Math.floor(cy + Math.sin(a) * d), r, r); }
      g.globalAlpha = 1;
    } else if (o.type === "twin") {
      halo(Math.floor(W * 0.36), Math.floor(cy - R * 0.5), R * 2, o.c[1], 0.6);
      disc(Math.floor(W * 0.36), Math.floor(cy - R * 0.5), Math.floor(R * 0.7), o.c[0], o.c[1], false);
      disc(Math.floor(W * 0.68), Math.floor(cy + R * 0.1), Math.floor(R * 0.42), o.c[0], o.c[1], false);
    } else if (o.type === "eclipse") {
      halo(cx, cy, Math.floor(R * 2.2), o.c[1], 0.9);
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        const r = R * (1.02 + 0.25 * Math.pow(Math.abs(Math.sin(a * 3 + 1)), 6));
        for (let k = R; k < r; k++) { g.fillStyle = o.c[0]; g.globalAlpha = 0.7 * (1 - (k - R) / (r - R + 1)); g.fillRect(Math.floor(cx + Math.cos(a) * k), Math.floor(cy + Math.sin(a) * k), 1, 1); }
      }
      g.globalAlpha = 1;
      disc(cx, cy, R, "#000000", "#000000", false);
    } else if (o.type === "ring") {
      const px = Math.floor(W * 0.6), py = hz - Math.floor(R * 0.7);
      halo(px, py, Math.floor(R * 1.9), o.c[1], 0.5);
      const ring = (front) => {
        for (let k = 0; k < 5; k++) {
          const rx = R * (1.5 + k * 0.13), ry = rx * 0.24;
          g.fillStyle = k % 2 ? o.c[0] : o.c[1]; g.globalAlpha = 0.7 - k * 0.1;
          for (let a = 0; a < Math.PI * 2; a += 0.5 / rx) {
            const s = Math.sin(a);
            if (front ? s < 0 : s >= 0) continue;
            const x = Math.floor(px + Math.cos(a) * rx), y = Math.floor(py + s * ry - Math.cos(a) * ry * 0.5);
            if (y <= hz) g.fillRect(x, y, 1, 1);
          }
        }
        g.globalAlpha = 1;
      };
      ring(false);
      for (let y = -R; y <= R; y++) {
        if (py + y > hz) break;
        const w = Math.floor(Math.sqrt(R * R - y * y));
        for (let x = -w; x < w; x++) {
          const lit = 1 - Math.min(1, Math.max(0, (x + y * 0.5) / (R * 1.2) + 0.4));
          g.fillStyle = mix("#06040e", Math.floor((y + R) / 5) % 2 ? o.c[0] : o.c[1], 0.15 + 0.7 * lit);
          g.fillRect(px + x, py + y, 1, 1);
        }
      }
      ring(true);
    }
    // aurora is animated, drawn per frame
  }

  function drawMountains(g, hgt, col, outline) {
    let x = 0;
    const pts = [[0, hz]];
    while (x < W + 20) {
      x += 8 + rnd() * 26;
      pts.push([x, hz - (0.25 + rnd() * 0.75) * H * hgt]);
      x += 6 + rnd() * 14;
      pts.push([x, hz - rnd() * H * hgt * 0.35]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      for (let xx = Math.floor(ax); xx < bx; xx++) {
        const y = Math.floor(ay + ((by - ay) * (xx - ax)) / (bx - ax || 1));
        g.fillStyle = col;
        g.fillRect(xx, y, 1, hz - y);
        g.fillStyle = S.mount;
        g.globalAlpha = outline;
        g.fillRect(xx, y, 1, 1);
        g.globalAlpha = 1;
      }
    }
  }

  function drawAurora(ctx, t) {
    const c = S.orb.c;
    for (let b = 0; b < 3; b++) {
      for (let x = 0; x < W; x += 1) {
        const y = hz * (0.18 + b * 0.1) + Math.sin(x / 18 + t / 2600 + b * 2) * hz * 0.07 + Math.sin(x / 7 + t / 1100 + b) * 2;
        const len = hz * (0.12 + 0.08 * Math.sin(x / 11 + t / 1700 + b * 3));
        for (let k = 0; k < len; k += 2) {
          ctx.globalAlpha = 0.2 * (1 - k / len) * (0.6 + 0.4 * Math.sin(x / 5 + t / 500 + b));
          ctx.fillStyle = k < len * 0.4 ? c[0] : c[1];
          ctx.fillRect(x, Math.floor(y + k), 1, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // wireframe ground: rows of points moving toward the camera
  function drawGround(ctx, t) {
    const speed = reduced ? 0 : t / 900;
    const base = Math.floor(speed), frac = speed - base;
    const f = H * 0.9, cx = W / 2;
    const proj = (xi, zr) => {
      // rows bunch up near the camera and spread out toward the horizon
      const z = 0.3 * Math.pow(1.2, zr - frac);
      const x = (xi - COLS / 2) * 0.9;
      const y = hill(xi - COLS / 2, zr + base);
      return [cx + (x * f) / (z * 3.2), hz + ((CAM - y) * f) / (z * 6)];
    };
    const rows = [];
    for (let r = ROWS; r >= -5; r--) {
      const pts = [];
      for (let i = -3; i <= COLS + 3; i++) pts.push(proj(i, r));
      rows.push({ r, pts });
    }
    ctx.lineWidth = 1;
    // far to near: fill each strip dark, then draw its lines so near hills hide far ones
    for (let k = 0; k < rows.length - 1; k++) {
      const a = rows[k].pts, b = rows[k + 1].pts;
      ctx.beginPath();
      ctx.moveTo(a[0][0], a[0][1]);
      for (const p of a) ctx.lineTo(p[0], p[1]);
      for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]);
      ctx.closePath();
      ctx.fillStyle = S.fill;
      ctx.fill();
      const fade = Math.min(1, (k + 1 - frac) / 5);
      ctx.strokeStyle = S.grid;
      ctx.globalAlpha = 0.35 + 0.55 * fade * (k / rows.length);
      ctx.beginPath();
      ctx.moveTo(b[0][0], b[0][1]);
      for (const p of b) ctx.lineTo(p[0], p[1]);
      for (let i = 0; i < a.length; i++) { ctx.moveTo(a[i][0], a[i][1]); ctx.lineTo(b[i][0], b[i][1]); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function draw(ctx, t) {
    const T = reduced ? 0 : t;
    ctx.drawImage(sky, 0, 0);
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(T / 700 + s.ph);
      ctx.fillStyle = s.c;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    if (S.orb.type === "aurora") drawAurora(ctx, T);
    if (!reduced) {
      if (!nextShoot) nextShoot = t + 2000;
      if (t > nextShoot) {
        nextShoot = t + 2500 + Math.random() * 5000;
        shooters.push({ x: Math.random() * W, y: Math.random() * hz * 0.5, vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random()), vy: 0.5, life: 34 });
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx; s.y += s.vy;
        if (--s.life <= 0 || s.y > hz) { shooters.splice(i, 1); continue; }
        for (let k = 0; k < 10; k++) {
          ctx.globalAlpha = Math.min(1, s.life / 10) * (1 - k / 10);
          ctx.fillStyle = k < 2 ? "#ffffff" : S.grid;
          ctx.fillRect(Math.floor(s.x - s.vx * k * 0.7), Math.floor(s.y - s.vy * k * 0.7), 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    drawGround(ctx, T);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, W, H);
  }

  return { build, draw, SCENES };
})();
