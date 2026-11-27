import { Shape } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { Shape as KShape } from 'konva/lib/Shape';

/** Infinite grid drawn only over the visible area. Reads the stage transform at draw time. */
export function Grid({ step, color, majorColor }: { step: number; color: string; majorColor: string }) {
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: Context, shape: KShape) => {
        const stage = shape.getStage();
        if (!stage) return;
        const scale = stage.scaleX();
        const x0 = -stage.x() / scale;
        const y0 = -stage.y() / scale;
        const x1 = x0 + stage.width() / scale;
        const y1 = y0 + stage.height() / scale;
        let s = step;
        while (s * scale < 8) s *= 2;
        const major = 5 * scale >= 30 ? 5 : 10;
        const c = ctx._context;
        c.lineWidth = 1 / scale;
        const drawLines = (stepM: number, colour: string, skipMajor: boolean) => {
          c.beginPath();
          for (let x = Math.ceil(x0 / stepM) * stepM; x <= x1; x += stepM) {
            if (skipMajor && Math.abs(x / major - Math.round(x / major)) < 1e-6) continue;
            c.moveTo(x, y0);
            c.lineTo(x, y1);
          }
          for (let y = Math.ceil(y0 / stepM) * stepM; y <= y1; y += stepM) {
            if (skipMajor && Math.abs(y / major - Math.round(y / major)) < 1e-6) continue;
            c.moveTo(x0, y);
            c.lineTo(x1, y);
          }
          c.strokeStyle = colour;
          c.stroke();
        };
        if (s < major) drawLines(s, color, true);
        drawLines(major, majorColor, false);
      }}
    />
  );
}
