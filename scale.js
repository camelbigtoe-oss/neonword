// NEONSCALE — seven "how big / how many" questions. Spin a logarithmic dial to your estimate
// and lock it in. Scoring is on orders of magnitude: being ×2 out costs the same for 5 as for
// 5 billion. Max 100 per question, 700 a run.
const Scale = (() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ROUNDS = 7;
  const SPAN = 7;            // decades visible on a question's dial
  const COST = { probe: 1, bracket: 2 };
  const TIERS = [
    { max: 0.021, name: "BULLSEYE", cls: "s0" },
    { max: 0.1, name: "SHARP", cls: "s1" },
    { max: 0.3, name: "CLOSE", cls: "s2" },
    { max: 0.7, name: "WARM", cls: "s3" },
    { max: 1, name: "BALLPARK", cls: "s4" },
    { max: Infinity, name: "OFF THE SCALE", cls: "s5" },
  ];
  const RANKS = [[0, "LOST IN SPACE"], [150, "WILD GUESSER"], [300, "ROUGH SKETCH"], [400, "ON THE MAP"], [500, "GOOD EYE"], [580, "HUMAN RULER"], [650, "LIVING CALCULATOR"]];
  const SHARE = ["🎯", "🟩", "🟦", "🟨", "🟧", "🟥"];
  const WORDS = [[1e15, "QUADRILLION"], [1e12, "TRILLION"], [1e9, "BILLION"], [1e6, "MILLION"]];
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  let NW = null, T = null, G = null;
  let drag = null, vel = 0, anim = null, holdT = null;

  const defaults = () => ({
    mode: "daily", seenHelp: false, zone: "dusk",
    stats: { runs: 0, best: 0, total: 0, n: 0, errSum: 0, over: 0, under: 0, tiers: [0, 0, 0, 0, 0, 0], cats: {} },
    daily: { streak: 0, best: 0, lastWin: null },
    games: { daily: null, endless: null },
    recent: [], history: [], log: [],
  });

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const save = () => NW.save();
  const Q = (k = G.i) => { const q = SCALE_QS[G.ids[k]]; return { q: q[0], ans: q[1], unit: q[2], fact: q[3], cat: q[4] }; };
  const score = (g = G) => g.answers.reduce((s, a) => s + (a ? a.pts : 0), 0);
  const rankOf = (s) => RANKS.filter(([min]) => s >= min).pop()[1];
  const tierOf = (err) => TIERS.findIndex((t) => err <= t.max);
  const ptsOf = (err) => (err <= TIERS[0].max ? 100 : Math.max(0, Math.min(100, Math.round(100 - 66 * err))));
  const lg = Math.log10;
  const sup = (n) => String(n).split("").map((c) => SUP[c] || c).join("");

  // ---------- numbers ----------
  // round to n significant figures
  function sig(x, n = 2) {
    if (!(x > 0)) return 0;
    const e = Math.floor(lg(x)) - (n - 1);
    const m = Math.round(x / 10 ** e);
    return m * 10 ** e;
  }

  function fmt(x) {
    if (!(x > 0)) return "0";
    if (x >= 1e18 || x < 1e-4) {
      const e = Math.floor(lg(x)), m = x / 10 ** e;
      return `${+m.toFixed(2)} × 10${sup(e)}`;
    }
    for (const [v, w] of WORDS) if (x >= v) return `${+(x / v).toPrecision(3)} ${w}`;
    if (x >= 1) return Math.round(x * 100) / 100 >= 1000 ? Math.round(x).toLocaleString("en") : String(+x.toPrecision(4));
    return String(+x.toPrecision(3));
  }

  // full digits under the big readout, where that is still readable
  function longForm(x) {
    if (x >= 1e6 && x < 1e18) return `= ${Math.round(sig(x, 3)).toLocaleString("en")}`;
    return "";
  }

  // short tape labels
  function tick(e) {
    const names = { 3: "1K", 4: "10K", 5: "100K", 6: "1M", 7: "10M", 8: "100M", 9: "1B", 10: "10B", 11: "100B", 12: "1T", 13: "10T", 14: "100T" };
    if (e >= 0 && e <= 2) return String(10 ** e);
    if (names[e]) return names[e];
    if (e < 0 && e >= -3) return String(10 ** e);
    return `10${sup(e)}`;
  }

  function parseNum(s) {
    s = String(s).trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
    const m = s.match(/^([0-9]*\.?[0-9]+)\s*(e\s*[-+]?\d+)?\s*(k|thousand|m|mil|million|b|bn|billion|t|tn|trillion|quadrillion)?$/);
    if (!m) return NaN;
    let v = parseFloat(m[1]);
    if (m[2]) v *= 10 ** parseInt(m[2].replace(/[e\s]/g, ""), 10);
    const mult = { k: 1e3, thousand: 1e3, m: 1e6, mil: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, tn: 1e12, trillion: 1e12, quadrillion: 1e15 };
    if (m[3]) v *= mult[m[3]];
    return v;
  }

  // ---------- setup ----------
  function hash(n) { let h = Math.imul(n + 1, 2654435761) >>> 0; h = (h ^ (h >>> 15)) >>> 0; h = Math.imul(h, 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; }

  // each question has its own 7-decade window, placed so the answer is not always central
  function range(id) {
    const a = lg(SCALE_QS[id][1]);
    const off = 1.3 + hash(id + 7) * (SPAN - 2.6);
    const lo = Math.floor(a - off);
    return [lo, lo + SPAN];
  }

  function dailyIds(key) {
    const n = SCALE_QS.length;
    const days = Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 864e5);
    const order = NW.seededShuffle(n, 9157);
    const start = (((days * ROUNDS) % n) + n) % n;
    return Array.from({ length: ROUNDS }, (_, k) => order[(start + k) % n]);
  }

  function freshGame(mode) {
    let ids;
    if (mode === "daily") ids = dailyIds(NW.dateKey());
    else {
      const all = [...SCALE_QS.keys()];
      let pool = all.filter((i) => !T.recent.includes(i));
      if (pool.length < ROUNDS) { T.recent = []; pool = all; }
      ids = [];
      while (ids.length < ROUNDS) { const i = pick(pool); if (!ids.includes(i)) ids.push(i); }
      T.recent = [...T.recent, ...ids].slice(-Math.floor(SCALE_QS.length * 0.75));
    }
    const g = { mode, ids, date: NW.dateKey(), i: 0, answers: [], phase: "ask", status: "play", hints: 0, probes: [], bracket: null, rewarded: false };
    resetDial(g);
    return g;
  }

  function resetDial(g) {
    const [lo, hi] = range(g.ids[g.i]);
    g.v = (lo + hi) / 2;
    g.val = sig(10 ** g.v);
    g.probes = [];
    g.bracket = null;
  }

  function enter(api) {
    NW = api;
    NW.P.scale = Object.assign(defaults(), NW.P.scale || {});
    T = NW.P.scale;
    startMode(T.mode, !T.seenHelp);
    if (!T.seenHelp) setTimeout(showHelp, 300);
  }

  function startMode(mode, quiet = false) {
    T.mode = mode;
    if (mode === "daily") {
      const g = T.games.daily;
      G = g && g.date === NW.dateKey() ? g : (T.games.daily = freshGame("daily"));
    } else {
      const g = T.games.endless;
      G = g && g.status === "play" ? g : (T.games.endless = freshGame("endless"));
    }
    stopAnim();
    if (G.status !== "play" && !G.rewarded) applyRewards();
    save();
    renderAll();
    if (G.status !== "play" && !quiet) setTimeout(showResult, 300);
  }

  // ---------- rendering ----------
  function renderAll() {
    $$("#scale .mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.smode === T.mode));
    renderHud();
    renderCard();
    renderReadout();
    renderControls();
    drawTape();
  }

  function renderHud() {
    const I = NW.levelInfo(NW.P.lv.scale);
    $("#s-lvl").textContent = I.lvl;
    $("#s-xpfill").style.width = `${(I.into / I.need) * 100}%`;
    $("#s-xptxt").textContent = `${I.into}/${I.need}`;
    $("#s-credits").textContent = NW.P.credits;
    const lw = T.daily.lastWin;
    const s = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    $("#s-streak").textContent = s > 0 ? `×${s}` : "";
    $("#s-score").innerHTML = `<b>${score()}</b>/${ROUNDS * 100}`;
  }

  function renderCard() {
    const done = G.status !== "play";
    const q = Q(Math.min(G.i, ROUNDS - 1));
    $("#s-round").textContent = done ? "RUN COMPLETE" : `Q ${G.i + 1}/${ROUNDS} · ${q.cat}`;
    $("#s-pips").innerHTML = G.ids.map((_, j) => {
      const a = G.answers[j];
      return `<i class="${a ? TIERS[a.tier].cls : j === G.i && !done ? "cur" : ""}"></i>`;
    }).join("");
    $("#s-q").textContent = done ? rankOf(score()) : q.q;
  }

  function renderReadout() {
    const q = Q(Math.min(G.i, ROUNDS - 1));
    const r = $("#s-read"), sub = $("#s-sub"), msg = $("#s-msg");
    if (G.status !== "play") {
      r.innerHTML = `${score()}<small>/700</small>`;
      sub.textContent = "TAP FOR RESULTS";
      msg.className = "s-msg";
      msg.textContent = "";
      return;
    }
    const a = G.answers[G.i];
    if (G.phase === "show" && a) {
      r.innerHTML = `${fmt(q.ans)} <small>${q.unit}</small>`;
      r.className = "s-read reveal";
      const ratio = a.g > q.ans ? a.g / q.ans : q.ans / a.g;
      sub.textContent = `YOU SAID ${fmt(a.g)}${a.err > 0.021 ? ` · ×${ratio < 10 ? ratio.toFixed(1) : fmt(sig(ratio))} ${a.g > q.ans ? "TOO HIGH" : "TOO LOW"}` : ""}`;
      msg.className = `s-msg ${TIERS[a.tier].cls}c`;
      msg.innerHTML = `<b>${TIERS[a.tier].name} +${a.pts}</b> ${q.fact}`;
      return;
    }
    r.className = "s-read";
    r.innerHTML = `${fmt(G.val)} <small>${q.unit}</small>`;
    sub.textContent = longForm(G.val) || "drag the dial · tap number to type";
    const p = G.probes[G.probes.length - 1];
    msg.className = "s-msg";
    msg.textContent = G.bracket ? `BRACKET: between ${fmt(sig(10 ** G.bracket[0]))} and ${fmt(sig(10 ** G.bracket[1]))}`
      : p ? `PROBE: ${p.d === 0 ? "SPOT ON" : p.d > 0 ? "HIGHER" : "LOWER"} than ${fmt(p.val)}` : "";
  }

  function renderControls() {
    const ask = G.status === "play" && G.phase === "ask";
    $("#s-hints").hidden = !ask;
    $("#s-lock").textContent = G.status !== "play" ? "SEE RESULTS" : !ask ? (G.i === ROUNDS - 1 ? "FINISH RUN ▶" : "NEXT QUESTION ▶") : "LOCK IN";
    $("#s-lock").classList.toggle("next", !ask);
    $("#s-bracket").disabled = !!G.bracket;
    $$("#s-steps button").forEach((b) => (b.disabled = !ask));
    $(".s-dial").classList.toggle("reveal", !ask);
  }

  // ---------- the tape (log dial) ----------
  const cv = $("#s-tape");
  const DEC = () => Math.max(80, Math.min(140, cv.clientWidth / 3.4));   // px per decade

  function drawTape() {
    if (!G) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const D = DEC(), cx = w / 2, v = G.v;
    const X = (lv) => cx + (lv - v) * D;
    const [lo, hi] = range(G.ids[Math.min(G.i, ROUNDS - 1)]);
    const css = (n) => NW.getVar(n);
    // out-of-range zones
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0, 0, Math.max(0, X(lo)), h);
    g.fillRect(X(hi), 0, w, h);
    // bracket hint zone
    if (G.bracket && G.phase === "ask") {
      g.fillStyle = css("--near");
      g.globalAlpha = 0.18;
      g.fillRect(X(G.bracket[0]), 0, (G.bracket[1] - G.bracket[0]) * D, h);
      g.globalAlpha = 1;
    }
    // ticks
    const first = Math.floor(v - w / 2 / D) - 1, last = Math.ceil(v + w / 2 / D) + 1;
    g.font = `${Math.round(h * 0.17)}px "Press Start 2P", monospace`;
    g.textAlign = "center";
    g.textBaseline = "top";
    for (let e = Math.max(first, lo); e <= Math.min(last, hi); e++) {
      for (let m = 1; m < 10; m++) {
        const lv = e + lg(m);
        if (lv > hi) break;
        const x = Math.round(X(lv)) + 0.5;
        const major = m === 1;
        g.fillStyle = major ? css("--c2") : css("--dim");
        const th = major ? h * 0.42 : m === 5 ? h * 0.26 : h * 0.16;
        g.fillRect(x - (major ? 1 : 0.5), h - th, major ? 2 : 1, th);
        if (major) { g.fillStyle = css("--text"); g.fillText(tick(e), x, h * 0.08); }
      }
    }
    // probe markers
    for (const p of G.phase === "ask" ? G.probes : []) {
      const x = X(lg(p.val));
      g.fillStyle = css("--near");
      g.font = `${Math.round(h * 0.2)}px "Press Start 2P", monospace`;
      g.fillText(p.d === 0 ? "◆" : p.d > 0 ? "▶" : "◀", x, h * 0.32);
    }
    // reveal: your guess and the answer
    if (G.phase === "show" && G.answers[G.i]) {
      const a = G.answers[G.i], q = Q();
      const gx = X(lg(a.g)), ax = X(lg(q.ans));
      g.fillStyle = css("--c1");
      g.globalAlpha = 0.22;
      g.fillRect(Math.min(gx, ax), 0, Math.abs(ax - gx), h);
      g.globalAlpha = 1;
      g.fillRect(gx - 1.5, 0, 3, h);
      g.fillStyle = css("--near");
      g.fillRect(ax - 2, 0, 4, h);
      g.shadowColor = css("--near"); g.shadowBlur = 12;
      g.fillRect(ax - 2, 0, 4, h);
      g.shadowBlur = 0;
    }
  }

  function setV(nv, snap = true) {
    const [lo, hi] = range(G.ids[G.i]);
    G.v = Math.max(lo, Math.min(hi, nv));
    if (snap) G.val = sig(10 ** G.v);
    renderReadout();
    drawTape();
  }

  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }

  // fling: keep moving after release, slowing down
  function coast() {
    stopAnim();
    let lastT = performance.now();
    const step = (t) => {
      const dt = Math.min(50, t - lastT); lastT = t;
      vel *= Math.pow(0.9, dt / 16);
      if (Math.abs(vel) < 0.0004) { anim = null; save(); return; }
      setV(G.v + vel * dt);
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  // smooth glide to a log value (used on reveal)
  function glide(to, then) {
    stopAnim();
    const from = G.v, t0 = performance.now(), dur = 900;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      G.v = from + (to - from) * e;
      drawTape();
      if (k < 1) anim = requestAnimationFrame(step);
      else { anim = null; then && then(); }
    };
    anim = requestAnimationFrame(step);
  }

  cv.addEventListener("pointerdown", (e) => {
    NW.SFX.init();
    if (!G || G.status !== "play" || G.phase !== "ask") return;
    stopAnim();
    cv.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, t: performance.now(), lastV: G.v };
    vel = 0;
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, now = performance.now();
    drag.x = e.clientX;
    const nv = G.v - dx / DEC();
    const dt = Math.max(1, now - drag.t);
    vel = vel * 0.6 + ((nv - G.v) / dt) * 0.4;
    drag.t = now;
    const before = Math.floor(G.v * 10);
    setV(nv);
    if (Math.floor(G.v * 10) !== before) NW.SFX.key();
  });
  const endDrag = () => {
    if (!drag) return;
    const idle = performance.now() - drag.t;
    drag = null;
    if (idle < 90 && Math.abs(vel) > 0.002) coast();
    else save();
  };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);
  cv.addEventListener("wheel", (e) => {
    if (!G || G.status !== "play" || G.phase !== "ask") return;
    e.preventDefault();
    setV(G.v + (e.deltaY + e.deltaX) / DEC() / 3);
  }, { passive: false });
  new ResizeObserver(drawTape).observe(cv);

  // step buttons: ÷10, -, +, ×10 (hold - / + to repeat)
  function stepVal(kind) {
    if (G.status !== "play" || G.phase !== "ask") return;
    stopAnim();
    if (kind === "d10") setV(G.v - 1);
    else if (kind === "m10") setV(G.v + 1);
    else {
      // next or previous two-significant-figure value
      const x = G.val, e = Math.floor(lg(x) + 1e-9) - 1;
      let m = Math.round(x / 10 ** e) + (kind === "up" ? 1 : -1);
      let ee = e;
      if (m > 99) { m = 10; ee++; } else if (m < 10) { m = 99; ee--; }
      const nv = m * 10 ** ee;
      const [lo, hi] = range(G.ids[G.i]);
      if (lg(nv) < lo || lg(nv) > hi) return;
      G.val = nv;
      G.v = lg(nv);
      renderReadout();
      drawTape();
    }
    NW.SFX.key();
  }
  $$("#s-steps button").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      NW.SFX.init();
      e.preventDefault();
      stepVal(b.dataset.step);
      if (b.dataset.step === "up" || b.dataset.step === "down") {
        let delay = 380;
        const again = () => { stepVal(b.dataset.step); delay = Math.max(40, delay * 0.8); holdT = setTimeout(again, delay); };
        holdT = setTimeout(again, delay);
      }
    });
    const stop = () => { clearTimeout(holdT); holdT = null; if (G) save(); };
    b.addEventListener("pointerup", stop);
    b.addEventListener("pointerleave", stop);
    b.addEventListener("pointercancel", stop);
  });

  // tap the readout to type an exact number
  function typeIn() {
    if (G.status !== "play") return showResult();
    if (G.phase !== "ask") return;
    const q = Q();
    NW.openModal(`
      <h2>TYPE A NUMBER</h2>
      <p style="color:var(--dim)">${q.q}</p>
      <textarea id="s-in" class="backup-box s-in" rows="1" inputmode="decimal" placeholder="e.g. 4500, 2.5m, 3 billion" spellcheck="false"></textarea>
      <p style="color:var(--dim);font-size:16px">Shortcuts: k = thousand, m = million, b = billion, t = trillion, or 4e9.</p>
      <div class="btn-row"><button class="btn" id="s-in-go">SET DIAL</button></div>`);
    const inp = $("#s-in");
    inp.value = String(+G.val.toPrecision(3));
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const go = () => {
      const v = parseNum(inp.value);
      const [lo, hi] = range(G.ids[G.i]);
      if (!(v > 0)) { NW.SFX.error(); return NW.toast("THAT'S NOT A NUMBER"); }
      if (lg(v) < lo || lg(v) > hi) { NW.SFX.error(); return NW.toast(`KEEP IT ${fmt(10 ** lo)} – ${fmt(10 ** hi)}`); }
      G.val = sig(v, 3);
      G.v = lg(G.val);
      save();
      NW.closeModal();
      NW.SFX.coin();
      renderReadout(); drawTape();
    };
    $("#s-in-go").onclick = go;
    inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); go(); } });
  }

  // ---------- play ----------
  function lockIn() {
    NW.SFX.init();
    if (G.status !== "play") return showResult();
    if (G.phase === "show") return next();
    stopAnim();
    const q = Q();
    const g = G.val;
    const err = Math.abs(lg(g) - lg(q.ans));
    const tier = tierOf(err);
    const a = { g, err, tier, pts: ptsOf(err) };
    G.answers[G.i] = a;
    G.phase = "show";
    // stats and the log are updated per question, so a half-played run still counts
    const S = T.stats;
    S.n++; S.errSum += err; S.tiers[tier]++;
    if (err > 0.021) { if (g > q.ans) S.over++; else S.under++; }
    const c = S.cats[q.cat] || (S.cats[q.cat] = [0, 0]);
    c[0] += err; c[1]++;
    T.log.push({ id: G.ids[G.i], g, tier, t: Date.now() });
    if (T.log.length > 400) T.log = T.log.slice(-400);
    save();
    renderHud(); renderCard(); renderControls();
    NW.SFX.click();
    glide(lg(q.ans), () => {
      renderReadout();
      const r = $("#s-read").getBoundingClientRect();
      const col = NW.getVar(`--${TIERS[tier].cls}`);
      if (tier <= 2) NW.BG.burst(r.left + r.width / 2, r.top + r.height / 2, [col, "#ffffff"], 50 - tier * 14);
      if (tier === 0) { NW.SFX.win(); NW.toast("BULLSEYE!", true, 1300); NW.BG.confetti([col, NW.getVar("--c1"), "#ffffff"]); }
      else if (tier <= 2) NW.SFX.coin();
      else if (tier === 5) NW.SFX.lose();
      else NW.SFX.flip("near", 0);
      drawTape();
    });
    // hold the answer back until the dial has slid over to it
    $("#s-read").textContent = "…";
    $("#s-sub").textContent = `YOU SAID ${fmt(g)}`;
    $("#s-msg").textContent = "";
  }

  function next() {
    NW.SFX.click();
    if (G.i >= ROUNDS - 1) return onFinish();
    G.i++;
    G.phase = "ask";
    resetDial(G);
    save();
    renderAll();
  }

  function useHint(kind) {
    NW.SFX.init();
    if (G.status !== "play" || G.phase !== "ask") return;
    if (kind === "bracket" && G.bracket) return;
    if (!NW.spend(COST[kind])) return;
    G.hints++;
    NW.SFX.hint();
    const a = lg(Q().ans);
    if (kind === "probe") {
      const e = lg(G.val) - a;
      G.probes.push({ val: G.val, d: Math.abs(e) <= 0.021 ? 0 : e < 0 ? 1 : -1 });
    } else {
      const off = 0.12 + hash(G.ids[G.i] * 13 + 1) * 0.76;
      G.bracket = [a - off, a - off + 1];
    }
    save();
    renderHud(); renderReadout(); renderControls(); drawTape();
  }

  // ---------- end ----------
  function applyRewards() {
    if (G.rewarded) return null;
    G.rewarded = true;
    const s = score();
    const S = T.stats;
    S.runs++;
    S.total += s;
    S.best = Math.max(S.best, s);
    const bulls = G.answers.filter((a) => a && a.tier === 0).length;
    let xp = 15 + Math.round(s / 7) + bulls * 3;
    let credits = 1 + (s >= 400 ? 1 : 0) + (s >= 550 ? 1 : 0), bonus = "";
    if (G.mode === "daily") {
      xp = Math.round(xp * 1.5);
      credits += 1;
      T.daily.streak = T.daily.lastWin === NW.yesterdayKey() ? T.daily.streak + 1 : 1;
      T.daily.lastWin = NW.dateKey();
      T.daily.best = Math.max(T.daily.best, T.daily.streak);
      if (T.daily.streak % 7 === 0) { credits += 5; bonus = `${T.daily.streak}-DAY STREAK BONUS +◈5`; }
    }
    G.reward = { xp, credits, bonus };
    T.history.push({ mode: G.mode, s, ids: G.ids, t: Date.now(), xp });
    if (T.history.length > 1000) T.history = T.history.slice(-1000);
    return NW.reward("scale", xp, credits);
  }

  function onFinish() {
    G.status = "done";
    const lv = applyRewards();
    save();
    NW.SFX.win();
    NW.toast(rankOf(score()), true, 1600);
    NW.BG.confetti([NW.getVar("--c1"), NW.getVar("--c2"), NW.getVar("--near")]);
    renderAll();
    setTimeout(() => { if (lv && lv.after > lv.before) NW.levelUp("scale", lv.after, showResult); else showResult(); }, 1800);
  }

  function summaryHtml() {
    return `<div class="r-sum">${G.ids.map((id, j) => {
      const a = G.answers[j];
      const q = SCALE_QS[id];
      return `<div class="r-sum-row ${a ? TIERS[a.tier].cls : "s5"}"><span class="r-sum-q">${q[0]}</span><span class="r-sum-a">${a ? `${fmt(a.g)} → ${fmt(q[1])}` : "—"}</span><b>${a ? a.pts : 0}</b></div>`;
    }).join("")}</div>`;
  }

  function shareText() {
    const head = G.mode === "daily" ? `NEONSCALE DAILY ${G.date}` : "NEONSCALE RUN";
    return `${head}\n${score()}/700 · ${rankOf(score())}\n${G.answers.map((a) => SHARE[a.tier]).join("")}`;
  }

  function showResult() {
    if (!G || G.status === "play" || document.body.dataset.game !== "scale") return;
    const r = G.reward || { xp: 0, credits: 0 };
    const s = score();
    NW.openModal(`
      <h2>RUN COMPLETE</h2>
      <div class="answer-reveal r-total">${s}<small>/700</small></div>
      <p class="r-rank">${rankOf(s)}</p>
      ${summaryHtml()}
      <h3>REWARDS</h3>
      <p class="reward">+${r.xp} XP &nbsp; ${r.credits ? `+◈${r.credits}` : ""}</p>
      ${r.bonus ? `<p class="reward">${r.bonus}</p>` : ""}
      ${G.mode === "daily" ? `<h3>NEXT DAILY IN <span id="s-cd">${NW.nextDailyIn()}</span></h3>` : ""}
      <div class="btn-row">
        <button class="btn" id="sr-next">${G.mode === "daily" ? "PLAY ENDLESS" : "NEW RUN"}</button>
        <button class="btn alt" id="sr-share">SHARE</button>
      </div>`);
    $("#sr-next").onclick = () => {
      NW.closeModal();
      if (G.mode !== "daily") T.games.endless = null;
      startMode("endless");
    };
    $("#sr-share").onclick = async () => {
      const txt = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: txt });
        else { await navigator.clipboard.writeText(txt); NW.toast("COPIED TO CLIPBOARD"); }
      } catch {}
    };
    if (G.mode === "daily") {
      const iv = setInterval(() => {
        const el = $("#s-cd");
        if (!el) return clearInterval(iv);
        el.textContent = NW.nextDailyIn();
      }, 1000);
    }
  }

  function showStats() {
    const S = T.stats;
    const lw = T.daily.lastWin;
    const ds = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    const I = NW.levelInfo(NW.P.lv.scale);
    const avgOff = S.n ? 10 ** (S.errSum / S.n) : 0;
    const missed = S.over + S.under;
    const lean = missed < 3 ? "Not enough misses to tell yet." : S.over > S.under * 1.3 ? `You tend to <b class="s3c">OVERESTIMATE</b> (${Math.round((S.over / missed) * 100)}% of misses too high).`
      : S.under > S.over * 1.3 ? `You tend to <b class="s1c">UNDERESTIMATE</b> (${Math.round((S.under / missed) * 100)}% of misses too low).` : "Your misses are balanced between too high and too low.";
    const cats = Object.entries(S.cats).filter(([, c]) => c[1] >= 2).map(([k, c]) => [k, c[0] / c[1]]).sort((a, b) => a[1] - b[1]);
    const max = Math.max(1, ...S.tiers);
    NW.openModal(`
      <h2>SCALE STATS</h2>
      <div class="stat-grid">
        <div><b>${S.runs}</b><span>runs</span></div>
        <div><b>${S.best}</b><span>best</span></div>
        <div><b>${S.runs ? Math.round(S.total / S.runs) : 0}</b><span>average</span></div>
        <div><b>${S.tiers[0]}</b><span>bullseyes</span></div>
      </div>
      <h3>DAILY</h3>
      <div class="stat-grid">
        <div><b>${ds}</b><span>day streak</span></div>
        <div><b>${T.daily.best}</b><span>best run</span></div>
        <div><b>${I.lvl}</b><span>level</span></div>
        <div><b>${NW.P.lv.scale}</b><span>xp</span></div>
      </div>
      <h3>CALIBRATION</h3>
      <p>Typical guess is off by <b style="color:var(--near)">×${S.n ? avgOff.toFixed(1) : "-"}</b>. ${lean}</p>
      ${cats.length ? `<p>Best at <b style="color:var(--hit)">${cats[0][0]}</b>${cats.length > 1 ? `, weakest at <b style="color:var(--burn)">${cats[cats.length - 1][0]}</b>` : ""}.</p>` : ""}
      <h3>ACCURACY</h3>
      <div class="dist">${S.tiers.map((n, j) => `
        <div class="dist-row"><span class="r-dname">${TIERS[j].name}</span><div class="dist-bar ${TIERS[j].cls}b" style="width:${Math.max(8, (n / max) * 100)}%">${n}</div></div>`).join("")}
      </div>`);
  }

  function showLog() {
    const list = T.log.slice().reverse();
    NW.openModal(`
      <h2>FIELD LOG</h2>
      <p style="color:var(--dim)">Your last ${list.length} estimates. Tap one for the fact.</p>
      <div class="hist-list">
        ${list.length ? list.map((l) => {
          const q = SCALE_QS[l.id];
          return `<button class="hist-row won s-log ${TIERS[l.tier].cls}">
            <span class="hist-word r-cx-q">${q[0]}</span>
            <span class="hist-meta">${fmt(l.g)} → ${fmt(q[1])} ${q[2]}</span>
            <span class="hist-clue">${TIERS[l.tier].name} · ${q[3]}</span>
          </button>`;
        }).join("") : `<p style="color:var(--dim)">No estimates yet.</p>`}
      </div>`);
    $$(".hist-row").forEach((r) => (r.onclick = () => r.classList.toggle("open")));
  }

  function showHelp() {
    NW.openModal(`
      <h2>HOW TO PLAY</h2>
      <p>Seven questions like <b style="color:var(--c2)">"How tall is Mount Everest?"</b>. Drag the dial left and right to set your estimate, then <kbd>LOCK IN</kbd>.</p>
      <p>The dial is logarithmic: each big tick is ×10. Fine-tune with <kbd>−</kbd> <kbd>+</kbd>, jump with <kbd>÷10</kbd> <kbd>×10</kbd>, or tap the number to type one.</p>
      <h3>SCORING</h3>
      <p>What counts is how many times too big or too small you are, not the raw gap.</p>
      <div class="s-legend">${[["s0", "BULLSEYE", "within 5%", 100], ["s1", "SHARP", "within ×1.25", "93+"], ["s2", "CLOSE", "within ×2", "80+"], ["s3", "WARM", "within ×5", "54+"], ["s4", "BALLPARK", "within ×10", "34+"], ["s5", "OFF THE SCALE", "more than ×10", "0+"]]
        .map(([c, n, d, p]) => `<div class="${c}c"><b>${n}</b><span>${d}</span><i>${p}</i></div>`).join("")}</div>
      <h3>HINTS · cost ◈</h3>
      <p><kbd>PROBE</kbd> ◈${COST.probe} — is the answer higher or lower than the dial right now?</p>
      <p><kbd>BRACKET</kbd> ◈${COST.bracket} — shows a ×10 window the answer sits in.</p>
      <h3>REWARDS</h3>
      <p>Max score 700. Bullseyes pay +3 XP each. Daily runs pay 1.5× XP and +◈1. NEONSCALE has its own level, which unlocks new zones (◆) to fly over.</p>
      <div class="btn-row"><button class="btn" id="sh-go">START</button></div>
      <p style="color:var(--dim);font-size:15px;margin-top:14px">build ${NW.APP_VERSION}</p>`);
    $("#sh-go").onclick = NW.closeModal;
    T.seenHelp = true;
    save();
  }

  // ---------- zones (backgrounds + colours that unlock with level) ----------
  function sceneFor(P) {
    const lvl = NW.levelInfo((P.lv && P.lv.scale) || 0).lvl;
    const s = BG.ZONES.find((x) => x.id === (P.scale && P.scale.zone));
    return s && s.lvl <= lvl ? s.id : BG.ZONES[0].id;
  }

  function paint(on) {
    const st = document.body.style;
    new Set(BG.ZONES.flatMap((s) => Object.keys(s.ui))).forEach((k) => st.removeProperty(k));
    if (!on || !NW) return;
    const s = BG.ZONES.find((x) => x.id === sceneFor(NW.P));
    for (const [k, v] of Object.entries(s.ui)) st.setProperty(k, v);
  }

  function showScenes() {
    const lvl = NW.levelInfo(NW.P.lv.scale).lvl;
    const cur = sceneFor(NW.P);
    NW.openModal(`
      <h2>ZONES</h2>
      <p style="color:var(--dim)">Level up in NEONSCALE to fly further. Each zone has its own sky and colours.</p>
      <div class="theme-grid">
        ${BG.ZONES.map((s) => `
          <button class="theme-card ${cur === s.id ? "on" : ""}" data-zone="${s.id}" ${lvl < s.lvl ? "disabled" : ""}>
            <div class="swatches">${[s.grid, s.mount, s.orb.c[0], s.sky[2]].map((c) => `<i style="background:${c}"></i>`).join("")}</div>
            <span class="theme-name">${s.name}</span>
            <span class="theme-lock">${lvl < s.lvl ? `🔒 LV ${s.lvl}` : cur === s.id ? "ACTIVE" : "TAP TO FLY"}</span>
          </button>`).join("")}
      </div>`);
    $$("[data-zone]").forEach((b) => (b.onclick = () => {
      T.zone = b.dataset.zone;
      save();
      paint(true);
      BG.setMode("terrain", T.zone);
      document.querySelector('meta[name="theme-color"]').content = NW.getVar("--bg");
      NW.SFX.coin();
      showScenes();
      drawTape();
    }));
  }

  // ---------- wiring ----------
  $("#s-lock").addEventListener("click", lockIn);
  $("#s-readbox").addEventListener("click", () => { NW.SFX.init(); typeIn(); });
  $$("#s-hints .hint-btn").forEach((b) => b.addEventListener("click", () => useHint(b.dataset.shint)));
  $$("#scale .mode-btn").forEach((b) => b.addEventListener("click", () => {
    NW.SFX.init(); NW.SFX.click();
    startMode(b.dataset.smode);
  }));
  $("#s-help").onclick = () => { NW.SFX.init(); NW.SFX.click(); showHelp(); };
  $("#s-stats").onclick = () => { NW.SFX.init(); NW.SFX.click(); showStats(); };
  $("#s-log").onclick = () => { NW.SFX.init(); NW.SFX.click(); showLog(); };
  $("#s-zones").onclick = () => { NW.SFX.init(); NW.SFX.click(); showScenes(); };
  addEventListener("keydown", (e) => {
    if (document.body.dataset.game !== "scale" || !$("#modal-back").hidden || !G) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { ArrowLeft: "down", ArrowRight: "up", ArrowDown: "d10", ArrowUp: "m10" };
    if (map[e.key]) { e.preventDefault(); stepVal(map[e.key]); save(); }
    else if (e.key === "Enter") { e.preventDefault(); lockIn(); }
    else if (/^[0-9]$/.test(e.key) && G.phase === "ask") { e.preventDefault(); typeIn(); }
  });

  function dailyStatus(P) {
    const g = P.scale && P.scale.games && P.scale.games.daily;
    if (!g || g.date !== NW.dateKey()) return "DAILY READY";
    const s = g.answers.reduce((n, a) => n + (a ? a.pts : 0), 0);
    if (g.status !== "play") return `DAILY ✓ ${s}/700`;
    return g.answers.length ? `DAILY ${g.answers.filter(Boolean).length}/${ROUNDS}` : "DAILY READY";
  }

  function todayResult(P) {
    const g = P.scale && P.scale.games && P.scale.games.daily;
    if (!g || g.date !== NW.dateKey() || g.status === "play") return null;
    return { s: g.answers.reduce((n, a) => n + (a ? a.pts : 0), 0) };
  }

  return { enter, dailyStatus, todayResult, sceneFor, paint, setApi: (api) => (NW = api), refreshHud: () => G && renderHud(), redraw: () => G && drawTape() };
})();
