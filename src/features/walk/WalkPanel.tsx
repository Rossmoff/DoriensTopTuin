import { useMemo } from 'react';
import { useUiStore } from '../../state/uiStore';
import { PlantSuggestions } from '../plants/PlantSuggestions';
import { SpotSummary } from '../plants/SpotSummary';
import { useSpot, type SpotTarget } from '../plants/useSpot';
import { useSeasonSunMap } from '../sun/useSunHoursJob';

/** Read-only "garden walk": tap a spot, see its sun hours, soil and the plants that suit it. */
export function WalkPanel() {
  useSeasonSunMap(true);
  const p = useUiStore((s) => s.walkPoint);
  const target = useMemo<SpotTarget | null>(() => (p ? { kind: 'point', p } : null), [p]);
  const info = useSpot(target);
  return (
    <div className="panel" data-testid="walk-panel">
      <h2 className="only-wide">Garden walk</h2>
      {!info ? (
        <p className="hint">Tap any spot in the garden to see how much sun it gets, its soil, and which plants would do well there. Nothing can be changed in this mode.</p>
      ) : (
        <>
          {info.bed && <p className="hint">In: {info.bed.label}</p>}
          <SpotSummary info={info} />
          <PlantSuggestions spot={info.spot} compact />
        </>
      )}
    </div>
  );
}
