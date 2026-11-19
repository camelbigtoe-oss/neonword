// NEONTRACE backdrop: deep space. Drifting star layers, nebula clouds, a ringed planet
// with a small moon, shooting stars and the odd satellite. Drawn by bg.js in "space" mode.
const Space = (() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, back = null, planet = null, ringBack = null, ringFront = null;
  let layers = [], shooters = [], sat = null, nextShoot = 0, nextSat = 0, P = null;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function rgb(c) {
    if (c.startsWith("rgb")) return c.match(/\d+/g).slice(0, 3).map(Number);
    const n = parseInt(c.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  function build(w, h) {
    W = w; H = h;
    seed = 2026;
    // sky gradient with dithered nebula blobs
    back = canvas(W, H);
    const g = back.getContext("2d");
    const bands = 16;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      g.fillStyle = t < 0.5 ? mix("#02030a", "#0a0f2e", t / 0.5) : mix("#0a0f2e", "#1c0f3a", (t - 0.5) / 0.5);
      g.fillRect(0, Math.floor((H * i) / bands), W, Math.ceil(H / bands) + 1);
    }
    const blobs = [["#ff5a7a", 0.22, 0.3], ["#7af0ff", 0.7, 0.18], ["#9a5bff", 0.4, 0.55], ["#ff5a7a", 0.85, 0.7]];
    for (const [col, fx, fy] of blobs) {
      const cx = W * fx, cy = H * fy, R = Math.min(W, H) * (0.35 + rnd() * 0.2);
      for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) {
        for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
          const d = Math.hypot((x - cx) / R, (y - cy) / (R * 0.7));
          if (d > 1) continue;
          // ordered dither: denser toward the middle
          const th = ((x * 7 + y * 13) % 16) / 16;
          if ((1 - d) * 0.55 > th) { g.fillStyle = col; g.globalAlpha = 0.12; g.fillRect(x, y, 1, 1); }
        }
      }
    }
    g.globalAlpha = 1;
    // faint fixed dust
    for (let i = 0; i < W * H / 30; i++) {
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
    }

    // star layers drift sideways at different speeds (parallax)
    layers = [0, 1, 2].map((d) => ({
      speed: [0.6, 1.4, 3][d] / 1000,
      stars: Array.from({ length: Math.floor((W * H) / [70, 160, 420][d]) }, () => ({
        x: rnd() * W, y: rnd() * H, ph: rnd() * 6.28,
        c: rnd() > 0.85 ? (rnd() > 0.5 ? "#ffd2dc" : "#c8f6ff") : "#ffffff", s: d === 2 && rnd() > 0.6 ? 2 : 1,
      })),
      d,
    }));

    buildPlanet();
    shooters = []; sat = null; nextShoot = 0; nextSat = 0;
  }

  // banded planet low on the right, with a ring split into a back half and a front half
  function buildPlanet() {
    const R = Math.floor(Math.min(W, H) * 0.32);
    P = { x: Math.floor(W * 0.86), y: Math.floor(H * 0.86), R };
    planet = canvas(R * 2 + 2, R * 2 + 2);
    const p = planet.getContext("2d");
    const bandCols = ["#3a1f5c", "#5a2a6e", "#ff5a7a", "#7a3a7a", "#2e1d50", "#c8506e", "#45286a"];
    for (let y = -R; y <= R; y++) {
      const w = Math.floor(Math.sqrt(R * R - y * y));
      const band = bandCols[Math.floor(((y + R) / (2 * R)) * bandCols.length * 1.6 + Math.sin(y / 4) * 0.6) % bandCols.length];
      for (let x = -w; x < w; x++) {
        // light from the top left, darker toward the bottom right edge
        const lit = 1 - Math.min(1, Math.max(0, (x + y * 0.6) / (R * 1.1) + 0.35));
        p.fillStyle = mix("#05030c", band, 0.25 + 0.75 * lit);
        p.fillRect(R + 1 + x, R + 1 + y, 1, 1);
      }
    }
    // rim light
    p.fillStyle = "#7af0ff";
    p.globalAlpha = 0.5;
    for (let a = Math.PI * 0.9; a < Math.PI * 1.6; a += 0.02) p.fillRect(Math.floor(R + 1 + Math.cos(a) * R), Math.floor(R + 1 + Math.sin(a) * R), 1, 1);
    p.globalAlpha = 1;
    const ring = (front) => {
      const c = canvas(R * 5, R * 2);
      const r = c.getContext("2d");
      const cx = R * 2.5, cy = R;
      for (let k = 0; k < 5; k++) {
        const rx = R * (1.35 + k * 0.12), ry = rx * 0.22;
        r.fillStyle = k % 2 ? "#ffd2dc" : "#c89ae8";
        r.globalAlpha = 0.55 - k * 0.07;
        for (let a = 0; a < Math.PI * 2; a += 0.6 / rx) {
          const s = Math.sin(a);
          if (front ? s < 0 : s >= 0) continue;
          r.fillRect(Math.floor(cx + Math.cos(a) * rx), Math.floor(cy + s * ry), 1, 1);
        }
      }
      return c;
    };
    ringBack = ring(false);
    ringFront = ring(true);
  }

  function draw(ctx, t) {
    const T = reduced ? 0 : t;
    ctx.drawImage(back, 0, 0);
    for (const L of layers) {
      const off = (T * L.speed * 10) % W;
      for (const s of L.stars) {
        let x = s.x - off;
        if (x < 0) x += W;
        ctx.globalAlpha = (0.35 + 0.25 * L.d) + 0.25 * Math.sin(T / 600 + s.ph);
        ctx.fillStyle = s.c;
        ctx.fillRect(Math.floor(x), Math.floor(s.y), s.s, s.s);
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced) drawShooters(ctx, t);
    // moon orbits the planet, hidden behind it on the far side of its loop
    const ma = (T / 26000) * Math.PI * 2;
    const mx = P.x + Math.cos(ma) * P.R * 1.9, my = P.y + Math.sin(ma) * P.R * 0.45 - P.R * 0.2;
    const behind = Math.sin(ma) < 0;
    if (behind) drawMoon(ctx, mx, my);
    ctx.drawImage(ringBack, P.x - P.R * 2.5, P.y - P.R);
    ctx.drawImage(planet, P.x - P.R - 1, P.y - P.R - 1);
    ctx.drawImage(ringFront, P.x - P.R * 2.5, P.y - P.R);
    if (!behind) drawMoon(ctx, mx, my);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawMoon(ctx, x, y) {
    const r = Math.max(2, Math.floor(P.R * 0.12));
    for (let yy = -r; yy <= r; yy++) {
      const w = Math.floor(Math.sqrt(r * r - yy * yy));
      ctx.fillStyle = yy < 0 ? "#e8eeff" : "#a8b0d0";
      ctx.fillRect(Math.floor(x - w), Math.floor(y + yy), w * 2, 1);
    }
  }

  function drawShooters(ctx, t) {
    if (!nextShoot) nextShoot = t + 1500 + Math.random() * 2500;
    if (t > nextShoot) {
      nextShoot = t + 3000 + Math.random() * 6000;
      const dir = Math.random() > 0.5 ? 1 : -1;
      shooters.push({ x: Math.random() * W, y: Math.random() * H * 0.5, vx: dir * (1.4 + Math.random()), vy: 0.6 + Math.random() * 0.5, life: 40 });
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx; s.y += s.vy; s.life--;
      if (s.life <= 0) { shooters.splice(i, 1); continue; }
      const fade = Math.min(1, s.life / 12);
      for (let k = 0; k < 12; k++) {
        ctx.globalAlpha = fade * (1 - k / 12) * 0.9;
        ctx.fillStyle = k < 2 ? "#ffffff" : "#ffd2dc";
        ctx.fillRect(Math.floor(s.x - s.vx * k * 0.7), Math.floor(s.y - s.vy * k * 0.7), 1, 1);
      }
    }
    if (!nextSat) nextSat = t + 5000;
    if (!sat && t > nextSat) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      sat = { x: dir > 0 ? -2 : W + 2, y: H * (0.08 + Math.random() * 0.35), vx: dir * 0.1, vy: 0.012 };
    }
    if (sat) {
      sat.x += sat.vx; sat.y += sat.vy;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#e8f4ff";
      ctx.fillRect(Math.floor(sat.x), Math.floor(sat.y), 1, 1);
      if (Math.floor(t / 600) % 3 === 0) { ctx.fillStyle = "#7af0ff"; ctx.fillRect(Math.floor(sat.x) + 1, Math.floor(sat.y), 1, 1); }
      if (sat.x < -4 || sat.x > W + 4) { sat = null; nextSat = t + 14000 + Math.random() * 18000; }
    }
    ctx.globalAlpha = 1;
  }

  return { build, draw };
})();
