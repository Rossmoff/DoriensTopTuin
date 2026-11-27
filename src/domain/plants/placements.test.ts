import { describe, expect, it } from 'vitest';
import { BUILTIN_PLANTS } from '../../data/plants';
import { createGarden, DEFAULT_SITE } from '../../data/defaults';
import { createObject } from '../../data/objectCatalog';
import type { PlantPlacement } from '../types';
import {
  bloomCalendar, computeWarnings, gardenPlantLookup, placementRadius, plantTotals, shoppingListCsv, vegCalendar, vegTasks,
  type SpotConditions,
} from './index';

const lookup = gardenPlantLookup(BUILTIN_PLANTS);
let n = 0;
const place = (plantId: string, x: number, y: number, quantity = 1): PlantPlacement => ({ id: `pl${n++}`, plantId, center: { x, y }, quantity });
const sunnyDefault = (): SpotConditions => ({ sunHours: 8, soil: DEFAULT_SITE.soil, zones: [], usdaZone: '8a' });
const richBed = (): SpotConditions => ({ sunHours: 8, soil: { ...DEFAULT_SITE.soil, texture: 'loamySand', pH: 6.8, moisture: 'moderate', organicMatter: 'high' }, zones: [], usdaZone: '8a' });
const opts = { toxic: { children: true, pets: true } };

describe('placement size', () => {
  it('uses half the mature spread for one plant and grows for groups', () => {
    const heather = lookup('calluna-vulgaris')!;
    expect(placementRadius(place('calluna-vulgaris', 0, 0), heather)).toBeCloseTo(0.25);
    const group = placementRadius(place('calluna-vulgaris', 0, 0, 9), heather);
    // 9 plants at 0.35 m: area 9 × 0.35² → r ≈ 0.59 m
    expect(group).toBeCloseTo(0.35 * Math.sqrt(9 / Math.PI), 5);
    expect(placementRadius({ ...place('calluna-vulgaris', 0, 0), spreadOverrideM: 1 }, heather)).toBeCloseTo(0.5);
  });
});

describe('warnings', () => {
  const garden = (placements: PlantPlacement[], objects = createGarden({ name: 'G', width: 20, length: 20 }).objects) => ({
    placements,
    objects,
    boundary: createGarden({ name: 'G', width: 20, length: 20 }).boundary,
  });

  it('warns when mature plants overlap, but tolerates a little', () => {
    const w = computeWarnings(garden([place('rosa-rugosa', 5, 5), place('rosa-rugosa', 5.8, 5)]), lookup, () => null, opts);
    expect(w.filter((x) => x.kind === 'overlap')).toHaveLength(2);
    const ok = computeWarnings(garden([place('rosa-rugosa', 5, 5), place('rosa-rugosa', 6.35, 5)]), lookup, () => null, opts);
    expect(ok.filter((x) => x.kind === 'overlap')).toHaveLength(0);
  });

  it('warns about bad companions close together', () => {
    const w = computeWarnings(garden([place('tomato', 5, 5), place('potato', 6.2, 5)]), lookup, richBed, opts);
    expect(w.some((x) => x.kind === 'badCompanion' && /bad companions/.test(x.message))).toBe(true);
    const far = computeWarnings(garden([place('tomato', 2, 2), place('potato', 12, 12)]), lookup, richBed, opts);
    expect(far.some((x) => x.kind === 'badCompanion')).toBe(false);
  });

  it('warns about poor suitability with the reason', () => {
    const w = computeWarnings(garden([place('cabbage', 5, 5)]), lookup, sunnyDefault, opts);
    const u = w.find((x) => x.kind === 'unsuitable')!;
    expect(u.message).toMatch(/pH ≥ 6\.5/);
    expect(computeWarnings(garden([place('calluna-vulgaris', 5, 5)]), lookup, sunnyDefault, opts).some((x) => x.kind === 'unsuitable')).toBe(false);
  });

  it('warns about toxic plants for children and pets, unless switched off', () => {
    const w = computeWarnings(garden([place('taxus-baccata', 5, 5)]), lookup, () => null, opts);
    expect(w.find((x) => x.kind === 'toxic')!.message).toMatch(/children and pets/);
    expect(computeWarnings(garden([place('taxus-baccata', 5, 5)]), lookup, () => null, { toxic: { children: false, pets: false } }).some((x) => x.kind === 'toxic')).toBe(false);
  });

  it('warns about plants on hard surfaces and outside the plot', () => {
    const terrace = createObject('terrace', { type: 'rect', center: { x: 5, y: 5 }, width: 4, length: 4, rotationDeg: 0 });
    const w = computeWarnings(garden([place('lettuce', 5, 5), place('lettuce', 30, 5)], [terrace]), lookup, () => null, opts);
    expect(w.find((x) => x.kind === 'hardSurface')!.message).toMatch(/terrace/);
    expect(w.some((x) => x.kind === 'outsidePlot')).toBe(true);
  });

  it('flags placements whose plant was deleted', () => {
    const w = computeWarnings(garden([place('no-such-plant', 5, 5)]), lookup, () => null, opts);
    expect(w[0].kind).toBe('missingPlant');
  });
});

describe('calendars', () => {
  const ps = [place('crocus-tommasinianus', 1, 1, 20), place('calluna-vulgaris', 2, 2, 5), place('calluna-vulgaris', 3, 3, 4), place('tomato', 4, 4, 3), place('carrot', 5, 5)];

  it('totals quantities per plant', () => {
    const t = plantTotals(ps, lookup);
    expect(t.find((x) => x.plant.id === 'calluna-vulgaris')).toMatchObject({ quantity: 9, placements: 2 });
  });

  it('shows bloom coverage per month and the gaps', () => {
    const cal = bloomCalendar(ps, lookup);
    expect(cal.rows.map((r) => r.plant.id)).toEqual(['crocus-tommasinianus', 'calluna-vulgaris']);
    expect(cal.inFlower[1]).toBe(1); // Feb: crocus
    expect(cal.inFlower[8]).toBe(1); // Sep: heather
    expect(cal.gaps).toEqual([4, 5, 6, 7]);
    expect(cal.withInterest[0]).toBe(0);
  });

  it('builds a vegetable calendar and monthly tasks', () => {
    const rows = vegCalendar(ps, lookup);
    expect(rows.map((r) => r.plant.id)).toEqual(['carrot', 'tomato']); // both start in March → by name
    const may = vegTasks(rows, 5);
    expect(may.plantOut).toContain('Tomato');
    expect(may.sowOutdoors).toContain('Carrot');
  });

  it('exports a shopping list as CSV', () => {
    const csv = shoppingListCsv(ps, lookup, 'Our garden');
    expect(csv).toMatch(/^# Our garden\nQuantity;English;Dutch;Latin/);
    expect(csv).toContain('9;Heather;Struikheide;Calluna vulgaris;heather');
    expect(csv).toContain('20;Early crocus;Boerenkrokus;Crocus tommasinianus');
  });
});
