import type { Foliage, GardenObject, Geometry, ObjectKind } from '../../domain/types';
import { geometryArea, geometryLength } from '../../domain/geometry';
import { isPlantingKind, isTreeKind, KIND_LIST, kindInfo } from '../../data/objectCatalog';
import { setGeometry, updateObject } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { Icon } from '../../ui/Icon';
import { NumberField } from '../../ui/NumberField';
import { useObjectActions } from './useObjectActions';
import { useState } from 'react';
import type { PlantingArea } from '../../domain/types';
import { BedPlants } from '../plants/BedPlants';
import { BedSoil } from '../site/BedSoil';

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

export function ObjectProperties({ obj }: { obj: GardenObject }) {
  const update = useGardenStore((s) => s.update);
  const actions = useObjectActions(obj.id);
  const info = kindInfo(obj.kind);
  const g = obj.geometry;
  const key = (f: string) => ({ coalesceKey: `${obj.id}.${f}` });
  const patch = (p: Partial<GardenObject>, field: string) => update((gg) => updateObject(gg, obj.id, p), key(field));
  const geo = (ng: Geometry, field: string) => update((gg) => setGeometry(gg, obj.id, ng), key(field));

  // Kinds this object can switch to: same tree/non-tree class and supports its shape.
  const kindOptions = KIND_LIST.filter((k) => isTreeKind(k.kind) === isTreeKind(obj.kind) && k.shapes.includes(g.type));
  const tree = isTreeKind(obj.kind) && 'crownBaseHeight' in obj ? obj : null;
  const bed = isPlantingKind(obj.kind) ? (obj as PlantingArea) : null;
  const hasPlants = !!bed && obj.kind !== 'lawn';
  const [tab, setTab] = useState<'plants' | 'details'>('plants');

  return (
    <div className="panel" data-testid="object-properties">
      <h2>
        <span aria-hidden>{info.icon}</span> {obj.label}
      </h2>
      {hasPlants && (
        <div className="seg wide tabs" role="tablist" aria-label="Bed view">
          <button className={`btn ${tab === 'plants' ? 'active' : ''}`} role="tab" aria-selected={tab === 'plants'} onClick={() => setTab('plants')} data-testid="tab-plants">
            Plants
          </button>
          <button className={`btn ${tab === 'details' ? 'active' : ''}`} role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')} data-testid="tab-details">
            Size &amp; soil
          </button>
        </div>
      )}
      {hasPlants && tab === 'plants' ? (
        <BedPlants bed={bed!} />
      ) : (
        <>
      <label className="field">
        <span>Label</span>
        <input data-testid="prop-label" value={obj.label} onChange={(e) => patch({ label: e.target.value }, 'label')} />
      </label>
      <label className="field">
        <span>Type</span>
        <select
          value={obj.kind}
          onChange={(e) => {
            const k = e.target.value as ObjectKind;
            update((gg) => updateObject(gg, obj.id, { kind: k } as Partial<GardenObject>));
          }}
        >
          {kindOptions.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <NumberField label="Height" unit="m" value={obj.height} min={0} max={60} testId="prop-height" onChange={(v) => patch({ height: v }, 'height')} />

      <h3>Size &amp; position</h3>
      {g.type === 'rect' && (
        <>
          <NumberField label="Width" unit="m" value={g.width} min={0.05} testId="prop-width" onChange={(v) => geo({ ...g, width: v }, 'width')} />
          <NumberField label="Length" unit="m" value={g.length} min={0.05} testId="prop-length" onChange={(v) => geo({ ...g, length: v }, 'length')} />
          <NumberField label="Rotation" unit="°" step={1} decimals={1} value={g.rotationDeg} onChange={(v) => geo({ ...g, rotationDeg: ((v % 360) + 360) % 360 }, 'rotation')} />
          <NumberField label="Centre X" unit="m" value={g.center.x} onChange={(v) => geo({ ...g, center: { ...g.center, x: v } }, 'cx')} />
          <NumberField label="Centre Y" unit="m" value={g.center.y} onChange={(v) => geo({ ...g, center: { ...g.center, y: v } }, 'cy')} />
        </>
      )}
      {g.type === 'circle' && (
        <>
          <NumberField
            label={tree ? 'Crown diameter' : 'Diameter'}
            unit="m"
            value={g.radius * 2}
            min={0.1}
            testId="prop-diameter"
            onChange={(v) => geo({ ...g, radius: v / 2 }, 'radius')}
          />
          <NumberField label="Centre X" unit="m" value={g.center.x} onChange={(v) => geo({ ...g, center: { ...g.center, x: v } }, 'cx')} />
          <NumberField label="Centre Y" unit="m" value={g.center.y} onChange={(v) => geo({ ...g, center: { ...g.center, y: v } }, 'cy')} />
        </>
      )}
      {g.type === 'polyline' && (
        <>
          <NumberField label="Thickness" unit="m" value={g.thickness} min={0.01} step={0.05} onChange={(v) => geo({ ...g, thickness: v }, 'thickness')} />
          <p className="readout">Length: {fmt(geometryLength(g))} m · {g.points.length} points</p>
        </>
      )}
      {g.type === 'polygon' && (
        <p className="readout">
          Area: {fmt(geometryArea(g))} m² · perimeter {fmt(geometryLength(g))} m · {g.points.length} corners
        </p>
      )}
      {(g.type === 'polygon' || g.type === 'polyline') && (
        <p className="hint">Drag the corner handles to reshape. Tap a small midpoint to add a corner; double-tap a corner to remove it.</p>
      )}
      {g.type === 'rect' && <p className="readout">Area: {fmt(geometryArea(g))} m²</p>}

      {(tree || obj.kind === 'hedge') && (
        <>
          <h3>Foliage</h3>
          {tree && (
            <NumberField
              label="Crown starts at"
              unit="m"
              value={tree.crownBaseHeight}
              min={0}
              max={obj.height}
              onChange={(v) => patch({ crownBaseHeight: v } as Partial<GardenObject>, 'crownBase')}
            />
          )}
          <label className="field">
            <span>Leaves</span>
            <select
              value={'foliage' in obj ? obj.foliage ?? 'evergreen' : 'evergreen'}
              onChange={(e) => patch({ foliage: e.target.value as Foliage } as Partial<GardenObject>, 'foliage')}
            >
              <option value="deciduous">Deciduous (loses leaves)</option>
              <option value="evergreen">Evergreen</option>
            </select>
          </label>
        </>
      )}

      {obj.height > 0 && !tree && (
        <NumberField
          label="Blocks light"
          unit="%"
          step={5}
          decimals={0}
          min={0}
          max={100}
          value={obj.shadowOpacity * 100}
          onChange={(v) => patch({ shadowOpacity: v / 100 }, 'shadowOpacity')}
        />
      )}

      <h3>Notes</h3>
      <label className="field wide">
        <textarea aria-label="Notes" value={obj.notes ?? ''} onChange={(e) => patch({ notes: e.target.value }, 'notes')} />
      </label>
      <label className="check">
        <input type="checkbox" checked={!!obj.locked} onChange={actions.toggleLock} /> Locked (can't be moved)
      </label>

      <div className="actions">
        <button className="btn" onClick={actions.duplicate} data-testid="duplicate">
          <Icon name="copy" /> Duplicate
        </button>
        {g.type !== 'circle' && (
          <button className="btn" onClick={() => actions.rotate(90)}>
            <Icon name="rotate" /> Rotate 90°
          </button>
        )}
        <button className="btn danger" onClick={actions.remove} data-testid="delete">
          <Icon name="trash" /> Delete
        </button>
      </div>
      {bed && obj.kind !== 'lawn' && <BedSoil bed={bed} />}
        </>
      )}
    </div>
  );
}
