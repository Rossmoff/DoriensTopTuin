import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createGarden } from './helpers';

// Any real image will do for the upload; use one of the bundled photos.
const PHOTO = readFileSync('public/plants/sorbus-aucuparia.webp');

test('plants show a photo with credit; you can add your own photo', async ({ page }) => {
  await createGarden(page);
  await page.getByTestId('more-button').click();
  await page.getByTestId('open-library').click();
  const lib = page.getByTestId('plant-library');
  await lib.getByTestId('plant-search').fill('Calluna');
  const row = lib.getByTestId('plant-calluna-vulgaris');
  await expect(row.locator('img.thumb')).toHaveAttribute('src', /plants\/calluna-vulgaris\.webp$/);
  await expect.poll(() => row.locator('img.thumb').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(160);

  await row.locator('.plant-main').click();
  await expect(page.getByTestId('plant-detail').locator('.photo-credit')).toContainText('Wikimedia Commons');
  await page.keyboard.press('Escape');

  await page.getByTestId('add-plant').click();
  await page.getByTestId('plant-name-en').fill('Our mystery shrub');
  await page.getByTestId('plant-photo-input').setInputFiles({ name: 'shrub.webp', mimeType: 'image/webp', buffer: PHOTO });
  await expect(page.getByTestId('plant-editor').locator('img.thumb')).toHaveAttribute('src', /^data:image\/(webp|jpeg)/);
  await page.getByTestId('save-plant').click();
  await lib.getByTestId('plant-search').fill('mystery');
  await expect(lib.locator('img.thumb').first()).toHaveAttribute('src', /^data:image/);
});
