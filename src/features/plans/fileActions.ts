import { nanoid } from 'nanoid';
import type { Garden } from '../../domain/types';
import { bbox, geometryBBox, niceNumber, unionBBox } from '../../domain/geometry';
import { exportFileName, parseGardenJson, serializeGarden } from '../../storage';
import { getRepository, openGarden, saveNow } from '../../state/persistence';
import { gardenStore } from '../../state/gardenStore';
import { uiStore } from '../../state/uiStore';
import { getStage } from '../editor/stageRegistry';

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportJson(g: Garden) {
  downloadBlob(new Blob([serializeGarden(g)], { type: 'application/json' }), exportFileName(g));
}

/** Import a plan file. If a plan with the same id exists, it is imported as a copy. */
export async function importJsonFile(file: File): Promise<Garden> {
  const g = parseGardenJson(await file.text());
  const existing = await getRepository().get(g.id);
  const garden = existing ? { ...g, id: nanoid(12), name: `${g.name} (imported)` } : g;
  await saveNow(garden);
  await openGarden(garden);
  uiStore.getState().select(null);
  uiStore.getState().showToast(`Imported “${garden.name}”`);
  return garden;
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Render the whole garden to a PNG with title, north arrow and scale bar. */
export async function exportPng() {
  const stage = getStage();
  const g = gardenStore.getState().garden;
  if (!stage || !g) return;
  const box = unionBBox([bbox(g.boundary), ...g.objects.map((o) => geometryBBox(o.geometry))])!;
  const margin = 1;
  const wM = box.maxX - box.minX + 2 * margin;
  const hM = box.maxY - box.minY + 2 * margin;
  const scale = Math.min(2400 / wM, 2400 / hM, 80);

  const prev = { scale: stage.scaleX(), x: stage.x(), y: stage.y(), w: stage.width(), h: stage.height() };
  const overlays = stage.find('.ui-overlay');
  overlays.forEach((n) => n.hide());
  stage.scale({ x: scale, y: scale });
  stage.position({ x: -(box.minX - margin) * scale, y: -(box.minY - margin) * scale });
  stage.size({ width: wM * scale, height: hM * scale });
  stage.draw();
  const plan = stage.toCanvas({ pixelRatio: 1 });
  stage.size({ width: prev.w, height: prev.h });
  stage.scale({ x: prev.scale, y: prev.scale });
  stage.position({ x: prev.x, y: prev.y });
  overlays.forEach((n) => n.show());
  stage.draw();

  const header = 70;
  const out = document.createElement('canvas');
  out.width = plan.width;
  out.height = plan.height + header;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(plan, 0, header);
  ctx.fillStyle = '#1f2a1c';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(g.name, 20, 40);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Dorien's Tuin Tafereel · ${new Date().toLocaleDateString('en-GB')}`, 20, 62);
  // Scale bar
  const m = niceNumber(200 / scale);
  const px = m * scale;
  const x0 = out.width - px - 30;
  ctx.fillRect(x0, 46, px, 6);
  ctx.fillText(`${m} m`, x0, 38);
  // North arrow
  const cx = x0 - 50;
  const cy = 35;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-g.planUpBearingDeg * Math.PI) / 180);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f2a1c';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -27);
  ctx.restore();

  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/png'));
  if (blob) downloadBlob(blob, exportFileName(g).replace('.tuin.json', '.png'));
}
