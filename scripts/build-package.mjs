import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  absWorkingDir: root,
  entryPoints: ['src/react/AtlasFunnel.tsx'],
  outfile: 'dist/react/atlas-funnel.js',
  bundle: true,
  external: ['react', 'react/jsx-runtime'],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: false,
  sourcemap: true,
  banner: { js: "'use client';" },
});

const declarations = await mkdtemp(join(tmpdir(), 'funnel-types-'));
try {
  execFileSync(process.execPath, [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '--declaration', '--emitDeclarationOnly', '--noEmit', 'false', '--allowJs', 'true',
    '--outDir', declarations, '--rootDir', '.', '--jsx', 'react-jsx',
    '--moduleResolution', 'bundler', '--module', 'ESNext', '--target', 'ES2022', '--strict',
    'src/react/AtlasFunnel.tsx',
  ], { cwd: root, stdio: 'inherit' });
  const generated = await readFile(join(declarations, 'src/react/AtlasFunnel.d.ts'), 'utf8');
  await writeFile(resolve(root, 'dist/react/atlas-funnel.d.ts'), generated.replaceAll('../chart/model', './model'));
  for (const module of ['model', 'shared', 'continuous', 'vertical', 'branching']) {
    await copyFile(join(declarations, `src/chart/${module}.d.ts`), resolve(root, `dist/react/${module}.d.ts`));
  }
} finally {
  await rm(declarations, { recursive: true, force: true });
}
