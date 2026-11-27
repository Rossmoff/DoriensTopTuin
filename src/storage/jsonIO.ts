import type { Garden } from '../domain/types';
import { migrateGarden } from './migrations';

export const EXPORT_FORMAT = 'tuin-tafereel-garden';

export interface GardenExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  garden: Garden;
}

export function serializeGarden(garden: Garden): string {
  const file: GardenExportFile = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    garden,
  };
  return JSON.stringify(file, null, 2);
}

/** Parse an exported file (or a bare garden object) and validate it. */
export function parseGardenJson(text: string): Garden {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  const obj = data as Partial<GardenExportFile> & Partial<Garden>;
  const raw = obj.format === EXPORT_FORMAT ? obj.garden : obj;
  if (!raw || !Array.isArray((raw as Garden).boundary) || !Array.isArray((raw as Garden).objects)) {
    throw new Error('The file does not look like a garden plan.');
  }
  return migrateGarden(raw);
}

export function exportFileName(garden: Garden): string {
  const slug = garden.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garden';
  return `${slug}.tuin.json`;
}
