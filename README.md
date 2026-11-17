# NEONWORD

Cyberpunk pixel word puzzle. Plain HTML/CSS/JS, no build step. Installable as an app (PWA) and works offline after the first visit.

## Run locally

```bash
python -m http.server 5173
```

Open http://localhost:5173. In Chrome or Edge, click the install icon in the address bar to add it as an app.

## Play on your phone

Host the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages). Open the URL on your phone and choose "Add to Home Screen". A service worker needs HTTPS, so a plain file:// open will play but won't install.

## Files

- `index.html` – layout
- `style.css` – pixel UI and the 6 themes
- `app.js` – game rules, hints, XP, credits, stats
- `words.js` – answer words and their clues (edit to add more)
- `bg.js` – animated pixel city background and particles
- `audio.js` – chiptune sound effects (WebAudio)
- `sw.js` – offline cache. Bump `VERSION` after changing files.

## Notes

- Guesses not in `words.js` are checked against api.dictionaryapi.dev and cached. Offline, any guess is accepted.
- Progress is saved in the browser's localStorage.
