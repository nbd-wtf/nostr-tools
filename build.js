#!/usr/bin/env node

const esbuild = require('esbuild')
const alias = require('esbuild-plugin-alias')

let common = {
  entryPoints: ['index.ts'],
  bundle: true,
  plugins: [
    alias({
      stream: require.resolve('readable-stream')
    })
  ],
  sourcemap: 'external'
}

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.esm.js',
    format: 'esm',
    packages: 'external'
  })
  .then(() => console.log('esm build success.'))

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.cjs.js',
    format: 'cjs',
    packages: 'external'
  })
  .then(() => console.log('cjs build success.'))

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.bundle.js',
    format: 'iife',
    globalName: 'NostrTools',
    define: {
      window: 'self',
      global: 'self',
      process: '{"env": {}}'
    }
  })
  .then(() => console.log('standalone build success.'))
