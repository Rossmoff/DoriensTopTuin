import { create } from 'zustand';
import type { Vec2 } from '../domain/types';
import { formatLocalDate, zonedParts, type SunHoursResult } from '../domain/sun';

export type SunView = 'off' | 'shadows' | 'hours';
export type PeriodChoice = 'day' | 'season' | 'year' | 'custom';

export interface SunState {
  view: SunView;
  /** Local date in the garden's zone, "YYYY-MM-DD". */
  date: string;
  /** Minutes after local midnight. */
  minutes: number;
  playing: boolean;
  period: PeriodChoice;
  customFromMonth: number;
  customToMonth: number;
  /** Sample every day instead of once a week for periods. */
  daily: boolean;
  result: SunHoursResult | null;
  /** Key of the inputs `result` was computed from. */
  resultKey: string | null;
  progress: number | null;
  /** Tapped point for the sun info card. */
  probe: Vec2 | null;
  /** Growing-season map used for plant matching (independent of what is displayed). */
  season: { key: string; result: SunHoursResult } | null;
  seasonProgress: number | null;
  set: (patch: Partial<Omit<SunState, 'set'>>) => void;
}

export function todayIn(tz: string): string {
  const p = zonedParts(new Date(), tz);
  return formatLocalDate(p.year, p.month, p.day);
}

export function nowMinutesIn(tz: string): number {
  const p = zonedParts(new Date(), tz);
  return p.hour * 60 + p.minute;
}

export const useSunStore = create<SunState>()((set) => ({
  view: 'off',
  date: todayIn('Europe/Brussels'),
  minutes: 13 * 60,
  playing: false,
  period: 'season',
  customFromMonth: 4,
  customToMonth: 9,
  daily: false,
  result: null,
  resultKey: null,
  progress: null,
  probe: null,
  season: null,
  seasonProgress: null,
  set: (patch) => set(patch),
}));

export const sunStore = useSunStore;
