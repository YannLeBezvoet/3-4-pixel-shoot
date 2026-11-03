# Add a theme

A theme is a folder of files: no code. This guide covers what themes contain: factions, characters, weapons, projectiles, effects, sprites, texts and maps (made in Tiled: see [create a map](create-a-map.md)). Sounds arrive with the audio milestone.

**Format changes during development (Q56).** The theme format stays version `1` throughout the 0.x versions, even when files or fields are added. The themes in this repository are updated in the same change, and this guide always describes the current format.

Two themes are there to copy from: `themes/example/` is the smallest complete theme (two factions, one rifle shared by both, one arena map, Q60); `themes/vietnam/` is the full one. The example theme was added without any change outside its folder: a theme needs no code.

## 1. Create the folder

```
themes/<id>/
├── theme.json         # the manifest
├── characters.json    # who fights
├── weapons.json       # what they fight with
├── projectiles.json   # what weapons fire
├── effects.json       # visual effects (optional)
├── maps/<name>.tmj    # maps (Tiled), each listed automatically
├── tilesets/<name>.tsj · .png
├── locales/
│   ├── en.json        # every text of the theme in its default language
│   └── fr.json        # the same texts in other languages
└── sprites/
    ├── characters/<name>.aseprite · .png · .json
    ├── weapons/<name>.aseprite · .png · .json
    ├── projectiles/<name>.aseprite · .png · .json
    └── effects/<name>.aseprite · .png · .json
```

Sub-folders of `sprites/` are only a convention: a sprite is referenced by its path.

`<id>` uses lowercase letters, digits and hyphens (`ww2-normandy`). It must be the same in the folder name and in `theme.json`.

File names are fixed. Each JSON file starts with a `$schema` line: VS Code then completes field names and underlines mistakes as you type.

## 2. `theme.json`

```json
{
  "$schema": "../../schemas/theme.schema.json",
  "formatVersion": 1,
  "id": "vietnam",
  "nameKey": "theme.name",
  "defaultLanguage": "en",
  "factions": [
    { "id": "us-army", "nameKey": "faction.us-army" },
    { "id": "pavn", "nameKey": "faction.pavn" }
  ]
}
```

| Field | Meaning |
|---|---|
| `formatVersion` | Always `1` for now. The game refuses versions it does not know. |
| `nameKey` | Translation key of the theme name (see §5). |
| `defaultLanguage` | The language whose translation file must contain every text. |
| `factions` | The sides. Team 1 plays the first faction, team 2 the second. Each faction needs at least one character. |

## 3. `characters.json`

```json
{
  "$schema": "../../schemas/characters.schema.json",
  "characters": [
    {
      "id": "us-rifleman",
      "nameKey": "character.us-rifleman",
      "faction": "us-army",
      "sprite": "sprites/characters/us-rifleman",
      "weapon": "m16a1",
      "effects": { "hit": "blood-splat" }
    }
  ]
}
```

- `sprite` is a path inside the theme folder **without extension**: the game reads `<path>.png` and `<path>.json`, exported from Aseprite. A character sprite needs the animations `idle`, `walk` and `death` in the 5 drawn directions and a `hand` slice ([create a sprite](create-a-sprite.md)).
- `weapon` is the id of the character's default weapon in `weapons.json`.
- Optional gameplay values (Q54), with their defaults:

  | Field | Type | Default | Meaning |
  |---|---|---|---|
  | `speed` | number > 0, ≤ 1000 | `180` | Top speed in pixels per second (one tile is 48 pixels) |
  | `radius` | 4 to 23 | `10` | Radius of the collision circle around the feet, in pixels; also the target for bullets. At most 23, so the character fits through a one-tile gap |
  | `hitPoints` | whole number ≥ 1 | `100` | Hit points at the start of each life |

- `effects.hit` (optional): the effect shown where a bullet hits this character (an id from `effects.json`).
- How high and how far ahead the character holds its weapon is measured on the sprite: the `hand` slice of the first `idle.side` frame, compared to the ground point. Bullets fly at that height.

## 4. `weapons.json`

```json
{
  "$schema": "../../schemas/weapons.schema.json",
  "weapons": [
    {
      "id": "m16a1",
      "nameKey": "weapon.m16a1.name",
      "behavior": "firearm",
      "params": {
        "fireMode": "auto",
        "roundsPerMinute": 750,
        "damage": 28,
        "spreadDeg": 3,
        "magazine": 20,
        "reloadMs": 2200
      },
      "sprite": "sprites/weapons/m16a1",
      "projectile": "rifle-bullet",
      "effects": { "fire": "muzzle-flash" },
      "sounds": { "fire": "m16a1-fire", "reload": "rifle-reload" }
    }
  ]
}
```

- `behavior` picks how the weapon works. It is engine code; the theme only chooses it and sets `params`. The [behavior reference](../reference/behaviors.md), generated from the engine, lists every behavior and parameter. Behaviors available today:

  **`firearm`**: a gun firing projectiles from a magazine.

  | Parameter | Type | Default | Meaning |
  |---|---|---|---|
  | `fireMode` | `"auto"` or `"semi"` | — | `auto` fires while the button is held; `semi` once per click |
  | `roundsPerMinute` | number > 0, ≤ 3000 | — | Maximum rate of fire |
  | `damage` | whole number > 0 | — | Hit points removed by one projectile (characters have 100) |
  | `spreadDeg` | 0 to 45 | `0` | Random deviation of each shot, in degrees on each side of the aim |
  | `magazine` | whole number ≥ 1 | — | Rounds per magazine |
  | `reloadMs` | whole number ≥ 0 | — | Reload time in milliseconds |
  | `reserveMagazines` | whole number or `null` | `null` | Spare magazines per life; `null` = unlimited. A reload uses one, and the rounds left in the old magazine are lost |

  Reloading starts with the reload key, or by itself when the magazine is empty.

- `sprite`: the weapon drawn **pointing right**, with `grip` and `muzzle` slices. Shots start at the hand plus the distance from `grip` to `muzzle`.
- `projectile`: the id of what the weapon fires, in `projectiles.json`.
- `effects.fire` (optional): the effect shown at the muzzle at each shot.
- `sounds`: reserved for the audio milestone. Names are kept but nothing plays yet.

## 4b. `projectiles.json`

```json
{
  "$schema": "../../schemas/projectiles.schema.json",
  "projectiles": [
    {
      "id": "rifle-bullet",
      "behavior": "bullet",
      "params": { "speed": 1500, "range": 900 },
      "sprite": "sprites/projectiles/rifle-bullet",
      "effects": { "impact": "bullet-impact" }
    }
  ]
}
```

- `behavior` picks how the projectile flies. Behaviors available today:

  **`bullet`**: flies straight at gun height until it hits a character, a solid obstacle, or reaches its range. It never goes through a wall, whatever its speed. It never hits its shooter; it goes through teammates unless friendly fire is on.

  | Parameter | Type | Default | Meaning |
  |---|---|---|---|
  | `speed` | number > 0, ≤ 6000 | — | Speed in pixels per second |
  | `range` | number > 0, ≤ 5000 | — | Distance from the muzzle, in pixels, after which the bullet disappears |

- `sprite`: drawn **pointing right**, with a `fly` animation and an `origin` slice at the projectile's position ([create a sprite](create-a-sprite.md)).
- `effects.impact` (optional): the effect shown where the projectile stops against an obstacle.

## 4c. `effects.json`

```json
{
  "$schema": "../../schemas/effects.schema.json",
  "effects": [
    { "id": "muzzle-flash", "sprite": "sprites/effects/muzzle-flash" },
    { "id": "blood-splat", "sprite": "sprites/effects/blood-splat" }
  ]
}
```

Each effect is a sprite with a `play` animation, placed at its `origin` slice where the effect happens. Effects are only visual. Characters (`effects.hit`), weapons (`effects.fire`) and projectiles (`effects.impact`) refer to them by id. The file is optional when nothing refers to an effect.

## 5. Texts (`locales/`)

Every displayed text is a **key** in the JSON files above, translated in `locales/<language>.json`. Keys are dot-separated paths in nested objects:

```json
{
  "theme": { "name": "Vietnam War" },
  "faction": { "us-army": "US Army", "pavn": "PAVN & Viet Cong" },
  "weapon": { "m16a1": { "name": "M16A1" } }
}
```

- The **default language** file must contain every key used by the theme: a missing key is an error.
- Every other language of the game should have its own file. A missing file or key is only a warning: the default-language text is shown instead.

## 6. Check the theme

```
npm run validate:themes
```

The command loads the theme exactly as the game does and lists every problem with the file, the place in the file and what to do. For example:

```
error: themes/vietnam/characters.json › characters[0] ("us-rifleman").weapon
  Unknown weapon "m61". Known weapons (weapons.json): m16a1, ak47.
✗ vietnam: 1 error
```

Fix the errors; warnings can wait.

While the game runs in development (`npm run dev`), saving a theme file updates the game within a moment, without reloading the page. If the file is broken, the same messages appear in a panel at the bottom of the screen and the game keeps the last valid version until you fix it.
