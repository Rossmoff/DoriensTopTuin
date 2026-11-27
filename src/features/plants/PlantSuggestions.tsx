import { useMemo, useState } from 'react';
import { matchesFilter, rankPlants, type SpotConditions, type Suitability } from '../../domain/plants';
import { usePlantStore } from '../../state/plantStore';
import { PlantFilters } from './PlantFilters';
import { PlantRow } from './PlantRow';

function Group({ title, items, initial, testId, open }: { title: string; items: Suitability[]; initial: number; testId: string; open: boolean }) {
  const [limit, setLimit] = useState(initial);
  return (
    <details className="plant-group" open={open} data-testid={testId}>
      <summary>
        {title} <span className="count">({items.length})</span>
      </summary>
      <ul className="plant-list">
        {items.slice(0, limit).map((s) => (
          <PlantRow key={s.plant.id} plant={s.plant} suitability={s} />
        ))}
      </ul>
      {items.length > limit && (
        <button className="btn ghost more" onClick={() => setLimit(limit + 25)}>
          Show {Math.min(25, items.length - limit)} more
        </button>
      )}
    </details>
  );
}

/** Ranked plant list for a spot: Good / Possible / Unsuitable, with reasons and filters. */
export function PlantSuggestions({ spot, compact = false, ediblesFirst = false }: { spot: SpotConditions; compact?: boolean; ediblesFirst?: boolean }) {
  const plants = usePlantStore((s) => s.plants);
  const filter = usePlantStore((s) => s.filter);
  const ranked = useMemo(() => {
    const r = rankPlants(plants.filter((p) => matchesFilter(p, filter)), spot);
    if (!ediblesFirst) return r;
    // Vegetable beds: edibles first within each group (stable sort keeps the ranking otherwise).
    const ed = (xs: Suitability[]) => [...xs].sort((a, b) => Number(!!b.plant.edible) - Number(!!a.plant.edible));
    return { good: ed(r.good), possible: ed(r.possible), unsuitable: ed(r.unsuitable) };
  }, [plants, filter, spot, ediblesFirst]);
  return (
    <div className="plant-suggestions" data-testid="plant-suggestions">
      <PlantFilters />
      <Group title="Good" items={ranked.good} initial={compact ? 8 : 15} testId="group-good" open />
      <Group title="Possible" items={ranked.possible} initial={compact ? 5 : 10} testId="group-possible" open={!compact} />
      <Group title="Unsuitable" items={ranked.unsuitable} initial={10} testId="group-unsuitable" open={false} />
      <p className="hint">Plant data is approximate. Scores combine sun, moisture, pH, soil type, richness and hardiness.</p>
    </div>
  );
}
