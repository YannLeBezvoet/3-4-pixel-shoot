// Development pattern to check crisp scaling: the 64 palette swatches and a 1-pixel
// checkerboard, which must show as sharp N×N blocks at every scale factor.
import { Container, Graphics } from 'pixi.js';
import type { Palette } from '@pixel-shoot/content';

export function createTestPattern(palette: Palette): Container {
  const root = new Container();
  const swatches = new Graphics();
  palette.colors.forEach((color, i) => {
    swatches
      .rect(8 + (i % 16) * 12, 8 + Math.floor(i / 16) * 12, 10, 10)
      .fill(Number.parseInt(color.hex, 16));
  });
  root.addChild(swatches);
  const checker = new Graphics();
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0) checker.rect(8 + x, 64 + y, 1, 1);
  checker.fill(0xffffff);
  root.addChild(checker);
  return root;
}
