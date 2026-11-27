import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../../domain/types';
import { usePlantStore } from '../../state/plantStore';
import { builtinPlant } from '../../plantSource/LocalPlantSource';
import { CATEGORY_LABEL, SUN_LABEL } from './plantDisplay';
import { MonthChips } from './MonthChips';
import { PlantBadges } from './PlantRow';
import { usePlantUi } from './plantUiStore';
import { startPlacing } from '../placement/startPlacing';
import { useUiStore } from '../../state/uiStore';

const GROUP_LABEL = { good: 'Good match', possible: 'Possible', unsuitable: 'Unsuitable' };

export function PlantDetailDialog() {
  const detail = usePlantUi((s) => s.detail);
  const set = usePlantUi((s) => s.set);
  const plants = usePlantStore((s) => s.plants);
  const remove = usePlantStore((s) => s.remove);
  const canPlace = useUiStore((s) => s.mode === 'edit');
  const plant = plants.find((p) => p.id === detail?.id);
  if (!detail || !plant) return null;
  const close = () => set({ detail: null });
  const s = detail.suitability;
  const n = plant.needs;
  const nameOf = (id: string) => plants.find((p) => p.id === id)?.names.en ?? id;

  return (
    <div className="dialog-backdrop" onClick={close}>
      <div className="dialog plant-detail" role="dialog" aria-label={plant.names.en} onClick={(e) => e.stopPropagation()} data-testid="plant-detail">
        <h2>{plant.names.en}</h2>
        <p className="subtitle">
          {plant.names.nl} · <i>{plant.names.latin}</i> · {CATEGORY_LABEL[plant.category]}
        </p>
        <PlantBadges plant={plant} />

        {s && (
          <div className={`match ${s.group}`}>
            <strong>
              {GROUP_LABEL[s.group]} for this spot ({Math.round(s.score * 100)}%)
            </strong>
            <ul>
              {s.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <h3>Needs</h3>
        <dl className="facts">
          <dt>Light</dt>
          <dd>{n.sun.map((x) => SUN_LABEL[x]).join(', ')}</dd>
          <dt>Soil</dt>
          <dd>{n.soils.map((t) => SOIL_TEXTURE_LABELS[t].en).join(', ')}</dd>
          <dt>pH</dt>
          <dd>
            {n.pH.min.toFixed(1)} – {n.pH.max.toFixed(1)}
          </dd>
          <dt>Moisture</dt>
          <dd>
            {n.moisture.map((m) => MOISTURE_LABELS[m].en.toLowerCase()).join(', ')} · drought tolerance {n.droughtTolerance}
          </dd>
          {n.fertility && (
            <>
              <dt>Richness</dt>
              <dd>needs {n.fertility} fertility</dd>
            </>
          )}
          <dt>Hardiness</dt>
          <dd>USDA zone {n.usdaZoneMin} and warmer</dd>
        </dl>

        <h3>Size &amp; habit</h3>
        <dl className="facts">
          <dt>Height × spread</dt>
          <dd>
            {plant.size.heightM} × {plant.size.spreadM} m · plant {plant.size.plantingDistanceM} m apart
          </dd>
          <dt>Lifecycle</dt>
          <dd>
            {plant.lifecycle}, {plant.foliage === 'semiEvergreen' ? 'semi-evergreen' : plant.foliage}
          </dd>
        </dl>

        {plant.ornamental && (plant.ornamental.floweringMonths.length > 0 || plant.ornamental.colourMonths?.length) && (
          <>
            <h3>Ornamental</h3>
            {plant.ornamental.floweringMonths.length > 0 && (
              <>
                <p className="hint">Flowers: {plant.ornamental.flowerColours.join(', ') || '–'}</p>
                <MonthChips label="Flowering months" value={plant.ornamental.floweringMonths} />
              </>
            )}
            {!!plant.ornamental.colourMonths?.length && (
              <>
                <p className="hint">Berries, autumn colour or bark</p>
                <MonthChips label="Colour months" value={plant.ornamental.colourMonths} color="#c0392b" />
              </>
            )}
            {plant.ornamental.winterInterest && <p className="hint">Winter interest.</p>}
          </>
        )}

        {plant.edible && (
          <>
            <h3>Edible: calendar</h3>
            {plant.edible.sowIndoors?.length ? (
              <>
                <p className="hint">Sow indoors</p>
                <MonthChips label="Sow indoors" value={plant.edible.sowIndoors} color="#8e5bc4" />
              </>
            ) : null}
            {plant.edible.sowOutdoors?.length ? (
              <>
                <p className="hint">Sow outdoors</p>
                <MonthChips label="Sow outdoors" value={plant.edible.sowOutdoors} color="#4f7fe0" />
              </>
            ) : null}
            {plant.edible.plantOut?.length ? (
              <>
                <p className="hint">Plant out</p>
                <MonthChips label="Plant out" value={plant.edible.plantOut} color="#2f6b3a" />
              </>
            ) : null}
            <p className="hint">Harvest</p>
            <MonthChips label="Harvest" value={plant.edible.harvest} color="#e08a00" />
            {plant.edible.goodCompanions.length > 0 && <p className="hint">Good neighbours: {plant.edible.goodCompanions.map(nameOf).join(', ')}</p>}
            {plant.edible.badCompanions.length > 0 && <p className="hint">Keep away from: {plant.edible.badCompanions.map(nameOf).join(', ')}</p>}
          </>
        )}

        {(plant.toxicity.children || plant.toxicity.pets) && (
          <p className="warning">
            ⚠ Toxic to {[plant.toxicity.children && 'children', plant.toxicity.pets && 'pets'].filter(Boolean).join(' and ')}.
            {plant.toxicity.note ? ` ${plant.toxicity.note}` : ''}
          </p>
        )}
        {plant.notes && <p>{plant.notes}</p>}
        <p className="hint">Data is approximate{plant.source === 'user' ? ' (your own plant)' : plant.edited ? ' (edited by you)' : ''}.</p>

        <div className="actions">
          {canPlace && (
            <button className="btn primary" onClick={() => startPlacing(plant.id)} data-testid="detail-place">
              Place on plan
            </button>
          )}
          <button className="btn" onClick={() => set({ editing: structuredClone(plant), detail: null })} data-testid="edit-plant">
            Edit
          </button>
          {plant.edited && builtinPlant(plant.id) && (
            <button className="btn" onClick={() => void remove(plant.id)}>
              Reset to original
            </button>
          )}
          {plant.source === 'user' && (
            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm(`Delete “${plant.names.en}”?`)) {
                  void remove(plant.id);
                  close();
                }
              }}
            >
              Delete
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
