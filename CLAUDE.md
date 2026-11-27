# Dorien's Tuin Tafereel — garden planner (PWA)

Family garden planner for a plot in Genk (Bokrijk), Belgium. Draw the garden to scale, see sun and
shade through the day and year, and get plant suggestions that fit each spot's light, soil and climate.
Ornamental focus plus a vegetable section. Interface in English; plant names in English, Dutch and Latin.
No accounts, no paid APIs, works offline, must work well on a phone in the garden.

## Status / phases
- [x] Phase 1 — editor, touch support, save/load (IndexedDB + JSON), PWA shell
- [ ] Phase 2 — sun position, shadows, sun-hours heatmap (Web Worker), manual zones
- [ ] Phase 3 — site profile, plant database (~150 plants), suitability matching
- [ ] Phase 4 — plant placement, warnings, bloom & vegetable calendars, export

## Commands
```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:lan      # also reachable from a phone on the same Wi-Fi (http; no offline/install)
npm run build        # typecheck + production build into dist/
npm run preview      # serve dist/ (service worker active on localhost)
npm test             # Vitest unit tests (src/**/*.test.ts)
npm run e2e          # Playwright, desktop + Pixel 7 projects (builds first)
npm run icons        # regenerate PNG icons from public/favicon.svg
```
CI (`.github/workflows/ci.yml`) runs typecheck, unit and e2e tests on every push.
`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages on push to `main` (BASE_PATH=/<repo>/).

## Architecture
- **React 19 + TypeScript (strict) + Vite**, **react-konva** canvas, **zustand** state,
  **idb** for IndexedDB, **vite-plugin-pwa** (Workbox generateSW, autoUpdate).
- `src/domain/` — pure TypeScript, no React/DOM. Types, geometry, (later) sun/shadow maths and
  suitability scoring. Everything here gets unit tests.
- `src/data/` — static catalogues: object kinds and presets (`objectCatalog.ts`), default Genk site.
- `src/storage/` — `GardenRepository` interface; `IndexedDbGardenRepository` (v1),
  `MemoryGardenRepository` (tests/fallback); JSON export format + `migrateGarden`.
  A future Node/Express/MongoDB sync backend implements the same interface.
- `src/state/` — `gardenStore` (current garden + undo/redo history), `uiStore` (tool, selection,
  view, theme, dialogs), `gardenActions.ts` (pure `(garden, …) => garden` edits), `persistence.ts`
  (debounced autosave, last-opened plan).
- `src/features/editor/` — canvas: `EditorCanvas` (stage, pinch/wheel zoom, long-press),
  `ObjectShape`, `SelectionHandles` (Transformer + vertex handles), `drawingController` (tools →
  objects, reads/writes stores directly), overlays (compass, scale bar, zoom, draw hint, context menu).
- `src/features/panels/` — properties panel (side panel ≥768 px, bottom sheet below).
- `src/features/plans/`, `src/features/toolbar/` — plans dialog, new plan, import/export, top bar.

### Coordinate conventions
- Plan coordinates are **metres**, **+x right, +y down** (screen-like), origin = top-left of the plot.
- `Garden.planUpBearingDeg` = compass bearing (° clockwise from true north) that plan-"up" points to.
  0 = north up, 90 = east up. A sun azimuth A maps to plan angle `A − planUpBearingDeg`
  (clockwise from plan-up); plan direction vector = (sin θ, −cos θ).
- Stage transform: `screen = world × view.scale + (view.x, view.y)`; shapes use
  `strokeScaleEnabled={false}` so outlines stay a constant pixel width.
- Geometry types: `rect` (centre, width, length, rotationDeg), `polygon`, `polyline` (+thickness),
  `circle` (trees: radius = crown radius). `footprintPolygons()` turns any of them into polygons.

### Editing model
- Every edit goes through `gardenStore.update(fn, { coalesceKey? })`. Same key within 1.2 s ⇒ one
  undo step (typing in a field, dragging a vertex, compass rotation).
- Paint order is by tier (lawn < surfaces < beds < buildings < boundaries < trees), then array order.
- Touch: one finger pans empty space and drags the *selected* object (unselected objects are not
  draggable on coarse pointers, so pans over a lawn still work); two fingers pinch/pan; long-press
  (550 ms) opens the context menu. Desktop: all objects draggable, wheel zooms, right-click = menu.
- Multi-point tools finish by tapping the first point (polygon), tapping the last point again, the
  Finish button or Enter. Konva's own dblclick is *not* used (it fires for taps far apart).

### Konva gotchas found so far
- Closed `Line` without fill still fills on the hit canvas → set `fillEnabled={false}` for outlines.
- After dragging a `Line`, reset node x/y to 0 before committing new points (react-konva won't
  re-apply an unchanged `x={0}` prop).
- The click after a long-press release must not close the menu or deselect (see `openedAt`,
  `toolAtDown`).

## Site defaults (editable in the app)
- Location 50.96 N, 5.45 E, Europe/Brussels.
- Soil (bodemkaart): "matig droge zandbodem met duidelijke ijzer- en/of humus B-horizont" → sand,
  pH 5.0 (estimated), fast drainage, moisture **dry**, low organic matter. The wider area ranges
  from sand to loamy sand ("lemig zand") and dry to moderately wet, so texture and moisture are
  user-selectable for the site and (phase 3) per bed.
- Climate: USDA 8a, last frost 15 May (IJsheiligen), first frost 25 Oct.

## Decisions (agreed)
- Shadows on flat ground only; carport treated as solid; no pergolas in v1.
- Shadow of a prism = union of hulls of each footprint edge and its translate; trees use the crown
  between crownBaseHeight and height. Leafless deciduous crowns let 70% of light through (Nov–Apr).
- Heatmap: 0.5 m cells, 15-min steps; a single date computes every step; a period samples one day
  per week (option: daily). Classes ≥6 h / 3–6 h / <3 h.
- Main purpose of shade: classify spots as full sun / partial shade / shade for plant advice.
  Manual sun mode = calibration (azimuth offset + altitude factor).
- Deploy via GitHub Pages (public repo). Commit and push each phase to the working branch.

## Conventions
- TypeScript strict; no `any` in domain code. Pure logic in `src/domain`, tested with Vitest next to
  the code (`*.test.ts`). E2E in `tests/e2e`, using `data-testid` hooks.
- Units: metres, degrees, months 1–12. Dates shown dd/mm (en-GB).
- Tap targets ≥ 44 px; every icon-only button has an `aria-label`.
- Plant data is approximate and marked `approximate: true`.
- Never commit exported plans (`*.tuin.json` is git-ignored): they describe the family's home.
