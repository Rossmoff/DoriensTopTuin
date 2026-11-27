import type { ManualZone, ZoneKind } from '../../domain/types';
import { polygonArea } from '../../domain/geometry';
import { deleteZone, updateZone } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { ZONE_STYLE } from '../editor/ZoneShape';

export function ZoneProperties({ zone }: { zone: ManualZone }) {
  const update = useGardenStore((s) => s.update);
  const select = useUiStore((s) => s.select);
  return (
    <div className="panel" data-testid="zone-properties">
      <h2>{ZONE_STYLE[zone.kind].label} zone</h2>
      <label className="field">
        <span>Kind</span>
        <select value={zone.kind} onChange={(e) => update((g) => updateZone(g, zone.id, { kind: e.target.value as ZoneKind }))}>
          {(Object.keys(ZONE_STYLE) as ZoneKind[]).map((k) => (
            <option key={k} value={k}>
              {ZONE_STYLE[k].label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{ZONE_STYLE[zone.kind].help}</p>
      <label className="field">
        <span>Label</span>
        <input value={zone.label ?? ''} placeholder={ZONE_STYLE[zone.kind].label} onChange={(e) => update((g) => updateZone(g, zone.id, { label: e.target.value }), { coalesceKey: `${zone.id}.label` })} />
      </label>
      <p className="readout">Area {polygonArea(zone.points).toFixed(1)} m² · {zone.points.length} corners</p>
      <p className="hint">Drag the corner handles to reshape.</p>
      <div className="actions">
        <button
          className="btn danger"
          onClick={() => {
            update((g) => deleteZone(g, zone.id));
            select(null);
          }}
        >
          <Icon name="trash" /> Delete zone
        </button>
      </div>
    </div>
  );
}
