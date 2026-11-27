import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Garden, Id } from '../domain/types';
import { sortSummaries, toSummary, type GardenRepository } from './GardenRepository';
import { migrateGarden } from './migrations';

interface TuinDB extends DBSchema {
  gardens: { key: string; value: Garden };
  meta: { key: string; value: unknown };
  /** User-added or edited plants (used from phase 3). */
  plants: { key: string; value: { id: string } };
}

export const DB_NAME = 'tuin-tafereel';
const DB_VERSION = 1;

export function openTuinDb(name = DB_NAME): Promise<IDBPDatabase<TuinDB>> {
  return openDB<TuinDB>(name, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('gardens')) db.createObjectStore('gardens', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('plants')) db.createObjectStore('plants', { keyPath: 'id' });
    },
  });
}

export class IndexedDbGardenRepository implements GardenRepository {
  private db: Promise<IDBPDatabase<TuinDB>>;

  constructor(dbName = DB_NAME) {
    this.db = openTuinDb(dbName);
  }

  async list() {
    const all = await (await this.db).getAll('gardens');
    return sortSummaries(all.map(toSummary));
  }

  async get(id: Id) {
    const g = await (await this.db).get('gardens', id);
    return g ? migrateGarden(g) : undefined;
  }

  async save(garden: Garden) {
    await (await this.db).put('gardens', garden);
  }

  async delete(id: Id) {
    await (await this.db).delete('gardens', id);
  }

  async getLastOpenedId() {
    return (await (await this.db).get('meta', 'lastOpenedId')) as Id | undefined;
  }

  async setLastOpenedId(id: Id | undefined) {
    const db = await this.db;
    if (id) await db.put('meta', id, 'lastOpenedId');
    else await db.delete('meta', 'lastOpenedId');
  }
}
