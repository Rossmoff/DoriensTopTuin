import { useMemo, useState } from 'react';
import { matchesFilter } from '../../domain/plants';
import { usePlantStore } from '../../state/plantStore';
import { Icon } from '../../ui/Icon';
import { newPlantDraft } from './PlantEditorDialog';
import { PlantFilters } from './PlantFilters';
import { PlantRow } from './PlantRow';
import { usePlantUi } from './plantUiStore';

export function PlantLibraryDialog() {
  const open = usePlantUi((s) => s.libraryOpen);
  const set = usePlantUi((s) => s.set);
  const plants = usePlantStore((s) => s.plants);
  const filter = usePlantStore((s) => s.filter);
  const [limit, setLimit] = useState(40);
  const list = useMemo(
    () => plants.filter((p) => matchesFilter(p, filter)).sort((a, b) => a.names.en.localeCompare(b.names.en)),
    [plants, filter],
  );
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={() => set({ libraryOpen: false })}>
      <div className="dialog library" role="dialog" aria-label="Plant library" onClick={(e) => e.stopPropagation()} data-testid="plant-library">
        <div className="dialog-head">
          <h2>Plant library</h2>
          <button className="btn icon ghost" aria-label="Close" onClick={() => set({ libraryOpen: false })}>
            <Icon name="close" />
          </button>
        </div>
        <p className="hint">
          {plants.length} plants. Tap one for details; edit any plant or add your own. All data is approximate.
        </p>
        <div className="actions">
          <button className="btn primary" onClick={() => set({ editing: newPlantDraft() })} data-testid="add-plant">
            <Icon name="plus" /> Add a plant
          </button>
        </div>
        <PlantFilters />
        <p className="hint">{list.length} shown</p>
        <ul className="plant-list">
          {list.slice(0, limit).map((p) => (
            <PlantRow key={p.id} plant={p} />
          ))}
        </ul>
        {list.length > limit && (
          <button className="btn ghost more" onClick={() => setLimit(limit + 60)}>
            Show more
          </button>
        )}
      </div>
    </div>
  );
}
