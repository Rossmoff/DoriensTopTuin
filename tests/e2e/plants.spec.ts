import { expect, test } from '@playwright/test';
import { addByTap, createGarden, tapCanvas } from './helpers';

async function openSheet(page: import('@playwright/test').Page, isMobile: boolean) {
  if (isMobile && (await page.getByTestId('sheet-toggle').getAttribute('aria-expanded')) !== 'true') {
    await page.getByTestId('sheet-toggle').click();
  }
}

test('tapping a bed shows its sun hours and a ranked plant list with reasons', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'house', 0.5, 0.8, isMobile);
  await addByTap(page, 'bed', 0.5, 0.45, isMobile);
  await openSheet(page, isMobile);
  await expect(page.getByTestId('bed-sun-hours')).toHaveText(/\d+\.\d h/, { timeout: 20_000 });

  // Default soil (dry acid sand): heather is a good match, cabbage is unsuitable.
  await page.getByTestId('plant-search').fill('heather');
  await expect(page.getByTestId('group-good').getByTestId('plant-calluna-vulgaris')).toBeVisible();
  await expect(page.getByTestId('plant-calluna-vulgaris')).toContainText('drought tolerant');
  await page.getByTestId('plant-search').fill('cabbage');
  await expect(page.getByTestId('group-unsuitable').getByTestId('plant-cabbage')).toBeAttached();
  await page.getByTestId('group-unsuitable').locator('summary').click();
  await expect(page.getByTestId('plant-cabbage')).toContainText('prefers pH ≥ 6.5, this spot is ~5.0');

  // An improved vegetable bed makes cabbage a good match.
  await page.getByTestId('tab-details').click();
  await page.getByTestId('bed-own-soil').check();
  await page.getByTestId('bed-improved').click();
  await page.getByTestId('tab-plants').click();
  await expect(page.getByTestId('group-good').getByTestId('plant-cabbage')).toBeVisible();
});

test('garden walk: tap a spot to see sun, soil and suggestions; no editing', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'shed', 0.7, 0.7, isMobile);
  await page.getByTestId('walk-button').click();
  await expect(page.getByTestId('add-button')).toHaveCount(0);
  await tapCanvas(page, 0.4, 0.3, isMobile);
  await openSheet(page, isMobile);
  await expect(page.getByTestId('walk-panel').getByTestId('bed-sun-hours')).toHaveText(/\d+\.\d h/, { timeout: 20_000 });
  await expect(page.getByTestId('walk-panel').getByTestId('group-good')).toBeVisible();
  await page.getByTestId('walk-button').click();
  await expect(page.getByTestId('add-button')).toBeVisible();
});

test('add your own plant in the library; it survives a reload', async ({ page }) => {
  await createGarden(page);
  await page.getByTestId('more-button').click();
  await page.getByTestId('open-library').click();
  await page.getByTestId('add-plant').click();
  await page.getByTestId('plant-name-en').fill('Bell heather');
  await page.getByTestId('plant-name-nl').fill('Rode dophei');
  await page.getByTestId('plant-name-latin').fill('Erica cinerea');
  await page.getByTestId('save-plant').click();
  await page.getByTestId('plant-library').getByTestId('plant-search').fill('dophei');
  await expect(page.getByTestId('plant-library')).toContainText('Bell heather');

  await page.reload();
  await page.getByTestId('more-button').click();
  await page.getByTestId('open-library').click();
  await page.getByTestId('plant-library').getByTestId('plant-search').fill('Erica cinerea');
  await expect(page.getByTestId('plant-library')).toContainText('my plant');
});
