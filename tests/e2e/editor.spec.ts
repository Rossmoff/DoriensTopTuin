import { expect, test } from '@playwright/test';
import { addByTap, createGarden, longPress, storedGardens, tapCanvas } from './helpers';

test('draw a house, tree and shed; edit height; survives reload', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'house', 0.5, 0.25, isMobile);
  await expect(page.getByTestId('prop-height')).toHaveValue('6');
  if (isMobile) await page.getByTestId('sheet-toggle').click();
  await page.getByTestId('prop-height').fill('7.5');
  if (isMobile) await page.getByTestId('sheet-toggle').click();

  await addByTap(page, 'tree', 0.3, 0.6, isMobile);
  await addByTap(page, 'shed', 0.7, 0.75, isMobile);

  await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(3);
  await page.reload();
  await page.getByTestId('canvas').waitFor();
  const [g] = await storedGardens(page);
  expect(g.objects.map((o) => o.kind)).toEqual(['house', 'tree', 'shed']);
  expect(g.objects[0].height).toBe(7.5);
});

test('undo and redo', async ({ page, isMobile }) => {
  await createGarden(page);
  await addByTap(page, 'shed', 0.5, 0.5, isMobile);
  await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(1);
  await page.getByTestId('undo').click();
  await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(0);
  await page.getByTestId('redo').click();
  await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(1);
});

test('draw a fence as a polyline', async ({ page, isMobile }) => {
  await createGarden(page);
  await page.getByTestId('add-button').click();
  await page.getByTestId('add-fence').click();
  await tapCanvas(page, 0.3, 0.7, isMobile);
  await tapCanvas(page, 0.6, 0.7, isMobile);
  await tapCanvas(page, 0.6, 0.5, isMobile);
  await page.getByTestId('finish-drawing').click();
  await expect.poll(async () => (await storedGardens(page))[0]?.objects[0]?.kind).toBe('fence');
});

test('JSON export and import round-trip', async ({ page, isMobile }) => {
  await createGarden(page, 'Round trip');
  await addByTap(page, 'house', 0.5, 0.3, isMobile);
  await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(1);

  await page.getByTestId('more-button').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-json').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('round-trip.tuin.json');
  const path = await download.path();

  await page.getByTestId('more-button').click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: /Import JSON/ }).click();
  await (await chooserPromise).setFiles(path);

  await expect.poll(async () => (await storedGardens(page)).length).toBe(2);
  const gardens = await storedGardens(page);
  const imported = gardens.find((g) => g.name === 'Round trip (imported)')!;
  const original = gardens.find((g) => g.name === 'Round trip')!;
  expect(imported.objects).toEqual(original.objects);
});

test('works offline after first visit', async ({ page, context }) => {
  await createGarden(page, 'Offline');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // let the service worker take control
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('canvas')).toBeVisible();
  await expect(page.getByTestId('plans-button')).toContainText('Offline');
});

test.describe('mobile only', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch-specific');

  test('bottom sheet and long-press menu', async ({ page }) => {
    await createGarden(page);
    await expect(page.getByTestId('bottom-sheet')).toBeVisible();
    const { x, y } = await addByTap(page, 'shed', 0.5, 0.4, true);
    await page.getByLabel('Deselect').click();
    await longPress(page, x, y);
    await expect(page.getByTestId('context-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect.poll(async () => (await storedGardens(page))[0]?.objects.length).toBe(2);
  });

  test('tap targets are at least 44px', async ({ page }) => {
    await createGarden(page);
    for (const id of ['add-button', 'measure-button', 'undo', 'more-button', 'sheet-toggle']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.height, id).toBeGreaterThanOrEqual(44);
      expect(b.width, id).toBeGreaterThanOrEqual(44);
    }
  });
});
