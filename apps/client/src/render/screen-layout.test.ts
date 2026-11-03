import { describe, expect, it } from 'vitest';
import { computeLayout, toGamePixels } from './screen-layout';

describe('computeLayout', () => {
  it('scales ×2 at 1080p and ×4 at 4K', () => {
    expect(computeLayout(1920, 1080, 1)).toEqual({
      factor: 2,
      cssWidth: 1920,
      cssHeight: 1080,
      cssLeft: 0,
      cssTop: 0,
    });
    expect(computeLayout(3840, 2160, 1).factor).toBe(4);
  });

  it('works in device pixels when the browser zooms or the OS scales', () => {
    // A 4K screen shown at 200 %: 1920×1080 CSS pixels, 3840×2160 device pixels.
    expect(computeLayout(1920, 1080, 2)).toEqual({
      factor: 4,
      cssWidth: 1920,
      cssHeight: 1080,
      cssLeft: 0,
      cssTop: 0,
    });
    // 1080p at 125 %: 1536×864 CSS pixels.
    expect(computeLayout(1536, 864, 1.25)).toMatchObject({
      factor: 2,
      cssWidth: 1536,
      cssHeight: 864,
    });
  });

  it('letterboxes screens that are not a multiple of 960×540', () => {
    expect(computeLayout(1366, 768, 1)).toEqual({
      factor: 1,
      cssWidth: 960,
      cssHeight: 540,
      cssLeft: 203,
      cssTop: 114,
    });
    expect(computeLayout(2560, 1440, 1)).toEqual({
      factor: 2,
      cssWidth: 1920,
      cssHeight: 1080,
      cssLeft: 320,
      cssTop: 180,
    });
    expect(computeLayout(3440, 1440, 1)).toMatchObject({ factor: 2, cssLeft: 760, cssTop: 180 });
  });

  it('never goes below ×1', () => {
    expect(computeLayout(800, 450, 1)).toMatchObject({ factor: 1, cssWidth: 960, cssLeft: -80 });
  });
});

describe('toGamePixels', () => {
  it('maps the pointer into the 960×540 game area', () => {
    const layout = computeLayout(2560, 1440, 1);
    expect(toGamePixels(layout, 320, 180)).toEqual({ x: 0, y: 0 });
    expect(toGamePixels(layout, 320 + 1920, 180 + 1080)).toEqual({ x: 960, y: 540 });
    expect(toGamePixels(layout, 1280, 720)).toEqual({ x: 480, y: 270 });
  });
});
