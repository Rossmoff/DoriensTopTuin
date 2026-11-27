import { useEffect, useRef } from 'react';
import { Circle, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { GardenObject, Vec2 } from '../../domain/types';
import { geometryBBox, snapPoint } from '../../domain/geometry';
import type { CanvasColors } from './canvasTheme';

/** Konva Transformer for rects (resize + rotate) and circles (resize). */
export function ObjectTransformer({ obj, coarse, colors, scale }: { obj: GardenObject; coarse: boolean; colors: CanvasColors; scale: number }) {
  const tr = useRef<Konva.Transformer>(null);
  const type = obj.geometry.type;
  useEffect(() => {
    const t = tr.current;
    if (!t) return;
    const stage = t.getStage();
    const node = stage?.findOne((n: Konva.Node) => n.id() === obj.id);
    t.nodes(node && !obj.locked ? [node] : []);
    t.getLayer()?.batchDraw();
  }, [obj, type]);

  if (type !== 'rect' && type !== 'circle') return null;
  const isCircle = type === 'circle';
  const b = geometryBBox(obj.geometry);
  // On touch screens, small objects only get corner handles so they stay visible and grabbable.
  const small = coarse && Math.min(b.maxX - b.minX, b.maxY - b.minY) * scale < 140;
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return (
    <Transformer
      ref={tr}
      name="ui-overlay"
      rotateEnabled={!isCircle}
      keepRatio={isCircle}
      centeredScaling={isCircle}
      flipEnabled={false}
      ignoreStroke
      enabledAnchors={
        isCircle || small
          ? corners
          : [...corners, 'top-center', 'middle-right', 'middle-left', 'bottom-center']
      }
      padding={coarse ? 10 : 0}
      anchorSize={coarse ? 22 : 11}
      anchorCornerRadius={coarse ? 11 : 3}
      anchorStroke={colors.handleStroke}
      anchorFill={colors.handle}
      borderStroke={colors.select}
      rotateAnchorOffset={coarse ? 36 : 26}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={4}
      boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox)}
    />
  );
}

interface VertexProps {
  points: Vec2[];
  closed: boolean;
  scale: number;
  coarse: boolean;
  snapStep: number;
  colors: CanvasColors;
  minPoints: number;
  /** final=false while dragging (coalesced into one undo step), true for insert/delete. */
  onChange: (points: Vec2[], final: boolean) => void;
}

/** Draggable corner handles plus tap-to-insert midpoints for polygons, polylines and the boundary. */
export function VertexHandles({ points, closed, scale, coarse, snapStep, colors, minPoints, onChange }: VertexProps) {
  const r = (coarse ? 13 : 6) / scale;
  const hit = (coarse ? 22 : 10) / scale;
  const segs = closed ? points.length : points.length - 1;
  const mids: { p: Vec2; i: number }[] = [];
  for (let i = 0; i < segs; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    mids.push({ p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, i });
  }
  return (
    <>
      {mids.map(({ p, i }) => (
        <Circle
          key={`m${i}`}
          name="ui-overlay"
          x={p.x}
          y={p.y}
          radius={r * 0.6}
          hitStrokeWidth={hit}
          fill={colors.handle}
          stroke={colors.handleStroke}
          strokeWidth={1}
          strokeScaleEnabled={false}
          opacity={0.6}
          onClick={() => onChange([...points.slice(0, i + 1), p, ...points.slice(i + 1)], true)}
          onTap={() => onChange([...points.slice(0, i + 1), p, ...points.slice(i + 1)], true)}
        />
      ))}
      {points.map((p, i) => (
        <Circle
          key={`v${i}`}
          name="ui-overlay"
          x={p.x}
          y={p.y}
          radius={r}
          hitStrokeWidth={hit}
          fill={colors.handle}
          stroke={colors.handleStroke}
          strokeWidth={2}
          strokeScaleEnabled={false}
          draggable
          onDragMove={(e) => {
            const n = e.target;
            const s = snapPoint({ x: n.x(), y: n.y() }, snapStep, snapStep > 0);
            n.position(s);
            onChange(points.map((q, j) => (j === i ? s : q)), false);
          }}
          onDragEnd={(e) => {
            const n = e.target;
            onChange(points.map((q, j) => (j === i ? { x: n.x(), y: n.y() } : q)), false);
          }}
          onDblClick={() => points.length > minPoints && onChange(points.filter((_, j) => j !== i), true)}
          onDblTap={() => points.length > minPoints && onChange(points.filter((_, j) => j !== i), true)}
        />
      ))}
    </>
  );
}
