// The Tiled project file (tools/tiled/pixel-shoot.tiled-project), generated from the map
// property definitions of the content package (decision 0008): opening it in Tiled gives
// typed properties with defaults and the layer and object classes the game understands.
import type { PropertyDefinition } from '@pixel-shoot/content';
import {
  GAMEPLAY_OBJECT_CLASSES,
  LAYER_CLASSES,
  MAP_PROPERTIES,
  TILE_PROPERTIES,
} from '@pixel-shoot/content';

export const TILED_PROJECT_FILE = 'tools/tiled/pixel-shoot.tiled-project';

type UseAs = 'map' | 'layer' | 'object' | 'tile';

const members = (definitions: Record<string, PropertyDefinition>) =>
  Object.entries(definitions).map(([name, d]) => ({ name, type: d.type, value: d.default }));

export function renderTiledProject(): string {
  const classes: { name: string; useAs: UseAs[]; color: string; members: object[] }[] = [
    { name: 'map', useAs: ['map'], color: '#ff4d9be6', members: members(MAP_PROPERTIES) },
    { name: 'tile', useAs: ['tile', 'object'], color: '#ffe83b3b', members: members(TILE_PROPERTIES) },
    ...Object.keys(LAYER_CLASSES).map((name) => ({
      name,
      useAs: ['layer'] as UseAs[],
      color: '#ff1ebc73',
      members: [],
    })),
    ...Object.entries(GAMEPLAY_OBJECT_CLASSES).map(([name, definitions]) => ({
      name,
      useAs: ['object'] as UseAs[],
      color: '#fff9c22b',
      members: members(definitions),
    })),
  ];
  const project = {
    automappingRulesFile: '',
    commands: [],
    compatibilityVersion: 1100,
    extensionsPath: 'extensions',
    folders: ['../../themes'],
    properties: [],
    propertyTypes: classes.map((c, index) => ({
      id: index + 1,
      type: 'class',
      name: c.name,
      useAs: c.useAs,
      color: c.color,
      drawFill: true,
      members: c.members,
    })),
  };
  return `${JSON.stringify(project, null, 4)}\n`;
}
