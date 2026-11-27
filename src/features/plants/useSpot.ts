import { useMemo } from 'react';
import type { Garden, PlantingArea, Vec2 } from '../../domain/types';
import { centroid, footprintPolygons, pointInPolygon } from '../../domain/geometry';
import { averageSunHoursIn, cellIndexAt, zonesAt, type SunHoursResult } from '../../domain/sun';
import { effectiveSoil, type SpotConditions } from '../../domain/plants';
import { isPlantingKind } from '../../data/objectCatalog';
import { paintOrder } from '../editor/zOrder';
import { useGardenStore } from '../../state/gardenStore';
import { useSunStore } from '../../state/sunStore';

export type SpotTarget = { kind: 'object'; id: string } | { kind: 'point'; p: Vec2 };

export interface SpotInfo {
  spot: SpotConditions;
  /** The bed whose soil applies (selected bed, or the bed under a tapped point). */
  bed: PlantingArea | null;
  /** True while the growing-season sun map is still being calculated. */
  sunPending: boolean;
}

function hoursAt(result: SunHoursResult, p: Vec2): number | null {
  const i = cellIndexAt(result.grid, p);
  const h = i === null ? NaN : result.hours[i];
  return Number.isNaN(h) ? null : h;
}

export function bedAt(g: Garden, p: Vec2): PlantingArea | null {
  const beds = paintOrder(g.objects).filter((o): o is PlantingArea => isPlantingKind(o.kind) && o.kind !== 'lawn');
  for (let i = beds.length - 1; i >= 0; i--) {
    if (footprintPolygons(beds[i].geometry).some((poly) => pointInPolygon(p, poly))) return beds[i];
  }
  return null;
}

export function spotFor(g: Garden, target: SpotTarget, season: SunHoursResult | null): Omit<SpotInfo, 'sunPending'> | null {
  if (target.kind === 'object') {
    const obj = g.objects.find((o) => o.id === target.id);
    if (!obj) return null;
    const polys = footprintPolygons(obj.geometry);
    const c = centroid(polys[0] ?? []);
    let sunHours: number | null = null;
    if (season) {
      const vals = polys.map((poly) => averageSunHoursIn(season, poly)).filter((v): v is number => v !== null);
      sunHours = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : hoursAt(season, c);
    }
    const zones = zonesAt(c, g.zones);
    const bed = isPlantingKind(obj.kind) ? (obj as PlantingArea) : null;
    return {
      bed,
      spot: { sunHours, zones, soil: effectiveSoil(g.site.soil, bed?.soilOverride, zones), usdaZone: g.site.climate.usdaZone },
    };
  }
  const bed = bedAt(g, target.p);
  const zones = zonesAt(target.p, g.zones);
  return {
    bed,
    spot: {
      sunHours: season ? hoursAt(season, target.p) : null,
      zones,
      soil: effectiveSoil(g.site.soil, bed?.soilOverride, zones),
      usdaZone: g.site.climate.usdaZone,
    },
  };
}

export function useSpot(target: SpotTarget | null): SpotInfo | null {
  const garden = useGardenStore((s) => s.garden);
  const season = useSunStore((s) => s.season?.result ?? null);
  const pending = useSunStore((s) => s.seasonProgress !== null || s.season === null);
  return useMemo(() => {
    if (!garden || !target) return null;
    const r = spotFor(garden, target, season);
    return r ? { ...r, sunPending: pending && r.spot.sunHours === null } : null;
  }, [garden, target, season, pending]);
}
