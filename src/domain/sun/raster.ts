import type { Vec2 } from '../types';

export interface GridSpec {
  originX: number;
  originY: number;
  cellSize: number;
  cols: number;
  rows: number;
}

/**
 * Scan-line fill: calls `visit(index)` for every cell whose centre lies inside the polygon.
 */
export function rasterizePolygon(poly: Vec2[], grid: GridSpec, visit: (index: number) => void): void {
  const n = poly.length;
  if (n < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const { originX, originY, cellSize, cols, rows } = grid;
  const r0 = Math.max(0, Math.ceil((minY - originY) / cellSize - 0.5));
  const r1 = Math.min(rows - 1, Math.floor((maxY - originY) / cellSize - 0.5));
  const xs: number[] = [];
  for (let r = r0; r <= r1; r++) {
    const y = originY + (r + 0.5) * cellSize;
    xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - originX) / cellSize - 0.5));
      const c1 = Math.min(cols - 1, Math.floor((xs[k + 1] - originX) / cellSize - 0.5));
      const base = r * cols;
      for (let c = c0; c <= c1; c++) visit(base + c);
    }
  }
}

export function cellCenter(grid: GridSpec, index: number): Vec2 {
  const r = Math.floor(index / grid.cols);
  const c = index - r * grid.cols;
  return { x: grid.originX + (c + 0.5) * grid.cellSize, y: grid.originY + (r + 0.5) * grid.cellSize };
}

export function cellIndexAt(grid: GridSpec, p: Vec2): number | null {
  const c = Math.floor((p.x - grid.originX) / grid.cellSize);
  const r = Math.floor((p.y - grid.originY) / grid.cellSize);
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return null;
  return r * grid.cols + c;
}
