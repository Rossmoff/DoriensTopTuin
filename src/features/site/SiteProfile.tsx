import { useGardenStore } from '../../state/gardenStore';
import { SoilFields } from './SoilFields';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZONES = ['5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b', '9a', '9b'];

function MonthDayField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [m, d] = value.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="field">
      <span>{label}</span>
      <div className="inline">
        <select aria-label={`${label} day`} value={d} onChange={(e) => onChange(`${pad(m)}-${pad(Number(e.target.value))}`)}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select aria-label={`${label} month`} value={m} onChange={(e) => onChange(`${pad(Number(e.target.value))}-${pad(d)}`)}>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Site soil and climate; used for every spot unless a bed has its own soil. */
export function SiteProfile() {
  const site = useGardenStore((s) => s.garden!.site);
  const update = useGardenStore((s) => s.update);
  return (
    <>
      <h3>Site soil</h3>
      {site.soilMapNote && <p className="hint">Soil map: “{site.soilMapNote}”</p>}
      <SoilFields
        idPrefix="site"
        soil={site.soil}
        onChange={(patch, key) => update((g) => ({ ...g, site: { ...g.site, soil: { ...g.site.soil, ...patch } } }), { coalesceKey: `site.${key}` })}
      />
      <p className="hint">Around Genk the soil ranges from sand to loamy sand and from dry to moderately wet. Beds can have their own soil.</p>

      <h3>Climate</h3>
      <label className="field">
        <span>Hardiness zone (USDA)</span>
        <select value={site.climate.usdaZone} onChange={(e) => update((g) => ({ ...g, site: { ...g.site, climate: { ...g.site.climate, usdaZone: e.target.value } } }))}>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <MonthDayField label="Last spring frost" value={site.climate.lastFrost} onChange={(v) => update((g) => ({ ...g, site: { ...g.site, climate: { ...g.site.climate, lastFrost: v } } }))} />
      <MonthDayField label="First autumn frost" value={site.climate.firstFrost} onChange={(v) => update((g) => ({ ...g, site: { ...g.site, climate: { ...g.site.climate, firstFrost: v } } }))} />
    </>
  );
}
