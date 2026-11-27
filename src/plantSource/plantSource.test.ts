import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BUILTIN_PLANTS } from '../data/plants';
import { LocalPlantSource } from './LocalPlantSource';

describe('LocalPlantSource', () => {
  it('merges builtin plants with user additions and edits', async () => {
    const src = new LocalPlantSource('plants-test-1');
    expect((await src.all()).length).toBe(BUILTIN_PLANTS.length);

    const heather = (await src.get('calluna-vulgaris'))!;
    await src.upsert({ ...heather, names: { ...heather.names, en: 'Ling' } });
    const custom = { ...heather, id: 'user-erica-cinerea', names: { en: 'Bell heather', nl: 'Rode dophei', latin: 'Erica cinerea' } };
    await src.upsert(custom);

    const again = new LocalPlantSource('plants-test-1');
    const all = await again.all();
    expect(all.length).toBe(BUILTIN_PLANTS.length + 1);
    expect(all.find((p) => p.id === 'calluna-vulgaris')!.names.en).toBe('Ling');
    expect(all.find((p) => p.id === 'calluna-vulgaris')!.edited).toBe(true);
    expect(all.find((p) => p.id === 'user-erica-cinerea')!.source).toBe('user');

    await again.remove('calluna-vulgaris');
    expect((await again.get('calluna-vulgaris'))!.names.en).toBe('Heather');
    await again.remove('user-erica-cinerea');
    expect((await again.all()).length).toBe(BUILTIN_PLANTS.length);
  });
});
