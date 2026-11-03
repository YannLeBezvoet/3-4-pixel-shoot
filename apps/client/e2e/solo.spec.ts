// C1.12: from the main menu, start a solo match and play 10 seconds with no console error.
import { expect, test } from '@playwright/test';

test('a solo match starts and runs for 10 seconds without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Solo' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  // The menu is gone: the match is on the canvas, the system cursor replaced by the crosshair.
  await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);
  await expect(page.locator('canvas.in-match')).toHaveCount(1);

  // Move, aim and fire for a while, then just watch.
  await page.mouse.move(1400, 500);
  await page.keyboard.down('KeyD');
  await page.mouse.down();
  await page.waitForTimeout(3000);
  await page.mouse.up();
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(7000);

  expect(errors).toEqual([]);
});
