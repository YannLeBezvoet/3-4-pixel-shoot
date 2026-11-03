// Development pattern to check crisp scaling: the 64 palette swatches and a 1-pixel
// checkerboard, which must show as sharp N×N blocks at every scale factor; and a strip of
// half-transparent swatches over each other, whose blended colors leave the palette unless
// the palette pass is on (Q14).
import { Container, Graphics } from 'pixi.js';
import type { Palette } from '@pixel-shoot/content';

export function createTestPattern(palette: Palette): Container {
  const root = new Container();
  const swatches = new Graphics();
  palette.colors.forEach((color, i) => {
    swatches
      .rect(760 + (i % 16) * 12, 488 + Math.floor(i / 16) * 12, 10, 10)
      .fill(Number.parseInt(color.hex, 16));
  });
  root.addChild(swatches);
  const checker = new Graphics();
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0) checker.rect(736 + x, 488 + y, 1, 1);
  checker.fill(0xffffff);
  root.addChild(checker);
  const blend = new Graphics();
  palette.colors.slice(0, 16).forEach((color, i) => {
    blend
      .rect(760 + i * 12, 472, 18, 10)
      .fill({ color: Number.parseInt(color.hex, 16), alpha: 0.6 });
  });
  root.addChild(blend);
  return root;
}
