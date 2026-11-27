import type { Moisture, SoilProfile, SoilTexture, ZoneKind } from '../types';

export const MOISTURE_ORDER: Moisture[] = ['dry', 'moderate', 'moist', 'wet'];
/** Texture scale from light to heavy; peat is treated separately. */
export const TEXTURE_ORDER: SoilTexture[] = ['sand', 'loamySand', 'loam', 'clay'];

export const moistureIndex = (m: Moisture) => MOISTURE_ORDER.indexOf(m);

/**
 * Soil at a spot: the site profile, overridden by a bed's own soil, then adjusted by manual zones
 * ("wet" → wet, "extra dry" → dry).
 */
export function effectiveSoil(site: SoilProfile, override: Partial<SoilProfile> | undefined, zones: ZoneKind[] = []): SoilProfile {
  const soil: SoilProfile = { ...site, ...(override ?? {}) };
  if (zones.includes('wet')) soil.moisture = 'wet';
  else if (zones.includes('extraDry')) soil.moisture = 'dry';
  return soil;
}

/** "8a" → 8, "8b" → 8.5 */
export function zoneNumber(zone: string): number {
  const m = /^(\d+)([ab])?$/i.exec(zone.trim());
  if (!m) return Number.NaN;
  return Number(m[1]) + (m[2]?.toLowerCase() === 'b' ? 0.5 : 0);
}
