import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
for (const [folder, module] of [['esm', 'ES2022'], ['cjs', 'CommonJS']]) {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'src/index.ts',
    '--target', 'ES2022', '--module', module, '--moduleResolution', 'node',
    '--strict', '--declaration', '--noEmitOnError', '--outDir', `dist/${folder}`], { stdio: 'inherit' });
  mkdirSync(`dist/${folder}`, { recursive: true });
  writeFileSync(`dist/${folder}/package.json`, JSON.stringify({ type: folder === 'esm' ? 'module' : 'commonjs' }));
}
