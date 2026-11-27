import { expect, test } from '@playwright/test';
import { addByTap, createGarden, storedGardens, tapCanvas } from './helpers';

test('shadow view: date presets, time slider and sun readout', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'house', 0.5, 0.75, isMobile);
  await page.getByTestId('sun-button').click();
  await expect(page.getByTestId('sun-bar')).toBeVisible();

  await page.getByTestId('sun-presets').selectOption('12-21');
  await expect(page.getByTestId('sun-date')).toHaveValue(/-12-21$/);
  // 12:35 is close to solar noon in Genk in winter: the sun is ~15–16° high in the south.
  await page.getByTestId('sun-time').fill('755');
  await expect(page.getByTestId('sun-readout')).toContainText(/1[56]° high, S/);

  await page.getByTestId('sun-presets').selectOption('06-21');
  await page.getByTestId('sun-time').fill('820');
  await expect(page.getByTestId('sun-readout')).toContainText(/6[12]° high, S/);
});

test('sun-hours map: a tapped spot shows an info card', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'house', 0.5, 0.8, isMobile);
  if (isMobile) await page.getByLabel('Deselect').click();
  else await page.keyboard.press('Escape');
  await page.getByTestId('sun-button').click();
  await page.getByTestId('view-hours').click();
  await expect(page.getByTestId('sun-status')).toContainText('open sky', { timeout: 20_000 });
  await tapCanvas(page, 0.42, 0.25, isMobile);
  await expect(page.getByTestId('probe-hours')).toHaveText(/\d+\.\d h/);
});

test('draw a shady zone; it overrides the light class', async ({ page, isMobile }) => {
  await createGarden(page);
  await page.getByTestId('add-button').click();
  await page.getByTestId('add-zone-shady').click();
  await tapCanvas(page, 0.3, 0.3, isMobile);
  await tapCanvas(page, 0.6, 0.3, isMobile);
  await tapCanvas(page, 0.6, 0.5, isMobile);
  await page.getByTestId('finish-drawing').click();
  await expect.poll(async () => (await storedGardens(page))[0] as unknown as { zones: { kind: string }[] }).toMatchObject({ zones: [{ kind: 'shady' }] });

  await page.getByTestId('sun-button').click();
  await page.getByTestId('view-hours').click();
  await expect(page.getByTestId('sun-status')).toContainText('open sky', { timeout: 20_000 });
  await tapCanvas(page, 0.5, 0.35, isMobile);
  await expect(page.getByTestId('sun-probe')).toContainText('marked shady');
  await expect(page.getByTestId('sun-probe')).toContainText('Zone: Shady');
});
