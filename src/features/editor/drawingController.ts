/**
 * Turns pointer input into new objects / boundary / measurements.
 * Works on world coordinates (metres); reads and writes the zustand stores directly
 * so the canvas and the HTML hint bar can both drive it.
 */
import { nanoid } from 'nanoid';
import type { Geometry, Vec2 } from '../../domain/types';
import { distance, snapPoint } from '../../domain/geometry';
import { createObject, defaultGeometry } from '../../data/objectCatalog';
import { addObject, addPlacement, addZone, setBoundary } from '../../state/gardenActions';
import { gardenStore } from '../../state/gardenStore';
import { uiStore } from '../../state/uiStore';
import { useDrawStore } from './drawStore';

/** Screen distance (px) below which a press counts as a tap. */
export const TAP_PX = 10;

const draw = () => useDrawStore.getState();
const scale = () => uiStore.getState().view.scale;

function snapped(p: Vec2): Vec2 {
  const g = gardenStore.getState().garden;
  if (!g) return p;
  return snapPoint(p, g.settings.gridSizeM, g.settings.snap);
}

const isTap = (a: Vec2, b: Vec2) => distance(a, b) * scale() < TAP_PX;

export function pointerDown(world: Vec2) {
  const tool = uiStore.getState().tool;
  if (tool.type === 'measure') {
    const m = draw().measure;
    if (m && !m.done && !m.dragging) {
      draw().set({ measure: { ...m, b: world, done: true } });
    } else {
      draw().set({ measure: { a: world, b: world, done: false, dragging: true } });
    }
    return;
  }
  if (tool.type === 'draw' || tool.type === 'boundary' || tool.type === 'zone' || tool.type === 'place') {
    draw().set({ pressStart: snapped(world), cursor: snapped(world) });
  }
}

export function pointerMove(world: Vec2) {
  const tool = uiStore.getState().tool;
  if (tool.type === 'measure') {
    const m = draw().measure;
    if (m?.dragging) draw().set({ measure: { ...m, b: world } });
    return;
  }
  if (tool.type === 'draw' || tool.type === 'boundary' || tool.type === 'zone') draw().set({ cursor: snapped(world) });
}

export function pointerUp(world: Vec2) {
  const tool = uiStore.getState().tool;
  const { pressStart, points } = draw();
  if (tool.type === 'measure') {
    const m = draw().measure;
    if (m?.dragging) draw().set({ measure: { ...m, b: world, dragging: false, done: !isTap(m.a, world) } });
    return;
  }
  if (!pressStart) return;
  const p = snapped(world);
  draw().set({ pressStart: null });

  if (tool.type === 'place') {
    // Each tap places one plant; the tool stays active until Done.
    if (!isTap(pressStart, p)) return;
    const placement = { id: nanoid(10), plantId: tool.plantId, center: p, quantity: 1 };
    gardenStore.getState().update((g) => addPlacement(g, placement));
    draw().set({ placedCount: draw().placedCount + 1 });
    return;
  }

  const multiPoint = tool.type === 'boundary' || tool.type === 'zone' || (tool.type === 'draw' && (tool.shape === 'polygon' || tool.shape === 'polyline'));
  if (multiPoint) {
    if (!isTap(pressStart, p)) return; // a drag, not a tap: ignore
    const closes = tool.type !== 'draw' || tool.shape === 'polygon';
    if (closes && points.length >= 3 && isTap(points[0], p)) {
      finish();
      return;
    }
    const last = points[points.length - 1];
    // Tapping the last point again finishes the shape.
    if (last && isTap(last, p)) {
      if (points.length >= (closes ? 3 : 2)) finish();
      return;
    }
    draw().set({ points: [...points, p] });
    return;
  }

  if (tool.type !== 'draw') return;
  let geometry: Geometry;
  if (isTap(pressStart, p)) {
    geometry = defaultGeometry(tool.kind, tool.shape, pressStart);
  } else if (tool.shape === 'circle') {
    geometry = { type: 'circle', center: pressStart, radius: Math.max(distance(pressStart, p), 0.1) };
  } else {
    const w = Math.max(Math.abs(p.x - pressStart.x), 0.1);
    const l = Math.max(Math.abs(p.y - pressStart.y), 0.1);
    geometry = {
      type: 'rect',
      center: { x: (p.x + pressStart.x) / 2, y: (p.y + pressStart.y) / 2 },
      width: w,
      length: l,
      rotationDeg: 0,
    };
  }
  createAndSelect(tool.kind, geometry);
}

function createAndSelect(kind: Parameters<typeof createObject>[0], geometry: Geometry) {
  const g = gardenStore.getState().garden;
  if (!g) return;
  const obj = createObject(kind, geometry, g.objects);
  gardenStore.getState().update((gg) => addObject(gg, obj));
  draw().reset();
  uiStore.getState().setTool({ type: 'select' });
  uiStore.getState().select(obj.id);
}

/** Finish a polygon / polyline / boundary. */
export function finish() {
  const tool = uiStore.getState().tool;
  const { points } = draw();
  if (tool.type === 'boundary') {
    if (points.length < 3) {
      uiStore.getState().showToast('A boundary needs at least 3 corners.');
      return;
    }
    gardenStore.getState().update((g) => setBoundary(g, points));
    draw().reset();
    uiStore.getState().setTool({ type: 'select' });
    return;
  }
  if (tool.type === 'zone') {
    if (points.length < 3) {
      uiStore.getState().showToast('A zone needs at least 3 corners.');
      return;
    }
    const zone = { id: nanoid(10), kind: tool.kind, points };
    gardenStore.getState().update((g) => addZone(g, zone));
    draw().reset();
    uiStore.getState().setTool({ type: 'select' });
    uiStore.getState().select(zone.id);
    return;
  }
  if (tool.type !== 'draw') return;
  if (tool.shape === 'polygon') {
    if (points.length < 3) {
      uiStore.getState().showToast('Add at least 3 corners.');
      return;
    }
    createAndSelect(tool.kind, { type: 'polygon', points });
  } else if (tool.shape === 'polyline') {
    if (points.length < 2) {
      uiStore.getState().showToast('Add at least 2 points.');
      return;
    }
    const thickness = defaultGeometry(tool.kind, 'polyline', { x: 0, y: 0 });
    createAndSelect(tool.kind, { type: 'polyline', points, thickness: (thickness as { thickness: number }).thickness });
  }
}

export function undoPoint() {
  const { points } = draw();
  draw().set({ points: points.slice(0, -1) });
}

export function cancel() {
  const back = uiStore.getState().tool.type === 'place' ? draw().returnTo : null;
  draw().reset();
  uiStore.getState().setTool({ type: 'select' });
  if (back) uiStore.getState().select(back);
}

/** Abort an in-progress press (e.g. when a second finger lands for pinch-zoom). */
export function abortPress() {
  const m = draw().measure;
  draw().set({ pressStart: null, ...(m?.dragging && !m.done ? { measure: null } : {}) });
}
