import { useMemo } from 'react';
import type { PlantingArea } from '../../domain/types';
import { useSeasonSunMap } from '../sun/useSunHoursJob';
import { PlantSuggestions } from './PlantSuggestions';
import { SpotSummary } from './SpotSummary';
import { useSpot, type SpotTarget } from './useSpot';

/** Sun, soil and ranked plant suggestions for a bed. */
export function BedPlants({ bed }: { bed: PlantingArea }) {
  useSeasonSunMap(true);
  const target = useMemo<SpotTarget>(() => ({ kind: 'object', id: bed.id }), [bed.id]);
  const info = useSpot(target);
  if (!info) return null;
  return (
    <div data-testid="bed-plants">
      <SpotSummary info={info} />
      <PlantSuggestions spot={info.spot} ediblesFirst={bed.kind === 'vegetableBed'} />
    </div>
  );
}
