import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Some tool tests generate every placeholder or play whole rounds: several seconds on a
    // CI runner under coverage, more than Vitest's 5-second default.
    testTimeout: 30_000,
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.{ts,tsx}',
      'apps/client/vite/**/*.test.ts',
      'tools/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'html'],
      // C1.11: at least 80 % of the lines of the game-logic packages run in tests.
      thresholds: Object.fromEntries(
        ['sim', 'content', 'match', 'modes', 'bots'].map((name) => [
          `packages/${name}/src/**`,
          { lines: 80 },
        ]),
      ),
    },
  },
});
