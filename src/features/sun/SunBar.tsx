import { useEffect, useMemo, useRef } from 'react';
import { formatMinutes, sunAtLocal, sunDay, LIGHT_CLASS_LABEL, type LightClass } from '../../domain/sun';
import { useGardenStore } from '../../state/gardenStore';
import { nowMinutesIn, todayIn, useSunStore, type PeriodChoice } from '../../state/sunStore';
import { Icon } from '../../ui/Icon';
import { CLASS_COLOR } from './heatmapColors';
import { periodFor, periodLabel } from './useSunHoursJob';

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compassName = (az: number) => COMPASS[Math.round(az / 22.5) % 16];
const narrowLabel = (wide: string, narrow: string) => (window.matchMedia('(max-width: 767px)').matches ? narrow : wide);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Speed of the animation: minutes of sun time per second. */
const PLAY_SPEED = 90;

export function SunBar() {
  const garden = useGardenStore((s) => s.garden)!;
  const s = useSunStore();
  const loc = garden.location;
  const day = useMemo(() => sunDay(s.date, loc.lat, loc.lon, loc.timeZone), [s.date, loc.lat, loc.lon, loc.timeZone]);
  const min = Math.floor((day.sunrise ?? 0) / 5) * 5;
  const max = Math.ceil((day.sunset ?? 1440) / 5) * 5;
  const sun = sunAtLocal(s.date, s.minutes, loc, garden.sunCorrection);

  // Keep the time within daylight when the date changes.
  useEffect(() => {
    const m = useSunStore.getState().minutes;
    if (m < min || m > max) useSunStore.getState().set({ minutes: Math.round(day.solarNoon / 5) * 5 });
  }, [min, max, day.solarNoon]);

  // Animation
  const raf = useRef(0);
  useEffect(() => {
    if (!s.playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const st = useSunStore.getState();
      let m = st.minutes + ((now - last) / 1000) * PLAY_SPEED;
      last = now;
      if (m > max) m = min;
      st.set({ minutes: m });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [s.playing, min, max]);

  const setPreset = (v: string) => {
    if (!v) return;
    const year = s.date.slice(0, 4);
    if (v === 'now') s.set({ date: todayIn(loc.timeZone), minutes: nowMinutesIn(loc.timeZone) });
    else s.set({ date: `${year}-${v}` });
  };

  const period = periodFor(s);
  const resultLabel = s.result ? periodLabel(period) : '';

  return (
    <div className="overlay sun-bar" data-testid="sun-bar">
      <div className="row">
        <div className="seg" role="tablist" aria-label="Sun view">
          <button className={`btn ${s.view === 'shadows' ? 'active' : ''}`} role="tab" aria-selected={s.view === 'shadows'} onClick={() => s.set({ view: 'shadows' })} data-testid="view-shadows">
            {narrowLabel('Shadows', 'Shade')}
          </button>
          <button className={`btn ${s.view === 'hours' ? 'active' : ''}`} role="tab" aria-selected={s.view === 'hours'} onClick={() => s.set({ view: 'hours', playing: false })} data-testid="view-hours">
            {narrowLabel('Sun hours', 'Hours')}
          </button>
        </div>
        <input type="date" className="btn date" aria-label="Date" value={s.date} onChange={(e) => e.target.value && s.set({ date: e.target.value })} data-testid="sun-date" />
        <select className="btn presets" aria-label="Date presets" value="" onChange={(e) => setPreset(e.target.value)} data-testid="sun-presets">
          <option value="">{narrowLabel('Presets…', '⋯')}</option>
          <option value="03-21">21 Mar (equinox)</option>
          <option value="06-21">21 Jun (longest day)</option>
          <option value="09-21">21 Sep (equinox)</option>
          <option value="12-21">21 Dec (shortest day)</option>
          <option value="now">Today, now</option>
        </select>
        <button className="btn icon ghost close" aria-label="Close sun view" onClick={() => s.set({ view: 'off', playing: false, probe: null })}>
          <Icon name="close" />
        </button>
      </div>

      {s.view === 'shadows' ? (
        <div className="row">
          <button className="btn icon" aria-label={s.playing ? 'Pause' : 'Play the day'} onClick={() => s.set({ playing: !s.playing })} data-testid="sun-play">
            {s.playing ? '❚❚' : '▶'}
          </button>
          <input
            type="range"
            className="time-slider"
            aria-label="Time of day"
            min={min}
            max={max}
            step={5}
            value={Math.round(s.minutes)}
            onChange={(e) => s.set({ minutes: Number(e.target.value), playing: false })}
            data-testid="sun-time"
            style={{ ['--noon' as string]: `${((day.solarNoon - min) / Math.max(max - min, 1)) * 100}%` }}
          />
          <div className="sun-readout" data-testid="sun-readout">
            <strong>{formatMinutes(s.minutes)}</strong>
            <span>
              {sun.altitudeDeg > 0 ? `${Math.round(sun.altitudeDeg)}° high, ${compassName(sun.azimuthDeg)}` : 'below horizon'}
            </span>
          </div>
        </div>
      ) : (
        <div className="row">
          <select
            className="btn"
            aria-label="Period"
            value={s.period}
            onChange={(e) => s.set({ period: e.target.value as PeriodChoice })}
            data-testid="sun-period"
          >
            <option value="season">Growing season (Apr–Sep)</option>
            <option value="day">Selected day only</option>
            <option value="year">Whole year</option>
            <option value="custom">Choose months…</option>
          </select>
          {s.period === 'custom' && (
            <>
              <select className="btn" aria-label="From month" value={s.customFromMonth} onChange={(e) => s.set({ customFromMonth: Number(e.target.value) })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select className="btn" aria-label="To month" value={s.customToMonth} onChange={(e) => s.set({ customToMonth: Number(e.target.value) })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
          {s.period !== 'day' && (
            <label className="check small">
              <input type="checkbox" checked={s.daily} onChange={(e) => s.set({ daily: e.target.checked })} /> Every day
            </label>
          )}
          <div className="legend" aria-label="Legend">
            {(['fullSun', 'partialShade', 'shade'] as LightClass[]).map((c) => (
              <span key={c}>
                <i style={{ background: CLASS_COLOR[c] }} /> {LIGHT_CLASS_LABEL[c]}
              </span>
            ))}
          </div>
          <div className="status" data-testid="sun-status">
            {s.progress !== null ? (
              <>
                Calculating… {Math.round(s.progress * 100)}%
                <progress max={1} value={s.progress} />
              </>
            ) : s.result ? (
              `${resultLabel} · open sky ${s.result.daylightHours.toFixed(1)} h/day · tap a spot`
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
