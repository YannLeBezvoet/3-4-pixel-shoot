# Add a theme

A theme is a folder of files: no code. This guide covers what themes contain today (milestone 0): factions, characters, weapons, sprites and texts. Maps, projectiles, effects and sounds are added by later milestones and will be documented here when they exist.

The Vietnam theme (`themes/vietnam/`) is a complete example to copy from.

## 1. Create the folder

```
themes/<id>/
├── theme.json         # the manifest
├── characters.json    # who fights
├── weapons.json       # what they fight with
├── locales/
│   ├── en.json        # every text of the theme in its default language
│   └── fr.json        # the same texts in other languages
└── sprites/
    ├── characters/<name>.aseprite · .png · .json
    └── weapons/<name>.aseprite · .png · .json
```

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
      "weapon": "m16a1"
    }
  ]
}
```

- `sprite` is a path inside the theme folder **without extension**: the game reads `<path>.png` and `<path>.json`, exported from Aseprite. A character sprite needs the animations `idle`, `walk` and `death` in the 5 drawn directions and a `hand` slice (`docs/guides/create-a-sprite.md`).
- `weapon` is the id of the character's default weapon in `weapons.json`.

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
      "sounds": { "fire": "m16a1-fire", "reload": "rifle-reload" }
    }
  ]
}
```

- `behavior` picks how the weapon works. It is engine code; the theme only chooses it and sets `params`. Behaviors available today:

  **`firearm`**: a gun firing projectiles from a magazine.

  | Parameter | Type | Default | Meaning |
  |---|---|---|---|
  | `fireMode` | `"auto"` or `"semi"` | — | `auto` fires while the button is held; `semi` once per click |
  | `roundsPerMinute` | number > 0, ≤ 3000 | — | Maximum rate of fire |
  | `damage` | whole number > 0 | — | Hit points removed by one projectile (characters have 100) |
  | `spreadDeg` | 0 to 45 | `0` | Random deviation of each shot, in degrees on each side of the aim |
  | `magazine` | whole number ≥ 1 | — | Rounds per magazine |
  | `reloadMs` | whole number ≥ 0 | — | Reload time in milliseconds |
  | `reserveMagazines` | whole number or `null` | `null` | Spare magazines per life; `null` = unlimited |

- `sprite`: the weapon drawn **pointing right**, with `grip` and `muzzle` slices.
- `sounds`: reserved for the audio milestone. Names are kept but nothing plays yet.

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
