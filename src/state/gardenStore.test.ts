import { beforeEach, describe, expect, it } from 'vitest';
import { createGarden } from '../data/defaults';
import { createObject, defaultGeometry } from '../data/objectCatalog';
import { addObject, deleteObject, duplicateObject, rotateObject, updateObject } from './gardenActions';
import { useGardenStore } from './gardenStore';

const s = () => useGardenStore.getState();

beforeEach(() => s().load(createGarden({ name: 'G', width: 10, length: 10 })));

describe('garden store history', () => {
  it('undoes and redoes edits', () => {
    const house = createObject('house', defaultGeometry('house', 'rect', { x: 5, y: 5 }));
    s().update((g) => addObject(g, house));
    expect(s().garden!.objects).toHaveLength(1);
    s().undo();
    expect(s().garden!.objects).toHaveLength(0);
    s().redo();
    expect(s().garden!.objects).toHaveLength(1);
  });

  it('clears redo after a new edit', () => {
    const shed = createObject('shed', defaultGeometry('shed', 'rect', { x: 2, y: 2 }));
    s().update((g) => addObject(g, shed));
    s().undo();
    s().update((g) => ({ ...g, name: 'Renamed' }));
    expect(s().future).toHaveLength(0);
  });

  it('coalesces rapid edits with the same key into one undo step', () => {
    const shed = createObject('shed', defaultGeometry('shed', 'rect', { x: 2, y: 2 }));
    s().update((g) => addObject(g, shed));
    for (const h of [2.3, 2.4, 2.5]) {
      s().update((g) => updateObject(g, shed.id, { height: h }), { coalesceKey: `${shed.id}.height` });
    }
    expect(s().garden!.objects[0].height).toBe(2.5);
    s().undo();
    expect(s().garden!.objects[0].height).toBe(2.2);
  });

  it('ignores no-op updates', () => {
    s().update((g) => g);
    expect(s().past).toHaveLength(0);
  });
});

describe('garden actions', () => {
  it('duplicates with an offset and deletes', () => {
    let g = createGarden({ name: 'G' });
    const tree = createObject('tree', defaultGeometry('tree', 'circle', { x: 5, y: 5 }));
    g = addObject(g, tree);
    const { garden, newId } = duplicateObject(g, tree.id);
    expect(garden.objects).toHaveLength(2);
    const copy = garden.objects.find((o) => o.id === newId)!;
    expect(copy.geometry).toMatchObject({ center: { x: 5.5, y: 5.5 } });
    expect(deleteObject(garden, tree.id).objects.map((o) => o.id)).toEqual([newId]);
  });

  it('rotates rects and polylines', () => {
    let g = createGarden({ name: 'G' });
    const house = createObject('house', defaultGeometry('house', 'rect', { x: 5, y: 5 }));
    const fence = createObject('fence', defaultGeometry('fence', 'polyline', { x: 5, y: 5 }));
    g = addObject(addObject(g, house), fence);
    g = rotateObject(rotateObject(g, house.id, 90), fence.id, 90);
    expect(g.objects[0].geometry).toMatchObject({ rotationDeg: 90 });
    const pts = (g.objects[1].geometry as { points: { x: number; y: number }[] }).points;
    expect(pts[0].x).toBeCloseTo(5);
    expect(pts[0].y).toBeCloseTo(2.5);
  });
});
