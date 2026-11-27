import type { GardenObject } from '../../domain/types';
import { footprintPolygons } from '../../domain/geometry';
import { averageSunHoursIn, classifySunHours, LIGHT_CLASS_LABEL } from '../../domain/sun';
import { useSunStore } from '../../state/sunStore';
import { CLASS_COLOR } from './heatmapColors';
import { periodFor, periodLabel } from './useSunHoursJob';

/** Average sun hours over a bed's footprint, from the latest sun-hours map. */
export function SunReadout({ obj }: { obj: GardenObject }) {
  const s = useSunStore();
  if (!s.result) {
    return (
      <div className="actions">
        <button className="btn" onClick={() => s.set({ view: 'hours' })} data-testid="show-sun-hours">
          ☀ Show sun hours for this area
        </button>
      </div>
    );
  }
  const vals = footprintPolygons(obj.geometry)
    .map((p) => averageSunHoursIn(s.result!, p))
    .filter((v): v is number => v !== null);
  if (vals.length === 0) return <p className="readout">No sun data for this area (outside the plot?).</p>;
  const h = vals.reduce((a, b) => a + b, 0) / vals.length;
  const cls = classifySunHours(h);
  return (
    <p className="readout sun-readout-bed" data-testid="bed-sun-hours">
      <i style={{ background: CLASS_COLOR[cls], display: 'inline-block', width: 12, height: 12, borderRadius: 3, marginRight: 6 }} />
      <strong>{h.toFixed(1)} h</strong> sun/day ({periodLabel(periodFor(s))}) · {LIGHT_CLASS_LABEL[cls]}
    </p>
  );
}
