/**
 * Pure garden mutations: (garden, ...args) => new garden.
 * Kept free of React/zustand so they are trivially unit-testable.
 */
import { nanoid } from 'nanoid';
import type { Garden, GardenObject, GardenSettings, Geometry, Id, ManualZone, Vec2 } from '../domain/types';
import { translateGeometry } from '../domain/geometry';

export const addObject = (g: Garden, obj: GardenObject): Garden => ({ ...g, objects: [...g.objects, obj] });

export const updateObject = (g: Garden, id: Id, patch: Partial<GardenObject>): Garden => ({
  ...g,
  objects: g.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as GardenObject) : o)),
});

export const setGeometry = (g: Garden, id: Id, geometry: Geometry): Garden =>
  updateObject(g, id, { geometry } as Partial<GardenObject>);

export const deleteObject = (g: Garden, id: Id): Garden => ({
  ...g,
  objects: g.objects.filter((o) => o.id !== id),
});

/** Copy an object, offset by one grid step (min 0.5 m). Returns the new garden and the new id. */
export function duplicateObject(g: Garden, id: Id): { garden: Garden; newId: Id | null } {
  const src = g.objects.find((o) => o.id === id);
  if (!src) return { garden: g, newId: null };
  const off = Math.max(g.settings.gridSizeM, 0.5);
  const copy = {
    ...structuredClone(src),
    id: nanoid(10),
    label: `${src.label} (copy)`,
    geometry: translateGeometry(src.geometry, { x: off, y: off }),
  } as GardenObject;
  const idx = g.objects.findIndex((o) => o.id === id);
  const objects = [...g.objects];
  objects.splice(idx + 1, 0, copy);
  return { garden: { ...g, objects }, newId: copy.id };
}

export function reorderObject(g: Garden, id: Id, where: 'front' | 'back'): Garden {
  const obj = g.objects.find((o) => o.id === id);
  if (!obj) return g;
  const rest = g.objects.filter((o) => o.id !== id);
  return { ...g, objects: where === 'front' ? [...rest, obj] : [obj, ...rest] };
}

export function rotateObject(g: Garden, id: Id, deltaDeg: number): Garden {
  const obj = g.objects.find((o) => o.id === id);
  if (!obj) return g;
  const geo = obj.geometry;
  if (geo.type === 'rect') {
    return setGeometry(g, id, { ...geo, rotationDeg: (((geo.rotationDeg + deltaDeg) % 360) + 360) % 360 });
  }
  if (geo.type === 'polygon' || geo.type === 'polyline') {
    const pts = geo.points;
    const c = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
    const r = (deltaDeg * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const points = pts.map((p) => ({
      x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin,
      y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos,
    }));
    return setGeometry(g, id, { ...geo, points });
  }
  return g;
}

export const addZone = (g: Garden, z: ManualZone): Garden => ({ ...g, zones: [...g.zones, z] });

export const updateZone = (g: Garden, id: Id, patch: Partial<ManualZone>): Garden => ({
  ...g,
  zones: g.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
});

export const deleteZone = (g: Garden, id: Id): Garden => ({ ...g, zones: g.zones.filter((z) => z.id !== id) });

export const setBoundary = (g: Garden, boundary: Vec2[]): Garden => ({ ...g, boundary });

export const updateSettings = (g: Garden, patch: Partial<GardenSettings>): Garden => ({
  ...g,
  settings: { ...g.settings, ...patch },
});
