import { useMemo } from 'react';
import type { PlantPlacement } from '../../domain/types';
import { placementRadius, scorePlant } from '../../domain/plants';
import { updatePlacement } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { useObjectActions } from '../panels/useObjectActions';
import { CATEGORY_LABEL, plantColour } from '../plants/plantDisplay';
import { usePlantUi } from '../plants/plantUiStore';
import { SpotSummary } from '../plants/SpotSummary';
import { useSpot, type SpotTarget } from '../plants/useSpot';
import { usePlanWarnings } from './usePlanWarnings';

const GROUP = { good: 'Good match here', possible: 'Possible here', unsuitable: 'Poor match here' };

export function PlacementProperties({ placement }: { placement: PlantPlacement }) {
  const update = useGardenStore((s) => s.update);
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === placement.plantId));
  const actions = useObjectActions(placement.id);
  const target = useMemo<SpotTarget>(() => ({ kind: 'point', p: placement.center }), [placement.center]);
  const info = useSpot(target);
  const warnings = usePlanWarnings().filter((w) => w.placementId === placement.id);
  const suit = plant && info ? scorePlant(plant, info.spot) : null;
  const key = (f: string) => ({ coalesceKey: `${placement.id}.${f}` });

  return (
    <div className="panel" data-testid="placement-properties">
      <h2>
        <i className="swatch round" style={{ background: plant ? plantColour(plant) : '#999' }} /> {plant?.names.en ?? 'Unknown plant'}
      </h2>
      {plant && (
        <p className="subtitle">
          {plant.names.nl} · <i>{plant.names.latin}</i> · {CATEGORY_LABEL[plant.category]}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="warnings" data-testid="placement-warnings">
          {warnings.map((w, i) => (
            <li key={i} className={w.severity}>
              {w.severity === 'warn' ? '⚠' : 'ℹ'} {w.message}
            </li>
          ))}
        </ul>
      )}
      <NumberField label="Number of plants" value={placement.quantity} min={1} max={500} step={1} decimals={0} testId="placement-qty" onChange={(v) => update((g) => updatePlacement(g, placement.id, { quantity: Math.max(1, Math.round(v)) }), key('qty'))} />
      <NumberField
        label="Spread"
        unit="m"
        value={placement.spreadOverrideM ?? plant?.size.spreadM ?? 0.5}
        min={0.05}
        onChange={(v) => update((g) => updatePlacement(g, placement.id, { spreadOverrideM: v }), key('spread'))}
      />
      <p className="readout">
        Circle Ø {(2 * placementRadius(placement, plant)).toFixed(2)} m{placement.quantity > 1 && plant ? ` (planted ${plant.size.plantingDistanceM} m apart)` : ''}
      </p>

      {info && (
        <>
          <h3>This spot</h3>
          <SpotSummary info={info} />
          {suit && (
            <div className={`match ${suit.group}`}>
              <strong>
                {GROUP[suit.group]} ({Math.round(suit.score * 100)}%)
              </strong>
              <ul>
                {suit.reasons.slice(0, 4).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <h3>Notes</h3>
      <label className="field wide">
        <textarea aria-label="Notes" value={placement.note ?? ''} onChange={(e) => update((g) => updatePlacement(g, placement.id, { note: e.target.value || undefined }), key('note'))} />
      </label>
      <div className="actions">
        {plant && (
          <button className="btn" onClick={() => usePlantUi.getState().set({ detail: { id: plant.id, suitability: suit ?? undefined } })}>
            Plant details
          </button>
        )}
        <button className="btn" onClick={actions.duplicate}>
          <Icon name="copy" /> Duplicate
        </button>
        <button className="btn danger" onClick={actions.remove} data-testid="delete-placement">
          <Icon name="trash" /> Remove
        </button>
      </div>
    </div>
  );
}
