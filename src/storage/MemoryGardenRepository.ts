import type { Garden, Id } from '../domain/types';
import { sortSummaries, toSummary, type GardenRepository } from './GardenRepository';

/** In-memory repository for tests and as a fallback when IndexedDB is unavailable. */
export class MemoryGardenRepository implements GardenRepository {
  private gardens = new Map<Id, Garden>();
  private last: Id | undefined;

  async list() {
    return sortSummaries([...this.gardens.values()].map(toSummary));
  }
  async get(id: Id) {
    const g = this.gardens.get(id);
    return g ? structuredClone(g) : undefined;
  }
  async save(g: Garden) {
    this.gardens.set(g.id, structuredClone(g));
  }
  async delete(id: Id) {
    this.gardens.delete(id);
  }
  async getLastOpenedId() {
    return this.last;
  }
  async setLastOpenedId(id: Id | undefined) {
    this.last = id;
  }
}
