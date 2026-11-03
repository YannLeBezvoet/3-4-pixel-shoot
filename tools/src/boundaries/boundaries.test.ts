// Proves that the module boundary rules of docs/ARCHITECTURE.md §4 actually bite:
// the compiler settings of platform-agnostic packages reject platform globals, and
// the lint rules reject forbidden imports.
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fromRoot, repoRoot } from '../paths';

const run = promisify(execFile);
const tscBin = fromRoot('node_modules', 'typescript', 'bin', 'tsc');

async function typecheckWithAgnosticSettings(dir: string, source: string) {
  await writeFile(path.join(dir, 'probe.ts'), source);
  await writeFile(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify({
      extends: fromRoot('tsconfig', 'agnostic.json'),
      compilerOptions: {
        composite: false,
        declaration: false,
        emitDeclarationOnly: false,
        noEmit: true,
      },
      files: ['probe.ts'],
    }),
  );
  try {
    await run(process.execPath, [tscBin, '-p', path.join(dir, 'tsconfig.json')]);
    return { ok: true, output: '' };
  } catch (error) {
    return { ok: false, output: String((error as { stdout?: string }).stdout ?? error) };
  }
}

describe('platform-agnostic compiler settings', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'pixel-shoot-boundaries-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('are used by every package under packages/', async () => {
    for (const name of await readdir(fromRoot('packages'))) {
      const config = JSON.parse(
        await readFile(fromRoot('packages', name, 'tsconfig.json'), 'utf8'),
      );
      expect(config.extends, `packages/${name}/tsconfig.json`).toBe('../../tsconfig/agnostic.json');
    }
  });

  it('accept plain code', async () => {
    const result = await typecheckWithAgnosticSettings(dir, 'export const n: number = 1;\n');
    expect(result).toEqual({ ok: true, output: '' });
  }, 60_000);

  it('reject DOM and Node globals', async () => {
    const result = await typecheckWithAgnosticSettings(
      dir,
      'export const a = window.innerWidth;\nexport const b = process.env;\n',
    );
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Cannot find name 'window'");
    expect(result.output).toContain("Cannot find name 'process'");
  }, 60_000);
});

describe('import lint rules', () => {
  const eslint = new ESLint({ cwd: repoRoot });

  async function restrictedImports(file: string, code: string) {
    const [result] = await eslint.lintText(code, { filePath: fromRoot(file) });
    return (result?.messages ?? [])
      .filter((message) => message.ruleId === 'no-restricted-imports')
      .map((message) => message.message);
  }

  it('reject presentation and Node libraries in platform-agnostic packages', async () => {
    const messages = await restrictedImports(
      'packages/sim/src/probe.ts',
      "import { Sprite } from 'pixi.js';\nimport fs from 'node:fs';\nexport const x = [Sprite, fs];\n",
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('@pixel-shoot/sim is platform-agnostic');
  });

  it('reject undeclared project packages and deep imports', async () => {
    const messages = await restrictedImports(
      'packages/sim/src/probe.ts',
      "import { a } from '@pixel-shoot/content';\nimport { b } from '@pixel-shoot/shared/src/rng';\nexport const x = [a, b];\n",
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('@pixel-shoot/sim may not depend on @pixel-shoot/content');
    expect(messages[1]).toContain('public entry point');
  });

  it('let tests of platform-agnostic packages read fixtures with Node, but not use presentation libraries', async () => {
    const messages = await restrictedImports(
      'packages/sim/src/probe.test.ts',
      "import fs from 'node:fs';\nimport { Sprite } from 'pixi.js';\nexport const x = [fs, Sprite];\n",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("'pixi.js'");
  });

  it('let tests, and only tests, use the packages declared as devDependencies', async () => {
    const source =
      "import { createMatchHost } from '@pixel-shoot/match';\nexport const x = createMatchHost;\n";
    expect(await restrictedImports('packages/modes/src/probe.test.ts', source)).toEqual([]);
    const messages = await restrictedImports('packages/modes/src/probe.ts', source);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('@pixel-shoot/modes may not depend on @pixel-shoot/match');
  });

  it('allow declared dependencies', async () => {
    const messages = await restrictedImports(
      'packages/sim/src/probe.ts',
      "import { a } from '@pixel-shoot/shared';\nexport const x = a;\n",
    );
    expect(messages).toEqual([]);
  });

  it('reject literal displayed text in interface components', async () => {
    const [result] = await eslint.lintText(
      'export const A = () => <button title="Close" class="menu">Play</button>;\nexport const B = (p: { t: (k: string) => string }) => <button class="menu">{p.t(\'menu.play\')}</button>;\n',
      { filePath: fromRoot('apps/client/src/ui/probe.tsx') },
    );
    const literal = (result?.messages ?? []).filter(
      (m) => m.ruleId === 'pixel-shoot/no-literal-ui-text',
    );
    expect(literal.map((m) => m.line)).toEqual([1, 1]);
    expect(literal[0]?.message).toContain('translation key');
  });

  it('keep PixiJS inside the client render folder', async () => {
    const code = "import { Sprite } from 'pixi.js';\nexport const x = Sprite;\n";
    expect(await restrictedImports('apps/client/src/ui/probe.ts', code)).toHaveLength(1);
    expect(await restrictedImports('apps/client/src/render/probe.ts', code)).toEqual([]);
  });
});
