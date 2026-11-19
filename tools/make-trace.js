// Builds trace-data.js (NEONTRACE puzzles) from the themes below.
// Run: node tools/make-trace.js
// Each theme: span word (names the theme, crosses the board), a short clue, and a pool of
// theme words. The script picks pool words so that span + words fill all 48 cells exactly,
// then lays every word out as a path of touching cells (8 directions) on a 6 x 8 board.
// Output is deterministic (fixed seed), so re-running gives the same grids.
const fs = require("fs");
const path = require("path");

const COLS = 6, ROWS = 8, CELLS = COLS * ROWS;

const THEMES = [
  ["OUTERSPACE", "Look up. Way up.", "COMET PLANET NEBULA GALAXY ORBIT ROCKET MOON QUASAR STAR METEOR ASTEROID"],
  ["KITCHENWARE", "Cook's toolkit", "WHISK LADLE SPATULA GRATER TONGS KETTLE SIEVE COLANDER SKILLET TOASTER"],
  ["BEACHDAY", "Sun, sand and sea", "SAND SHELL TOWEL WAVES SURF BUCKET SPADE CRAB KITE PARASOL SUNHAT"],
  ["PAINTBOX", "A splash of colour", "CRIMSON SCARLET VIOLET INDIGO AMBER TEAL OCHRE MAGENTA COBALT"],
  ["ARCADEROOM", "Insert coin", "JOYSTICK PINBALL TOKEN SCORE PLAYER BUTTON SCREEN COIN LEVEL BOSS"],
  ["CYBERPUNK", "High tech, low life", "NEON HACKER CHROME IMPLANT ANDROID GLITCH DRONE MATRIX VIRUS"],
  ["ORCHESTRA", "Tuning up", "VIOLIN CELLO FLUTE OBOE HARP TUBA TIMPANI BASSOON TRUMPET VIOLA"],
  ["WEATHERMAP", "Tonight's forecast", "STORM THUNDER BREEZE DRIZZLE SLEET FOG HAIL CLOUD RAINBOW FROST"],
  ["DEEPOCEAN", "Down in the blue", "SQUID WHALE CORAL SHARK OCTOPUS EEL KRILL ANGLER JELLY PLANKTON"],
  ["BREAKFAST", "Rise and dine", "TOAST BACON PANCAKE WAFFLE CEREAL OMELET MUFFIN BAGEL CROISSANT"],
  ["GARDENING", "Green fingers", "RAKE HOSE SEEDS TROWEL SHOVEL COMPOST BLOOM WEEDS SPROUT"],
  ["CAMPFIRE", "Stories after dark", "TENT LOGS EMBERS SPARKS KINDLING STORIES SMORES FLAME LANTERN"],
  ["CHESSBOARD", "Sixty-four squares", "KING QUEEN ROOK BISHOP KNIGHT PAWN CHECK CASTLE GAMBIT"],
  ["DINOSAURS", "Long gone giants", "RAPTOR FOSSIL JURASSIC BONES AMBER EXTINCT CLAW SKULL EGGS TAIL"],
  ["SWEETTREATS", "Sugar rush", "CANDY FUDGE TOFFEE COOKIE DONUT BROWNIE CUPCAKE TRUFFLE LOLLY"],
  ["HALLOWEEN", "Trick or treat", "GHOST WITCH PUMPKIN SPIDER ZOMBIE CANDY BROOM VAMPIRE MUMMY"],
  ["WINTERTIME", "Wrap up warm", "SNOW SLED SCARF MITTENS ICICLE FROST IGLOO BLIZZARD COCOA"],
  ["JUKEBOX", "Pick a track", "ROCK JAZZ BLUES DISCO FUNK TECHNO REGGAE COUNTRY SWING SOUL"],
  ["SUPERHERO", "Saving the day", "CAPE MASK POWER VILLAIN SIDEKICK LAIR GADGET RESCUE COSTUME"],
  ["ROADTRIP", "Are we there yet?", "MAP SNACKS RADIO MOTEL FUEL HIGHWAY DETOUR TRUNK SUITCASE"],
  ["SPORTSDAY", "On your marks", "RELAY SPRINT HURDLES JAVELIN DISCUS MEDAL RACE BATON TROPHY"],
  ["FAIRYTALE", "Once upon a time", "CASTLE DRAGON PRINCESS WITCH GIANT TROLL CURSE WAND KNIGHT"],
  ["PIRATESHIP", "Yo ho ho", "ANCHOR PARROT PLANK CANNON CAPTAIN TREASURE CUTLASS MAST SAILS COMPASS"],
  ["GEMSTONES", "Precious things", "RUBY OPAL PEARL TOPAZ JADE EMERALD AMBER GARNET ONYX DIAMOND"],
  ["ROBOTICS", "Beep boop", "GEARS SENSOR SERVO CIRCUIT DROID MOTOR CHIP LASER BOLT WIRES"],
  ["RAINFOREST", "Under the canopy", "JAGUAR TOUCAN PARROT SLOTH VINE CANOPY MONKEY FROG ORCHID PYTHON"],
  ["PIZZANIGHT", "Extra cheese", "CHEESE OLIVES BASIL CRUST SAUCE ONION SLICE OVEN MUSHROOM SALAMI"],
  ["FARMYARD", "Down on the farm", "SHEEP GOAT HORSE TRACTOR BARN HAY CHICKEN DUCK PIGLET DONKEY"],
  ["VIDEOGAME", "Press start", "BOSS LEVEL QUEST SAVE COMBO PIXEL SPRITE LOOT RESPAWN GAMEPAD"],
  ["CITYLIGHTS", "Bright lights", "NEON TAXI SUBWAY TOWER SKYLINE TRAFFIC ALLEY BRIDGE BILLBOARD"],
];

// ---------- seeded random ----------
let seed = 20261119;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const rc = (i) => [Math.floor(i / COLS), i % COLS];
function nbrs(i) {
  const [r, c] = rc(i), out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const R = r + dr, C = c + dc;
    if (R >= 0 && R < ROWS && C >= 0 && C < COLS) out.push(R * COLS + C);
  }
  return out;
}
const N = [...Array(CELLS).keys()].map(nbrs);

// pick 5-8 pool words whose lengths sum to target; prefer 6-7 words, random order
function pickWords(pool, target) {
  const words = shuffle(pool);
  let best = null;
  (function go(i, left, chosen) {
    if (best && best.length >= 6 && best.length <= 7) return;
    if (left === 0) {
      if (chosen.length >= 5 && chosen.length <= 8 && (!best || Math.abs(chosen.length - 6.5) < Math.abs(best.length - 6.5))) best = chosen.slice();
      return;
    }
    if (i >= words.length || left < 0 || chosen.length >= 8) return;
    chosen.push(words[i]); go(i + 1, left - words[i].length, chosen); chosen.pop();
    go(i + 1, left, chosen);
  })(0, target, []);
  return best;
}

// empty regions must each be fillable by some subset of the remaining word lengths
function regionsOk(grid, lens) {
  const seen = new Uint8Array(CELLS);
  const sums = new Set([0]);
  for (const l of lens) for (const s of [...sums]) sums.add(s + l);
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] || seen[i]) continue;
    let size = 0;
    const st = [i]; seen[i] = 1;
    while (st.length) { const x = st.pop(); size++; for (const y of N[x]) if (!grid[y] && !seen[y]) { seen[y] = 1; st.push(y); } }
    if (!sums.has(size)) return false;
  }
  return true;
}

// lay one word as a path starting at `start`, through empty cells
function layPath(grid, start, len, cb) {
  const pathArr = [start];
  grid[start] = 1;
  let budget = 400;
  const go = () => {
    if (pathArr.length === len) return cb(pathArr);
    if (--budget < 0) return false;
    const last = pathArr[pathArr.length - 1];
    // fewer free neighbours first keeps the leftover space in one piece
    const opts = shuffle(N[last].filter((y) => !grid[y]))
      .sort((a, b) => N[a].filter((z) => !grid[z]).length - N[b].filter((z) => !grid[z]).length);
    for (const y of opts) {
      grid[y] = 1; pathArr.push(y);
      if (go()) return true;
      pathArr.pop(); grid[y] = 0;
    }
    return false;
  };
  const ok = go();
  if (!ok) grid[start] = 0;
  return ok;
}

function placeSpan(grid, len, vertical) {
  // starts on one side, ends on the opposite side
  for (let tries = 0; tries < 300; tries++) {
    const start = vertical ? Math.floor(rnd() * COLS) : Math.floor(rnd() * ROWS) * COLS;
    const onEnd = (i) => (vertical ? rc(i)[0] === ROWS - 1 : rc(i)[1] === COLS - 1);
    let got = null;
    layPath(grid, start, len, (p) => {
      if (!onEnd(p[p.length - 1])) return false;
      // keep it from hugging the far side early (end only at the last letter)
      if (p.slice(0, -1).some(onEnd)) return false;
      got = p.slice();
      return true;
    });
    if (got) return got;
    grid.fill(0);
  }
  return null;
}

function fill(grid, words, placed) {
  if (!words.length) return true;
  // the empty cell with the fewest empty neighbours must start a word
  let cell = -1, low = 9;
  for (let i = 0; i < CELLS; i++) if (!grid[i]) {
    const f = N[i].filter((y) => !grid[y]).length;
    if (f < low) { low = f; cell = i; }
  }
  for (const w of shuffle(words)) {
    const rest = words.filter((x) => x !== w);
    let ok = false;
    for (let attempt = 0; attempt < 6 && !ok; attempt++) {
      layPath(grid, cell, w.length, (p) => {
        if (!regionsOk(grid, rest.map((x) => x.length))) return false;
        placed.push({ w, path: p.slice() });
        if (fill(grid, rest, placed)) { ok = true; return true; }
        placed.pop();
        return false;
      });
    }
    if (ok) return true;
  }
  return false;
}

function build([span, clue, poolStr]) {
  const pool = poolStr.split(" ").filter((w) => !span.includes(w) && w.length >= 3);
  for (let round = 0; round < 60; round++) {
    const words = pickWords(pool, CELLS - span.length);
    if (!words) throw new Error(`no word mix fits for ${span}`);
    const vertical = span.length >= ROWS && rnd() > 0.5;
    const grid = new Uint8Array(CELLS);
    const sp = placeSpan(grid, span.length, vertical);
    if (!sp || !regionsOk(grid, words.map((w) => w.length))) continue;
    const placed = [];
    if (!fill(grid, words, placed)) continue;
    const letters = Array(CELLS).fill("?");
    const all = [{ w: span, path: sp, span: true }, ...placed];
    for (const { w, path: p } of all) p.forEach((cell, k) => (letters[cell] = w[k]));
    const rows = [];
    for (let r = 0; r < ROWS; r++) rows.push(letters.slice(r * COLS, r * COLS + COLS).join(""));
    return { clue, rows, words: all.map((x) => (x.span ? { w: x.w, p: x.path, s: 1 } : { w: x.w, p: x.path })) };
  }
  throw new Error(`could not lay out ${span}`);
}

const out = THEMES.map((t) => {
  const p = build(t);
  // sanity: every cell used once, every path touches, letters match
  const used = new Set();
  for (const { w, p: cells } of p.words) {
    cells.forEach((c, k) => {
      if (used.has(c)) throw new Error("overlap " + t[0]);
      used.add(c);
      if (p.rows[Math.floor(c / COLS)][c % COLS] !== w[k]) throw new Error("letter " + t[0]);
      if (k && !N[cells[k - 1]].includes(c)) throw new Error("gap " + t[0]);
    });
  }
  if (used.size !== CELLS) throw new Error("cells " + t[0]);
  console.log(t[0].padEnd(12), p.words.length - 1, "words:", p.words.filter((x) => !x.s).map((x) => x.w).join(" "));
  return p;
});

const body = out.map((p) => "  " + JSON.stringify(p)).join(",\n");
fs.writeFileSync(
  path.join(__dirname, "..", "trace-data.js"),
  `// NEONTRACE puzzles. Generated by tools/make-trace.js — edit the themes there and re-run.\n` +
  `// rows: 8 strings of 6 letters. words: w = word, p = cell indexes (row * 6 + col) in order, s = span word.\n` +
  `const TRACE_PUZZLES = [\n${body},\n];\n`
);
console.log(out.length, "puzzles written");
