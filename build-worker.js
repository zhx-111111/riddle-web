// build-worker.js — esbuild bundle for Cloudflare Workers
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const entryPoint = path.join(__dirname, 'src/worker/index.ts');
const outFile = path.join(__dirname, 'dist-worker/bundle.js');
const sourcemapFile = path.join(__dirname, 'dist-worker/bundle.js.map');

// Ensure output dir exists
fs.mkdirSync(path.dirname(outFile), { recursive: true });

esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: outFile,
  format: 'iife',        // ← IIFE: self-executing, no `export` keyword
  target: 'es2022',
  platform: 'neutral',
  conditions: ['worker', 'browser'],
  minify: false,
  sourcemap: true,
  globalName: 'RiddleWorker',  // exposed global if needed
  logLevel: 'info',
}).then(() => {
  // Verify the bundle was created and is non-empty
  const stat = fs.statSync(outFile);
  if (stat.size < 1000) {
    console.error('❌ Build output too small (' + stat.size + ' bytes) — likely failed');
    process.exit(1);
  }
  console.log('✅ Build OK — bundle size: ' + (stat.size / 1024).toFixed(1) + ' KB');

  // Read the bundle and strip any leftover `export {}` or ESM-only syntax
  let code = fs.readFileSync(outFile, 'utf8');
  
  // Remove trailing `export { ... }` statements (IIFE shouldn't have them, but just in case)
  code = code.replace(/export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  
  // Check for any remaining `import` or `export` keywords
  const importMatch = code.match(/^\s*import\s+/m);
  const exportMatch = code.match(/^\s*export\s+/m);
  
  if (importMatch || exportMatch) {
    console.error('❌ Bundle still contains ESM syntax:');
    if (importMatch) console.error('   Found: import statement');
    if (exportMatch) console.error('   Found: export statement');
    process.exit(1);
  }

  // Write the cleaned bundle back
  fs.writeFileSync(outFile, code);

  // Quick syntax check by wrapping in a function
  try {
    new Function(code);
    console.log('✅ Bundle syntax check passed');
  } catch (e) {
    console.error('❌ Bundle syntax error:', e.message);
    // Show the problematic area
    const lines = code.split('\n');
    console.error('   Bundle has ' + lines.length + ' lines');
    process.exit(1);
  }

  // Verify sourcemap exists
  if (fs.existsSync(sourcemapFile)) {
    const sm = fs.statSync(sourcemapFile);
    console.log('✅ Sourcemap: ' + (sm.size / 1024).toFixed(1) + ' KB');
  }
}).catch(err => {
  console.error('❌ esbuild build failed:', err.message);
  if (err.errors) {
    for (const e of err.errors) {
      console.error('  → ' + e.text + (e.location ? ' (' + e.location.file + ':' + e.location.line + ')' : ''));
    }
  }
  process.exit(1);
});
