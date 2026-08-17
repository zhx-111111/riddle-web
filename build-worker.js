// build-worker.js — esbuild bundle for Cloudflare Workers
const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/worker/index.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist-worker/bundle.js'),
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  conditions: ['worker', 'browser'],
  minify: false,
  sourcemap: true,
  logLevel: 'info',
}).catch(() => process.exit(1));
