import type { Colour, Month, PlantCategory } from '../../domain/types';
import { activeFilterCount } from '../../domain/plants';
import { usePlantStore } from '../../state/plantStore';
import { ALL_COLOURS, CATEGORY_LABEL, MONTH_NAMES } from './plantDisplay';

const HEIGHTS = [0.3, 0.6, 1, 2, 5];

export function PlantFilters() {
  const f = usePlantStore((s) => s.filter);
  const set = usePlantStore((s) => s.setFilter);
  const reset = usePlantStore((s) => s.resetFilter);
  const n = activeFilterCount({ ...f, text: '' });
  const toggleCat = (c: PlantCategory) => set({ categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] });
  return (
    <div className="plant-filters">
      <input
        type="search"
        className="search"
        placeholder="Search (English, Dutch or Latin)…"
        aria-label="Search plants"
        value={f.text}
        onChange={(e) => set({ text: e.target.value })}
        data-testid="plant-search"
      />
      <details>
        <summary className="btn" data-testid="plant-filters-toggle">
          Filters{n ? ` (${n})` : ''}
        </summary>
        <div className="filter-body">
          <div className="seg wide" role="radiogroup" aria-label="Kind">
            {(['all', 'ornamental', 'edible'] as const).map((k) => (
              <button key={k} className={`btn ${f.kind === k ? 'active' : ''}`} role="radio" aria-checked={f.kind === k} onClick={() => set({ kind: k })} data-testid={`filter-kind-${k}`}>
                {k === 'all' ? 'All' : k === 'edible' ? 'Edible' : 'Ornamental'}
              </button>
            ))}
          </div>
          <div className="chips" aria-label="Category">
            {(Object.keys(CATEGORY_LABEL) as PlantCategory[]).map((c) => (
              <button key={c} className={`chip ${f.categories.includes(c) ? 'on' : ''}`} aria-pressed={f.categories.includes(c)} onClick={() => toggleCat(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Max. height</span>
            <select value={f.maxHeightM ?? ''} onChange={(e) => set({ maxHeightM: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Any</option>
              {HEIGHTS.map((h) => (
                <option key={h} value={h}>
                  up to {h} m
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Flower colour</span>
            <select value={f.colour ?? ''} onChange={(e) => set({ colour: (e.target.value || null) as Colour | null })}>
              <option value="">Any</option>
              {ALL_COLOURS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Flowering in</span>
            <select value={f.month ?? ''} onChange={(e) => set({ month: e.target.value ? (Number(e.target.value) as Month) : null })}>
              <option value="">Any month</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={f.evergreen} onChange={(e) => set({ evergreen: e.target.checked })} /> Evergreen
          </label>
          <label className="check">
            <input type="checkbox" checked={f.native} onChange={(e) => set({ native: e.target.checked })} data-testid="filter-native" /> Native to Belgium
          </label>
          <label className="check">
            <input type="checkbox" checked={f.pollinators} onChange={(e) => set({ pollinators: e.target.checked })} /> Good for bees &amp; butterflies
          </label>
          <label className="check">
            <input type="checkbox" checked={f.safeForKidsAndPets} onChange={(e) => set({ safeForKidsAndPets: e.target.checked })} /> Not toxic to children or pets
          </label>
          {n > 0 && (
            <button className="btn" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
