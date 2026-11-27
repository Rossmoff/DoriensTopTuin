import type { Vec2 } from '../../domain/types';
import type { BBox } from '../../domain/geometry';
import type { View } from '../../state/uiStore';

export const MIN_SCALE = 2; // px per metre
export const MAX_SCALE = 400;

export const screenToWorld = (p: Vec2, v: View): Vec2 => ({ x: (p.x - v.x) / v.scale, y: (p.y - v.y) / v.scale });
export const worldToScreen = (p: Vec2, v: View): Vec2 => ({ x: p.x * v.scale + v.x, y: p.y * v.scale + v.y });

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Zoom by `factor` keeping the world point under `screenPt` fixed. */
export function zoomAt(v: View, screenPt: Vec2, factor: number): View {
  const scale = clampScale(v.scale * factor);
  const world = screenToWorld(screenPt, v);
  return { scale, x: screenPt.x - world.x * scale, y: screenPt.y - world.y * scale };
}

/** View that fits `box` into a viewport of `size` with `padding` px around it. */
export function fitView(box: BBox, size: { width: number; height: number }, padding = 40, bottomInset = 0): View {
  const w = Math.max(box.maxX - box.minX, 1);
  const h = Math.max(box.maxY - box.minY, 1);
  const availW = Math.max(size.width - 2 * padding, 50);
  const availH = Math.max(size.height - 2 * padding - bottomInset, 50);
  const scale = clampScale(Math.min(availW / w, availH / h));
  return {
    scale,
    x: padding + (availW - w * scale) / 2 - box.minX * scale,
    y: padding + (availH - h * scale) / 2 - box.minY * scale,
  };
}
