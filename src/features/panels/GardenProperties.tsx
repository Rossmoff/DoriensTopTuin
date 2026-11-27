import type { Moisture, ObjectGroup, SoilTexture } from '../../domain/types';
import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../../domain/types';
import { bbox, geometryArea, normDeg, polygonArea } from '../../domain/geometry';
import { GROUPS, kindInfo } from '../../data/objectCatalog';
import { rectBoundary } from '../../data/defaults';
import { setBoundary, updateSettings } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { BOUNDARY_ID, useUiStore } from '../../state/uiStore';
import { NumberField } from '../../ui/NumberField';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

function isAxisRect(pts: { x: number; y: number }[]) {
  if (pts.length !== 4) return false;
  const b = bbox(pts);
  return pts.every((p) => (p.x === b.minX || p.x === b.maxX) && (p.y === b.minY || p.y === b.maxY));
}

export function BoundaryProperties() {
  const garden = useGardenStore((s) => s.garden)!;
  const update = useGardenStore((s) => s.update);
  const setTool = useUiStore((s) => s.setTool);
  const pts = garden.boundary;
  const b = bbox(pts);
  const rect = isAxisRect(pts);
  return (
    <div className="panel" data-testid="boundary-properties">
      <h2>Plot boundary</h2>
      <p className="readout">
        Area {fmt(polygonArea(pts))} m² · {pts.length} corners · {fmt(b.maxX - b.minX)} × {fmt(b.maxY - b.minY)} m overall
      </p>
      {rect && (
        <>
          <NumberField label="Width" unit="m" value={b.maxX - b.minX} min={1} onChange={(v) => update((g) => setBoundary(g, rectBoundary(v, b.maxY - b.minY).map((p) => ({ x: p.x + b.minX, y: p.y + b.minY }))), { coalesceKey: 'boundary.w' })} />
          <NumberField label="Length" unit="m" value={b.maxY - b.minY} min={1} onChange={(v) => update((g) => setBoundary(g, rectBoundary(b.maxX - b.minX, v).map((p) => ({ x: p.x + b.minX, y: p.y + b.minY }))), { coalesceKey: 'boundary.l' })} />
        </>
      )}
      <p className="hint">Drag the corner handles to reshape. Tap a midpoint to add a corner; double-tap a corner to remove it.</p>
      <div className="actions">
        <button className="btn" onClick={() => setTool({ type: 'boundary' })}>
          Redraw boundary
        </button>
      </div>
    </div>
  );
}

export function GardenProperties() {
  const garden = useGardenStore((s) => s.garden)!;
  const update = useGardenStore((s) => s.update);
  const select = useUiStore((s) => s.select);
  const hidden = new Set(garden.settings.hiddenGroups);
  const soil = garden.site.soil;

  const toggleGroup = (id: ObjectGroup) => {
    const next = hidden.has(id) ? garden.settings.hiddenGroups.filter((g) => g !== id) : [...garden.settings.hiddenGroups, id];
    update((g) => updateSettings(g, { hiddenGroups: next }));
  };

  return (
    <div className="panel" data-testid="garden-properties">
      <h2>{garden.name}</h2>
      <label className="field">
        <span>Plan name</span>
        <input value={garden.name} onChange={(e) => update((g) => ({ ...g, name: e.target.value }), { coalesceKey: 'name' })} />
      </label>

      <h3>Orientation</h3>
      <NumberField
        label="Plan “up” faces"
        unit="° from N"
        step={1}
        decimals={0}
        value={garden.planUpBearingDeg}
        testId="plan-bearing"
        onChange={(v) => update((g) => ({ ...g, planUpBearingDeg: normDeg(v) }), { coalesceKey: 'planUpBearing' })}
      />
      <p className="hint">0 = the top of the plan is north, 90 = east, 180 = south. You can also drag the compass.</p>

      <h3>Grid</h3>
      <label className="field">
        <span>Grid size</span>
        <select value={garden.settings.gridSizeM} onChange={(e) => update((g) => updateSettings(g, { gridSizeM: Number(e.target.value) }))}>
          {[0.1, 0.25, 0.5, 1, 2].map((v) => (
            <option key={v} value={v}>
              {v >= 1 ? `${v} m` : `${v * 100} cm`}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={garden.settings.snap} onChange={(e) => update((g) => updateSettings(g, { snap: e.target.checked }))} /> Snap to grid
      </label>

      <h3>Show on plan</h3>
      {GROUPS.map((gr) => (
        <label key={gr.id} className="check">
          <input type="checkbox" checked={!hidden.has(gr.id)} onChange={() => toggleGroup(gr.id)} /> {gr.label}
        </label>
      ))}

      <h3>Site soil</h3>
      <label className="field">
        <span>Soil texture</span>
        <select
          value={soil.texture}
          onChange={(e) => update((g) => ({ ...g, site: { ...g.site, soil: { ...g.site.soil, texture: e.target.value as SoilTexture } } }))}
        >
          {(Object.keys(SOIL_TEXTURE_LABELS) as SoilTexture[]).map((t) => (
            <option key={t} value={t}>
              {SOIL_TEXTURE_LABELS[t].en} ({SOIL_TEXTURE_LABELS[t].nl})
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Moisture</span>
        <select
          value={soil.moisture}
          onChange={(e) => update((g) => ({ ...g, site: { ...g.site, soil: { ...g.site.soil, moisture: e.target.value as Moisture } } }))}
        >
          {(Object.keys(MOISTURE_LABELS) as Moisture[]).map((m) => (
            <option key={m} value={m}>
              {MOISTURE_LABELS[m].en} ({MOISTURE_LABELS[m].nl})
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label="pH"
        value={soil.pH}
        min={3}
        max={9}
        step={0.1}
        decimals={1}
        onChange={(v) => update((g) => ({ ...g, site: { ...g.site, soil: { ...g.site.soil, pH: v } } }), { coalesceKey: 'site.pH' })}
      />
      <p className="hint">Used for plant matching (phase 3). Beds will be able to override these.</p>

      <h3>Location</h3>
      <NumberField label="Latitude" unit="°" step={0.01} decimals={4} min={-90} max={90} value={garden.location.lat} onChange={(v) => update((g) => ({ ...g, location: { ...g.location, lat: v } }), { coalesceKey: 'lat' })} />
      <NumberField label="Longitude" unit="°" step={0.01} decimals={4} min={-180} max={180} value={garden.location.lon} onChange={(v) => update((g) => ({ ...g, location: { ...g.location, lon: v } }), { coalesceKey: 'lon' })} />

      <h3>Objects ({garden.objects.length})</h3>
      <ul className="object-list" data-testid="object-list">
        <li>
          <button className="btn" onClick={() => select(BOUNDARY_ID)}>
            <span aria-hidden>⬚</span> Plot boundary
          </button>
        </li>
        {garden.objects.map((o) => (
          <li key={o.id}>
            <button className="btn" onClick={() => select(o.id)}>
              <span aria-hidden>{kindInfo(o.kind).icon}</span> {o.label}
              <span className="meta">
                {o.height > 0 ? `${o.height} m high` : `${fmt(geometryArea(o.geometry))} m²`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
