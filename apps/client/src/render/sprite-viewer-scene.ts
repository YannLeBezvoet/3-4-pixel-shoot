// Scene of the sprite viewer dev page: a live character that aims at the pointer, and the
// 8 directions side by side (the 3 left-facing ones are mirrored copies).
import type { Octant } from '@pixel-shoot/shared';
import { octantAngle, vec2 } from '@pixel-shoot/shared';
import { Container, Graphics } from 'pixi.js';
import type { LoadedSheet } from '../content/content-store';
import type { CharacterLook } from './character-view';
import { CharacterView, SheetView } from './character-view';
import type { SheetTextures } from './sheet-textures';

export type ViewerSelection =
  | { readonly kind: 'none' }
  | { readonly kind: 'character'; readonly look: CharacterLook; readonly action: string }
  | {
      readonly kind: 'sheet';
      readonly key: string;
      readonly loaded: LoadedSheet;
      readonly tag: string | undefined;
    };

/** Positions in game pixels, shared with the page that labels them. */
export const VIEWER_LAYOUT = {
  live: { x: 640, y: 190 },
  row: { y: 380, x0: 380, step: 72 },
} as const;
export const ROW_OCTANTS: readonly Octant[] = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];

const MARKER = 0x9babb2;

export interface SpriteViewerScene {
  readonly root: Container;
  select(selection: ViewerSelection): void;
  /** Pointer position in game pixels: the live character aims at it. */
  setPointer(point: { x: number; y: number }): void;
  update(deltaMs: number): void;
  /** What the live view shows, for display. */
  info(): { tag: string; frame: number };
}

function groundMarker(x: number, y: number): Graphics {
  return new Graphics()
    .rect(x - 6, y, 13, 1)
    .rect(x, y - 3, 1, 7)
    .fill(MARKER);
}

export function createSpriteViewerScene(textures: SheetTextures): SpriteViewerScene {
  const root = new Container();
  const { live, row } = VIEWER_LAYOUT;
  root.addChild(groundMarker(live.x, live.y));
  const liveCharacter = new CharacterView(textures);
  liveCharacter.root.position.set(live.x, live.y);
  const liveSheet = new SheetView(textures);
  liveSheet.root.position.set(live.x, live.y);
  const rowCharacters = ROW_OCTANTS.map((octant, i) => {
    const x = row.x0 + i * row.step;
    root.addChild(groundMarker(x, row.y));
    const view = new CharacterView(textures);
    view.root.position.set(x, row.y);
    view.setAim(octantAngle(octant));
    return view;
  });
  root.addChild(liveCharacter.root, liveSheet.root, ...rowCharacters.map((v) => v.root));

  let selection: ViewerSelection = { kind: 'none' };
  return {
    root,
    select(next) {
      selection = next;
      const isCharacter = next.kind === 'character';
      liveCharacter.root.visible = isCharacter;
      for (const view of rowCharacters) view.root.visible = isCharacter;
      liveSheet.root.visible = next.kind === 'sheet';
      if (next.kind === 'character') {
        for (const view of [liveCharacter, ...rowCharacters]) {
          view.setLook(next.look);
          view.setAction(next.action);
        }
      } else if (next.kind === 'sheet') {
        liveSheet.show(next.key, next.loaded, next.tag);
      }
    },
    setPointer(point) {
      liveCharacter.setAim(vec2.angleOf(vec2.sub(point, { x: live.x, y: live.y - 16 })));
    },
    update(deltaMs) {
      if (selection.kind === 'character')
        for (const view of [liveCharacter, ...rowCharacters]) view.update(deltaMs);
      if (selection.kind === 'sheet') liveSheet.update(deltaMs);
    },
    info() {
      return selection.kind === 'sheet'
        ? { tag: selection.tag ?? '', frame: liveSheet.frame }
        : { tag: liveCharacter.tag, frame: liveCharacter.frame };
    },
  };
}
