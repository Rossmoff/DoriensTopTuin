import { useRef } from 'react';
import { niceNumber, normDeg } from '../../domain/geometry';
import { useGardenStore } from '../../state/gardenStore';
import { useUiStore, uiStore } from '../../state/uiStore';
import { Icon } from '../../ui/Icon';
import { fitGardenToView } from './EditorCanvas';
import { zoomAt } from './viewUtils';

export function ScaleBar() {
  const scale = useUiStore((s) => s.view.scale);
  const metres = niceNumber(110 / scale);
  const px = metres * scale;
  const label = metres >= 1 ? `${metres} m` : `${Math.round(metres * 100)} cm`;
  return (
    <div className="overlay scale-bar" aria-label={`Scale: bar is ${label}`}>
      {label}
      <div className="bar" style={{ width: px }} />
    </div>
  );
}

/**
 * North arrow. The arrow points to true north on screen; drag it round to set the
 * plot orientation (plan "up" bearing).
 */
export function Compass() {
  const bearing = useGardenStore((s) => s.garden?.planUpBearingDeg ?? 0);
  const update = useGardenStore((s) => s.update);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // Screen angle of the pointer, clockwise from up. North points there, so plan-up bearing = -angle.
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const b = Math.round(normDeg(-angle));
    update((g) => ({ ...g, planUpBearingDeg: b }), { coalesceKey: 'planUpBearing' });
  };

  return (
    <div
      ref={ref}
      className="overlay compass"
      data-testid="compass"
      role="slider"
      aria-label="Plot orientation: drag to point the arrow to north"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={bearing}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => dragging.current && setFromPointer(e)}
      onPointerUp={() => (dragging.current = false)}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) update((g) => ({ ...g, planUpBearingDeg: normDeg(g.planUpBearingDeg - d * (e.shiftKey ? 15 : 1)) }), { coalesceKey: 'planUpBearing' });
      }}
    >
      <svg viewBox="-32 -32 64 64" style={{ transform: `rotate(${-bearing}deg)` }}>
        <circle r="29" fill="none" stroke="currentColor" strokeOpacity="0.25" />
        <path d="M0 -24 L7 4 L0 0 L-7 4 Z" fill="#c0392b" />
        <path d="M0 24 L7 4 L0 0 L-7 4 Z" fill="currentColor" fillOpacity="0.45" />
        <text y="-25" dy="-1" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">N</text>
      </svg>
      <div className="deg">{bearing === 0 ? 'N up' : `up = ${bearing}°`}</div>
    </div>
  );
}

export function ZoomControls() {
  const zoom = (f: number) => {
    const { view, stageSize } = uiStore.getState();
    uiStore.getState().setView(zoomAt(view, { x: stageSize.width / 2, y: stageSize.height / 2 }, f));
  };
  return (
    <div className="overlay zoom-controls">
      <button className="btn icon" onClick={() => zoom(1.3)} aria-label="Zoom in" title="Zoom in">
        <Icon name="plus" />
      </button>
      <button className="btn icon" onClick={() => zoom(1 / 1.3)} aria-label="Zoom out" title="Zoom out">
        <Icon name="minus" />
      </button>
      <button className="btn icon" onClick={fitGardenToView} aria-label="Fit garden to screen" title="Fit to screen">
        <Icon name="fit" />
      </button>
    </div>
  );
}
