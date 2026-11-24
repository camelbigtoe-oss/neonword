# KEA — your news, no junk

A personal news app for your phone. It pulls only from trusted outlets, merges the same story from different sources into one card ("full coverage"), and learns what you like from what you open, save, like, hide and skip. Everything it learns stays on your phone.

## Sections

- **For You**: your ranked feed, plus topic sections (NZ, Christchurch, World, Sport, League, Strength, Tech, Gaming, Science & Space, Entertainment, Business).
- **Briefing**: a morning roundup with Christchurch weather, what's on in the next 48 hours, and your top 10 stories.
- **Up Next**: upcoming events with countdowns, where-to-watch links and add-to-calendar. You can add your own events too.
- **Saved**: saved stories, sorted into folders automatically, plus your own folders. Readable offline.

## Teaching it

- 👍 / 👎 on any story, or **swipe right to save** and **swipe left to hide**.
- **⋯** menu: why am I seeing this, less of this section, block an outlet, mute a word, follow a topic.
- Profile icon (top right): follows, muted words, outlets on/off, theme, text size, backup and restore.

## How it updates

`.github/workflows/update.yml` runs `scripts/build-feed.mjs` every 30 minutes on GitHub Actions. That script writes `data/feed.json` and `data/events.json`, then the workflow publishes the site to GitHub Pages.

- Add or remove outlets: edit `FEEDS`, `SEARCHES` and the domain allow-lists at the top of `scripts/build-feed.mjs`.
- Add hand-picked events: edit `data/events-curated.json`. Space launches and NRL fixtures are added automatically.

Run locally: `node scripts/build-feed.mjs`, then serve this folder (for example `python -m http.server`).
