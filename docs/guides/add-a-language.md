# Add a language

Adding a language means adding translation files. No code changes, unless the language uses characters the game font cannot draw (§5).

## 1. Create the interface file

Copy `locales/en.json` to `locales/<code>.json`, where `<code>` is the language code: `de`, `es`, `pt-BR`…

Set `_meta.name` to the language's **own** name, as players of that language write it. It is what the language menu shows:

```json
{
  "_meta": { "name": "Deutsch" },
  "settings": { "language": "Sprache" }
}
```

The new language appears in the menu as soon as the file exists, without reloading the page during development (`npm run dev`).

## 2. Translate the texts

- Translate the **values** only. Keys (`"settings"`, `"language"`) stay as they are.
- Keep every `{{variable}}` exactly as written: `"{{killer}} eliminated {{victim}}"` → `"{{killer}} a éliminé {{victim}}"`. The order may change.
- **Plurals** use suffixes on the key: `kills_one`, `kills_other`, and for some languages `kills_few`, `kills_many`… Each language uses its own set of forms (French: `one`, `many`, `other`; English: `one`, `other`). The list per language is in the [Unicode plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).
- A missing text falls back to English in the game, but the checks below report it.

## 3. Translate each theme

Every theme has its own texts in `themes/<theme>/locales/<code>.json` (same format, without `_meta`). Copy the theme's default-language file and translate it the same way.

## 4. Check

```
npm run check:i18n
npm run validate:themes
```

`check:i18n` reports, for the interface files:
- keys missing compared with English (errors);
- `{{variables}}` that differ from English (errors);
- keys that English does not have (warnings: probably misspelled);
- characters the font cannot draw, in interface and theme texts (errors).

`validate:themes` reports theme texts missing in the new language (warnings).

## 5. Characters and the font

The interface font (Press Start 2P, `apps/client/src/assets/fonts/`) covers Latin (accents included), Greek and Cyrillic. A language written with other characters (Chinese, Japanese, Arabic…) needs a font that covers them. That is the one case where adding a language needs more than files: tell the lead developer, who will add the font.
