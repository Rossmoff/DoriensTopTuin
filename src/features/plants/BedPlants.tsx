import { useMemo } from 'react';
import type { PlantingArea } from '../../domain/types';
import { footprintPolygons, pointInPolygon } from '../../domain/geometry';
import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { useUiStore } from '../../state/uiStore';
import { plantColour } from './plantDisplay';
import { PlantSuggestions } from './PlantSuggestions';
import { SpotSummary } from './SpotSummary';
import { useSpot, type SpotTarget } from './useSpot';

/** Sun, soil and ranked plant suggestions for a bed. */
export function BedPlants({ bed }: { bed: PlantingArea }) {
  const target = useMemo<SpotTarget>(() => ({ kind: 'object', id: bed.id }), [bed.id]);
  const info = useSpot(target);
  const placements = useGardenStore((s) => s.garden?.placements);
  const plants = usePlantStore((s) => s.plants);
  const here = useMemo(() => {
    const polys = footprintPolygons(bed.geometry);
    return (placements ?? []).filter((p) => polys.some((poly) => pointInPolygon(p.center, poly)));
  }, [placements, bed.geometry]);
  if (!info) return null;
  return (
    <div data-testid="bed-plants">
      <SpotSummary info={info} />
      {here.length > 0 && (
        <div className="planted-here" data-testid="planted-here">
          <h3>Planted here ({here.reduce((s, p) => s + p.quantity, 0)})</h3>
          <ul className="object-list">
            {here.map((pl) => {
              const pp = plants.find((x) => x.id === pl.plantId);
              return (
                <li key={pl.id}>
                  <button className="btn" onClick={() => useUiStore.getState().select(pl.id)}>
                    <i className="swatch round" style={{ background: pp ? plantColour(pp) : '#999' }} /> {pp?.names.en ?? '?'}
                    <span className="meta">×{pl.quantity}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <h3>Suggestions</h3>
      <PlantSuggestions spot={info.spot} ediblesFirst={bed.kind === 'vegetableBed'} />
    </div>
  );
}
