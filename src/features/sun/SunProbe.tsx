import { useMemo } from 'react';
import {
  cellIndexAt, classifySunHours, gardenShadows, lightClassAt, LIGHT_CLASS_LABEL, sunAtLocal, sunHoursAtPoint, zonesAt,
} from '../../domain/sun';
import { pointInPolygon } from '../../domain/geometry';
import { useGardenStore } from '../../state/gardenStore';
import { useSunStore } from '../../state/sunStore';
import { Icon } from '../../ui/Icon';
import { ZONE_STYLE } from '../editor/ZoneShape';
import { CLASS_COLOR } from './heatmapColors';
import { periodFor, periodLabel } from './useSunHoursJob';

const fmtH = (h: number) => `${h.toFixed(1)} h`;

/** Info card for a tapped spot: sun hours, light class, manual zones. */
export function SunProbe() {
  const garden = useGardenStore((s) => s.garden)!;
  const s = useSunStore();
  const p = s.probe;
  const { view, result, date, period, customFromMonth, customToMonth, daily } = s;

  const info = useMemo(() => {
    if (!p) return null;
    const zones = zonesAt(p, garden.zones);
    if (view === 'hours') {
      if (!result) return { zones, hours: null as number | null, label: '' };
      const i = cellIndexAt(result.grid, p);
      const h = i === null ? NaN : result.hours[i];
      return { zones, hours: Number.isNaN(h) ? null : h, label: periodLabel(periodFor({ period, date, customFromMonth, customToMonth, daily })) };
    }
    const day = { kind: 'day' as const, date };
    return { zones, hours: sunHoursAtPoint(garden, p, day), label: periodLabel(day) };
  }, [p, garden, view, result, date, period, customFromMonth, customToMonth, daily]);

  const blockedBy = useMemo(() => {
    if (!p || s.view !== 'shadows') return [];
    const sun = sunAtLocal(s.date, s.minutes, garden.location, garden.sunCorrection);
    if (sun.altitudeDeg <= 0) return null;
    const shadows = gardenShadows(garden.objects, sun, {
      date: s.date,
      planUpBearingDeg: garden.planUpBearingDeg,
      leafSeason: garden.settings.leafSeason,
      leaflessTransmission: garden.settings.leaflessTransmission,
    });
    return shadows
      .filter((sh) => sh.polygons.some((poly) => pointInPolygon(p, poly)))
      .map((sh) => garden.objects.find((o) => o.id === sh.objectId)?.label ?? '?');
  }, [p, garden, s.view, s.date, s.minutes]);

  if (!p || !info) return null;
  const cls = info.hours !== null ? lightClassAt(info.hours, info.zones) : null;
  return (
    <div className="overlay sun-probe" role="status" data-testid="sun-probe">
      <button className="btn icon ghost close" aria-label="Close" onClick={() => s.set({ probe: null })}>
        <Icon name="close" />
      </button>
      {info.hours === null ? (
        <p>{s.view === 'hours' && !s.result ? 'Calculating sun hours…' : 'Outside the plot or under a roof.'}</p>
      ) : (
        <>
          <p className="big">
            <i style={{ background: CLASS_COLOR[cls!] }} /> <strong data-testid="probe-hours">{fmtH(info.hours)}</strong> direct sun per day
          </p>
          <p className="hint">
            {info.label}. {LIGHT_CLASS_LABEL[cls!]}
            {cls !== classifySunHours(info.hours) && ' (marked shady)'}
          </p>
        </>
      )}
      {s.view === 'shadows' && (
        <p className="hint">
          At {String(Math.floor(s.minutes / 60)).padStart(2, '0')}:{String(Math.floor(s.minutes % 60)).padStart(2, '0')}:{' '}
          {blockedBy === null ? 'sun is down' : blockedBy.length ? `in shade of ${blockedBy.join(', ')}` : 'in the sun'}
        </p>
      )}
      {info.zones.length > 0 && <p className="hint">Zone: {info.zones.map((z) => ZONE_STYLE[z].label).join(', ')}</p>}
    </div>
  );
}
