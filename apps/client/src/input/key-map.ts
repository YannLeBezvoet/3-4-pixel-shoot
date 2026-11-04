// Keys by physical position (KeyboardEvent.code), so ZQSD on AZERTY and WASD on QWERTY are
// the same keys with no setting (Q53, ARCHITECTURE §12). Pure: no DOM.
import type { Vec2 } from '@pixel-shoot/shared';
import { vec2 } from '@pixel-shoot/shared';

const MOVE_KEYS: Readonly<Record<string, Vec2>> = {
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export const RELOAD_KEY = 'KeyR';
/** An alternative to the right mouse button (Q62). */
export const THROW_KEY = 'KeyG';
export const PAUSE_KEY = 'Escape';

/** Keys the game handles, so the browser does not also act on them (scrolling). */
export function isGameKey(code: string): boolean {
  return code in MOVE_KEYS || code === RELOAD_KEY || code === THROW_KEY;
}

/** Movement direction from the held keys: length 1, or zero when they cancel out. */
export function moveFromKeys(held: ReadonlySet<string>): Vec2 {
  let x = 0;
  let y = 0;
  for (const code of held) {
    const direction = MOVE_KEYS[code];
    if (!direction) continue;
    x += direction.x;
    y += direction.y;
  }
  // The same direction from two keys (D and the right arrow) counts once.
  return vec2.normalize({ x: Math.sign(x), y: Math.sign(y) });
}
