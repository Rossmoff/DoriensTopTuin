import { describe, expect, it } from 'vitest';
import { BUILTIN_PLANTS } from '../../data/plants';
import { DEFAULT_SITE } from '../../data/defaults';
import type { Plant, SoilProfile } from '../types';
import { EMPTY_FILTER, effectiveSoil, matchesFilter, rankPlants, scorePlant, zoneNumber, type SpotConditions } from './index';

const byId = (id: string): Plant => {
  const p = BUILTIN_PLANTS.find((x) => x.id === id);
  if (!p) throw new Error(`no plant ${id}`);
  return p;
};

const spot = (sunHours: number | null, soil: Partial<SoilProfile> = {}, zones: SpotConditions['zones'] = []): SpotConditions => ({
  sunHours,
  soil: { ...DEFAULT_SITE.soil, ...soil },
  zones,
  usdaZone: DEFAULT_SITE.climate.usdaZone,
});

describe('plant data', () => {
  it('has about 150+ plants, ~70% ornamental, many natives and acid-sand plants', () => {
    const n = BUILTIN_PLANTS.length;
    const edible = BUILTIN_PLANTS.filter((p) => p.edible).length;
    expect(n).toBeGreaterThanOrEqual(150);
    expect((n - edible) / n).toBeGreaterThan(0.65);
    expect((n - edible) / n).toBeLessThan(0.75);
    expect(BUILTIN_PLANTS.filter((p) => p.nativeBE).length).toBeGreaterThan(40);
    const acidSand = BUILTIN_PLANTS.filter((p) => p.needs.pH.min <= 5 && p.needs.soils.includes('sand') && p.needs.moisture.includes('dry'));
    expect(acidSand.length).toBeGreaterThan(25);
  });

  it('is internally consistent', () => {
    const ids = new Set(BUILTIN_PLANTS.map((p) => p.id));
    expect(ids.size).toBe(BUILTIN_PLANTS.length);
    const months = (m: number[] | undefined) => (m ?? []).every((x) => Number.isInteger(x) && x >= 1 && x <= 12);
    for (const p of BUILTIN_PLANTS) {
      expect(p.names.en && p.names.nl && p.names.latin, p.id).toBeTruthy();
      expect(p.needs.sun.length, p.id).toBeGreaterThan(0);
      expect(p.needs.soils.length, p.id).toBeGreaterThan(0);
      expect(p.needs.moisture.length, p.id).toBeGreaterThan(0);
      expect(p.needs.pH.min, p.id).toBeLessThan(p.needs.pH.max);
      expect(p.needs.pH.min, p.id).toBeGreaterThanOrEqual(3);
      expect(p.needs.pH.max, p.id).toBeLessThanOrEqual(9);
      expect(p.size.heightM, p.id).toBeGreaterThan(0);
      expect(p.size.spreadM, p.id).toBeGreaterThan(0);
      expect(p.approximate, p.id).toBe(true);
      expect(months(p.ornamental?.floweringMonths), p.id).toBe(true);
      if (p.edible) {
        expect(p.edible.harvest.length, p.id).toBeGreaterThan(0);
        expect(months(p.edible.harvest) && months(p.edible.sowIndoors) && months(p.edible.sowOutdoors) && months(p.edible.plantOut), p.id).toBe(true);
        for (const c of [...p.edible.goodCompanions, ...p.edible.badCompanions]) expect(ids.has(c), `${p.id} → ${c}`).toBe(true);
      }
    }
  });
});

describe('soil helpers', () => {
  it('parses USDA zones', () => {
    expect(zoneNumber('8a')).toBe(8);
    expect(zoneNumber('8b')).toBe(8.5);
    expect(zoneNumber('7')).toBe(7);
  });
  it('applies bed overrides and zones', () => {
    const s = effectiveSoil(DEFAULT_SITE.soil, { pH: 6.5, organicMatter: 'high' });
    expect(s.pH).toBe(6.5);
    expect(s.texture).toBe('sand');
    expect(effectiveSoil(DEFAULT_SITE.soil, undefined, ['wet']).moisture).toBe('wet');
    expect(effectiveSoil(DEFAULT_SITE.soil, { moisture: 'moist' }, ['extraDry']).moisture).toBe('dry');
  });
});

describe('suitability on the default Kempen soil (dry acid sand, pH 5)', () => {
  const sunny = spot(8);

  it('ranks acid-loving, drought-tolerant plants as good', () => {
    for (const id of ['calluna-vulgaris', 'cytisus-scoparius', 'deschampsia-flexuosa', 'corynephorus-canescens', 'jasione-montana']) {
      expect(scorePlant(byId(id), sunny).group, id).toBe('good');
    }
  });

  it('ranks lime-loving plants that need moist soil as unsuitable, with reasons', () => {
    const cabbage = scorePlant(byId('cabbage'), sunny);
    expect(cabbage.group).toBe('unsuitable');
    expect(cabbage.reasons.join(' ')).toMatch(/pH ≥ 6\.5, this spot is ~5\.0/);
    const clematis = scorePlant(byId('clematis-montana'), sunny);
    expect(clematis.group).toBe('unsuitable');
    const astilbe = scorePlant(byId('astilbe-arendsii'), spot(4));
    expect(astilbe.group).toBe('unsuitable');
    expect(astilbe.reasons[0]).toMatch(/needs moist or wet soil, this spot is dry sand/);
  });

  it('puts heather far above lilac', () => {
    const ranked = rankPlants(BUILTIN_PLANTS, sunny);
    const all = [...ranked.good, ...ranked.possible, ...ranked.unsuitable].map((s) => s.plant.id);
    expect(all.indexOf('calluna-vulgaris')).toBeLessThan(all.indexOf('syringa-vulgaris'));
    expect(ranked.good.length).toBeGreaterThan(15);
  });

  it('penalises full-sun plants in shade and shade plants in full sun', () => {
    const lav = scorePlant(byId('lavandula-angustifolia'), spot(1.5, { pH: 7 }));
    expect(lav.group).toBe('unsuitable');
    expect(lav.reasons[0]).toMatch(/needs full sun/);
    const fern = scorePlant(byId('blechnum-spicant'), spot(11, { moisture: 'moist' }));
    expect(fern.factors.find((f) => f.factor === 'sun')!.score).toBeLessThan(0.5);
    expect(fern.reasons[0]).toMatch(/scorch/);
  });

  it('a "shady" zone overrides the computed sun', () => {
    const r = scorePlant(byId('calluna-vulgaris'), spot(10, {}, ['shady']));
    expect(r.factors.find((f) => f.factor === 'sun')!.score).toBeLessThan(1);
  });

  it('an amended vegetable bed makes vegetables possible or good', () => {
    const veg = spot(8, { texture: 'loamySand', pH: 6.8, moisture: 'moderate', organicMatter: 'high' });
    expect(scorePlant(byId('cabbage'), veg).group).toBe('good');
    expect(scorePlant(byId('tomato'), veg).group).toBe('good');
  });

  it('ignores hardiness for annual crops but not for perennials', () => {
    const tomato = scorePlant(byId('tomato'), sunny);
    expect(tomato.factors.some((f) => f.factor === 'hardiness')).toBe(false);
    const cold = { ...spot(8), usdaZone: '6a' };
    expect(scorePlant(byId('viburnum-tinus'), cold).reasons.join(' ')).toMatch(/not hardy/);
  });

  it('still ranks without sun data (sun factor skipped)', () => {
    const r = scorePlant(byId('calluna-vulgaris'), spot(null));
    expect(r.factors.some((f) => f.factor === 'sun')).toBe(false);
    expect(r.group).toBe('good');
  });
});

describe('filters', () => {
  it('filters by text in any language, colour, month and flags', () => {
    const heide = BUILTIN_PLANTS.filter((p) => matchesFilter(p, { ...EMPTY_FILTER, text: 'struikheide' }));
    expect(heide.map((p) => p.id)).toEqual(['calluna-vulgaris']);
    const blueJuly = BUILTIN_PLANTS.filter((p) => matchesFilter(p, { ...EMPTY_FILTER, colour: 'blue', month: 7 }));
    expect(blueJuly.length).toBeGreaterThan(3);
    expect(blueJuly.every((p) => p.ornamental!.flowerColours.includes('blue'))).toBe(true);
    const safeNative = BUILTIN_PLANTS.filter((p) => matchesFilter(p, { ...EMPTY_FILTER, native: true, safeForKidsAndPets: true }));
    expect(safeNative.every((p) => p.nativeBE && !p.toxicity.children && !p.toxicity.pets)).toBe(true);
    const edible = BUILTIN_PLANTS.filter((p) => matchesFilter(p, { ...EMPTY_FILTER, kind: 'edible', maxHeightM: 0.5 }));
    expect(edible.every((p) => p.edible && p.size.heightM <= 0.5)).toBe(true);
  });
});
