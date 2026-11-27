import type { Id, Level3, Month, Vec2 } from './common';
import type { Moisture, SoilTexture } from './site';

export type PlantCategory =
  | 'perennial' | 'grass' | 'fern' | 'shrub' | 'climber' | 'bulb' | 'tree'
  | 'groundcover' | 'heather' | 'vegetable' | 'herb' | 'fruit';

export type SunNeed = 'fullSun' | 'partialShade' | 'shade';

export type Colour =
  | 'white' | 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'green' | 'brown';

export interface Plant {
  /** Slug, e.g. "calluna-vulgaris". */
  id: Id;
  names: { en: string; nl: string; latin: string };
  category: PlantCategory;
  needs: {
    sun: SunNeed[];
    soils: SoilTexture[];
    pH: { min: number; max: number };
    moisture: Moisture[];
    droughtTolerance: Level3;
    usdaZoneMin: number;
    /** How much the plant wants rich soil (mainly vegetables). */
    fertility?: Level3;
  };
  size: { heightM: number; spreadM: number; plantingDistanceM: number };
  lifecycle: 'annual' | 'biennial' | 'perennial';
  foliage: 'evergreen' | 'semiEvergreen' | 'deciduous' | 'herbaceous';
  nativeBE: boolean;
  attractsPollinators: boolean;
  ornamental?: {
    flowerColours: Colour[];
    floweringMonths: Month[];
    foliageColour?: Colour | 'variegated' | 'silver';
    colourMonths?: Month[];
    winterInterest: boolean;
  };
  edible?: {
    sowIndoors?: Month[];
    sowOutdoors?: Month[];
    plantOut?: Month[];
    harvest: Month[];
    goodCompanions: Id[];
    badCompanions: Id[];
  };
  toxicity: { children: boolean; pets: boolean; note?: string };
  /** For builtin plants edited by the user. */
  edited?: boolean;
  /** User's own photo (small data URL); overrides the builtin photo. */
  photo?: string;
  source: 'builtin' | 'user';
  approximate: boolean;
  notes?: string;
}

export interface PlantPlacement {
  id: Id;
  plantId: Id;
  center: Vec2;
  quantity: number;
  spreadOverrideM?: number;
  note?: string;
}
