import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { addByTap, createGarden, storedGardens, tapCanvas } from './helpers';

interface StoredPlacement {
  plantId: string;
  quantity: number;
}

async function openSheet(page: Page, isMobile: boolean) {
  if (isMobile && (await page.getByTestId('sheet-toggle').getAttribute('aria-expanded')) !== 'true') await page.getByTestId('sheet-toggle').click();
}

/** From a selected bed's Plants tab: search a plant, press +, tap the given points, Done. */
async function placeInBed(page: Page, isMobile: boolean, query: string, plantId: string, points: [number, number][]) {
  await openSheet(page, isMobile);
  await page.getByTestId('plant-search').fill(query);
  const btn = page.getByTestId(`place-${plantId}`).first();
  if (!(await btn.isVisible())) await page.getByTestId('group-unsuitable').locator('summary').click();
  await btn.click();
  for (const [x, y] of points) await tapCanvas(page, x, y, isMobile);
  await page.getByTestId('tool-done').click();
}

const placements = async (page: Page) => ((await storedGardens(page))[0] as unknown as { placements: StoredPlacement[] }).placements;

test('place plants in a bed; they are listed, saved and checked', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'house', 0.5, 0.85, isMobile);
  await addByTap(page, 'bed', 0.5, 0.3, isMobile);
  await openSheet(page, isMobile);
  await expect(page.getByTestId('bed-sun-hours')).toBeVisible({ timeout: 20_000 });

  await placeInBed(page, isMobile, 'heather', 'calluna-vulgaris', [[0.46, 0.29], [0.5, 0.29]]);
  // Done returns to the bed, which now lists what is planted in it.
  await openSheet(page, isMobile);
  await expect(page.getByTestId('planted-here')).toContainText('Heather');
  await placeInBed(page, isMobile, 'cabbage', 'cabbage', [[0.53, 0.31]]);

  await expect.poll(async () => (await placements(page)).map((p) => p.plantId).sort()).toEqual(['cabbage', 'calluna-vulgaris', 'calluna-vulgaris']);

  // Cabbage on acid sand is flagged.
  await expect(page.getByTestId('warnings-button')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('warnings-button').click();
  await expect(page.getByTestId('plan-check')).toContainText('Cabbage');
  await expect(page.getByTestId('plan-check')).toContainText('prefers pH ≥ 6.5');
});

test('bloom calendar shows coverage and gaps; vegetable calendar and CSV export', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'bed', 0.5, 0.3, isMobile);
  await placeInBed(page, isMobile, 'crocus', 'crocus-tommasinianus', [[0.47, 0.3]]);
  await placeInBed(page, isMobile, 'heather', 'calluna-vulgaris', [[0.5, 0.3]]);
  await placeInBed(page, isMobile, 'tomato', 'tomato', [[0.53, 0.3]]);

  await page.getByTestId('more-button').click();
  await page.getByTestId('menu-calendars').click();
  const bloom = page.getByTestId('bloom-calendar');
  await expect(bloom).toContainText('Early crocus');
  await expect(bloom).toContainText('Heather');
  await expect(page.getByTestId('bloom-gaps')).toContainText('Apr, May, Jun, Jul');

  await page.getByTestId('tab-veg').click();
  await expect(page.getByTestId('veg-calendar')).toContainText('Tomato');

  const dl = page.waitForEvent('download');
  await page.getByTestId('export-csv').click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe('test-garden-plants.csv');
  const csv = readFileSync((await file.path())!, 'utf8');
  expect(csv).toContain('Heather;Struikheide;Calluna vulgaris');
  expect(csv).toContain('Tomato;Tomaat;Solanum lycopersicum');
});

test('bloom view tints the plan by month', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'bed', 0.5, 0.3, isMobile);
  await placeInBed(page, isMobile, 'heather', 'calluna-vulgaris', [[0.5, 0.3]]);
  if (isMobile) {
    await page.getByTestId('more-button').click();
    await page.getByTestId('menu-bloom').click();
  } else await page.getByTestId('bloom-button').click();
  await page.getByTestId('bloom-month').fill('9');
  await expect(page.getByTestId('bloom-status')).toContainText('1 of 1 plants in flower');
  await page.getByTestId('bloom-month').fill('5');
  await expect(page.getByTestId('bloom-status')).toContainText('0 of 1 plants in flower');
});
