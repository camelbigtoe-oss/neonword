// NEONWORD — game logic
(() => {
  "use strict";
  // Shown at the bottom of the help screen. Bump together with VERSION in sw.js.
  const APP_VERSION = 11;

  // ---------- config ----------
  const STORE_KEY = "neonword.v1";
  const DICT_KEY = "neonword.dict.v1";
  const THEMES = [
    { id: "neon", name: "NEON NIGHT", lvl: 1, sw: ["#ff2bd6", "#22e4ff", "#39ff88", "#ffd23f"] },
    { id: "sunset", name: "SYNTH SUNSET", lvl: 3, sw: ["#ff6b35", "#ff3e9a", "#00e5c7", "#ffd166"] },
    { id: "toxic", name: "TOXIC GRID", lvl: 5, sw: ["#b6ff00", "#00ffa3", "#ff9f1c", "#1a2d1f"] },
    { id: "ice", name: "CRYO CHROME", lvl: 8, sw: ["#9be7ff", "#ffffff", "#4dffdf", "#c7a6ff"] },
    { id: "blood", name: "RED MOON", lvl: 12, sw: ["#ff1f3d", "#ff8a00", "#00ff9c", "#351420"] },
    { id: "gold", name: "CORPO GOLD", lvl: 16, sw: ["#ffcf40", "#fff4c2", "#56f39a", "#ff7b54"] },
  ];
  const HINT_COST = { burn: 1, check: 1, reveal: 2, clue: 2 };
  const WIN_WORDS = ["GODLIKE", "ICE COLD", "SURGICAL", "CRACKED", "BREACHED", "NICE HACK", "CLUTCH"];
  const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "<ZXCVBNM>"];

  // ---------- state ----------
  const defaults = () => ({
    xp: 0, credits: 6, theme: "neon", sound: true, mode: "daily", len: 5, seenHelp: false,
    stats: { played: 0, won: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0, 0] },
    daily: { streak: 0, best: 0, lastWin: null },
    recent: { 4: [], 5: [], 6: [], 7: [] },
    games: { daily: null, endless: {} },
    history: [], // finished games, newest last
  });
  let P = load(STORE_KEY, defaults());
  P = Object.assign(defaults(), P);
  let dict = load(DICT_KEY, {});
  let G = null;              // current game
  let busy = false;          // during validation / animation
  let armed = null;          // hint waiting for input ("check")

  function load(k, fb) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch {}
  }
  function saveDict() {
    try { localStorage.setItem(DICT_KEY, JSON.stringify(dict)); } catch {}
  }

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };
  const rowsFor = (len) => (len >= 7 ? 7 : 6);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function seededShuffle(n, seed) {
    const a = [...Array(n).keys()];
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function levelInfo(xp) {
    let lvl = 1, need = 100, rem = xp;
    while (rem >= need) { rem -= need; lvl++; need = 100 + (lvl - 1) * 40; }
    return { lvl, into: rem, need };
  }

  function score(guess, ans) {
    const n = ans.length, res = Array(n).fill("miss"), left = {};
    for (let i = 0; i < n; i++) {
      if (guess[i] === ans[i]) res[i] = "hit";
      else left[ans[i]] = (left[ans[i]] || 0) + 1;
    }
    for (let i = 0; i < n; i++) {
      if (res[i] !== "hit" && left[guess[i]] > 0) { res[i] = "near"; left[guess[i]]--; }
    }
    return res;
  }

  // ---------- game setup ----------
  function dailyEntry(key) {
    const list = WORDS[5];
    const days = Math.round((Date.parse(key) - Date.parse("2026-01-01")) / 864e5);
    const order = seededShuffle(list.length, 1337);
    return list[order[((days % list.length) + list.length) % list.length]];
  }

  function freshGame(mode, len) {
    let e;
    if (mode === "daily") e = dailyEntry(dateKey());
    else {
      const recent = P.recent[len] || [];
      const pool = WORDS[len].filter((x) => !recent.includes(x.w));
      e = pick(pool.length ? pool : WORDS[len]);
      P.recent[len] = [...recent, e.w].slice(-Math.floor(WORDS[len].length * 0.7));
    }
    return {
      mode, len, rows: rowsFor(len), answer: e.w, clue: e.c, date: dateKey(),
      guesses: [], cur: "", status: "play", revealed: {}, burned: [], scanned: {},
      clueShown: false, hints: 0, log: [], rewarded: false,
    };
  }

  function startMode(mode, len = P.len) {
    P.mode = mode;
    if (mode === "daily") {
      const g = P.games.daily;
      G = g && g.date === dateKey() ? g : (P.games.daily = freshGame("daily", 5));
    } else {
      P.len = len;
      const g = P.games.endless[len];
      G = g && g.status === "play" ? g : (P.games.endless[len] = freshGame("endless", len));
    }
    disarm();
    if (!G.log.length) {
      logLine(G.mode === "daily" ? `> daily code ${G.date} // ${G.len} glyphs` : `> new code // ${G.len} glyphs // ${G.rows} attempts`, "dim");
    }
    // finished but reload happened before rewards were paid
    if (G.status !== "play" && !G.rewarded) applyRewards(G.status === "won");
    save();
    renderAll();
    if (G.status !== "play") setTimeout(showResult, 300);
  }

  // ---------- rendering ----------
  function renderAll() {
    document.body.dataset.theme = P.theme;
    $$(".mode-btn").forEach((b) => b.classList.toggle("on", b.dataset.mode === P.mode));
    $$(".len-btn").forEach((b) => b.classList.toggle("on", +b.dataset.len === G.len));
    $("#lens").classList.toggle("hidden", P.mode === "daily");
    SFX.enabled = P.sound;
    renderHud();
    renderBoard();
    renderKeys();
    renderIntel();
    renderHints();
  }

  function renderHud() {
    const L = levelInfo(P.xp);
    $("#lvl").textContent = L.lvl;
    $("#xpfill").style.width = `${(L.into / L.need) * 100}%`;
    $("#xptxt").textContent = `${L.into}/${L.need}`;
    $("#credits").textContent = P.credits;
    const s = currentDailyStreak();
    $("#streak-badge").textContent = s > 0 ? `×${s}` : "";
  }

  function currentDailyStreak() {
    const lw = P.daily.lastWin;
    return lw === dateKey() || lw === yesterdayKey() ? P.daily.streak : 0;
  }

  function renderBoard() {
    const b = $("#board");
    b.style.setProperty("--len", G.len);
    b.style.setProperty("--rows", G.rows);
    fitBoard();
    b.innerHTML = "";
    for (let r = 0; r < G.rows; r++) {
      const row = document.createElement("div");
      row.className = "row";
      const guess = G.guesses[r];
      const res = guess ? score(guess, G.answer) : null;
      const active = !guess && r === G.guesses.length && G.status === "play";
      if (active) row.classList.add("active");
      for (let i = 0; i < G.len; i++) {
        const t = document.createElement("div");
        t.className = "tile";
        if (guess) { t.textContent = guess[i]; t.classList.add(res[i]); }
        else if (active) {
          if (G.cur[i]) { t.textContent = G.cur[i]; t.classList.add("filled"); t.style.animation = "none"; }
          else if (G.revealed[i]) { t.textContent = G.revealed[i]; t.classList.add("ghost"); }
        }
        row.appendChild(t);
      }
      b.appendChild(row);
    }
  }

  // Size tiles to fill whatever space is left between the message box and the hints.
  function fitBoard() {
    if (!G) return;
    const wrap = $(".board-wrap"), b = $("#board");
    const gap = 6;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    const t = Math.floor(Math.min(68, (w - gap * (G.len - 1)) / G.len, (h - 4 - gap * (G.rows - 1)) / G.rows));
    b.style.setProperty("--tile", `${Math.max(24, t)}px`);
  }
  new ResizeObserver(fitBoard).observe(document.querySelector(".board-wrap"));

  function activeRow() { return $("#board").children[G.guesses.length]; }

  function paintActiveRow(popIndex = -1) {
    const row = activeRow();
    if (!row) return;
    [...row.children].forEach((t, i) => {
      t.className = "tile";
      t.textContent = "";
      t.style.animation = "";
      if (G.cur[i]) {
        t.textContent = G.cur[i];
        t.classList.add("filled");
        if (i !== popIndex) t.style.animation = "none";
      } else if (G.revealed[i]) { t.textContent = G.revealed[i]; t.classList.add("ghost"); }
    });
  }

  function keyStates() {
    const st = {};
    const rank = { miss: 1, near: 2, hit: 3 };
    const set = (k, v) => { if (!st[k] || rank[v] > rank[st[k]]) st[k] = v; };
    for (const g of G.guesses) score(g, G.answer).forEach((r, i) => set(g[i], r));
    for (const i in G.revealed) set(G.revealed[i], "hit");
    for (const [k, n] of Object.entries(G.scanned)) set(k, n > 0 ? "near" : "miss");
    for (const k of G.burned) if (!st[k]) st[k] = "burned";
    return st;
  }

  function renderKeys() {
    const kb = $("#keyboard");
    if (!kb.children.length) {
      for (const r of KEY_ROWS) {
        const row = document.createElement("div");
        row.className = "krow";
        for (const ch of r) {
          const k = document.createElement("button");
          k.className = "key";
          if (ch === "<") { k.textContent = "ENTER"; k.dataset.k = "ENTER"; k.classList.add("wide"); }
          else if (ch === ">") { k.textContent = "DEL"; k.dataset.k = "DEL"; k.classList.add("wide"); }
          else { k.textContent = ch; k.dataset.k = ch; }
          row.appendChild(k);
        }
        kb.appendChild(row);
      }
    }
    const st = keyStates();
    $$(".key").forEach((k) => {
      const c = k.dataset.k;
      k.classList.remove("hit", "near", "miss", "burned");
      if (st[c]) k.classList.add(st[c]);
    });
    kb.classList.toggle("check-mode", armed === "check");
  }

  function renderIntel() {
    const box = $("#intel");
    box.innerHTML = "";
    for (const l of G.log) {
      const d = document.createElement("div");
      d.className = `intel-line ${l.c}`;
      d.textContent = l.t;
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
  }

  function logLine(t, c = "") {
    G.log.push({ t, c });
    const box = $("#intel");
    const d = document.createElement("div");
    d.className = `intel-line ${c} new`;
    d.textContent = t;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  function renderHints() {
    const over = G.status !== "play";
    $$(".hint-btn").forEach((b) => {
      const h = b.dataset.hint;
      b.disabled = over || (h === "clue" && G.clueShown);
      b.classList.toggle("armed", armed === h);
    });
  }

  // ---------- toasts / modals ----------
  function toast(msg, big = false, ms = 1400) {
    const t = document.createElement("div");
    t.className = "toast" + (big ? " big" : "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, ms);
  }

  function openModal(html) {
    $("#modal-body").innerHTML = html;
    $("#modal-back").hidden = false;
  }
  function closeModal() { $("#modal-back").hidden = true; Radio.unmount(); }

  // ---------- input ----------
  function press(k) {
    SFX.init();
    if (!$("#modal-back").hidden) return;
    if (G.status !== "play" || busy) return;

    if (armed === "check") {
      if (/^[A-Z]$/.test(k)) return doScan(k);
      if (k === "ESC" || k === "DEL") { disarm(); renderAll(); return; }
      return;
    }

    if (k === "ENTER") return submit();
    if (k === "DEL") {
      if (!G.cur.length) return;
      G.cur = G.cur.slice(0, -1);
      SFX.del();
      paintActiveRow();
      return;
    }
    if (/^[A-Z]$/.test(k) && G.cur.length < G.len) {
      G.cur += k;
      SFX.key();
      paintActiveRow(G.cur.length - 1);
    }
  }

  function flashKey(k) {
    const el = $(`.key[data-k="${k}"]`);
    if (!el) return;
    el.classList.add("pressed");
    setTimeout(() => el.classList.remove("pressed"), 90);
  }

  async function isValid(w) {
    if (KNOWN.has(w)) return true;
    if (w in dict) return dict[w];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3500);
    try {
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w.toLowerCase()}`, { signal: ctl.signal });
      if (r.ok) { dict[w] = true; saveDict(); return true; }
      if (r.status === 404) { dict[w] = false; saveDict(); return false; }
      return true; // rate limit or server error: be generous
    } catch {
      return true; // offline: accept
    } finally {
      clearTimeout(timer);
    }
  }

  function shakeRow() {
    const row = activeRow();
    row.classList.remove("shake");
    void row.offsetWidth;
    row.classList.add("shake");
    SFX.error();
  }

  async function submit() {
    if (G.cur.length < G.len) { shakeRow(); toast("NOT ENOUGH GLYPHS"); return; }
    const word = G.cur;
    busy = true;
    let ok = KNOWN.has(word) || dict[word] === true;
    if (!ok && dict[word] !== false) {
      const tm = setTimeout(() => toast("SCANNING LEXICON…", false, 900), 250);
      ok = await isValid(word);
      clearTimeout(tm);
    }
    if (!ok) { busy = false; shakeRow(); toast("NOT IN LEXICON"); return; }

    const res = score(word, G.answer);
    G.guesses.push(word);
    G.cur = "";
    const won = word === G.answer;
    const lost = !won && G.guesses.length >= G.rows;
    if (won) G.status = "won";
    else if (lost) G.status = "lost";
    save();

    // flip animation on the just-submitted row
    const row = $("#board").children[G.guesses.length - 1];
    row.classList.remove("active");
    const tiles = [...row.children];
    const step = 260;
    tiles.forEach((t, i) => {
      t.textContent = word[i];
      setTimeout(() => {
        t.style.animation = "";
        t.classList.remove("filled", "ghost");
        t.classList.add("flip");
        setTimeout(() => { t.classList.add(res[i]); SFX.flip(res[i], i); }, 250);
      }, i * step);
    });

    setTimeout(() => {
      tiles.forEach((t) => t.classList.remove("flip"));
      busy = false;
      if (won) return onWin(row);
      if (lost) return onLose();
      renderBoard();
      renderKeys();
      const hits = res.filter((r) => r === "hit").length;
      if (hits === G.len - 1) toast("ONE GLYPH OFF");
    }, G.len * step + 300);
  }

  // ---------- hints ----------
  function knownHitPositions() {
    const k = new Set(Object.keys(G.revealed).map(Number));
    for (const g of G.guesses) score(g, G.answer).forEach((r, i) => r === "hit" && k.add(i));
    return k;
  }

  function charge(type) {
    const c = HINT_COST[type];
    if (P.credits < c) {
      SFX.error();
      toast(`NEED ◈${c} — WIN TO EARN MORE`);
      return false;
    }
    P.credits -= c;
    G.hints++;
    const el = $(".credits");
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    return true;
  }

  function disarm() { armed = null; }

  function useHint(type) {
    SFX.init();
    if (G.status !== "play" || busy) return;
    if (armed) { const was = armed; disarm(); renderKeys(); renderHints(); if (was === type) return; }

    if (type === "burn") {
      const st = keyStates();
      const cands = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((c) => !G.answer.includes(c) && !st[c]);
      if (!cands.length) { toast("NOTHING LEFT TO BURN"); return; }
      if (!charge("burn")) return;
      const chosen = [];
      while (chosen.length < 3 && cands.length) chosen.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
      G.burned.push(...chosen);
      SFX.burn();
      logLine(`> BURN: ${chosen.join(" ")} purged from keyspace`, "bad");
      renderKeys();
      chosen.forEach((c) => {
        const el = $(`.key[data-k="${c}"]`);
        el.classList.add("burning");
        const r = el.getBoundingClientRect();
        BG.burst(r.left + r.width / 2, r.top + r.height / 2, ["#ff3355", "#ff9f1c", "#ffd23f"], 18);
        setTimeout(() => el.classList.remove("burning"), 800);
      });
    }

    if (type === "check") {
      if (P.credits < HINT_COST.check) { charge("check"); return; }
      armed = "check";
      SFX.click();
      logLine("> SCAN armed: tap a letter (DEL to cancel)", "dim");
      renderKeys();
      renderHints();
      return save();
    }

    if (type === "reveal") {
      const known = knownHitPositions();
      const open = [...Array(G.len).keys()].filter((i) => !known.has(i));
      if (open.length <= 1) { toast("TOO CLOSE — FINISH IT YOURSELF"); return; }
      if (!charge("reveal")) return;
      const i = pick(open);
      G.revealed[i] = G.answer[i];
      SFX.hint();
      logLine(`> REVEAL: slot ${i + 1} = ${G.answer[i]}`, "good");
      renderKeys();
      paintActiveRow();
      const t = activeRow()?.children[i];
      if (t) { const r = t.getBoundingClientRect(); BG.burst(r.left + r.width / 2, r.top + r.height / 2, [getVar("--hit"), "#fff"], 24); }
    }

    if (type === "clue") {
      if (G.clueShown) return;
      if (!charge("clue")) return;
      G.clueShown = true;
      SFX.hint();
      logLine(`> CLUE: "${G.clue}"`, "clue");
    }

    renderHud();
    renderHints();
    save();
  }

  function doScan(letter) {
    const st = keyStates();
    if (st[letter] === "hit" || st[letter] === "miss" || st[letter] === "burned" || letter in G.scanned) {
      toast(`${letter} ALREADY KNOWN`);
      SFX.error();
      return;
    }
    disarm();
    if (!charge("check")) { renderAll(); return; }
    const n = G.answer.split("").filter((c) => c === letter).length;
    G.scanned[letter] = n;
    SFX.hint();
    logLine(n ? `> SCAN ${letter}: ${n}× in code` : `> SCAN ${letter}: not in code`, n ? "good" : "bad");
    renderHud();
    renderKeys();
    renderHints();
    save();
  }

  const getVar = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();

  // ---------- end of game ----------
  function applyRewards(won) {
    if (G.rewarded) return null;
    G.rewarded = true;
    const before = levelInfo(P.xp).lvl;
    const n = G.guesses.length;
    const S = P.stats;
    S.played++;
    let xp = 10, credits = 0, bonus = "";
    if (won) {
      S.won++;
      S.streak++;
      S.maxStreak = Math.max(S.maxStreak, S.streak);
      S.dist[n - 1]++;
      xp = Math.max(15, 40 + 15 * (G.rows - n) + 10 * (G.len - 4) - 8 * G.hints);
      credits = 1 + (n <= 3 ? 1 : 0);
      if (G.mode === "daily") {
        xp = Math.round(xp * 1.5);
        credits += 1;
        P.daily.streak = P.daily.lastWin === yesterdayKey() ? P.daily.streak + 1 : 1;
        P.daily.lastWin = dateKey();
        P.daily.best = Math.max(P.daily.best, P.daily.streak);
        if (P.daily.streak % 7 === 0) { credits += 5; bonus = `${P.daily.streak}-DAY STREAK BONUS +◈5`; }
      }
    } else {
      S.streak = 0;
      if (G.mode === "daily") P.daily.streak = 0;
    }
    P.xp += xp;
    P.credits += credits;
    const after = levelInfo(P.xp).lvl;
    G.reward = { xp, credits, bonus };
    P.history.push({
      w: G.answer, c: G.clue, len: G.len, mode: G.mode, won, n: G.guesses.length,
      rows: G.rows, hints: G.hints, xp, t: Date.now(),
    });
    if (P.history.length > 2000) P.history = P.history.slice(-2000);
    save();
    return { before, after };
  }

  function onWin(row) {
    const lv = applyRewards(true);
    const tiles = [...row.children];
    tiles.forEach((t, i) => setTimeout(() => t.classList.add("dance"), i * 90));
    SFX.win();
    toast(G.guesses.length === 1 ? "IMPOSSIBLE" : pick(WIN_WORDS), true, 1600);
    BG.confetti([getVar("--c1"), getVar("--c2"), getVar("--hit"), getVar("--near")]);
    logLine(`> ACCESS GRANTED: ${G.answer}`, "good");
    renderHud();
    renderKeys();
    renderHints();
    setTimeout(() => SFX.coin(), 900);
    setTimeout(() => { if (lv && lv.after > lv.before) levelUp(lv.after); else showResult(); }, 1800);
  }

  function onLose() {
    applyRewards(false);
    SFX.lose();
    toast(G.answer, true, 2200);
    logLine(`> LOCKOUT. code was ${G.answer}`, "bad");
    renderBoard();
    renderHud();
    renderKeys();
    renderHints();
    setTimeout(showResult, 1800);
  }

  function levelUp(lvl) {
    SFX.levelUp();
    const unlock = THEMES.find((t) => t.lvl === lvl);
    const el = document.createElement("div");
    el.className = "levelup";
    el.innerHTML = `<div class="lu1">LEVEL ${lvl}</div><div class="lu2">${unlock ? `THEME UNLOCKED: ${unlock.name}` : "+1 CREDIT"}</div>`;
    if (!unlock) { P.credits += 1; save(); renderHud(); }
    document.body.appendChild(el);
    BG.confetti([getVar("--near"), getVar("--c1"), "#ffffff"]);
    setTimeout(() => { el.remove(); showResult(); }, 2400);
  }

  function shareText() {
    const map = { hit: "🟩", near: "🟨", miss: "⬛" };
    const head = G.mode === "daily" ? `NEONWORD DAILY ${G.date}` : `NEONWORD ${G.len}-GLYPH`;
    const score_ = G.status === "won" ? `${G.guesses.length}/${G.rows}` : `X/${G.rows}`;
    const grid = G.guesses.map((g) => score(g, G.answer).map((r) => map[r]).join("")).join("\n");
    return `${head} ${score_}${G.hints ? ` ◈${G.hints}` : ""}\n${grid}`;
  }

  function nextDailyIn() {
    const now = new Date(), t = new Date(now);
    t.setHours(24, 0, 0, 0);
    const s = Math.floor((t - now) / 1000);
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  function distHtml(highlight) {
    const d = P.stats.dist, max = Math.max(1, ...d);
    return `<div class="dist">${d.map((v, i) => `<div class="dist-row"><span>${i + 1}</span><div class="dist-bar ${highlight === i + 1 ? "cur" : ""}" style="width:${8 + (v / max) * 82}%">${v}</div></div>`).join("")}</div>`;
  }

  function showResult() {
    if (!G || G.status === "play") return;
    const won = G.status === "won";
    const r = G.reward || { xp: 0, credits: 0 };
    openModal(`
      <h2>${won ? "ACCESS GRANTED" : "LOCKOUT"}</h2>
      <p>The code was</p>
      <div class="answer-reveal">${G.answer}</div>
      <p style="color:var(--dim)">"${G.clue}"</p>
      <h3>REWARDS</h3>
      <p class="reward">+${r.xp} XP &nbsp; ${r.credits ? `+◈${r.credits}` : ""}</p>
      ${r.bonus ? `<p class="reward">${r.bonus}</p>` : ""}
      ${G.hints ? `<p style="color:var(--dim)">${G.hints} hint${G.hints > 1 ? "s" : ""} used</p>` : ""}
      <h3>GUESS SPREAD</h3>
      ${distHtml(won ? G.guesses.length : 0)}
      ${G.mode === "daily" ? `<h3>NEXT DAILY IN <span id="cd">${nextDailyIn()}</span></h3>` : ""}
      <div class="btn-row">
        <button class="btn" id="r-next">${G.mode === "daily" ? "PLAY ENDLESS" : "NEXT CODE"}</button>
        <button class="btn alt" id="r-share">SHARE</button>
      </div>`);
    $("#r-next").onclick = () => {
      closeModal();
      if (G.mode === "daily") startMode("endless", P.len === 5 || !P.len ? 5 : P.len);
      else { P.games.endless[G.len] = null; startMode("endless", G.len); }
    };
    $("#r-share").onclick = async () => {
      const txt = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text: txt });
        else { await navigator.clipboard.writeText(txt); toast("COPIED TO CLIPBOARD"); }
      } catch {}
    };
    if (G.mode === "daily") {
      const iv = setInterval(() => {
        const el = $("#cd");
        if (!el) return clearInterval(iv);
        el.textContent = nextDailyIn();
      }, 1000);
    }
  }

  function showHistory(filter = "all") {
    const all = P.history.slice().reverse();
    const list = all.filter((h) =>
      filter === "all" ? true : filter === "daily" ? h.mode === "daily" : h.mode === "endless" && h.len === +filter);
    const solved = list.filter((h) => h.won).length;
    const avg = solved ? (list.filter((h) => h.won).reduce((s, h) => s + h.n, 0) / solved).toFixed(1) : "-";
    const tabs = ["all", "daily", "4", "5", "6", "7"];
    const fmt = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    openModal(`
      <h2>CODE LOG</h2>
      <div class="hist-tabs">${tabs.map((t) => `<button class="len-btn ${t === filter ? "on" : ""}" data-f="${t}">${t.toUpperCase()}</button>`).join("")}</div>
      <div class="stat-grid hist-sum">
        <div><b>${list.length}</b><span>played</span></div>
        <div><b>${solved}</b><span>cracked</span></div>
        <div><b>${list.length - solved}</b><span>locked out</span></div>
        <div><b>${avg}</b><span>avg guesses</span></div>
      </div>
      <div class="hist-list">
        ${list.length ? list.map((h) => `
          <button class="hist-row ${h.won ? "won" : "lost"}">
            <span class="hist-word">${h.w.split("").map((ch) => `<i>${ch}</i>`).join("")}</span>
            <span class="hist-meta">${h.won ? `${h.n}/${h.rows}` : "X"}${h.hints ? ` ◈${h.hints}` : ""} · ${h.mode === "daily" ? "DAILY · " : ""}${fmt(h.t)}</span>
            <span class="hist-clue">"${h.c}"</span>
          </button>`).join("") : `<p style="color:var(--dim)">No codes here yet. Go crack some.</p>`}
      </div>`);
    $$(".hist-tabs .len-btn").forEach((b) => (b.onclick = () => { SFX.click(); showHistory(b.dataset.f); }));
    $$(".hist-row").forEach((r) => (r.onclick = () => r.classList.toggle("open")));
  }

  function showStats() {
    const S = P.stats, L = levelInfo(P.xp);
    openModal(`
      <h2>STATS</h2>
      <div class="stat-grid">
        <div><b>${S.played}</b><span>played</span></div>
        <div><b>${S.played ? Math.round((S.won / S.played) * 100) : 0}</b><span>win %</span></div>
        <div><b>${S.streak}</b><span>streak</span></div>
        <div><b>${S.maxStreak}</b><span>best</span></div>
      </div>
      <h3>DAILY</h3>
      <div class="stat-grid">
        <div><b>${currentDailyStreak()}</b><span>day streak</span></div>
        <div><b>${P.daily.best}</b><span>best run</span></div>
        <div><b>${L.lvl}</b><span>level</span></div>
        <div><b>${P.xp}</b><span>total xp</span></div>
      </div>
      <h3>GUESS SPREAD</h3>
      ${distHtml(0)}`);
    // backup button sits right under the title so it's visible without scrolling
    $("#modal-body h2").insertAdjacentHTML("afterend", `<button class="btn alt" id="s-backup" style="margin:0 0 6px">BACKUP / RESTORE</button>`);
    $("#s-backup").onclick = () => { SFX.click(); showBackup(); };
  }

  // ---------- backup / restore ----------
  const BACKUP_TAG = "NEONWORD1:";
  function makeBackup() {
    const bytes = new TextEncoder().encode(JSON.stringify(P));
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return BACKUP_TAG + btoa(bin);
  }
  function readBackup(code) {
    code = (code || "").trim().replace(/\s+/g, "");
    if (!code.startsWith(BACKUP_TAG)) throw new Error("not a NEONWORD backup");
    const bin = atob(code.slice(BACKUP_TAG.length));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (typeof data !== "object" || typeof data.xp !== "number" || !data.stats) throw new Error("backup looks broken");
    return data;
  }

  function showBackup() {
    const L = levelInfo(P.xp);
    openModal(`
      <h2>BACKUP</h2>
      <p>Save your progress (level ${L.lvl}, ◈${P.credits}, ${P.history.length} logged codes) as a backup code or file. Keep it somewhere safe, like your notes app or email.</p>
      <div class="btn-row">
        <button class="btn" id="b-copy">COPY CODE</button>
        <button class="btn alt" id="b-file">SAVE FILE</button>
      </div>
      <h3>RESTORE</h3>
      <p>Paste a backup code, or load a backup file. This replaces the progress on this device.</p>
      <textarea id="b-in" class="backup-box" rows="4" placeholder="NEONWORD1:..." spellcheck="false"></textarea>
      <div class="btn-row">
        <button class="btn" id="b-restore">RESTORE CODE</button>
        <button class="btn alt" id="b-load">LOAD FILE</button>
      </div>
      <input type="file" id="b-pick" accept=".txt,text/plain" hidden />`);

    $("#b-copy").onclick = async () => {
      const code = makeBackup();
      try { await navigator.clipboard.writeText(code); toast("BACKUP CODE COPIED"); SFX.coin(); }
      catch { $("#b-in").value = code; $("#b-in").select(); toast("COPY THE CODE IN THE BOX"); }
    };
    $("#b-file").onclick = () => {
      const blob = new Blob([makeBackup()], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neonword-backup-${dateKey()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("BACKUP FILE SAVED");
      SFX.coin();
    };
    const restore = (code) => {
      let data;
      try { data = readBackup(code); }
      catch (e) { SFX.error(); toast(String(e.message || e).toUpperCase()); return; }
      const lvl = levelInfo(data.xp).lvl;
      if (!confirm(`Restore backup? Level ${lvl}, ${data.history ? data.history.length : 0} logged codes.\nThis replaces the progress on this device.`)) return;
      P = Object.assign(defaults(), data);
      save();
      toast("PROGRESS RESTORED", true);
      setTimeout(() => location.reload(), 700);
    };
    $("#b-restore").onclick = () => restore($("#b-in").value);
    $("#b-load").onclick = () => $("#b-pick").click();
    $("#b-pick").onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) restore(await f.text());
    };
  }

  function showThemes() {
    const lvl = levelInfo(P.xp).lvl;
    openModal(`
      <h2>THEMES</h2>
      <p style="color:var(--dim)">Level up to unlock new palettes.</p>
      <div class="theme-grid">
        ${THEMES.map((t) => `
          <button class="theme-card ${P.theme === t.id ? "on" : ""}" data-theme-id="${t.id}" ${lvl < t.lvl ? "disabled" : ""}>
            <div class="swatches">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</div>
            <span class="theme-name">${t.name}</span>
            <span class="theme-lock">${lvl < t.lvl ? `🔒 LV ${t.lvl}` : P.theme === t.id ? "ACTIVE" : "TAP TO EQUIP"}</span>
          </button>`).join("")}
      </div>`);
    $$(".theme-card").forEach((b) => (b.onclick = () => {
      P.theme = b.dataset.themeId;
      save();
      document.body.dataset.theme = P.theme;
      document.querySelector('meta[name="theme-color"]').content = getVar("--bg");
      BG.rebuild();
      SFX.coin();
      showThemes();
    }));
  }

  function showHelp() {
    const ex = (w, cls) => `<div class="ex-row">${w.split("").map((c, i) => `<div class="tile ${cls[i] || ""}">${c}</div>`).join("")}</div>`;
    openModal(`
      <h2>HOW TO HACK</h2>
      <p>Crack the hidden code word. 6 attempts (7 for 7-letter codes). Each guess must be a real word.</p>
      ${ex("NEONS", ["hit"])}
      <p><b style="color:var(--hit)">N</b> is in the code, in the right slot.</p>
      ${ex("PIXEL", ["", "", "near"])}
      <p><b style="color:var(--near)">X</b> is in the code, wrong slot.</p>
      ${ex("GHOST", ["", "", "", "miss"])}
      <p><b style="color:var(--dim)">S</b> is not in the code.</p>
      <h3>HINTS · cost ◈ credits</h3>
      <p><kbd>BURN</kbd> ◈1 — kill 3 letters not in the code.</p>
      <p><kbd>SCAN</kbd> ◈1 — pick a letter, learn how many times it appears.</p>
      <p><kbd>REVEAL</kbd> ◈2 — lock one correct letter into place.</p>
      <p><kbd>CLUE</kbd> ◈2 — a short definition of the word.</p>
      <h3>REWARDS</h3>
      <p>Win to earn XP and ◈. Fewer guesses = more XP. Hints cut XP a little. Daily codes pay 1.5× XP, +◈1, and every 7-day streak pays ◈5. Level up to unlock themes.</p>
      <div class="btn-row"><button class="btn" id="h-go">JACK IN</button></div>
      <p style="color:var(--dim);font-size:15px;margin-top:14px">build ${APP_VERSION}</p>`);
    $("#h-go").onclick = closeModal;
    P.seenHelp = true;
    save();
  }

  // ---------- wiring ----------
  $("#keyboard").addEventListener("click", (e) => {
    const k = e.target.closest(".key");
    if (k) press(k.dataset.k);
  });
  $$(".hint-btn").forEach((b) => b.addEventListener("click", () => useHint(b.dataset.hint)));
  $$(".mode-btn").forEach((b) => b.addEventListener("click", () => {
    SFX.init(); SFX.click();
    if (busy) return;
    startMode(b.dataset.mode, P.len);
  }));
  $$(".len-btn").forEach((b) => b.addEventListener("click", () => {
    SFX.init(); SFX.click();
    if (busy) return;
    startMode("endless", +b.dataset.len);
  }));
  $("#btn-help").onclick = () => { SFX.init(); SFX.click(); showHelp(); };
  $("#btn-stats").onclick = () => { SFX.init(); SFX.click(); showStats(); };
  $("#btn-history").onclick = () => { SFX.init(); SFX.click(); showHistory(P.mode === "endless" ? String(P.len) : "daily"); };
  $("#btn-themes").onclick = () => { SFX.init(); SFX.click(); showThemes(); };
  // ♪ opens NEON RADIO (music player + sound effects switch)
  function showRadio() {
    openModal(`
      <h2>NEON RADIO</h2>
      <div id="radio-root"></div>
      <h3>SOUND FX</h3>
      <div class="btn-row" style="margin-top:0"><button class="btn ${P.sound ? "" : "alt"}" id="r-sfx" style="margin-top:0">SFX: ${P.sound ? "ON" : "OFF"}</button></div>`);
    Radio.mount($("#radio-root"));
    $("#r-sfx").onclick = () => {
      P.sound = !P.sound;
      SFX.enabled = P.sound;
      save();
      SFX.click();
      $("#r-sfx").textContent = `SFX: ${P.sound ? "ON" : "OFF"}`;
      $("#r-sfx").classList.toggle("alt", !P.sound);
    };
  }
  $("#btn-sound").onclick = () => { SFX.init(); SFX.click(); showRadio(); };
  Radio.onChange(({ playing }) => $("#btn-sound").classList.toggle("playing", playing));
  // drop focus after clicks so Enter on the keyboard never re-clicks a button
  document.addEventListener("click", (e) => e.target.closest("button")?.blur());
  $("#modal-x").onclick = closeModal;
  $("#modal-back").addEventListener("click", (e) => { if (e.target.id === "modal-back") closeModal(); });

  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      if (!$("#modal-back").hidden) return closeModal();
      return press("ESC");
    }
    if (!$("#modal-back").hidden) return;
    let k = null;
    if (e.key === "Enter") k = "ENTER";
    else if (e.key === "Backspace") k = "DEL";
    else if (/^[a-z]$/i.test(e.key)) k = e.key.toUpperCase();
    if (!k) return;
    e.preventDefault();
    flashKey(k);
    press(k);
  });

  // ---------- immersive fullscreen (phones) ----------
  // Installed app: manifest "fullscreen" hides the status bar.
  // In a browser tab: ask for fullscreen on the first tap (browsers only allow it after a tap).
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fsReq = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
  // No automatic fullscreen: the browser always shows its own "swipe to exit" pop-up
  // for that. The installed home-screen app is fullscreen through the manifest, with no
  // pop-up. The button stays as an opt-in for browser tabs only.
  function enterFullscreen() {
    if (!fsReq || fsEl()) return;
    try {
      const p = fsReq.call(document.documentElement, { navigationUI: "hide" });
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }

  const fsBtn = $("#btn-full");
  const installed = matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches;
  if (fsReq && !installed) fsBtn.hidden = false;
  fsBtn.onclick = () => {
    SFX.init(); SFX.click();
    if (fsEl()) fsExit && fsExit.call(document);
    else enterFullscreen();
  };

  // Ask the browser not to auto-clear this site's saved data when storage runs low.
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

  // ---------- boot ----------
  startMode(P.mode, P.len);
  document.querySelector('meta[name="theme-color"]').content = getVar("--bg");
  if (!P.seenHelp) setTimeout(showHelp, 400);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {});
    // A new version took over: reload once so the player sees it straight away.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded || busy) return;
      reloaded = true;
      location.reload();
    });
  }
})();
