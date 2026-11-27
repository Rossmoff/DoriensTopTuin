import { useGardenStore } from '../../state/gardenStore';
import { usePlantStore } from '../../state/plantStore';
import { useUiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { PlantThumb } from '../plants/PlantThumb';
import { usePlanWarnings, warningsByPlacement } from './usePlanWarnings';

/** All warnings for placed plants, grouped per plant; tap one to select it on the plan. */
export function PlanCheckDialog() {
  const setDialog = useUiStore((s) => s.setDialog);
  const placements = useGardenStore((s) => s.garden?.placements ?? []);
  const plants = usePlantStore((s) => s.plants);
  const warnings = usePlanWarnings();
  const byP = warningsByPlacement(warnings);
  const warnCount = warnings.filter((w) => w.severity === 'warn').length;
  const show = (id: string) => {
    useUiStore.getState().select(id);
    setDialog(null);
  };
  return (
    <div className="dialog-backdrop" onClick={() => setDialog(null)}>
      <div className="dialog" role="dialog" aria-label="Plan check" onClick={(e) => e.stopPropagation()} data-testid="plan-check">
        <div className="dialog-head">
          <h2>Plan check</h2>
          <button className="btn icon ghost" aria-label="Close" onClick={() => setDialog(null)}>
            <Icon name="close" />
          </button>
        </div>
        {placements.length === 0 ? (
          <p className="hint">No plants placed yet. Use “+” next to a plant in a bed's Plants tab or in the plant library.</p>
        ) : byP.size === 0 ? (
          <p>✅ No problems found for {placements.length} placed plants.</p>
        ) : (
          <>
            <p className="hint">
              {warnCount} warning{warnCount === 1 ? '' : 's'} for {byP.size} of {placements.length} placed plants. Tap a plant to show it.
            </p>
            <ul className="check-list">
              {[...byP.entries()].map(([id, ws]) => {
                const pl = placements.find((p) => p.id === id);
                const plant = plants.find((p) => p.id === pl?.plantId);
                return (
                  <li key={id}>
                    <button className="btn plan-check-item" onClick={() => show(id)}>
                      <PlantThumb plant={plant} size={36} />
                      <span>
                        <strong>
                          {plant?.names.en ?? 'Unknown plant'}
                          {pl && pl.quantity > 1 ? ` ×${pl.quantity}` : ''}
                        </strong>
                        {ws.map((w, i) => (
                          <span key={i} className={`w ${w.severity}`}>
                            {w.severity === 'warn' ? '⚠' : 'ℹ'} {w.message}
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
