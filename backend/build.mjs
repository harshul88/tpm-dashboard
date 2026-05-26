import * as esbuild from 'esbuild';
import { readdirSync } from 'node:fs';

const handlers = readdirSync('.', { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.endsWith('-handler'))
  .map((d) => `${d.name}/index.ts`);

const result = await esbuild.build({
  entryPoints: handlers,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  format: 'cjs',
  sourcemap: true,
  // AWS SDK v3 is provided by the Lambda runtime — keep it external
  external: ['@aws-sdk/*'],
});

if (result.errors.length > 0) {
  console.error('Build failed with errors');
  process.exit(1);
}

console.log(`Built ${handlers.length} Lambda handlers → dist/`);
for (const h of handlers) {
  console.log(`  ${h}`);
}
