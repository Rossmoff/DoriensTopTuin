import credits from './plantPhotos.json';

export interface PhotoCredit {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

/** Credits for the builtin plant photos (public/plants/<id>.webp), from Wikimedia Commons. */
export const PHOTO_CREDITS = credits as Record<string, PhotoCredit>;

export function builtinPhotoUrl(plantId: string): string | null {
  const c = PHOTO_CREDITS[plantId];
  return c ? `${import.meta.env.BASE_URL}plants/${c.file}` : null;
}
