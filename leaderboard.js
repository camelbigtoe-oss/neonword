// Online leaderboard, stored in a free Supabase table (see README for the one-time setup).
// Each device gets a random player id and a name; its levels and today's daily results are
// uploaded after games and whenever the menu or leaderboard opens. Anyone with the app can
// read and write rows, so this is for friends, not strangers.
const Board = (() => {
  "use strict";
  // Fill these in from Supabase: Project Settings > API. The anon key is meant to be public.
  const SUPABASE_URL = "https://qqqkjvtqycwogrwpmbat.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcWtqdnRxeWN3b2dyd3BtYmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNDUyMjIsImV4cCI6MjExMDYyMTIyMn0.E8K1X_v-fz2MxzvfrMVZPCoDgFG_1vJWRqqVF22K654";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ready = () => !!(SUPABASE_URL && SUPABASE_KEY);
  let NW = null, timer = null, tab = "today";

  const headers = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function me() {
    const P = NW.P;
    if (!P.player) P.player = { id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2), name: "" };
    return P.player;
  }

  // what this device shares: levels and today's daily results, nothing else
  function snapshot() {
    const P = NW.P, today = NW.dateKey();
    const lv = (g) => ({ lvl: NW.levelInfo(P.lv[g]).lvl, xp: P.lv[g] });
    const w = P.games && P.games.daily, l = P.links && P.links.games && P.links.games.daily, t = P.trace && P.trace.games && P.trace.games.daily;
    return {
      lv: { word: lv("word"), links: lv("links"), trace: lv("trace"), rare: lv("rare"), scale: lv("scale") },
      day: today,
      daily: {
        word: w && w.date === today && w.status !== "play" ? { won: w.status === "won", n: w.guesses.length, rows: w.rows } : null,
        links: l && l.date === today && l.status !== "play" ? { won: l.status === "won", m: l.mistakes } : null,
        trace: t && t.date === today && t.status === "won" ? { won: true, h: t.hints } : null,
        rare: Rare.todayResult(P),
        scale: Scale.todayResult(P),
      },
    };
  }

  async function push() {
    const p = me();
    if (!ready() || !p.name) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=id`, {
        method: "POST",
        headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: p.id, name: p.name, data: snapshot(), updated_at: new Date().toISOString() }),
      });
    } catch {}
  }
  // games call this after rewards; batch quick bursts into one upload
  function sync() { clearTimeout(timer); timer = setTimeout(push, 800); }

  async function fetchRows() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=id,name,data,updated_at&order=updated_at.desc&limit=200`, { headers: headers() });
    if (!r.ok) throw new Error(`leaderboard ${r.status}`);
    return r.json();
  }

  // ---------- screen ----------
  function open() {
    if (!ready()) {
      NW.openModal(`<h2>LEADERBOARD</h2><p>The online leaderboard isn't switched on yet.</p><p style="color:var(--dim)">It needs a free Supabase project. The setup steps are in the README.</p>`);
      return;
    }
    if (!me().name) return askName();
    show();
  }

  function askName(again) {
    NW.openModal(`
      <h2>${again ? "CHANGE NAME" : "PICK A NAME"}</h2>
      <p>This is how you show up on the leaderboard for everyone playing.</p>
      <input id="b-name" class="backup-box b-name" maxlength="12" placeholder="YOUR NAME" value="${esc(me().name || "")}" autocomplete="off" spellcheck="false" />
      <div class="btn-row"><button class="btn" id="b-save">SAVE</button></div>`);
    const inp = $("#b-name");
    setTimeout(() => inp.focus(), 50);
    const go = () => {
      const name = inp.value.trim().replace(/\s+/g, " ").slice(0, 12);
      if (!name) { NW.toast("TYPE A NAME"); return; }
      me().name = name;
      NW.save();
      NW.SFX.coin();
      push().then(show);
    };
    $("#b-save").onclick = go;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); e.stopPropagation(); });
  }

  async function show() {
    const tabs = [["today", "TODAY"], ["word", "WORD"], ["links", "LINK"], ["trace", "TRACE"], ["rare", "RARE"], ["scale", "SCALE"]];
    NW.openModal(`
      <h2>LEADERBOARD</h2>
      <div class="hist-tabs">${tabs.map(([k, n]) => `<button class="len-btn ${k === tab ? "on" : ""}" data-bt="${k}">${n}</button>`).join("")}</div>
      <div id="b-list" class="b-list"><p style="color:var(--dim)">loading…</p></div>
      <div class="btn-row">
        <button class="btn alt" id="b-rename">CHANGE NAME</button>
      </div>`);
    $$("[data-bt]").forEach((b) => (b.onclick = () => { NW.SFX.click(); tab = b.dataset.bt; show(); }));
    $("#b-rename").onclick = () => askName(true);
    await push();
    let rows;
    try { rows = await fetchRows(); }
    catch { const el = $("#b-list"); if (el) el.innerHTML = `<p style="color:var(--burn)">Couldn't reach the leaderboard. Check your connection.</p>`; return; }
    const el = $("#b-list");
    if (el) el.innerHTML = tab === "today" ? todayHtml(rows) : levelHtml(rows, tab);
  }

  function levelHtml(rows, g) {
    const list = rows.filter((r) => r.data && r.data.lv && r.data.lv[g]).sort((a, b) => b.data.lv[g].xp - a.data.lv[g].xp);
    if (!list.length) return `<p style="color:var(--dim)">No one yet.</p>`;
    return list.map((r, i) => `
      <div class="b-row ${r.id === me().id ? "me" : ""}">
        <span class="b-rank">${i + 1}</span>
        <span class="b-name-cell">${esc(r.name)}</span>
        <span class="b-lv">LV ${r.data.lv[g].lvl}</span>
        <span class="b-xp">${r.data.lv[g].xp} xp</span>
      </div>`).join("");
  }

  function todayHtml(rows) {
    const today = NW.dateKey();
    const cell = (d, g) => {
      if (!d) return `<span class="b-res none">–</span>`;
      if (g === "word") return d.won ? `<span class="b-res ok">${d.n}/${d.rows}</span>` : `<span class="b-res bad">X</span>`;
      if (g === "links") return d.won ? `<span class="b-res ok">${d.m}✕</span>` : `<span class="b-res bad">X</span>`;
      if (g === "rare" || g === "scale") return `<span class="b-res ok">${d.s}</span>`;
      return `<span class="b-res ok">${d.h ? `${d.h}💡` : "✓"}</span>`;
    };
    // more dailies done first, then fewer guesses / mistakes / hints
    const score = (r) => {
      const d = r.data.day === today ? r.data.daily : {};
      let s = 0;
      if (d.word) s += d.word.won ? 100 - d.word.n * 10 : 5;
      if (d.links) s += d.links.won ? 100 - d.links.m * 10 : 5;
      if (d.trace) s += 100 - d.trace.h * 10;
      // 700-point games count up to 100, like the others
      if (d.rare) s += Math.round(d.rare.s / 7);
      if (d.scale) s += Math.round(d.scale.s / 7);
      return s;
    };
    const list = rows.filter((r) => r.data).sort((a, b) => score(b) - score(a));
    if (!list.length) return `<p style="color:var(--dim)">No one yet.</p>`;
    return `<div class="b-row b-head"><span class="b-rank"></span><span class="b-name-cell">PLAYER</span><span class="b-res">WORD</span><span class="b-res">LINK</span><span class="b-res">TRACE</span><span class="b-res">RARE</span><span class="b-res">SCALE</span></div>` +
      list.map((r, i) => {
        const d = r.data.day === today ? r.data.daily : {};
        return `<div class="b-row ${r.id === me().id ? "me" : ""}"><span class="b-rank">${i + 1}</span><span class="b-name-cell">${esc(r.name)}</span>${cell(d.word, "word")}${cell(d.links, "links")}${cell(d.trace, "trace")}${cell(d.rare, "rare")}${cell(d.scale, "scale")}</div>`;
      }).join("");
  }

  return { setApi: (api) => (NW = api), open, sync, ready };
})();
