import type { Level3, MonthDay } from './common';

export type SoilTexture = 'sand' | 'loamySand' | 'loam' | 'clay' | 'peat';
export type Moisture = 'dry' | 'moderate' | 'moist' | 'wet';
export type Drainage = 'fast' | 'moderate' | 'slow';

export interface SoilProfile {
  texture: SoilTexture;
  pH: number;
  pHSource: 'measured' | 'estimated';
  drainage: Drainage;
  moisture: Moisture;
  organicMatter: Level3;
}

export interface ClimateProfile {
  /** USDA hardiness zone, e.g. "8a". */
  usdaZone: string;
  lastFrost: MonthDay;
  firstFrost: MonthDay;
}

export interface SiteProfile {
  soil: SoilProfile;
  climate: ClimateProfile;
  soilMapNote?: string;
}

export const SOIL_TEXTURE_LABELS: Record<SoilTexture, { en: string; nl: string }> = {
  sand: { en: 'Sand', nl: 'Zand' },
  loamySand: { en: 'Loamy sand', nl: 'Lemig zand' },
  loam: { en: 'Loam', nl: 'Leem' },
  clay: { en: 'Clay', nl: 'Klei' },
  peat: { en: 'Peat', nl: 'Veen' },
};

export const MOISTURE_LABELS: Record<Moisture, { en: string; nl: string }> = {
  dry: { en: 'Dry', nl: 'Droog' },
  moderate: { en: 'Moderate', nl: 'Matig droog – matig nat' },
  moist: { en: 'Moist', nl: 'Vochtig' },
  wet: { en: 'Wet', nl: 'Nat' },
};
