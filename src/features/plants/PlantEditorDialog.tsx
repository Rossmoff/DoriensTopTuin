import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Colour, Level3, Moisture, Plant, PlantCategory, SoilTexture, SunNeed } from '../../domain/types';
import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../../domain/types';
import { usePlantStore } from '../../state/plantStore';
import { useUiStore } from '../../state/uiStore';
import { NumberField } from '../../ui/NumberField';
import { ALL_COLOURS, CATEGORY_LABEL, SUN_LABEL } from './plantDisplay';
import { MonthChips } from './MonthChips';
import { usePlantUi } from './plantUiStore';

export function newPlantDraft(): Plant {
  return {
    id: '',
    names: { en: '', nl: '', latin: '' },
    category: 'perennial',
    needs: { sun: ['fullSun'], soils: ['sand', 'loamySand'], pH: { min: 5, max: 7 }, moisture: ['moderate'], droughtTolerance: 'medium', usdaZoneMin: 6 },
    size: { heightM: 0.5, spreadM: 0.5, plantingDistanceM: 0.4 },
    lifecycle: 'perennial',
    foliage: 'herbaceous',
    nativeBE: false,
    attractsPollinators: false,
    ornamental: { flowerColours: [], floweringMonths: [], winterInterest: false },
    toxicity: { children: false, pets: false },
    source: 'user',
    approximate: true,
  };
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Checks<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="checks">
      <legend>{label}</legend>
      {options.map(([v, l]) => (
        <label key={v} className="chip-check">
          <input type="checkbox" checked={value.includes(v)} onChange={() => onChange(toggle(value, v))} /> {l}
        </label>
      ))}
    </fieldset>
  );
}

export function PlantEditorDialog() {
  const editing = usePlantUi((s) => s.editing);
  const setUi = usePlantUi((s) => s.set);
  if (!editing) return null;
  return <Editor initial={editing} close={() => setUi({ editing: null })} />;
}

function Editor({ initial, close }: { initial: Plant; close: () => void }) {
  const [p, setP] = useState<Plant>(initial);
  const save = usePlantStore((s) => s.save);
  const plants = usePlantStore((s) => s.plants);
  const isNew = !initial.id;
  const up = (patch: Partial<Plant>) => setP((x) => ({ ...x, ...patch }));
  const needs = (patch: Partial<Plant['needs']>) => setP((x) => ({ ...x, needs: { ...x.needs, ...patch } }));
  const orn = p.ornamental ?? { flowerColours: [], floweringMonths: [], winterInterest: false };
  const valid = p.names.en.trim() && p.needs.sun.length && p.needs.soils.length && p.needs.moisture.length && p.needs.pH.min < p.needs.pH.max;
  const edibles = plants.filter((x) => x.edible && x.id !== p.id);

  const onSave = async () => {
    if (!valid) return;
    const slug = (p.names.latin || p.names.en).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const plant: Plant = { ...p, id: p.id || `user-${slug}-${nanoid(4)}`, approximate: true };
    await save(plant);
    useUiStore.getState().showToast(`Saved “${plant.names.en}”`);
    close();
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="dialog plant-editor"
        role="dialog"
        aria-label={isNew ? 'Add a plant' : `Edit ${initial.names.en}`}
        data-testid="plant-editor"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <h2>{isNew ? 'Add a plant' : `Edit ${initial.names.en}`}</h2>
        <label className="field">
          <span>English name</span>
          <input value={p.names.en} onChange={(e) => up({ names: { ...p.names, en: e.target.value } })} required data-testid="plant-name-en" />
        </label>
        <label className="field">
          <span>Dutch name</span>
          <input value={p.names.nl} onChange={(e) => up({ names: { ...p.names, nl: e.target.value } })} data-testid="plant-name-nl" />
        </label>
        <label className="field">
          <span>Latin name</span>
          <input value={p.names.latin} onChange={(e) => up({ names: { ...p.names, latin: e.target.value } })} data-testid="plant-name-latin" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={p.category} onChange={(e) => up({ category: e.target.value as PlantCategory })}>
            {(Object.keys(CATEGORY_LABEL) as PlantCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>

        <h3>Growing needs</h3>
        <Checks<SunNeed> label="Light" options={(Object.keys(SUN_LABEL) as SunNeed[]).map((k) => [k, SUN_LABEL[k]])} value={p.needs.sun} onChange={(sun) => needs({ sun })} />
        <Checks<SoilTexture> label="Soils" options={(Object.keys(SOIL_TEXTURE_LABELS) as SoilTexture[]).map((k) => [k, SOIL_TEXTURE_LABELS[k].en])} value={p.needs.soils} onChange={(soils) => needs({ soils })} />
        <Checks<Moisture> label="Moisture" options={(Object.keys(MOISTURE_LABELS) as Moisture[]).map((k) => [k, MOISTURE_LABELS[k].en])} value={p.needs.moisture} onChange={(moisture) => needs({ moisture })} />
        <NumberField label="pH from" value={p.needs.pH.min} min={3} max={9} decimals={1} onChange={(v) => needs({ pH: { ...p.needs.pH, min: v } })} />
        <NumberField label="pH to" value={p.needs.pH.max} min={3} max={9} decimals={1} onChange={(v) => needs({ pH: { ...p.needs.pH, max: v } })} />
        <label className="field">
          <span>Drought tolerance</span>
          <select value={p.needs.droughtTolerance} onChange={(e) => needs({ droughtTolerance: e.target.value as Level3 })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span>Needs rich soil</span>
          <select value={p.needs.fertility ?? ''} onChange={(e) => needs({ fertility: (e.target.value || undefined) as Level3 | undefined })}>
            <option value="">Not important</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <NumberField label="Hardy to USDA zone" value={p.needs.usdaZoneMin} min={1} max={12} step={1} decimals={1} onChange={(v) => needs({ usdaZoneMin: v })} />

        <h3>Size &amp; lifecycle</h3>
        <NumberField label="Height" unit="m" value={p.size.heightM} min={0.01} onChange={(v) => up({ size: { ...p.size, heightM: v } })} />
        <NumberField label="Spread" unit="m" value={p.size.spreadM} min={0.01} onChange={(v) => up({ size: { ...p.size, spreadM: v } })} />
        <NumberField label="Planting distance" unit="m" value={p.size.plantingDistanceM} min={0.01} onChange={(v) => up({ size: { ...p.size, plantingDistanceM: v } })} />
        <label className="field">
          <span>Lifecycle</span>
          <select value={p.lifecycle} onChange={(e) => up({ lifecycle: e.target.value as Plant['lifecycle'] })}>
            <option value="annual">Annual</option>
            <option value="biennial">Biennial</option>
            <option value="perennial">Perennial</option>
          </select>
        </label>
        <label className="field">
          <span>Foliage</span>
          <select value={p.foliage} onChange={(e) => up({ foliage: e.target.value as Plant['foliage'] })}>
            <option value="herbaceous">Dies back in winter</option>
            <option value="deciduous">Deciduous</option>
            <option value="semiEvergreen">Semi-evergreen</option>
            <option value="evergreen">Evergreen</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={p.nativeBE} onChange={(e) => up({ nativeBE: e.target.checked })} /> Native to Belgium
        </label>
        <label className="check">
          <input type="checkbox" checked={p.attractsPollinators} onChange={(e) => up({ attractsPollinators: e.target.checked })} /> Good for bees &amp; butterflies
        </label>

        <h3>Flowers</h3>
        <Checks<Colour> label="Flower colours" options={ALL_COLOURS.map((c) => [c, c])} value={orn.flowerColours} onChange={(flowerColours) => up({ ornamental: { ...orn, flowerColours } })} />
        <MonthChips label="Flowering months" value={orn.floweringMonths} onChange={(floweringMonths) => up({ ornamental: { ...orn, floweringMonths } })} />
        <label className="check">
          <input type="checkbox" checked={orn.winterInterest} onChange={(e) => up({ ornamental: { ...orn, winterInterest: e.target.checked } })} /> Winter interest
        </label>

        <h3>Edible</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={!!p.edible}
            onChange={(e) => up({ edible: e.target.checked ? { harvest: [], goodCompanions: [], badCompanions: [] } : undefined })}
            data-testid="plant-edible"
          />{' '}
          This is a vegetable, herb or fruit
        </label>
        {p.edible && (
          <>
            <p className="hint">Sow indoors</p>
            <MonthChips label="Sow indoors" value={p.edible.sowIndoors ?? []} onChange={(m) => up({ edible: { ...p.edible!, sowIndoors: m } })} />
            <p className="hint">Sow outdoors</p>
            <MonthChips label="Sow outdoors" value={p.edible.sowOutdoors ?? []} onChange={(m) => up({ edible: { ...p.edible!, sowOutdoors: m } })} />
            <p className="hint">Plant out</p>
            <MonthChips label="Plant out" value={p.edible.plantOut ?? []} onChange={(m) => up({ edible: { ...p.edible!, plantOut: m } })} />
            <p className="hint">Harvest</p>
            <MonthChips label="Harvest" value={p.edible.harvest} onChange={(m) => up({ edible: { ...p.edible!, harvest: m } })} />
            <details>
              <summary className="btn">Companions ({p.edible.goodCompanions.length} good, {p.edible.badCompanions.length} bad)</summary>
              <div className="companions">
                {edibles.map((x) => {
                  const ed = p.edible!;
                  const state = ed.goodCompanions.includes(x.id) ? 'good' : ed.badCompanions.includes(x.id) ? 'bad' : '';
                  return (
                    <label key={x.id} className="field">
                      <span>{x.names.en}</span>
                      <select
                        value={state}
                        onChange={(e) => {
                          const good = ed.goodCompanions.filter((i) => i !== x.id);
                          const bad = ed.badCompanions.filter((i) => i !== x.id);
                          if (e.target.value === 'good') good.push(x.id);
                          if (e.target.value === 'bad') bad.push(x.id);
                          up({ edible: { ...ed, goodCompanions: good, badCompanions: bad } });
                        }}
                      >
                        <option value="">–</option>
                        <option value="good">Good neighbour</option>
                        <option value="bad">Keep apart</option>
                      </select>
                    </label>
                  );
                })}
              </div>
            </details>
          </>
        )}

        <h3>Safety &amp; notes</h3>
        <label className="check">
          <input type="checkbox" checked={p.toxicity.children} onChange={(e) => up({ toxicity: { ...p.toxicity, children: e.target.checked } })} /> Toxic to children
        </label>
        <label className="check">
          <input type="checkbox" checked={p.toxicity.pets} onChange={(e) => up({ toxicity: { ...p.toxicity, pets: e.target.checked } })} /> Toxic to pets
        </label>
        <label className="field wide">
          <textarea aria-label="Notes" placeholder="Notes" value={p.notes ?? ''} onChange={(e) => up({ notes: e.target.value || undefined })} />
        </label>

        <div className="actions sticky">
          <button className="btn primary" type="submit" disabled={!valid} data-testid="save-plant">
            Save
          </button>
          <button className="btn" type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
