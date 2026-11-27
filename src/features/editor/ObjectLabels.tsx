import { Text } from 'react-konva';
import type { GardenObject } from '../../domain/types';
import { geometryBBox, geometryCenter } from '../../domain/geometry';
import type { CanvasColors } from './canvasTheme';

/** Object labels in screen-sized text, hidden when the object is too small on screen. */
export function ObjectLabels({ objects, scale, colors }: { objects: GardenObject[]; scale: number; colors: CanvasColors }) {
  const fontSize = 12 / scale;
  const width = 160 / scale;
  return (
    <>
      {objects.map((o) => {
        const b = geometryBBox(o.geometry);
        const sizePx = Math.max(b.maxX - b.minX, b.maxY - b.minY) * scale;
        if (sizePx < 36) return null;
        const c = geometryCenter(o.geometry);
        const text = o.height > 0 ? `${o.label}\n${o.height} m` : o.label;
        return (
          <Text
            key={o.id}
            listening={false}
            x={c.x - width / 2}
            y={c.y - fontSize}
            width={width}
            align="center"
            text={text}
            fontSize={fontSize}
            fill={colors.text}
            stroke={colors.textHalo}
            strokeWidth={3 / scale}
            fillAfterStrokeEnabled
            lineHeight={1.1}
          />
        );
      })}
    </>
  );
}
