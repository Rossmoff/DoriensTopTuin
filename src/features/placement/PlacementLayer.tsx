import { memo, useRef, type RefObject } from 'react';
import { Circle, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Month, Plant, PlantPlacement, Vec2 } from '../../domain/types';
import { placementRadius } from '../../domain/plants';
import { snapPoint } from '../../domain/geometry';
import type { CanvasColors } from '../editor/canvasTheme';
import { COLOUR_CSS, plantColour } from '../plants/plantDisplay';

export interface PlacementStyle {
  fill: string;
  opacity: number;
  stroke: string;
  strokeWidth: number;
}

/** How a placed plant looks, optionally for a bloom-view month. */
export function placementStyle(plant: Plant | undefined, month: Month | null): PlacementStyle {
  if (!plant) return { fill: '#999', opacity: 0.5, stroke: '#555', strokeWidth: 1 };
  const base = plantColour(plant);
  if (month === null) return { fill: base, opacity: 0.6, stroke: '#2f4f27', strokeWidth: 1.2 };
  const orn = plant.ornamental;
  if (orn?.floweringMonths.includes(month)) {
    const c = orn.flowerColours[0];
    return { fill: c ? COLOUR_CSS[c] : base, opacity: 0.95, stroke: '#ffffff', strokeWidth: 2.5 };
  }
  if (orn?.colourMonths?.includes(month)) return { fill: '#c0392b', opacity: 0.75, stroke: '#7a1f17', strokeWidth: 2 };
  if (plant.edible?.harvest.includes(month)) return { fill: '#e08a00', opacity: 0.7, stroke: '#8a5200', strokeWidth: 1.5 };
  const evergreen = plant.foliage === 'evergreen' || plant.foliage === 'semiEvergreen';
  const growing = month >= 4 && month <= 10;
  if (evergreen || (growing && plant.lifecycle !== 'annual')) return { fill: '#4f7a45', opacity: 0.4, stroke: '#2f4f27', strokeWidth: 1 };
  return { fill: '#9a9a8e', opacity: 0.2, stroke: '#77776c', strokeWidth: 1 };
}

interface Props {
  placement: PlantPlacement;
  plant: Plant | undefined;
  selected: boolean;
  scale: number;
  colors: CanvasColors;
  draggable: boolean;
  snapStep: number;
  warning: 'warn' | 'info' | null;
  month: Month | null;
  dragCancelled: RefObject<boolean>;
  onSelect: (id: string) => void;
  onMove: (id: string, center: Vec2) => void;
}

function PlacementShapeImpl({ placement, plant, selected, scale, colors, draggable, snapStep, warning, month, dragCancelled, onSelect, onMove }: Props) {
  const r = placementRadius(placement, plant);
  const st = placementStyle(plant, month);
  const start = useRef<Vec2 | null>(null);
  const label = plant ? plant.names.en.split(/[ '(]/)[0] + (placement.quantity > 1 ? ` ×${placement.quantity}` : '') : '?';
  const fs = 11 / scale;
  const showLabel = r * scale > 16;
  return (
    <Group
      objId={placement.id}
      x={placement.center.x}
      y={placement.center.y}
      draggable={draggable}
      onClick={() => onSelect(placement.id)}
      onTap={() => onSelect(placement.id)}
      onDragStart={(e: KonvaEventObject<DragEvent>) => {
        start.current = { x: e.target.x(), y: e.target.y() };
        onSelect(placement.id);
      }}
      onDragMove={(e: KonvaEventObject<DragEvent>) => {
        if (snapStep > 0) e.target.position(snapPoint({ x: e.target.x(), y: e.target.y() }, snapStep));
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        const s = start.current;
        start.current = null;
        const to = { x: e.target.x(), y: e.target.y() };
        if (dragCancelled.current && s) {
          e.target.position(s);
          return;
        }
        onMove(placement.id, to);
      }}
    >
      <Circle
        objId={placement.id}
        radius={r}
        fill={st.fill}
        opacity={st.opacity}
        stroke={selected ? colors.select : st.stroke}
        strokeWidth={selected ? 3 : st.strokeWidth}
        strokeScaleEnabled={false}
      />
      {warning && (
        <Circle
          radius={r + 4 / scale}
          stroke={warning === 'warn' ? '#d0312d' : '#d9a400'}
          strokeWidth={2}
          strokeScaleEnabled={false}
          dash={[5, 3]}
          listening={false}
        />
      )}
      {showLabel && (
        <Text
          listening={false}
          text={label}
          x={-r}
          y={-fs / 2}
          width={2 * r}
          align="center"
          fontSize={fs}
          fill={colors.text}
          stroke={colors.textHalo}
          strokeWidth={2.5 / scale}
          fillAfterStrokeEnabled
          wrap="none"
          ellipsis
        />
      )}
    </Group>
  );
}

export const PlacementShape = memo(PlacementShapeImpl);
