import type { IDBPDatabase } from 'idb';
import type { Id, Plant } from '../domain/types';
import { BUILTIN_PLANTS } from '../data/plants';
import { openTuinDb } from '../storage/IndexedDbGardenRepository';
import type { PlantSource } from './PlantSource';

type Db = Awaited<ReturnType<typeof openTuinDb>>;

/** Builtin plants merged with user plants stored in IndexedDB (same id = user edit wins). */
export class LocalPlantSource implements PlantSource {
  private db: Promise<Db> | null;
  private memory = new Map<Id, Plant>();

  constructor(dbName?: string) {
    this.db = typeof indexedDB !== 'undefined' ? openTuinDb(dbName) : null;
  }

  private async userPlants(): Promise<Plant[]> {
    if (!this.db) return [...this.memory.values()];
    return ((await (await this.db).getAll('plants')) as unknown as Plant[]) ?? [];
  }

  async all(): Promise<Plant[]> {
    const user = new Map((await this.userPlants()).map((p) => [p.id, p]));
    const merged = BUILTIN_PLANTS.map((p) => user.get(p.id) ?? p);
    for (const p of user.values()) if (!BUILTIN_PLANTS.some((b) => b.id === p.id)) merged.push(p);
    return merged;
  }

  async get(id: Id) {
    return (await this.all()).find((p) => p.id === id);
  }

  async upsert(plant: Plant) {
    const isBuiltin = BUILTIN_PLANTS.some((b) => b.id === plant.id);
    const toSave: Plant = isBuiltin ? { ...plant, source: 'builtin', edited: true } : { ...plant, source: 'user' };
    if (!this.db) this.memory.set(plant.id, toSave);
    else await (await this.db).put('plants', toSave as unknown as { id: string });
  }

  async remove(id: Id) {
    if (!this.db) this.memory.delete(id);
    else await (await (this.db as Promise<IDBPDatabase<unknown>>)).delete('plants', id);
  }
}

export const isBuiltinId = (id: Id) => BUILTIN_PLANTS.some((b) => b.id === id);
export const builtinPlant = (id: Id) => BUILTIN_PLANTS.find((b) => b.id === id);
