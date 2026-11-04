# 0006. Themes as validated data; behaviors as engine code

- Status: Accepted (2026-11-03)
- Date: 2026-11-03

## Context

Adding a theme must require no code: a folder of resources and configuration files, checked at load with clear error messages. Behaviors (weapon and projectile types) are engine code; a theme picks among them and sets their parameters. Map elements are not behaviors: their properties are set in Tiled (M2). Any theme combines with any mode. The owner edits these files by hand.

## Options considered

### Configuration format

- **JSON.** Universal, parsed everywhere with no dependency; editors offer autocompletion and inline errors when a JSON Schema is attached. No comments.
- **YAML.** Comments, lighter syntax; but indentation-sensitive, with surprising implicit types (`no` → `false`), and needs a parser.
- **JSON5 / JSONC.** Comments and trailing commas; less universal editor support for schemas.
- **TypeScript config files.** Powerful, but that is code, which contradicts "no code to add a theme".

### Validation

- **JSON Schema + Ajv.** Standard, but writing schemas by hand duplicates the TypeScript types.
- **Zod.** Schemas written once in TypeScript give both runtime validation and static types; JSON Schema can be generated from them for editor support; error paths are precise.

## Decision

- Theme configuration in **JSON**. Each file starts with a `$schema` reference to a **JSON Schema generated from our Zod schemas** (`npm run schemas`), so VS Code autocompletes and flags errors while editing.
- **Zod** validates everything at load time. Validation collects all errors and prints them with file, JSON path and a hint (known ids, expected values).
- **Behavior registry** in `sim`: each behavior registers an id and its own parameter schema; theme entries name a behavior and give parameters validated by that schema. A reference page listing every behavior and its parameters is **generated from the schemas** and checked in CI, so it never goes stale.
- Theme layout and file split as in [ARCHITECTURE §8](../ARCHITECTURE.md). Each theme declares a `formatVersion`; the loader refuses unknown versions with a clear message, and future format changes come with a migration note.
- Gameplay properties of map elements live in Tiled ([0008](0008-tiled-maps.md)) and are validated against the same behavior schemas.

## Consequences

- No comments in JSON: explanations go in the generated reference and the guides; a `"$comment"` field is allowed where useful.
- Engine changes to a behavior's parameters are breaking changes for themes; they bump the format version and are listed in `CHANGELOG.md`.
- Validation runs in three places (browser dev overlay, server startup, CI) from the same code.
