import type { GardenObject, ObjectKind } from '../../domain/types';

/** Paint order tiers so a lawn drawn later does not cover the house. */
const TIER: Record<ObjectKind, number> = {
  lawn: 0,
  terrace: 1, path: 1, driveway: 1,
  border: 2, bed: 2, vegetableBed: 2, pond: 2,
  house: 3, garage: 3, shed: 3, greenhouse: 3, carport: 3, neighbourBuilding: 3,
  fence: 4, wall: 4, hedge: 4,
  shrub: 5, tree: 6, neighbourTree: 6,
};

export function paintOrder(objects: GardenObject[]): GardenObject[] {
  return objects
    .map((o, i) => ({ o, i }))
    .sort((a, b) => TIER[a.o.kind] - TIER[b.o.kind] || a.i - b.i)
    .map((x) => x.o);
}
