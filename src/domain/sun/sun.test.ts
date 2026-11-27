import { describe, expect, it } from 'vitest';
import { createGarden } from '../../data/defaults';
import { createObject, defaultGeometry } from '../../data/objectCatalog';
import { distance, pointInPolygon } from '../geometry';
import type { GardenObject } from '../types';
import {
  calibrate, classifySunHours, computeSunHours, crownShadow, gardenShadows, inLeaf, objectShadow, prismShadow,
  shadowVector, sunAtLocal, sunDay, sunHoursInputForGarden, sunPosition, tzOffsetMinutes, utcToZonedMinutes, zonedToUtc,
} from './index';

const GENK = { lat: 50.96, lon: 5.45, timeZone: 'Europe/Brussels' };
const AT51 = { lat: 51, lon: 5.45, timeZone: 'Europe/Brussels' };

describe('time zone (Europe/Brussels)', () => {
  it('uses CET in winter and CEST in summer', () => {
    expect(tzOffsetMinutes(new Date('2026-12-21T12:00:00Z'), 'Europe/Brussels')).toBe(60);
    expect(tzOffsetMinutes(new Date('2026-06-21T12:00:00Z'), 'Europe/Brussels')).toBe(120);
  });
  it('converts local wall-clock time to UTC', () => {
    expect(zonedToUtc('2026-06-21', 12 * 60, 'Europe/Brussels').toISOString()).toBe('2026-06-21T10:00:00.000Z');
    expect(zonedToUtc('2026-12-21', 12 * 60, 'Europe/Brussels').toISOString()).toBe('2026-12-21T11:00:00.000Z');
  });
  it('handles the DST change days', () => {
    // 29 March 2026: clocks jump 02:00 → 03:00. 12:00 local is CEST.
    expect(zonedToUtc('2026-03-29', 12 * 60, 'Europe/Brussels').toISOString()).toBe('2026-03-29T10:00:00.000Z');
    // 25 October 2026: back to CET.
    expect(zonedToUtc('2026-10-25', 12 * 60, 'Europe/Brussels').toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });
  it('round-trips to local minutes', () => {
    expect(utcToZonedMinutes(zonedToUtc('2026-07-01', 615, 'Europe/Brussels'), 'Europe/Brussels')).toBeCloseTo(615);
  });
});

describe('sun position', () => {
  it('reaches ≈62° at solar noon on 21 June at 51° N', () => {
    const d = sunDay('2026-06-21', AT51.lat, AT51.lon, AT51.timeZone);
    expect(d.noonAltitudeDeg).toBeGreaterThan(61.9);
    expect(d.noonAltitudeDeg).toBeLessThan(62.8);
  });
  it('reaches ≈15.6° at solar noon on 21 December at 51° N', () => {
    const d = sunDay('2026-12-21', AT51.lat, AT51.lon, AT51.timeZone);
    expect(d.noonAltitudeDeg).toBeCloseTo(15.6, 0);
    expect(Math.abs(d.noonAltitudeDeg - 15.6)).toBeLessThan(0.3);
  });
  it('is due south at solar noon, which in Genk is around 13:40 in summer and 12:37 in winter', () => {
    const june = sunDay('2026-06-21', GENK.lat, GENK.lon, GENK.timeZone);
    const dec = sunDay('2026-12-21', GENK.lat, GENK.lon, GENK.timeZone);
    expect(june.solarNoon).toBeGreaterThan(13 * 60 + 35);
    expect(june.solarNoon).toBeLessThan(13 * 60 + 45);
    expect(dec.solarNoon).toBeGreaterThan(12 * 60 + 30);
    expect(dec.solarNoon).toBeLessThan(12 * 60 + 42);
    expect(sunAtLocal('2026-06-21', june.solarNoon, GENK).azimuthDeg).toBeCloseTo(180, 0);
  });
  it('gives plausible sunrise and sunset times and directions for Genk', () => {
    const june = sunDay('2026-06-21', GENK.lat, GENK.lon, GENK.timeZone);
    // Around 05:25 and 22:00 CEST, rising in the north-east, setting in the north-west.
    expect(june.sunrise!).toBeGreaterThan(5 * 60 + 15);
    expect(june.sunrise!).toBeLessThan(5 * 60 + 35);
    expect(june.sunset!).toBeGreaterThan(21 * 60 + 50);
    expect(june.sunset!).toBeLessThan(22 * 60 + 8);
    expect(june.sunriseAzimuthDeg!).toBeGreaterThan(45);
    expect(june.sunriseAzimuthDeg!).toBeLessThan(55);
    const dec = sunDay('2026-12-21', GENK.lat, GENK.lon, GENK.timeZone);
    expect(dec.sunrise!).toBeGreaterThan(8 * 60 + 35);
    expect(dec.sunrise!).toBeLessThan(8 * 60 + 50);
    expect(dec.sunset!).toBeGreaterThan(16 * 60 + 25);
    expect(dec.sunset!).toBeLessThan(16 * 60 + 40);
  });
  it('is below the horizon at night', () => {
    expect(sunPosition(new Date('2026-06-21T23:00:00Z'), GENK.lat, GENK.lon).altitudeDeg).toBeLessThan(0);
  });
});

describe('shadow geometry', () => {
  it('a 6 m house casts ≈21 m at solar noon on 21 December', () => {
    const d = sunDay('2026-12-21', AT51.lat, AT51.lon, AT51.timeZone);
    const sun = sunAtLocal('2026-12-21', d.solarNoon, AT51);
    const v = shadowVector(sun, 0)!;
    const len = Math.hypot(v.x, v.y) * 6;
    expect(len).toBeGreaterThan(20.8);
    expect(len).toBeLessThan(21.8);
    // North-up plan: the shadow points north, i.e. up (−y).
    expect(v.y).toBeLessThan(0);
    expect(Math.abs(v.x)).toBeLessThan(0.05);
  });

  it('rotates with the plan orientation', () => {
    const sun = { altitudeDeg: 45, azimuthDeg: 180 };
    // East is up: north is to the left (−x).
    const v = shadowVector(sun, 90)!;
    expect(v.x).toBeCloseTo(-1);
    expect(v.y).toBeCloseTo(0);
    // South is up: shadow points down (+y).
    expect(shadowVector(sun, 180)!.y).toBeCloseTo(1);
  });

  it('has no shadow when the sun is down', () => {
    expect(shadowVector({ altitudeDeg: -3, azimuthDeg: 0 }, 0)).toBeNull();
  });

  it('projects a prism footprint along the shadow vector', () => {
    const sq = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
    const polys = prismShadow(sq, 2, { x: 0, y: -1 });
    expect(polys).toHaveLength(1);
    const inShadow = (p: { x: number; y: number }) => polys.some((poly) => pointInPolygon(p, poly));
    expect(inShadow({ x: 2, y: -1.5 })).toBe(true);
    expect(inShadow({ x: 2, y: -2.5 })).toBe(false);
  });

  it('handles L-shaped (non-convex) buildings exactly', () => {
    const l = [
      { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 6 }, { x: 0, y: 6 },
    ];
    const polys = prismShadow(l, 1, { x: 1, y: 1 });
    const inShadow = (p: { x: number; y: number }) => polys.some((poly) => pointInPolygon(p, poly));
    expect(inShadow({ x: 6.5, y: 3.5 })).toBe(true); // just beyond the outer corner
    expect(inShadow({ x: 5.5, y: 5.5 })).toBe(false); // in the notch, beyond the 1 m shadow
  });

  it('casts an elongated ellipse for a tree crown', () => {
    const v = { x: 0, y: -2 };
    const e = crownShadow({ x: 0, y: 0 }, 3, 2, 10, v);
    // Centre at mid-crown height 6 m → displaced 12 m north.
    const cx = e.reduce((s, p) => s + p.x, 0) / e.length;
    const cy = e.reduce((s, p) => s + p.y, 0) / e.length;
    expect(cx).toBeCloseTo(0);
    expect(cy).toBeCloseTo(-12);
    const along = Math.max(...e.map((p) => distance(p, { x: cx, y: cy })));
    expect(along).toBeCloseTo(Math.sqrt(9 + 16 * 4), 1);
  });

  it('lets light through leafless deciduous trees outside leaf season', () => {
    const tree = createObject('tree', defaultGeometry('tree', 'circle', { x: 0, y: 0 }));
    const season = { fromMonth: 5 as const, toMonth: 10 as const };
    const ctx = (date: string) => ({ date, planUpBearingDeg: 0, leafSeason: season, leaflessTransmission: 0.7 });
    expect(objectShadow(tree, { x: 0, y: -1 }, ctx('2026-07-01'))!.opacity).toBe(1);
    expect(objectShadow(tree, { x: 0, y: -1 }, ctx('2026-01-15'))!.opacity).toBeCloseTo(0.3);
    expect(inLeaf(11, { fromMonth: 10, toMonth: 3 })).toBe(true);
  });

  it('ignores flat objects', () => {
    const lawn = createObject('lawn', defaultGeometry('lawn', 'rect', { x: 0, y: 0 }));
    expect(gardenShadows([lawn], { altitudeDeg: 30, azimuthDeg: 180 }, { date: '2026-06-01', planUpBearingDeg: 0, leafSeason: { fromMonth: 5, toMonth: 10 }, leaflessTransmission: 0.7 })).toEqual([]);
  });
});

describe('sun hours', () => {
  it('classifies hours', () => {
    expect(classifySunHours(6)).toBe('fullSun');
    expect(classifySunHours(5.9)).toBe('partialShade');
    expect(classifySunHours(3)).toBe('partialShade');
    expect(classifySunHours(2.9)).toBe('shade');
  });

  it('gives an open garden the full day length', () => {
    const g = createGarden({ name: 'Open', width: 4, length: 4 });
    const r = computeSunHours(sunHoursInputForGarden(g, { kind: 'day', date: '2026-06-21' }, 1));
    const day = sunDay('2026-06-21', g.location.lat, g.location.lon, g.location.timeZone);
    const dayLen = (day.sunset! - day.sunrise!) / 60;
    expect(r.hours[0]).toBeGreaterThan(dayLen - 0.6);
    expect(r.hours[0]).toBeLessThan(dayLen + 0.1);
  });

  it('puts the ground right north of a house in shade in December', () => {
    const g = createGarden({ name: 'House', width: 20, length: 30 });
    // 10 m wide house at the south end; north is up, so its shadow falls up the plot.
    const house = createObject('house', { type: 'rect', center: { x: 10, y: 25 }, width: 10, length: 6, rotationDeg: 0 });
    g.objects.push(house as GardenObject);
    const r = computeSunHours(sunHoursInputForGarden(g, { kind: 'day', date: '2026-12-21' }, 1));
    const at = (x: number, y: number) => r.hours[Math.floor(y) * r.grid.cols + Math.floor(x)];
    expect(at(10.5, 20.5)).toBeLessThan(1); // just north of the house
    expect(at(1.5, 27.5)).toBeGreaterThan(5); // open strip beside it, south part
    expect(Number.isNaN(at(10.5, 25.5))).toBe(true); // under the roof
  });

  it('computes a growing-season map for a 30 × 50 m garden quickly enough', () => {
    const g = createGarden({ name: 'Big', width: 30, length: 50 });
    const add = (kind: Parameters<typeof createObject>[0], geo: Parameters<typeof createObject>[1]) => g.objects.push(createObject(kind, geo, g.objects));
    add('house', { type: 'rect', center: { x: 15, y: 6 }, width: 12, length: 9, rotationDeg: 0 });
    add('shed', { type: 'rect', center: { x: 26, y: 45 }, width: 3, length: 2.5, rotationDeg: 0 });
    for (let i = 0; i < 8; i++) add('tree', { type: 'circle', center: { x: 3 + i * 3.5, y: 30 + (i % 2) * 6 }, radius: 2.5 });
    add('hedge', { type: 'polyline', points: [{ x: 0, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 10 }], thickness: 0.8 });
    add('neighbourTree', { type: 'circle', center: { x: -5, y: 25 }, radius: 4 });
    const input = sunHoursInputForGarden(g, { kind: 'range', from: '2026-04-01', to: '2026-09-30', stepDays: 7 });
    const r = computeSunHours(input);
    expect(r.dates).toHaveLength(27);
    expect(r.computeMs).toBeLessThan(4000);
    const valid = [...r.hours].filter((h) => !Number.isNaN(h));
    expect(Math.max(...valid)).toBeGreaterThan(10);
    expect(Math.min(...valid)).toBeLessThan(4);
  });
});

describe('calibration', () => {
  it('derives a zero correction from model values and an offset from rotated observations', () => {
    const day = sunDay('2026-06-21', GENK.lat, GENK.lon, GENK.timeZone);
    const exact = calibrate(
      { date: '2026-06-21', sunriseBearingDeg: day.sunriseAzimuthDeg!, sunsetBearingDeg: day.sunsetAzimuthDeg!, noonAltitudeDeg: day.noonAltitudeDeg },
      GENK,
    );
    expect(exact.azimuthOffsetDeg).toBeCloseTo(0, 5);
    expect(exact.altitudeFactor).toBeCloseTo(1, 5);
    const off = calibrate(
      { date: '2026-06-21', sunriseBearingDeg: day.sunriseAzimuthDeg! + 10, sunsetBearingDeg: day.sunsetAzimuthDeg! + 6, noonAltitudeDeg: day.noonAltitudeDeg * 0.9 },
      GENK,
    );
    expect(off.azimuthOffsetDeg).toBeCloseTo(8, 5);
    expect(off.altitudeFactor).toBeCloseTo(0.9, 5);
  });
});
