# Dorien's Tuin Tafereel

A garden planner that runs in the browser and installs on a phone. Draw the garden to scale,
see sun and shade at any time of year, and get plant suggestions for each spot.

**Status:** all four phases done: layout editor, sun & shade, plant advice, plant placement with
warnings and bloom/vegetable calendars. Live at https://rossmoff.github.io/DoriensTopTuin/.

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
