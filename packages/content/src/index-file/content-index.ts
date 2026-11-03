// What content exists. The client cannot list folders over HTTP, so the development server
// (and the production build) publishes this index as /content-index.json.
import { z } from 'zod';

export const CONTENT_INDEX_FILE = 'content-index.json';

export const contentIndexSchema = z.strictObject({
  /** Interface languages: one per file in locales/. */
  languages: z.array(z.string()),
  themes: z.array(
    z.strictObject({
      id: z.string(),
      /** Every sprite sheet of the theme (JSON files under sprites/), as asset paths without extension. */
      sprites: z.array(z.string()),
    }),
  ),
});

export type ContentIndex = z.infer<typeof contentIndexSchema>;
