// NEONLINK — sort 16 words into 4 hidden groups of 4.
// Shares level, XP and ◈ credits with NEONWORD through the NW api (set up in app.js).
const Links = (() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const MAX_MISTAKES = 4;
  const HINT_COST = { pair: 1, name: 2 };
  const WIN_WORDS = ["LINKED", "FULL SYNC", "MAPPED", "NETWORKED", "CLEAN RUN", "WIRED IN"];
  const EMOJI = ["🟨", "🟩", "🟦", "🟪"];

  let NW = null;   // app api
  let L = null;    // saved NEONLINK progress (lives in NW.P.links)
  let G = null;    // current puzzle
  let busy = false;

  const defaults = () => ({
    mode: "daily", seenHelp: false, scene: "night",
    stats: { played: 0, won: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0] }, // dist = wins by mistakes made
    daily: { streak: 0, best: 0, lastWin: null },
    games: { daily: null, endless: null },
    recent: [], history: [],
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const puzzle = () => LINK_PUZZLES[G.id];
  const groupOf = (w) => puzzle().findIndex((g) => g.w.includes(w));
  const save = () => NW.save();

  // ---------- setup ----------
  function dailyId(key) {
    const n = LINK_PUZZLES.length;
    const days = Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 864e5);
    const order = NW.seededShuffle(n, 4242);
    return order[((days % n) + n) % n];
  }

  function freshGame(mode) {
    let id;
    if (mode === "daily") id = dailyId(NW.dateKey());
    else {
      const all = [...LINK_PUZZLES.keys()];
      const pool = all.filter((i) => !L.recent.includes(i));
      id = pick(pool.length ? pool : all);
      L.recent = [...L.recent, id].slice(-Math.floor(LINK_PUZZLES.length * 0.7));
    }
    return {
      mode, id, date: NW.dateKey(), order: shuffle(LINK_PUZZLES[id].flatMap((g) => g.w)),
      solved: [], given: [], sel: [], tries: [], mistakes: 0, status: "play",
      hints: 0, pair: [], named: [], log: [], rewarded: false,
    };
  }

  function enter(api) {
    NW = api;
    NW.P.links = Object.assign(defaults(), NW.P.links || {});
    L = NW.P.links;
    if (!L.seenHelp) { startMode(L.mode, true); setTimeout(showHelp, 300); }
    else startMode(L.mode);
  }

  function startMode(mode, quiet = false) {
    L.mode = mode;
    if (mode === "daily") {
      const g = L.games.daily;
      G = g && g.date === NW.dateKey() ? g : (L.games.daily = freshGame("daily"));
    } else {
      const g = L.games.endless;
      G = g && g.status === "play" ? g : (L.games.endless = freshGame("endless"));
    }
    G.sel = G.sel || [];
    if (!G.log.length) log(G.mode === "daily" ? `> daily grid ${G.date} // find 4 links` : `> new grid // find 4 links`, "dim", false);
    if (G.status !== "play" && !G.rewarded) applyRewards(G.status === "won");
    save();
    renderAll();
    if (G.status !== "play" && !quiet) setTimeout(showResult, 300);
  }

  // ---------- rendering ----------
  function renderAll() {
    $$("#links .mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.lmode === L.mode));
    renderHud();
    renderBoard();
    renderLives();
    renderIntel();
    renderButtons();
  }

  function renderHud() {
    const I = NW.levelInfo(NW.P.xp);
    $("#l-lvl").textContent = I.lvl;
    $("#l-xpfill").style.width = `${(I.into / I.need) * 100}%`;
    $("#l-xptxt").textContent = `${I.into}/${I.need}`;
    $("#l-credits").textContent = NW.P.credits;
    const lw = L.daily.lastWin;
    const s = lw === NW.dateKey() || lw === NW.yesterdayKey() ? L.daily.streak : 0;
    $("#l-streak").textContent = s > 0 ? `×${s}` : "";
  }

  function barHtml(gi, extra = "") {
    const g = puzzle()[gi];
    return `<div class="l-bar g${gi} ${extra}"><b>${g.n.toUpperCase()}</b><span>${g.w.join(", ")}</span></div>`;
  }

  function renderBoard() {
    const done = [...G.solved, ...G.given];
    $("#l-solved").innerHTML = done.map((gi) => barHtml(gi, G.given.includes(gi) ? "given" : "")).join("");
    const left = G.order.filter((w) => !done.includes(groupOf(w)));
    const grid = $("#l-grid");
    grid.innerHTML = "";
    for (const w of left) {
      const b = document.createElement("button");
      b.className = "l-tile";
      b.dataset.w = w;
      b.textContent = w;
      if (G.sel.includes(w)) b.classList.add("sel");
      if (G.pair.includes(w)) b.classList.add("hinted");
      grid.appendChild(b);
    }
    fit();
  }

  // Size the rows and the word font to whatever room is left.
  function fit() {
    const wrap = $("#l-board");
    if (!wrap || !G) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    const gap = 8;
    const rowH = Math.floor(Math.max(40, Math.min(84, (h - gap * 3) / 4)));
    wrap.style.setProperty("--lh", `${rowH}px`);
    const tw = (w - gap * 3) / 4;
    $$("#l-grid .l-tile").forEach((t) => {
      const n = t.dataset.w.length;
      t.style.fontSize = `${Math.max(7, Math.min(16, Math.floor((tw - 10) / n), Math.floor(rowH * 0.3)))}px`;
    });
  }

  function renderLives() {
    const left = MAX_MISTAKES - G.mistakes;
    $("#l-lives").innerHTML = `<span>SIGNAL</span>${[...Array(MAX_MISTAKES)].map((_, i) => `<i class="${i < left ? "on" : ""}"></i>`).join("")}`;
  }

  function renderIntel() {
    const box = $("#l-intel");
    box.innerHTML = "";
    for (const l of G.log) {
      const d = document.createElement("div");
      d.className = `intel-line ${l.c}`;
      d.textContent = l.t;
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
  }

  function log(t, c = "", draw = true) {
    G.log.push({ t, c });
    if (!draw) return;
    const box = $("#l-intel");
    const d = document.createElement("div");
    d.className = `intel-line ${c} new`;
    d.textContent = t;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  function renderButtons() {
    const over = G.status !== "play";
    const unsolved = 4 - G.solved.length - G.given.length;
    $$("#links .hint-btn").forEach((b) => {
      const a = b.dataset.act;
      b.disabled = over || busy
        || (a === "clear" && !G.sel.length)
        || (a === "name" && G.named.length >= unsolved - 1)
        || (a === "pair" && unsolved <= 1);
    });
    const sub = $("#l-submit");
    sub.disabled = over || busy || G.sel.length !== 4;
    sub.textContent = over ? (G.status === "won" ? "GRID CLEARED" : "SIGNAL LOST") : `SUBMIT ${G.sel.length}/4`;
  }

  // ---------- play ----------
  function tap(w) {
    NW.SFX.init();
    if (G.status !== "play" || busy) return;
    const i = G.sel.indexOf(w);
    if (i >= 0) { G.sel.splice(i, 1); NW.SFX.del(); }
    else if (G.sel.length < 4) { G.sel.push(w); NW.SFX.key(); }
    else return;
    $$("#l-grid .l-tile").forEach((t) => t.classList.toggle("sel", G.sel.includes(t.dataset.w)));
    renderButtons();
    save();
  }

  function tileEls(words) { return words.map((w) => $(`#l-grid .l-tile[data-w="${w}"]`)).filter(Boolean); }

  async function submit() {
    if (G.status !== "play" || busy || G.sel.length !== 4) return;
    const sel = [...G.sel];
    const key = sel.slice().sort().join("|");
    if (G.tries.some((t) => t.slice().sort().join("|") === key)) { NW.toast("ALREADY TRIED THAT"); NW.SFX.error(); return; }
    busy = true;
    renderButtons();
    G.tries.push(sel);
    const gis = sel.map(groupOf);
    const counts = {};
    gis.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
    const best = Math.max(...Object.values(counts));

    // tiles hop one after another, in grid order
    const els = tileEls(sel).sort((a, b) => G.order.indexOf(a.dataset.w) - G.order.indexOf(b.dataset.w));
    els.forEach((t, i) => setTimeout(() => { t.classList.add("hop"); NW.SFX.flip("near", i); }, i * 110));
    await sleep(els.length * 110 + 380);
    els.forEach((t) => t.classList.remove("hop"));

    if (best === 4) {
      const gi = gis[0];
      G.solved.push(gi);
      G.sel = [];
      G.pair = G.pair.filter((w) => groupOf(w) !== gi);
      log(`> LINK: ${puzzle()[gi].n.toUpperCase()}`, "good");
      [0, 1, 2, 3].forEach((i) => setTimeout(() => NW.SFX.flip("hit", i), i * 70));
      const r = els[0] && els[0].getBoundingClientRect();
      renderBoard();
      const bar = $("#l-solved").lastElementChild;
      bar.classList.add("fresh");
      if (r) NW.BG.burst(r.left + r.width / 2, r.top + r.height / 2, [NW.getVar(`--g${gi}`), "#ffffff"], 30);
      if (G.solved.length + G.given.length === 4) { G.status = "won"; save(); busy = false; return onWin(); }
    } else {
      G.mistakes++;
      els.forEach((t) => { t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake"); });
      NW.SFX.error();
      if (best === 3) { NW.toast("ONE AWAY…"); log("> 3 of 4 linked. one rogue word.", "clue"); }
      else log("> no link. signal degraded.", "bad");
      renderLives();
      const lv = $("#l-lives"); lv.classList.remove("hurt"); void lv.offsetWidth; lv.classList.add("hurt");
      if (G.mistakes >= MAX_MISTAKES) { G.status = "lost"; save(); busy = false; return onLose(); }
    }
    save();
    busy = false;
    renderButtons();
  }

  function doShuffle() {
    NW.SFX.init();
    if (G.status !== "play" || busy) return;
    const done = [...G.solved, ...G.given];
    const left = shuffle(G.order.filter((w) => !done.includes(groupOf(w))));
    G.order = [...G.order.filter((w) => done.includes(groupOf(w))), ...left];
    NW.SFX.click();
    save();
    renderBoard();
    $$("#l-grid .l-tile").forEach((t, i) => { t.style.animationDelay = `${i * 18}ms`; t.classList.add("deal"); });
  }

  function clearSel() {
    if (G.status !== "play" || busy || !G.sel.length) return;
    G.sel = [];
    NW.SFX.del();
    save();
    $$("#l-grid .l-tile").forEach((t) => t.classList.remove("sel"));
    renderButtons();
  }

  // ---------- hints ----------
  function unsolvedGroups() {
    const done = [...G.solved, ...G.given];
    return [0, 1, 2, 3].filter((g) => !done.includes(g));
  }

  function useHint(type) {
    NW.SFX.init();
    if (G.status !== "play" || busy) return;
    if (type === "pair") {
      // light up two words that share a link (easiest group not already flagged)
      const groups = unsolvedGroups();
      if (groups.length <= 1) return NW.toast("ONLY ONE LINK LEFT");
      const fresh = groups.filter((g) => !G.pair.some((w) => groupOf(w) === g));
      const gi = (fresh.length ? fresh : groups)[0];
      if (!NW.spend(HINT_COST.pair)) return;
      G.hints++;
      const words = shuffle(puzzle()[gi].w).slice(0, 2);
      G.pair = words;
      NW.SFX.hint();
      log(`> PAIR: ${words[0]} + ${words[1]} share a link`, "good");
      renderBoard();
      tileEls(words).forEach((t) => { const r = t.getBoundingClientRect(); NW.BG.burst(r.left + r.width / 2, r.top + r.height / 2, [NW.getVar("--near"), "#fff"], 16); });
    }
    if (type === "name") {
      const gi = unsolvedGroups().find((g) => !G.named.includes(g));
      if (gi === undefined) return;
      if (!NW.spend(HINT_COST.name)) return;
      G.hints++;
      G.named.push(gi);
      NW.SFX.hint();
      log(`> DECODE: one link is "${puzzle()[gi].n}"`, "clue");
    }
    renderHud();
    renderButtons();
    save();
  }

  // ---------- end of game ----------
  function applyRewards(won) {
    if (G.rewarded) return null;
    G.rewarded = true;
    const S = L.stats;
    S.played++;
    let xp = 10, credits = 0, bonus = "";
    if (won) {
      S.won++;
      S.streak++;
      S.maxStreak = Math.max(S.maxStreak, S.streak);
      S.dist[G.mistakes]++;
      xp = Math.max(15, 40 + 12 * (MAX_MISTAKES - G.mistakes) - 8 * G.hints);
      credits = 1 + (G.mistakes === 0 ? 1 : 0);
      if (G.mode === "daily") {
        xp = Math.round(xp * 1.5);
        credits += 1;
        L.daily.streak = L.daily.lastWin === NW.yesterdayKey() ? L.daily.streak + 1 : 1;
        L.daily.lastWin = NW.dateKey();
        L.daily.best = Math.max(L.daily.best, L.daily.streak);
        if (L.daily.streak % 7 === 0) { credits += 5; bonus = `${L.daily.streak}-DAY STREAK BONUS +◈5`; }
      }
    } else {
      S.streak = 0;
      if (G.mode === "daily") L.daily.streak = 0;
    }
    G.reward = { xp, credits, bonus };
    L.history.push({ id: G.id, mode: G.mode, won, m: G.mistakes, hints: G.hints, xp, t: Date.now() });
    if (L.history.length > 2000) L.history = L.history.slice(-2000);
    return NW.reward(xp, credits);
  }

  function onWin() {
    const lv = applyRewards(true);
    NW.SFX.win();
    NW.toast(G.mistakes === 0 ? "FLAWLESS" : pick(WIN_WORDS), true, 1600);
    NW.BG.confetti([NW.getVar("--g0"), NW.getVar("--g1"), NW.getVar("--g2"), NW.getVar("--g3")]);
    log("> ALL LINKS FOUND. grid cleared.", "good");
    $$("#l-solved .l-bar").forEach((b, i) => setTimeout(() => b.classList.add("dance"), i * 110));
    renderAll();
    setTimeout(() => NW.SFX.coin(), 900);
    setTimeout(() => { if (lv && lv.after > lv.before) NW.levelUp(lv.after, showResult); else showResult(); }, 1800);
  }

  async function onLose() {
    applyRewards(false);
    NW.SFX.lose();
    log("> SIGNAL LOST. decrypting the rest…", "bad");
    G.sel = [];
    busy = true;
    renderButtons();
    for (const gi of unsolvedGroups()) {
      await sleep(550);
      G.given.push(gi);
      renderBoard();
      $("#l-solved").lastElementChild.classList.add("fresh");
    }
    busy = false;
    save();
    renderAll();
    setTimeout(showResult, 1200);
  }

  function shareText() {
    const head = G.mode === "daily" ? `NEONLINK DAILY ${G.date}` : `NEONLINK GRID #${G.id + 1}`;
    const res = G.status === "won" ? `${G.mistakes} mistake${G.mistakes === 1 ? "" : "s"}` : "X";
    const grid = G.tries.map((t) => t.map((w) => EMOJI[groupOf(w)]).join("")).join("\n");
    return `${head} ${res}${G.hints ? ` ◈${G.hints}` : ""}\n${grid}`;
  }

  function distHtml(highlight) {
    const d = L.stats.dist, max = Math.max(1, ...d);
    return `<div class="dist">${d.map((v, i) => `<div class="dist-row"><span>${i}</span><div class="dist-bar ${highlight === i ? "cur" : ""}" style="width:${8 + (v / max) * 82}%">${v}</div></div>`).join("")}</div>`;
  }

  function showResult() {
    if (!G || G.status === "play" || document.body.dataset.game !== "links") return;
    const won = G.status === "won";
    const r = G.reward || { xp: 0, credits: 0 };
    NW.openModal(`
      <h2>${won ? "GRID CLEARED" : "SIGNAL LOST"}</h2>
      <div class="l-result">${[0, 1, 2, 3].map((gi) => barHtml(gi)).join("")}</div>
      <div class="l-tries">${G.tries.map((t) => `<div>${t.map((w) => `<i class="g${groupOf(w)}"></i>`).join("")}</div>`).join("")}</div>
      <h3>REWARDS</h3>
      <p class="reward">+${r.xp} XP &nbsp; ${r.credits ? `+◈${r.credits}` : ""}</p>
      ${r.bonus ? `<p class="reward">${r.bonus}</p>` : ""}
      ${G.hints ? `<p style="color:var(--dim)">${G.hints} hint${G.hints > 1 ? "s" : ""} used</p>` : ""}
      <h3>WINS BY MISTAKES</h3>
      ${distHtml(won ? G.mistakes : -1)}
      ${G.mode === "daily" ? `<h3>NEXT DAILY IN <span id="l-cd">${NW.nextDailyIn()}</span></h3>` : ""}
      <div class="btn-row">
        <button class="btn" id="lr-next">${G.mode === "daily" ? "PLAY ENDLESS" : "NEXT GRID"}</button>
        <button class="btn alt" id="lr-share">SHARE</button>
      </div>`);
    $("#lr-next").onclick = () => {
      NW.closeModal();
      if (G.mode !== "daily") L.games.endless = null;
      startMode("endless");
    };
    $("#lr-share").onclick = async () => {
      const txt = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: txt });
        else { await navigator.clipboard.writeText(txt); NW.toast("COPIED TO CLIPBOARD"); }
      } catch {}
    };
    if (G.mode === "daily") {
      const iv = setInterval(() => {
        const el = $("#l-cd");
        if (!el) return clearInterval(iv);
        el.textContent = NW.nextDailyIn();
      }, 1000);
    }
  }

  function showStats() {
    const S = L.stats;
    const lw = L.daily.lastWin;
    const ds = lw === NW.dateKey() || lw === NW.yesterdayKey() ? L.daily.streak : 0;
    NW.openModal(`
      <h2>LINK STATS</h2>
      <div class="stat-grid">
        <div><b>${S.played}</b><span>played</span></div>
        <div><b>${S.played ? Math.round((S.won / S.played) * 100) : 0}</b><span>win %</span></div>
        <div><b>${S.streak}</b><span>streak</span></div>
        <div><b>${S.maxStreak}</b><span>best</span></div>
      </div>
      <h3>DAILY</h3>
      <div class="stat-grid">
        <div><b>${ds}</b><span>day streak</span></div>
        <div><b>${L.daily.best}</b><span>best run</span></div>
        <div><b>${S.dist[0]}</b><span>flawless</span></div>
        <div><b>${LINK_PUZZLES.length}</b><span>grids</span></div>
      </div>
      <h3>WINS BY MISTAKES</h3>
      ${distHtml(-1)}`);
  }

  function showHelp() {
    const bar = (gi, n, w) => `<div class="l-bar g${gi}" style="--lh:46px"><b>${n}</b><span>${w}</span></div>`;
    NW.openModal(`
      <h2>HOW TO LINK</h2>
      <p>16 words hide 4 secret links. Tap 4 words that belong together and hit <kbd>SUBMIT</kbd>.</p>
      <p>Find all 4 groups before your <b style="color:var(--c1)">SIGNAL</b> runs out. 4 mistakes allowed.</p>
      <h3>LINK COLOURS · easy to tricky</h3>
      <div class="l-result">
        ${bar(0, "SHADES OF BLUE", "NAVY, TEAL, AZURE, COBALT")}
        ${bar(1, "KEYBOARD KEYS", "SHIFT, ENTER, ESCAPE, DELETE")}
        ${bar(2, "___FISH", "SWORD, STAR, CAT, GOLD")}
        ${bar(3, "HIDDEN ANIMALS", "SCOWL, BEARD, CRATE, PLANT")}
      </div>
      <p>Watch for decoys: a word can look like it fits two groups, but only one answer works.</p>
      <h3>HINTS · cost ◈ credits</h3>
      <p><kbd>PAIR</kbd> ◈1 — light up two words that share a link.</p>
      <p><kbd>DECODE</kbd> ◈2 — reveal the name of one link.</p>
      <h3>REWARDS</h3>
      <p>Same level and ◈ as NEONWORD. Fewer mistakes = more XP. Daily grids pay 1.5× XP, +◈1, and every 7-day streak pays ◈5.</p>
      <div class="btn-row"><button class="btn" id="lh-go">PATCH IN</button></div>
      <p style="color:var(--dim);font-size:15px;margin-top:14px">build ${NW.APP_VERSION}</p>`);
    $("#lh-go").onclick = NW.closeModal;
    L.seenHelp = true;
    save();
  }

  // ---------- wiring ----------
  $("#l-grid").addEventListener("click", (e) => {
    const t = e.target.closest(".l-tile");
    if (t) tap(t.dataset.w);
  });
  $("#l-submit").addEventListener("click", submit);
  $$("#links .hint-btn").forEach((b) => b.addEventListener("click", () => {
    const a = b.dataset.act;
    if (a === "shuffle") doShuffle();
    else if (a === "clear") clearSel();
    else useHint(a);
  }));
  $$("#links .mode-btn").forEach((b) => b.addEventListener("click", () => {
    NW.SFX.init(); NW.SFX.click();
    if (busy) return;
    startMode(b.dataset.lmode);
  }));
  $("#l-help").onclick = () => { NW.SFX.init(); NW.SFX.click(); showHelp(); };
  $("#l-stats").onclick = () => { NW.SFX.init(); NW.SFX.click(); showStats(); };
  $("#l-scenes").onclick = () => { NW.SFX.init(); NW.SFX.click(); showScenes(); };
  addEventListener("keydown", (e) => {
    if (document.body.dataset.game !== "links" || !$("#modal-back").hidden) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "Backspace" || e.key === "Escape") clearSel();
  });
  new ResizeObserver(() => fit()).observe($("#l-board"));

  // ---------- scenes (backgrounds that unlock with level) ----------
  // Picked scene, falling back to the first one if it is somehow locked (e.g. an old backup).
  function sceneFor(P) {
    const lvl = NW.levelInfo(P.xp).lvl;
    const id = P.links && P.links.scene;
    const s = BG.SCENES.find((x) => x.id === id);
    return s && s.lvl <= lvl ? s.id : BG.SCENES[0].id;
  }

  function showScenes() {
    const lvl = NW.levelInfo(NW.P.xp).lvl;
    const cur = sceneFor(NW.P);
    NW.openModal(`
      <h2>LINK SCENES</h2>
      <p style="color:var(--dim)">Level up to unlock new skies over the lake.</p>
      <div class="theme-grid">
        ${BG.SCENES.map((s) => `
          <button class="theme-card ${cur === s.id ? "on" : ""}" data-scene="${s.id}" ${lvl < s.lvl ? "disabled" : ""}>
            <div class="swatches">${[...s.sky, s.mtn[0]].map((c) => `<i style="background:${c}"></i>`).join("")}</div>
            <span class="theme-name">${s.name}</span>
            <span class="theme-lock">${lvl < s.lvl ? `🔒 LV ${s.lvl}` : cur === s.id ? "ACTIVE" : "TAP TO SET"}</span>
          </button>`).join("")}
      </div>`);
    $$("[data-scene]").forEach((b) => (b.onclick = () => {
      L.scene = b.dataset.scene;
      save();
      BG.setMode("grid", L.scene);
      NW.SFX.coin();
      showScenes();
    }));
  }

  // Daily status line for the game menu.
  function dailyStatus(P) {
    const g = P.links && P.links.games && P.links.games.daily;
    if (!g || g.date !== NW.dateKey() || g.status === "play") return g && g.date === NW.dateKey() && g.solved.length ? "DAILY IN PROGRESS" : "DAILY READY";
    return g.status === "won" ? "DAILY ✓ CLEARED" : "DAILY ✗ LOST";
  }

  return { enter, dailyStatus, sceneFor, refreshHud: () => G && renderHud(), setApi: (api) => (NW = api) };
})();
