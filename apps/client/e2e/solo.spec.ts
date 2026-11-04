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

  // Move, aim, fire and throw a grenade for a while, then just watch it go off.
  await page.mouse.move(1400, 500);
  await page.keyboard.down('KeyD');
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.click(1400, 500, { button: 'right' });
  await page.waitForTimeout(2000);
  await page.mouse.up();
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(7000);

  expect(errors).toEqual([]);
});

// C2.7 and Q34 start from here: the shaders of the see-through compile on a real page.
test('a flamethrower burns a hut with no error, seen through the roof', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/dev/scene?theme=vietnam&at=54,24&character=1&participants=1');
  await expect(page.locator('canvas.in-match')).toHaveCount(1);
  await page.mouse.move(1400, 500);
  await page.mouse.down();
  await page.waitForTimeout(3000);
  await page.mouse.up();
  await page.waitForTimeout(6000);

  expect(errors).toEqual([]);
});
