import type { Vec2 } from '../types';

export const snapValue = (n: number, step: number): number => (step > 0 ? Math.round(n / step) * step : n);

export const snapPoint = (p: Vec2, step: number, enabled = true): Vec2 =>
  enabled ? { x: snapValue(p.x, step), y: snapValue(p.y, step) } : p;

/** Snap an angle to multiples of `stepDeg` if within `toleranceDeg`. */
export function snapAngle(deg: number, stepDeg = 15, toleranceDeg = 4): number {
  const s = snapValue(deg, stepDeg);
  return Math.abs(s - deg) <= toleranceDeg ? s : deg;
}

/** Pick a "nice" number (1, 2, 5 × 10^n) not greater than `max`. */
export function niceNumber(max: number): number {
  if (max <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [5, 2, 1]) if (m * p <= max) return m * p;
  return p;
}
