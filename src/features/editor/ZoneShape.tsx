import { Group, Line, Text } from 'react-konva';
import type { ManualZone, ZoneKind } from '../../domain/types';
import { centroid } from '../../domain/geometry';
import type { CanvasColors } from './canvasTheme';

export const ZONE_STYLE: Record<ZoneKind, { label: string; fill: string; stroke: string; help: string }> = {
  shady: { label: 'Shady', fill: 'rgba(60,70,150,0.22)', stroke: '#3c4696', help: 'Always counted as shade (e.g. under conifers).' },
  wet: { label: 'Wet', fill: 'rgba(40,140,210,0.22)', stroke: '#1f74b0', help: 'Soil stays moist or wet here.' },
  extraDry: { label: 'Extra dry', fill: 'rgba(220,140,40,0.25)', stroke: '#b26b12', help: 'Drier than the rest (e.g. against a south wall, under trees).' },
};

export function ZoneShape({
  zone,
  selected,
  scale,
  colors,
  onSelect,
}: {
  zone: ManualZone;
  selected: boolean;
  scale: number;
  colors: CanvasColors;
  onSelect: (id: string) => void;
}) {
  const st = ZONE_STYLE[zone.kind];
  const c = centroid(zone.points);
  const fs = 12 / scale;
  const w = 140 / scale;
  return (
    <Group>
      <Line
        points={zone.points.flatMap((p) => [p.x, p.y])}
        closed
        fill={st.fill}
        stroke={selected ? colors.select : st.stroke}
        strokeWidth={selected ? 3 : 1.5}
        strokeScaleEnabled={false}
        dash={[8, 5]}
        onClick={() => onSelect(zone.id)}
        onTap={() => onSelect(zone.id)}
      />
      <Text
        listening={false}
        x={c.x - w / 2}
        y={c.y - fs / 2}
        width={w}
        align="center"
        text={zone.label || st.label}
        fontSize={fs}
        fontStyle="italic bold"
        fill={st.stroke}
        stroke={colors.textHalo}
        strokeWidth={3 / scale}
        fillAfterStrokeEnabled
      />
    </Group>
  );
}
