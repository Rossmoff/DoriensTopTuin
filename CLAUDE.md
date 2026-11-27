# Dorien's Tuin Tafereel — garden planner (PWA)

Family garden planner for a plot in Genk (Bokrijk), Belgium. Draw the garden to scale, see sun and
shade through the day and year, and get plant suggestions that fit each spot's light, soil and climate.
Ornamental focus plus a vegetable section. Interface in English; plant names in English, Dutch and Latin.
No accounts, no paid APIs, works offline, must work well on a phone in the garden.

## Status / phases
- [x] Phase 1 — editor, touch support, save/load (IndexedDB + JSON), PWA shell
- [x] Phase 2 — sun position, shadows, sun-hours heatmap (Web Worker), manual zones
- [x] Phase 3 — site profile, plant database (195 plants), suitability matching, garden walk mode
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
`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages on push to `main` or the working
branch `claude/busy-hypatia-a07gbr` (BASE_PATH=/<repo>/). Live at https://rossmoff.github.io/DoriensTopTuin/.

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
- `src/domain/sun/` — `timezone.ts` (Intl-based local⇄UTC, DST-safe), `sunPosition.ts` (NOAA
  algorithm, own implementation instead of SunCalc; `sunDay` sunrise/sunset/solar noon; `calibrate`),
  `shadow.ts` (shadow vector, prism and tree-crown shadows, leaf season), `raster.ts` (scan-line
  fill on a cell grid), `sunHours.ts` (sun-hours map, light classes, point queries).
- `src/workers/sunHours.worker.ts` + `src/features/sun/sunHoursClient.ts` — the map is computed in a
  module Web Worker; a new request terminates a running one. `useSunHoursJob` recomputes (350 ms
  debounce) when anything that affects sun hours changes while the map is shown.
- `src/features/sun/` — `SunBar` (view switch, date, presets, time slider, play, period), `SunLayers`
  (shadow shape, heatmap bitmap, sun arc), `SunProbe` (tap-a-spot card), `SunSettings` (leaf season,
  bare-tree transmission, calibration), `SunReadout` (average sun hours of a bed).
- `src/state/sunStore.ts` — sun view state (view, date, minutes, period, last result, probe) plus
  `season`: the growing-season map used for plant matching (`useSeasonSunMap`, own worker channel).
- `src/data/plants.json` — the curated plant list (**source of truth**, edit directly; 195 plants,
  70% ornamental, 67 Belgian natives). Loaded via `src/data/plants.ts`; `plants.test.ts` validates
  ids, ranges, months and companion references.
- `src/plantSource/` — `PlantSource` interface + `LocalPlantSource` (builtin JSON merged with user
  plants/edits in IndexedDB store `plants`; same id = user edit wins, `remove` resets an edit).
- `src/domain/plants/` — `soil.ts` (`effectiveSoil`: site → bed override → zones), `suitability.ts`
  (`scorePlant`, `rankPlants`), `filters.ts`.
- `src/features/plants/` — `useSpot` (spot conditions for a bed or point), `SpotSummary`,
  `PlantSuggestions` (Good/Possible/Unsuitable + filters), `PlantRow`, detail/editor/library
  dialogs (`plantUiStore`). `src/features/site/` — site profile and bed soil override forms.
- `src/features/walk/WalkPanel.tsx` — read-only garden walk (`uiStore.mode === 'walk'`).
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

### Sun model
- Sun position: NOAA/Meeus, geometric altitude; sunrise/sunset at −0.833°. Times are local
  (Europe/Brussels) minutes after midnight; `zonedToUtc` handles summer time.
- Shadow vector per metre of height = (1/tan alt) along azimuth+180°, rotated by `planUpBearingDeg`;
  capped at 100 m/m for very low sun.
- Buildings/walls/hedges/fences: vertical prisms (`prismShadow`; convex → one hull, otherwise
  footprint + one parallelogram per edge). Trees: crown = ellipsoid between crownBaseHeight and
  height → shadow ellipse with semi-axes r and √(r² + c²|v|²), plus a thin trunk.
- Opacity: `shadowOpacity` (greenhouse 0.3); deciduous trees/hedges outside the leaf season block
  `1 − leaflessTransmission` (default 30%). Overlapping partial shadows multiply transmission, but one
  object never counts twice in a cell (stamp buffer).
- Sun-hours map: 0.5 m cells over the boundary bbox, cells outside the plot or under a roof are NaN.
  15-min samples at slot midpoints; periods sample weekly (or daily). Value = average hours/day.
- Rendering: ground-level objects → shadow/heatmap layer (own Konva layer, so animation only redraws
  that canvas) → raised objects → zones → labels. Shadow polygons are filled in one nonzero path
  with uniform winding so overlaps don't darken. `Konva.pixelRatio` is capped at 2.
- Manual zones: `shady` forces the light class to shade; `wet` / `extraDry` feed moisture (phase 3).
- Measured: growing-season map for a busy 30 × 50 m garden ≈ 0.25 s desktop, ≈ 0.8 s at 4× CPU
  throttle; UI stays responsive (worker).

### Plant matching
- Spot = season sun hours (bed: average over its footprint; point: its cell) + effective soil
  (site soil, overridden by the bed's `soilOverride`, then zones: wet → wet, extraDry → dry, shady →
  sun capped at 2 h) + USDA zone.
- Factors (0..1, weight): sun 3 (hours vs the plant's acceptable range; −1/3 per missing hour,
  −1/4 per extra hour for shade plants), moisture 2.5 (drier than wanted is softened by drought
  tolerance), pH 2 (−1/1.5 per pH unit outside the range), soil texture 1 (steps on
  sand–loamy sand–loam–clay), fertility 1 (vs organic matter; mostly vegetables), hardiness 2
  (skipped for annuals). Score = weighted mean.
- Groups: unsuitable if any factor < 0.25 or score < 0.5; good if score ≥ 0.8 and every factor
  ≥ 0.5; otherwise possible. Ties broken by number of positive notes (acid lover, drought tolerant,
  native). Vegetable beds list edibles first within each group.
- Reasons: problems first (worst first, e.g. "prefers pH ≥ 6.5, this spot is ~5.0", "needs moist or
  wet soil, this spot is dry sand"), then positives. Rows show two; the detail dialog shows all.

### Konva gotchas found so far
- Closed `Line` without fill still fills on the hit canvas → set `fillEnabled={false}` for outlines.
- After dragging a `Line`, reset node x/y to 0 before committing new points (react-konva won't
  re-apply an unchanged `x={0}` prop).
- The click after a long-press release must not close the menu or deselect (see `openedAt`,
  `toolAtDown`).
- A Konva Group's opacity is applied per child (overlaps darken); draw unions in one custom Shape.

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
- Sun calibration is entered as compass bearings (sunrise/sunset) and midday altitude for a date.
- The tap-a-spot card works in both sun views. Garden walk mode (phase 3) is read-only: tap a spot
  for sun hours, soil and plant suggestions; objects can't be selected or moved.
- Plant list grew to 195 (agreed ~150) to keep the curated ornamentals while staying ~70/30.
- Escape closes the topmost dialog before it affects the selection or tool.

## Conventions
- TypeScript strict; no `any` in domain code. Pure logic in `src/domain`, tested with Vitest next to
  the code (`*.test.ts`). E2E in `tests/e2e`, using `data-testid` hooks.
- Units: metres, degrees, months 1–12. Dates shown dd/mm (en-GB).
- Tap targets ≥ 44 px; every icon-only button has an `aria-label`.
- Plant data is approximate and marked `approximate: true`.
- Never commit exported plans (`*.tuin.json` is git-ignored): they describe the family's home.
