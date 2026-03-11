import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const files = ['.source/atelier.ts', '.source/score.ts', '.source/atlas.ts'];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.None
    },
    fileName: file
  });
}

console.log('TypeScript sources parsed successfully');
