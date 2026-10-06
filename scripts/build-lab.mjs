import { build, context } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedOptions = {
  absWorkingDir: root,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
};
const targets = [
  { entryPoints: ['src/lab/main.tsx'], outfile: 'dist/lab/lab.js' },
  { entryPoints: ['src/lab/dialkit.css'], outfile: 'dist/lab/dialkit.css' },
  { entryPoints: ['src/lab/prism-comparison/main.tsx'], outfile: 'dist/lab/prism-comparison/comparison.js' },
  { entryPoints: ['src/lab/prism-comparison/comparison.css'], outfile: 'dist/lab/prism-comparison/comparison.css' },
  { entryPoints: ['src/lab/particle-main.tsx'], outfile: 'dist/lab/vertical-particles/study.js' },
  { entryPoints: ['src/lab/idle-motion/main.tsx'], outfile: 'dist/lab/idle-motion/idle.js' },
];

export function buildLab() {
  return Promise.all(targets.map(target => build({ ...sharedOptions, ...target })));
}

export async function watchLab() {
  const builders = [];
  try {
    for (const target of targets) builders.push(await context({ ...sharedOptions, ...target }));
    await Promise.all(builders.map(builder => builder.rebuild()));
    await Promise.all(builders.map(builder => builder.watch()));
    return { dispose: () => Promise.all(builders.map(builder => builder.dispose())) };
  } catch (error) {
    await Promise.all(builders.map(builder => builder.dispose()));
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildLab();
}
