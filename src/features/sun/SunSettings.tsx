import { useMemo, useState } from 'react';
import type { Month } from '../../domain/types';
import { calibrate, formatMinutes, sunDay } from '../../domain/sun';
import { updateSettings } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { todayIn } from '../../state/sunStore';
import { NumberField } from '../../ui/NumberField';
import { compassName } from './SunBar';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function SunSettings() {
  const garden = useGardenStore((s) => s.garden)!;
  const update = useGardenStore((s) => s.update);
  const leaf = garden.settings.leafSeason;
  const corr = garden.sunCorrection;
  const [open, setOpen] = useState(corr.enabled);
  const [obsDate, setObsDate] = useState(corr.observed?.date ?? todayIn(garden.location.timeZone));
  const [rise, setRise] = useState(corr.observed?.sunriseBearingDeg?.toString() ?? '');
  const [set, setSet] = useState(corr.observed?.sunsetBearingDeg?.toString() ?? '');
  const [noon, setNoon] = useState(corr.observed?.noonAltitudeDeg?.toString() ?? '');
  const model = useMemo(
    () => sunDay(obsDate, garden.location.lat, garden.location.lon, garden.location.timeZone),
    [obsDate, garden.location],
  );
  const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s.replace(',', '.'))) ? undefined : Number(s.replace(',', '.')));

  const apply = () => {
    const observed = { date: obsDate, sunriseBearingDeg: num(rise), sunsetBearingDeg: num(set), noonAltitudeDeg: num(noon) };
    const c = calibrate(observed, garden.location);
    update((g) => ({ ...g, sunCorrection: { enabled: true, ...c, observed } }));
  };

  return (
    <>
      <h3>Sun &amp; shade</h3>
      <label className="field">
        <span>Trees in leaf from</span>
        <select value={leaf.fromMonth} onChange={(e) => update((g) => updateSettings(g, { leafSeason: { ...leaf, fromMonth: Number(e.target.value) as Month } }))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>…until</span>
        <select value={leaf.toMonth} onChange={(e) => update((g) => updateSettings(g, { leafSeason: { ...leaf, toMonth: Number(e.target.value) as Month } }))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label="Bare trees let through"
        unit="%"
        step={5}
        decimals={0}
        min={0}
        max={100}
        value={garden.settings.leaflessTransmission * 100}
        onChange={(v) => update((g) => updateSettings(g, { leaflessTransmission: v / 100 }), { coalesceKey: 'leaflessTransmission' })}
      />

      <label className="check">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Correct the sun model with my own observations
      </label>
      {corr.enabled && (
        <p className="readout" data-testid="sun-correction">
          Correction active: directions {corr.azimuthOffsetDeg >= 0 ? '+' : ''}
          {corr.azimuthOffsetDeg.toFixed(1)}°, height × {corr.altitudeFactor.toFixed(2)}
        </p>
      )}
      {open && (
        <div className="calibration">
          <p className="hint">
            Use this if the shadows don't match reality, e.g. because the north arrow is a bit off. Note where the sun rises and
            sets as compass bearings (0 = N, 90 = E, 180 = S, 270 = W), and/or the sun's height at midday. Leave a field empty if you
            didn't see it.
          </p>
          <label className="field">
            <span>Date observed</span>
            <input type="date" value={obsDate} onChange={(e) => e.target.value && setObsDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Sunrise direction (°)</span>
            <input inputMode="decimal" value={rise} onChange={(e) => setRise(e.target.value)} placeholder={model.sunriseAzimuthDeg ? `model ${Math.round(model.sunriseAzimuthDeg)}° ${compassName(model.sunriseAzimuthDeg)}` : ''} />
          </label>
          <label className="field">
            <span>Sunset direction (°)</span>
            <input inputMode="decimal" value={set} onChange={(e) => setSet(e.target.value)} placeholder={model.sunsetAzimuthDeg ? `model ${Math.round(model.sunsetAzimuthDeg)}° ${compassName(model.sunsetAzimuthDeg)}` : ''} />
          </label>
          <label className="field">
            <span>Midday sun height (°)</span>
            <input inputMode="decimal" value={noon} onChange={(e) => setNoon(e.target.value)} placeholder={`model ${model.noonAltitudeDeg.toFixed(0)}° at ${formatMinutes(model.solarNoon)}`} />
          </label>
          <div className="actions">
            <button className="btn primary" onClick={apply}>
              Apply correction
            </button>
            {corr.enabled && (
              <button className="btn" onClick={() => update((g) => ({ ...g, sunCorrection: { ...g.sunCorrection, enabled: false, azimuthOffsetDeg: 0, altitudeFactor: 1 } }))}>
                Remove correction
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
