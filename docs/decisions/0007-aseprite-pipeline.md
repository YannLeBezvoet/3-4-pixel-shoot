# 0007. Aseprite export pipeline and conventions

- Status: Accepted (2026-11-03)
- Date: 2026-11-03

## Context

The owner draws sprites in Aseprite. Animations are exported as a PNG sheet + JSON (one tag = one animation) and loaded automatically. We need conventions for tag names, the 5 drawn directions, and the weapon attachment point. `.aseprite` sources are versioned. Placeholder sprites must be replaceable with no code change. Changes must appear in game without restart during development.

## Options considered

### Attachment points

- **Numbers in a JSON config** (hand offsets per direction and frame). Tedious, out of sync with the art as soon as a frame changes.
- **A marker pixel of a reserved color** on a hidden layer. Works, but needs custom parsing of images and conflicts with the palette check.
- **Aseprite slices with pivots.** Native Aseprite feature, exported in the JSON (`meta.slices`), can be keyed per frame, editable visually.

### Export

- **Manual export from Aseprite** (File › Export Sprite Sheet; Aseprite remembers settings per file). Works without scripting.
- **Aseprite command line** (`aseprite -b … --sheet … --data … --list-tags --list-slices`). Reproducible; requires Aseprite installed, which CI and contributors may not have.

### What to commit

- **Sources only**, exports built at install time: requires Aseprite (a paid tool) for every build.
- **Sources and exports.** Builds and CI work without Aseprite; exports may lag behind sources if someone forgets to export.

## Decision

- **Slices with pivots** for attachment points: `hand` (character files), `grip` and `muzzle` (weapon files, drawn pointing right), optional `origin` (default: bottom-center pixel of the frame).
- **Tag names:** `<action>.<direction>` or `<action>`; directions `down`, `down-side`, `side`, `up-side`, `up`; side directions drawn facing right, mirrored at runtime. Required actions per entity kind are defined by the engine and checked by the validator.
- **Frames** are 48×48 or multiples of 48 per side; untrimmed (constant frame size keeps origins stable).
- **Export format:** JSON *array* with tags and slices, PNG sheet next to the source, same base name. Frame durations and tag direction come from Aseprite.
- **Both supported:** manual export, and `npm run sprites:export` using the Aseprite CLI when `ASEPRITE_PATH` is set (in watch mode during development if the owner prefers saving `.aseprite` only).
- **Commit sources and exports.** Placeholders are generated directly in the export format with the same names, tags and slices.
- A Lua script for Aseprite creates a new, correctly configured character file (size, palette, tags, slices).

## Consequences

- Swapping a placeholder = dropping in a new PNG + JSON (and the `.aseprite` source) with the same base name.
- The validator reports missing tags, directions or slices with the file name and the list of expected names.
- If exports lag behind sources, nothing breaks; the sprite simply shows the last export. An optional check (when Aseprite is installed) can detect stale exports.
