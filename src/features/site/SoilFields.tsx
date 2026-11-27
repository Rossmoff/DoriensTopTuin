import type { Drainage, Level3, Moisture, SoilProfile, SoilTexture } from '../../domain/types';
import { MOISTURE_LABELS, SOIL_TEXTURE_LABELS } from '../../domain/types';
import { NumberField } from '../../ui/NumberField';

const DRAINAGE: Record<Drainage, string> = { fast: 'Fast (sand)', moderate: 'Moderate', slow: 'Slow (stays wet)' };

export function SoilFields({ soil, onChange, idPrefix }: { soil: SoilProfile; onChange: (patch: Partial<SoilProfile>, key: string) => void; idPrefix: string }) {
  return (
    <>
      <label className="field">
        <span>Soil texture</span>
        <select value={soil.texture} onChange={(e) => onChange({ texture: e.target.value as SoilTexture }, 'texture')} data-testid={`${idPrefix}-texture`}>
          {(Object.keys(SOIL_TEXTURE_LABELS) as SoilTexture[]).map((t) => (
            <option key={t} value={t}>
              {SOIL_TEXTURE_LABELS[t].en} ({SOIL_TEXTURE_LABELS[t].nl})
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Moisture</span>
        <select value={soil.moisture} onChange={(e) => onChange({ moisture: e.target.value as Moisture }, 'moisture')} data-testid={`${idPrefix}-moisture`}>
          {(Object.keys(MOISTURE_LABELS) as Moisture[]).map((m) => (
            <option key={m} value={m}>
              {MOISTURE_LABELS[m].en} ({MOISTURE_LABELS[m].nl})
            </option>
          ))}
        </select>
      </label>
      <NumberField label="pH" value={soil.pH} min={3} max={9} step={0.1} decimals={1} testId={`${idPrefix}-ph`} onChange={(v) => onChange({ pH: v }, 'pH')} />
      <label className="field">
        <span>pH is</span>
        <select value={soil.pHSource} onChange={(e) => onChange({ pHSource: e.target.value as SoilProfile['pHSource'] }, 'pHSource')}>
          <option value="estimated">Estimated</option>
          <option value="measured">Measured</option>
        </select>
      </label>
      <label className="field">
        <span>Drainage</span>
        <select value={soil.drainage} onChange={(e) => onChange({ drainage: e.target.value as Drainage }, 'drainage')}>
          {(Object.keys(DRAINAGE) as Drainage[]).map((d) => (
            <option key={d} value={d}>
              {DRAINAGE[d]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Organic matter</span>
        <select value={soil.organicMatter} onChange={(e) => onChange({ organicMatter: e.target.value as Level3 }, 'om')} data-testid={`${idPrefix}-om`}>
          <option value="low">Low (poor sand)</option>
          <option value="medium">Medium</option>
          <option value="high">High (well composted)</option>
        </select>
      </label>
    </>
  );
}
