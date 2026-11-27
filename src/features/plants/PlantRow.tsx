import type { Plant } from '../../domain/types';
import type { Suitability } from '../../domain/plants';
import { PlantThumb } from './PlantThumb';
import { usePlantUi } from './plantUiStore';
import { useUiStore } from '../../state/uiStore';
import { useGardenStore } from '../../state/gardenStore';
import { startPlacing } from '../placement/startPlacing';

export function PlantBadges({ plant }: { plant: Plant }) {
  return (
    <span className="badges">
      {plant.nativeBE && <span className="badge native">native</span>}
      {plant.attractsPollinators && <span className="badge bees" title="Good for pollinators">🐝</span>}
      {(plant.foliage === 'evergreen' || plant.foliage === 'semiEvergreen') && <span className="badge">evergreen</span>}
      {plant.edible && <span className="badge edible">edible</span>}
      {(plant.toxicity.children || plant.toxicity.pets) && (
        <span className="badge toxic" title={`Toxic to ${[plant.toxicity.children && 'children', plant.toxicity.pets && 'pets'].filter(Boolean).join(' and ')}`}>
          ⚠ toxic
        </span>
      )}
      {plant.source === 'user' && <span className="badge">my plant</span>}
      {plant.edited && <span className="badge">edited</span>}
    </span>
  );
}

export function PlantRow({ plant, suitability }: { plant: Plant; suitability?: Suitability }) {
  const open = () => usePlantUi.getState().set({ detail: { id: plant.id, suitability } });
  const editMode = useUiStore((s) => s.mode === 'edit');
  const hasGarden = useGardenStore((s) => !!s.garden);
  const canPlace = editMode && hasGarden;
  return (
    <li className={`plant-row ${suitability?.group ?? ''}`} data-testid={`plant-${plant.id}`}>
      <button className="plant-main" onClick={open}>
        <PlantThumb plant={plant} />
        <span className="names">
          <strong>{plant.names.en}</strong>
          <small>
            {plant.names.nl} · <i>{plant.names.latin}</i>
          </small>
        </span>
        {suitability && (
          <span className="score" aria-label={`Match ${Math.round(suitability.score * 100)}%`}>
            {Math.round(suitability.score * 100)}%
          </span>
        )}
      </button>
      {canPlace && (
        <button className="btn icon ghost place" aria-label={`Place ${plant.names.en} on the plan`} title="Place on the plan" onClick={() => startPlacing(plant.id)} data-testid={`place-${plant.id}`}>
          +
        </button>
      )}
      <div className="plant-meta">
        <PlantBadges plant={plant} />
        {suitability && suitability.reasons.length > 0 && <p className="reasons">{suitability.reasons.slice(0, 2).join(' · ')}</p>}
      </div>
    </li>
  );
}
