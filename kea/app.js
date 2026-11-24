// KEA — personal news. Everything you teach it stays on this device (localStorage).

// ------------------------------------------------------------------ config
const TOPICS = {
  foryou: { label: 'For You', emoji: '✨' },
  nz: { label: 'NZ', emoji: '🇳🇿', color: '#3d7bd9' },
  local: { label: 'Christchurch', emoji: '🏙️', color: '#2e9e8f' },
  world: { label: 'World', emoji: '🌏', color: '#5a6bd6' },
  sport: { label: 'Sport', emoji: '🏅', color: '#2f9e44' },
  league: { label: 'League', emoji: '🏉', color: '#c2410c' },
  strength: { label: 'Strength', emoji: '💪', color: '#d9480f' },
  tech: { label: 'Tech', emoji: '💡', color: '#0b7285' },
  gaming: { label: 'Gaming', emoji: '🎮', color: '#7048e8' },
  science: { label: 'Science & Space', emoji: '🔭', color: '#1c7ed6' },
  entertainment: { label: 'Entertainment', emoji: '🎬', color: '#c2255c' },
  business: { label: 'Business', emoji: '📈', color: '#5c940d' },
};
const FOLLOW_SUGGESTIONS = ['Strongman', 'Armwrestling', 'Powerlifting', 'Warriors', 'Kiwis', 'NRL', 'Tall Blacks', 'Basketball',
  'All Blacks', 'Cricket', 'Combat sports', 'Motorsport', 'Breaking', 'Christchurch', 'Space', 'Rocket Lab', 'AI', 'Phones',
  'Cybersecurity', 'Nintendo', 'PlayStation', 'Xbox', 'PC gaming', 'Movies', 'TV & streaming', 'Music', 'Climate', 'Health',
  'Economy', 'Housing', 'Politics'];
const DEFAULT_FOLLOW = ['Strongman', 'Armwrestling', 'Warriors', 'Kiwis', 'NRL', 'Tall Blacks', 'Christchurch', 'Rocket Lab'];
const DEFAULT_TOPICS = ['nz', 'local', 'world', 'sport', 'league', 'strength', 'tech', 'gaming', 'science', 'entertainment', 'business'];
const LIKED_TOPICS = ['sport', 'league', 'strength', 'tech', 'gaming', 'science', 'entertainment'];
const TIER_INFO = {
  A: ['Public broadcaster / agency / official', 'Highest reliability: public-service or wire newsroom, or the official body for the sport.'],
  B: ['Established outlet', 'Major newsroom with editors and a corrections policy.'],
  S: ['Specialist outlet', 'Focused on one subject; good depth, lighter on hard news.'],
};
const CITY = { name: 'Christchurch', lat: -43.53, lon: 172.63 };
const HOUR = 3600e3;
const KEY = 'kea.v1';

// ------------------------------------------------------------------ state
const blank = () => ({
  onboarded: false,
  prefs: { topics: [...DEFAULT_TOPICS], follow: [...DEFAULT_FOLLOW], muteWords: [], muteSources: [], theme: 'auto', fs: 1 },
  model: { topic: {}, tag: {}, source: {}, word: {}, decayed: Date.now() },
  opened: {}, hidden: {}, votes: {}, saved: [], folders: ['Read later'], myEvents: [], lastVisit: 0, lastSeenGenerated: '',
});
let S = load();
function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); }
}
let saveTimer;
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(S)), 120); }

let FEED = { generated: '', stories: [] };
let EVENTS = { events: [] };
let route = { view: 'feed', topic: 'foryou', savedFolder: 'all', evFilter: 'all' };
let feedLimit = 30;
let prevVisit = S.lastVisit;

// ------------------------------------------------------------------ utils
const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ago = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
};
const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (name) => `<span class="avatar" style="background:hsl(${hue(name)} 55% 42%)">${esc(name.replace(/^The /, '')[0] || '?')}</span>`;
const tokens = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3);
const tzFmt = (opts) => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', ...opts });
const ICON = {
  up: '<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8c1.7 0 2.6 1.2 2.3 2.8L12.7 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M17 13V4h3v9zM17 13l-4 8c-1.7 0-2.6-1.2-2.3-2.8l.6-4.2H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
};

// ------------------------------------------------------------------ learning
// Each reaction nudges weights for the story's topic, tags, outlet and headline
// words. Weights slowly fade (3%/day) so the feed follows changing tastes.
const SIGNAL = { open: 1, click: 0.6, save: 2, up: 3, down: -3, hide: -1.5, unsave: -0.5 };
function learn(story, kind) {
  const a = SIGNAL[kind];
  const m = S.model;
  const bump = (obj, k, v) => { obj[k] = clamp((obj[k] || 0) + v, -10, 10); };
  bump(m.topic, story.topic, a);
  for (const t of story.tags || []) bump(m.tag, t, a * 0.8);
  bump(m.source, story.source, a * 0.35);
  for (const w of (story.words || tokens(story.title)).slice(0, 10)) bump(m.word, w, a * 0.15);
  persist();
}
function decayModel() {
  const days = (Date.now() - (S.model.decayed || Date.now())) / (24 * HOUR);
  if (days < 1) return;
  const f = Math.pow(0.97, days);
  for (const k of ['topic', 'tag', 'source', 'word']) {
    for (const [n, v] of Object.entries(S.model[k])) {
      const nv = v * f;
      if (Math.abs(nv) < 0.05) delete S.model[k][n]; else S.model[k][n] = nv;
    }
  }
  S.model.decayed = Date.now();
  persist();
}

function isFollowed(story) {
  const f = S.prefs.follow.map((x) => x.toLowerCase());
  const hay = (story.title + ' ' + (story.tags || []).join(' ')).toLowerCase();
  return S.prefs.follow.filter((x, i) => (story.tags || []).includes(x) || hay.includes(f[i]));
}
function isMuted(story) {
  if (S.prefs.muteSources.includes(story.source)) return true;
  if (!S.prefs.topics.includes(story.topic)) return true;
  const t = (story.title + ' ' + story.summary).toLowerCase();
  return S.prefs.muteWords.some((w) => w && t.includes(w.toLowerCase()));
}

function scoreParts(s) {
  const m = S.model;
  const ageH = (Date.now() - s.ts) / HOUR;
  const parts = {
    fresh: 3.2 * Math.exp(-ageH / 14),
    topic: (m.topic[s.topic] || 0) * 0.35,
    tags: (s.tags || []).reduce((a, t) => a + (m.tag[t] || 0), 0) * 0.3,
    source: (m.source[s.source] || 0) * 0.25,
    words: (s.words || []).reduce((a, w) => a + (m.word[w] || 0), 0) * 0.12,
    follow: isFollowed(s).length ? 2.2 : 0,
    coverage: 0.45 * Math.log2(1 + (s.coverage?.length || 0)),
    tier: s.tier === 'A' ? 0.35 : s.tier === 'B' ? 0.2 : 0,
    read: S.opened[s.id] ? -2 : 0,
    vote: (S.votes[s.id] || 0) * 1.5,
  };
  parts.total = Object.values(parts).reduce((a, b) => a + b, 0);
  return parts;
}
const score = (s) => scoreParts(s).total;

function ranked(topic) {
  let list = FEED.stories.filter((s) => !S.hidden[s.id] && S.votes[s.id] !== -1 && !isMuted(s));
  if (topic !== 'foryou') return list.filter((s) => s.topic === topic).sort((a, b) => b.ts - a.ts);
  list = list.map((s) => ({ s, v: score(s) })).sort((a, b) => b.v - a.v).map((x) => x.s);
  // Keep it varied: no more than two in a row from the same section.
  const out = [];
  const pool = [...list];
  while (pool.length) {
    const last2 = out.slice(-2).map((x) => x.topic);
    let i = pool.findIndex((x) => !(last2.length === 2 && last2[0] === x.topic && last2[1] === x.topic));
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function whyLines(s) {
  const p = scoreParts(s);
  const lines = [];
  const fol = isFollowed(s);
  if (fol.length) lines.push(['⭐', `You follow ${fol.join(', ')}`]);
  const tv = S.model.topic[s.topic] || 0;
  if (tv > 1) lines.push(['📈', `You often read ${TOPICS[s.topic]?.label || s.topic}`]);
  if (tv < -1) lines.push(['📉', `You usually skip ${TOPICS[s.topic]?.label || s.topic}, but this one ranked anyway`]);
  const goodTags = (s.tags || []).filter((t) => (S.model.tag[t] || 0) > 1 && !fol.includes(t));
  if (goodTags.length) lines.push(['🏷️', `You like stories about ${goodTags.join(', ')}`]);
  if ((S.model.source[s.source] || 0) > 0.8) lines.push(['📰', `You often open ${s.source}`]);
  if (s.coverage?.length) lines.push(['🗞️', `Covered by ${s.coverage.length + 1} outlets`]);
  lines.push(['🛡️', `${s.source}: ${TIER_INFO[s.tier][0]}`]);
  if (p.fresh > 2) lines.push(['⚡', `Fresh — ${ago(s.ts)}`]);
  return lines;
}

// ------------------------------------------------------------------ data
async function loadData(force) {
  const btn = $('#btn-refresh');
  btn.classList.add('spin');
  try {
    const [f, e] = await Promise.all([
      fetch('data/feed.json' + (force ? `?t=${Date.now()}` : ''), { cache: force ? 'reload' : 'default' }).then((r) => r.json()),
      fetch('data/events.json' + (force ? `?t=${Date.now()}` : ''), { cache: force ? 'reload' : 'default' }).then((r) => r.json()),
    ]);
    const changed = f.generated !== FEED.generated;
    FEED = f; EVENTS = e;
    btn.classList.remove('has-new');
    if (force) toast(changed ? 'Feed updated' : 'Already up to date');
  } catch (err) {
    if (!FEED.stories.length) toast('Offline — showing saved stories only');
  } finally {
    btn.classList.remove('spin');
  }
}
// Quietly check for a newer build when coming back to the app.
async function checkForNew() {
  try {
    const f = await fetch(`data/feed.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json());
    if (f.generated !== FEED.generated) $('#btn-refresh').classList.add('has-new');
  } catch {}
}

// ------------------------------------------------------------------ render: feed
function storyCard(s, hero = false) {
  const t = TOPICS[s.topic] || {};
  const read = S.opened[s.id] ? ' read' : '';
  const v = S.votes[s.id] || 0;
  const saved = S.saved.some((x) => x.id === s.id);
  const img = s.image
    ? (hero ? `<img class="hero-img" src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
      : `<img class="thumb" src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;thumb ph&quot;>${t.emoji || '📰'}</div>'">`)
    : (hero ? '' : `<div class="thumb ph" style="background:linear-gradient(135deg, ${t.color || '#444'}55, transparent)">${t.emoji || '📰'}</div>`);
  const body = `
    <div class="src">${avatar(s.source)}<span>${esc(s.source)}</span><span class="tier ${s.tier}" title="${esc(TIER_INFO[s.tier][0])}"></span></div>
    <h3 class="title">${esc(s.title)}</h3>
    ${hero && s.summary ? `<p class="snip">${esc(s.summary)}</p>` : ''}
    <div class="meta"><span>${ago(s.ts)}</span><span>${t.emoji || ''} ${esc(t.label || '')}</span>${s.coverage?.length ? `<span class="cov">+${s.coverage.length} more source${s.coverage.length > 1 ? 's' : ''}</span>` : ''}</div>`;
  return `
  <article class="card${hero ? ' hero' : ''}${read}" data-id="${s.id}">
    <div class="swipe-hint save">🔖 Save</div><div class="swipe-hint hide">Hide ✕</div>
    ${hero ? img : ''}
    <button class="tap" data-open="${s.id}">${hero ? body : `<div class="card-row"><div>${body}</div>${img}</div>`}</button>
    <div class="actions">
      <div class="left">
        <button class="act ${v === 1 ? 'on-up' : ''}" data-vote="1" aria-label="More like this">${ICON.up}</button>
        <button class="act ${v === -1 ? 'on-down' : ''}" data-vote="-1" aria-label="Less like this">${ICON.down}</button>
      </div>
      <div class="right">
        <button class="act ${saved ? 'on-save' : ''}" data-save aria-label="Save">${ICON.save}</button>
        <button class="act" data-menu aria-label="More options">${ICON.more}</button>
      </div>
    </div>
  </article>`;
}

function renderFeed() {
  const chips = Object.entries(TOPICS).filter(([k]) => k === 'foryou' || S.prefs.topics.includes(k));
  const list = ranked(route.topic);
  const shown = list.slice(0, feedLimit);
  let html = `<div class="chips" role="tablist">${chips.map(([k, t]) =>
    `<button class="chip ${route.topic === k ? 'on' : ''}" data-topic="${k}">${t.emoji} ${t.label}</button>`).join('')}</div><div class="feed">`;
  if (!FEED.stories.length) html += `<div class="empty"><div class="big">📡</div>Loading your news…</div>`;
  else if (!shown.length) html += `<div class="empty"><div class="big">🍃</div>Nothing here right now.<br>Check another section or come back soon.</div>`;
  let dividerDone = false;
  shown.forEach((s, i) => {
    if (route.topic !== 'foryou' && !dividerDone && prevVisit && s.ts < prevVisit && i > 0) {
      html += `<div class="divider">Since your last visit ↑</div>`; dividerDone = true;
    }
    html += storyCard(s, i === 0 && !!s.image);
  });
  if (list.length > feedLimit) html += `<button class="more-btn" data-more>Show more</button>`;
  else if (shown.length) html += `<div class="divider">You're all caught up</div>`;
  html += `</div>${FEED.generated ? `<div class="updated">Updated ${ago(Date.parse(FEED.generated))} · ${FEED.stories.length} stories from trusted sources</div>` : ''}`;
  return html;
}

// ------------------------------------------------------------------ render: briefing
const WX = { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Cloudy'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'],
  51: ['🌦️', 'Drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Drizzle'], 61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Heavy showers'], 95: ['⛈️', 'Thunderstorms'] };
let weather = null;
async function loadWeather() {
  if (weather && Date.now() - weather.at < HOUR) return;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Pacific%2FAuckland&forecast_days=1`;
    const d = await fetch(u).then((r) => r.json());
    weather = { at: Date.now(), t: Math.round(d.current.temperature_2m), code: d.current.weather_code, wind: Math.round(d.current.wind_speed_10m),
      max: Math.round(d.daily.temperature_2m_max[0]), min: Math.round(d.daily.temperature_2m_min[0]), rain: d.daily.precipitation_probability_max[0] };
    if (route.view === 'briefing') render();
  } catch {}
}

function briefingPicks() {
  const cutoff = Date.now() - 26 * HOUR;
  const list = FEED.stories.filter((s) => s.ts > cutoff && !S.hidden[s.id] && S.votes[s.id] !== -1 && !isMuted(s))
    .map((s) => ({ s, v: score(s) + 0.6 * Math.log2(1 + (s.coverage?.length || 0)) + (S.opened[s.id] ? 2 : 0) }))
    .sort((a, b) => b.v - a.v).map((x) => x.s);
  const out = []; const perTopic = {};
  for (const s of list) {
    if ((perTopic[s.topic] || 0) >= 2) continue;
    perTopic[s.topic] = (perTopic[s.topic] || 0) + 1;
    out.push(s);
    if (out.length === 10) break;
  }
  return out;
}

function renderBriefing() {
  loadWeather();
  const now = new Date();
  const h = +tzFmt({ hour: 'numeric', hour12: false }).format(now);
  const greet = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const date = tzFmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const wx = weather ? WX[weather.code] || WX[Math.floor(weather.code / 10) * 10] || ['🌡️', ''] : null;
  // Rocket launches only make the briefing if you follow them; sport events always do.
  const soon = allEvents().filter((e) => {
    const st = Date.parse(e.start); const en = Date.parse(e.end || e.start) + (e.allDay ? 24 * HOUR : 3 * HOUR);
    const relevant = e.category !== 'Space' || (e.tags || []).some((t) => S.prefs.follow.includes(t));
    return relevant && st < Date.now() + 48 * HOUR && en > Date.now();
  });
  const picks = briefingPicks();
  return `
  <section class="brief-hero">
    <h1>${greet}</h1>
    <div style="color:var(--muted)">${date} · your ${picks.length} things to know</div>
    ${weather ? `<div class="wx"><span style="font-size:30px">${wx[0]}</span><b>${weather.t}°</b><span>${wx[1]} in ${CITY.name}<br>High ${weather.max}° · Low ${weather.min}° · ${weather.rain ?? 0}% rain</span></div>` : ''}
  </section>
  ${soon.length ? `<div class="section-title">On in the next 48 hours</div><div class="ev-list">${soon.slice(0, 4).map(eventCard).join('')}</div>` : ''}
  <div class="section-title">Top stories for you</div>
  <div class="brief-list">${picks.map((s) => `
    <button class="brief-item" data-open="${s.id}">
      <div>
        <div class="src">${avatar(s.source)}<span>${esc(s.source)}</span><span class="tier ${s.tier}"></span><span style="color:var(--faint);font-weight:500">· ${TOPICS[s.topic]?.emoji || ''} ${ago(s.ts)}</span></div>
        <h3 class="title">${esc(s.title)}</h3>
        ${s.summary ? `<p class="snip">${esc(s.summary)}</p>` : ''}
        ${s.coverage?.length ? `<div class="meta"><span class="cov">+${s.coverage.length} more sources</span></div>` : ''}
      </div>
    </button>`).join('') || '<div class="empty">No fresh stories yet.</div>'}
  </div>
  <div class="updated" style="padding-top:16px">That's your briefing. Swipe through For You for more.</div>`;
}

// ------------------------------------------------------------------ render: up next
function allEvents() {
  return [...(EVENTS.events || []), ...S.myEvents.map((e) => ({ ...e, origin: 'mine' }))]
    .filter((e) => Date.parse(e.end || e.start) + (e.allDay ? 24 * HOUR : 3 * HOUR) > Date.now())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
function countdown(e) {
  const st = Date.parse(e.start);
  const en = e.end ? Date.parse(e.end) + (e.allDay ? 24 * HOUR : 0) : st + (e.allDay ? 24 * HOUR : 3 * HOUR);
  const now = Date.now();
  if (now >= st && now < en) return ['live', e.allDay ? 'On now' : 'Live now'];
  const d = st - now;
  if (d < HOUR) return ['', `Starts in ${Math.max(1, Math.round(d / 60000))} min`];
  if (d < 24 * HOUR) return ['', `In ${Math.floor(d / HOUR)}h ${Math.round((d % HOUR) / 60000)}m`];
  const days = Math.round(d / (24 * HOUR));
  return ['', days === 1 ? 'Tomorrow' : `In ${days} days`];
}
function whenText(e) {
  const st = new Date(e.start);
  if (e.allDay) {
    const f = (x) => tzFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(x + 'T12:00:00+13:00'));
    return e.end && e.end !== e.start ? `${f(e.start)} – ${f(e.end)}` : `${f(e.start)} · all day`;
  }
  return tzFmt({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(st) + ' NZ time';
}
function eventCard(e) {
  const st = e.allDay ? new Date(e.start + 'T12:00:00+13:00') : new Date(e.start);
  const [cls, label] = countdown(e);
  const related = FEED.stories.filter((s) => (e.tags || []).some((t) => (s.tags || []).includes(t))).length;
  return `
  <article class="ev ${cls}">
    <div class="ev-top">
      <div class="ev-date"><div class="m">${tzFmt({ month: 'short' }).format(st)}</div><div class="d">${tzFmt({ day: 'numeric' }).format(st)}</div><div class="w">${tzFmt({ weekday: 'short' }).format(st)}</div></div>
      <div>
        <h3>${esc(e.title)}${e.tbc ? `<span class="badge tbc">${esc(e.tbc)}</span>` : ''}${e.origin === 'mine' ? '<span class="badge">Mine</span>' : ''}</h3>
        <div class="when">${whenText(e)}${e.location ? ` · ${esc(e.location)}` : ''}</div>
        <div class="count ${cls}">${label}</div>
      </div>
    </div>
    ${e.note ? `<p class="note" onclick="this.classList.toggle('open')">${esc(e.note)}</p>` : ''}
    <div class="ev-btns">
      ${(e.watch || []).map((w) => `<a class="btn primary" href="${esc(w.url)}" target="_blank" rel="noopener">${ICON.play} ${esc(w.label)}</a>`).join('')}
      <button class="btn ghost" data-addcal="${esc(e.id)}">${ICON.cal} Add to calendar</button>
      ${related ? `<button class="btn ghost" data-related="${esc((e.tags || [])[0] || '')}">${related} related stor${related === 1 ? 'y' : 'ies'}</button>` : ''}
      ${e.origin === 'mine' ? `<button class="btn ghost danger" data-delev="${esc(e.id)}">${ICON.trash}</button>` : ''}
    </div>
  </article>`;
}
const EV_FILTERS = [['all', 'All'], ['following', '⭐ Following'], ['Strength', '💪 Strength'], ['League', '🏉 League'], ['Basketball', '🏀 Basketball'],
  ['Breaking', '🕺 Breaking'], ['Space', '🚀 Space'], ['mine', '📌 Mine']];
function renderUpNext() {
  let list = allEvents();
  const f = route.evFilter;
  if (f === 'mine') list = list.filter((e) => e.origin === 'mine');
  else if (f === 'following') list = list.filter((e) => (e.tags || []).some((t) => S.prefs.follow.includes(t)));
  else if (f !== 'all') list = list.filter((e) => e.category === f);
  let html = `<div class="page-head"><h1>Up Next</h1><p>Events from your world, with where to watch.</p></div>
    <div class="chips">${EV_FILTERS.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-evf="${k}">${l}</button>`).join('')}
    <button class="chip add" data-addev>${ICON.plus.replace('<svg', '<svg style="width:16px;height:16px"')} Add event</button></div><div class="ev-list">`;
  let lastMonth = '';
  for (const e of list) {
    const st = e.allDay ? new Date(e.start + 'T12:00:00+13:00') : new Date(e.start);
    const mo = tzFmt({ month: 'long', year: 'numeric' }).format(st);
    if (mo !== lastMonth) { html += `<div class="month">${mo}</div>`; lastMonth = mo; }
    html += eventCard(e);
  }
  if (!list.length) html += `<div class="empty"><div class="big">🗓️</div>Nothing coming up here yet.</div>`;
  return html + '</div>';
}

// ------------------------------------------------------------------ render: saved
function autoFolder(item) { return TOPICS[item.topic]?.label || 'Other'; }
function renderSaved() {
  const f = route.savedFolder;
  const autoCats = [...new Set(S.saved.map(autoFolder))];
  const list = S.saved.filter((x) => f === 'all' || (f.startsWith('auto:') ? autoFolder(x) === f.slice(5) : x.folder === f))
    .sort((a, b) => b.savedAt - a.savedAt);
  let html = `<div class="page-head"><h1>Saved</h1><p>${S.saved.length} stor${S.saved.length === 1 ? 'y' : 'ies'} · sorted into folders automatically, readable offline.</p></div>
  <div class="chips">
    <button class="chip ${f === 'all' ? 'on' : ''}" data-folder="all">All</button>
    ${S.folders.map((n) => `<button class="chip accent ${f === n ? 'on' : ''}" data-folder="${esc(n)}">${ICON.folder.replace('<svg', '<svg style="width:15px;height:15px"')} ${esc(n)}</button>`).join('')}
    ${autoCats.map((c) => `<button class="chip ${f === 'auto:' + c ? 'on' : ''}" data-folder="auto:${esc(c)}">${esc(c)}</button>`).join('')}
    <button class="chip add" data-newfolder>${ICON.plus.replace('<svg', '<svg style="width:16px;height:16px"')} Folder</button>
  </div><div class="feed">`;
  if (!list.length) html += `<div class="empty"><div class="big">🔖</div>${S.saved.length ? 'Nothing in this folder yet.' : 'Tap the bookmark on any story, or swipe it right, to save it here.'}</div>`;
  for (const s of list) {
    const t = TOPICS[s.topic] || {};
    html += `
    <article class="card saved-item" data-id="${s.id}">
      <button class="tap" data-open="${s.id}">
        <div class="card-row"><div>
          <div class="src">${avatar(s.source)}<span>${esc(s.source)}</span><span class="tier ${s.tier}"></span></div>
          <h3 class="title">${esc(s.title)}</h3>
          <div class="meta"><span>Saved ${ago(s.savedAt)}</span><span>${t.emoji || ''} ${esc(t.label || '')}</span>${s.folder ? `<span class="folder-pill">📁 ${esc(s.folder)}</span>` : ''}</div>
        </div>${s.image ? `<img class="thumb" src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : `<div class="thumb ph">${t.emoji || '📰'}</div>`}</div>
      </button>
      <div class="actions"><div class="left"><button class="act" data-movefolder="${s.id}" aria-label="Move to folder">${ICON.folder}</button></div>
      <div class="right"><button class="act on-save" data-save aria-label="Remove from saved">${ICON.save}</button></div></div>
    </article>`;
  }
  return html + '</div>';
}

// ------------------------------------------------------------------ router
function render() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.go === route.view));
  const v = $('#view');
  v.innerHTML = route.view === 'feed' ? renderFeed() : route.view === 'briefing' ? renderBriefing()
    : route.view === 'upnext' ? renderUpNext() : renderSaved();
  bindSwipes();
}
function go(view) {
  if (route.view === view) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  route.view = view; feedLimit = 30;
  render(); window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ actions
const findStory = (id) => FEED.stories.find((s) => s.id === id) || S.saved.find((s) => s.id === id);

function toggleSave(s) {
  const i = S.saved.findIndex((x) => x.id === s.id);
  if (i >= 0) {
    const [removed] = S.saved.splice(i, 1);
    learn(s, 'unsave');
    toast('Removed from saved', () => { S.saved.push(removed); persist(); render(); });
  } else {
    const snap = { id: s.id, title: s.title, link: s.link, source: s.source, tier: s.tier, topic: s.topic, tags: s.tags, summary: s.summary,
      image: s.image, ts: s.ts, coverage: s.coverage, words: s.words, savedAt: Date.now(), folder: null };
    S.saved.push(snap);
    learn(s, 'save');
    if (s.image && navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({ type: 'cache-img', url: s.image });
    toast(`Saved to ${autoFolder(s)}`, null, 'Choose folder', () => pickFolder(s.id));
  }
  persist();
}
function vote(s, dir) {
  const cur = S.votes[s.id] || 0;
  if (cur === dir) { delete S.votes[s.id]; learn(s, dir === 1 ? 'down' : 'up'); persist(); return; }
  if (cur) learn(s, cur === 1 ? 'down' : 'up');
  S.votes[s.id] = dir;
  learn(s, dir === 1 ? 'up' : 'down');
  if (dir === -1) toast('Got it — fewer like this', () => { delete S.votes[s.id]; learn(s, 'up'); persist(); render(); }, 'Undo');
  else toast('Nice — more like this');
  persist();
}
function hide(s) {
  S.hidden[s.id] = Date.now();
  learn(s, 'hide');
  persist();
  toast('Hidden', () => { delete S.hidden[s.id]; learn(s, 'save'); learn(s, 'unsave'); persist(); render(); }, 'Undo');
}
function openStory(s) {
  if (!S.opened[s.id]) { S.opened[s.id] = Date.now(); learn(s, 'open'); }
  const t = TOPICS[s.topic] || {};
  const saved = S.saved.some((x) => x.id === s.id);
  const fol = isFollowed(s);
  sheet(`
    ${s.image ? `<img class="lead-img" src="${esc(s.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <div class="src">${avatar(s.source)}<span>${esc(s.source)}</span><span class="tier ${s.tier}"></span><span style="color:var(--faint);font-weight:500">· ${ago(s.ts)} · ${t.emoji || ''} ${esc(t.label || '')}</span></div>
    <h2>${esc(s.title)}</h2>
    ${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}
    <div class="row-btns">
      <a class="btn primary" href="${esc(s.link)}" target="_blank" rel="noopener" data-click="${s.id}">${ICON.ext} Read at ${esc(s.source)}</a>
      <button class="btn" data-sheet-save="${s.id}">${ICON.save} ${saved ? 'Saved' : 'Save'}</button>
      ${navigator.share ? `<button class="btn" data-share="${s.id}">${ICON.share} Share</button>` : ''}
    </div>
    ${s.coverage?.length ? `<h4>Full coverage · ${s.coverage.length + 1} outlets</h4>
      ${s.coverage.map((c) => `<a class="cov-item" href="${esc(c.link)}" target="_blank" rel="noopener"><div class="src">${avatar(c.source)}<span>${esc(c.source)}</span><span class="tier ${c.tier}"></span><span style="color:var(--faint);font-weight:500">· ${ago(c.ts)}</span></div><div>${esc(c.title)}</div></a>`).join('')}` : ''}
    ${s.tags?.length ? `<h4>Topics in this story</h4><div class="chips static">${s.tags.map((tg) => `<button class="chip ${S.prefs.follow.includes(tg) ? 'accent on' : ''}" data-follow="${esc(tg)}">${S.prefs.follow.includes(tg) ? '★' : '☆'} ${esc(tg)}</button>`).join('')}</div>` : ''}
    <h4>Why you're seeing this</h4>
    <ul class="why">${whyLines(s).map(([i, l]) => `<li><span>${i}</span><span>${esc(l)}</span></li>`).join('')}</ul>
    <div class="row-btns">
      <button class="btn" data-sheet-vote="1">${ICON.up} More like this</button>
      <button class="btn" data-sheet-vote="-1">${ICON.down} Less like this</button>
    </div>`, { onClose: render, story: s });
}
function storyMenu(s) {
  sheet(`<h2 style="font-size:18px">${esc(s.title)}</h2>
  <div class="menu-list">
    <button data-m="why">💡 <span>Why am I seeing this?</span></button>
    <button data-m="hide">🙈 <span>Hide this story<small>Teaches KEA this wasn't for you</small></span></button>
    <button data-m="topic">📉 <span>Less ${esc(TOPICS[s.topic]?.label || '')}<small>Lower this section in For You</small></span></button>
    <button data-m="source">🚫 <span>Never show ${esc(s.source)}<small>Blocks this outlet completely</small></span></button>
    <button data-m="word">🔇 <span>Mute a word…<small>Hide every story containing it</small></span></button>
    ${(s.tags || []).filter((t) => !S.prefs.follow.includes(t)).slice(0, 3).map((t) => `<button data-m="follow" data-tag="${esc(t)}">⭐ <span>Follow ${esc(t)}</span></button>`).join('')}
    <button data-m="copy">🔗 <span>Copy link</span></button>
  </div>`, {
    onClick: (el) => {
      const m = el.closest('[data-m]')?.dataset.m;
      if (!m) return;
      closeSheet();
      if (m === 'why') setTimeout(() => openStory(s), 260);
      if (m === 'hide') { hide(s); render(); }
      if (m === 'topic') { S.model.topic[s.topic] = clamp((S.model.topic[s.topic] || 0) - 3, -10, 10); persist(); toast(`Less ${TOPICS[s.topic]?.label}`); render(); }
      if (m === 'source') { S.prefs.muteSources.push(s.source); persist(); toast(`${s.source} blocked`, () => { S.prefs.muteSources = S.prefs.muteSources.filter((x) => x !== s.source); persist(); render(); }, 'Undo'); render(); }
      if (m === 'word') setTimeout(() => promptSheet('Mute a word or phrase', 'e.g. Kardashian', (w) => { S.prefs.muteWords.push(w); persist(); toast(`Muted “${w}”`); render(); }), 260);
      if (m === 'follow') { S.prefs.follow.push(el.closest('[data-m]').dataset.tag); persist(); toast(`Following ${el.closest('[data-m]').dataset.tag}`); render(); }
      if (m === 'copy') { navigator.clipboard?.writeText(s.link); toast('Link copied'); }
    },
  });
}
function pickFolder(id) {
  const item = S.saved.find((x) => x.id === id);
  if (!item) return;
  sheet(`<h2>Move to folder</h2><div class="menu-list">
    <button data-f="">🗂️ <span>No folder<small>Just the automatic category (${esc(autoFolder(item))})</small></span></button>
    ${S.folders.map((f) => `<button data-f="${esc(f)}">📁 <span>${esc(f)}${item.folder === f ? ' ✓' : ''}</span></button>`).join('')}
    <button data-f="__new">➕ <span>New folder…</span></button>
  </div>`, {
    onClick: (el) => {
      const b = el.closest('[data-f]');
      if (!b) return;
      const f = b.dataset.f;
      closeSheet();
      if (f === '__new') {
        setTimeout(() => promptSheet('New folder', 'e.g. Trip ideas', (n) => { if (!S.folders.includes(n)) S.folders.push(n); item.folder = n; persist(); toast(`Moved to ${n}`); render(); }), 260);
      } else { item.folder = f || null; persist(); toast(f ? `Moved to ${f}` : 'Folder removed'); render(); }
    },
  });
}

// ------------------------------------------------------------------ calendar export
function icsDate(e, which) {
  if (e.allDay) {
    const d = which === 'end' ? new Date(Date.parse((e.end || e.start) + 'T12:00:00Z') + 24 * HOUR) : new Date(e.start + 'T12:00:00Z');
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  const t = which === 'end' ? (e.end ? Date.parse(e.end) : Date.parse(e.start) + 2 * HOUR) : Date.parse(e.start);
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}
function addToCalendar(e) {
  const details = [e.note, ...(e.watch || []).map((w) => `Watch: ${w.label} — ${w.url}`)].filter(Boolean).join('\n');
  const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${icsDate(e, 'start')}/${icsDate(e, 'end')}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(e.location || '')}`;
  sheet(`<h2>Add to calendar</h2><p style="color:var(--muted)">${esc(e.title)}</p><div class="menu-list">
    <a class="btn primary" style="justify-content:center;padding:14px" href="${g}" target="_blank" rel="noopener">Google Calendar</a>
    <button class="btn" style="justify-content:center;padding:14px" data-ics>Download .ics (Apple / Outlook)</button>
  </div>`, {
    onClick: (el) => {
      if (!el.closest('[data-ics]')) return;
      const val = (v) => String(v).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KEA//EN', 'BEGIN:VEVENT', `UID:${e.id}@kea`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
        e.allDay ? `DTSTART;VALUE=DATE:${icsDate(e, 'start')}` : `DTSTART:${icsDate(e, 'start')}`,
        e.allDay ? `DTEND;VALUE=DATE:${icsDate(e, 'end')}` : `DTEND:${icsDate(e, 'end')}`,
        `SUMMARY:${val(e.title)}`, `DESCRIPTION:${val(details)}`, `LOCATION:${val(e.location || '')}`,
        'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Starting soon', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = e.title.replace(/[^\w ]+/g, '').trim().slice(0, 40) + '.ics';
      a.click();
      closeSheet();
    },
  });
}
function addEventSheet() {
  sheet(`<h2>Add your own event</h2>
    <div class="field"><label>What</label><input class="input" id="ev-title" placeholder="e.g. Warriors v Storm"></div>
    <div class="field"><label>Date</label><input class="input" id="ev-date" type="date"></div>
    <div class="field"><label>Time (NZ, optional)</label><input class="input" id="ev-time" type="time"></div>
    <div class="field"><label>Where to watch link (optional)</label><input class="input" id="ev-url" type="url" placeholder="https://"></div>
    <div class="field"><label>Category</label><select class="input" id="ev-cat">${EV_FILTERS.slice(2, 7).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}<option value="Other">Other</option></select></div>
    <button class="btn primary" style="width:100%;justify-content:center;padding:14px" data-saveev>Add to Up Next</button>`, {
    onClick: (el) => {
      if (!el.closest('[data-saveev]')) return;
      const title = $('#ev-title').value.trim(); const date = $('#ev-date').value;
      if (!title || !date) { toast('Add a name and date'); return; }
      const time = $('#ev-time').value; const url = $('#ev-url').value.trim(); const cat = $('#ev-cat').value;
      const start = time ? new Date(`${date}T${time}:00`).toISOString() : date;
      S.myEvents.push({ id: 'my-' + Date.now(), title, start, allDay: !time, category: cat, tags: [],
        watch: url ? [{ label: 'Watch', url }] : [] });
      persist(); closeSheet(); toast('Added to Up Next'); render();
    },
  });
}

// ------------------------------------------------------------------ settings
function settingsSheet() {
  const sources = [...new Map(FEED.stories.flatMap((s) => [[s.source, s.tier], ...(s.coverage || []).map((c) => [c.source, c.tier])])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));
  const learned = Object.entries(S.model.tag).sort((a, b) => b[1] - a[1]);
  const topLikes = learned.filter(([, v]) => v > 0.5).slice(0, 8);
  const topDislikes = learned.filter(([, v]) => v < -0.5).slice(-6).reverse();
  sheet(`<button class="sheet-close" data-close>${ICON.x}</button><h2>You</h2>
    <h4>What KEA has learned</h4>
    ${topLikes.length || topDislikes.length ? `<div class="legend">
      ${topLikes.length ? `<span>👍 ${topLikes.map(([k]) => esc(k)).join(', ')}</span>` : ''}
      ${topDislikes.length ? `<span>👎 ${topDislikes.map(([k]) => esc(k)).join(', ')}</span>` : ''}</div>`
      : '<p style="color:var(--muted)">Nothing yet. Open, like, save or hide stories and it will learn.</p>'}

    <h4>Following</h4>
    <div class="chips static">${S.prefs.follow.map((f) => `<button class="chip accent on" data-unfollow="${esc(f)}">★ ${esc(f)} <span class="x">✕</span></button>`).join('')}</div>
    <div class="chips static">${FOLLOW_SUGGESTIONS.filter((f) => !S.prefs.follow.includes(f)).map((f) => `<button class="chip" data-follow="${esc(f)}">+ ${esc(f)}</button>`).join('')}</div>
    <div class="inline-add"><input class="input" id="add-follow" placeholder="Follow anything: a team, person, game…"><button class="btn primary" data-addfollow>Add</button></div>

    <h4>Sections</h4>
    <div class="chips static">${DEFAULT_TOPICS.map((k) => `<button class="chip ${S.prefs.topics.includes(k) ? 'on' : ''}" data-section="${k}">${TOPICS[k].emoji} ${TOPICS[k].label}</button>`).join('')}</div>

    <h4>Muted words</h4>
    <div class="chips static">${S.prefs.muteWords.map((w) => `<button class="chip" data-unmute="${esc(w)}">🔇 ${esc(w)} <span class="x">✕</span></button>`).join('') || '<span style="color:var(--muted)">None</span>'}</div>
    <div class="inline-add"><input class="input" id="add-mute" placeholder="Never show stories mentioning…"><button class="btn" data-addmute>Mute</button></div>

    <h4>Sources</h4>
    <div class="legend" style="margin-bottom:8px">
      ${Object.entries(TIER_INFO).map(([k, [n, d]]) => `<span><span class="tier ${k}"></span><b style="color:var(--text)">${n}</b> — ${d}</span>`).join('')}
    </div>
    ${sources.map(([n, t]) => `<div class="src-row">${avatar(n)}<span class="name">${esc(n)}<br><small>${TIER_INFO[t][0]}</small></span><button class="switch ${S.prefs.muteSources.includes(n) ? '' : 'on'}" data-srctoggle="${esc(n)}" aria-label="Show ${esc(n)}"></button></div>`).join('')}

    <h4>Look</h4>
    <div class="field"><label>Theme</label><div class="seg">${['auto', 'dark', 'light'].map((t) => `<button class="${S.prefs.theme === t ? 'on' : ''}" data-theme-set="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    <div class="field"><label>Text size</label><div class="seg">${[[0.92, 'Small'], [1, 'Normal'], [1.1, 'Large'], [1.2, 'Huge']].map(([v, l]) => `<button class="${S.prefs.fs === v ? 'on' : ''}" data-fs="${v}">${l}</button>`).join('')}</div></div>

    <h4>Your data</h4>
    <p style="color:var(--muted);font-size:14px;margin-top:0">Everything KEA learns stays on this phone. Back it up to move to a new phone.</p>
    <div class="row-btns">
      <button class="btn" data-export>Back up</button>
      <label class="btn" style="cursor:pointer">Restore<input type="file" accept="application/json" id="import-file" hidden></label>
      <button class="btn danger" data-resetlearn>Reset learning</button>
    </div>
    <p class="updated" style="margin-top:20px">${FEED.generated ? `News last fetched ${ago(Date.parse(FEED.generated))}. ` : ''}KEA checks trusted sources every 30 minutes.</p>`, {
    full: true,
    onClick: (el) => {
      const d = el.closest('button, label')?.dataset || {};
      if (d.unfollow) S.prefs.follow = S.prefs.follow.filter((x) => x !== d.unfollow);
      else if (d.follow) S.prefs.follow.push(d.follow);
      else if ('addfollow' in d) { const v = $('#add-follow').value.trim(); if (v && !S.prefs.follow.includes(v)) S.prefs.follow.push(v); }
      else if (d.section) S.prefs.topics = S.prefs.topics.includes(d.section) ? S.prefs.topics.filter((x) => x !== d.section) : [...S.prefs.topics, d.section];
      else if (d.unmute) S.prefs.muteWords = S.prefs.muteWords.filter((x) => x !== d.unmute);
      else if ('addmute' in d) { const v = $('#add-mute').value.trim(); if (v) S.prefs.muteWords.push(v); }
      else if (d.srctoggle) S.prefs.muteSources = S.prefs.muteSources.includes(d.srctoggle) ? S.prefs.muteSources.filter((x) => x !== d.srctoggle) : [...S.prefs.muteSources, d.srctoggle];
      else if (d.themeSet) { S.prefs.theme = d.themeSet; applyLook(); }
      else if (d.fs) { S.prefs.fs = +d.fs; applyLook(); }
      else if ('export' in d) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
        a.download = `kea-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); return;
      } else if ('resetlearn' in d) {
        if (!confirm('Forget everything KEA has learned about what you like? Saved stories and follows stay.')) return;
        S.model = blank().model; S.votes = {}; S.hidden = {}; toast('Learning reset');
      } else return;
      persist(); render(); settingsSheet();
    },
    afterOpen: (root) => {
      $('#import-file', root)?.addEventListener('change', async (ev) => {
        try {
          const data = JSON.parse(await ev.target.files[0].text());
          if (!data.prefs || !data.model) throw new Error();
          S = { ...blank(), ...data }; persist(); applyLook(); closeSheet(); render(); toast('Backup restored');
        } catch { toast("That file isn't a KEA backup"); }
      });
      for (const [id, btn] of [['#add-follow', '[data-addfollow]'], ['#add-mute', '[data-addmute]']]) {
        $(id, root)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') $(btn, root).click(); });
      }
    },
    keepScroll: true,
  });
}

// ------------------------------------------------------------------ search
function searchSheet() {
  sheet(`<div class="search-bar"><input class="input" id="q" type="search" placeholder="Search news, saved and events" autocomplete="off"><button class="sheet-close" data-close style="float:none;position:static">${ICON.x}</button></div><div id="results" style="margin-top:12px"></div>`, {
    full: true,
    afterOpen: (root) => {
      const q = $('#q', root);
      q.focus();
      q.addEventListener('input', () => {
        const term = q.value.trim().toLowerCase();
        const out = $('#results', root);
        if (term.length < 2) { out.innerHTML = ''; return; }
        const match = (s) => (s.title + ' ' + (s.summary || '') + ' ' + (s.tags || []).join(' ') + ' ' + s.source).toLowerCase().includes(term);
        const stories = [...S.saved.filter(match), ...FEED.stories.filter((s) => match(s) && !S.saved.some((x) => x.id === s.id))].slice(0, 40);
        const evs = allEvents().filter((e) => (e.title + ' ' + (e.note || '') + ' ' + (e.tags || []).join(' ')).toLowerCase().includes(term));
        out.innerHTML = (evs.length ? `<h4>Up Next</h4><div class="ev-list" style="padding:0">${evs.map(eventCard).join('')}</div>` : '')
          + (stories.length ? `<h4>Stories</h4><div class="feed" style="padding:0">${stories.map((s) => storyCard(s)).join('')}</div>` : '')
          + (!evs.length && !stories.length ? `<div class="empty">No matches for “${esc(q.value)}”.<br><button class="btn" style="margin-top:12px" data-follow="${esc(q.value.trim())}">★ Follow “${esc(q.value.trim())}”</button></div>` : '');
      });
    },
    onClick: (el) => {
      const f = el.closest('[data-follow]')?.dataset.follow;
      if (f) { S.prefs.follow.push(f); persist(); toast(`Following ${f}`); closeSheet(); render(); return; }
      handleViewClick(el, true);
    },
  });
}

// ------------------------------------------------------------------ sheet + toast
let sheetState = null;
function sheet(html, opts = {}) {
  const root = $('#sheet-root');
  const keep = opts.keepScroll && sheetState?.el ? sheetState.el.scrollTop : 0;
  const reuse = opts.keepScroll && sheetState;
  if (!reuse) closeSheet(true);
  root.innerHTML = `<div class="scrim open"></div><div class="sheet ${opts.full ? 'full' : ''} ${reuse ? 'open' : ''}" role="dialog" aria-modal="true">${opts.full ? '' : '<div class="grab"></div>'}${html}</div>`;
  const el = $('.sheet', root);
  sheetState = { el, opts };
  if (!reuse) requestAnimationFrame(() => el.classList.add('open'));
  el.scrollTop = keep;
  $('.scrim', root).onclick = () => closeSheet();
  el.onclick = (e) => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const st = opts.story;
    if (st) {
      if (e.target.closest('[data-sheet-save]')) { toggleSave(st); openStory(st); return; }
      const sv = e.target.closest('[data-sheet-vote]');
      if (sv) { vote(st, +sv.dataset.sheetVote); closeSheet(); return; }
      if (e.target.closest('[data-share]')) { navigator.share({ title: st.title, url: st.link }).catch(() => {}); return; }
      if (e.target.closest('[data-click]')) { learn(st, 'click'); return; }
      const fo = e.target.closest('[data-follow]');
      if (fo) {
        const tg = fo.dataset.follow;
        S.prefs.follow = S.prefs.follow.includes(tg) ? S.prefs.follow.filter((x) => x !== tg) : [...S.prefs.follow, tg];
        persist(); toast(S.prefs.follow.includes(tg) ? `Following ${tg}` : `Unfollowed ${tg}`); openStory(st); return;
      }
    }
    opts.onClick?.(e.target);
  };
  // Drag the grab handle down to close.
  let y0 = null;
  el.addEventListener('touchstart', (e) => { if (el.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', (e) => { if (y0 === null) return; const dy = e.touches[0].clientY - y0; if (dy > 0 && !opts.full) el.style.transform = `translateY(${dy}px)`; }, { passive: true });
  el.addEventListener('touchend', (e) => { if (y0 === null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; el.style.transform = ''; if (dy > 110 && !opts.full) closeSheet(); });
  opts.afterOpen?.(el);
  // One history entry per open sheet stack, so the phone's back gesture closes it.
  if (!history.state?.sheet) history.pushState({ sheet: true }, '');
}
function closeSheet(silent) {
  const root = $('#sheet-root');
  if (!sheetState) return;
  const { el, opts } = sheetState;
  sheetState = null;
  if (silent) { root.innerHTML = ''; return; }
  el.classList.remove('open');
  $('.scrim', root)?.classList.remove('open');
  setTimeout(() => { if (!sheetState) root.innerHTML = ''; }, 260);
  opts.onClose?.();
  if (history.state?.sheet) history.back();
}
window.addEventListener('popstate', () => { if (sheetState) { const s = sheetState; sheetState = null; s.el.classList.remove('open'); $('.scrim')?.classList.remove('open'); setTimeout(() => { if (!sheetState) $('#sheet-root').innerHTML = ''; }, 260); s.opts.onClose?.(); } });

function promptSheet(title, placeholder, done) {
  sheet(`<h2>${esc(title)}</h2><div class="inline-add"><input class="input" id="prompt-in" placeholder="${esc(placeholder)}"><button class="btn primary" data-ok>OK</button></div>`, {
    afterOpen: (r) => { const i = $('#prompt-in', r); setTimeout(() => i.focus(), 300); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-ok]', r).click(); }); },
    onClick: (el) => { if (!el.closest('[data-ok]')) return; const v = $('#prompt-in').value.trim(); if (v) { closeSheet(); done(v); } },
  });
}

let toastTimer;
function toast(msg, undo, label = 'Undo', action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo || action ? `<button>${esc(label)}</button>` : ''}`;
  t.classList.add('show');
  const b = $('button', t);
  if (b) b.onclick = () => { t.classList.remove('show'); (undo || action)(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), undo || action ? 4500 : 2200);
}

// ------------------------------------------------------------------ swipe gestures
function bindSwipes() {
  if (route.view !== 'feed') return;
  document.querySelectorAll('#view .card').forEach((card) => {
    let x0 = null, y0 = 0, dx = 0, locked = null;
    card.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; locked = null; card.style.transition = 'none'; }, { passive: true });
    card.addEventListener('touchmove', (e) => {
      if (x0 === null) return;
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my) * 1.3 ? 'x' : 'y';
      if (locked !== 'x') return;
      dx = mx;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 60}deg)`;
      $('.swipe-hint.save', card).style.opacity = clamp(dx / 90, 0, 1);
      $('.swipe-hint.hide', card).style.opacity = clamp(-dx / 90, 0, 1);
    }, { passive: true });
    card.addEventListener('touchend', () => {
      card.style.transition = '';
      const s = findStory(card.dataset.id);
      if (locked === 'x' && Math.abs(dx) > 110 && s) {
        card.style.transform = `translateX(${dx > 0 ? 120 : -120}%)`; card.style.opacity = '0';
        setTimeout(() => { if (dx > 0) { if (!S.saved.some((x) => x.id === s.id)) toggleSave(s); } else hide(s); render(); }, 220);
      } else {
        card.style.transform = '';
        card.querySelectorAll('.swipe-hint').forEach((h) => (h.style.opacity = 0));
      }
      x0 = null;
    });
  });
}

// ------------------------------------------------------------------ clicks
function handleViewClick(t, inSheet) {
  const card = t.closest('[data-id]');
  const s = card && findStory(card.dataset.id);
  const open = t.closest('[data-open]');
  if (open) { if (inSheet) closeSheet(true); openStory(findStory(open.dataset.open)); return; }
  if (s && t.closest('[data-vote]')) { vote(s, +t.closest('[data-vote]').dataset.vote); inSheet ? null : render(); return; }
  if (s && t.closest('[data-save]')) { toggleSave(s); inSheet ? null : render(); return; }
  if (s && t.closest('[data-menu]')) { storyMenu(s); return; }
  const tp = t.closest('[data-topic]');
  if (tp) { route.topic = tp.dataset.topic; feedLimit = 30; render(); tp.scrollIntoView?.({ inline: 'center', block: 'nearest' }); window.scrollTo(0, 0); return; }
  if (t.closest('[data-more]')) { feedLimit += 30; render(); return; }
  const evf = t.closest('[data-evf]');
  if (evf) { route.evFilter = evf.dataset.evf; render(); return; }
  const ac = t.closest('[data-addcal]');
  if (ac) { addToCalendar(allEvents().find((e) => e.id === ac.dataset.addcal)); return; }
  if (t.closest('[data-addev]')) { addEventSheet(); return; }
  const de = t.closest('[data-delev]');
  if (de) { S.myEvents = S.myEvents.filter((e) => e.id !== de.dataset.delev); persist(); render(); return; }
  const rel = t.closest('[data-related]');
  if (rel) { if (inSheet) closeSheet(true); relatedSheet(rel.dataset.related); return; }
  const fd = t.closest('[data-folder]');
  if (fd) { route.savedFolder = fd.dataset.folder; render(); return; }
  if (t.closest('[data-newfolder]')) { promptSheet('New folder', 'e.g. Trip ideas', (n) => { if (!S.folders.includes(n)) S.folders.push(n); route.savedFolder = n; persist(); render(); }); return; }
  const mf = t.closest('[data-movefolder]');
  if (mf) { pickFolder(mf.dataset.movefolder); return; }
}
function relatedSheet(tag) {
  const list = FEED.stories.filter((s) => (s.tags || []).includes(tag)).sort((a, b) => b.ts - a.ts).slice(0, 30);
  sheet(`<button class="sheet-close" data-close>${ICON.x}</button><h2>${esc(tag)}</h2><div class="feed" style="padding:0">${list.map((s) => storyCard(s)).join('')}</div>`, {
    full: true, onClick: (el) => handleViewClick(el, true),
  });
}

// ------------------------------------------------------------------ onboarding
function onboarding() {
  const sel = new Set(S.prefs.topics.filter((t) => LIKED_TOPICS.includes(t) || ['nz', 'local'].includes(t)));
  const fol = new Set(S.prefs.follow);
  const draw = () => {
    $('#view').innerHTML = `<div class="onboard">
      <img src="icon.svg" width="56" height="56" alt="" style="border-radius:16px">
      <h1>Your news.<br>No junk.</h1>
      <p>KEA only pulls from trusted outlets, merges the same story from different sources, and learns what you like as you go. Pick a few things to start. You can change them any time.</p>
      <h3>Sections you're into</h3>
      <div class="chips static">${DEFAULT_TOPICS.map((k) => `<button class="chip ${sel.has(k) ? 'on' : ''}" data-ot="${k}">${TOPICS[k].emoji} ${TOPICS[k].label}</button>`).join('')}</div>
      <h3>Follow (from your calendar and what you told me)</h3>
      <div class="chips static">${FOLLOW_SUGGESTIONS.map((f) => `<button class="chip accent ${fol.has(f) ? 'on' : ''}" data-of="${esc(f)}">${fol.has(f) ? '★' : '+'} ${esc(f)}</button>`).join('')}</div>
      <button class="go" data-start>Build my feed →</button>
    </div>`;
  };
  draw();
  document.body.classList.add('onboarding');
  $('.tabbar').style.display = 'none';
  $('.topbar').style.display = 'none';
  $('#view').onclick = (e) => {
    const t = e.target.closest('[data-ot]'); const f = e.target.closest('[data-of]');
    if (t) { sel.has(t.dataset.ot) ? sel.delete(t.dataset.ot) : sel.add(t.dataset.ot); draw(); }
    if (f) { fol.has(f.dataset.of) ? fol.delete(f.dataset.of) : fol.add(f.dataset.of); draw(); }
    if (e.target.closest('[data-start]')) {
      // Picked sections get a head start; the rest stay visible but start lower.
      for (const k of DEFAULT_TOPICS) S.model.topic[k] = sel.has(k) ? 1.5 : -1;
      for (const f2 of fol) S.model.tag[f2] = 2;
      S.prefs.follow = [...fol];
      S.onboarded = true; persist();
      $('.tabbar').style.display = ''; $('.topbar').style.display = '';
      $('#view').onclick = null;
      bindView(); render();
    }
  };
}

// ------------------------------------------------------------------ look
function applyLook() {
  const dark = S.prefs.theme === 'dark' || (S.prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.setProperty('--fs', S.prefs.fs);
}

// ------------------------------------------------------------------ boot
function bindView() {
  $('#view').onclick = (e) => handleViewClick(e.target);
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
$('#btn-refresh').onclick = async () => { await loadData(true); render(); };
$('#btn-search').onclick = searchSheet;
$('#btn-settings').onclick = settingsSheet;
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForNew();
  else { S.lastVisit = Date.now(); persist(); }
});
setInterval(() => { if (route.view === 'upnext' && !sheetState) render(); }, 60000);

applyLook();
decayModel();
// Forget opened/hidden markers older than 2 weeks to keep storage small.
for (const k of ['opened', 'hidden']) for (const [id, t] of Object.entries(S[k])) if (Date.now() - t > 14 * 24 * HOUR) delete S[k][id];
const hash = location.hash.slice(1);
if (['feed', 'briefing', 'upnext', 'saved'].includes(hash)) route.view = hash;
if (!S.onboarded) onboarding(); else { bindView(); render(); }
loadData().then(() => { if (S.onboarded) render(); });
S.lastVisit = Date.now(); persist();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
