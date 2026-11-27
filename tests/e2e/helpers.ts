import type { Page } from '@playwright/test';

/** Create a fresh garden from the first-run dialog. */
export async function createGarden(page: Page, name = 'Test garden', width = '20', length = '30') {
  await page.goto('/');
  await page.getByTestId('new-name').fill(name);
  await page.getByTestId('new-width').fill(width);
  await page.getByTestId('new-length').fill(length);
  await page.getByTestId('create-garden').click();
  await page.getByTestId('canvas').waitFor();
  await page.waitForTimeout(200);
}

/** Tap/click at a point on the canvas given as fractions of its size. */
export async function tapCanvas(page: Page, fx: number, fy: number, isMobile: boolean) {
  const box = (await page.getByTestId('canvas').boundingBox())!;
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  return { x, y };
}

export async function addByTap(page: Page, kind: string, fx: number, fy: number, isMobile: boolean) {
  await page.getByTestId('add-button').click();
  await page.getByTestId(`add-${kind}`).click();
  return tapCanvas(page, fx, fy, isMobile);
}

/** Read all stored gardens straight from IndexedDB (what survives a restart). */
export function storedGardens(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ name: string; objects: { kind: string; height: number; label: string }[] }[]>((resolve, reject) => {
        const req = indexedDB.open('tuin-tafereel');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('gardens', 'readonly');
          const all = tx.objectStore('gardens').getAll();
          all.onsuccess = () => resolve(all.result);
          all.onerror = () => reject(all.error);
        };
      }),
  );
}

/** Long-press via raw CDP touch events (Chromium only). */
export async function longPress(page: Page, x: number, y: number, ms = 800) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
