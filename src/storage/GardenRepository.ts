import type { Garden, GardenSummary, Id } from '../domain/types';

/**
 * Persistence boundary for garden plans. v1 uses IndexedDB; a sync backend
 * (Node/Express/MongoDB) can implement the same interface later.
 */
export interface GardenRepository {
  list(): Promise<GardenSummary[]>;
  get(id: Id): Promise<Garden | undefined>;
  save(garden: Garden): Promise<void>;
  delete(id: Id): Promise<void>;
  getLastOpenedId(): Promise<Id | undefined>;
  setLastOpenedId(id: Id | undefined): Promise<void>;
}

export const toSummary = (g: Garden): GardenSummary => ({
  id: g.id,
  name: g.name,
  updatedAt: g.updatedAt,
  objectCount: g.objects.length,
});

export const sortSummaries = (s: GardenSummary[]) =>
  [...s].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
