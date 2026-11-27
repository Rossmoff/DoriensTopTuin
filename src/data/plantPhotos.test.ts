import { describe, expect, it } from 'vitest';
import { BUILTIN_PLANTS } from './plants';
import { PHOTO_CREDITS } from './plantPhotos';

// Paths of the photo files that exist (Vite resolves this at build/test time).
const FILES = new Set(Object.keys(import.meta.glob('../../public/plants/*.webp')).map((k) => k.split('/').pop()));

describe('plant photos', () => {
  it('every credited photo belongs to a plant, exists, and names its author and licence', () => {
    const ids = new Set(BUILTIN_PLANTS.map((p) => p.id));
    for (const [id, c] of Object.entries(PHOTO_CREDITS)) {
      expect(ids.has(id), id).toBe(true);
      expect(FILES.has(c.file), c.file).toBe(true);
      expect(c.author, id).toBeTruthy();
      expect(c.license, id).toBeTruthy();
      expect(c.source, id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
