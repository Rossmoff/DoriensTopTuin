/**
 * Plan check for placed plants: overlap, poor suitability, bad companions, toxicity,
 * plants on hard surfaces or outside the plot.
 */
import type { Garden, GardenObject, Id, ObjectKind, PlantPlacement, Vec2 } from '../types';
import { distance, footprintPolygons, pointInPolygon } from '../geometry';
import { placementRadius, type PlantLookup } from './placements';
import { scorePlant, type SpotConditions } from './suitability';

export type WarningKind = 'overlap' | 'unsuitable' | 'possible' | 'badCompanion' | 'toxic' | 'hardSurface' | 'outsidePlot' | 'missingPlant';

export interface PlacementWarning {
  placementId: Id;
  kind: WarningKind;
  severity: 'warn' | 'info';
  message: string;
  otherId?: Id;
}

const NO_PLANTING: Partial<Record<ObjectKind, string>> = {
  house: 'the house',
  garage: 'the garage',
  shed: 'the shed',
  greenhouse: 'the greenhouse',
  carport: 'the carport',
  terrace: 'the terrace',
  path: 'a path',
  driveway: 'the driveway',
  pond: 'the pond',
  neighbourBuilding: "the neighbour's building",
};

/** Extra distance beyond touching within which bad companions still bother each other. */
const COMPANION_REACH_M = 1;
/** Circles may overlap by this fraction of the sum of radii before we warn (planting is never exact). */
const OVERLAP_TOLERANCE = 0.15;

export interface WarningOptions {
  toxic: { children: boolean; pets: boolean };
}

export function computeWarnings(
  garden: Pick<Garden, 'placements' | 'objects' | 'boundary'>,
  lookup: PlantLookup,
  spotAt: (p: Vec2) => SpotConditions | null,
  opts: WarningOptions,
): PlacementWarning[] {
  const out: PlacementWarning[] = [];
  const ps = garden.placements;
  const radius = new Map(ps.map((p) => [p.id, placementRadius(p, lookup(p.plantId))]));
  const name = (p: PlantPlacement) => lookup(p.plantId)?.names.en ?? 'unknown plant';

  const hard = garden.objects
    .filter((o): o is GardenObject => !!NO_PLANTING[o.kind])
    .map((o) => ({ o, polys: footprintPolygons(o.geometry) }));

  for (const p of ps) {
    const plant = lookup(p.plantId);
    if (!plant) {
      out.push({ placementId: p.id, kind: 'missingPlant', severity: 'warn', message: 'This plant is no longer in the plant list.' });
      continue;
    }
    if (garden.boundary.length >= 3 && !pointInPolygon(p.center, garden.boundary)) {
      out.push({ placementId: p.id, kind: 'outsidePlot', severity: 'info', message: 'Outside the plot boundary.' });
    }
    const on = hard.find((h) => h.polys.some((poly) => pointInPolygon(p.center, poly)));
    if (on) {
      out.push({ placementId: p.id, kind: 'hardSurface', severity: 'warn', message: `Placed on ${NO_PLANTING[on.o.kind]} (${on.o.label}).`, otherId: on.o.id });
    }
    const spot = spotAt(p.center);
    if (spot) {
      const s = scorePlant(plant, spot);
      if (s.group === 'unsuitable') {
        out.push({ placementId: p.id, kind: 'unsuitable', severity: 'warn', message: `Poor match here: ${s.reasons[0] ?? 'conditions don’t suit it'}.` });
      } else if (s.group === 'possible' && s.reasons[0] && s.factors.some((f) => f.score < 1)) {
        out.push({ placementId: p.id, kind: 'possible', severity: 'info', message: `Could struggle: ${s.reasons[0]}.` });
      }
    }
    const toxicFor = [plant.toxicity.children && opts.toxic.children && 'children', plant.toxicity.pets && opts.toxic.pets && 'pets'].filter(Boolean);
    if (toxicFor.length) {
      out.push({
        placementId: p.id,
        kind: 'toxic',
        severity: 'warn',
        message: `Toxic to ${toxicFor.join(' and ')}${plant.toxicity.note ? `: ${plant.toxicity.note}` : '.'}`,
      });
    }
  }

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      const pa = lookup(a.plantId);
      const pb = lookup(b.plantId);
      if (!pa || !pb) continue;
      const ra = radius.get(a.id)!;
      const rb = radius.get(b.id)!;
      const d = distance(a.center, b.center);
      const overlap = ra + rb - d;
      if (overlap > OVERLAP_TOLERANCE * (ra + rb)) {
        const msg = (other: PlantPlacement) => `Overlaps ${name(other)} by ${overlap.toFixed(1)} m when fully grown.`;
        out.push({ placementId: a.id, kind: 'overlap', severity: 'warn', message: msg(b), otherId: b.id });
        out.push({ placementId: b.id, kind: 'overlap', severity: 'warn', message: msg(a), otherId: a.id });
      }
      const bad = pa.edible?.badCompanions.includes(pb.id) || pb.edible?.badCompanions.includes(pa.id);
      if (bad && d < ra + rb + COMPANION_REACH_M) {
        out.push({ placementId: a.id, kind: 'badCompanion', severity: 'warn', message: `${pa.names.en} and ${pb.names.en} are bad companions; keep them apart.`, otherId: b.id });
        out.push({ placementId: b.id, kind: 'badCompanion', severity: 'warn', message: `${pb.names.en} and ${pa.names.en} are bad companions; keep them apart.`, otherId: a.id });
      }
    }
  }
  const rank = (w: PlacementWarning) => (w.severity === 'warn' ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b));
}
