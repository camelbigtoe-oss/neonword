// NEONTRACE — find the theme words hidden as paths in a 6 x 8 letter board.
// Every letter belongs to exactly one word. One "span" word names the theme and
// crosses the board side to side. Other real words (4+ letters) charge the hint meter.
const Trace = (() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const COLS = 6, ROWS = 8;
  const HINT_COST = 2;        // ◈ when the meter is not full
  const METER = 3;            // bonus words per free hint
  const WIN_WORDS = ["THREADED", "ALL TRACED", "WOVEN", "UNRAVELLED", "CLEAN SWEEP"];

  let NW = null, T = null, G = null;
  let sel = [], dragging = false, moved = false, pendingSubmit = false, checking = false;

  const defaults = () => ({
    mode: "daily", seenHelp: false, sector: "deep",
    stats: { played: 0, won: 0, streak: 0, maxStreak: 0, clean: 0 },
    daily: { streak: 0, best: 0, lastWin: null },
    games: { daily: null, endless: null },
    recent: [], history: [],
  });

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const puzzle = () => TRACE_PUZZLES[G.id];
  const letter = (i) => puzzle().rows[Math.floor(i / COLS)][i % COLS];
  const adj = (a, b) => a !== b && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1;
  const save = () => NW.save();

  // ---------- setup ----------
  function dailyId(key) {
    const n = TRACE_PUZZLES.length;
    const days = Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 864e5);
    return NW.seededShuffle(n, 777)[((days % n) + n) % n];
  }

  function freshGame(mode) {
    let id;
    if (mode === "daily") id = dailyId(NW.dateKey());
    else {
      const all = [...TRACE_PUZZLES.keys()];
      const pool = all.filter((i) => !T.recent.includes(i));
      id = pick(pool.length ? pool : all);
      T.recent = [...T.recent, id].slice(-Math.floor(TRACE_PUZZLES.length * 0.7));
    }
    return { mode, id, date: NW.dateKey(), found: [], trail: [], extra: [], meter: 0, hint: null, hints: 0, status: "play", rewarded: false };
  }

  function enter(api) {
    NW = api;
    NW.P.trace = Object.assign(defaults(), NW.P.trace || {});
    T = NW.P.trace;
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
    sel = [];
    if (G.status !== "play" && !G.rewarded) applyRewards();
    save();
    renderAll();
    say(G.status === "play" ? "" : "ALL TRACED");
    if (G.status !== "play" && !quiet) setTimeout(showResult, 300);
  }

  // ---------- rendering ----------
  function renderAll() {
    $$("#trace .mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.tmode === T.mode));
    $("#t-clue").textContent = puzzle().clue;
    renderHud();
    buildBoard();
    renderBoard();
    renderControls();
  }

  function renderHud() {
    const I = NW.levelInfo(NW.P.lv.trace);
    $("#t-lvl").textContent = I.lvl;
    $("#t-xpfill").style.width = `${(I.into / I.need) * 100}%`;
    $("#t-xptxt").textContent = `${I.into}/${I.need}`;
    $("#t-credits").textContent = NW.P.credits;
    const lw = T.daily.lastWin;
    const s = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    $("#t-streak").textContent = s > 0 ? `×${s}` : "";
  }

  function buildBoard() {
    const b = $("#t-cells");
    b.innerHTML = "";
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = document.createElement("div");
      c.className = "t-cell";
      c.dataset.i = i;
      c.innerHTML = `<span>${letter(i)}</span>`;
      b.appendChild(c);
    }
    fit();
  }

  function wordOfCell(i) { return puzzle().words.findIndex((w) => w.p.includes(i)); }

  function renderBoard() {
    const words = puzzle().words;
    const hintCells = G.hint !== null && !G.found.includes(G.hint) ? words[G.hint].p : [];
    $$("#t-cells .t-cell").forEach((c) => {
      const i = +c.dataset.i, wi = wordOfCell(i);
      const found = G.found.includes(wi);
      c.className = "t-cell" + (found ? (words[wi].s ? " span" : " found") : "") + (sel.includes(i) ? " sel" : "") + (hintCells.includes(i) ? " hinted" : "");
    });
    drawLines();
    const n = words.length;
    $("#t-prog").innerHTML = `<b>${G.found.length}</b>/${n} FOUND`;
  }

  function center(i) {
    const cs = cellSize();
    return [(i % COLS) * cs + cs / 2, Math.floor(i / COLS) * cs + cs / 2];
  }
  const cellSize = () => parseFloat(getComputedStyle($("#t-board")).getPropertyValue("--cs")) || 48;

  function drawLines() {
    const svg = $("#t-lines");
    const cs = cellSize();
    svg.setAttribute("viewBox", `0 0 ${cs * COLS} ${cs * ROWS}`);
    const line = (cells, cls) => cells.length > 1
      ? `<polyline class="${cls}" points="${cells.map((i) => center(i).join(",")).join(" ")}" style="stroke-width:${cs * 0.3}px" />` : "";
    let out = "";
    for (const wi of G.found) out += line(puzzle().words[wi].p, puzzle().words[wi].s ? "span" : "found");
    out += line(sel, "sel");
    svg.innerHTML = out;
  }

  function renderControls() {
    const over = G.status !== "play";
    const free = G.meter >= METER;
    const active = G.hint !== null && !G.found.includes(G.hint);
    const h = $("#t-hint");
    h.disabled = over || active;
    h.classList.toggle("ready", free && !active && !over);
    $("#t-hint-cost").textContent = active ? "ACTIVE" : free ? "FREE" : `◈${HINT_COST}`;
    $("#t-meter").innerHTML = [...Array(METER)].map((_, i) => `<i class="${i < Math.min(G.meter, METER) ? "on" : ""}"></i>`).join("");
    $("#t-clear").disabled = over || !sel.length;
  }

  // the line under the theme card: the word being traced, or feedback
  function say(text, cls = "") {
    const el = $("#t-word");
    el.className = "t-word " + cls;
    el.textContent = text;
  }
  const showSel = () => say(sel.map(letter).join(""), "typing");

  // Size cells to fill the free space.
  function fit() {
    const wrap = $("#t-wrap");
    if (!wrap) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    const cs = Math.floor(Math.max(30, Math.min(70, w / COLS, h / ROWS)));
    $("#t-board").style.setProperty("--cs", `${cs}px`);
    if (G) drawLines();
  }

  // ---------- tracing ----------
  function cellAt(x, y) {
    const r = $("#t-cells").getBoundingClientRect();
    const cs = r.width / COLS;
    const c = Math.floor((x - r.left) / cs), rr = Math.floor((y - r.top) / cs);
    if (c < 0 || c >= COLS || rr < 0 || rr >= ROWS) return -1;
    // only count the middle of a cell so diagonal drags don't clip a neighbour
    const cx = r.left + (c + 0.5) * cs, cy = r.top + (rr + 0.5) * cs;
    if (Math.hypot(x - cx, y - cy) > cs * 0.42) return -1;
    return rr * COLS + c;
  }
  const locked = (i) => G.found.includes(wordOfCell(i));

  function onDown(e) {
    NW.SFX.init();
    if (G.status !== "play" || checking) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0 || locked(i)) return;
    e.preventDefault();
    dragging = true; moved = false; pendingSubmit = false;
    $("#t-cells").setPointerCapture(e.pointerId);
    const last = sel[sel.length - 1];
    if (sel.length && i === last) pendingSubmit = true;           // tap the last letter again to submit
    else if (sel.length && adj(last, i) && !sel.includes(i)) sel.push(i);
    else if (sel.includes(i)) sel = sel.slice(0, sel.indexOf(i) + 1);
    else sel = [i];
    NW.SFX.key();
    showSel(); renderBoard(); renderControls();
  }

  function onMove(e) {
    if (!dragging) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0 || i === sel[sel.length - 1] || locked(i)) return;
    if (i === sel[sel.length - 2]) { sel.pop(); moved = true; NW.SFX.del(); }
    else if (!sel.includes(i) && adj(sel[sel.length - 1], i)) { sel.push(i); moved = true; NW.SFX.key(); }
    else return;
    pendingSubmit = false;
    showSel(); renderBoard();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    if (moved || pendingSubmit) submit();
    renderControls();
  }

  function clearSel(msg = "") {
    sel = [];
    say(msg);
    renderBoard(); renderControls();
  }

  async function submit() {
    const cells = sel.slice();
    const word = cells.map(letter).join("");
    if (cells.length < 4) { NW.SFX.error(); flash("bad"); return clearSel("4+ LETTERS"); }
    const words = puzzle().words;
    const wi = words.findIndex((w) => w.w === word);
    if (wi >= 0) {
      if (G.found.includes(wi)) { NW.SFX.error(); return clearSel("ALREADY FOUND"); }
      if (words[wi].p.join() === cells.join()) return foundWord(wi);
      NW.SFX.error(); flash("bad");
      return clearSel("RIGHT WORD, OTHER PATH");
    }
    // not a theme word: a real word still charges the hint meter
    if (G.extra.includes(word)) { NW.SFX.error(); return clearSel("ALREADY COUNTED"); }
    checking = true;
    say("CHECKING…", "typing");
    const ok = await NW.isValid(word);
    checking = false;
    if (!ok) { NW.SFX.error(); flash("bad"); return clearSel("NOT IN LEXICON"); }
    G.extra.push(word);
    G.meter++;
    NW.SFX.coin();
    clearSel(G.meter === METER ? `${word} · HINT READY` : `${word} · NOT THEMED`);
    save();
  }

  function flash(kind) {
    const b = $("#t-board");
    b.classList.remove("shake"); void b.offsetWidth;
    if (kind === "bad") b.classList.add("shake");
  }

  function foundWord(wi) {
    const w = puzzle().words[wi];
    G.found.push(wi);
    G.trail.push(w.s ? "s" : "t");
    sel = [];
    save();
    renderBoard(); renderControls();
    say(w.s ? `SPAN: ${w.w}` : w.w, w.s ? "span" : "good");
    // pop each letter of the word in order
    w.p.forEach((i, k) => setTimeout(() => {
      const c = $(`#t-cells .t-cell[data-i="${i}"]`);
      if (c) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
      NW.SFX.flip("hit", k % 6);
    }, k * 60));
    const r = $(`#t-cells .t-cell[data-i="${w.p[Math.floor(w.p.length / 2)]}"]`).getBoundingClientRect();
    NW.BG.burst(r.left + r.width / 2, r.top + r.height / 2, w.s ? [NW.getVar("--near"), "#ffffff"] : [NW.getVar("--c2"), "#ffffff"], w.s ? 50 : 26);
    if (w.s) NW.toast("SPAN WORD!", true, 1200);
    if (G.found.length === puzzle().words.length) setTimeout(onWin, w.p.length * 60 + 300);
  }

  // ---------- hints ----------
  function useHint() {
    NW.SFX.init();
    if (G.status !== "play") return;
    if (G.hint !== null && !G.found.includes(G.hint)) return;
    const words = puzzle().words;
    const left = words.map((_, i) => i).filter((i) => !G.found.includes(i));
    // theme words first, the span word only when it is the last one left
    const wi = left.find((i) => !words[i].s) ?? left[0];
    if (wi === undefined) return;
    if (G.meter >= METER) G.meter -= METER;
    else if (!NW.spend(HINT_COST)) return;
    G.hint = wi;
    G.hints++;
    G.trail.push("h");
    NW.SFX.hint();
    say("HINT: TRACE THE LIT LETTERS", "clue");
    save();
    renderHud(); renderBoard(); renderControls();
  }

  // ---------- end ----------
  function applyRewards() {
    if (G.rewarded) return null;
    G.rewarded = true;
    const S = T.stats;
    S.played++; S.won++; S.streak++;
    S.maxStreak = Math.max(S.maxStreak, S.streak);
    if (!G.hints) S.clean++;
    const n = puzzle().words.length;
    let xp = Math.max(15, 30 + 6 * n - 10 * G.hints), credits = 1 + (G.hints ? 0 : 1), bonus = "";
    if (G.mode === "daily") {
      xp = Math.round(xp * 1.5);
      credits += 1;
      T.daily.streak = T.daily.lastWin === NW.yesterdayKey() ? T.daily.streak + 1 : 1;
      T.daily.lastWin = NW.dateKey();
      T.daily.best = Math.max(T.daily.best, T.daily.streak);
      if (T.daily.streak % 7 === 0) { credits += 5; bonus = `${T.daily.streak}-DAY STREAK BONUS +◈5`; }
    }
    G.reward = { xp, credits, bonus };
    T.history.push({ id: G.id, mode: G.mode, hints: G.hints, extra: G.extra.length, xp, t: Date.now() });
    if (T.history.length > 2000) T.history = T.history.slice(-2000);
    return NW.reward("trace", xp, credits);
  }

  function onWin() {
    G.status = "won";
    const lv = applyRewards();
    save();
    NW.SFX.win();
    NW.toast(G.hints ? pick(WIN_WORDS) : "NO HINTS. CLEAN.", true, 1600);
    NW.BG.confetti([NW.getVar("--c2"), NW.getVar("--near"), NW.getVar("--c1")]);
    say("ALL TRACED", "span");
    renderHud(); renderControls();
    setTimeout(() => { if (lv && lv.after > lv.before) NW.levelUp("trace", lv.after, showResult); else showResult(); }, 1800);
  }

  function shareText() {
    const head = G.mode === "daily" ? `NEONTRACE DAILY ${G.date}` : `NEONTRACE #${G.id + 1}`;
    const map = { t: "🔵", s: "🟡", h: "💡" };
    const marks = G.trail.map((x) => map[x]);
    const rows = [];
    for (let i = 0; i < marks.length; i += 4) rows.push(marks.slice(i, i + 4).join(""));
    return `${head}\n"${puzzle().clue}"\n${rows.join("\n")}`;
  }

  function showResult() {
    if (!G || G.status === "play" || document.body.dataset.game !== "trace") return;
    const r = G.reward || { xp: 0, credits: 0 };
    const words = puzzle().words;
    const span = words.find((w) => w.s);
    NW.openModal(`
      <h2>ALL TRACED</h2>
      <p style="color:var(--dim)">"${puzzle().clue}"</p>
      <div class="answer-reveal t-span-reveal">${span.w}</div>
      <div class="t-list">${words.filter((w) => !w.s).map((w) => `<span>${w.w}</span>`).join("")}</div>
      <div class="t-trail">${G.trail.map((x) => `<i class="${x}"></i>`).join("")}</div>
      <h3>REWARDS</h3>
      <p class="reward">+${r.xp} XP &nbsp; ${r.credits ? `+◈${r.credits}` : ""}</p>
      ${r.bonus ? `<p class="reward">${r.bonus}</p>` : ""}
      <p style="color:var(--dim)">${G.hints ? `${G.hints} hint${G.hints > 1 ? "s" : ""} used` : "no hints used"} · ${G.extra.length} bonus word${G.extra.length === 1 ? "" : "s"}</p>
      ${G.mode === "daily" ? `<h3>NEXT DAILY IN <span id="t-cd">${NW.nextDailyIn()}</span></h3>` : ""}
      <div class="btn-row">
        <button class="btn" id="tr-next">${G.mode === "daily" ? "PLAY ENDLESS" : "NEXT BOARD"}</button>
        <button class="btn alt" id="tr-share">SHARE</button>
      </div>`);
    $("#tr-next").onclick = () => {
      NW.closeModal();
      if (G.mode !== "daily") T.games.endless = null;
      startMode("endless");
    };
    $("#tr-share").onclick = async () => {
      const txt = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: txt });
        else { await navigator.clipboard.writeText(txt); NW.toast("COPIED TO CLIPBOARD"); }
      } catch {}
    };
    if (G.mode === "daily") {
      const iv = setInterval(() => {
        const el = $("#t-cd");
        if (!el) return clearInterval(iv);
        el.textContent = NW.nextDailyIn();
      }, 1000);
    }
  }

  function showStats() {
    const S = T.stats;
    const lw = T.daily.lastWin;
    const ds = lw === NW.dateKey() || lw === NW.yesterdayKey() ? T.daily.streak : 0;
    const I = NW.levelInfo(NW.P.lv.trace);
    NW.openModal(`
      <h2>TRACE STATS</h2>
      <div class="stat-grid">
        <div><b>${S.won}</b><span>solved</span></div>
        <div><b>${S.clean}</b><span>no hints</span></div>
        <div><b>${S.streak}</b><span>streak</span></div>
        <div><b>${S.maxStreak}</b><span>best</span></div>
      </div>
      <h3>DAILY</h3>
      <div class="stat-grid">
        <div><b>${ds}</b><span>day streak</span></div>
        <div><b>${T.daily.best}</b><span>best run</span></div>
        <div><b>${I.lvl}</b><span>level</span></div>
        <div><b>${NW.P.lv.trace}</b><span>xp</span></div>
      </div>`);
  }

  function showHelp() {
    NW.openModal(`
      <h2>HOW TO TRACE</h2>
      <p>The board hides words that fit today's <b style="color:var(--c2)">THEME</b>. Drag through touching letters (any direction, diagonals too) to spell one, then let go.</p>
      <p>Or tap letters one by one, and tap the last one again to submit.</p>
      <p><b style="color:var(--c2)">Theme words</b> light up blue. One <b style="color:var(--near)">SPAN WORD</b> names the theme and stretches from one side of the board to the other. It lights up gold.</p>
      <p>Every letter belongs to exactly one word. Find them all to clear the board.</p>
      <h3>HINTS</h3>
      <p>Other real words of 4+ letters charge the meter. Every ${METER} fill a free <kbd>HINT</kbd>, which lights up the letters of one theme word. No charge? A hint costs ◈${HINT_COST}.</p>
      <h3>REWARDS</h3>
      <p>NEONTRACE has its own level, which unlocks new space sectors (◆) with their own colours. ◈ credits are shared across games. Fewer hints = more XP. Daily boards pay 1.5× XP and +◈1.</p>
      <div class="btn-row"><button class="btn" id="th-go">START TRACING</button></div>
      <p style="color:var(--dim);font-size:15px;margin-top:14px">build ${NW.APP_VERSION}</p>`);
    $("#th-go").onclick = NW.closeModal;
    T.seenHelp = true;
    save();
  }

  // ---------- wiring ----------
  const board = $("#t-cells");
  board.addEventListener("pointerdown", onDown);
  board.addEventListener("pointermove", onMove);
  board.addEventListener("pointerup", onUp);
  board.addEventListener("pointercancel", () => { dragging = false; });
  $("#t-hint").addEventListener("click", useHint);
  $("#t-clear").addEventListener("click", () => { NW.SFX.del(); clearSel(); });
  $$("#trace .mode-btn").forEach((b) => b.addEventListener("click", () => {
    NW.SFX.init(); NW.SFX.click();
    if (checking) return;
    startMode(b.dataset.tmode);
  }));
  $("#t-help").onclick = () => { NW.SFX.init(); NW.SFX.click(); showHelp(); };
  $("#t-stats").onclick = () => { NW.SFX.init(); NW.SFX.click(); showStats(); };
  addEventListener("keydown", (e) => {
    if (document.body.dataset.game !== "trace" || !$("#modal-back").hidden) return;
    if (e.key === "Enter" && sel.length) { e.preventDefault(); submit(); }
    else if (e.key === "Escape" || e.key === "Backspace") clearSel();
  });
  new ResizeObserver(fit).observe($("#t-wrap"));

  // ---------- sectors (space backgrounds + colours that unlock with level) ----------
  function sectorFor(P) {
    const lvl = NW.levelInfo((P.lv && P.lv.trace) || 0).lvl;
    const s = BG.SECTORS.find((x) => x.id === (P.trace && P.trace.sector));
    return s && s.lvl <= lvl ? s.id : BG.SECTORS[0].id;
  }

  // NEONTRACE's colours follow the picked sector; cleared when you leave the game
  function paint(on) {
    const st = document.body.style;
    const all = new Set(BG.SECTORS.flatMap((s) => Object.keys(s.ui)));
    all.forEach((k) => st.removeProperty(k));
    if (!on || !NW) return;
    const s = BG.SECTORS.find((x) => x.id === sectorFor(NW.P));
    for (const [k, v] of Object.entries(s.ui)) st.setProperty(k, v);
  }

  function showSectors() {
    const lvl = NW.levelInfo(NW.P.lv.trace).lvl;
    const cur = sectorFor(NW.P);
    NW.openModal(`
      <h2>SECTORS</h2>
      <p style="color:var(--dim)">Level up in NEONTRACE to travel further out. Each sector has its own sky and colours.</p>
      <div class="theme-grid">
        ${BG.SECTORS.map((s) => `
          <button class="theme-card ${cur === s.id ? "on" : ""}" data-sector="${s.id}" ${lvl < s.lvl ? "disabled" : ""}>
            <div class="swatches">${[s.ui["--c1"], s.ui["--c2"], s.ui["--near"], s.sky[2]].map((c) => `<i style="background:${c}"></i>`).join("")}</div>
            <span class="theme-name">${s.name}</span>
            <span class="theme-lock">${lvl < s.lvl ? `🔒 LV ${s.lvl}` : cur === s.id ? "ACTIVE" : "TAP TO WARP"}</span>
          </button>`).join("")}
      </div>`);
    $$("[data-sector]").forEach((b) => (b.onclick = () => {
      T.sector = b.dataset.sector;
      save();
      paint(true);
      BG.setMode("space", T.sector);
      document.querySelector('meta[name="theme-color"]').content = NW.getVar("--bg");
      NW.SFX.coin();
      showSectors();
      if (G) renderBoard();
    }));
  }
  $("#t-sectors").onclick = () => { NW.SFX.init(); NW.SFX.click(); showSectors(); };

  function dailyStatus(P) {
    const g = P.trace && P.trace.games && P.trace.games.daily;
    if (!g || g.date !== NW.dateKey()) return "DAILY READY";
    if (g.status === "won") return "DAILY ✓ TRACED";
    return g.found.length ? `DAILY ${g.found.length}/${TRACE_PUZZLES[g.id].words.length}` : "DAILY READY";
  }

  return { enter, dailyStatus, sectorFor, paint, setApi: (api) => (NW = api), refreshHud: () => G && renderHud() };
})();
