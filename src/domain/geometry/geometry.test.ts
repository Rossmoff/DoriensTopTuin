import { describe, expect, it } from 'vitest';
import {
  bbox, centroid, convexHull, distanceToSegment, footprintPolygons, geometryArea, geometryLength,
  niceNumber, normDeg, pointInPolygon, polygonArea, rectCorners, rotate, snapAngle, snapPoint, translateGeometry,
} from './index';

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

describe('polygon helpers', () => {
  it('computes area and centroid of a square', () => {
    expect(polygonArea(square)).toBeCloseTo(16);
    expect(centroid(square)).toEqual({ x: 2, y: 2 });
  });

  it('computes area of an L-shape', () => {
    const l = [
      { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 6 }, { x: 0, y: 6 },
    ];
    expect(polygonArea(l)).toBeCloseTo(27);
  });

  it('tests point in polygon', () => {
    expect(pointInPolygon({ x: 1, y: 1 }, square)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 1 }, square)).toBe(false);
  });

  it('builds a convex hull', () => {
    const hull = convexHull([...square, { x: 2, y: 2 }, { x: 1, y: 3 }]);
    expect(hull).toHaveLength(4);
    expect(polygonArea(hull)).toBeCloseTo(16);
  });

  it('measures distance to a segment', () => {
    expect(distanceToSegment({ x: 2, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeCloseTo(3);
    expect(distanceToSegment({ x: 7, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeCloseTo(5);
  });
});

describe('vectors and angles', () => {
  it('rotates clockwise on screen (y down)', () => {
    const r = rotate({ x: 1, y: 0 }, 90);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });
  it('normalises degrees', () => {
    expect(normDeg(-90)).toBe(270);
    expect(normDeg(725)).toBe(5);
  });
});

describe('geometry footprints', () => {
  it('turns an unrotated rect into its corners', () => {
    const c = rectCorners({ type: 'rect', center: { x: 5, y: 5 }, width: 4, length: 2, rotationDeg: 0 });
    expect(bbox(c)).toEqual({ minX: 3, minY: 4, maxX: 7, maxY: 6 });
  });

  it('keeps rect area under rotation', () => {
    const g = { type: 'rect' as const, center: { x: 0, y: 0 }, width: 10, length: 9, rotationDeg: 33 };
    expect(polygonArea(footprintPolygons(g)[0])).toBeCloseTo(90);
    expect(geometryArea(g)).toBe(90);
  });

  it('turns a polyline into one quad per segment', () => {
    const g = { type: 'polyline' as const, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }], thickness: 0.2 };
    const polys = footprintPolygons(g);
    expect(polys).toHaveLength(2);
    expect(polygonArea(polys[0])).toBeCloseTo(2);
    expect(geometryLength(g)).toBeCloseTo(15);
  });

  it('translates geometry without mutating the input', () => {
    const g = { type: 'polygon' as const, points: square };
    const t = translateGeometry(g, { x: 1, y: 2 });
    expect(t.points[0]).toEqual({ x: 1, y: 2 });
    expect(g.points[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('snapping', () => {
  it('snaps to grid', () => {
    expect(snapPoint({ x: 1.26, y: 0.74 }, 0.5)).toEqual({ x: 1.5, y: 0.5 });
    expect(snapPoint({ x: 1.26, y: 0.74 }, 0.5, false)).toEqual({ x: 1.26, y: 0.74 });
  });
  it('snaps angles near multiples of 15°', () => {
    expect(snapAngle(88)).toBe(90);
    expect(snapAngle(80)).toBe(80);
  });
  it('picks nice scale-bar numbers', () => {
    expect(niceNumber(7.3)).toBe(5);
    expect(niceNumber(0.35)).toBeCloseTo(0.2);
    expect(niceNumber(120)).toBe(100);
  });
});
