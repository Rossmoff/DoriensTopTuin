import { useState } from 'react';
import type { Plant } from '../../domain/types';
import { builtinPhotoUrl, PHOTO_CREDITS } from '../../data/plantPhotos';
import { plantColour } from './plantDisplay';

/** Small round plant photo with a flower-colour ring; falls back to a colour dot. */
export function PlantThumb({ plant, size = 44 }: { plant: Plant | undefined; size?: number }) {
  const [broken, setBroken] = useState(false);
  const colour = plant ? plantColour(plant) : '#999';
  const src = plant ? plant.photo ?? builtinPhotoUrl(plant.id) : null;
  const style = { width: size, height: size, borderColor: colour };
  if (!src || broken) {
    return <span className="thumb fallback" style={{ ...style, background: colour }} aria-hidden />;
  }
  return <img className="thumb" src={src} alt="" width={size} height={size} loading="lazy" decoding="async" style={style} onError={() => setBroken(true)} />;
}

/** "Photo: author, licence" with a link to the source page. */
export function PhotoCredit({ plant }: { plant: Plant }) {
  if (plant.photo) return <p className="photo-credit">Photo: your own</p>;
  const c = PHOTO_CREDITS[plant.id];
  if (!c) return null;
  return (
    <p className="photo-credit">
      Photo: {c.author},{' '}
      {c.licenseUrl ? (
        <a href={c.licenseUrl} target="_blank" rel="noreferrer">
          {c.license}
        </a>
      ) : (
        c.license
      )}
      , via{' '}
      <a href={c.source} target="_blank" rel="noreferrer">
        Wikimedia Commons
      </a>
    </p>
  );
}
