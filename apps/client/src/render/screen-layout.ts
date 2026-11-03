// Integer scaling of the 960×540 internal resolution (ARCHITECTURE §11, Q7).
// Computed in device pixels so every game pixel becomes an exact N×N block on screen.

export const INTERNAL_WIDTH = 960;
export const INTERNAL_HEIGHT = 540;

export interface ScreenLayout {
  /** Device pixels per game pixel. */
  readonly factor: number;
  /** Size and position of the game area, in CSS pixels. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly cssLeft: number;
  readonly cssTop: number;
}

/**
 * The largest integer factor that fits the viewport (at least 1), centered with letterboxing.
 * The field of view never grows: every player sees the same 960×540 game pixels.
 */
export function computeLayout(
  viewportCssWidth: number,
  viewportCssHeight: number,
  devicePixelRatio: number,
): ScreenLayout {
  const deviceWidth = Math.round(viewportCssWidth * devicePixelRatio);
  const deviceHeight = Math.round(viewportCssHeight * devicePixelRatio);
  const factor = Math.max(
    1,
    Math.floor(Math.min(deviceWidth / INTERNAL_WIDTH, deviceHeight / INTERNAL_HEIGHT)),
  );
  const width = INTERNAL_WIDTH * factor;
  const height = INTERNAL_HEIGHT * factor;
  return {
    factor,
    cssWidth: width / devicePixelRatio,
    cssHeight: height / devicePixelRatio,
    cssLeft: Math.floor((deviceWidth - width) / 2) / devicePixelRatio,
    cssTop: Math.floor((deviceHeight - height) / 2) / devicePixelRatio,
  };
}

/** Converts a pointer position (CSS pixels, viewport) into game pixels. */
export function toGamePixels(
  layout: ScreenLayout,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: ((clientX - layout.cssLeft) / layout.cssWidth) * INTERNAL_WIDTH,
    y: ((clientY - layout.cssTop) / layout.cssHeight) * INTERNAL_HEIGHT,
  };
}
