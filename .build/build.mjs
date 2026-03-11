import { build } from 'esbuild';

const entries = [
  { input: '.source/interface_mod.ts', output: 'interface_mod.js' },
  { input: '.source/rating.ts', output: 'rating.js' }
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
