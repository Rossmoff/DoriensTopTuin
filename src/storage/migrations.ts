import type { Garden } from '../domain/types';
import { createGarden } from '../data/defaults';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Bring a stored/imported garden up to the current schema.
 * Fills in any missing top-level fields from defaults so older files keep loading.
 */
export function migrateGarden(raw: unknown): Garden {
  if (!raw || typeof raw !== 'object') throw new Error('Not a garden object');
  const g = raw as Partial<Garden> & { schemaVersion?: number };
  if ((g.schemaVersion ?? 1) > CURRENT_SCHEMA_VERSION) {
    throw new Error(`This plan was made with a newer version of the app (schema ${g.schemaVersion}).`);
  }
  const d = createGarden({ name: g.name ?? 'Garden' });
  return {
    ...d,
    ...g,
    id: g.id ?? d.id,
    schemaVersion: 1,
    location: { ...d.location, ...g.location },
    site: {
      ...d.site,
      ...g.site,
      soil: { ...d.site.soil, ...g.site?.soil },
      climate: { ...d.site.climate, ...g.site?.climate },
    },
    sunCorrection: { ...d.sunCorrection, ...g.sunCorrection },
    settings: { ...d.settings, ...g.settings },
    objects: g.objects ?? [],
    zones: g.zones ?? [],
    placements: g.placements ?? [],
    boundary: g.boundary ?? d.boundary,
  };
}
