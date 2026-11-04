// See-through (Q34): a dithered circle around the character the camera follows cuts through
// overhead tiles and what stands in front of it, so nobody plays blind under a roof. A filter
// removes the pixels of a Bayer pattern, more and more of them toward the center: everything
// stays in palette, with no blending. Written in GLSL for the WebGL renderer, as the palette pass.
import { Filter, GlProgram } from 'pixi.js';

/** Radius of the circle, in game pixels. */
export const SEE_THROUGH_RADIUS = 56;
/** Width of the dithered ring at its edge, in game pixels. */
const FEATHER = 28;

const VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vPixel;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  vPixel = position;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

const FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
in vec2 vPixel;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec2 uCenter;

// Bayer matrices without arrays, which not every GLSL version accepts: 2×2, then 4×4 from it.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

float bayer(vec2 pixel) {
  return bayer2(0.5 * pixel) * 0.25 + bayer2(pixel);
}

void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  vec2 pixel = floor(vPixel);
  float inside = (${SEE_THROUGH_RADIUS.toFixed(1)} - distance(pixel, uCenter)) / ${FEATHER.toFixed(1)};
  // At full depth some pixels stay, so that a roof above the character still reads as one.
  finalColor = min(inside, 0.75) > bayer(pixel) ? vec4(0.0) : color;
}
`;

export interface SeeThrough {
  readonly filter: Filter;
  /** Moves the center of the circle, in game pixels on the screen. */
  center(x: number, y: number): void;
}

export function createSeeThrough(): SeeThrough {
  const uniforms = { uCenter: { value: new Float32Array(2), type: 'vec2<f32>' as const } };
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'see-through' }),
    resources: { seeThroughUniforms: uniforms },
  });
  return {
    filter,
    center(x, y) {
      const value = filter.resources.seeThroughUniforms.uniforms.uCenter as Float32Array;
      value[0] = x;
      value[1] = y;
    },
  };
}
