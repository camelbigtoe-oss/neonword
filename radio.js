// NEON RADIO — plays the player's own audio files.
// Files are stored only on this device (IndexedDB). Nothing is uploaded.
const Radio = (() => {
  const DB_NAME = "neonword-radio";
  const SET_KEY = "neonword.radio.v1";
  const audio = new Audio();
  audio.preload = "auto";

  let db = null;
  let tracks = []; // [{id, name, size}]
  let curId = null;
  let curUrl = null;
  let ctx = null, analyser = null, gain = null;
  let ui = null; // mounted DOM root
  let raf = 0;
  const listeners = new Set();

  let S = { vol: 0.6, shuffle: false, loop: "all", cur: null, pos: {}, wasPlaying: false };
  try { S = Object.assign(S, JSON.parse(localStorage.getItem(SET_KEY)) || {}); } catch {}
  const saveS = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(S)); } catch {} };

  // ---------- storage ----------
  function openDb() {
    if (db) return Promise.resolve(db);
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("meta", { keyPath: "id" });
        r.result.createObjectStore("blobs");
      };
      r.onsuccess = () => { db = r.result; res(db); };
      r.onerror = () => rej(r.error);
    });
  }
  function tx(store, mode, fn) {
    return openDb().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const out = fn(t);
      t.oncomplete = () => res(out && "result" in out ? out.result : out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }

  async function init() {
    try {
      tracks = (await tx(["meta"], "readonly", (t) => t.objectStore("meta").getAll())) || [];
      tracks.sort((a, b) => a.added - b.added);
      if (S.cur && tracks.some((t) => t.id === S.cur)) await load(S.cur, false);
      else if (tracks.length) await load(tracks[0].id, false);
    } catch (e) { console.warn("radio init", e); }
    emit();
  }

  async function addFiles(files) {
    const added = [];
    for (const f of files) {
      if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name)) continue;
      const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const meta = { id, name: f.name.replace(/\.[^.]+$/, ""), size: f.size, added: Date.now() };
      await tx(["meta", "blobs"], "readwrite", (t) => {
        t.objectStore("meta").put(meta);
        t.objectStore("blobs").put(f, id);
      });
      tracks.push(meta);
      added.push(meta);
    }
    if (added.length && !curId) await load(added[0].id, false);
    emit();
    return added.length;
  }

  async function remove(id) {
    await tx(["meta", "blobs"], "readwrite", (t) => {
      t.objectStore("meta").delete(id);
      t.objectStore("blobs").delete(id);
    });
    tracks = tracks.filter((t) => t.id !== id);
    delete S.pos[id];
    if (curId === id) {
      audio.pause();
      audio.removeAttribute("src");
      if (curUrl) URL.revokeObjectURL(curUrl);
      curId = curUrl = null;
      S.cur = null;
      if (tracks.length) await load(tracks[0].id, false);
    }
    saveS();
    emit();
  }

  // ---------- playback ----------
  function graph() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    gain = ctx.createGain();
    gain.gain.value = S.vol;
    src.connect(analyser).connect(gain).connect(ctx.destination);
  }

  async function load(id, autoplay) {
    const blob = await tx(["blobs"], "readonly", (t) => t.objectStore("blobs").get(id));
    if (!blob) return;
    if (curUrl) URL.revokeObjectURL(curUrl);
    curUrl = URL.createObjectURL(blob);
    curId = id;
    S.cur = id;
    saveS();
    audio.src = curUrl;
    const resumeAt = S.pos[id] || 0;
    audio.addEventListener("loadedmetadata", () => {
      if (resumeAt > 0 && resumeAt < audio.duration - 5) audio.currentTime = resumeAt;
      emit();
    }, { once: true });
    setMediaSession();
    if (autoplay) await play();
    emit();
  }

  async function play() {
    if (!curId) { if (tracks.length) return load(tracks[0].id, true); return; }
    graph();
    try { if (ctx && ctx.state !== "running") await ctx.resume(); } catch {}
    try { await audio.play(); S.wasPlaying = true; saveS(); } catch (e) { console.warn("radio play", e); }
    emit();
  }
  function pause() { audio.pause(); S.wasPlaying = false; savePos(); emit(); }
  function toggle() { return audio.paused ? play() : pause(); }

  function next(auto = false) {
    if (!tracks.length) return;
    if (auto && S.loop === "one") { audio.currentTime = 0; return play(); }
    let i = tracks.findIndex((t) => t.id === curId);
    if (S.shuffle && tracks.length > 1) {
      let j; do { j = Math.floor(Math.random() * tracks.length); } while (j === i);
      i = j;
    } else i = (i + 1) % tracks.length;
    if (auto && S.loop === "off" && i === 0 && !S.shuffle) { pause(); return; }
    S.pos[tracks[i].id] = 0;
    return load(tracks[i].id, true);
  }
  function prev() {
    if (!tracks.length) return;
    if (audio.currentTime > 5 || tracks.length === 1) { audio.currentTime = 0; return; }
    let i = tracks.findIndex((t) => t.id === curId);
    i = (i - 1 + tracks.length) % tracks.length;
    S.pos[tracks[i].id] = 0;
    return load(tracks[i].id, !audio.paused);
  }
  function setVol(v) { S.vol = v; if (gain) gain.gain.value = v; else audio.volume = v; saveS(); }
  function savePos() { if (curId && isFinite(audio.currentTime)) { S.pos[curId] = Math.floor(audio.currentTime); saveS(); } }

  let lastSave = 0;
  audio.addEventListener("timeupdate", () => {
    if (Date.now() - lastSave > 4000) { lastSave = Date.now(); savePos(); }
    paintTime();
  });
  audio.addEventListener("ended", () => { if (curId) S.pos[curId] = 0; next(true); });
  audio.addEventListener("play", emit);
  audio.addEventListener("pause", emit);
  audio.volume = 1;

  function setMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const t = tracks.find((x) => x.id === curId);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t ? t.name : "NEON RADIO", artist: "NEON RADIO", album: "NEONWORD",
        artwork: [{ src: "icon-512.png", sizes: "512x512", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", prev);
    } catch {}
  }

  // ---------- UI ----------
  const fmt = (s) => {
    if (!isFinite(s)) return "--:--";
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m).padStart(2, "0")) + `:${String(x).padStart(2, "0")}`;
  };
  const mb = (b) => `${(b / 1048576).toFixed(1)}MB`;

  // tiny pixel icons drawn as SVG so phones never swap them for emoji
  const ICON = {
    play: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M2 1h1v6H2zM3 2h1v4H3zM4 3h1v2H4z"/><path fill="currentColor" d="M2 1h1v1H2z"/></svg>`,
    pause: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M2 1h1.5v6H2zM4.5 1H6v6H4.5z"/></svg>`,
    next: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M1 1h1v6H1zM2 2h1v4H2zM3 3h1v2H3zM5 1h1v6H5z"/></svg>`,
    prev: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M2 1h1v6H2zM6 1h1v6H6zM5 2h1v4H5zM4 3h1v2H4z"/></svg>`,
    shuf: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M0 2h2v1H0zM2 3h1v1H2zM3 4h1v1H3zM4 5h2v1H4zM6 4h1v3H6zM7 5h1v1H7zM0 5h2v1H0zM2 4h1v1H2zM4 2h2v1H4zM6 1h1v3H6zM7 2h1v1H7z"/></svg>`,
    loop: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M1 2h5v1H1zM1 3h1v2H1zM6 3h1v2H6zM2 5h5v1H2zM5 1h1v1H5zM2 6h1v1H2z"/></svg>`,
    x: `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="currentColor" d="M1 1h1v1H1zM2 2h1v1H2zM3 3h2v2H3zM5 2h1v1H5zM6 1h1v1H6zM2 5h1v1H2zM1 6h1v1H1zM5 5h1v1H5zM6 6h1v1H6z"/></svg>`,
  };

  function mount(root) {
    ui = root;
    root.innerHTML = `
      <div class="radio-deck">
        <div class="radio-screen">
          <canvas class="radio-viz" width="64" height="20"></canvas>
          <div class="radio-lcd">
            <div class="radio-marquee"><span class="r-title"></span></div>
            <div class="r-row"><span class="r-state"></span><span class="r-time">--:-- / --:--</span></div>
          </div>
        </div>
        <input type="range" class="px-range r-seek" min="0" max="1000" value="0" aria-label="Seek" />
        <div class="radio-ctrls">
          <button class="r-btn r-shuf" aria-label="Shuffle">${ICON.shuf}</button>
          <button class="r-btn r-prev" aria-label="Previous">${ICON.prev}</button>
          <button class="r-btn r-play big" aria-label="Play or pause">${ICON.play}</button>
          <button class="r-btn r-next" aria-label="Next">${ICON.next}</button>
          <button class="r-btn r-loop" aria-label="Repeat">${ICON.loop}<i class="r-loop-tag"></i></button>
        </div>
        <label class="r-vol"><span>VOL</span><input type="range" class="px-range r-volume" min="0" max="100" aria-label="Volume" /></label>
      </div>
      <h3>TAPES</h3>
      <div class="r-list"></div>
      <div class="btn-row"><button class="btn r-add">+ ADD MUSIC</button></div>
      <p class="r-note">Pick MP3s from your phone. They're kept on this device only and never uploaded. Long mixes resume where you left off.</p>
      <input type="file" class="r-file" accept="audio/*,.mp3" multiple hidden />`;

    const $ = (s) => root.querySelector(s);
    $(".r-play").onclick = toggle;
    $(".r-next").onclick = () => next();
    $(".r-prev").onclick = prev;
    $(".r-shuf").onclick = () => { S.shuffle = !S.shuffle; saveS(); paint(); };
    $(".r-loop").onclick = () => { S.loop = S.loop === "all" ? "one" : S.loop === "one" ? "off" : "all"; saveS(); paint(); };
    $(".r-volume").value = Math.round(S.vol * 100);
    $(".r-volume").oninput = (e) => setVol(e.target.value / 100);
    const seek = $(".r-seek");
    seek.oninput = () => { if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration; };
    $(".r-add").onclick = () => $(".r-file").click();
    $(".r-file").onchange = async (e) => {
      const btn = $(".r-add");
      btn.textContent = "LOADING…";
      try {
        const n = await addFiles([...e.target.files]);
        if (!n) alert("No audio files found in that selection.");
        else if (audio.paused) play();
      } catch (err) {
        alert("Couldn't save that file. Your phone may be low on storage.");
      }
      e.target.value = "";
      if (ui === root) btn.textContent = "+ ADD MUSIC";
    };
    paint();
    loop();
  }

  function unmount() { ui = null; cancelAnimationFrame(raf); }

  function paint() {
    if (!ui) return;
    const $ = (s) => ui.querySelector(s);
    const t = tracks.find((x) => x.id === curId);
    $(".r-title").textContent = t ? t.name : "NO TAPE LOADED — ADD MUSIC BELOW";
    $(".radio-marquee").classList.toggle("run", (t ? t.name.length : 30) > 22);
    $(".r-state").textContent = !t ? "IDLE" : audio.paused ? "PAUSED" : "ON AIR";
    $(".r-state").classList.toggle("live", !!t && !audio.paused);
    $(".r-play").innerHTML = audio.paused ? ICON.play : ICON.pause;
    $(".r-shuf").classList.toggle("on", S.shuffle);
    $(".r-loop").classList.toggle("on", S.loop !== "off");
    $(".r-loop-tag").textContent = S.loop === "one" ? "1" : "";
    $(".r-list").innerHTML = tracks.length
      ? tracks.map((x) => `
        <div class="r-track ${x.id === curId ? "cur" : ""}" data-id="${x.id}">
          <button class="r-pick"><span class="r-eq"><i></i><i></i><i></i></span><span class="r-name"></span><span class="r-size">${mb(x.size)}</span></button>
          <button class="r-del" aria-label="Remove">${ICON.x}</button>
        </div>`).join("")
      : `<p class="r-note">No tapes yet.</p>`;
    ui.querySelectorAll(".r-track").forEach((row) => {
      const tr = tracks.find((x) => x.id === row.dataset.id);
      row.querySelector(".r-name").textContent = tr.name;
      row.querySelector(".r-pick").onclick = () => (tr.id === curId ? toggle() : load(tr.id, true));
      row.querySelector(".r-del").onclick = () => {
        if (confirm(`Remove "${tr.name}" from this device?`)) remove(tr.id);
      };
    });
    paintTime();
  }

  function paintTime() {
    if (!ui) return;
    const d = audio.duration, c = audio.currentTime;
    ui.querySelector(".r-time").textContent = `${fmt(c)} / ${fmt(d)}`;
    const seek = ui.querySelector(".r-seek");
    if (document.activeElement !== seek && isFinite(d) && d > 0) seek.value = Math.round((c / d) * 1000);
  }

  function loop() {
    cancelAnimationFrame(raf);
    const cv = ui && ui.querySelector(".radio-viz");
    if (!cv) return;
    const g = cv.getContext("2d");
    const cs = getComputedStyle(document.body);
    const c1 = cs.getPropertyValue("--c1").trim(), c2 = cs.getPropertyValue("--c2").trim(), near = cs.getPropertyValue("--near").trim();
    const data = new Uint8Array(32);
    let t = 0;
    const draw = () => {
      t++;
      g.clearRect(0, 0, 64, 20);
      const bars = 16;
      if (analyser && !audio.paused) analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        const v = analyser && !audio.paused ? data[Math.min(31, Math.floor(i * 1.6) + 1)] / 255 : 0.08 + 0.05 * Math.sin(t / 20 + i);
        const h = Math.max(1, Math.round(v * 18));
        for (let y = 0; y < h; y++) {
          g.fillStyle = y > 14 ? near : y > 8 ? c1 : c2;
          g.fillRect(i * 4, 19 - y, 3, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
  }

  function emit() {
    setMediaSession();
    paint();
    listeners.forEach((f) => f({ playing: !audio.paused, hasTracks: tracks.length > 0 }));
  }

  // Resume music on the first tap after opening the app, if it was playing last time.
  function armAutoResume() {
    if (!S.wasPlaying) return;
    const go = () => {
      document.removeEventListener("pointerdown", go, true);
      document.removeEventListener("keydown", go, true);
      if (audio.paused && curId) play();
    };
    document.addEventListener("pointerdown", go, true);
    document.addEventListener("keydown", go, true);
  }

  // keep resume points when the app is closed or hidden
  document.addEventListener("visibilitychange", () => { if (document.hidden) savePos(); });
  addEventListener("pagehide", savePos);

  init().then(armAutoResume);

  return {
    mount, unmount, play, pause, toggle,
    onChange: (f) => { listeners.add(f); f({ playing: !audio.paused, hasTracks: tracks.length > 0 }); },
  };
})();
