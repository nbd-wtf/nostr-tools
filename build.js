const fs = require('node:fs')
const esbuild = require('esbuild')
const { join } = require('path')

const entryPoints = fs
  .readdirSync(process.cwd())
  .filter(
    file =>
      file.endsWith('.ts') &&
      file !== 'core.ts' &&
      file !== 'test-helpers.ts' &&
      file !== 'helpers.ts' &&
      file !== 'benchmarks.ts' &&
      !file.endsWith('.test.ts') &&
      fs.statSync(join(process.cwd(), file)).isFile(),
  )

let common = {
  entryPoints,
  bundle: true,
  sourcemap: 'external',
  platform: 'neutral', // Use neutral platform to avoid Node.js specifics
  mainFields: ['browser', 'module', 'main'], // Prioritize browser-compatible versions
}

esbuild
  .build({
    ...common,
    outdir: 'lib/esm',
    format: 'esm',
    packages: 'external',
  })
  .then(() => console.log('esm build success.'))

esbuild
  .build({
    ...common,
    outdir: 'lib/cjs',
    format: 'cjs',
    packages: 'external',
  })
  .then(() => {
    const packageJson = JSON.stringify({ type: 'commonjs' })
    fs.writeFileSync(`${__dirname}/lib/cjs/package.json`, packageJson, 'utf8')
    console.log('cjs build success.')
  })

esbuild
  .build({
    ...common,
    entryPoints: ['index.ts'],
    outfile: 'lib/nostr.bundle.js',
    format: 'iife',
    globalName: 'NostrTools',
    packages: 'external',
  })
  .then(() => console.log('bundle build success.'))
