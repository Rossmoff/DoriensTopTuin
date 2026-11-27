import { nanoid } from 'nanoid';
import type {
  Foliage, Geometry, GeometryType, GardenObject, ObjectGroup, ObjectKind, Vec2,
} from '../domain/types';

export interface KindInfo {
  kind: ObjectKind;
  group: ObjectGroup;
  label: string;
  icon: string;
  /** Shapes the kind can be drawn as; the first is the default. */
  shapes: GeometryType[];
  height: number;
  shadowOpacity?: number;
  /** Fill colour (light theme). */
  fill: string;
  stroke: string;
  /** Default size when placed with a single tap. */
  size: { width?: number; length?: number; radius?: number; thickness?: number; lineLength?: number };
  foliage?: Foliage;
  crownBaseHeight?: number;
}

export const GROUPS: { id: ObjectGroup; label: string }[] = [
  { id: 'buildings', label: 'Buildings' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'trees', label: 'Trees & shrubs' },
  { id: 'surfaces', label: 'Hard surfaces' },
  { id: 'planting', label: 'Planting areas' },
  { id: 'neighbours', label: 'Neighbours' },
];

const K = (info: KindInfo) => info;

export const KINDS: Record<ObjectKind, KindInfo> = {
  house: K({ kind: 'house', group: 'buildings', label: 'House', icon: '🏠', shapes: ['rect', 'polygon'], height: 6, fill: '#c9a48a', stroke: '#6d4c3d', size: { width: 10, length: 9 } }),
  garage: K({ kind: 'garage', group: 'buildings', label: 'Garage', icon: '🚗', shapes: ['rect', 'polygon'], height: 2.8, fill: '#bfae9c', stroke: '#6d5c4d', size: { width: 3.5, length: 6 } }),
  shed: K({ kind: 'shed', group: 'buildings', label: 'Shed', icon: '🛖', shapes: ['rect', 'polygon'], height: 2.2, fill: '#a98b6b', stroke: '#5e4630', size: { width: 3, length: 2 } }),
  greenhouse: K({ kind: 'greenhouse', group: 'buildings', label: 'Greenhouse', icon: '🪟', shapes: ['rect'], height: 2.4, shadowOpacity: 0.3, fill: '#d6ecef', stroke: '#5b8f96', size: { width: 3, length: 2.5 } }),
  carport: K({ kind: 'carport', group: 'buildings', label: 'Carport', icon: '🅿️', shapes: ['rect'], height: 2.5, fill: '#cfc8c0', stroke: '#6f6a64', size: { width: 3, length: 5 } }),
  fence: K({ kind: 'fence', group: 'boundaries', label: 'Fence', icon: '🚧', shapes: ['polyline'], height: 1.8, fill: '#8a6a48', stroke: '#8a6a48', size: { thickness: 0.05, lineLength: 5 } }),
  wall: K({ kind: 'wall', group: 'boundaries', label: 'Wall', icon: '🧱', shapes: ['polyline'], height: 2, fill: '#9c5b45', stroke: '#9c5b45', size: { thickness: 0.2, lineLength: 5 } }),
  hedge: K({ kind: 'hedge', group: 'boundaries', label: 'Hedge', icon: '🌿', shapes: ['polyline'], height: 1.8, fill: '#3f7a3a', stroke: '#3f7a3a', size: { thickness: 0.8, lineLength: 5 }, foliage: 'evergreen' }),
  tree: K({ kind: 'tree', group: 'trees', label: 'Tree', icon: '🌳', shapes: ['circle'], height: 8, fill: '#5d9a4e', stroke: '#2f5e27', size: { radius: 3 }, foliage: 'deciduous', crownBaseHeight: 2.5 }),
  shrub: K({ kind: 'shrub', group: 'trees', label: 'Large shrub', icon: '🌲', shapes: ['circle'], height: 2.5, fill: '#7bb062', stroke: '#3b6a2c', size: { radius: 1 }, foliage: 'deciduous', crownBaseHeight: 0 }),
  terrace: K({ kind: 'terrace', group: 'surfaces', label: 'Terrace', icon: '⬜', shapes: ['rect', 'polygon'], height: 0, fill: '#d9d4cb', stroke: '#8d877c', size: { width: 5, length: 4 } }),
  path: K({ kind: 'path', group: 'surfaces', label: 'Path', icon: '👣', shapes: ['polyline', 'rect'], height: 0, fill: '#d7cbb5', stroke: '#d7cbb5', size: { thickness: 1, lineLength: 5, width: 1, length: 5 } }),
  driveway: K({ kind: 'driveway', group: 'surfaces', label: 'Driveway', icon: '🛣️', shapes: ['rect', 'polygon'], height: 0, fill: '#c4c1bb', stroke: '#7f7b74', size: { width: 3, length: 8 } }),
  border: K({ kind: 'border', group: 'planting', label: 'Border', icon: '🌷', shapes: ['polygon', 'rect'], height: 0, fill: '#e3c9a3', stroke: '#9c7a45', size: { width: 6, length: 1.5 } }),
  bed: K({ kind: 'bed', group: 'planting', label: 'Bed', icon: '🌼', shapes: ['rect', 'polygon', 'circle'], height: 0, fill: '#dcc196', stroke: '#8f6c3a', size: { width: 3, length: 2, radius: 1.5 } }),
  vegetableBed: K({ kind: 'vegetableBed', group: 'planting', label: 'Vegetable bed', icon: '🥕', shapes: ['rect', 'polygon'], height: 0, fill: '#b78f5f', stroke: '#6e4f28', size: { width: 1.2, length: 3 } }),
  lawn: K({ kind: 'lawn', group: 'planting', label: 'Lawn', icon: '🟩', shapes: ['polygon', 'rect'], height: 0, fill: '#b5d99c', stroke: '#6e9a52', size: { width: 8, length: 6 } }),
  pond: K({ kind: 'pond', group: 'planting', label: 'Pond', icon: '💧', shapes: ['polygon', 'circle', 'rect'], height: 0, fill: '#8ec5e8', stroke: '#3c7ea8', size: { radius: 1.5, width: 3, length: 2 } }),
  neighbourBuilding: K({ kind: 'neighbourBuilding', group: 'neighbours', label: "Neighbour's building", icon: '🏘️', shapes: ['rect', 'polygon'], height: 6, fill: '#c7bfb8', stroke: '#6b625b', size: { width: 10, length: 9 } }),
  neighbourTree: K({ kind: 'neighbourTree', group: 'neighbours', label: 'Neighbouring tree', icon: '🌲', shapes: ['circle'], height: 15, fill: '#6f9461', stroke: '#2f4f27', size: { radius: 3 }, foliage: 'evergreen', crownBaseHeight: 6 }),
};

export const KIND_LIST = Object.values(KINDS);

export const kindInfo = (kind: ObjectKind): KindInfo => KINDS[kind];

export const isTreeKind = (k: ObjectKind): k is 'tree' | 'shrub' | 'neighbourTree' =>
  k === 'tree' || k === 'shrub' || k === 'neighbourTree';

export const isPlantingKind = (k: ObjectKind): k is 'border' | 'bed' | 'vegetableBed' | 'lawn' | 'pond' =>
  KINDS[k].group === 'planting';

/** Default geometry of a given type for `kind`, centred at `at`. */
export function defaultGeometry(kind: ObjectKind, type: GeometryType, at: Vec2): Geometry {
  const s = KINDS[kind].size;
  const w = s.width ?? 2;
  const l = s.length ?? 2;
  switch (type) {
    case 'rect':
      return { type: 'rect', center: at, width: w, length: l, rotationDeg: 0 };
    case 'circle':
      return { type: 'circle', center: at, radius: s.radius ?? Math.min(w, l) / 2 };
    case 'polyline': {
      const half = (s.lineLength ?? 4) / 2;
      return {
        type: 'polyline',
        points: [{ x: at.x - half, y: at.y }, { x: at.x + half, y: at.y }],
        thickness: s.thickness ?? 0.1,
      };
    }
    case 'polygon':
      return {
        type: 'polygon',
        points: [
          { x: at.x - w / 2, y: at.y - l / 2 },
          { x: at.x + w / 2, y: at.y - l / 2 },
          { x: at.x + w / 2, y: at.y + l / 2 },
          { x: at.x - w / 2, y: at.y + l / 2 },
        ],
      };
  }
}

/** Build a new object of `kind` with sensible defaults. */
export function createObject(kind: ObjectKind, geometry: Geometry, existing: GardenObject[] = []): GardenObject {
  const info = KINDS[kind];
  const sameKind = existing.filter((o) => o.kind === kind).length;
  const label = sameKind === 0 ? info.label : `${info.label} ${sameKind + 1}`;
  const base = {
    id: nanoid(10),
    label,
    height: info.height,
    shadowOpacity: info.shadowOpacity ?? 1,
  };
  if (isTreeKind(kind)) {
    const circle = geometry.type === 'circle' ? geometry : { type: 'circle' as const, center: { x: 0, y: 0 }, radius: info.size.radius ?? 1 };
    return {
      ...base,
      kind,
      geometry: circle,
      crownBaseHeight: info.crownBaseHeight ?? 0,
      foliage: info.foliage ?? 'deciduous',
    };
  }
  if (isPlantingKind(kind)) {
    return { ...base, kind, geometry };
  }
  return { ...base, kind, geometry, ...(info.foliage ? { foliage: info.foliage } : {}) } as GardenObject;
}
