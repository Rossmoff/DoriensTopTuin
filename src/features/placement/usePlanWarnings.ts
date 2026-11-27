import { useMemo } from 'react';
import type { Id } from '../../domain/types';
import { computeWarnings, gardenPlantLookup, type PlacementWarning } from '../../domain/plants';
import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { useSunStore } from '../../state/sunStore';
import { spotFor } from '../plants/useSpot';

/** All plan-check warnings for placed plants (recomputed when the garden, plants or sun map change). */
export function usePlanWarnings(): PlacementWarning[] {
  const garden = useGardenStore((s) => s.garden);
  const plants = usePlantStore((s) => s.plants);
  const season = useSunStore((s) => s.season?.result ?? null);
  return useMemo(() => {
    if (!garden || garden.placements.length === 0) return [];
    const lookup = gardenPlantLookup(plants);
    return computeWarnings(garden, lookup, (p) => spotFor(garden, { kind: 'point', p }, season)?.spot ?? null, {
      toxic: garden.settings.toxicWarnings ?? { children: true, pets: true },
    });
  }, [garden, plants, season]);
}

export function warningsByPlacement(ws: PlacementWarning[]): Map<Id, PlacementWarning[]> {
  const m = new Map<Id, PlacementWarning[]>();
  for (const w of ws) m.set(w.placementId, [...(m.get(w.placementId) ?? []), w]);
  return m;
}
