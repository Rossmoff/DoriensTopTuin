import type { Id, Month, Plant, PlantPlacement, Vec2 } from '../types';

export type PlantLookup = (id: Id) => Plant | undefined;

/**
 * Radius on the plan: half the mature spread for one plant; for a group of n plants at
 * planting distance d the circle covers their area (π r² = n d²), never less than one plant.
 */
export function placementRadius(p: PlantPlacement, plant: Plant | undefined): number {
  const spread = p.spreadOverrideM ?? plant?.size.spreadM ?? 0.5;
  const single = spread / 2;
  if (p.quantity <= 1 || !plant) return single;
  const d = plant.size.plantingDistanceM || spread;
  return Math.max(single, d * Math.sqrt(p.quantity / Math.PI));
}

export function placementsInPolygon(placements: PlantPlacement[], polygon: Vec2[], inside: (p: Vec2, poly: Vec2[]) => boolean): PlantPlacement[] {
  return placements.filter((p) => inside(p.center, polygon));
}

export interface PlantTotal {
  plant: Plant;
  quantity: number;
  placements: number;
}

/** Placed plants grouped by plant, with total quantity (sorted by name). */
export function plantTotals(placements: PlantPlacement[], lookup: PlantLookup): PlantTotal[] {
  const map = new Map<Id, PlantTotal>();
  for (const pl of placements) {
    const plant = lookup(pl.plantId);
    if (!plant) continue;
    const t = map.get(plant.id) ?? { plant, quantity: 0, placements: 0 };
    t.quantity += Math.max(1, pl.quantity);
    t.placements += 1;
    map.set(plant.id, t);
  }
  return [...map.values()].sort((a, b) => a.plant.names.en.localeCompare(b.plant.names.en));
}

// ---------- Calendars ----------

export const MONTHS: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface BloomRow {
  plant: Plant;
  quantity: number;
  flowering: Month[];
  colours: string[];
  /** Berries, autumn colour, bark… */
  colourMonths: Month[];
}

export interface BloomCalendar {
  rows: BloomRow[];
  /** Per month (index 0 = Jan): number of different placed plants in flower. */
  inFlower: number[];
  /** Per month: number of plants in flower or showing colour. */
  withInterest: number[];
  /** Months between March and October with nothing in flower. */
  gaps: Month[];
}

export function bloomCalendar(placements: PlantPlacement[], lookup: PlantLookup): BloomCalendar {
  const rows: BloomRow[] = plantTotals(placements, lookup)
    .filter((t) => t.plant.ornamental && (t.plant.ornamental.floweringMonths.length > 0 || (t.plant.ornamental.colourMonths?.length ?? 0) > 0))
    .map((t) => ({
      plant: t.plant,
      quantity: t.quantity,
      flowering: t.plant.ornamental!.floweringMonths,
      colours: t.plant.ornamental!.flowerColours,
      colourMonths: t.plant.ornamental!.colourMonths ?? [],
    }))
    .sort((a, b) => (a.flowering[0] ?? 13) - (b.flowering[0] ?? 13) || a.plant.names.en.localeCompare(b.plant.names.en));
  const inFlower = MONTHS.map((m) => rows.filter((r) => r.flowering.includes(m)).length);
  const withInterest = MONTHS.map((m) => rows.filter((r) => r.flowering.includes(m) || r.colourMonths.includes(m)).length);
  const gaps = MONTHS.filter((m) => m >= 3 && m <= 10 && inFlower[m - 1] === 0);
  return { rows, inFlower, withInterest, gaps };
}

export interface VegRow {
  plant: Plant;
  quantity: number;
  sowIndoors: Month[];
  sowOutdoors: Month[];
  plantOut: Month[];
  harvest: Month[];
}

export function vegCalendar(placements: PlantPlacement[], lookup: PlantLookup): VegRow[] {
  const first = (r: VegRow) => Math.min(...[...r.sowIndoors, ...r.sowOutdoors, ...r.plantOut, ...r.harvest, 13]);
  return plantTotals(placements, lookup)
    .filter((t) => t.plant.edible)
    .map((t) => ({
      plant: t.plant,
      quantity: t.quantity,
      sowIndoors: t.plant.edible!.sowIndoors ?? [],
      sowOutdoors: t.plant.edible!.sowOutdoors ?? [],
      plantOut: t.plant.edible!.plantOut ?? [],
      harvest: t.plant.edible!.harvest,
    }))
    .sort((a, b) => first(a) - first(b) || a.plant.names.en.localeCompare(b.plant.names.en));
}

/** What to do this month for the placed edibles. */
export function vegTasks(rows: VegRow[], month: Month): { sowIndoors: string[]; sowOutdoors: string[]; plantOut: string[]; harvest: string[] } {
  const names = (pick: (r: VegRow) => Month[]) => rows.filter((r) => pick(r).includes(month)).map((r) => r.plant.names.en);
  return {
    sowIndoors: names((r) => r.sowIndoors),
    sowOutdoors: names((r) => r.sowOutdoors),
    plantOut: names((r) => r.plantOut),
    harvest: names((r) => r.harvest),
  };
}

/** CSV shopping list of placed plants (Excel-friendly: semicolons, UTF-8 BOM added by caller). */
export function shoppingListCsv(placements: PlantPlacement[], lookup: PlantLookup, gardenName: string): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [['Quantity', 'English', 'Dutch', 'Latin', 'Category', 'Height (m)', 'Spread (m)', 'Spacing (m)', 'Notes'].join(';')];
  for (const t of plantTotals(placements, lookup)) {
    const p = t.plant;
    const notes = [p.toxicity.children || p.toxicity.pets ? 'toxic' : '', p.nativeBE ? 'native' : ''].filter(Boolean).join(', ');
    lines.push([String(t.quantity), p.names.en, p.names.nl, p.names.latin, p.category, String(p.size.heightM), String(p.size.spreadM), String(p.size.plantingDistanceM), notes].map(esc).join(';'));
  }
  return `# ${gardenName}\n${lines.join('\n')}\n`;
}

export const gardenPlantLookup = (plants: Plant[]): PlantLookup => {
  const m = new Map(plants.map((p) => [p.id, p]));
  return (id) => m.get(id);
};

