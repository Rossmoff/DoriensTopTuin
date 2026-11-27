import type { PlantingArea, SoilProfile } from '../../domain/types';
import { updateObject } from '../../state/gardenActions';
import { useGardenStore } from '../../state/gardenStore';
import { SoilFields } from './SoilFields';

const IMPROVED_VEG_BED: Partial<SoilProfile> = { texture: 'loamySand', pH: 6.5, pHSource: 'estimated', moisture: 'moderate', drainage: 'moderate', organicMatter: 'high' };

/** Optional soil override for a bed (e.g. an amended vegetable bed). */
export function BedSoil({ bed }: { bed: PlantingArea }) {
  const site = useGardenStore((s) => s.garden!.site.soil);
  const update = useGardenStore((s) => s.update);
  const own = !!bed.soilOverride;
  const soil: SoilProfile = { ...site, ...bed.soilOverride };
  const setOverride = (o: Partial<SoilProfile> | undefined, key?: string) =>
    update((g) => updateObject(g, bed.id, { soilOverride: o } as Partial<PlantingArea>), key ? { coalesceKey: `${bed.id}.soil.${key}` } : undefined);
  return (
    <>
      <h3>Soil in this bed</h3>
      <label className="check">
        <input type="checkbox" checked={own} onChange={(e) => setOverride(e.target.checked ? { ...site } : undefined)} data-testid="bed-own-soil" /> Different
        from the site soil
      </label>
      {own ? (
        <>
          <SoilFields idPrefix="bed" soil={soil} onChange={(patch, key) => setOverride({ ...bed.soilOverride, ...patch }, key)} />
          <div className="actions">
            <button className="btn" onClick={() => setOverride({ ...bed.soilOverride, ...IMPROVED_VEG_BED })} data-testid="bed-improved">
              Improved vegetable bed
            </button>
          </div>
        </>
      ) : (
        <p className="hint">Uses the site soil. Tick this for raised, composted or limed beds.</p>
      )}
    </>
  );
}
