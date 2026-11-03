// JSON Schemas generated from the Zod schemas, so editors autocomplete and check theme files.
import type { BehaviorRegistry } from '@pixel-shoot/sim';
import { z } from 'zod';
import {
  charactersFileSchema,
  effectsFileSchema,
  projectilesEditorSchema,
  themeManifestSchema,
  weaponsEditorSchema,
} from '../theme/schemas';

function toJsonSchema(schema: z.ZodType, title: string): Record<string, unknown> {
  return { ...z.toJSONSchema(schema, { io: 'input', target: 'draft-2020-12' }), title };
}

/** File name in schemas/ → JSON Schema. */
export function buildJsonSchemas(behaviors: BehaviorRegistry): Record<string, Record<string, unknown>> {
  return {
    'theme.schema.json': toJsonSchema(themeManifestSchema, 'Theme manifest (theme.json)'),
    'characters.schema.json': toJsonSchema(charactersFileSchema, 'Theme characters (characters.json)'),
    'weapons.schema.json': toJsonSchema(weaponsEditorSchema(behaviors), 'Theme weapons (weapons.json)'),
    'projectiles.schema.json': toJsonSchema(
      projectilesEditorSchema(behaviors),
      'Theme projectiles (projectiles.json)',
    ),
    'effects.schema.json': toJsonSchema(effectsFileSchema, 'Theme effects (effects.json)'),
  };
}
