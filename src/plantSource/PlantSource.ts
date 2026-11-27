import type { Id, Plant } from '../domain/types';

/**
 * Where plants come from. v1: builtin JSON + the user's own additions/edits in IndexedDB.
 * An external plant API can implement the same interface later.
 */
export interface PlantSource {
  all(): Promise<Plant[]>;
  get(id: Id): Promise<Plant | undefined>;
  /** Add a new plant or save an edited copy of a builtin one. */
  upsert(plant: Plant): Promise<void>;
  /** Delete a user plant, or reset an edited builtin plant to its original. */
  remove(id: Id): Promise<void>;
}
