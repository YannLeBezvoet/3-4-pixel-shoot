// The palette pass (Q14): a final full-screen filter that snaps every pixel to the nearest
// Resurrect 64 color, so anything that blends at runtime (fades, transparency) stays in
// palette. Same color distance as the palette check ("redmean", packages/content). Written in
// GLSL for the WebGL renderer, PixiJS's default.
import type { Palette } from '@pixel-shoot/content';
import { Filter, GlProgram } from 'pixi.js';

const VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

const fragment = (size: number) => /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec3 uPalette[${size}];

void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  // Mostly transparent pixels stay transparent (the background shows); others become opaque.
  if (color.a < 0.5) { finalColor = vec4(0.0); return; }
  vec3 rgb = color.rgb / color.a * 255.0;
  float best = 1e20;
  vec3 nearest = uPalette[0];
  for (int i = 0; i < ${size}; i++) {
    vec3 c = uPalette[i];
    float meanR = (rgb.r + c.r) / 2.0;
    vec3 d = rgb - c;
    float distance = (2.0 + meanR / 256.0) * d.r * d.r + 4.0 * d.g * d.g
      + (2.0 + (255.0 - meanR) / 256.0) * d.b * d.b;
    if (distance < best) { best = distance; nearest = c; }
  }
  finalColor = vec4(nearest / 255.0, 1.0);
}
`;

export function createPalettePass(palette: Palette): Filter {
  const colors = new Float32Array(palette.colors.flatMap((c) => [c.r, c.g, c.b]));
  return new Filter({
    glProgram: GlProgram.from({
      vertex: VERTEX,
      fragment: fragment(palette.colors.length),
      name: 'palette-pass',
    }),
    resources: {
      paletteUniforms: {
        uPalette: { value: colors, type: 'vec3<f32>', size: palette.colors.length },
      },
    },
  });
}
