import { nanoid } from 'nanoid';
import type { Garden, SiteProfile, Vec2 } from '../domain/types';

export const DEFAULT_LOCATION = { lat: 50.96, lon: 5.45, timeZone: 'Europe/Brussels' };

/**
 * Bodemkaart: "matig droge zandbodem met duidelijke ijzer- en/of humus B-horizont"
 * (moderately dry sandy podzol, Kempen). Fast-draining, acidic, nutrient-poor.
 */
export const DEFAULT_SITE: SiteProfile = {
  soil: {
    texture: 'sand',
    pH: 5.0,
    pHSource: 'estimated',
    drainage: 'fast',
    moisture: 'dry',
    organicMatter: 'low',
  },
  climate: { usdaZone: '8a', lastFrost: '05-15', firstFrost: '10-25' },
  soilMapNote: 'Matig droge zandbodem met duidelijke ijzer- en/of humus B-horizont (Kempen podzol)',
};

export function rectBoundary(width: number, length: number): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ];
}

export function createGarden(opts: { name: string; width?: number; length?: number; boundary?: Vec2[] }): Garden {
  const now = new Date().toISOString();
  return {
    id: nanoid(12),
    name: opts.name,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    location: { ...DEFAULT_LOCATION },
    planUpBearingDeg: 0,
    boundary: opts.boundary ?? rectBoundary(opts.width ?? 20, opts.length ?? 30),
    objects: [],
    zones: [],
    placements: [],
    site: structuredClone(DEFAULT_SITE),
    sunCorrection: { enabled: false, azimuthOffsetDeg: 0, altitudeFactor: 1 },
    settings: {
      gridSizeM: 0.5,
      snap: true,
      leafSeason: { fromMonth: 5, toMonth: 10 },
      leaflessTransmission: 0.7,
      hiddenGroups: [],
    },
  };
}
