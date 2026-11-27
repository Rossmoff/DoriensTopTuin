# Dorien's Tuin Tafereel

A garden planner that runs in the browser and installs on a phone. Draw the garden to scale,
see sun and shade at any time of year, and get plant suggestions for each spot.

**Status:** phase 1 of 4 — the layout editor works (draw, edit, save, export, offline).

## Run it
```bash
npm install
npm run dev
```
Open http://localhost:5173. To try it on a phone on the same Wi-Fi, run `npm run dev:lan` and open
the "Network" address it prints. Installing to the home screen and offline use need HTTPS, so use
the GitHub Pages version for that.

## Tests
```bash
npm test
npm run e2e
```

Plans are stored only in the browser of each device. Use **⋮ → Export JSON** to copy a plan to
another device. See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
