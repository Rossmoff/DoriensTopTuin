import type { Colour, Month, Plant, PlantCategory } from '../types';

export interface PlantFilter {
  text: string;
  categories: PlantCategory[];
  maxHeightM: number | null;
  minHeightM: number | null;
  colour: Colour | null;
  month: Month | null;
  evergreen: boolean;
  native: boolean;
  pollinators: boolean;
  /** 'all' | only edibles | only ornamentals */
  kind: 'all' | 'edible' | 'ornamental';
  safeForKidsAndPets: boolean;
}

export const EMPTY_FILTER: PlantFilter = {
  text: '',
  categories: [],
  maxHeightM: null,
  minHeightM: null,
  colour: null,
  month: null,
  evergreen: false,
  native: false,
  pollinators: false,
  kind: 'all',
  safeForKidsAndPets: false,
};

export const isEdible = (p: Plant) => !!p.edible;

export function activeFilterCount(f: PlantFilter): number {
  let n = 0;
  if (f.text.trim()) n++;
  if (f.categories.length) n++;
  if (f.maxHeightM !== null) n++;
  if (f.minHeightM !== null) n++;
  if (f.colour) n++;
  if (f.month) n++;
  if (f.evergreen) n++;
  if (f.native) n++;
  if (f.pollinators) n++;
  if (f.kind !== 'all') n++;
  if (f.safeForKidsAndPets) n++;
  return n;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function matchesFilter(p: Plant, f: PlantFilter): boolean {
  if (f.text.trim()) {
    const q = norm(f.text.trim());
    const hay = norm(`${p.names.en} ${p.names.nl} ${p.names.latin}`);
    if (!hay.includes(q)) return false;
  }
  if (f.categories.length && !f.categories.includes(p.category)) return false;
  if (f.maxHeightM !== null && p.size.heightM > f.maxHeightM) return false;
  if (f.minHeightM !== null && p.size.heightM < f.minHeightM) return false;
  if (f.colour && !p.ornamental?.flowerColours.includes(f.colour)) return false;
  if (f.month && !p.ornamental?.floweringMonths.includes(f.month)) return false;
  if (f.evergreen && p.foliage !== 'evergreen' && p.foliage !== 'semiEvergreen') return false;
  if (f.native && !p.nativeBE) return false;
  if (f.pollinators && !p.attractsPollinators) return false;
  if (f.kind === 'edible' && !isEdible(p)) return false;
  if (f.kind === 'ornamental' && isEdible(p)) return false;
  if (f.safeForKidsAndPets && (p.toxicity.children || p.toxicity.pets)) return false;
  return true;
}
