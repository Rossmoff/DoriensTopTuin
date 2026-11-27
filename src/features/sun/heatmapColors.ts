import { classifySunHours, type LightClass } from '../../domain/sun';

type RGB = [number, number, number];

/** Colour stops per light class, so the three classes stay clearly distinct. */
const RAMPS: Record<LightClass, { from: number; to: number; c0: RGB; c1: RGB }> = {
  shade: { from: 0, to: 3, c0: [52, 58, 140], c1: [86, 135, 200] },
  partialShade: { from: 3, to: 6, c0: [120, 190, 120], c1: [200, 220, 90] },
  fullSun: { from: 6, to: 12, c0: [250, 210, 60], c1: [240, 120, 30] },
};

export const CLASS_COLOR: Record<LightClass, string> = {
  shade: 'rgb(70,96,170)',
  partialShade: 'rgb(160,205,105)',
  fullSun: 'rgb(246,180,50)',
};

/** Colour for `h` hours; the full-sun ramp runs from 6 h up to `maxHours` (open-sky day length). */
export function hoursColor(h: number, maxHours = 12): RGB {
  const cls = classifySunHours(h);
  const r = RAMPS[cls];
  const to = cls === 'fullSun' ? Math.max(maxHours, 7) : r.to;
  const t = Math.max(0, Math.min(1, (h - r.from) / (to - r.from)));
  return [0, 1, 2].map((i) => Math.round(r.c0[i] + (r.c1[i] - r.c0[i]) * t)) as RGB;
}
