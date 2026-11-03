// Public entry point. Only what is exported here may be imported by other packages.
export { joinPath, memoryFileProvider } from './files/file-provider';
export { CONTENT_INDEX_FILE, contentIndexSchema } from './index-file/content-index';
export type { ContentIndex } from './index-file/content-index';
export type { FileProvider } from './files/file-provider';
export { IssueCollector, describeJsonPath, formatIssue, formatIssues } from './issues/issues';
export type { ContentIssue, Severity } from './issues/issues';
export { compareLocales, hasKey, interpolationVariables, parseLocale } from './locales/locale';
export type { Locale, LocaleComparison, LocaleMeta } from './locales/locale';
export { createPalette, parseGpl, toHex } from './palette/palette';
export type { Palette, PaletteColor } from './palette/palette';
export { buildJsonSchemas } from './schemas/json-schemas';
export {
  CHARACTER_SPRITE,
  DRAWN_DIRECTIONS,
  EFFECT_SPRITE,
  GRID,
  PROJECTILE_SPRITE,
  WEAPON_SPRITE,
  parseTagName,
  tagName,
  viewForOctant,
} from './sprites/conventions';
export type { DirectionView, DrawnDirection, SpriteRequirements } from './sprites/conventions';
export { animationFrameAt } from './sprites/animation';
export type { AnimationFrame } from './sprites/animation';
export {
  checkSpriteRequirements,
  originOf,
  parseSpriteSheet,
  playOrder,
  slicePoint,
} from './sprites/sprite-sheet';
export type {
  Playback,
  Rect,
  SliceKey,
  SpriteAnimation,
  SpriteFrame,
  SpriteSheet,
} from './sprites/sprite-sheet';
export { loadTheme, spriteFiles } from './theme/load-theme';
export type {
  LoadThemeOptions,
  LoadThemeResult,
  Theme,
  ThemeCharacter,
  ThemeEffect,
  ThemeProjectile,
  ThemeWeapon,
} from './theme/load-theme';
export { barrelLength, buildCatalog, handPosition } from './theme/catalog';
export { THEME_FORMAT_VERSION } from './theme/schemas';
export { MAX_MAP_SIZE, loadMap, mapFile, tiledMapSource } from './maps/load-map';
export type { LoadMapResult, MapSource, MapTheme } from './maps/load-map';
export {
  GAMEPLAY_OBJECT_CLASSES,
  LAYER_CLASSES,
  MAP_PROPERTIES,
  SPAWN_PROPERTIES,
  TILE_PROPERTIES,
} from './maps/properties';
export type { LayerClass, PropertyDefinition, PropertyType } from './maps/properties';
