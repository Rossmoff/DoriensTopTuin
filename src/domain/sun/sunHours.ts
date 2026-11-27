/**
 * Hours of direct sun per grid cell, averaged per day over a set of dates.
 * Pure and synchronous: run it in a Web Worker for big gardens.
 */
import type { Garden, GardenObject, ZoneKind } from '../types';
import { bbox, footprintPolygons, pointInPolygon } from '../geometry';
import { gardenShadows, type ShadowContext } from './shadow';
import { applyCorrection, sunPosition } from './sunPosition';
import { addDays, dateRange, zonedToUtc } from './timezone';
import { rasterizePolygon, type GridSpec } from './raster';

export type LightClass = 'fullSun' | 'partialShade' | 'shade';

export const LIGHT_CLASS_LABEL: Record<LightClass, string> = {
  fullSun: 'Full sun (≥ 6 h)',
  partialShade: 'Partial shade (3–6 h)',
  shade: 'Shade (< 3 h)',
};

export function classifySunHours(hours: number): LightClass {
  if (hours >= 6) return 'fullSun';
  if (hours >= 3) return 'partialShade';
  return 'shade';
}

export type SunPeriod =
  | { kind: 'day'; date: string }
  | { kind: 'range'; from: string; to: string; stepDays: number };

export function periodDates(p: SunPeriod): string[] {
  return p.kind === 'day' ? [p.date] : dateRange(p.from, p.to, Math.max(1, p.stepDays));
}

/** Default growing season (Apr–Sep) of a year, sampled weekly. */
export const growingSeason = (year: number, stepDays = 7): SunPeriod => ({
  kind: 'range',
  from: `${year}-04-01`,
  to: `${year}-09-30`,
  stepDays,
});

export interface SunHoursInput {
  objects: GardenObject[];
  grid: GridSpec;
  /** 1 = cell counts (open ground), 0 = masked (outside plot, inside a building). */
  mask: Uint8Array;
  dates: string[];
  stepMinutes: number;
  location: Garden['location'];
  planUpBearingDeg: number;
  sunCorrection: Garden['sunCorrection'];
  leafSeason: Garden['settings']['leafSeason'];
  leaflessTransmission: number;
}

export interface SunHoursResult {
  grid: GridSpec;
  /** Average hours of direct sun per day; NaN where masked. */
  hours: Float32Array;
  /** Average hours the sun is above the horizon per day (open-sky maximum). */
  daylightHours: number;
  dates: string[];
  computeMs: number;
}

const BUILDING_KINDS = new Set(['house', 'garage', 'shed', 'carport', 'neighbourBuilding']);

/** Grid covering the plot boundary. */
export function gridForGarden(g: Garden, cellSize = 0.5): GridSpec {
  const b = bbox(g.boundary);
  return {
    originX: b.minX,
    originY: b.minY,
    cellSize,
    cols: Math.max(1, Math.ceil((b.maxX - b.minX) / cellSize)),
    rows: Math.max(1, Math.ceil((b.maxY - b.minY) / cellSize)),
  };
}

/** Cells inside the boundary and not under a roof. */
export function maskForGarden(g: Garden, grid: GridSpec): Uint8Array {
  const mask = new Uint8Array(grid.cols * grid.rows);
  rasterizePolygon(g.boundary, grid, (i) => (mask[i] = 1));
  for (const o of g.objects) {
    if (!BUILDING_KINDS.has(o.kind)) continue;
    for (const fp of footprintPolygons(o.geometry)) rasterizePolygon(fp, grid, (i) => (mask[i] = 0));
  }
  return mask;
}

export function sunHoursInputForGarden(g: Garden, period: SunPeriod, cellSize = 0.5, stepMinutes = 15): SunHoursInput {
  const grid = gridForGarden(g, cellSize);
  return {
    objects: g.objects,
    grid,
    mask: maskForGarden(g, grid),
    dates: periodDates(period),
    stepMinutes,
    location: g.location,
    planUpBearingDeg: g.planUpBearingDeg,
    sunCorrection: g.sunCorrection,
    leafSeason: g.settings.leafSeason,
    leaflessTransmission: g.settings.leaflessTransmission,
  };
}

export function computeSunHours(input: SunHoursInput, onProgress?: (fraction: number) => void): SunHoursResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { grid, mask, dates, stepMinutes, location } = input;
  const n = grid.cols * grid.rows;
  const total = new Float64Array(n);
  const trans = new Float32Array(n);
  const stamp = new Int32Array(n).fill(-1);
  const stepH = stepMinutes / 60;
  let daylight = 0;
  let stampId = 0;

  dates.forEach((date, di) => {
    const ctx: ShadowContext = {
      date,
      planUpBearingDeg: input.planUpBearingDeg,
      leafSeason: input.leafSeason,
      leaflessTransmission: input.leaflessTransmission,
    };
    const start = zonedToUtc(date, 0, location.timeZone).getTime();
    const end = zonedToUtc(addDays(date, 1), 0, location.timeZone).getTime();
    for (let t = start + (stepMinutes / 2) * 60000; t < end; t += stepMinutes * 60000) {
      const sun = applyCorrection(sunPosition(new Date(t), location.lat, location.lon), input.sunCorrection);
      if (sun.altitudeDeg <= 0) continue;
      daylight += stepH;
      trans.fill(1);
      for (const s of gardenShadows(input.objects, sun, ctx)) {
        const keep = 1 - s.opacity;
        const id = stampId++;
        for (const poly of s.polygons) {
          rasterizePolygon(poly, grid, (i) => {
            if (stamp[i] !== id) {
              stamp[i] = id;
              trans[i] *= keep;
            }
          });
        }
      }
      for (let i = 0; i < n; i++) total[i] += trans[i] * stepH;
    }
    onProgress?.((di + 1) / dates.length);
  });

  const days = Math.max(dates.length, 1);
  const hours = new Float32Array(n);
  for (let i = 0; i < n; i++) hours[i] = mask[i] ? total[i] / days : NaN;
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { grid, hours, daylightHours: daylight / days, dates, computeMs: t1 - t0 };
}

/** Average sun hours in a polygon (e.g. a bed), ignoring masked cells. */
export function averageSunHoursIn(result: SunHoursResult, polygon: { x: number; y: number }[]): number | null {
  let sum = 0;
  let count = 0;
  rasterizePolygon(polygon, result.grid, (i) => {
    const h = result.hours[i];
    if (!Number.isNaN(h)) {
      sum += h;
      count++;
    }
  });
  if (count === 0) {
    // Polygon smaller than a cell: use the cell under its first point.
    return null;
  }
  return sum / count;
}

/** Manual zones covering a point. */
export function zonesAt(p: { x: number; y: number }, zones: Garden['zones']): ZoneKind[] {
  return zones.filter((z) => z.points.length >= 3 && pointInPolygon(p, z.points)).map((z) => z.kind);
}

/** Light class at a point, letting a manual "shady" zone override the computed value. */
export function lightClassAt(hours: number, zoneKinds: ZoneKind[]): LightClass {
  return zoneKinds.includes('shady') ? 'shade' : classifySunHours(hours);
}


/** Sun hours at a single point (one tiny cell), e.g. for a tapped spot. */
export function sunHoursAtPoint(g: Garden, p: { x: number; y: number }, period: SunPeriod, stepMinutes = 15): number {
  const s = 0.01;
  const input: SunHoursInput = {
    ...sunHoursInputForGarden({ ...g, boundary: [p, { x: p.x + s, y: p.y }, { x: p.x, y: p.y + s }] }, period, s, stepMinutes),
    grid: { originX: p.x - s / 2, originY: p.y - s / 2, cellSize: s, cols: 1, rows: 1 },
    mask: new Uint8Array([1]),
  };
  return computeSunHours(input).hours[0];
}
