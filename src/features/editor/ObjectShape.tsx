import { memo, useRef, type RefObject } from 'react';
import { Circle, Group, Line, Rect } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { GardenObject, Geometry, Vec2 } from '../../domain/types';
import { bbox, footprintPolygons, snapPoint, translateGeometry } from '../../domain/geometry';
import { kindInfo } from '../../data/objectCatalog';
import type { CanvasColors } from './canvasTheme';

export interface ObjectShapeProps {
  obj: GardenObject;
  selected: boolean;
  scale: number;
  colors: CanvasColors;
  draggable: boolean;
  snapStep: number;
  /** Set when a pinch started during a drag; the drag is then reverted. */
  dragCancelled: RefObject<boolean>;
  onSelect: (id: string) => void;
  onGeometry: (id: string, g: Geometry) => void;
}

const flat = (pts: Vec2[]) => pts.flatMap((p) => [p.x, p.y]);

function ObjectShapeImpl({ obj, selected, scale, colors, draggable, snapStep, dragCancelled, onSelect, onGeometry }: ObjectShapeProps) {
  const info = kindInfo(obj.kind);
  const start = useRef<{ node: Vec2; ref: Vec2 } | null>(null);
  const g = obj.geometry;
  const stroke = selected ? colors.select : colors.strokeWidth > 2 ? '#000' : info.stroke;
  const strokeWidth = selected ? colors.strokeWidth + 1.5 : colors.strokeWidth;
  const common = {
    objId: obj.id,
    draggable: draggable && !obj.locked,
    onClick: () => onSelect(obj.id),
    onTap: () => onSelect(obj.id),
    onDragStart: (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const b = bbox(footprintPolygons(g).flat());
      start.current = { node: { x: node.x(), y: node.y() }, ref: { x: b.minX, y: b.minY } };
      onSelect(obj.id);
    },
    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      const s = start.current;
      if (!s || snapStep <= 0) return;
      const node = e.target;
      const d = { x: node.x() - s.node.x, y: node.y() - s.node.y };
      const snappedRef = snapPoint({ x: s.ref.x + d.x, y: s.ref.y + d.y }, snapStep);
      node.position({ x: s.node.x + snappedRef.x - s.ref.x, y: s.node.y + snappedRef.y - s.ref.y });
    },
    onDragEnd: (e: KonvaEventObject<DragEvent>) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const node = e.target;
      const d = { x: node.x() - s.node.x, y: node.y() - s.node.y };
      node.position(s.node);
      if (dragCancelled.current) return;
      if (Math.abs(d.x) < 1e-9 && Math.abs(d.y) < 1e-9) return;
      onGeometry(obj.id, translateGeometry(g, d));
    },
  };

  switch (g.type) {
    case 'rect':
      return (
        <Rect
          {...common}
          id={obj.id}
          x={g.center.x}
          y={g.center.y}
          width={g.width}
          height={g.length}
          offsetX={g.width / 2}
          offsetY={g.length / 2}
          rotation={g.rotationDeg}
          fill={info.fill}
          opacity={obj.kind === 'greenhouse' ? 0.75 : colors.fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
          dash={obj.kind === 'carport' ? [6, 4] : undefined}
          onTransformEnd={(e: KonvaEventObject<Event>) => {
            const n = e.target as Konva.Rect;
            const width = Math.max(0.05, g.width * n.scaleX());
            const length = Math.max(0.05, g.length * n.scaleY());
            n.scale({ x: 1, y: 1 });
            onGeometry(obj.id, {
              type: 'rect',
              center: { x: n.x(), y: n.y() },
              width,
              length,
              rotationDeg: ((n.rotation() % 360) + 360) % 360,
            });
          }}
        />
      );
    case 'circle': {
      const isTree = obj.kind === 'tree' || obj.kind === 'shrub' || obj.kind === 'neighbourTree';
      const evergreen = 'foliage' in obj && obj.foliage === 'evergreen';
      const fill = isTree && evergreen ? '#3f6f3a' : info.fill;
      return (
        <Group {...common} x={g.center.x} y={g.center.y}>
          <Circle
            id={obj.id}
            objId={obj.id}
            radius={g.radius}
            fill={fill}
            opacity={isTree ? 0.72 * colors.fillOpacity : colors.fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeScaleEnabled={false}
            onTransformEnd={(e: KonvaEventObject<Event>) => {
              const n = e.target as Konva.Circle;
              const radius = Math.max(0.05, g.radius * n.scaleX());
              n.scale({ x: 1, y: 1 });
              n.position({ x: 0, y: 0 });
              onGeometry(obj.id, { type: 'circle', center: g.center, radius });
            }}
          />
          {isTree && <Circle radius={Math.max(0.12, g.radius * 0.06)} fill="#5a3d24" listening={false} />}
        </Group>
      );
    }
    case 'polygon':
      return (
        <Line
          {...common}
          points={flat(g.points)}
          closed
          fill={info.fill}
          opacity={colors.fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
          lineJoin="round"
        />
      );
    case 'polyline': {
      const minW = 2.5 / scale;
      return (
        <Line
          {...common}
          points={flat(g.points)}
          stroke={selected ? colors.select : info.fill}
          strokeWidth={Math.max(g.thickness, minW)}
          hitStrokeWidth={Math.max(g.thickness, 24 / scale)}
          lineCap={obj.kind === 'hedge' || obj.kind === 'path' ? 'round' : 'butt'}
          lineJoin="round"
          dash={obj.kind === 'fence' ? [0.4, 0.12] : undefined}
          opacity={colors.fillOpacity}
        />
      );
    }
  }
}

export const ObjectShape = memo(ObjectShapeImpl);
