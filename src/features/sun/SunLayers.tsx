import { useMemo } from 'react';
import { Circle, Group, Image as KImage, Line, Shape, Text } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { Garden, Vec2 } from '../../domain/types';
import { bbox, signedArea } from '../../domain/geometry';
import { gardenShadows, sunAtLocal, sunDirection, sunDay, type SunHoursResult } from '../../domain/sun';
import { useSunStore } from '../../state/sunStore';
import { hoursColor } from './heatmapColors';

function fillPolygons(c: CanvasRenderingContext2D, polys: Vec2[][]) {
  c.beginPath();
  for (const poly of polys) {
    // Same winding for every polygon so a nonzero fill gives their union (no darker overlaps).
    const pts = signedArea(poly) < 0 ? [...poly].reverse() : poly;
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
  }
  c.fill('nonzero');
}

/** Shadows at the selected date and time. */
export function ShadowLayer({ garden, dark }: { garden: Garden; dark: boolean }) {
  const date = useSunStore((s) => s.date);
  const minutes = useSunStore((s) => s.minutes);
  const shadows = useMemo(() => {
    const sun = sunAtLocal(date, minutes, garden.location, garden.sunCorrection);
    return gardenShadows(garden.objects, sun, {
      date,
      planUpBearingDeg: garden.planUpBearingDeg,
      leafSeason: garden.settings.leafSeason,
      leaflessTransmission: garden.settings.leaflessTransmission,
    });
  }, [garden, date, minutes]);

  const base = dark ? 0.55 : 0.4;
  const groups = new Map<number, Vec2[][]>();
  for (const s of shadows) {
    const k = Math.round(s.opacity * 20) / 20;
    groups.set(k, [...(groups.get(k) ?? []), ...s.polygons]);
  }
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx: Context) => {
        const c = ctx._context;
        c.save();
        for (const [opacity, polys] of groups) {
          c.fillStyle = `rgba(${dark ? '0,0,0' : '25,35,70'},${base * opacity})`;
          fillPolygons(c, polys);
        }
        c.restore();
      }}
    />
  );
}

/** Sun-hours map as a bitmap with one pixel per cell. */
export function HeatmapLayer({ result, opacity }: { result: SunHoursResult; opacity: number }) {
  const canvas = useMemo(() => {
    const { cols, rows } = result.grid;
    const cv = document.createElement('canvas');
    cv.width = cols;
    cv.height = rows;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(cols, rows);
    for (let i = 0; i < result.hours.length; i++) {
      const h = result.hours[i];
      if (Number.isNaN(h)) continue;
      const [r, g, b] = hoursColor(h, result.daylightHours);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }, [result]);
  const { originX, originY, cellSize, cols, rows } = result.grid;
  return (
    <KImage
      image={canvas}
      x={originX}
      y={originY}
      width={cols * cellSize}
      height={rows * cellSize}
      opacity={opacity}
      imageSmoothingEnabled={false}
      listening={false}
    />
  );
}

/** The sun's path for the selected date drawn as a ring around the plot, with the current sun. */
export function SunArc({ garden, scale, textColor }: { garden: Garden; scale: number; textColor: string }) {
  const date = useSunStore((s) => s.date);
  const minutes = useSunStore((s) => s.minutes);
  const { path, ticks, center, R } = useMemo(() => {
    const b = bbox(garden.boundary);
    const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const R = Math.hypot(b.maxX - b.minX, b.maxY - b.minY) / 2 + 2;
    const day = sunDay(date, garden.location.lat, garden.location.lon, garden.location.timeZone);
    const path: number[] = [];
    const ticks: { p: Vec2; label: string }[] = [];
    if (day.sunrise !== null && day.sunset !== null) {
      for (let m = day.sunrise; m <= day.sunset + 0.01; m += 10) {
        const p = arcPoint(garden, date, m, center, R);
        if (p) path.push(p.x, p.y);
      }
      for (let h = Math.ceil(day.sunrise / 60); h * 60 <= day.sunset; h++) {
        if (h % 2) continue;
        const p = arcPoint(garden, date, h * 60, center, R);
        if (p) ticks.push({ p, label: `${h}h` });
      }
    }
    return { path, ticks, center, R };
  }, [garden, date]);
  const sunNow = arcPoint(garden, date, minutes, center, R);
  const fs = 11 / scale;
  return (
    <Group listening={false} name="ui-overlay">
      <Line points={path} stroke="#f0a020" strokeWidth={2} strokeScaleEnabled={false} dash={[6, 4]} opacity={0.9} />
      {ticks.map((t) => (
        <Group key={t.label} x={t.p.x} y={t.p.y}>
          <Circle radius={3 / scale} fill="#f0a020" />
          <Text text={t.label} fontSize={fs} fill={textColor} x={4 / scale} y={-fs - 2 / scale} />
        </Group>
      ))}
      {sunNow && (
        <Group x={sunNow.x} y={sunNow.y}>
          <Circle radius={12 / scale} fill="#ffd23f" stroke="#e08a00" strokeWidth={2} strokeScaleEnabled={false} shadowColor="#ffb300" shadowBlur={12} />
        </Group>
      )}
    </Group>
  );
}

function arcPoint(garden: Garden, date: string, minutes: number, center: Vec2, R: number): Vec2 | null {
  const sun = sunAtLocal(date, minutes, garden.location, garden.sunCorrection);
  if (sun.altitudeDeg < -0.5) return null;
  const d = sunDirection(sun, garden.planUpBearingDeg);
  const r = R * (1 - 0.5 * (Math.max(sun.altitudeDeg, 0) / 90));
  return { x: center.x + d.x * r, y: center.y + d.y * r };
}
