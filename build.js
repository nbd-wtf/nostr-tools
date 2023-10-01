#!/usr/bin/env node

const fs = require('fs')
const esbuild = require('esbuild')
const { join } = require('path');

const entryPoints = fs.readdirSync(process.cwd())
  .filter(
    (file) =>
      file.endsWith(".ts") && !file.endsWith("test.ts") &&
      fs.statSync(join(process.cwd(), file)).isFile()
  );

let common = {
  entryPoints,
  bundle: true,
  sourcemap: 'external',
}

esbuild
  .build({
    ...common,
    outdir: 'lib/esm',
    format: 'esm',
    packages: 'external',
  })
  .then(() => {
    const packageJson = JSON.stringify({ type: 'module' })
    fs.writeFileSync(`${__dirname}/lib/esm/package.json`, packageJson, 'utf8')

    console.log('esm build success.')
  })

esbuild
  .build({
    ...common,
    outdir: 'lib/cjs',
    format: 'cjs',
    packages: 'external',
  })
  .then(() => console.log('cjs build success.'))

esbuild
  .build({
    ...common,
    entryPoints: ['index.ts'],
    outfile: 'lib/nostr.bundle.js',
    format: 'iife',
    globalName: 'NostrTools',
    define: {
      window: 'self',
      global: 'self',
      process: '{"env": {}}',
    },
  })
  .then(() => console.log('standalone build success.'))
