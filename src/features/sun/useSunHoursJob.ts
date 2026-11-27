import { useEffect } from 'react';
import type { Garden } from '../../domain/types';
import { growingSeason, sunHoursInputForGarden, type SunPeriod } from '../../domain/sun';
import { useGardenStore } from '../../state/gardenStore';
import { sunStore, useSunStore, type SunState } from '../../state/sunStore';
import { runSunHours } from './sunHoursClient';

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function periodFor(s: Pick<SunState, 'period' | 'date' | 'customFromMonth' | 'customToMonth' | 'daily'>): SunPeriod {
  const year = Number(s.date.slice(0, 4));
  const step = s.daily ? 1 : 7;
  const pad = (n: number) => String(n).padStart(2, '0');
  switch (s.period) {
    case 'day':
      return { kind: 'day', date: s.date };
    case 'year':
      return { kind: 'range', from: `${year}-01-01`, to: `${year}-12-31`, stepDays: step };
    case 'custom': {
      const f = Math.min(s.customFromMonth, s.customToMonth);
      const t = Math.max(s.customFromMonth, s.customToMonth);
      const lastDay = t === 2 ? 28 : MONTH_DAYS[t - 1];
      return { kind: 'range', from: `${year}-${pad(f)}-01`, to: `${year}-${pad(t)}-${lastDay}`, stepDays: step };
    }
    default:
      return growingSeason(year, step);
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function periodLabel(p: SunPeriod): string {
  if (p.kind === 'day') {
    const [, m, d] = p.date.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  }
  const f = Number(p.from.slice(5, 7));
  const t = Number(p.to.slice(5, 7));
  return f === 1 && t === 12 ? 'whole year' : `${MONTHS[f - 1]}–${MONTHS[t - 1]} average`;
}

/** The parts of a garden that affect sun hours. */
function inputsKey(g: Garden, period: SunPeriod): string {
  return JSON.stringify([g.objects, g.boundary, g.planUpBearingDeg, g.location, g.sunCorrection, g.settings.leafSeason, g.settings.leaflessTransmission, period]);
}

/** Keeps the sun-hours map up to date while the map is shown. */
export function useSunHoursJob() {
  const garden = useGardenStore((s) => s.garden);
  const view = useSunStore((s) => s.view);
  const period = useSunStore((s) => s.period);
  const date = useSunStore((s) => s.date);
  const from = useSunStore((s) => s.customFromMonth);
  const to = useSunStore((s) => s.customToMonth);
  const daily = useSunStore((s) => s.daily);

  useEffect(() => {
    if (view !== 'hours' || !garden) return;
    const p = periodFor({ period, date, customFromMonth: from, customToMonth: to, daily });
    const key = inputsKey(garden, p);
    if (sunStore.getState().resultKey === key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      sunStore.getState().set({ progress: 0 });
      runSunHours(sunHoursInputForGarden(garden, p), (f) => !cancelled && sunStore.getState().set({ progress: f }))
        .then((result) => {
          if (!cancelled) sunStore.getState().set({ result, resultKey: key, progress: null });
        })
        .catch(() => !cancelled && sunStore.getState().set({ progress: null }));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [garden, view, period, date, from, to, daily]);
}
