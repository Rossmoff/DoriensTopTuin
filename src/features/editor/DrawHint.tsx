import { kindInfo } from '../../data/objectCatalog';
import type { GeometryType } from '../../domain/types';
import { useUiStore } from '../../state/uiStore';
import { useDrawStore } from './drawStore';
import { ZONE_STYLE } from './ZoneShape';
import { usePlantStore } from '../../state/plantStore';
import * as drawing from './drawingController';

const SHAPE_LABEL: Record<GeometryType, string> = { rect: 'Rectangle', polygon: 'Shape', polyline: 'Line', circle: 'Circle' };

/** Instruction bar shown while a drawing tool is active, with Finish / Undo point / Cancel. */
export function DrawHint() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const points = useDrawStore((s) => s.points);
  const placed = useDrawStore((s) => s.placedCount);
  const placeName = usePlantStore((s) => (tool.type === 'place' ? s.plants.find((p) => p.id === tool.plantId)?.names.en : undefined));
  if (tool.type === 'select') return null;

  let text = '';
  let multi = false;
  if (tool.type === 'measure') text = 'Drag, or tap two points, to measure a distance.';
  else if (tool.type === 'place') text = `Tap to place ${placeName ?? 'the plant'}${placed ? ` (${placed} placed)` : ''}. Tap again for more.`;
  else if (tool.type === 'zone') {
    text = `Tap the corners of the ${ZONE_STYLE[tool.kind].label.toLowerCase()} zone. Tap the first corner, or press Finish, to close.`;
    multi = true;
  } else if (tool.type === 'boundary') {
    text = 'Tap the corners of the plot. Tap the first corner, or press Finish, to close.';
    multi = true;
  } else {
    const info = kindInfo(tool.kind);
    const s = info.size;
    if (tool.shape === 'rect') text = `Drag to draw the ${info.label.toLowerCase()}, or tap to place ${s.width ?? 2} × ${s.length ?? 2} m.`;
    else if (tool.shape === 'circle') text = `Tap to place (Ø ${2 * (s.radius ?? 1)} m), or drag from the centre to set the size.`;
    else if (tool.shape === 'polygon') {
      text = 'Tap the corners. Tap the first corner or press Finish to close.';
      multi = true;
    } else {
      text = 'Tap points along the line. Tap the last point again, or press Finish, when done.';
      multi = true;
    }
  }

  return (
    <div className="overlay draw-hint" role="status" data-testid="draw-hint">
      <p>{text}</p>
      {tool.type === 'draw' && kindInfo(tool.kind).shapes.length > 1 && (
        <select
          aria-label="Shape"
          value={tool.shape}
          onChange={(e) => {
            useDrawStore.getState().reset();
            setTool({ ...tool, shape: e.target.value as GeometryType });
          }}
          className="btn"
        >
          {kindInfo(tool.kind).shapes.map((s) => (
            <option key={s} value={s}>
              {SHAPE_LABEL[s]}
            </option>
          ))}
        </select>
      )}
      {multi && (
        <>
          <button className="btn" onClick={drawing.undoPoint} disabled={points.length === 0}>
            Undo point
          </button>
          <button className="btn primary" onClick={drawing.finish} data-testid="finish-drawing">
            Finish
          </button>
        </>
      )}
      <button className="btn" onClick={drawing.cancel} data-testid="tool-done">
        {tool.type === 'measure' || tool.type === 'place' ? 'Done' : 'Cancel'}
      </button>
    </div>
  );
}
