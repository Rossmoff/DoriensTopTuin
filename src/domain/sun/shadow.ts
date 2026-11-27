/**
 * Shadow geometry on flat ground.
 * Shadow length per metre of height = 1 / tan(altitude); direction is opposite the sun.
 */
import type { Garden, GardenObject, Vec2 } from '../types';
import { convexHull, footprintPolygons, signedArea } from '../geometry';
import type { SunPosition } from './sunPosition';
import { monthOf } from './timezone';

const rad = Math.PI / 180;
/** Cap for very low sun (≈0.6°) so polygons stay finite. */
const MAX_SHADOW_PER_METRE = 100;

/**
 * Horizontal displacement of a shadow per metre of height, in plan coordinates.
 * Returns null when the sun is below the horizon.
 */
export function shadowVector(sun: SunPosition, planUpBearingDeg: number): Vec2 | null {
  if (sun.altitudeDeg <= 0) return null;
  const len = Math.min(1 / Math.tan(sun.altitudeDeg * rad), MAX_SHADOW_PER_METRE);
  const theta = (sun.azimuthDeg + 180 - planUpBearingDeg) * rad;
  return { x: Math.sin(theta) * len, y: -Math.cos(theta) * len };
}

/** Direction from the plan towards the sun (unit vector, plan coordinates). */
export function sunDirection(sun: SunPosition, planUpBearingDeg: number): Vec2 {
  const theta = (sun.azimuthDeg - planUpBearingDeg) * rad;
  return { x: Math.sin(theta), y: -Math.cos(theta) };
}

function isConvex(pts: Vec2[]): boolean {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const c = pts[(i + 2) % pts.length];
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(z) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(z);
    else if (Math.sign(z) !== sign) return false;
  }
  return true;
}

/**
 * Shadow of a vertical prism (footprint × height) as a set of polygons whose union is the
 * exact shadow. Convex footprints give one hull; others give the footprint plus one
 * parallelogram per edge.
 */
export function prismShadow(footprint: Vec2[], height: number, v: Vec2, baseHeight = 0): Vec2[][] {
  if (height <= 0 || footprint.length < 3) return [];
  const top = footprint.map((p) => ({ x: p.x + v.x * height, y: p.y + v.y * height }));
  const base = baseHeight > 0 ? footprint.map((p) => ({ x: p.x + v.x * baseHeight, y: p.y + v.y * baseHeight })) : footprint;
  if (isConvex(footprint)) return [convexHull([...base, ...top])];
  const out: Vec2[][] = [base];
  for (let i = 0; i < footprint.length; i++) {
    const j = (i + 1) % footprint.length;
    const quad = [base[i], base[j], top[j], top[i]];
    if (Math.abs(signedArea(quad)) > 1e-9) out.push(quad);
  }
  return out;
}

/**
 * Shadow of a tree crown modelled as an ellipsoid (horizontal radius r, spanning crownBase..height):
 * an ellipse centred at centre + v·hc with semi-axes r (across the sun) and √(r² + c²|v|²) (along it).
 */
export function crownShadow(center: Vec2, r: number, crownBase: number, height: number, v: Vec2, segments = 28): Vec2[] {
  const hc = (crownBase + height) / 2;
  const c = Math.max((height - crownBase) / 2, 0.01);
  const vl = Math.hypot(v.x, v.y);
  const ux = vl > 1e-9 ? v.x / vl : 1;
  const uy = vl > 1e-9 ? v.y / vl : 0;
  const along = Math.sqrt(r * r + c * c * vl * vl);
  const cx = center.x + v.x * hc;
  const cy = center.y + v.y * hc;
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const p = Math.cos(a) * along;
    const q = Math.sin(a) * r;
    pts.push({ x: cx + ux * p - uy * q, y: cy + uy * p + ux * q });
  }
  return pts;
}

export interface ObjectShadow {
  objectId: string;
  polygons: Vec2[][];
  /** 0..1: fraction of direct sun blocked. */
  opacity: number;
}

export interface ShadowContext {
  /** Local date "YYYY-MM-DD" (for the leaf season). */
  date: string;
  planUpBearingDeg: number;
  leafSeason: Garden['settings']['leafSeason'];
  leaflessTransmission: number;
}

export function inLeaf(month: number, season: { fromMonth: number; toMonth: number }): boolean {
  const { fromMonth: f, toMonth: t } = season;
  return f <= t ? month >= f && month <= t : month >= f || month <= t;
}

const isTree = (o: GardenObject): o is Extract<GardenObject, { crownBaseHeight: number }> =>
  o.kind === 'tree' || o.kind === 'shrub' || o.kind === 'neighbourTree';

/** Fraction of light an object blocks on a given date. */
export function objectOpacity(o: GardenObject, ctx: Pick<ShadowContext, 'date' | 'leafSeason' | 'leaflessTransmission'>): number {
  const deciduous = 'foliage' in o && o.foliage === 'deciduous';
  if (deciduous && (isTree(o) || o.kind === 'hedge') && !inLeaf(monthOf(ctx.date), ctx.leafSeason)) {
    return o.shadowOpacity * (1 - ctx.leaflessTransmission);
  }
  return o.shadowOpacity;
}

/** Shadow polygons of one object for a shadow vector `v` (per metre of height). */
export function objectShadow(o: GardenObject, v: Vec2, ctx: ShadowContext): ObjectShadow | null {
  if (o.height <= 0) return null;
  const opacity = objectOpacity(o, ctx);
  if (opacity <= 0) return null;
  let polygons: Vec2[][];
  if (isTree(o)) {
    const g = o.geometry;
    const crownBase = Math.min(Math.max(o.crownBaseHeight, 0), o.height);
    polygons = [crownShadow(g.center, g.radius, crownBase, o.height, v)];
    if (crownBase > 0.3) {
      // Trunk: a thin square prism up to the crown.
      const t = Math.min(0.15 + g.radius * 0.03, 0.4);
      const trunk = [
        { x: g.center.x - t, y: g.center.y - t },
        { x: g.center.x + t, y: g.center.y - t },
        { x: g.center.x + t, y: g.center.y + t },
        { x: g.center.x - t, y: g.center.y + t },
      ];
      polygons.push(...prismShadow(trunk, (crownBase + o.height) / 2, v));
    }
  } else {
    polygons = footprintPolygons(o.geometry, 24).flatMap((fp) => prismShadow(fp, o.height, v));
  }
  return { objectId: o.id, polygons, opacity };
}

export function gardenShadows(objects: GardenObject[], sun: SunPosition, ctx: ShadowContext): ObjectShadow[] {
  const v = shadowVector(sun, ctx.planUpBearingDeg);
  if (!v) return [];
  const out: ObjectShadow[] = [];
  for (const o of objects) {
    const s = objectShadow(o, v, ctx);
    if (s && s.polygons.length) out.push(s);
  }
  return out;
}
