import type { Id, Month, Vec2 } from './common';
import type { SiteProfile, SoilProfile } from './site';
import type { PlantPlacement } from './plant';

export type ObjectKind =
  | 'house' | 'garage' | 'shed' | 'greenhouse' | 'carport'
  | 'fence' | 'wall' | 'hedge'
  | 'tree' | 'shrub'
  | 'terrace' | 'path' | 'driveway'
  | 'border' | 'bed' | 'vegetableBed' | 'lawn' | 'pond'
  | 'neighbourBuilding' | 'neighbourTree';

export type ObjectGroup = 'buildings' | 'boundaries' | 'trees' | 'surfaces' | 'planting' | 'neighbours';

export interface RectGeometry {
  type: 'rect';
  center: Vec2;
  width: number;
  length: number;
  rotationDeg: number;
}
export interface PolygonGeometry {
  type: 'polygon';
  points: Vec2[];
}
export interface PolylineGeometry {
  type: 'polyline';
  points: Vec2[];
  thickness: number;
}
export interface CircleGeometry {
  type: 'circle';
  center: Vec2;
  radius: number;
}
export type Geometry = RectGeometry | PolygonGeometry | PolylineGeometry | CircleGeometry;
export type GeometryType = Geometry['type'];

export type Foliage = 'deciduous' | 'evergreen';

interface BaseObject {
  id: Id;
  label: string;
  geometry: Geometry;
  /** Height in metres. 0 for flat things (lawn, terrace). */
  height: number;
  /** 0..1, how much light the object blocks. */
  shadowOpacity: number;
  locked?: boolean;
  notes?: string;
}

export type TreeKind = 'tree' | 'shrub' | 'neighbourTree';
export type PlantingKind = 'border' | 'bed' | 'vegetableBed' | 'lawn' | 'pond';
export type StructureKind = Exclude<ObjectKind, TreeKind | PlantingKind>;

export interface TreeObject extends BaseObject {
  kind: TreeKind;
  geometry: CircleGeometry;
  /** Height of the bottom of the crown, metres. */
  crownBaseHeight: number;
  foliage: Foliage;
}

export interface PlantingArea extends BaseObject {
  kind: PlantingKind;
  soilOverride?: Partial<SoilProfile>;
}

export interface StructureObject extends BaseObject {
  kind: StructureKind;
  /** Hedges only. */
  foliage?: Foliage;
}

export type GardenObject = TreeObject | PlantingArea | StructureObject;

export type ZoneKind = 'shady' | 'wet' | 'extraDry';
export interface ManualZone {
  id: Id;
  kind: ZoneKind;
  points: Vec2[];
  label?: string;
}

export interface SunCorrection {
  enabled: boolean;
  azimuthOffsetDeg: number;
  altitudeFactor: number;
  observed?: {
    sunriseBearingDeg?: number;
    sunsetBearingDeg?: number;
    noonAltitudeDeg?: number;
    date: string;
  };
}

export interface GardenSettings {
  gridSizeM: number;
  snap: boolean;
  /** Months in which deciduous trees are in leaf (inclusive). */
  leafSeason: { fromMonth: Month; toMonth: Month };
  /** Fraction of light passing through a leafless deciduous crown. */
  leaflessTransmission: number;
  hiddenGroups: (ObjectGroup | 'zones' | 'plants')[];
  /** Warn about placed plants that are toxic to children and/or pets. */
  toxicWarnings?: { children: boolean; pets: boolean };
}

export interface Garden {
  id: Id;
  name: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  location: { lat: number; lon: number; timeZone: string };
  /** Compass bearing (degrees clockwise from true north) that "up" on the plan points to. */
  planUpBearingDeg: number;
  boundary: Vec2[];
  objects: GardenObject[];
  zones: ManualZone[];
  placements: PlantPlacement[];
  site: SiteProfile;
  sunCorrection: SunCorrection;
  settings: GardenSettings;
}

export interface GardenSummary {
  id: Id;
  name: string;
  updatedAt: string;
  objectCount: number;
}
