import { LIGHT_CLASS_LABEL } from '../../domain/sun';
import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../../domain/types';
import { spotLightClass } from '../../domain/plants';
import { ZONE_STYLE } from '../editor/ZoneShape';
import { CLASS_COLOR } from '../sun/heatmapColors';
import type { SpotInfo } from './useSpot';

export function SpotSummary({ info }: { info: SpotInfo }) {
  const { spot, bed, sunPending } = info;
  const cls = spotLightClass(spot);
  const s = spot.soil;
  return (
    <div className="spot-summary" data-testid="spot-summary">
      <p>
        {cls && <i className="swatch" style={{ background: CLASS_COLOR[cls] }} />}
        {spot.sunHours !== null ? (
          <>
            <strong data-testid="bed-sun-hours">{spot.sunHours.toFixed(1)} h</strong> sun/day (Apr–Sep) · {cls && LIGHT_CLASS_LABEL[cls]}
          </>
        ) : sunPending ? (
          <span>Calculating sun hours…</span>
        ) : (
          <span>No sun data here (outside the plot?)</span>
        )}
      </p>
      <p className="hint">
        {SOIL_TEXTURE_LABELS[s.texture].en}, pH {s.pH.toFixed(1)}
        {s.pHSource === 'estimated' ? ' (est.)' : ''}, {MOISTURE_LABELS[s.moisture].en.toLowerCase()}, organic matter {s.organicMatter}
        {bed?.soilOverride ? ` · ${bed.label}'s own soil` : ' · site soil'}
        {spot.zones.length > 0 && ` · zone: ${spot.zones.map((z) => ZONE_STYLE[z].label).join(', ')}`}
      </p>
    </div>
  );
}
