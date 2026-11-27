import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createGarden } from '../data/defaults';
import { createObject, defaultGeometry } from '../data/objectCatalog';
import { IndexedDbGardenRepository } from './IndexedDbGardenRepository';
import { parseGardenJson, serializeGarden } from './jsonIO';
import { migrateGarden } from './migrations';

function sampleGarden() {
  const g = createGarden({ name: 'Test garden', width: 20, length: 30 });
  g.objects.push(createObject('house', defaultGeometry('house', 'rect', { x: 10, y: 5 })));
  g.objects.push(createObject('tree', defaultGeometry('tree', 'circle', { x: 4, y: 20 })));
  g.objects.push(createObject('fence', defaultGeometry('fence', 'polyline', { x: 10, y: 30 })));
  return g;
}

describe('IndexedDbGardenRepository', () => {
  it('saves, lists, loads and deletes gardens', async () => {
    const repo = new IndexedDbGardenRepository('test-db-1');
    const g = sampleGarden();
    await repo.save(g);
    expect(await repo.list()).toEqual([
      { id: g.id, name: 'Test garden', updatedAt: g.updatedAt, objectCount: 3 },
    ]);
    expect(await repo.get(g.id)).toEqual(g);
    await repo.setLastOpenedId(g.id);
    expect(await repo.getLastOpenedId()).toBe(g.id);
    await repo.delete(g.id);
    expect(await repo.list()).toEqual([]);
  });

  it('survives a new connection (app restart)', async () => {
    const g = sampleGarden();
    await new IndexedDbGardenRepository('test-db-2').save(g);
    const reopened = new IndexedDbGardenRepository('test-db-2');
    expect(await reopened.get(g.id)).toEqual(g);
  });
});

describe('JSON import/export', () => {
  it('round-trips a garden exactly', () => {
    const g = sampleGarden();
    expect(parseGardenJson(serializeGarden(g))).toEqual(g);
  });

  it('accepts a bare garden object', () => {
    const g = sampleGarden();
    expect(parseGardenJson(JSON.stringify(g))).toEqual(g);
  });

  it('rejects non-garden files with a clear message', () => {
    expect(() => parseGardenJson('not json')).toThrow(/not valid JSON/);
    expect(() => parseGardenJson('{"hello": 1}')).toThrow(/garden plan/);
  });

  it('fills in missing fields from defaults', () => {
    const g = migrateGarden({ name: 'Old', boundary: [], objects: [], settings: { gridSizeM: 1 } });
    expect(g.settings.gridSizeM).toBe(1);
    expect(g.settings.snap).toBe(true);
    expect(g.site.soil.texture).toBe('sand');
  });

  it('refuses plans from a newer schema', () => {
    expect(() => migrateGarden({ schemaVersion: 99, boundary: [], objects: [] })).toThrow(/newer version/);
  });
});
