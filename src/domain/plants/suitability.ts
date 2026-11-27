/**
 * Plant ↔ spot matching. Each factor scores 0..1 with a short human reason; the overall score is
 * a weighted mean, and a very poor factor makes a plant unsuitable whatever the average says.
 */
import type { Level3, Plant, SoilProfile, SunNeed, ZoneKind } from '../types';
import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../types';
import { classifySunHours, type LightClass } from '../sun/sunHours';
import { moistureIndex, TEXTURE_ORDER, zoneNumber } from './soil';

export interface SpotConditions {
  /** Average hours of direct sun per day in the growing season; null = not known yet. */
  sunHours: number | null;
  soil: SoilProfile;
  zones: ZoneKind[];
  usdaZone: string;
}

export type FactorId = 'sun' | 'moisture' | 'pH' | 'soil' | 'fertility' | 'hardiness';

export interface FactorResult {
  factor: FactorId;
  score: number;
  /** Short explanation shown when the factor is a problem (score < 1). */
  reason?: string;
  /** Short positive note shown for good matches. */
  good?: string;
}

export type SuitabilityGroup = 'good' | 'possible' | 'unsuitable';

export interface Suitability {
  plant: Plant;
  score: number;
  group: SuitabilityGroup;
  factors: FactorResult[];
  /** Problems first (worst first), then positives. */
  reasons: string[];
}

const WEIGHTS: Record<FactorId, number> = { sun: 3, moisture: 2.5, pH: 2, soil: 1, fertility: 1, hardiness: 2 };

/** Light class of the spot, with a "shady" zone forcing shade. */
export function spotLightClass(spot: SpotConditions): LightClass | null {
  if (spot.zones.includes('shady')) return 'shade';
  return spot.sunHours === null ? null : classifySunHours(spot.sunHours);
}

const SUN_RANGE: Record<SunNeed, [number, number]> = {
  fullSun: [6, 24],
  partialShade: [3, 6],
  shade: [0, 3],
};

const SUN_TEXT: Record<SunNeed, string> = { fullSun: 'full sun', partialShade: 'partial shade', shade: 'shade' };

function sunFactor(plant: Plant, spot: SpotConditions): FactorResult | null {
  const needs = plant.needs.sun;
  if (needs.length === 0) return null;
  let hours = spot.sunHours;
  if (spot.zones.includes('shady')) hours = Math.min(hours ?? 2, 2);
  if (hours === null) return null;
  const lo = Math.min(...needs.map((n) => SUN_RANGE[n][0]));
  const hi = Math.max(...needs.map((n) => SUN_RANGE[n][1]));
  const h = hours.toFixed(1);
  if (hours >= lo && hours <= hi) {
    return { factor: 'sun', score: 1, good: `suits ${h} h of sun` };
  }
  if (hours < lo) {
    const d = lo - hours;
    const score = Math.max(0, 1 - d / 3);
    const want = needs.includes('fullSun') && !needs.includes('partialShade') ? 'full sun (≥ 6 h)' : `at least ${lo} h of sun`;
    return { factor: 'sun', score, reason: `needs ${want}, this spot gets ~${h} h` };
  }
  // Too much sun for shade lovers: leaves scorch, soil dries out.
  const d = hours - hi;
  const score = Math.max(0, 1 - d / 4);
  return {
    factor: 'sun',
    score,
    reason: `prefers ${needs.map((n) => SUN_TEXT[n]).join(' or ')}; ~${h} h of sun may scorch it`,
  };
}

function moistureFactor(plant: Plant, soil: SoilProfile): FactorResult {
  const want = plant.needs.moisture.map(moistureIndex);
  const have = moistureIndex(soil.moisture);
  const texture = SOIL_TEXTURE_LABELS[soil.texture].en.toLowerCase();
  const moistLabel = MOISTURE_LABELS[soil.moisture].en.toLowerCase();
  if (want.includes(have)) {
    return {
      factor: 'moisture',
      score: 1,
      good: soil.moisture === 'dry' && plant.needs.droughtTolerance === 'high' ? 'drought tolerant' : `happy in ${moistLabel} soil`,
    };
  }
  const minW = Math.min(...want);
  const maxW = Math.max(...want);
  if (have < minW) {
    const steps = minW - have;
    const tol: Record<Level3, number[]> = { high: [0.8, 0.4, 0.2], medium: [0.55, 0.2, 0.05], low: [0.35, 0.05, 0] };
    const score = tol[plant.needs.droughtTolerance][steps - 1] ?? 0;
    const need = plant.needs.moisture.map((m) => MOISTURE_LABELS[m].en.toLowerCase()).join(' or ');
    return {
      factor: 'moisture',
      score,
      reason: `needs ${need} soil, this spot is ${moistLabel} ${texture}${score >= 0.5 ? ' (manageable with mulch and watering)' : ''}`,
    };
  }
  const steps = have - maxW;
  const score = [0.5, 0.15, 0][steps - 1] ?? 0;
  return { factor: 'moisture', score, reason: `dislikes wet feet; this spot is ${moistLabel}` };
}

function pHFactor(plant: Plant, soil: SoilProfile): FactorResult {
  const { min, max } = plant.needs.pH;
  const ph = soil.pH;
  const where = `this spot is ~${ph.toFixed(1)}`;
  if (ph >= min && ph <= max) {
    return { factor: 'pH', score: 1, good: max <= 6.5 ? 'likes acid soil' : undefined };
  }
  const d = ph < min ? min - ph : ph - max;
  const score = Math.max(0, 1 - d / 1.5);
  const reason = ph < min ? `prefers pH ≥ ${min.toFixed(1)}, ${where}` : `needs acid soil (pH ≤ ${max.toFixed(1)}), ${where}`;
  return { factor: 'pH', score, reason };
}

function textureFactor(plant: Plant, soil: SoilProfile): FactorResult {
  const ok = plant.needs.soils;
  if (ok.length === 0 || ok.includes(soil.texture)) return { factor: 'soil', score: 1 };
  const label = SOIL_TEXTURE_LABELS[soil.texture].en.toLowerCase();
  const wanted = ok.map((t) => SOIL_TEXTURE_LABELS[t].en.toLowerCase()).join(', ');
  let steps = 3;
  if (soil.texture !== 'peat') {
    const i = TEXTURE_ORDER.indexOf(soil.texture);
    for (const t of ok) if (t !== 'peat') steps = Math.min(steps, Math.abs(TEXTURE_ORDER.indexOf(t) - i));
  } else if (ok.includes('sand') || ok.includes('loamySand')) {
    steps = 1;
  }
  const score = [1, 0.7, 0.35, 0.1][steps] ?? 0.1;
  return { factor: 'soil', score, reason: `prefers ${wanted}, this is ${label}` };
}

function fertilityFactor(plant: Plant, soil: SoilProfile): FactorResult | null {
  const need = plant.needs.fertility;
  if (!need) return null;
  const lv = { low: 0, medium: 1, high: 2 };
  const gap = lv[need] - lv[soil.organicMatter];
  if (gap <= 0) return { factor: 'fertility', score: 1 };
  return {
    factor: 'fertility',
    score: gap === 1 ? 0.65 : 0.35,
    reason: `${need === 'high' ? 'hungry plant' : 'likes richer soil'}: dig in compost (organic matter is ${soil.organicMatter})`,
  };
}

function hardinessFactor(plant: Plant, spot: SpotConditions): FactorResult | null {
  // Annual crops are grown in the warm season; hardiness doesn't apply.
  if (plant.lifecycle === 'annual') return null;
  const site = zoneNumber(spot.usdaZone);
  if (Number.isNaN(site)) return null;
  const need = plant.needs.usdaZoneMin;
  if (need <= site) return { factor: 'hardiness', score: 1 };
  if (need - site <= 0.5) return { factor: 'hardiness', score: 0.5, reason: `borderline hardy here (zone ${need}, you are in ${spot.usdaZone})` };
  return { factor: 'hardiness', score: 0, reason: `not hardy here (needs zone ${need}, you are in ${spot.usdaZone})` };
}

export function scorePlant(plant: Plant, spot: SpotConditions): Suitability {
  const factors = [
    sunFactor(plant, spot),
    moistureFactor(plant, spot.soil),
    pHFactor(plant, spot.soil),
    textureFactor(plant, spot.soil),
    fertilityFactor(plant, spot.soil),
    hardinessFactor(plant, spot),
  ].filter((f): f is FactorResult => f !== null);

  let wSum = 0;
  let sum = 0;
  for (const f of factors) {
    wSum += WEIGHTS[f.factor];
    sum += WEIGHTS[f.factor] * f.score;
  }
  const score = wSum ? sum / wSum : 0;
  const worst = Math.min(...factors.map((f) => f.score));
  const group: SuitabilityGroup = worst < 0.25 || score < 0.5 ? 'unsuitable' : score >= 0.8 && worst >= 0.5 ? 'good' : 'possible';

  const problems = factors.filter((f) => f.score < 1 && f.reason).sort((a, b) => a.score - b.score).map((f) => f.reason!);
  const positives = factors.filter((f) => f.score === 1 && f.good).map((f) => f.good!);
  if (plant.nativeBE) positives.push('native to Belgium');
  return { plant, score, group, factors, reasons: [...problems, ...positives] };
}

export interface RankedPlants {
  good: Suitability[];
  possible: Suitability[];
  unsuitable: Suitability[];
}

export function rankPlants(plants: Plant[], spot: SpotConditions): RankedPlants {
  // Ties (many plants score 1.0) are broken by how specifically the plant suits the spot:
  // more positive notes (acid lover, drought tolerant, native…) rank first.
  const positives = (s: Suitability) => s.factors.filter((f) => f.score === 1 && f.good).length + (s.plant.nativeBE ? 1 : 0);
  const all = plants
    .map((p) => scorePlant(p, spot))
    .sort((a, b) => b.score - a.score || positives(b) - positives(a) || a.plant.names.en.localeCompare(b.plant.names.en));
  return {
    good: all.filter((s) => s.group === 'good'),
    possible: all.filter((s) => s.group === 'possible'),
    unsuitable: all.filter((s) => s.group === 'unsuitable'),
  };
}
