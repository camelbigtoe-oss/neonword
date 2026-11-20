// NEONRARE — seven prompts, 30 seconds each. Any right answer scores, but the fewer people
// who would think of it, the more it pays: COMMON 10 up to LEGENDARY 100. Max 700 a run.
const Rare = (() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ROUNDS = 7;
  const ROUND_MS = 30000;
  const STRIKES = 3;
  const COST = { time: 1, intel: 1 };
  const TIME_BONUS = 15000;
  const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "<ZXCVBNM>", "#_^"];
  const NUM_ROW = "1234567890";
  const RANKS = [[0, "BACKGROUND NOISE"], [100, "STATIC"], [200, "FAINT SIGNAL"], [300, "CLEAR SIGNAL"], [400, "DEEP CUT"], [500, "ANOMALY"], [600, "ONE OF A KIND"]];
  const SHARE = ["⬜", "🟩", "🟦", "🟪", "🟨"];

  let NW = null, T = null, G = null;
  let typed = "", nums = false, last = 0, flashMsg = null;

  const defaults = () => ({
    mode: "daily", seenHelp: false, cavern: "amethyst",
    stats: { runs: 0, best: 0, total: 0, tiers: [0, 0, 0, 0, 0], misses: 0, legends: 0 },
    daily: { streak: 0, best: 0, lastWin: null },
    games: { daily: null, endless: null },
    recent: [], history: [], codex: {},
  });

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const save = () => NW.save();
  const prompt = (k = G.i) => RARE_PROMPTS[G.ids[k]];
  const score = (g = G) => g.answers.reduce((s, a) => s + (a ? a.pts : 0), 0);
  const rankOf = (s) => RANKS.filter(([min]) => s >= min).pop()[1];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- matching ----------
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        best = Math.min(best, cur[j]);
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  // -> { tier, ans } or null. Exact first, then small typos on longer answers.
  function match(p, text) {
    const n = rareNorm(text);
    if (n.length < 2) return null;
    for (let t = 0; t < p.tiers.length; t++) for (const a of p.tiers[t]) if (a.keys.includes(n)) return { tier: t, ans: a };
    if (n.length < 5) return null;
    const max = n.length >= 9 ? 2 : 1;
    let best = null, bd = max + 1;
    for (let t = 0; t < p.tiers.length; t++) for (const a of p.tiers[t]) for (const k of a.keys) {
      if (k.length < 5) continue;
      const d = lev(n, k, max);
      if (d < bd) { bd = d; best = { tier: t, ans: a }; }
    }
    return best;
  }

  // ---------- setup ----------
  function dailyIds(key) {
    const n = RARE_PROMPTS.length;
    const days = Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 864e5);
    const order = NW.seededShuffle(n, 4111);
    const start = (((days * ROUNDS) % n) + n) % n;
    return Array.from({ length: ROUNDS }, (_, k) => order[(start + k) % n]);
  }

  function freshGame(mode) {
    let ids;
    if (mode === "daily") ids = dailyIds(NW.dateKey());
    else {
      const all = [...RARE_PROMPTS.keys()];
      let pool = all.filter((i) => !T.recent.includes(i));
      if (pool.length < ROUNDS) { T.recent = []; pool = all; }
      ids = [];
      while (ids.length < ROUNDS) { const i = pick(pool); if (!ids.includes(i)) ids.push(i); }
      T.recent = [...T.recent, ...ids].slice(-Math.floor(RARE_PROMPTS.length * 0.75));
    }
    return { mode, ids, date: NW.dateKey(), i: 0, answers: [], left: ROUND_MS, strikes: 0, intel: null, phase: "ask", status: "play", hints: 0, fresh: [], rewarded: false };
  }

  function enter(api) {
    NW = api;
    NW.P.rare = Object.assign(defaults(), NW.P.rare || {});
    T = NW.P.rare;
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
    typed = "";
    flashMsg = null;
    if (G.status !== "play" && !G.rewarded) applyRewards();
    save();
    renderAll();
    if (G.status !== "play" && !quiet) setTimeout(showResult, 300);
  }

  // ---------- rendering ----------
  function renderAll() {
    $$("#rare .mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.rmode === T.mode));
    renderHud();
    renderCard();
    renderMid();
    renderControls();
    renderKeys();
  }

  function renderHud() {
    const I = NW.levelInfo(NW.P.lv.rare);
    $("#r-lvl").textContent = I.lvl;
    $("#r-xpfill").style.width = `${(I.into / I.need) * 100}%`;
    $("#r-xptxt").textContent = `${I.into}/${I.need}`;
    $("#r-credits").textContent = NW.P.credits;
    const lw = T.daily.lastWin;
    const s = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    $("#r-streak").textContent = s > 0 ? `×${s}` : "";
    $("#r-score").innerHTML = `<b>${score()}</b>/${ROUNDS * 100}`;
  }

  function renderCard() {
    const done = G.status !== "play";
    const k = Math.min(G.i, ROUNDS - 1);
    $("#r-round").textContent = done ? "RUN COMPLETE" : `SIGNAL ${k + 1}/${ROUNDS}`;
    $("#r-pips").innerHTML = G.ids.map((_, j) => {
      const a = G.answers[j];
      const cls = a ? (a.tier >= 0 ? `t${a.tier}` : "miss") : j === G.i && !done ? "cur" : "";
      return `<i class="${cls}"></i>`;
    }).join("");
    $("#r-q").textContent = done ? rankOf(score()) : prompt(k).q;
    $("#r-strikes").innerHTML = [...Array(STRIKES)].map((_, j) => `<i class="${j < G.strikes ? "on" : ""}"></i>`).join("");
    renderTimer();
  }

  function renderTimer() {
    const frac = G.status === "play" ? Math.max(0, G.left / ROUND_MS) : 0;
    const bar = $("#r-timer i");
    bar.style.width = `${Math.min(100, frac * 100)}%`;
    $("#r-timer").classList.toggle("low", G.phase === "ask" && G.left < 8000);
    $("#r-secs").textContent = G.status === "play" && G.phase === "ask" ? Math.ceil(G.left / 1000) : "";
  }

  function renderMid() {
    const entry = $("#r-entry"), msg = $("#r-msg"), rev = $("#r-reveal");
    if (G.status !== "play") {
      entry.innerHTML = `<span class="r-final">${score()}</span>`;
      msg.className = "r-msg good";
      msg.textContent = `${rankOf(score())} · TAP RESULTS`;
      rev.innerHTML = summaryHtml();
      return;
    }
    if (G.phase === "ask") {
      entry.innerHTML = typed ? `${esc(typed)}<span class="r-caret"></span>` : `<span class="r-ph">type an answer…</span><span class="r-caret"></span>`;
      msg.className = "r-msg " + (flashMsg ? flashMsg.cls : "");
      msg.textContent = flashMsg ? flashMsg.text : G.intel ? `INTEL: ${G.intel}` : "the rarer the answer, the bigger the score";
      rev.innerHTML = tierLadder(-1);
    } else {
      const a = G.answers[G.i];
      entry.innerHTML = a.tier >= 0 ? `${esc(a.name)}` : `<span class="r-ph">${a.why}</span>`;
      msg.className = "r-msg " + (a.tier >= 0 ? `t${a.tier}c` : "bad");
      msg.textContent = a.tier >= 0 ? `${RARE_TIERS[a.tier].name} +${a.pts}${a.newFind ? " · NEW CODEX ENTRY" : ""}` : "NO POINTS";
      rev.innerHTML = revealHtml(a);
    }
  }

  // tier ladder with points, highlighting the one just hit
  function tierLadder(hit) {
    return `<div class="r-ladder">${RARE_TIERS.map((t, j) => `<div class="r-rung t${j} ${hit === j ? "hit" : ""}"><b>${t.name}</b><span>${t.pts}</span></div>`).join("")}</div>`;
  }

  // after an answer: what most people say, and a couple of deep cuts
  function revealHtml(a) {
    const p = prompt();
    const names = (t, n) => p.tiers[t].filter((x) => x.name !== a.name).slice(0, n).map((x) => x.name.toUpperCase());
    const deep = [...p.tiers[4]].filter((x) => x.name !== a.name);
    // a stable but varied pair of legendary examples per prompt
    const off = G.ids[G.i] % Math.max(1, deep.length);
    const cuts = [deep[off], deep[(off + 7) % deep.length]].filter(Boolean).map((x) => x.name.toUpperCase());
    return `${tierLadder(a.tier)}
      <div class="r-ex"><span class="t0c">MOST SAID</span> ${names(0, 3).join(" · ")}</div>
      <div class="r-ex"><span class="t4c">DEEP CUTS</span> ${[...new Set(cuts)].join(" · ")}</div>`;
  }

  function summaryHtml() {
    return `<div class="r-sum">${G.ids.map((id, j) => {
      const a = G.answers[j] || { tier: -1, pts: 0, name: "" };
      return `<div class="r-sum-row ${a.tier >= 0 ? `t${a.tier}` : "miss"}"><span class="r-sum-q">${esc(RARE_PROMPTS[id].q.replace(/^Name an? /i, ""))}</span><span class="r-sum-a">${a.tier >= 0 ? esc(a.name.toUpperCase()) : "—"}</span><b>${a.pts}</b></div>`;
    }).join("")}</div>`;
  }

  function renderControls() {
    const ask = G.status === "play" && G.phase === "ask";
    $("#r-hints").hidden = !ask;
    $("#r-next").hidden = ask;
    $("#r-next").textContent = G.status !== "play" ? "SEE RESULTS" : G.i === ROUNDS - 1 ? "FINISH RUN ▶" : "NEXT SIGNAL ▶";
    $("#r-intel").disabled = !!G.intel;
    $("#r-keys").classList.toggle("dimmed", !ask);
  }

  function renderKeys() {
    const kb = $("#r-keys");
    kb.innerHTML = "";
    KEY_ROWS.forEach((row, ri) => {
      const r = document.createElement("div");
      r.className = "krow";
      const chars = ri === 0 && nums ? NUM_ROW : row;
      for (const ch of chars) {
        const b = document.createElement("button");
        b.className = "key";
        // same as NEONWORD: ENTER bottom left, DEL bottom right (above CLEAR, far from ENTER)
        const map = { "<": ["ENTER", "ENTER"], ">": ["DEL", "⌫"], "#": ["NUM", nums ? "ABC" : "123"], "_": ["SPACE", "SPACE"], "^": ["CLR", "CLEAR"] };
        const [k, label] = map[ch] || [ch, ch];
        b.dataset.k = k;
        b.textContent = label;
        if (map[ch]) b.classList.add("wide");
        if (ch === "_") b.classList.add("space");
        r.appendChild(b);
      }
      kb.appendChild(r);
    });
  }

  // ---------- input ----------
  function press(k) {
    NW.SFX.init();
    if (G.status !== "play") return;
    if (G.phase === "show") { if (k === "ENTER") next(); return; }
    flashMsg = null;
    if (k === "ENTER") return submit();
    if (k === "DEL") { typed = typed.slice(0, -1); NW.SFX.del(); }
    else if (k === "CLR") { typed = ""; NW.SFX.del(); }
    else if (k === "NUM") { nums = !nums; renderKeys(); NW.SFX.click(); return; }
    else if (k === "SPACE") { if (typed && !typed.endsWith(" ") && typed.length < 32) typed += " "; NW.SFX.key(); }
    else if (typed.length < 32) { typed += k; NW.SFX.key(); }
    renderMid();
  }

  function flash(text, cls) {
    flashMsg = { text, cls };
    renderMid();
  }

  function submit() {
    if (G.phase !== "ask" || G.status !== "play") return;
    const text = typed.trim();
    if (rareNorm(text).length < 2) { NW.SFX.error(); return flash("TYPE AN ANSWER FIRST", "bad"); }
    const m = match(prompt(), text);
    if (!m) {
      G.strikes++;
      NW.SFX.error();
      shake();
      typed = "";
      save();
      renderCard();
      if (G.strikes >= STRIKES) return finishRound(null, "NO SIGNAL · 3 STRIKES");
      return flash(`NOT IN THE DATABANK · ${STRIKES - G.strikes} ${STRIKES - G.strikes === 1 ? "TRY" : "TRIES"} LEFT`, "bad");
    }
    finishRound(m);
  }

  function shake() {
    const el = $("#r-entry");
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  }

  function finishRound(m, why = "") {
    const p = prompt();
    let a;
    if (m) {
      const id = G.ids[G.i];
      let newFind = false;
      if (m.tier >= 3) {
        const list = T.codex[id] || (T.codex[id] = []);
        if (!list.includes(m.ans.name)) { list.push(m.ans.name); newFind = true; G.fresh.push(m.ans.name); }
      }
      a = { tier: m.tier, pts: RARE_TIERS[m.tier].pts, name: m.ans.name, newFind };
    } else a = { tier: -1, pts: 0, name: "", why };
    G.answers[G.i] = a;
    G.phase = "show";
    typed = "";
    flashMsg = null;
    save();
    renderHud(); renderCard(); renderMid(); renderControls();
    if (a.tier >= 0) {
      NW.SFX.flip(a.tier >= 3 ? "hit" : a.tier >= 1 ? "near" : "miss", 0);
      [0, 1, 2, 3].slice(0, a.tier + 1).forEach((k) => setTimeout(() => NW.SFX.flip("hit", k * 2), 90 * (k + 1)));
      const r = $("#r-entry").getBoundingClientRect();
      const col = NW.getVar(`--t${a.tier}`);
      NW.BG.burst(r.left + r.width / 2, r.top + r.height / 2, [col, "#ffffff"], 14 + a.tier * 14);
      if (a.tier === 4) { NW.toast("LEGENDARY!", true, 1300); NW.BG.confetti([col, NW.getVar("--c1"), "#ffffff"]); }
      else if (a.tier === 3) NW.toast("EPIC!", false, 1000);
    } else NW.SFX.lose();
    void p;
  }

  function next() {
    NW.SFX.init(); NW.SFX.click();
    if (G.status !== "play") return showResult();
    if (G.phase !== "show") return;
    if (G.i >= ROUNDS - 1) return onFinish();
    G.i++;
    G.phase = "ask";
    G.left = ROUND_MS;
    G.strikes = 0;
    G.intel = null;
    save();
    renderAll();
  }

  // ---------- timer ----------
  // counts down only while this game is on screen with no dialog open
  function tick() {
    const now = performance.now();
    const dt = last ? now - last : 0;
    last = now;
    if (!G || !NW || document.body.dataset.game !== "rare" || G.status !== "play" || G.phase !== "ask") return;
    if (!$("#modal-back").hidden || document.visibilityState !== "visible") return;
    const before = Math.ceil(G.left / 1000);
    G.left -= dt;
    const after = Math.ceil(Math.max(0, G.left) / 1000);
    if (after !== before) {
      if (after <= 5 && after > 0) NW.SFX.click();
      save();
    }
    if (G.left <= 0) { G.left = 0; renderTimer(); NW.SFX.error(); return finishRound(null, "TIME OUT"); }
    renderTimer();
  }
  setInterval(tick, 100);

  // ---------- hints ----------
  function useHint(kind) {
    NW.SFX.init();
    if (G.status !== "play" || G.phase !== "ask") return;
    if (kind === "skip") { NW.SFX.click(); return finishRound(null, "SKIPPED"); }
    if (kind === "intel" && G.intel) return;
    if (!NW.spend(COST[kind])) return;
    G.hints++;
    NW.SFX.hint();
    if (kind === "time") { G.left += TIME_BONUS; NW.toast("+15 SECONDS"); }
    else {
      // first letter and length of two legendary answers
      const deep = prompt().tiers[4].filter((a) => a.name.length >= 3);
      const pickTwo = [deep[(G.ids[G.i] * 3) % deep.length], deep[(G.ids[G.i] * 3 + 5) % deep.length]].filter(Boolean);
      const mask = (s) => s.toUpperCase().split("").map((c, i) => (i === 0 || c === " " ? c : /[A-Z0-9]/.test(c) ? "_" : c)).join("");
      G.intel = [...new Set(pickTwo.map((a) => mask(a.name)))].join("  ·  ");
    }
    save();
    renderHud(); renderCard(); renderMid(); renderControls();
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
    G.answers.forEach((a) => { if (a && a.tier >= 0) S.tiers[a.tier]++; else S.misses++; });
    S.legends = Object.values(T.codex).reduce((n, l) => n + l.length, 0);
    let xp = 15 + Math.round(s / 7) + G.fresh.length * 3;
    let credits = 1 + (s >= 300 ? 1 : 0) + (s >= 500 ? 1 : 0), bonus = "";
    if (G.mode === "daily") {
      xp = Math.round(xp * 1.5);
      credits += 1;
      T.daily.streak = T.daily.lastWin === NW.yesterdayKey() ? T.daily.streak + 1 : 1;
      T.daily.lastWin = NW.dateKey();
      T.daily.best = Math.max(T.daily.best, T.daily.streak);
      if (T.daily.streak % 7 === 0) { credits += 5; bonus = `${T.daily.streak}-DAY STREAK BONUS +◈5`; }
    }
    G.reward = { xp, credits, bonus };
    T.history.push({ mode: G.mode, s, ids: G.ids, t: Date.now(), tiers: G.answers.map((a) => (a ? a.tier : -1)), xp });
    if (T.history.length > 1000) T.history = T.history.slice(-1000);
    return NW.reward("rare", xp, credits);
  }

  function onFinish() {
    G.status = "done";
    G.phase = "show";
    const lv = applyRewards();
    save();
    const s = score();
    NW.SFX.win();
    NW.toast(rankOf(s), true, 1600);
    NW.BG.confetti([NW.getVar("--t4"), NW.getVar("--t3"), NW.getVar("--c1")]);
    renderAll();
    setTimeout(() => { if (lv && lv.after > lv.before) NW.levelUp("rare", lv.after, showResult); else showResult(); }, 1800);
  }

  function shareText() {
    const head = G.mode === "daily" ? `NEONRARE DAILY ${G.date}` : "NEONRARE RUN";
    const marks = G.answers.map((a) => (a && a.tier >= 0 ? SHARE[a.tier] : "⬛")).join("");
    return `${head}\n${score()}/700 · ${rankOf(score())}\n${marks}`;
  }

  function showResult() {
    if (!G || G.status === "play" || document.body.dataset.game !== "rare") return;
    const r = G.reward || { xp: 0, credits: 0 };
    const s = score();
    NW.openModal(`
      <h2>RUN COMPLETE</h2>
      <div class="answer-reveal r-total">${s}<small>/700</small></div>
      <p class="r-rank">${rankOf(s)}</p>
      ${summaryHtml()}
      ${G.fresh.length ? `<p class="reward">NEW CODEX: ${G.fresh.map((n) => n.toUpperCase()).join(", ")}</p>` : ""}
      <h3>REWARDS</h3>
      <p class="reward">+${r.xp} XP &nbsp; ${r.credits ? `+◈${r.credits}` : ""}</p>
      ${r.bonus ? `<p class="reward">${r.bonus}</p>` : ""}
      ${G.mode === "daily" ? `<h3>NEXT DAILY IN <span id="r-cd">${NW.nextDailyIn()}</span></h3>` : ""}
      <div class="btn-row">
        <button class="btn" id="rr-next">${G.mode === "daily" ? "PLAY ENDLESS" : "NEW RUN"}</button>
        <button class="btn alt" id="rr-share">SHARE</button>
      </div>`);
    $("#rr-next").onclick = () => {
      NW.closeModal();
      if (G.mode !== "daily") T.games.endless = null;
      startMode("endless");
    };
    $("#rr-share").onclick = async () => {
      const txt = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: txt });
        else { await navigator.clipboard.writeText(txt); NW.toast("COPIED TO CLIPBOARD"); }
      } catch {}
    };
    if (G.mode === "daily") {
      const iv = setInterval(() => {
        const el = $("#r-cd");
        if (!el) return clearInterval(iv);
        el.textContent = NW.nextDailyIn();
      }, 1000);
    }
  }

  function showStats() {
    const S = T.stats;
    const lw = T.daily.lastWin;
    const ds = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    const I = NW.levelInfo(NW.P.lv.rare);
    const all = [...S.tiers, S.misses];
    const max = Math.max(1, ...all);
    const names = [...RARE_TIERS.map((t) => t.name), "MISS"];
    NW.openModal(`
      <h2>RARE STATS</h2>
      <div class="stat-grid">
        <div><b>${S.runs}</b><span>runs</span></div>
        <div><b>${S.best}</b><span>best</span></div>
        <div><b>${S.runs ? Math.round(S.total / S.runs) : 0}</b><span>average</span></div>
        <div><b>${S.tiers[4]}</b><span>legendary</span></div>
      </div>
      <h3>DAILY</h3>
      <div class="stat-grid">
        <div><b>${ds}</b><span>day streak</span></div>
        <div><b>${T.daily.best}</b><span>best run</span></div>
        <div><b>${I.lvl}</b><span>level</span></div>
        <div><b>${NW.P.lv.rare}</b><span>xp</span></div>
      </div>
      <h3>ANSWER RARITY</h3>
      <div class="dist">${all.map((n, j) => `
        <div class="dist-row"><span class="r-dname">${names[j]}</span><div class="dist-bar ${j < 5 ? `t${j}b` : ""}" style="width:${Math.max(8, (n / max) * 100)}%">${n}</div></div>`).join("")}
      </div>`);
  }

  // every EPIC and LEGENDARY answer you have found, prompt by prompt
  function showCodex() {
    let total = 0, found = 0;
    const rows = RARE_PROMPTS.map((p, id) => {
      const pool = [...p.tiers[3], ...p.tiers[4]];
      const got = T.codex[id] || [];
      total += pool.length;
      found += got.length;
      return { id, q: p.q, got, n: pool.length };
    }).filter((r) => r.got.length).sort((a, b) => b.got.length - a.got.length);
    NW.openModal(`
      <h2>CODEX</h2>
      <p style="color:var(--dim)">Every <b class="t3c">EPIC</b> and <b class="t4c">LEGENDARY</b> answer you have found. Each new one pays +3 XP.</p>
      <div class="stat-grid hist-sum">
        <div><b>${found}</b><span>found</span></div>
        <div><b>${total}</b><span>out there</span></div>
        <div><b>${rows.length}</b><span>prompts</span></div>
        <div><b>${total ? ((found / total) * 100).toFixed(1) : 0}</b><span>% done</span></div>
      </div>
      <div class="hist-list">
        ${rows.length ? rows.map((r) => `
          <button class="hist-row won">
            <span class="hist-word r-cx-q">${esc(r.q.toUpperCase())}</span>
            <span class="hist-meta">${r.got.length}/${r.n}</span>
            <span class="hist-clue">${r.got.map((g) => esc(g.toUpperCase())).join(" · ")}</span>
          </button>`).join("") : `<p style="color:var(--dim)">Nothing yet. Find an EPIC or LEGENDARY answer to start your codex.</p>`}
      </div>`);
    $$(".hist-row").forEach((r) => (r.onclick = () => r.classList.toggle("open")));
  }

  function showHelp() {
    NW.openModal(`
      <h2>HOW TO PLAY</h2>
      <p>Seven prompts like <b style="color:var(--c2)">"Name a fruit"</b>. You have ${ROUND_MS / 1000} seconds to type one answer to each.</p>
      <p>Any right answer scores, but rare ones score big. Say what nobody else would.</p>
      ${tierLadder(-1)}
      <p>A wrong or unknown answer is a strike. ${STRIKES} strikes or running out of time scores 0 for that prompt. Small typos are forgiven.</p>
      <h3>HINTS · cost ◈</h3>
      <p><kbd>+TIME</kbd> ◈${COST.time} — 15 more seconds.</p>
      <p><kbd>INTEL</kbd> ◈${COST.intel} — the first letter of two legendary answers.</p>
      <p><kbd>SKIP</kbd> free — give up on this prompt.</p>
      <h3>REWARDS</h3>
      <p>Max score 700. Higher scores pay more XP and ◈. Every new EPIC or LEGENDARY answer goes in your <kbd>≡</kbd> codex and pays +3 XP. Daily runs pay 1.5× XP and +◈1.</p>
      <p>NEONRARE has its own level, which unlocks new crystal caverns (◆) with their own colours.</p>
      <div class="btn-row"><button class="btn" id="rh-go">START</button></div>
      <p style="color:var(--dim);font-size:15px;margin-top:14px">build ${NW.APP_VERSION}</p>`);
    $("#rh-go").onclick = NW.closeModal;
    T.seenHelp = true;
    save();
  }

  // ---------- caverns (backgrounds + colours that unlock with level) ----------
  function sceneFor(P) {
    const lvl = NW.levelInfo((P.lv && P.lv.rare) || 0).lvl;
    const s = BG.CAVERNS.find((x) => x.id === (P.rare && P.rare.cavern));
    return s && s.lvl <= lvl ? s.id : BG.CAVERNS[0].id;
  }

  function paint(on) {
    const st = document.body.style;
    new Set(BG.CAVERNS.flatMap((s) => Object.keys(s.ui))).forEach((k) => st.removeProperty(k));
    if (!on || !NW) return;
    const s = BG.CAVERNS.find((x) => x.id === sceneFor(NW.P));
    for (const [k, v] of Object.entries(s.ui)) st.setProperty(k, v);
  }

  function showScenes() {
    const lvl = NW.levelInfo(NW.P.lv.rare).lvl;
    const cur = sceneFor(NW.P);
    NW.openModal(`
      <h2>CAVERNS</h2>
      <p style="color:var(--dim)">Level up in NEONRARE to dig deeper. Each cavern has its own crystals and colours.</p>
      <div class="theme-grid">
        ${BG.CAVERNS.map((s) => `
          <button class="theme-card ${cur === s.id ? "on" : ""}" data-cavern="${s.id}" ${lvl < s.lvl ? "disabled" : ""}>
            <div class="swatches">${[s.crystal[0], s.crystal[1], s.ui["--near"], s.rock[2]].map((c) => `<i style="background:${c}"></i>`).join("")}</div>
            <span class="theme-name">${s.name}</span>
            <span class="theme-lock">${lvl < s.lvl ? `🔒 LV ${s.lvl}` : cur === s.id ? "ACTIVE" : "TAP TO ENTER"}</span>
          </button>`).join("")}
      </div>`);
    $$("[data-cavern]").forEach((b) => (b.onclick = () => {
      T.cavern = b.dataset.cavern;
      save();
      paint(true);
      BG.setMode("cave", T.cavern);
      document.querySelector('meta[name="theme-color"]').content = NW.getVar("--bg");
      NW.SFX.coin();
      showScenes();
    }));
  }

  // ---------- wiring ----------
  $("#r-keys").addEventListener("click", (e) => {
    const k = e.target.closest(".key");
    if (k) press(k.dataset.k);
  });
  $$("#r-hints .hint-btn").forEach((b) => b.addEventListener("click", () => useHint(b.dataset.rhint)));
  $("#r-next").addEventListener("click", next);
  $("#r-reveal").addEventListener("click", () => { if (G && G.status !== "play") showResult(); });
  $$("#rare .mode-btn").forEach((b) => b.addEventListener("click", () => {
    NW.SFX.init(); NW.SFX.click();
    startMode(b.dataset.rmode);
  }));
  $("#r-help").onclick = () => { NW.SFX.init(); NW.SFX.click(); showHelp(); };
  $("#r-stats").onclick = () => { NW.SFX.init(); NW.SFX.click(); showStats(); };
  $("#r-codex").onclick = () => { NW.SFX.init(); NW.SFX.click(); showCodex(); };
  $("#r-caverns").onclick = () => { NW.SFX.init(); NW.SFX.click(); showScenes(); };
  addEventListener("keydown", (e) => {
    if (document.body.dataset.game !== "rare" || !$("#modal-back").hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let k = null;
    if (e.key === "Enter") k = "ENTER";
    else if (e.key === "Backspace") k = "DEL";
    else if (e.key === " ") k = "SPACE";
    else if (/^[a-z0-9]$/i.test(e.key)) k = e.key.toUpperCase();
    if (!k) return;
    e.preventDefault();
    press(k);
  });

  function dailyStatus(P) {
    const g = P.rare && P.rare.games && P.rare.games.daily;
    if (!g || g.date !== NW.dateKey()) return "DAILY READY";
    const s = g.answers.reduce((n, a) => n + (a ? a.pts : 0), 0);
    if (g.status !== "play") return `DAILY ✓ ${s}/700`;
    return g.answers.length ? `DAILY ${g.answers.filter(Boolean).length}/${ROUNDS}` : "DAILY READY";
  }

  // today's daily for the leaderboard
  function todayResult(P) {
    const g = P.rare && P.rare.games && P.rare.games.daily;
    if (!g || g.date !== NW.dateKey() || g.status === "play") return null;
    return { s: g.answers.reduce((n, a) => n + (a ? a.pts : 0), 0) };
  }

  return { enter, dailyStatus, todayResult, sceneFor, paint, setApi: (api) => (NW = api), refreshHud: () => G && renderHud() };
})();
