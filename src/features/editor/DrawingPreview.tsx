import { Circle, Label, Line, Rect, Tag, Text } from 'react-konva';
import type { Vec2 } from '../../domain/types';
import { distance, perimeter, polygonArea } from '../../domain/geometry';
import { kindInfo } from '../../data/objectCatalog';
import type { Tool } from '../../state/uiStore';
import { useDrawStore } from './drawStore';
import type { CanvasColors } from './canvasTheme';

const fmt = (n: number) => (n < 10 ? n.toFixed(2) : n.toFixed(1));
const flat = (pts: Vec2[]) => pts.flatMap((p) => [p.x, p.y]);

function Tip({ at, text, scale, colors }: { at: Vec2; text: string; scale: number; colors: CanvasColors }) {
  return (
    <Label x={at.x} y={at.y} listening={false}>
      <Tag fill={colors.text} cornerRadius={4 / scale} pointerDirection="down" pointerWidth={8 / scale} pointerHeight={6 / scale} />
      <Text text={text} fontSize={13 / scale} padding={5 / scale} fill={colors.textHalo === '#ffffff' ? '#fff' : colors.background} fontStyle="bold" />
    </Label>
  );
}

/** Live preview with dimensions for the active draw / boundary / measure tool. */
export function DrawingPreview({ tool, scale, colors }: { tool: Tool; scale: number; colors: CanvasColors }) {
  const { points, cursor, pressStart, measure } = useDrawStore();
  const sw = 2 / scale;

  if (tool.type === 'measure' && measure) {
    const d = distance(measure.a, measure.b);
    const mid = { x: (measure.a.x + measure.b.x) / 2, y: (measure.a.y + measure.b.y) / 2 };
    return (
      <>
        <Line points={flat([measure.a, measure.b])} stroke={colors.measure} strokeWidth={sw * 1.5} dash={[8 / scale, 5 / scale]} listening={false} />
        <Circle x={measure.a.x} y={measure.a.y} radius={5 / scale} fill={colors.measure} listening={false} />
        <Circle x={measure.b.x} y={measure.b.y} radius={5 / scale} fill={colors.measure} listening={false} />
        {d > 0 && <Tip at={mid} text={`${fmt(d)} m`} scale={scale} colors={colors} />}
      </>
    );
  }

  if (tool.type !== 'draw' && tool.type !== 'boundary') return null;
  const fill = tool.type === 'draw' ? kindInfo(tool.kind).fill : 'transparent';

  // Rect / circle: drag from press start to cursor.
  if (tool.type === 'draw' && (tool.shape === 'rect' || tool.shape === 'circle')) {
    if (!pressStart || !cursor) return null;
    if (tool.shape === 'circle') {
      const r = distance(pressStart, cursor);
      return (
        <>
          <Circle x={pressStart.x} y={pressStart.y} radius={r} fill={fill} opacity={0.6} stroke={colors.drawing} strokeWidth={sw} listening={false} />
          {r > 0 && <Tip at={{ x: pressStart.x, y: pressStart.y - r }} text={`Ø ${fmt(2 * r)} m`} scale={scale} colors={colors} />}
        </>
      );
    }
    const x = Math.min(pressStart.x, cursor.x);
    const y = Math.min(pressStart.y, cursor.y);
    const w = Math.abs(cursor.x - pressStart.x);
    const h = Math.abs(cursor.y - pressStart.y);
    return (
      <>
        <Rect x={x} y={y} width={w} height={h} fill={fill} opacity={0.6} stroke={colors.drawing} strokeWidth={sw} listening={false} />
        {w + h > 0 && <Tip at={{ x: x + w / 2, y }} text={`${fmt(w)} × ${fmt(h)} m`} scale={scale} colors={colors} />}
      </>
    );
  }

  // Multi-point tools.
  const closed = tool.type === 'boundary' || (tool.type === 'draw' && tool.shape === 'polygon');
  const live = cursor ? [...points, cursor] : points;
  const last = points[points.length - 1];
  const seg = last && cursor ? distance(last, cursor) : 0;
  const info = closed && live.length >= 3 ? ` · ${fmt(polygonArea(live))} m²` : ` · total ${fmt(perimeter(live, false))} m`;
  return (
    <>
      {live.length >= 2 && (
        <Line
          points={flat(live)}
          closed={closed && live.length >= 3}
          fill={closed ? fill : undefined}
          opacity={0.7}
          stroke={colors.drawing}
          strokeWidth={sw}
          dash={[6 / scale, 4 / scale]}
          listening={false}
        />
      )}
      {points.map((p, i) => (
        <Circle key={i} x={p.x} y={p.y} radius={(i === 0 && closed ? 8 : 5) / scale} fill={i === 0 && closed ? colors.select : colors.drawing} listening={false} />
      ))}
      {cursor && last && <Tip at={cursor} text={`${fmt(seg)} m${info}`} scale={scale} colors={colors} />}
    </>
  );
}
