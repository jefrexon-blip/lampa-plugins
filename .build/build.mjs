import { build } from 'esbuild';

const entries = [
  { input: '.source/atelier.ts', output: 'atelier.js' },
  { input: '.source/score.ts', output: 'score.js' },
  { input: '.source/atlas.ts', output: 'atlas.js' }
];

for (const entry of entries) {
  await build({
    entryPoints: [entry.input],
    outfile: entry.output,
    bundle: false,
    minify: false,
    format: 'iife',
    target: ['es5'],
    charset: 'utf8',
    logLevel: 'info'
  });
}
