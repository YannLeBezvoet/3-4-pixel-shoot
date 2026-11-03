# Create a sprite

How to draw a sprite in Aseprite so the game loads it with no code: characters, weapons and effects. The placeholders in `themes/vietnam/sprites/` follow every rule below; open their JSON files to see real examples.

## 1. General rules

| Rule | Why |
|---|---|
| **Colors from Resurrect 64 only.** Load `palette/resurrect-64.gpl` (Palette menu › Load Palette). | `npm run check:palette` rejects any other color. |
| **Pixels fully opaque or fully transparent.** No partial opacity, no soft brushes. | Same check. Use dithering for soft effects. |
| **RGB color mode.** | In Indexed mode Aseprite treats palette index 0 as transparent, and index 0 is the darkest color (outlines). |
| **Frame size: 48×48, or multiples of 48** (96×96, 96×144…). All frames of a file have the same size. | The game grid is 48 px. |
| **One `.aseprite` file per visual entity**, saved in the theme: `themes/<theme>/sprites/<category>/<name>.aseprite`. | The export goes next to it with the same name. |

Names use lowercase letters, digits and hyphens: `us-rifleman.aseprite`.

## 2. Animations are tags

Each animation is an Aseprite **tag** (select frames › Frame › Tags › New Tag).

- A tag is named `<action>.<direction>` for an animation drawn per direction, or just `<action>` otherwise.
- Actions are lowercase words or hyphenated words: `idle`, `walk`, `death`, `throw-grenade`.
- **Directions drawn: `down`, `down-side`, `side`, `up-side`, `up`.** Draw `down-side`, `side` and `up-side` **facing right**: the game mirrors them for the three left-facing directions.

```
  up-side (mirrored)    up     up-side
  side (mirrored)     ·      side
  down-side (mirrored) down   down-side
```

- **Frame durations** come from Aseprite (Frame Properties). The tag's **Animation Direction** (forward, reverse, ping-pong) is respected.
- **Repeat**: an animation loops forever unless its tag has a repeat count (tag properties › Repeat, Aseprite 1.3+). Set `1` for animations that play once, such as `death`: the last frame then stays on screen.

## 3. Points: slices

Points the game needs are Aseprite **slices** (Slice tool, `C`) of 1×1 pixel. The game uses the slice's **pivot** if you set one, otherwise its center.

| Slice | In | Meaning |
|---|---|---|
| `hand` | characters | Where the weapon's grip attaches. |
| `grip` | weapons | The point the weapon rotates around, held in the hand. |
| `muzzle` | weapons | Where bullets and the muzzle flash start. |
| `origin` | optional, any sprite | The **ground point**: feet of a character, base of a tree, center of an explosion. Without it: the bottom-center pixel of the frame (24, 47 in a 48×48 frame). |

A slice can move from frame to frame (for example, the hand bobbing during `walk`): go to the frame and move the slice. Aseprite then stores a key for that frame, and the game follows it.

## 4. Characters

A character needs:
- the tags `idle`, `walk` and `death` in the 5 drawn directions (15 tags);
- a `hand` slice.

The weapon is a **separate sprite**: do not draw it on the character. The game draws it at the `hand` point, rotated to the exact aim, and **behind** the body when the character faces up (`up`, `up-side`), in front otherwise.

Quick start: the script `tools/aseprite/new-character.lua` creates a 48×48 file with the palette, all 15 tags with frame counts and durations, and the `hand` slice. In Aseprite: File › Scripts › Open Scripts Folder, copy the script there, then run it from File › Scripts.

## 5. Weapons

- Draw the weapon **pointing right**, roughly centered vertically in a 48×48 frame.
- Add the `grip` and `muzzle` slices.
- When the character aims left, the game flips the weapon vertically so it is never upside down.

## 6. Effects and other sprites

Effects (muzzle flash, blood, explosions, flames) use any tag names; the placeholders use a single `play` tag with a repeat count of 1. Set an `origin` slice where the effect attaches (the muzzle for a flash, the center for an explosion). Effects are wired into themes from milestone 1.

## 7. Export

The game reads a **PNG sheet + JSON data**, next to the `.aseprite` file, with the same name. Commit all three files.

**From Aseprite** (File › Export › Export Sprite Sheet). Aseprite remembers these settings per file:

| Tab | Setting |
|---|---|
| Layout | Sheet type: Packed (any type works) |
| Sprite | Layers: Visible layers · Frames: All frames |
| Borders | No padding, **Trim Sprite and Trim Cels unchecked** |
| Output | Output File: `<name>.png` · **JSON Data checked**: `<name>.json`, format **Array** (Hash also works) · Meta: **Tags** and **Slices** checked |

**From the command line**, for every `.aseprite` file at once:

```
ASEPRITE_PATH=/path/to/aseprite npm run sprites:export
ASEPRITE_PATH=/path/to/aseprite npm run sprites:export -- --watch   # re-export on every save
```

## 8. Check it

- `npm run dev`, then open **http://localhost:5173/dev/sprites**: every sprite of every theme, every animation, the 8 directions side by side, and the weapon following the mouse. Exporting again updates the page within a moment; a broken file shows its errors at the bottom of the screen.
- `npm run check:palette`: colors and transparency.
- `npm run validate:themes`: tags, directions, slices and frame sizes of the sprites the theme uses, with the exact problem and file.

## 9. Replacing a placeholder

Give your files the placeholder's name and folder (for example `themes/vietnam/sprites/characters/us-rifleman.png` and `.json`, plus your `.aseprite`). Nothing else changes. `npm run assets:report` lists the placeholders still in use; the placeholder generator never overwrites a file you replaced.
