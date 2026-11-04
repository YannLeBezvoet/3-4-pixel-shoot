// Keyboard and mouse during a match: held physical keys, mouse buttons and the pointer in
// game pixels. Everything is released when the window loses focus, so no key stays stuck.
import type { InputCommand } from '@pixel-shoot/sim';
import { Button } from '@pixel-shoot/sim';
import type { ScreenLayout } from '../render/screen-layout';
import { toGamePixels } from '../render/screen-layout';
import { RELOAD_KEY, THROW_KEY, isGameKey, moveFromKeys } from './key-map';

/** Bits of `mouseButtons`, one per `MouseEvent.button`. */
const LEFT_BUTTON = 1;
const RIGHT_BUTTON = 1 << 2;

export interface GameInput {
  /** Pointer position in game pixels (screen space). */
  pointer(): { x: number; y: number };
  /** The command for this frame, aiming from `origin` (game pixels) to the pointer. */
  command(origin: { x: number; y: number }): InputCommand;
  /** Called with the mouse button (0 left, 2 right) on each press. */
  onPress(listener: (button: number) => void): void;
  dispose(): void;
}

export function createGameInput(layout: () => ScreenLayout): GameInput {
  const held = new Set<string>();
  let mouseButtons = 0;
  let pointer = { x: 480, y: 270 };
  const pressListeners: ((button: number) => void)[] = [];

  const keydown = (event: KeyboardEvent) => {
    if (!isGameKey(event.code)) return;
    held.add(event.code);
    event.preventDefault();
  };
  const keyup = (event: KeyboardEvent) => held.delete(event.code);
  const pointermove = (event: PointerEvent) => {
    pointer = toGamePixels(layout(), event.clientX, event.clientY);
  };
  const mousedown = (event: MouseEvent) => {
    // Clicks on the interface (pause menu buttons) are not shots.
    if ((event.target as Element | null)?.closest?.('button, a, input, select')) return;
    mouseButtons |= 1 << event.button;
    for (const listener of pressListeners) listener(event.button);
  };
  const mouseup = (event: MouseEvent) => {
    mouseButtons &= ~(1 << event.button);
  };
  const release = () => {
    held.clear();
    mouseButtons = 0;
  };
  const noMenu = (event: Event) => event.preventDefault();

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('pointermove', pointermove);
  window.addEventListener('mousedown', mousedown);
  window.addEventListener('mouseup', mouseup);
  window.addEventListener('blur', release);
  window.addEventListener('contextmenu', noMenu);

  return {
    pointer: () => pointer,
    command(origin) {
      return {
        move: moveFromKeys(held),
        aim: Math.atan2(pointer.y - origin.y, pointer.x - origin.x),
        aimDistance: Math.hypot(pointer.x - origin.x, pointer.y - origin.y),
        buttons:
          (mouseButtons & LEFT_BUTTON ? Button.fire : 0) |
          (mouseButtons & RIGHT_BUTTON || held.has(THROW_KEY) ? Button.throw : 0) |
          (held.has(RELOAD_KEY) ? Button.reload : 0),
      };
    },
    onPress(listener) {
      pressListeners.push(listener);
    },
    dispose() {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('pointermove', pointermove);
      window.removeEventListener('mousedown', mousedown);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('blur', release);
      window.removeEventListener('contextmenu', noMenu);
    },
  };
}
