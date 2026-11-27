import type { Geometry, Vec2 } from '../types';
import { add, length, rotate, sub } from './vec';
import { bbox, centroid, perimeter, polygonArea, type BBox } from './polygon';

/** Corners of a rect geometry, clockwise from top-left (before rotation). */
export function rectCorners(g: Extract<Geometry, { type: 'rect' }>): Vec2[] {
  const hw = g.width / 2;
  const hl = g.length / 2;
  return [
    { x: -hw, y: -hl },
    { x: hw, y: -hl },
    { x: hw, y: hl },
    { x: -hw, y: hl },
  ].map((p) => add(g.center, rotate(p, g.rotationDeg)));
}

export function circlePolygon(center: Vec2, radius: number, segments = 32): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
  }
  return pts;
}

/** A thick segment as a 4-point polygon. */
export function segmentQuad(a: Vec2, b: Vec2, thickness: number): Vec2[] {
  const d = sub(b, a);
  const len = length(d) || 1;
  const n = { x: (-d.y / len) * (thickness / 2), y: (d.x / len) * (thickness / 2) };
  return [add(a, n), add(b, n), sub(b, n), sub(a, n)];
}

/**
 * Footprint of a geometry as one or more simple polygons.
 * Polylines become one quad per segment (good enough for shadows and hit tests).
 */
export function footprintPolygons(g: Geometry, circleSegments = 32): Vec2[][] {
  switch (g.type) {
    case 'rect':
      return [rectCorners(g)];
    case 'polygon':
      return g.points.length >= 3 ? [g.points] : [];
    case 'circle':
      return [circlePolygon(g.center, g.radius, circleSegments)];
    case 'polyline': {
      const out: Vec2[][] = [];
      for (let i = 0; i < g.points.length - 1; i++) {
        out.push(segmentQuad(g.points[i], g.points[i + 1], Math.max(g.thickness, 0.01)));
      }
      return out;
    }
  }
}

export function geometryBBox(g: Geometry): BBox {
  if (g.type === 'circle') {
    return {
      minX: g.center.x - g.radius,
      minY: g.center.y - g.radius,
      maxX: g.center.x + g.radius,
      maxY: g.center.y + g.radius,
    };
  }
  return bbox(footprintPolygons(g).flat());
}

export function geometryCenter(g: Geometry): Vec2 {
  switch (g.type) {
    case 'rect':
    case 'circle':
      return g.center;
    case 'polygon':
      return centroid(g.points);
    case 'polyline': {
      const b = bbox(g.points);
      return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    }
  }
}

export function translateGeometry<G extends Geometry>(g: G, d: Vec2): G {
  switch (g.type) {
    case 'rect':
    case 'circle':
      return { ...g, center: add(g.center, d) };
    case 'polygon':
    case 'polyline':
      return { ...g, points: g.points.map((p) => add(p, d)) };
  }
  return g;
}

/** Area in m² (polylines: length × thickness). */
export function geometryArea(g: Geometry): number {
  switch (g.type) {
    case 'rect':
      return g.width * g.length;
    case 'circle':
      return Math.PI * g.radius * g.radius;
    case 'polygon':
      return polygonArea(g.points);
    case 'polyline':
      return perimeter(g.points, false) * g.thickness;
  }
}

/** Polyline length, or polygon/rect perimeter, in metres. */
export function geometryLength(g: Geometry): number {
  switch (g.type) {
    case 'rect':
      return 2 * (g.width + g.length);
    case 'circle':
      return 2 * Math.PI * g.radius;
    case 'polygon':
      return perimeter(g.points, true);
    case 'polyline':
      return perimeter(g.points, false);
  }
}
